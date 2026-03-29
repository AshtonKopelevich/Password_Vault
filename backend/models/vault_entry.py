from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, Integer, DateTime, ForeignKey, LargeBinary, func

from backend.app.database import Base

if TYPE_CHECKING:
    from .user import User


class VaultEntry(Base):
    __tablename__ = "vault_entries"

    # Primary key
    id: Mapped[int] = mapped_column(
        primary_key=True,
        index=True
    )

    # Foreign key to users.id
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    # Unencrypted title (e.g., "Netflix", "Gmail")
    account: Mapped[str] = mapped_column(
        String(255),
        nullable=False
    )

    # AES-GCM encrypted JSON blob (ciphertext + auth tag)
    password: Mapped[bytes] = mapped_column(
        LargeBinary,
        nullable=False
    )

    # Initialization vector (12 bytes recommended for GCM)
    iv: Mapped[bytes] = mapped_column(
        LargeBinary,
        nullable=False
    )

    # PBKDF2 salt (16–32 bytes recommended)
    salt: Mapped[bytes] = mapped_column(
        LargeBinary,
        nullable=False
    )

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False
    )

    password: Mapped[bytes] = mapped_column(LargeBinary, nullable=False)
    iv: Mapped[bytes] = mapped_column(LargeBinary, nullable=False)
    salt: Mapped[bytes] = mapped_column(LargeBinary, nullable=False)

    user: Mapped["User"] = relationship(back_populates="vault_entries")