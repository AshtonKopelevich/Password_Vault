from fastapi import FastAPI, Path, HTTPException, status, Depends, Response, Cookie
from typing import Optional
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import List, Optional

#from backend.app.test import get_session, engine, Base
from backend.app.database import get_session, engine, Base

import base64
from pydantic import field_serializer
from backend.models.user import User as DBUser
from backend.models.vault_entry import VaultEntry as DBVaultEntry
from passlib.context import CryptContext
from backend.core.security import hash_auth_key, verify_auth_key, validate_vault_entry, create_session_token, verify_session_token

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

Base.metadata.create_all(bind=engine)

app = FastAPI()
#source .venv/bin/activate    
#fastapi dev backend/api/auth.py  in password_vault folder

# trying to test using sample_sql let's see how it behaves and if it even behaves correctly
# only works if the table is already created using sample_sql.db

class User(BaseModel):
    email: str # who is this
    username: str
    hashed_password: str # encrypted master password
    # auth key


class VaultEntry(BaseModel):
    password: bytes
    iv: bytes
    salt: bytes
    account: str

class VaultEntryResponse(VaultEntry):
    id: int
    user_id: int

    # This is the "magic" that fixes the JSON error
    @field_serializer('password', 'iv', 'salt')
    def serialize_bytes(self, data: bytes):
        return base64.b64encode(data).decode('utf-8')
    
    class Config:
        from_attributes = True

def get_db():
    db=get_session()
    try:
        yield db
    finally:
        db.close()

# testing (not in use)
@app.get("/")
def index():
    return {"Name" : "First Data"}


# Auth API
# register
@app.post("/auth/signup")
def create_user(user_data: User, response: Response, db: Session = Depends(get_db)):
    existing_user = db.query(DBUser).filter(DBUser.email == user_data.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    # ✅ Hash before storing — never store plaintext
    hashed = hash_auth_key(user_data.hashed_password)

    new_user = DBUser(
        email=user_data.email,
        username=user_data.username,
        password=hashed  # storing the bcrypt hash
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    token = create_session_token(new_user.id)

    # cookie browser
    response.set_cookie(
        key="session_id",
        value=token,
        httponly=True,   # JS cannot steal it
        samesite="lax",  # CSRF protection
        secure=False,    # Set to True if using HTTPS (production)
        max_age=28800
    )


    return {"message": "User created", "user_id": new_user.id}

# login
@app.post("/auth/login")
def verify_user(user: User, response: Response, db: Session = Depends(get_db)):
    user_temp = db.query(DBUser).filter(DBUser.email == user.email).first()

    # ✅ verify() handles the comparison securely — never compare directly
    if not user_temp or not verify_auth_key(user.hashed_password, user_temp.password):
        raise HTTPException(
            status_code=401,
            detail = "Invalid password or email"
        )
    
    token = create_session_token(user_temp.id)

    response.set_cookie(
        key="session_id",
        value=token,
        httponly=True,   # JS cannot steal it
        samesite="lax",  # CSRF protection
        secure=False,    # Set to True if using HTTPS (production)
        max_age=28800
    )

    return {"message": "Login successful", "username": user_temp.username}

# log out
@app.post("/auth/logout")
def logout(response: Response):
    # This tells the browser to delete the session cookie immediately
    response.delete_cookie(
        key="session_id",
        httponly=True,
        samesite="lax",
        secure=False  # Match your login/signup settings
    )
    return {"message": "Logged out successfully"}


# Vault API

# helper function for Vault API
def get_current_user_id(session_id: str = Cookie(None)):
    # 1. FastAPI automatically pulls 'session_id' from the Request Headers
    if not session_id:
        raise HTTPException(status_code=401, detail="Not logged in")

    # 2. NOW we use your helper function from above
    user_id = verify_session_token(session_id) 

    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid session")

    return user_id


# grabs the vault_entry for that specific user
@app.get("/vault", response_model=List[VaultEntryResponse])
def grab_vault(curr_user_id: int = Depends(get_current_user_id), db: Session = Depends(get_db)):

    PVEntryfor_that_user = db.query(DBVaultEntry).filter(DBVaultEntry.user_id == curr_user_id).all()
    
    return PVEntryfor_that_user


# Adds vault_entry row for the specific user
@app.post("/vault", response_model=VaultEntryResponse)
def new_entry(entry: VaultEntry, curr_user_id: int = Depends(get_current_user_id), db: Session = Depends(get_db)):
    
    if not validate_vault_entry(entry.password, entry.iv, entry.salt):
        raise HTTPException(status_code=404, detail="Malformed encryption data. Check IV and Salt lengths.")
    

    db_entry = DBVaultEntry(
        user_id=curr_user_id,
        account=entry.account,
        password=entry.password,
        iv=entry.iv,
        salt=entry.salt
    )
    db.add(db_entry)
    db.commit()
    db.refresh(db_entry)
    return db_entry
    

# grabs the vault_entry id
@app.get("/vault/entry/{entry_id}", response_model=VaultEntryResponse)
def get_entry(entry_id: int, curr_user_id: int = Depends(get_current_user_id), db: Session = Depends(get_db)):

    # validation first
    entry = db.query(DBVaultEntry).filter(      
        DBVaultEntry.id == entry_id,
        DBVaultEntry.user_id == curr_user_id,
    ).first()
    
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    
    return entry

# updates the vault_entry id
@app.put("/vault/entry/{entry_id}", response_model=VaultEntryResponse)
def update_entry(entry_id: int, updated_data: VaultEntry, curr_user_id: int = Depends(get_current_user_id),  db: Session = Depends(get_db)):

     # validation first
    entry = db.query(DBVaultEntry).filter(
        DBVaultEntry.id == entry_id,
        DBVaultEntry.user_id == curr_user_id
    ).first()

    if not entry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="entry does not exist"
        )
    
    if not validate_vault_entry(updated_data.password, updated_data.iv, updated_data.salt):
        raise HTTPException(status_code=404, detail="Malformed encryption data. Check IV and Salt lengths.")
    
    entry.account = updated_data.account
    entry.password = updated_data.password
    entry.iv = updated_data.iv
    entry.salt = updated_data.salt
    db.commit()
    db.refresh(entry)
    return entry

# Deletes the vault_entry id
@app.delete("/vault/entry/{entry_id}")
def delete_entry(entry_id: int, curr_user_id: int = Depends(get_current_user_id), db: Session = Depends(get_db)):

    # validation first
    entry = db.query(DBVaultEntry).filter(
        DBVaultEntry.id == entry_id,
        DBVaultEntry.user_id == curr_user_id
    ).first()

    if not entry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="entry does not exist"
        )
    
    db.delete(entry)
    db.commit()
    return {"message": "Entry deleted"}