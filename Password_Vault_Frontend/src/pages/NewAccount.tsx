import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { passwordFormatErr, passwordFormatMsg, passwordMatchMsg } from "../App";
import { bufferToHex, generateRandomSalt, deriveMasterKeys } from "../utils/crypto";
import "./sheets.css";

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
            // Step 1: Generate a cryptographically random 16-byte salt
            const salt = generateRandomSalt();

            // Step 2: Derive keys with the random salt
            const { authKey, encryptionKey } = await deriveMasterKeys(password, salt);

            // Step 3: Send registration request with salt
            const response = await fetch("http://localhost:8000/auth/signup", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",  // receives the session cookie on success
                body: JSON.stringify({
                    email,
                    username,
                    hashed_password: bufferToHex(authKey),
                    salt: bufferToHex(salt),  // NEW: send random salt to backend
                }),
            });
            // 1. Check for Rate Limiting (SlowAPI)
            if (response.status === 429) {
                setStatusMsg("Too many registeration attempts. Please wait 3 minutes before trying again.");
                return;
            }

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
            console.error("Registration error:", err);
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
