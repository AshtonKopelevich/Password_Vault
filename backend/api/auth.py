from fastapi import FastAPI, Path, HTTPException, status, Depends
from fastapi.middleware.cors import CORSMiddleware
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

Base.metadata.create_all(bind=engine)

app = FastAPI()
#source .venv/bin/activate    
#fastapi dev backend/api/auth.py  in password_vault folder

# Code to integrate the frontend to the backend
origins = [
    "http://localhost:3000"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
@app.post("/auth/signup") # register
def create_user(user_data: User, db: Session = Depends(get_db)):
    # check if user already exists
    existing_user = db.query(DBUser).filter(DBUser.email == user_data.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    new_user = DBUser(
        email=user_data.email,
        username=user_data.username,
        password=user_data.hashed_password # This should be hashed in production!
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return {"message": "User created", "user_id": new_user.id}


@app.post("/auth/login") # login
def verify_user(user: User, db: Session = Depends(get_db)):
    user_temp = db.query(DBUser).filter(DBUser.email == user.email).first()
    if not user_temp or user.hashed_password != user_temp.password:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    return {"message": "Login successful", "token": "fake-jwt-token-for-now"} # idk maybe need to fix


# Vault API
@app.get("/vault/{user_id_v2}", response_model=List[VaultEntryResponse])
def grab_vault(user_id_v2: int, db: Session = Depends(get_db)):

    user_temp = db.query(DBVaultEntry).filter(DBVaultEntry.user_id == user_id_v2).all()

    if not user_temp:
        return []
    
    return user_temp

# adds new entry encrypted data
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
    

# updates encrypted data + metadata
@app.get("/vault/entry/{entry_id}", response_model=VaultEntryResponse)
def get_entry(entry_id: int, db: Session = Depends(get_db)):
    entry = db.query(DBVaultEntry).filter(DBVaultEntry.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    return entry

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

@app.delete("/vault/entry/{entry_id}")
def delete_entry(entry_id: int, db: Session = Depends(get_db)):
    db_entry = db.query(DBVaultEntry).filter(DBVaultEntry.id == entry_id).first()
    if not db_entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    
    db.delete(db_entry)
    db.commit()
    return {"message": "Entry deleted"}