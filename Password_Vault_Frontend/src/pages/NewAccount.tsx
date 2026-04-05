import React, {useState} from "react";
import "./sheets.css";
import {useNavigate} from "react-router-dom";
import axios from "axios";
import {passwordMatchMsg, passwordFormatMsg, passwordFormatErr} from "../App";

function NewAccount() {
    const navigate = useNavigate();

    // the website display process //
    const [email, setEmail] = useState("");
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [password2, setPassword2] = useState("");
    const [register, setRegister] = useState("");

    function newUserSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();

        const bool = e.isDefaultPrevented() && passwordFormatErr(password) == 0b11111;

        if (bool) {
            const newUser = {
                email: email,
                username: username,
                hashed_password: password // todo, create a global method that hashes the password
            }

            axios.post("http://localhost:8000/auth/signup", newUser) // todo, add session id
                    .then(res => {
                        setRegister("User succesfully registered!");
                        navigate("/");
                    })
                    .catch(reason => setRegister("Unable to register due to " + reason));
        } else {
            // show error message
            console.log("Invalid password") // this should cuz the website to go up or something or highlight the button
        }
    }

    function login() {
        navigate("/");
    }

    return (
        <div>
            <header></header>

            <section>
                <h1>Register your account here!</h1>
                <br></br>

                {/* Add New Account, this should probably be its own webpage, the shared code could be global */}
                <h3>Add New Account</h3>
                <form onSubmit={newUserSubmit}>
                    <label htmlFor="email">Email:</label>
                    <input 
                        type="text"
                        id="email"
                        name="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />
                    <br></br>

                    <label htmlFor="new-acc-user">Username:</label>
                    <input
                        type="text"
                        id="new-user"
                        name="new-user"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                    />
                    <br></br>

                    <label htmlFor="new-acc-password">New Password:</label>
                    <input
                        type="text"
                        id="new-password"
                        name="new-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />

                    <label htmlFor="new-acc-password-ret">Enter password again:</label>
                    <input
                        type="text"
                        id="new-password2"
                        name="new-password2"
                        value={password2}
                        onChange={(e) => setPassword2(e.target.value)}
                    />
                    <br></br>
                    <p>{passwordFormatMsg(password)}</p>
                    <p>{passwordMatchMsg(password, password2)}</p>
                    {/*The code above probably needs a different method, or we implement inputs*/}

                    <button type="submit">Submit</button>
                </form>
                <p>{register}</p>
                
                <br></br>
                <p>Have an account?</p>
                <button type="button" onClick={login}>Log in here!</button>
            </section>

            <footer>
                <p>© Password Vault 2026</p>
            </footer>
        </div>
    );
}

export default NewAccount;
