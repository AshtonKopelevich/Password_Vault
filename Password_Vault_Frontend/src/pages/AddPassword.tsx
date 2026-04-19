import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./sheets.css";

// ---------------------------------------------------------------------------
// Crypto helpers
// ---------------------------------------------------------------------------

function bufferToBase64(buffer: ArrayBuffer): string {
    return btoa(String.fromCharCode(...new Uint8Array(buffer)));
}

async function encryptPassword(plaintext: string, encryptionKeyHex: string) {
    const keyBytes = Uint8Array.from(
        encryptionKeyHex.match(/.{2}/g)!.map(b => parseInt(b, 16))
    );
    const key = await crypto.subtle.importKey(
        "raw",
        keyBytes,
        { name: "AES-GCM" },
        false,
        ["encrypt"]
    );
    const iv = crypto.getRandomValues(new Uint8Array(12));  // 12 bytes required
    const ciphertext = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv },
        key,
        new TextEncoder().encode(plaintext)
    );
    return {
        password: bufferToBase64(ciphertext),
        iv: bufferToBase64(iv.buffer),
        salt: bufferToBase64(crypto.getRandomValues(new Uint8Array(16)).buffer), // 16 bytes required
    };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function AddPassword() {
    const navigate = useNavigate();

    const [account, setAccount] = useState("");   // e.g. "Netflix", "Gmail"
    const [password, setPassword] = useState("");  // plaintext — encrypted before sending
    const [statusMsg, setStatusMsg] = useState("");

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setStatusMsg("");

        if (!account || !password) {
            setStatusMsg("Please fill in all fields.");
            return;
        }

        const encryptionKey = sessionStorage.getItem("encryptionKey");
        if (!encryptionKey) {
            navigate("/");  // session expired — boot to login
            return;
        }

        try {
            const { password: encryptedPassword, iv, salt } = await encryptPassword(
                password,
                encryptionKey
            );

            const response = await fetch("http://localhost:8000/vault", {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    account,
                    password: encryptedPassword,
                    iv,
                    salt,
                }),
            });

            if (!response.ok) {
                const data = await response.json();
                setStatusMsg(data.detail ?? "Failed to save entry.");
                return;
            }

            setStatusMsg("Password saved successfully!");
            setAccount("");
            setPassword("");

        } catch (err) {
            setStatusMsg("Encryption or network error. Please try again.");
        }
    }

    return (
        <div>
            <header></header>

            <section>
                <h1>Add New Password</h1>
                <br />

                <form onSubmit={handleSubmit}>
                    <label htmlFor="account">Account Name (e.g. Netflix, Gmail):</label>
                    <input
                        type="text"
                        id="account"
                        name="account"
                        value={account}
                        onChange={(e) => setAccount(e.target.value)}
                    />
                    <br />

                    <label htmlFor="password">Password:</label>
                    <input
                        type="password"
                        id="password"
                        name="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                    <br />

                    {statusMsg && (
                        <p style={{ color: statusMsg.includes("success") ? "green" : "red" }}>
                            {statusMsg}
                        </p>
                    )}

                    <button type="submit">Save Password</button>
                </form>

                <br />
                <button type="button" onClick={() => navigate("/UserMenu")}>← Back</button>
            </section>

            <footer>
                <p>© Password Vault 2026</p>
            </footer>
        </div>
    );
}

export default AddPassword;