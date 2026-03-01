# Password_Vault
# Password Vault

## Overview

This project is a FastAPI-based backend service using PostgreSQL, SQLAlchemy, Alembic migrations, and Pydantic v2.

---

## Requirements

* Python **3.12.x (64-bit)**
* Git
* PostgreSQL (local or remote)

---

## Setup

### 1. Install Python 3.12

Download and install from:
[https://www.python.org/downloads/](https://www.python.org/downloads/)

Ensure **Add Python to PATH** is checked during installation.

Verify:

```bash
py -0
```

---

### 2. Create Virtual Environment

```bash
py -3.12 -m venv venv --upgrade-deps
```

Activate:

**Windows**

```bash
.venv\Scripts\activate
```

Verify:

```bash
python --version
python -m pip --version
```

---

### 3. Install Dependencies

```bash
pip install -r requirements.txt
```

---

## Running the Application

```bash
uvicorn app.main:app --reload
```

Default server:

* API: [http://127.0.0.1:8000](http://127.0.0.1:8000)
* Docs: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

---

## Database Setup

Configure database connection via environment variables or `.env` file.

Example:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/dbname
```

Run migrations:

```bash
alembic upgrade head
```

---

## Testing

```bash
pytest
```

---

## Project Stack

* FastAPI
* Uvicorn
* SQLAlchemy 2.x
* Alembic
* PostgreSQL
* Pydantic v2
* HTTPX
* Pytest

---

## Troubleshooting

### pip not found

Recreate the virtual environment:

```bash
rmdir /s /q venv
py -3.12 -m venv venv --upgrade-deps
venv\Scripts\activate
```

### Dependency Installation Errors

1. Upgrade tooling:

```bash
python -m pip install --upgrade pip setuptools wheel
```

2. Clear cache:

```bash
pip cache purge
```

3. Reinstall:

```bash
pip install -r requirements.txt
```

---

## Notes

* Python 3.13 is not recommended due to incomplete package wheel support.
* Do not manually pin `pydantic-core`.
