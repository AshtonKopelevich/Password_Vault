# 🔐 Salt Fix: Visual Diagrams & Architecture

## High-Level Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                        PASSWORD VAULT                            │
│                      (After Security Fix)                         │
└──────────────────────────────────────────────────────────────────┘

┌─────────────────────┐                 ┌────────────────────────┐
│   Frontend React    │                 │   Backend FastAPI      │
│                     │                 │                        │
│ ┌────────────────┐  │                 │ ┌──────────────────┐  │
│ │ NewAccount.tsx │  │ Random Salt     │ │  User Model      │  │
│ │  (Register)    │──────────────────→│ │ ┌──────────────┐ │  │
│ └────────────────┘  │                 │ │ id: int      │ │  │
│                     │                 │ │ email: str   │ │  │
│ ┌────────────────┐  │                 │ │ password: str│ │  │
│ │ LoginPage.tsx  │  │ Fetch Salt      │ │ salt: str ✅ │ │  │
│ │  (Login)       │──────────────────→│ │ └──────────────┘ │  │
│ └────────────────┘  │                 │ └──────────────────┘  │
│                     │                 │                        │
│ ┌────────────────┐  │                 │ ┌──────────────────┐  │
│ │ crypto.ts ✅   │  │                 │ │ auth.py          │  │
│ │ (Utilities)    │  │                 │ │ /auth/get-salt ✅│  │
│ └────────────────┘  │                 │ │ /auth/signup ✅  │  │
│                     │                 │ │ /auth/login ✅   │  │
└─────────────────────┘                 │ └──────────────────┘  │
                                        └────────────────────────┘

             WebCrypto API                    SQLite Database
            ✅ Secure Random                  ✅ Store Salt
            ✅ PBKDF2 (600k iter)             ✅ Validate Keys
```

---

## Registration Flow (Detailed)

```
START
  ↓
┌─────────────────────────────────────────────────────┐
│ User enters: email, username, password              │
└─────────────────────────────────────────────────────┘
  ↓
┌─────────────────────────────────────────────────────┐
│ Frontend: Check password requirements               │
│           (uppercase, lowercase, number, special)   │
└─────────────────────────────────────────────────────┘
  ↓ ✅ Valid
┌─────────────────────────────────────────────────────┐
│ [SECURITY FIX] Frontend: generateRandomSalt()       │
│                                                      │
│ randomSalt = crypto.getRandomValues(Uint8Array(16)) │
│ // Results in: Uint8Array with 16 random bytes      │
│ // Hex: "a4f28c1d5e9b34217c6e9d2af5b8c401"          │
└─────────────────────────────────────────────────────┘
  ↓
┌─────────────────────────────────────────────────────┐
│ [SECURITY FIX] Frontend: deriveMasterKeys()          │
│                                                      │
│ rawKey = importKey(password, "PBKDF2")               │
│ bits = deriveBits({                                 │
│   name: "PBKDF2",                                   │
│   salt: randomSalt,  ← ✅ RANDOM SALT (NOT EMAIL)   │
│   iterations: 600000,                               │
│   hash: "SHA-256"                                   │
│ }, rawKey, 512)                                     │
│                                                      │
│ authKey = bits[0:32]                                │
│ encryptionKey = bits[32:64]                         │
└─────────────────────────────────────────────────────┘
  ↓
┌─────────────────────────────────────────────────────┐
│ Frontend: Prepare signup payload                    │
│                                                      │
│ body = {                                            │
│   email: "user@example.com",                        │
│   username: "user",                                 │
│   hashed_password: bufferToHex(authKey),            │
│   salt: bufferToHex(randomSalt) ← ✅ NEW FIELD      │
│ }                                                   │
└─────────────────────────────────────────────────────┘
  ↓
┌─────────────────────────────────────────────────────┐
│ Frontend: POST /auth/signup                         │
│ (credentials: include)                              │
└─────────────────────────────────────────────────────┘
  ↓
