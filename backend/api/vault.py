from fastapi import FastAPI, Path
from typing import Optional
from pydantic import BaseModel

app=FastAPI()

class Vault_Entry(BaseModel):
    id: int 
    user_id: int # This connects the entry to the specific user in the users table
    title: str # what password
    encrypted_data: str # secret sauce
    iv: str # how to decrypt
    salt: str # how to decrypt

@app.get("/vault") # grabs the vault
def get_vault_list():
    pass

@app.post("/create-vault")
def create_vault():
    pass

@app.get("/vault/{id}")
def get_vault(id: int):
    pass

@app.post("/vault/{id}")
def update_vault(id: int): #replace the whole thing
    pass
