import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./sheets.css";

export default function LoginPage() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const navigate = useNavigate();

    function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();

        const bool = true;

        if (bool) {
            navigate("/UserMenu");
        } else {
            // show error message
        }
    }

    return (
        <div>
            <header></header>

            <section>
                <h1>Welcome to Password Vault</h1>

                <form onSubmit={handleSubmit}>
                    <label htmlFor="username">Username:</label>
                    <input
                        type="text"
                        id="username"
                        name="username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                    />

                    <label htmlFor="password">Password:</label>
                    <input
                        type="text"
                        id="password"
                        name="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />

                    <button type="submit">Submit</button>
                </form>
            </section>

            <footer>
                <p>© Password Vault 2026</p>
            </footer>
        </div>
    );
}