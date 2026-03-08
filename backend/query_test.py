from app.database import Base, engine, get_session
from models import User, VaultEntry
from query_helper_functions import add_user, add_vault_entry

#make tables
Base.metadata.create_all(bind=engine)

#open a sesssion = get_session()
session = get_session()

bob = add_user(session, email="bob@example.com", username="bob", password="hashedpassword")
add_vault_entry(session, owner_id=bob.id, account="netfilx", password="secret123")

molly = add_user(session, email="molly@example.com", username="molly00", password="hashedpassword")
add_vault_entry(session, owner_id=molly.id, account="gmail", password="secret123")
add_vault_entry(session, owner_id=molly.id, account="spotify", password="password")


#close session
session.close()