from passlib.context import CryptContext
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

# -------------------------------------------------------------------
# Password Hashing (Master Password / authKey)
# -------------------------------------------------------------------

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_auth_key(auth_key: str) -> str:
    """
    Hashes the authKey derived on the frontend before storing in DB.
    The authKey is already a PBKDF2 derivative — not the raw master password.
    """
    return pwd_context.hash(auth_key)

def verify_auth_key(plain_auth_key: str, hashed_auth_key: str) -> bool:
    """
    Verifies a login attempt by comparing the submitted authKey
    against the stored bcrypt hash.
    """
    return pwd_context.verify(plain_auth_key, hashed_auth_key)


# -------------------------------------------------------------------
# Vault Entry Encryption/Decryption (Server-side helper)
# -------------------------------------------------------------------
# NOTE: In zero-knowledge architecture, the frontend handles all
# encryption/decryption using the encryptionKey that never leaves
# the browser. These functions exist only as a server-side safety
# net — for example, re-encrypting entries during a key rotation
# or validating that stored data is well-formed bytes.
# The server never has access to the encryptionKey and therefore
# cannot decrypt vault entries on its own.

def validate_vault_entry(password: bytes, iv: bytes, salt: bytes) -> bool:
    """
    Validates that vault entry fields are well-formed before storing.
    Does NOT decrypt — just checks that the data is the right shape.
    """
    if len(iv) != 12:       # AES-GCM expects a 96-bit (12 byte) nonce
        return False
    if len(salt) != 16:     # 128-bit salt minimum
        return False
    if len(password) == 0:
        return False
    return True


# -------------------------------------------------------------------
# Session Cookie Helpers
# -------------------------------------------------------------------

import os
import hmac
import hashlib
import base64
from datetime import datetime, timedelta
import json

SESSION_SECRET = os.environ.get("SESSION_SECRET")  # load from .env, never hardcode

def create_session_token(user_id: int) -> str:
    """
    Creates a signed session token storing user_id and expiry.
    Format: base64(payload) + "." + hmac_signature
    """
    payload = json.dumps({
        "user_id": user_id,
        "expires": (datetime.utcnow() + timedelta(hours=8)).isoformat()
    })
    encoded = base64.b64encode(payload.encode()).decode()
    signature = _sign(encoded)
    return f"{encoded}.{signature}"

def verify_session_token(token: str) -> int | None:
    """
    Verifies a session token and returns the user_id if valid.
    Returns None if the token is invalid or expired.
    """
    try:
        encoded, signature = token.rsplit(".", 1)
    except ValueError:
        return None

    # Reject if signature doesn't match — prevents tampering
    if not hmac.compare_digest(_sign(encoded), signature):
        return None

    payload = json.loads(base64.b64decode(encoded).decode())

    # Reject if expired
    if datetime.utcnow() > datetime.fromisoformat(payload["expires"]):
        return None

    return payload["user_id"]

def _sign(data: str) -> str:
    """HMAC-SHA256 signature using the session secret."""
    return hmac.new(
        SESSION_SECRET.encode(),
        data.encode(),
        hashlib.sha256
    ).hexdigest()