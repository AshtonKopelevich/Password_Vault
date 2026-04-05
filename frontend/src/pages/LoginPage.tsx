import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./sheets.css";

export default function LoginPage() {
    // Bowen's Note: I am going to assume that these variables are to be sent to the backend for evaluation
    //               As such, I will create my own variables for the UserMenu file that redefines what these
    //               variables will evaluate to.
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const navigate = useNavigate();

    function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();

        const bool = e.isDefaultPrevented();

        if (bool) {
            navigate("/UserMenu"); // Given the way I made my code work in the other file, I think there needs to be some way to allow this to not continue if the backend does not recognize the session.
            // I will assume that this is where the connection to fast API happens
        } else {
            // show error message
            console.log("Unable to handle submit")
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
            </section>

            <footer>
                <p>© Password Vault 2026</p>
            </footer>
        </div>
    );
}