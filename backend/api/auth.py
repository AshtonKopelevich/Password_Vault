from fastapi import FastAPI, Path, HTTPException, status, Depends
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
def create_user(user_data: User, db: Session = Depends(get_db)):
    existing_user = db.query(DBUser).filter(DBUser.email == user_data.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    # ✅ Hash before storing — never store plaintext
    hashed = pwd_context.hash(user_data.hashed_password)

    new_user = DBUser(
        email=user_data.email,
        username=user_data.username,
        password=hashed  # storing the bcrypt hash
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return {"message": "User created", "user_id": new_user.id}

# login
@app.post("/auth/login")
def verify_user(user: User, db: Session = Depends(get_db)):
    user_temp = db.query(DBUser).filter(DBUser.email == user.email).first()

    # ✅ verify() handles the comparison securely — never compare directly
    if not user_temp or not pwd_context.verify(user.hashed_password, user_temp.password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    return {"message": "Login successful", "token": "fake-jwt-token-for-now"}


# Vault API
# grabs the vault_entry for that specific user
@app.get("/vault/{user_id_v2}", response_model=List[VaultEntryResponse])
def grab_vault(user_id_v2: int, db: Session = Depends(get_db)):

    user_temp = db.query(DBVaultEntry).filter(DBVaultEntry.user_id == user_id_v2).all()

    if not user_temp:
        return []
    
    return user_temp

# Adds vault_entry row for the specific user
@app.post("/vault/{user_id_v2}", response_model=VaultEntryResponse)
def new_entry(user_id_v2: int, entry: VaultEntry, db: Session = Depends(get_db)):

    # check if user already exists by comparing id
    user_temp = db.query(DBUser).filter(DBUser.id == user_id_v2).first()

    if not user_temp:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="User does not exist"
        )
    
    db_entry = DBVaultEntry(
        user_id=user_id_v2,
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
def get_entry(entry_id: int, db: Session = Depends(get_db)):
    entry = db.query(DBVaultEntry).filter(DBVaultEntry.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    return entry

# updates the vault_entry id
@app.put("/vault/entry/{entry_id}", response_model=VaultEntryResponse)
def update_entry(entry_id: int, updated_data: VaultEntry, db: Session = Depends(get_db)):
    db_entry = db.query(DBVaultEntry).filter(DBVaultEntry.id == entry_id).first()
    if not db_entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    
    db_entry.account = updated_data.account
    db_entry.password = updated_data.password
    db_entry.iv = updated_data.iv
    db_entry.salt = updated_data.salt
    db.commit()
    db.refresh(db_entry)
    return db_entry

# Deletes the vault_entry id
@app.delete("/vault/entry/{entry_id}")
def delete_entry(entry_id: int, db: Session = Depends(get_db)):
    db_entry = db.query(DBVaultEntry).filter(DBVaultEntry.id == entry_id).first()
    if not db_entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    
    db.delete(db_entry)
    db.commit()
    return {"message": "Entry deleted"}