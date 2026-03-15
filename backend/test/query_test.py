<<<<<<< HEAD
from backend.app.test import Base, engine, get_session
from backend.models.user import User
from backend.models.vault_entry import VaultEntry


from backend.query_helper_functions import add_user, add_vault_entry

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
=======
from backend.app.database import Base, engine, SessionLocal
from backend.models import User, VaultEntry
from backend.models.query_helper_functions import add_user, add_vault_entry, get_all_users

#make tables
Base.metadata.create_all(bind=engine)

#open a sesssion = SessionLocal()
session = SessionLocal()

bob = add_user(session, email="bob@example.com", username="bob", password=b"hashedpassword")
add_vault_entry(session, user_id=bob.id, account="netfilx", password=b"secret123")

molly = add_user(session, email="molly@example.com", username="molly00", password=b"hashedpassword")
add_vault_entry(session, user_id=molly.id, account="gmail", password=b"secret123")
add_vault_entry(session, user_id=molly.id, account="spotify", password=b"password")

print(get_all_users(session))
#close session
>>>>>>> Ashton
session.close()