from fastapi import FastAPI, HTTPException, status, Depends, Response, Cookie
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, field_serializer
from sqlalchemy.orm import Session
from typing import List, Optional
import base64

from backend.app.database import get_session, engine, Base
from backend.models.user import User as DBUser
from backend.models.vault_entry import VaultEntry as DBVaultEntry
from backend.core.security import (
    hash_auth_key,
    verify_auth_key,
    validate_vault_entry,
    create_session_token,
    verify_session_token,
)

Base.metadata.create_all(bind=engine)

app = FastAPI()

# ---------------------------------------------------------------------------
# CORS — allows the React dev server (localhost:3000) to talk to this API
# ---------------------------------------------------------------------------
origins = [
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,   # required so the session cookie is sent/received
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Pydantic schemas
# ---------------------------------------------------------------------------

class User(BaseModel):
    email: str
    username: str
    hashed_password: str  # PBKDF2-derived authKey from the frontend, NOT the raw password


class VaultEntry(BaseModel):
    password: bytes
    iv: bytes
    salt: bytes
    account: str


class VaultEntryResponse(VaultEntry):
    id: int
    user_id: int

    @field_serializer('password', 'iv', 'salt')
    def serialize_bytes(self, data: bytes) -> str:
        return base64.b64encode(data).decode('utf-8')

    class Config:
        from_attributes = True


# ---------------------------------------------------------------------------
# DB dependency
# ---------------------------------------------------------------------------

def get_db():
    db = get_session()
    try:
        yield db
    finally:
        db.close()


# ---------------------------------------------------------------------------
# Session cookie dependency — used by every vault route
# ---------------------------------------------------------------------------

def get_current_user_id(session_id: str = Cookie(None)) -> int:
    if not session_id:
        raise HTTPException(status_code=401, detail="Not logged in")
    user_id = verify_session_token(session_id)
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid or expired session")
    return user_id


# ---------------------------------------------------------------------------
# Auth routes
# ---------------------------------------------------------------------------

@app.get("/")
def index():
    return {"message": "Password Vault API"}


@app.post("/auth/signup")
def create_user(user_data: User, response: Response, db: Session = Depends(get_db)):
    existing = db.query(DBUser).filter(DBUser.email == user_data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    new_user = DBUser(
        email=user_data.email,
        username=user_data.username,
        password=hash_auth_key(user_data.hashed_password),
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    token = create_session_token(new_user.id)
    response.set_cookie(
        key="session_id",
        value=token,
        httponly=True,
        samesite="lax",
        secure=False,   # set True in production (HTTPS)
        max_age=28800,  # 8 hours
    )

    return {"message": "User created", "user_id": new_user.id}


@app.post("/auth/login")
def verify_user(user: User, response: Response, db: Session = Depends(get_db)):
    user_temp = db.query(DBUser).filter(DBUser.email == user.email).first()

    if not user_temp or not verify_auth_key(user.hashed_password, user_temp.password):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_session_token(user_temp.id)
    response.set_cookie(
        key="session_id",
        value=token,
        httponly=True,
        samesite="lax",
        secure=False,   # set True in production (HTTPS)
        max_age=28800,  # 8 hours
    )

    # user_id is returned so the frontend can store it in sessionStorage
    return {"message": "Login successful", "user_id": user_temp.id, "username": user_temp.username}


@app.post("/auth/logout")
def logout(response: Response):
    response.delete_cookie(
        key="session_id",
        httponly=True,
        samesite="lax",
        secure=False,
    )
    return {"message": "Logged out successfully"}


# ---------------------------------------------------------------------------
# Vault routes — all protected by session cookie
# ---------------------------------------------------------------------------

@app.get("/vault", response_model=List[VaultEntryResponse])
def grab_vault(
    curr_user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    return db.query(DBVaultEntry).filter(DBVaultEntry.user_id == curr_user_id).all()


@app.post("/vault", response_model=VaultEntryResponse)
def new_entry(
    entry: VaultEntry,
    curr_user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    if not validate_vault_entry(entry.password, entry.iv, entry.salt):
        raise HTTPException(
            status_code=422,
            detail="Malformed encryption data — check IV (12 bytes) and salt (16 bytes) lengths.",
        )

    db_entry = DBVaultEntry(
        user_id=curr_user_id,
        account=entry.account,
        password=entry.password,
        iv=entry.iv,
        salt=entry.salt,
    )
    db.add(db_entry)
    db.commit()
    db.refresh(db_entry)
    return db_entry


@app.get("/vault/entry/{entry_id}", response_model=VaultEntryResponse)
def get_entry(
    entry_id: int,
    curr_user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    entry = db.query(DBVaultEntry).filter(
        DBVaultEntry.id == entry_id,
        DBVaultEntry.user_id == curr_user_id,
    ).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    return entry


@app.put("/vault/entry/{entry_id}", response_model=VaultEntryResponse)
def update_entry(
    entry_id: int,
    updated_data: VaultEntry,
    curr_user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    entry = db.query(DBVaultEntry).filter(
        DBVaultEntry.id == entry_id,
        DBVaultEntry.user_id == curr_user_id,
    ).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")

    if not validate_vault_entry(updated_data.password, updated_data.iv, updated_data.salt):
        raise HTTPException(
            status_code=422,
            detail="Malformed encryption data — check IV (12 bytes) and salt (16 bytes) lengths.",
        )

    entry.account = updated_data.account
    entry.password = updated_data.password
    entry.iv = updated_data.iv
    entry.salt = updated_data.salt
    db.commit()
    db.refresh(entry)
    return entry


@app.delete("/vault/entry/{entry_id}")
def delete_entry(
    entry_id: int,
    curr_user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    entry = db.query(DBVaultEntry).filter(
        DBVaultEntry.id == entry_id,
        DBVaultEntry.user_id == curr_user_id,
    ).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")

    db.delete(entry)
    db.commit()
    return {"message": "Entry deleted"}