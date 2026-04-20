import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    bufferToHex,
    deriveEncryptionKeyOnly,
    deriveMasterKeys,
    hexToBuffer,
} from "../utils/crypto";
import "./sheets.css";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [errMsg, setErrMsg] = useState("");
    const navigate = useNavigate();

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setErrMsg("");

        if (!email || !password) {
            setErrMsg("Please fill in all fields.");
            return;
        }

        try {
            // Step 1: Fetch the user's salt from the backend
            let saltResponse;
            try {
                saltResponse = await fetch(`http://localhost:8000/auth/get-salt?email=${encodeURIComponent(email)}`);
            } catch (err) {
                setErrMsg("Network error while retrieving salt. Please try again.");
                return;
            }

            if (!saltResponse.ok) {
                setErrMsg("Failed to retrieve salt. Please try again.");
                return;
            }

            const saltData = await saltResponse.json();
            const saltHex = saltData.salt;

            // Convert hex salt back to Uint8Array
            let salt: Uint8Array;
            try {
                salt = hexToBuffer(saltHex);
            } catch (err) {
                setErrMsg("Invalid salt received from server.");
                return;
            }

            // Step 2: Check if this is a backfill case (all zeros = user had no salt yet)
            const isBackfillCase = saltHex === "00".repeat(16);

            // Step 3: Derive keys with the retrieved salt
            const { authKey, encryptionKey } = await deriveMasterKeys(password, salt);

            // Step 4: Handle backfill re-encryption if needed
            let needsReencryption = false;
            let oldEncryptionKey: ArrayBuffer | null = null;

            if (isBackfillCase) {
                // User logging in for first time after update: need to re-encrypt vault entries
                // Derive old key using email-based salt for decryption
                const emailBasedSalt = new TextEncoder().encode(email);
                oldEncryptionKey = await deriveEncryptionKeyOnly(password, emailBasedSalt, 600000);
                needsReencryption = true;
            }

            // Step 5: Send login request
            const response = await fetch("http://localhost:8000/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",  // sends/receives the session cookie
                body: JSON.stringify({
                    email,
                    username: "",        // required by backend schema; not used for login lookup
                    hashed_password: bufferToHex(authKey),
                }),
            });

            // 1. Check for Rate Limiting (SlowAPI)
            if (response.status === 429) {
                setErrMsg("Too many login attempts. Please wait 5 minutes before trying again.");
                return;
            }

            // 2. Check for Invalid Credentials
            if (response.status === 401) {
                setErrMsg("Invalid email or password.");
                return;
            }

            // 3. Catch-all for other server errors (500, etc.)
            if (!response.ok) {
                setErrMsg("Server error. Please try again later.");
                return;
            }

            const data = await response.json();

            // encryptionKey stays in sessionStorage only — clears on tab close
            sessionStorage.setItem("encryptionKey", bufferToHex(encryptionKey));
            sessionStorage.setItem("userId", String(data.user_id));

            // Step 6: Handle vault re-encryption if this was a backfill case
            if (needsReencryption && oldEncryptionKey) {
                try {
                    await reEncryptVaultEntries(oldEncryptionKey, encryptionKey);
                } catch (err) {
                    console.error("Re-encryption failed:", err);
                    // Don't block login, but warn user
                    setErrMsg("Warning: Vault entries may not have been re-encrypted. Please contact support.");
                    // Still navigate, but with warning
                }
            }

            navigate("/UserMenu");

        } catch (err) {
            console.error("Login error:", err);
            setErrMsg("Something went wrong. Please try again.");
        }
    }

    /**
     * Re-encrypt all vault entries from old encryption key to new encryption key
     * This happens on first login after the salt backfill
     * @param oldEncryptionKey - Previous key (derived from email salt)
     * @param newEncryptionKey - New key (derived from random salt)
     */
    async function reEncryptVaultEntries(
        oldEncryptionKey: ArrayBuffer,
        newEncryptionKey: ArrayBuffer
    ): Promise<void> {
        try {
            // Fetch all vault entries
            const vaultResponse = await fetch("http://localhost:8000/vault", {
                method: "GET",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
            });

            if (!vaultResponse.ok) {
                throw new Error("Failed to fetch vault entries");
            }

            const entries = await vaultResponse.json();

            // Re-encrypt each entry
            for (const entry of entries) {
                try {
                    // Decode base64 to bytes
                    const ciphertext = Uint8Array.from(
                        atob(entry.password),
                        c => c.charCodeAt(0)
                    );
                    const iv = Uint8Array.from(
                        atob(entry.iv),
                        c => c.charCodeAt(0)
                    );

                    // Decrypt with old key
                    const decryptedPassword = await crypto.subtle.decrypt(
                        {
                            name: "AES-GCM",
                            iv: iv,
                        },
                        await crypto.subtle.importKey(
                            "raw",
                            oldEncryptionKey,
                            { name: "AES-GCM" },
                            false,
                            ["decrypt"]
                        ),
                        ciphertext
                    );

                    // Encrypt with new key using new IV
                    const newIv = crypto.getRandomValues(new Uint8Array(12));
                    const reencryptedPassword = await crypto.subtle.encrypt(
                        {
                            name: "AES-GCM",
                            iv: newIv,
                        },
                        await crypto.subtle.importKey(
                            "raw",
                            newEncryptionKey,
                            { name: "AES-GCM" },
                            false,
                            ["encrypt"]
                        ),
                        decryptedPassword
                    );

                    // Send updated entry to backend
                    await fetch(`http://localhost:8000/vault/entry/${entry.id}`, {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        credentials: "include",
                        body: JSON.stringify({
                            account: entry.account,
                            password: btoa(String.fromCharCode(...new Uint8Array(reencryptedPassword))),
                            iv: btoa(String.fromCharCode(...newIv)),
                            salt: entry.salt, // Keep existing salt
                        }),
                    });
                } catch (err) {
                    console.error(`Failed to re-encrypt entry ${entry.id}:`, err);
                    throw err;
                }
            }
        } catch (err) {
            console.error("Vault re-encryption error:", err);
            throw err;
        }
    }

    function handleRegister() {
        navigate("/NewAccount");
    }

    return (
        <div>
            <header></header>

            <section>
                <h1>Welcome to Password Vault</h1>

                <form onSubmit={handleSubmit}>
                    <label htmlFor="email">Email:</label>
                    <input
                        type="email"
                        id="email"
                        name="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />

                    <br />
                    <label htmlFor="password">Master Password:</label>
                    <input
                        type="password"
                        id="password"
                        name="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />

                    <br />
                    {errMsg && <p style={{ color: "red" }}>{errMsg}</p>}
                    <button type="submit">Login</button>
                </form>

                <br />
                <p>Don't have an account?</p>
                <button type="button" onClick={handleRegister}>Register here!</button>
            </section>

            <footer>
                <p>© Password Vault 2026</p>
            </footer>
        </div>
    );
}