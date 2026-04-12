from fastapi import FastAPI, Path, HTTPException, status, Depends, Request
from typing import Optional, List
from pydantic import BaseModel, field_serializer
from sqlalchemy.orm import Session

from backend.app.database import get_session, engine, Base
from backend.models.user import User as DBUser
from backend.models.vault_entry import VaultEntry as DBVaultEntry

import bcrypt
import hmac
import hashlib
import time
import base64
import os

from fastapi.responses import JSONResponse

from fastapi import APIRouter
router = APIRouter()


def hash_auth_key(auth_key: str) -> str:
    return bcrypt.hashpw(auth_key.encode(), bcrypt.gensalt()).decode()

def verify_auth_key(auth_key: str, hashed: str) -> bool:
    return bcrypt.checkpw(auth_key.encode(), hashed.encode())

SESSION_SECRET = os.getenv("SESSION_SECRET", "dev-secret")

def create_session_token(user_id: int):
    payload = f"{user_id}:{int(time.time()) + 3600}"
    encoded = base64.b64encode(payload.encode()).decode()

    signature = hmac.new(
        SESSION_SECRET.encode(),
        encoded.encode(),
        hashlib.sha256
    ).hexdigest()

    return f"{encoded}.{signature}"

def verify_session_token(token: str):
    try:
        encoded, signature = token.split(".")

        expected_sig = hmac.new(
            SESSION_SECRET.encode(),
            encoded.encode(),
            hashlib.sha256
        ).hexdigest()

        if not hmac.compare_digest(signature, expected_sig):
            return None

        payload = base64.b64decode(encoded).decode()
        user_id, expiry = payload.split(":")

        if int(expiry) < time.time():
            return None

        return int(user_id)

    except:
        return None

#Database dependencey

def get_db():
    db = get_session()
    try:
        yield db
    finally:
        db.close()

#Authentication Dependency

def get_current_user(request: Request):
    token = request.cookies.get("session")

    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    user_id = verify_session_token(token)

    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid session")

    return user_id

#Models

class User(BaseModel):
    email: str
    username: str
    hashed_password: str  # actually authKey from frontend

class VaultEntry(BaseModel):
    password: bytes
    iv: bytes
    salt: bytes
    account: str

class VaultEntryResponse(VaultEntry):
    id: int
    user_id: int

    @field_serializer('password', 'iv', 'salt')
    def serialize_bytes(self, data: bytes):
        return base64.b64encode(data).decode('utf-8')

    class Config:
        from_attributes = True



Base.metadata.create_all(bind=engine)


@router.get("/")
def index():
    return {"Name": "First Data"}



@router.post("/auth/signup")
def create_user(user_data: User, db: Session = Depends(get_db)):
    existing_user = db.query(DBUser).filter(DBUser.email == user_data.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    hashed = hash_auth_key(user_data.hashed_password)

    new_user = DBUser(
        email=user_data.email,
        username=user_data.username,
        password=hashed
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return {"message": "User created", "user_id": new_user.id}

@router.post("/auth/login")
def verify_user(user: User, db: Session = Depends(get_db)):
    user_temp = db.query(DBUser).filter(DBUser.email == user.email).first()

    if not user_temp or not verify_auth_key(user.hashed_password, user_temp.password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_session_token(user_temp.id)

    response = JSONResponse({"message": "Login successful"})
    response.set_cookie(
        key="session",
        value=token,
        httponly=True
    )

    return response

@router.get("/vault", response_model=List[VaultEntryResponse])
def grab_vault(
    user_id: int = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return db.query(DBVaultEntry).filter(DBVaultEntry.user_id == user_id).all()

@router.post("/vault", response_model=VaultEntryResponse)
def new_entry(
    entry: VaultEntry,
    user_id: int = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    db_entry = DBVaultEntry(
        user_id=user_id,
        account=entry.account,
        password=entry.password,
        iv=entry.iv,
        salt=entry.salt
    )

    db.add(db_entry)
    db.commit()
    db.refresh(db_entry)

    return db_entry

@router.get("/vault/entry/{entry_id}", response_model=VaultEntryResponse)
def get_entry(
    entry_id: int,
    user_id: int = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    entry = db.query(DBVaultEntry).filter(
        DBVaultEntry.id == entry_id,
        DBVaultEntry.user_id == user_id
    ).first()

    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")

    return entry

@router.put("/vault/entry/{entry_id}", response_model=VaultEntryResponse)
def update_entry(
    entry_id: int,
    updated_data: VaultEntry,
    user_id: int = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    db_entry = db.query(DBVaultEntry).filter(
        DBVaultEntry.id == entry_id,
        DBVaultEntry.user_id == user_id
    ).first()

    if not db_entry:
        raise HTTPException(status_code=404, detail="Entry not found")

    db_entry.account = updated_data.account
    db_entry.password = updated_data.password
    db_entry.iv = updated_data.iv
    db_entry.salt = updated_data.salt

    db.commit()
    db.refresh(db_entry)

    return db_entry

@router.delete("/vault/entry/{entry_id}")
def delete_entry(
    entry_id: int,
    user_id: int = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    db_entry = db.query(DBVaultEntry).filter(
        DBVaultEntry.id == entry_id,
        DBVaultEntry.user_id == user_id
    ).first()

    if not db_entry:
        raise HTTPException(status_code=404, detail="Entry not found")

    db.delete(db_entry)
    db.commit()

    return {"message": "Entry deleted"}