┌─────────────────────────────────────────────────────┐
│ Backend: Receive signup request                     │
│                                                      │
│ Validate:                                           │
│ ✓ email doesn't exist                               │
│ ✓ username doesn't exist                            │
│ ✓ salt is 32 hex chars (16 bytes) ← ✅ NEW CHECK    │
│ ✓ salt is valid hex format ← ✅ NEW CHECK           │
└─────────────────────────────────────────────────────┘
  ↓ ✅ Valid
┌─────────────────────────────────────────────────────┐
│ Backend: Hash and store user                        │
│                                                      │
│ user = User(                                        │
│   email="user@example.com",                         │
│   username="user",                                  │
│   password=bcrypt(hashed_password),                 │
│   salt="a4f28c1d5e9b34217c6e9d2af5b8c401" ← ✅ NEW  │
│ )                                                   │
│ db.add(user)                                        │
│ db.commit()                                         │
└─────────────────────────────────────────────────────┘
  ↓
┌─────────────────────────────────────────────────────┐
│ Backend: Create session cookie                      │
│                                                      │
│ token = create_session_token(user.id)               │
│ response.set_cookie("session_id", token,            │
│   httponly=True, samesite="lax", secure=False)      │
└─────────────────────────────────────────────────────┘
  ↓
┌─────────────────────────────────────────────────────┐
│ Backend: Return response                            │
│                                                      │
│ {"message": "User created", "user_id": 42}          │
└─────────────────────────────────────────────────────┘
  ↓
┌─────────────────────────────────────────────────────┐
│ Frontend: Store in sessionStorage                   │
│                                                      │
│ sessionStorage.setItem("encryptionKey",             │
│   bufferToHex(encryptionKey))                       │
│ sessionStorage.setItem("userId", "42")              │
└─────────────────────────────────────────────────────┘
  ↓
┌─────────────────────────────────────────────────────┐
│ Frontend: Navigate to /UserMenu                     │
└─────────────────────────────────────────────────────┘
  ↓
SUCCESS ✅
─────────────────────────────────────────────────────
User account created with RANDOM UNIQUE salt!
All vault entries encrypted with strong derivation.
```

---

## Login Flow (Detailed)

```
START
  ↓
┌──────────────────────────────────────────────────────┐
│ User enters: email, password                         │
└──────────────────────────────────────────────────────┘
  ↓
┌──────────────────────────────────────────────────────┐
│ [SECURITY FIX] Frontend: Fetch user's salt           │
│                                                       │
│ GET /auth/get-salt?email=user@example.com            │
│                                                       │
│ ↓ Backend checks User table                          │
│                                                       │
│ CASE 1: User found AND has salt                      │
│ └→ Return {"salt": "a4f28c1d...c401"}                │
│                                                       │
│ CASE 2: User found BUT no salt (backfill needed)     │
│ └→ Return {"salt": "00000000...0000"}  ← Signal      │
│                                                       │
│ CASE 3: User not found (will fail at login anyway)   │
│ └→ Return {"salt": "00000000...0000"}  ← Same signal │
└──────────────────────────────────────────────────────┘
  ↓
┌──────────────────────────────────────────────────────┐
│ Frontend: Convert hex salt to bytes                  │
│                                                       │
│ saltHex = "a4f28c1d5e9b34217c6e9d2af5b8c401"         │
│ salt = hexToBuffer(saltHex)                          │
│ // Result: Uint8Array([164, 242, 140, 29, ...])     │
└──────────────────────────────────────────────────────┘
  ↓
┌──────────────────────────────────────────────────────┐
│ Frontend: Detect backfill case                       │
│                                                       │
│ isBackfill = (saltHex === "00".repeat(16))           │
│                                                       │
│ if isBackfill:                                       │
│   // First login after update                        │
│   // User had no salt yet                            │
│   // Need to re-encrypt vault entries                │
│ else:                                                │
│   // Normal login, continue                          │
└──────────────────────────────────────────────────────┘
  ↓
