from fastapi import FastAPI
from typing import Optional
from pydantic import BaseModel

app = FastAPI()
@app.get("/")
def root():
    return {"message": "Hello World!"}

#fastapi dev backend/api/auth.py