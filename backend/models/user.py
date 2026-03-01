from sqlalchemy import Column, Integer, String
from app.database import Base
from sqlalchemy.orm import relationship

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, nullable=False)
    username = Column(String, nullable=False)
    master_password = Column(String, nullable=False)

    vault_entries = relationship("VaultEntry", back_populates="owner")
