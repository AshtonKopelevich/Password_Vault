<<<<<<< HEAD
from app.database import Base, engine, get_session
from models import User, VaultEntry
from query_helper_functions import add_user, add_vault_entry, get_user, get_all_users
=======
from backend.app.database import Base, engine, SessionLocal
from backend.models import User, VaultEntry
from backend.models.query_helper_functions import add_user, add_vault_entry, get_all_users
>>>>>>> 2999f8932432a2501fdccb9875fbe19f7bd7fc47

#creates sqllite file "vault.db"
Base.metadata.create_all(bind=engine)

<<<<<<< HEAD
#create a session
with get_session() as session:
    bob = add_user(session, email="bob@example.com", username="bob", password="hashedpassword")
    add_vault_entry(session, owner_id=bob.id, account="netfilx", password="secret123")

    molly = add_user(session, email="molly@example.com", username="molly00", password="hashedpassword")
    add_vault_entry(session, owner_id=molly.id, account="gmail", password="secret123")
    add_vault_entry(session, owner_id=molly.id, account="spotify", password="password")

    get_user("bob", "bob@example.com")
=======
#open a sesssion = SessionLocal()
session = SessionLocal()

bob = add_user(session, email="bob@example.com", username="bob", password=b"hashedpassword")
add_vault_entry(session, user_id=bob.id, account="netfilx", password=b"secret123")

molly = add_user(session, email="molly@example.com", username="molly00", password=b"hashedpassword")
add_vault_entry(session, user_id=molly.id, account="gmail", password=b"secret123")
add_vault_entry(session, user_id=molly.id, account="spotify", password=b"password")

print(get_all_users(session))
#close session

session.close()
>>>>>>> 2999f8932432a2501fdccb9875fbe19f7bd7fc47