┌──────────────────────────────────────────────────────┐
│ [SECURITY FIX] Frontend: deriveMasterKeys()          │
│                                                       │
│ const { authKey, encryptionKey } =                   │
│   await deriveMasterKeys(password, salt, 600000)     │
│                                                       │
│ // Uses retrieved salt (random or from backfill)    │
└──────────────────────────────────────────────────────┘
  ↓
┌──────────────────────────────────────────────────────┐
│ Frontend: POST /auth/login                           │
│                                                       │
│ body = {                                             │
│   email: "user@example.com",                         │
│   username: "",                                      │
│   hashed_password: bufferToHex(authKey)              │
│ }                                                    │
└──────────────────────────────────────────────────────┘
  ↓
┌──────────────────────────────────────────────────────┐
│ Backend: Verify credentials                         │
│                                                       │
│ user = query User where email = ...                  │
│ verify_auth_key(submitted_hash, user.password)      │
│                                                       │
│ if invalid:                                          │
│   → Return 401 "Invalid email or password"           │
│ else:                                                │
│   → Continue                                         │
└──────────────────────────────────────────────────────┘
  ↓ ✅ Credentials Valid
┌──────────────────────────────────────────────────────┐
│ [SECURITY FIX] Backend: Backfill salt if missing     │
│                                                       │
│ if not user.salt:                                    │
│   # First login after update                         │
│   user.salt = secrets.token_hex(16)                  │
│   # Generate: "f7a32e89b4d61c5f9e2b8a473d1fc6e5"    │
│   db.commit()                                        │
│                                                       │
│ Note: Frontend will handle re-encryption next        │
└──────────────────────────────────────────────────────┘
  ↓
┌──────────────────────────────────────────────────────┐
│ Backend: Create session and return                   │
│                                                       │
│ token = create_session_token(user.id)                │
│ response.set_cookie(...)                             │
│ return {"message": "Login successful", "user_id": 42}│
└──────────────────────────────────────────────────────┘
  ↓
┌──────────────────────────────────────────────────────┐
│ [SECURITY FIX] Frontend: Handle backfill case        │
│                                                       │
│ if isBackfill:                                       │
│   ├─ Derive old key (for re-encryption)              │
│   │   oldKey = PBKDF2(password,                      │
│   │     TextEncoder.encode(email), 100000)           │
│   │   // TEMP: Using email salt for decryption       │
│   │                                                  │
│   ├─ Fetch all vault entries                         │
│   │   GET /vault                                     │
│   │                                                  │
│   ├─ For each entry:                                │
│   │   ├─ Decrypt with oldKey (AES-GCM)             │
│   │   ├─ Generate new IV                            │
│   │   ├─ Encrypt with encryptionKey (AES-GCM)       │
│   │   └─ PUT /vault/entry/{id} (update backend)     │
│   │                                                  │
│   └─ All entries now use new encryption key! ✅     │
│                                                      │
│ else:                                                │
│   // Normal case, skip re-encryption                 │
└──────────────────────────────────────────────────────┘
  ↓
┌──────────────────────────────────────────────────────┐
│ Frontend: Store session data                         │
│                                                       │
│ sessionStorage.setItem("encryptionKey",              │
│   bufferToHex(encryptionKey))                        │
│ sessionStorage.setItem("userId", "42")               │
└──────────────────────────────────────────────────────┘
  ↓
┌──────────────────────────────────────────────────────┐
│ Frontend: Navigate to /UserMenu                      │
└──────────────────────────────────────────────────────┘
  ↓
SUCCESS ✅
─────────────────────────────────────────────────────
For normal login: User logged in with random salt
For backfill login: User logged in + vault entries re-encrypted
```

---

## Vault Re-encryption Process (Detailed)

```
TRIGGERED WHEN: First login after salt backfill

START
  ↓
