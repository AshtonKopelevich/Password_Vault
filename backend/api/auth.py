from fastapi import FastAPI, HTTPException, status, Depends, Response, Cookie
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, field_serializer, model_validator
from sqlalchemy.orm import Session
from typing import List
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
    allow_credentials=True,
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
    salt: str = None  # Optional: frontend sends hex-encoded random salt during signup


class VaultEntryIn(BaseModel):
    """
    Accepts base64-encoded strings from the frontend and decodes them to bytes.
    The frontend sends JSON with base64 strings — not raw bytes.
    """
    account: str
    password: str   # base64 ciphertext
    iv: str         # base64 IV
    salt: str       # base64 salt

    def decode_fields(self):
        """Returns decoded bytes for password, iv, and salt."""
        return (
            base64.b64decode(self.password),
            base64.b64decode(self.iv),
            base64.b64decode(self.salt),
        )


class VaultEntryResponse(BaseModel):
    id: int
    user_id: int
    account: str
    password: str   # returned as base64
    iv: str         # returned as base64
    salt: str       # returned as base64

    @classmethod
    def from_db(cls, entry: DBVaultEntry) -> "VaultEntryResponse":
        return cls(
            id=entry.id,
            user_id=entry.user_id,
            account=entry.account,
            password=base64.b64encode(entry.password).decode('utf-8'),
            iv=base64.b64encode(entry.iv).decode('utf-8'),
            salt=base64.b64encode(entry.salt).decode('utf-8'),
        )

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


@app.get("/auth/get-salt")
def get_user_salt(email: str, db: Session = Depends(get_db)):
    """
    Retrieve the cryptographic salt for a user's PBKDF2 key derivation.

    Args:
        email: User's email address

    Returns:
        Hex-encoded 32-character salt (16 bytes)

    Security notes:
        - Salt is not secret; it's meant to be unique per-user and prevent rainbow tables
        - If user not found or salt is NULL, generate a random salt on first login
        - This endpoint does NOT require authentication
    """
    user = db.query(DBUser).filter(DBUser.email == email).first()

    if not user or not user.salt:
        # User not found or has no salt yet (backfill case)
        # Return a zero salt; frontend will handle and trigger salt generation on login
        return {"salt": "00" * 16}  # 32 hex chars = 16 bytes of zeros

    return {"salt": user.salt}


@app.post("/auth/signup")
def create_user(user_data: User, response: Response, db: Session = Depends(get_db)):
    existing = db.query(DBUser).filter(DBUser.email == user_data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    # Validate salt: must be 32 hex characters (16 bytes)
    if user_data.salt:
        if len(user_data.salt) != 32 or not all(c in "0123456789abcdefABCDEF" for c in user_data.salt):
            raise HTTPException(
                status_code=422,
                detail="Invalid salt format. Must be 32 hex characters (16 bytes)."
            )
    else:
        raise HTTPException(
            status_code=422,
            detail="Salt is required. Frontend must generate and send a random 16-byte salt."
        )

    new_user = DBUser(
        email=user_data.email,
        username=user_data.username,
        password=hash_auth_key(user_data.hashed_password),
        salt=user_data.salt.lower(),  # Store as lowercase hex
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
        secure=False,
        max_age=28800,
    )

    return {"message": "User created", "user_id": new_user.id}


@app.post("/auth/login")
def verify_user(user: User, response: Response, db: Session = Depends(get_db)):
    user_temp = db.query(DBUser).filter(DBUser.email == user.email).first()

    if not user_temp or not verify_auth_key(user.hashed_password, user_temp.password):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    # Backfill: If user has no salt, generate and store one
    if not user_temp.salt:
        import secrets
        # Generate random 16-byte salt and convert to hex
        random_salt = secrets.token_hex(16)  # 16 bytes = 32 hex chars
        user_temp.salt = random_salt
        db.commit()
        db.refresh(user_temp)

    token = create_session_token(user_temp.id)
    response.set_cookie(
        key="session_id",
        value=token,
        httponly=True,
        samesite="lax",
        secure=False,
        max_age=28800,
    )

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
    entries = db.query(DBVaultEntry).filter(DBVaultEntry.user_id == curr_user_id).all()
    return [VaultEntryResponse.from_db(e) for e in entries]


@app.post("/vault", response_model=VaultEntryResponse)
def new_entry(
    entry: VaultEntryIn,
    curr_user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    password_bytes, iv_bytes, salt_bytes = entry.decode_fields()

    if not validate_vault_entry(password_bytes, iv_bytes, salt_bytes):
        raise HTTPException(
            status_code=422,
            detail="Malformed encryption data — check IV (12 bytes) and salt (16 bytes) lengths.",
        )

    db_entry = DBVaultEntry(
        user_id=curr_user_id,
        account=entry.account,
        password=password_bytes,
        iv=iv_bytes,
        salt=salt_bytes,
    )
    db.add(db_entry)
    db.commit()
    db.refresh(db_entry)
    return VaultEntryResponse.from_db(db_entry)


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
    return VaultEntryResponse.from_db(entry)


@app.put("/vault/entry/{entry_id}", response_model=VaultEntryResponse)
def update_entry(
    entry_id: int,
    updated_data: VaultEntryIn,
    curr_user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    entry = db.query(DBVaultEntry).filter(
        DBVaultEntry.id == entry_id,
        DBVaultEntry.user_id == curr_user_id,
    ).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")

    password_bytes, iv_bytes, salt_bytes = updated_data.decode_fields()

    if not validate_vault_entry(password_bytes, iv_bytes, salt_bytes):
        raise HTTPException(
            status_code=422,
            detail="Malformed encryption data — check IV (12 bytes) and salt (16 bytes) lengths.",
        )

    entry.account = updated_data.account
    entry.password = password_bytes
    entry.iv = iv_bytes
    entry.salt = salt_bytes
    db.commit()
    db.refresh(entry)
    return VaultEntryResponse.from_db(entry)


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