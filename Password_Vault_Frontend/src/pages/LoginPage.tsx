import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./sheets.css";
import axios from 'axios';

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const navigate = useNavigate();
    const [errMsg, setErrMsg] = useState("");

    function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();

        const bool = e.isDefaultPrevented();;
        // User types sensative data
        // Derive authKey & encryptionKey (derived from the PBKDF2 API)
        // Send (hashed) authkKey to backend (not encryptionKey)
        // Backend returns JNT
        // use encryptionKey locally to decrypt vault data received from backend.
        // problem with localStorage: easy to access by 3rd parties
        if (bool) {

            navigate("/UserMenu");

            // The code below is commented out so that other features of the code could be tested without this piece interfering
            // due to us lacking encryption methods at this point in time.
            // const userData = {
            //     email: email,
            //     username: username,
            //     hashed_password: password // todo encrypt the password
            // };

            // // todo define the session id
            // axios.post("http://localhost:8000/auth/login", userData)
            //         .then(res => {
            //             let msg = res.data()["message"];
            //             if (msg === "Login successful") {
            //                 navigate("/UserMenu");
            //             } else {
            //                 setErrMsg("Invalid credentials");
            //             }
            //         }).catch(reason => setErrMsg("There was an error on log in"));

        } else {
            // show error message
            setErrMsg("Unable to handle password request");
        }
    }

    function register() {
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
                        type="text"
                        id="email"
                        name="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />

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
                
                <br></br>
                <p>Don't have an account?</p>
                <button type="button" onClick={register}>Register here!</button>
            </section>

            <footer>
                <p>© Password Vault 2026</p>
            </footer>
        </div>
    );
}