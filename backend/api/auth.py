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
from backend.models.query_helper_functions import *
from passlib.context import CryptContext


pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

Base.metadata.create_all(bind=engine)

app = FastAPI()
#source .venv/bin/activate    
#fastapi dev backend/api/auth.py  in password_vault folder

# trying to test using sample_sql let's see how it behaves and if it even behaves correctly
# only works if the table is already created using sample_sql.db

class CreateUser(BaseModel):
    email: str # who is this
    username: str
    password: str 

class UserLogin(BaseModel):
    email: str
    password: str


class VaultEntry(BaseModel):
    password: bytes
    iv: bytes
    salt: bytes
    account: str

class UserResponse(BaseModel):
    id: int
    email: str
    username: str

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
@app.post("/auth/signup", response_model=UserResponse)
def signup(user_data: CreateUser, db: Session = Depends(get_db)):
    user, error = add_user(db, user_data.email, user_data.username, user_data.password, pwd_context)
    if error:
        raise HTTPException(status_code=400, detail=error)
    return user

# login
@app.post("/auth/login")
def login(user_data: UserLogin, db: Session = Depends(get_db)):
    user = get_user(db, email=user_data.email)
    if not user or not pwd_context.verify(user_data.password, user.password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return {"message": "Login successful", "token": "fake-jwt-token-for-now"}


# Vault API
@app.get("/vault/{user_id_v2}", response_model=List[VaultEntryResponse])
def grab_vault(user_id_v2: int, db: Session = Depends(get_db)):
    return get_vault_entries(db, user_id=user_id_v2)

# grabs the vault_entry for that specific user
@app.post("/vault/{user_id_v2}", response_model=VaultEntryResponse)
def new_entry(user_id_v2: int, entry: VaultEntry, db: Session = Depends(get_db)):
    user = get_user(db, id=user_id_v2)
    if not user:
        raise HTTPException(status_code=404, detail="User does not exist")
    return add_vault_entry(db, user_id_v2, entry.account, entry.password, entry.iv, entry.salt)

# updates the vault_entry id
@app.put("/vault/entry/{entry_id}", response_model=VaultEntryResponse)
def update_entry(entry_id: int, updated_data: VaultEntry, db: Session = Depends(get_db)):
    entry = db.query(DBVaultEntry).filter(DBVaultEntry.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    return update_vault_entry(db, entry, 
                              account=updated_data.account, 
                              password=updated_data.password, 
                              iv=updated_data.iv, 
                              salt=updated_data.salt)

# Deletes the vault_entry id
@app.delete("/vault/entry/{entry_id}")
def delete_entry(entry_id: int, db: Session = Depends(get_db)):
    entry = db.query(DBVaultEntry).filter(DBVaultEntry.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    delete_vault_entry(db, entry)
    return {"message": "Entry deleted"}