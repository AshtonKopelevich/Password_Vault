from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class VaultEntry(Base):
    __tablename__ = "vault_entries"

    id = Column(Integer, primary_key=True)
    account = Column(String, nullable=False)
    password = Column(String, nullable=False)

    owner_id = Column(Integer, ForeignKey("users.id"))

    owner = relationship("User", back_populates="vault_entries")