┌────────────────────────────────────────────────────────┐
│ Frontend detects: isBackfill = true                    │
│ (saltHex === "00000000000000000000000000000000")        │
└────────────────────────────────────────────────────────┘
  ↓
┌────────────────────────────────────────────────────────┐
│ Derive OLD encryption key (using old email-based salt) │
│                                                         │
│ emailBasedSalt = TextEncoder.encode(email)             │
│ oldEncryptionKey = PBKDF2(password,                    │
│   emailBasedSalt, 100000)[32:64]                       │
│                                                         │
│ // This key was used to encrypt vault entries          │
│ // BEFORE the security fix                            │
└────────────────────────────────────────────────────────┘
  ↓
┌────────────────────────────────────────────────────────┐
│ Frontend: GET /vault                                   │
│                                                         │
│ Fetch all vault entries:                               │
│ [                                                      │
│   {                                                    │
│     id: 1,                                             │
│     account: "github.com",                             │
│     password: "dGVzdHBhc3M..." (base64),              │
│     iv: "abcd1234efgh..." (base64),                   │
│     salt: "..." (entry-specific salt for encryption)  │
│   },                                                   │
│   {                                                    │
│     id: 2,                                             │
│     account: "aws.amazon.com",                         │
│     password: "xyzpassword..." (base64),              │
│     iv: "ijkl5678mnop..." (base64),                   │
│     salt: "..."                                        │
│   }                                                    │
│ ]                                                      │
└────────────────────────────────────────────────────────┘
  ↓
┌────────────────────────────────────────────────────────┐
│ For EACH vault entry:                                  │
│                                                         │
│ ┌──────────────────────────────────────────────────┐   │
│ │ Entry 1: github.com                              │   │
│ │                                                  │   │
│ │ Step 1: Decode from base64                       │   │
│ │ ──────                                           │   │
│ │ ciphertext = base64.decode("dGVzdHBhc3M...")   │   │
│ │ iv = base64.decode("abcd1234efgh...")            │   │
│ │ entrySalt = base64.decode(entry.salt)            │   │
│ │                                                  │   │
│ │ Step 2: Decrypt with OLD key (AES-256-GCM)       │   │
│ │ ──────                                           │   │
│ │ decryptedPassword = await crypto.subtle.decrypt( │   │
│ │   {                                              │   │
│ │     name: "AES-GCM",                             │   │
│ │     iv: iv                                       │   │
│ │   },                                             │   │
│ │   oldEncryptionKey,  ← ✅ OLD KEY (email-based) │   │
│ │   ciphertext                                     │   │
│ │ )                                                │   │
│ │ // Result: "myGitHubPassword123!"                │   │
│ │                                                  │   │
│ │ Step 3: Generate new IV                          │   │
│ │ ──────                                           │   │
│ │ newIv = crypto.getRandomValues(Uint8Array(12))  │   │
│ │                                                  │   │
│ │ Step 4: Encrypt with NEW key (AES-256-GCM)       │   │
│ │ ──────                                           │   │
│ │ reencryptedPassword = await crypto.subtle.encrypt│   │
│ │   {                                              │   │
│ │     name: "AES-GCM",                             │   │
│ │     iv: newIv                                    │   │
│ │   },                                             │   │
│ │   encryptionKey,  ← ✅ NEW KEY (random salt)    │   │
│ │   decryptedPassword                              │   │
│ │ )                                                │   │
│ │                                                  │   │
│ │ Step 5: Update backend                           │   │
│ │ ──────                                           │   │
│ │ PUT /vault/entry/1 {                             │   │
│ │   account: "github.com",                         │   │
│ │   password: base64(reencryptedPassword),  ✅     │   │
│ │   iv: base64(newIv),                      ✅     │   │
│ │   salt: entry.salt  (keep existing)              │   │
│ │ }                                                │   │
│ │                                                  │   │
│ │ ✅ Entry 1 re-encrypted!                          │   │
│ └──────────────────────────────────────────────────┘   │
│                                                         │
│ ┌──────────────────────────────────────────────────┐   │
│ │ Entry 2: aws.amazon.com                          │   │
│ │                                                  │   │
│ │ (Same process as Entry 1)                        │   │
│ │                                                  │   │
│ │ ✅ Entry 2 re-encrypted!                          │   │
│ └──────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────┘
  ↓
