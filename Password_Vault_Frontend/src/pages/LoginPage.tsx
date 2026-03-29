import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./sheets.css";


export default function LoginPage() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const navigate = useNavigate();
    const [errMsg, setErrMsg] = useState("");

    function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();

        const bool = e.isDefaultPrevented();

        if (bool) {
            navigate("/UserMenu");
            // Exception code if a connection cannot be made for fast API:
            // setErrMsg("There was an error on login");
            // Exception code if the password or username cannot be found in the database:
            // setErrMsg("Incorrect or invalid username or password");
        } else {
            // show error message
            setErrMsg("Unable to handle password request");
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

                    <br></br>
                    <label htmlFor="password">Password:</label>
                    <input
                        type="text"
                        id="password"
                        name="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />

                    <br></br>
                    <button type="submit">Submit</button>
                </form>
                <p>{errMsg}</p>
            </section>

            <footer>
                <p>© Password Vault 2026</p>
            </footer>
        </div>
    );
}