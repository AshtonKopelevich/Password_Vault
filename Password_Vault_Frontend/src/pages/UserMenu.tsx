import React, {useState} from "react";
import "./sheets.css";
import {useNavigate} from "react-router-dom";
import axios from "axios";
import {passwordMatchMsg, passwordFormatMsg, passwordFormatErr} from "../App";

function UserMenu() {
    // The log-in process //
    var unauth = false; // the idea is that this is set to true if the backend recognizes the current session.
    const navigate = useNavigate();

    if (unauth) {
        navigate("/");
    }

    // the website display process //
    const [password, setPassword] = useState("");
    const [password2, setPassword2] = useState("");


    function changePasswordSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();

        const bool = e.isDefaultPrevented() && passwordFormatErr(password) == 0b1111 && password == password2;

        if (bool) {
            // todo
            // pseudocode:
            // backend.password = password
        } else {
            // show error message
            console.log("Invalid password") // this should cuz the website to go up or something or highlight the button
        }
    }

    let password_elem = "";
    function showPassword() {
        const bool = true; // this boolean checks whether the API call is at all possible.
        // for some odd reason this does not work, this will need to be fixed in the future.
        if (bool) {
            navigate("/PasswordList");
        } else {
            password_elem = "Password cannot be retrieved at the moment, please try again later";
        }
    }

    function logout() {
        navigate("/");
    }

    return (
        <div>
            <header></header>

            <section>
                <h1>Login Successful</h1>
                <br></br>

                {/* Change Password */}
                <h3>Change Password</h3>
                <form onSubmit={changePasswordSubmit}>
                    <label htmlFor="new-password">New Password:</label>
                    <input
                        type="text"
                        id="new-password"
                        name="new-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                    <br></br>

                    <label htmlFor="new-password2">Enter Password Again:</label>
                    <input
                        type="text"
                        id="new-password2"
                        name="new-password2"
                        onChange={(e) => setPassword2(e.target.value)}
                    />
                    <br></br>
                    <ul>{passwordFormatMsg(password)}</ul>
                    <p>{passwordMatchMsg(password, password2)}</p>

                    <button type="submit">Submit</button>
                </form>
                <br></br>
                {/* View Passwords, this page may not be accessible given what methods are available in the front end */}
                <h3>View Passwords</h3>

                <br></br>
                <button type="button" onClick={showPassword}>View Passwords</button>
                <p>{password_elem}</p>
                {/*The thing above could be a way to display error messages instead*/}

                <h3>Logout</h3>
                <button type="button" onClick={logout}>Logout</button>
            </section>

            <footer>
                <p>© Password Vault 2026</p>
            </footer>
        </div>
    );
}

export default UserMenu;