┌────────────────────────────────────────────────────────┐
│ Cleanup                                                │
│                                                         │
│ Clear oldEncryptionKey from memory                     │
│ Frontend now has only encryptionKey (new salt)         │
└────────────────────────────────────────────────────────┘
  ↓
SUCCESS ✅
─────────────────────────────────────────────────────
All vault entries decrypted with OLD key (email-salt)
All vault entries encrypted with NEW key (random salt)
Database updated with new encrypted data
New decryption key ready for use
User can now access vault with strong encryption!
```

---

## Data Structure Changes

### User Table (Before → After)

```
BEFORE:
┌─────────────────────────────────────┐
│ users                               │
├────┬──────────┬──────────┬──────────┤
│ id │  email   │ username │ password │
├────┼──────────┼──────────┼──────────┤
│ 1  │ a@x.com  │ user1    │ $2b$... │
│ 2  │ b@x.com  │ user2    │ $2b$... │
│ 3  │ c@x.com  │ user3    │ $2b$... │
└────┴──────────┴──────────┴──────────┘

❌ No salt column - VULNERABLE!


AFTER:
┌───────────────────────────────────────────────────────────┐
│ users                                                     │
├────┬──────────┬──────────┬──────────┬─────────────────┤
│ id │  email   │ username │ password │       salt      │
├────┼──────────┼──────────┼──────────┼─────────────────┤
│ 1  │ a@x.com  │ user1    │ $2b$... │ a4f28c1d5e9... │
│ 2  │ b@x.com  │ user2    │ $2b$... │ f7a32e89b4d... │
│ 3  │ c@x.com  │ user3    │ $2b$... │ 00000000000... │
└────┴──────────┴──────────┴──────────┴─────────────────┘

✅ Random salt per user - SECURE!
   User 3 has "00"*16 = needs backfill on next login
```

---

## Encryption Key Derivation

```
BEFORE (VULNERABLE):
──────────────────

Password:  "SecurePassword123"
Email:     "user@example.com"

PBKDF2 Input:
  - PRF: HMAC-SHA256
  - Password: "SecurePassword123"
  - Salt: "user@example.com" ❌ PREDICTABLE
  - Iterations: 100,000
  - Output Length: 512 bits (64 bytes)

PBKDF2 Output:
  [64 random-looking bytes]

Split:
  authKey = output[0:32]          ← sent to backend (hashed)
  encryptionKey = output[32:64]   ← used for vault encryption


PROBLEM:
─────────
Attacker knows the salt (email is public).
Can pre-compute PBKDF2 for common passwords with this salt.
Rainbow tables: Fast password cracking.


AFTER (SECURE):
───────────────

Password:  "SecurePassword123"
Salt:      "a4f28c1d5e9b34217c6e9d2af5b8c401" ✅ RANDOM

PBKDF2 Input:
  - PRF: HMAC-SHA256
  - Password: "SecurePassword123"
  - Salt: [random 16 bytes] ✅ UNPREDICTABLE
  - Iterations: 600,000 ✅ HIGHER
  - Output Length: 512 bits (64 bytes)

PBKDF2 Output:
  [64 random-looking bytes]

Split:
  authKey = output[0:32]          ← sent to backend (hashed)
  encryptionKey = output[32:64]   ← used for vault encryption


BENEFIT:
────────
Each user has unique salt.
Pre-computed tables ineffective.
~600k iterations required per guess.
Brute-force becomes slow and expensive.
```

---

## Security Timeline (User Perspective)

```
SCENARIO: User registered BEFORE security fix

Timeline:
──────────────────────────────────────────────────────────

