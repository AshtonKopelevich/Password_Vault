from fastapi import APIRouter
from typing import Optional
from pydantic import BaseModel

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
    return {
        #Eventually, we will store the entry in a sql database
        "message": "Vault entry parsed successfully",
        "title": entry.title,
        "user_id": entry.user_id,
    }
    
@router.get("/vault/{entry_id}")
def get_vault_entry(entry_id: int):
    return {
        #Eventually, it will search data base for this entry and then return it.
        "message": "Vault entry retrieved successfully",
        "user_id": entry_id,
    }
