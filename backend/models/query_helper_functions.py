<<<<<<< HEAD:backend/query_helper_functions.py
from models import User, VaultEntry

##USERS FUNCTIONS###

#search user by username, email or id
def get_user(session, **kwargs):
    return session.query(User).filter_by(**kwargs).first()


#add user
def add_user(session, email, username, password):
    if get_user(session, username=username):
        print(f"User '{username}' already exists.")
        return None
    if get_user(session, email=email):
        print(f"User with email '{email}' already exists.")
        return None
    user = User(email=email, username=username, hashed_password=password)
    session.add(user)
    session.commit()
    return user

#prints vault entries for one user; pass username, email, or id as identifier
def print_user_vault_entries(session, **kwargs):
    user = get_user(session, **kwargs)
    if not user:
        print("User not found.")
        return

    if not user.vault_entries:
        print(f"{user.username} has no vault entries.")
        return

    print(f"Vault entries for {user.username}:")
    for entry in user.vault_entries:
        print(f"ID: {entry.id}, Account: {entry.account}, Password: {entry.password}")



def update_user(session, user, **kwargs):
    # Check for uniqueness if updating username/email
    if "username" in kwargs:
        existing = get_user(session, username=kwargs["username"])
        if existing and existing.id != user.id:
            print(f"Username '{kwargs['username']}' already taken.")
            kwargs.pop("username")
    if "email" in kwargs:
        existing = get_user(session, email=kwargs["email"])
        if existing and existing.id != user.id:
            print(f"Email '{kwargs['email']}' already taken.")
            kwargs.pop("email")
    # Update only valid fields
    for key, value in kwargs.items():
        if hasattr(user, key):
            setattr(user, key, value)
        else:
            print(f"Warning: '{key}' is not a valid User field.")
    session.commit()
    return user


def delete_user(session, user, delete_vault_entries=True):
    if delete_vault_entries:
        for entry in list(user.vault_entries):
            session.delete(entry)
    session.delete(user)
    session.commit()

def get_all_users(session):
    return session.query(User).all()

def print_all_users(session):
    users = get_all_users(session)
    for u in users:
        print(f"ID: {u.id}, Username: {u.username}, Email: {u.email}, Vault entries: {len(u.vault_entries)}")





##VAULT ENTRIES FUNCTIONS##


def add_vault_entry(session, owner_id, account, password):
    entry = VaultEntry(
        owner_id=owner_id,
        account=account,
        password=password,
        encrypted_data=b"test",
        iv=b"test",
        salt=b"test"
    )
    session.add(entry)
    session.commit()
    return entry


def get_vault_entries(session, owner_id=None, user=None):
    if user:
        owner_id = user.id
    if owner_id is None:
        return session.query(VaultEntry).all()
    return session.query(VaultEntry).filter_by(owner_id=owner_id).all()

def update_vault_entry(session, entry, **kwargs):
    for key, value in kwargs.items():
        setattr(entry, key, value)
    session.commit()
    return entry

def delete_vault_entry(session, entry):
    session.delete(entry)
    session.commit()
=======
from backend.models import User, VaultEntry

##USERS FUNCTIONS##

#search user by username, email or id
def get_user(session, **kwargs):
    return session.query(User).filter_by(**kwargs).first()


#add user
def add_user(session, email, username, password):
    existing = get_user(session, username=username)
    if existing:
        print(f"User '{username}' already exists.")
        return existing

    existing = get_user(session, email=email)
    if existing:
        print(f"User with email '{email}' already exists.")
        return existing

    user = User(email=email, username=username, password=password)
    session.add(user)
    session.commit()
    session.refresh(user)   # ensures user.id is available
    return user

#prints vault entries for one user; pass username, email, or id as identifier
def print_user_vault_entries(session, **kwargs):
    user = get_user(session, **kwargs)
    if not user:
        print("User not found.")
        return

    if not user.vault_entries:
        print(f"{user.username} has no vault entries.")
        return

    print(f"Vault entries for {user.username}:")
    for entry in user.vault_entries:
        print(f"ID: {entry.id}, Account: {entry.account}, Password: {entry.password}")



def update_user(session, user, **kwargs):
    # Check for uniqueness if updating username/email
    if "username" in kwargs:
        existing = get_user(session, username=kwargs["username"])
        if existing and existing.id != user.id:
            print(f"Username '{kwargs['username']}' already taken.")
            kwargs.pop("username")
    if "email" in kwargs:
        existing = get_user(session, email=kwargs["email"])
        if existing and existing.id != user.id:
            print(f"Email '{kwargs['email']}' already taken.")
            kwargs.pop("email")
    # Update only valid fields
    for key, value in kwargs.items():
        if hasattr(user, key):
            setattr(user, key, value)
        else:
            print(f"Warning: '{key}' is not a valid User field.")
    session.commit()
    return user


def delete_user(session, user, delete_vault_entries=True):
    if delete_vault_entries:
        for entry in list(user.vault_entries):
            session.delete(entry)
    session.delete(user)
    session.commit()

def get_all_users(session):
    return session.query(User).all()

def print_all_users(session):
    users = get_all_users(session)
    for u in users:
        print(f"ID: {u.id}, Username: {u.username}, Email: {u.email}, Vault entries: {len(u.vault_entries)}")





##VAULT ENTRIES FUNCTIONS##


def add_vault_entry(session, user_id, account, password, iv=b"test", salt=b"test"):
    entry = VaultEntry(
        user_id=user_id,
        account=account,
        password=password,
        iv=iv,
        salt=salt
    )
    session.add(entry)
    session.commit()
    return entry


def get_vault_entries(session, user_id=None, user=None):
    if user:
        user_id = user.id
    if user_id is None:
        return session.query(VaultEntry).all()
    return session.query(VaultEntry).filter_by(user_id=user_id).all()

def update_vault_entry(session, entry, **kwargs):
    for key, value in kwargs.items():
        setattr(entry, key, value)
    session.commit()
    return entry

def delete_vault_entry(session, entry):
    session.delete(entry)
    session.commit()
>>>>>>> 2999f8932432a2501fdccb9875fbe19f7bd7fc47:backend/models/query_helper_functions.py
