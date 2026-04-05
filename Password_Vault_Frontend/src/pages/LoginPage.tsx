import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./sheets.css";

function bufferToHex(buffer: ArrayBuffer): string {
    return Array.from(new Uint8Array(buffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

async function deriveMasterKeys(password: string, email: string) {
    const rawKey = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(password),
        "PBKDF2",
        false,
        ["deriveBits"]
    );

    const bits = await crypto.subtle.deriveBits(
        {
            name: "PBKDF2",
            salt: new TextEncoder().encode(email),
            iterations: 100000,
            hash: "SHA-256"
        },
        rawKey,
        512
    );

    return {
        authKey: bits.slice(0, 32),
        encryptionKey: bits.slice(32)
    };
}

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const navigate = useNavigate();

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError("");

        if (!email || !password) {
            setError("Please fill in all fields");
            return;
        }

        try {
            const { authKey, encryptionKey } = await deriveMasterKeys(password, email);

            const response = await fetch("/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    email,
                    hashed_password: bufferToHex(authKey)
                })
            });

            if (!response.ok) {
                setError("Invalid email or password");
                return;
            }

            const data = await response.json();
            sessionStorage.setItem("encryptionKey", bufferToHex(encryptionKey));
            sessionStorage.setItem("userId", String(data.user_id));

            navigate("/UserMenu");

        } catch (err) {
            setError("Something went wrong, please try again");
        }
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
                    {error && <p style={{ color: "red" }}>{error}</p>}
                    <button type="submit">Login</button>
                </form>
            </section>
            <footer>
                <p>© Password Vault 2026</p>
            </footer>
        </div>
    );
}