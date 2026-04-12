import os
import hmac
import hashlib
import base64
import json
from datetime import datetime, timedelta

from passlib.context import CryptContext

# ---------------------------------------------------------------------------
# Password Hashing (authKey)
# ---------------------------------------------------------------------------

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_auth_key(auth_key: str) -> str:
    """
    Bcrypt-hashes the PBKDF2-derived authKey before storing in the DB.
    The authKey is already a key derivative — never the raw master password.
    """
    return pwd_context.hash(auth_key)


def verify_auth_key(plain_auth_key: str, hashed_auth_key: str) -> bool:
    """
    Verifies a login attempt by comparing the submitted authKey
    against the stored bcrypt hash.
    """
    return pwd_context.verify(plain_auth_key, hashed_auth_key)


# ---------------------------------------------------------------------------
# Vault Entry Validation
# ---------------------------------------------------------------------------
# NOTE: In zero-knowledge architecture the frontend handles all
# encryption/decryption. The server never holds the encryptionKey and
# therefore cannot decrypt vault entries. This function only checks that
# the blobs are the right shape before persisting them.

def validate_vault_entry(password: bytes, iv: bytes, salt: bytes) -> bool:
    """
    Validates that vault entry fields are well-formed before storing.
    Does NOT decrypt — just checks the data is the right shape.
    """
    if len(iv) != 12:       # AES-GCM requires a 96-bit (12-byte) nonce
        return False
    if len(salt) != 16:     # 128-bit salt minimum
        return False
    if len(password) == 0:
        return False
    return True


# ---------------------------------------------------------------------------
# Session Cookie Helpers
# ---------------------------------------------------------------------------

SESSION_SECRET = os.environ.get("SESSION_SECRET")


def _get_secret() -> str:
    """Raises clearly if SESSION_SECRET was never set."""
    if not SESSION_SECRET:
        raise RuntimeError(
            "SESSION_SECRET environment variable is not set. "
            "Generate one with: python -c \"import secrets; print(secrets.token_hex(32))\""
        )
    return SESSION_SECRET


def _sign(data: str) -> str:
    """HMAC-SHA256 signature using the session secret."""
    return hmac.new(
        _get_secret().encode(),
        data.encode(),
        hashlib.sha256,
    ).hexdigest()


def create_session_token(user_id: int) -> str:
    """
    Creates a signed session token storing user_id and expiry.
    Format: base64(payload) + "." + hmac_signature
    """
    payload = json.dumps({
        "user_id": user_id,
        "expires": (datetime.utcnow() + timedelta(hours=8)).isoformat(),
    })
    encoded = base64.b64encode(payload.encode()).decode()
    return f"{encoded}.{_sign(encoded)}"


def verify_session_token(token: str) -> int | None:
    """
    Verifies a session token and returns the user_id if valid.
    Returns None if the token is missing, tampered with, or expired.
    """
    try:
        encoded, signature = token.rsplit(".", 1)
    except ValueError:
        return None

    # Constant-time comparison prevents timing attacks
    if not hmac.compare_digest(_sign(encoded), signature):
        return None

    payload = json.loads(base64.b64decode(encoded).decode())

    if datetime.utcnow() > datetime.fromisoformat(payload["expires"]):
        return None

    return payload["user_id"]