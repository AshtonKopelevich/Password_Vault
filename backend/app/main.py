#uvicorn backend.app.main:app --reload //to run the code
import string

from fastapi import FastAPI
app = FastAPI() #Creates a FastAPI instance
#frontend_input = input("This is what the frontend will send to the backend: ") #Simulates receiving input from the frontend
frontend_input = "Example Vault" #Simulates receiving input from the frontend

mock_vault = [
    {"id": 1, "name": "Example Vault", "username": "example_user", "email": "example@example.com", "password": "example_password", "website": "example.com"}, 
    {"id": 2, "name": "Another Vault", "username": "another_user", "email": "another@another.com", "password": "another_password", "website": "another.com"}, 
    {"id": 3, "name": "Third Vault", "username": "third_user", "email": "third@third.com", "password": "third_password", "website": "third.com"}
]

@app.get("/vault/{frontend_input}")
def root(frontend_input: str):
    for i in range(len(mock_vault)):
        if mock_vault[i]["name"] == frontend_input:
            return mock_vault[i]
    return {"message": "Frontend input not found in vault."}
#http://127.0.0.1:8000/docs on my computer for the link to work


    #Returns a JSON response with the message "Hello World!"

