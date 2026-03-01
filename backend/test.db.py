from app.database import Base, engine
from models.user import User
from models.vault_entry import VaultEntry
from sqlalchemy.orm import Session, relationship


Base.metadata.create_all(bind=engine)  #create tables


def get_user(session, username):
    return session.query(User).filter_by(username=username).first()

def add_user(session, email, username, master_password):
    if get_user(session, username):
        print(f"User '{username}' already exists.")
        return None
    user = User(email=email, username=username, master_password=master_password)
    session.add(user)
    session.commit()
    return user


def get_vault_entry(session, owner_id, account):
    return session.query(VaultEntry).filter_by(owner_id=owner_id, account=account).first()

def add_vault_entry(session, owner_id, account, password):
    if get_vault_entry(session, owner_id, account):
        print(f"Vault entry for account '{account}' already exists.")
        return None
    entry = VaultEntry(owner_id=owner_id, account=account, password=password)
    session.add(entry)
    session.commit()
    return entry

with Session(engine) as session: #open a session

    bob = add_user(session, "bob387@gmail.com", "bob", "bobpassword")
    john = add_user(session, "john287@gmail.com", "john", "johnpassword")
    john = add_user(session, "john287@gmail.com", "john", "johnpassword")

    if bob:
        add_vault_entry(session, bob.id, "gmail", "123")
        add_vault_entry(session, bob.id, "netflix", "456")
    
    if john:
        add_vault_entry(session, john.id, "gmail", "67")
        add_vault_entry(session, john.id, "spotify", "666")
    


    users = session.query(User).all()
    for u in users:
        print(f"User: {u.username}, Email: {u.email}")
        entries = session.query(VaultEntry).filter(VaultEntry.owner_id == u.id).all()
        for e in entries:
            print(f"  Account: {e.account}, Password: {e.password}")

    parsed_data = []

    for u in users:
        user_dict = {
            "username": u.username,
            "email": u.email,
            "master_password": u.master_password,
            "vault": []
        }
        entries = session.query(VaultEntry).filter(VaultEntry.owner_id == u.id).all()
        for e in entries:
            user_dict["vault"].append({
                "account": e.account,
                "password": e.password
            })
        parsed_data.append(user_dict)

    print(parsed_data)

