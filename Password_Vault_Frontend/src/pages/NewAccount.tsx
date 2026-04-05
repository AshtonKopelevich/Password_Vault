import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { passwordFormatErr, passwordFormatMsg, passwordMatchMsg } from "../App";
import "./sheets.css";

// ---------------------------------------------------------------------------
// Crypto helpers (same as LoginPage — authKey derived from master password)
// ---------------------------------------------------------------------------

function bufferToHex(buffer: ArrayBuffer): string {
    return Array.from(new Uint8Array(buffer))
        .map(b => b.toString(16).padStart(2, "0"))
        .join("");
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
            hash: "SHA-256",
        },
        rawKey,
        512
    );

    return {
        authKey: bits.slice(0, 32),    // sent to backend — stored as bcrypt hash
        encryptionKey: bits.slice(32), // never leaves the browser
    };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function NewAccount() {
    const navigate = useNavigate();

    const [email, setEmail] = useState("");
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [password2, setPassword2] = useState("");
    const [statusMsg, setStatusMsg] = useState("");

    async function newUserSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setStatusMsg("");

        if (!email || !username || !password) {
            setStatusMsg("Please fill in all fields.");
            return;
        }

        if (passwordFormatErr(password) !== 0b11111) {
            setStatusMsg("Password does not meet the requirements below.");
            return;
        }

        if (password !== password2) {
            setStatusMsg("Passwords do not match.");
            return;
        }

        try {
            const { authKey, encryptionKey } = await deriveMasterKeys(password, email);

            const response = await fetch("http://localhost:8000/auth/signup", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",  // receives the session cookie on success
                body: JSON.stringify({
                    email,
                    username,
                    hashed_password: bufferToHex(authKey),
                }),
            });

            if (!response.ok) {
                const data = await response.json();
                setStatusMsg(data.detail ?? "Registration failed. Please try again.");
                return;
            }

            const data = await response.json();

            // Log the user straight in — store encryptionKey and userId just
            // like LoginPage does so ProtectedRoute lets them through
            sessionStorage.setItem("encryptionKey", bufferToHex(encryptionKey));
            sessionStorage.setItem("userId", String(data.user_id));

            navigate("/UserMenu");

        } catch (err) {
            setStatusMsg("Something went wrong. Please try again.");
        }
    }

    return (
        <div>
            <header></header>

            <section>
                <h1>Create an Account</h1>
                <br />

                <form onSubmit={newUserSubmit}>
                    <label htmlFor="email">Email:</label>
                    <input
                        type="email"
                        id="email"
                        name="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />
                    <br />

                    <label htmlFor="username">Username:</label>
                    <input
                        type="text"
                        id="username"
                        name="username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                    />
                    <br />

                    <label htmlFor="new-password">Password:</label>
                    <input
                        type="password"
                        id="new-password"
                        name="new-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                    <br />

                    <label htmlFor="new-password2">Confirm Password:</label>
                    <input
                        type="password"
                        id="new-password2"
                        name="new-password2"
                        value={password2}
                        onChange={(e) => setPassword2(e.target.value)}
                    />
                    <br />

                    <ul>{passwordFormatMsg(password)}</ul>
                    <p>{passwordMatchMsg(password, password2)}</p>

                    {statusMsg && (
                        <p style={{ color: statusMsg.includes("success") ? "green" : "red" }}>
                            {statusMsg}
                        </p>
                    )}

                    <button type="submit">Register</button>
                </form>

                <br />
                <p>Already have an account?</p>
                <button type="button" onClick={() => navigate("/")}>Log in here!</button>
            </section>

            <footer>
                <p>© Password Vault 2026</p>
            </footer>
        </div>
    );
}

export default NewAccount;