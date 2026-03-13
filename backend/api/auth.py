from fastapi import FastAPI, Path
from typing import Optional
from pydantic import BaseModel

app = FastAPI()
#source .venv/bin/activate    
#fastapi dev backend/api/auth.py  in password_vault folder

class User(BaseModel):
    id: int
    email: str # who is this
    hashed_password: str # encrypted master password


@app.get("/")
def index():
    return {"Name" : "First Data"}


@app.post("/auth/signup") # register
def create_user(user: User):

    pass

@app.post("/auth/login") # login
def verify_user(user: User):
    pass