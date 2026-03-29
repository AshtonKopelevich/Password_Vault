from fastapi import APIRouter
from typing import Optional
from pydantic import BaseModel
from backend.app.database import get_db

# Example (Basic Testing)
# router = APIRouter()
# @app.get("/")
# def root():
#     return {"message": "Hello World!"}

# What to include in the terminal:
#fastapi dev backend/api/auth.py

router = APIRouter()

#User is for the master users and passwords.
class User(BaseModel):
    id: int
    email: str
    hashed_password: str
    created_at: str
    updated_at: str

#VaultEntry is for all the passowrds
class VaultEntry(BaseModel):
    id: int #this is the id of the vault entry, for example, 1 could be Netflix and 2 could be Gmail
    user_id: int #who owns the vault entry so for example, user 1 could be me and user 2 could be Abby
    title: str #name of login entry, for example, Netflix or Gmail
    encrypted_data: str #this is the username and the password but in its encrypted form.
    iv: str #this is for the encryption which we will do later
    salt: str # this is also for the encryption/hashing which we will do later
    created_at: str
    updated_at: str 

@router.get("/")
def root():
     return {"message": "Vault API is up and running"}
    
    
@router.post("/vault")
def create_vault_entry(entry: VaultEntry):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        """
        INSERT INTO vault_entries
        (user_id, title, encrypted_data, iv, salt, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        (
            entry.user_id,
            entry.title,
            entry.encrypted_data,
            entry.iv,
            entry.salt,
            entry.created_at,
            entry.updated_at
        )
    )
    conn.commit()
    conn.close()
    return {"message": "Vault entry created"}
    
    
@router.get("/vault/{entry_id}")
def get_vault_entry(entry_id: int):
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute(
        "SELECT * FROM vault_entries WHERE id = ?",
        (entry_id,)
    )

    entry = cursor.fetchone()
    conn.close()
    return dict(entry)