T1: Registration (Before Fix)
    ├─ Email: user@example.com
    ├─ Password: SecurePassword123
    ├─ Salt used: TextEncoder.encode("user@example.com") ❌
    ├─ Vault entry: "Netflix", encrypted with weak key ❌
    └─ Status: VULNERABLE

T2-T100: User logs in many times (Before Fix)
    ├─ Salt: Always TextEncoder.encode(email) ❌
    ├─ Vault: Decrypts with same weak key ❌
    └─ Status: STILL VULNERABLE

T101: SECURITY UPDATE DEPLOYED
    ├─ Backend: Can handle random salts
    ├─ Frontend: Will fetch and use salts
    └─ Status: DEPLOYMENT READY

T102: User logs in (First Time After Update)
    ├─ Frontend: Fetches salt
    ├─ Backend: Returns "00"*16 (no salt = backfill)
    ├─ Frontend: Detects backfill case!
    │
    ├─ BACKFILL PROCESS TRIGGERED:
    │  ├─ Derives OLD key (email-based salt)
    │  ├─ Decrypts "Netflix" entry (old key)
    │  ├─ Backend generates NEW random salt
    │  ├─ Derives NEW key (random salt) ✅
    │  ├─ Re-encrypts "Netflix" entry (new key) ✅
    │  ├─ Sends to backend for storage
    │  └─ User.salt now set to "a4f28c1d..." ✅
    │
    └─ MIGRATION COMPLETE ✅

T103+: User logs in (Subsequent Times After Update)
    ├─ Frontend: Fetches salt ("a4f28c1d...")
    ├─ Derives key using random salt ✅
    ├─ Vault: Decrypts with strong key ✅
    └─ Status: SECURE ✅

RESULT:
───────
User security increased from VULNERABLE to SECURE
No password change required.
No vault data lost.
Transparent, one-time migration.
```

---

## Protocol Comparison

```
OLD PROTOCOL (Vulnerable):
──────────────────────────────

CLIENT: email, password → Browser
  ↓
  PBKDF2(password, TextEncoder(email), 100k iterations)
  ↓
  authKey (32 bytes) + encryptionKey (32 bytes)
  ↓
  Sends authKey → Server (as bcrypt hash)
  Keeps encryptionKey → Browser (for vault)
  ↓
SERVER: Verify bcrypt(authKey) matches stored hash
  ↓
Session created ✓
  ↓
VAULT ENCRYPTION: All entries encrypted with encryptionKey
  derived from PREDICTABLE email-based salt ❌


NEW PROTOCOL (Secure):
──────────────────────

CLIENT: email, password → Browser
  ↓
  GET /auth/get-salt?email=...
  ↓
SERVER: Return stored random salt (or "00"*16 if missing)
  ↓
CLIENT: Convert salt from hex to bytes
  ↓
  Check if backfill needed (salt == "00"*16)
  ↓
  PBKDF2(password, randomSalt, 600k iterations)
  ↓
  authKey (32 bytes) + encryptionKey (32 bytes)
  ↓
  If backfill:
    ├─ Derive OLD key (email-based) for decryption
    ├─ Fetch vault entries
    ├─ Decrypt with OLD key
    ├─ Re-encrypt with NEW key
    └─ Send updated entries
  ↓
  Sends authKey → Server (as bcrypt hash)
  Keeps encryptionKey → Browser (for vault)
  ↓
SERVER: Verify bcrypt(authKey) matches stored hash
        If User.salt is NULL: Generate and store random salt
  ↓
Session created ✓
  ↓
VAULT ENCRYPTION: All entries encrypted with encryptionKey
  derived from RANDOM salt per user ✅
  Backfilled entries now use NEW encryption ✅
```

---

**Summary: All diagrams show the progression from vulnerable → secure architecture.**

The fix ensures:
- ✅ Random salts per user
- ✅ No pre-computed attack tables
- ✅ Per-user brute-force required
- ✅ Transparent migration
- ✅ Zero downtime
