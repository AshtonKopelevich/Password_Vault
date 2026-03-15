#uvicorn backend.app.main:app --reload //to run the code


from fastapi import FastAPI
from backend.api.auth import router
app = FastAPI()
app.include_router(router)

