from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

from auth import register_user, authenticate_user, create_access_token

router = APIRouter()


class RegisterRequest(BaseModel):
    username: str
    password: str


class LoginRequest(BaseModel):
    username: str
    password: str


@router.post("/register")
async def register(req: RegisterRequest):
    if not req.username or not req.password:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="username and password are required")

    user = register_user(req.username, req.password)
    access_token = create_access_token({"sub": user["username"]})
    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/login")
async def login(req: LoginRequest):
    if not authenticate_user(req.username, req.password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect username or password")
    access_token = create_access_token({"sub": req.username})
    return {"access_token": access_token, "token_type": "bearer"}
