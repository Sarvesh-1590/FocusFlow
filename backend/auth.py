import os
import hmac
import hashlib
import base64
import json
import time
from datetime import datetime, timedelta

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

SECRET_KEY = os.getenv("JWT_SECRET", "change-me-in-prod")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 120

security = HTTPBearer()

fake_users_db = {}


def get_password_hash(password: str) -> str:
    return hashlib.sha256(password.encode("utf-8")).hexdigest()


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return hmac.compare_digest(get_password_hash(plain_password), hashed_password)


def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": int(expire.timestamp())})
    payload = json.dumps(to_encode, separators=(',', ':'), sort_keys=True).encode()
    signature = hmac.new(SECRET_KEY.encode(), payload, hashlib.sha256).digest()
    token = base64.urlsafe_b64encode(payload).decode().rstrip("=") + "." + base64.urlsafe_b64encode(signature).decode().rstrip("=")
    return token


def decode_access_token(token: str) -> dict:
    try:
        payload_b64, sig_b64 = token.split(".")
        padding = '=' * (-len(payload_b64) % 4)
        payload = base64.urlsafe_b64decode(payload_b64 + padding)
        padding = '=' * (-len(sig_b64) % 4)
        signature = base64.urlsafe_b64decode(sig_b64 + padding)
        expected_sig = hmac.new(SECRET_KEY.encode(), payload, hashlib.sha256).digest()
        if not hmac.compare_digest(expected_sig, signature):
            raise ValueError("Invalid signature")

        content = json.loads(payload.decode())
        if "exp" in content and time.time() > content["exp"]:
            raise ValueError("Token expired")

        return content
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")


def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    token = credentials.credentials
    data = decode_access_token(token)
    username = data.get("sub")
    if not username or username not in fake_users_db:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid user")

    return {"username": username}


def register_user(username: str, password: str) -> dict:
    if username in fake_users_db:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User already exists")
    hashed = get_password_hash(password)
    fake_users_db[username] = {"username": username, "hashed_password": hashed}
    return {"username": username}


def authenticate_user(username: str, password: str) -> bool:
    user = fake_users_db.get(username)
    if not user:
        return False
    return verify_password(password, user.get("hashed_password", ""))
