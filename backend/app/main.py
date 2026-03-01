#uvicorn backend.app.main:app --reload //to run the code
from fastapi import FastAPI
app = FastAPI() #Creates a FastAPI instance
@app.get("/")
def root():
    return {"message": "Hello World!"} #Returns a JSON response with the message "Hello World!"
