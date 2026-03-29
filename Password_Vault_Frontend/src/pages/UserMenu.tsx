import React, {useState} from "react";
import "./sheets.css";
import {useNavigate} from "react-router-dom";

function UserMenu() {
    // The log-in process //
    var unauth = false; // the idea is that this is set to true if the backend recognizes the current session.
    const navigate = useNavigate();

    if (unauth) {
        navigate("/");
    }

    // the website display process //
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [password2, setPassword2] = useState("");

    function passwordMatchMsg() {
        if (password2 != password) {
            return "Passwords MUST match";
        }
    }

    function passwordFormatErr() {
        /* This function outputs a bitwise value for the type of password error the user makes
        * The format is (0000) where:
        *       The first digit is there is at least 1 special character
        *       The second digit is there is at least 1 uppercase letter
        *       The third digit is there is at least 1 numerical character
        *       The last digit is the password is at least 8 character long
        * */
        let err_num = 0b10000;
        if (password.length >= 8) {
            err_num |= 0b00001;
        }
        let specCharFound = false;
        for (let i = 0; i < password.length; i++) {
            let c = password.charCodeAt(i);
            if (47 < c && c < 58) {
                err_num |= 0b00010;
            }
            if (64 < c && c < 91) {
                err_num |= 0b00100;
            }
            if ((32 < c && c < 48) || (57 < c && c < 65) || (90 < c && c < 97) || (122 < c && c < 127)) {
                err_num |= 0b01000;
            }
            if (c <= 32 || c > 127) {
                specCharFound = true;
            }
        }
        if (specCharFound) {
            err_num &= 0b01111;
        }
        return err_num; // the return is in bitwise which helps with determining error type for a program
        // as a boolean statement:
        // if err_num == 0b11111
        //      there are no errors
        // else
        //      there are errors
    }

    function passwordFormatMsg() {
        let msgs = [];
        const err_num = passwordFormatErr();
        if ((err_num & 0b00001) == 0) {
            msgs.push("Password has to be at least 8 characters long.");
        }
        if ((err_num & 0b00010) == 0) {
            msgs.push("Password has to contain at least 1 numerical character [0-9].");
        }
        if ((err_num & 0b00100) == 0) {
            msgs.push("Password has to contain at least 1 uppercase character [A-Z].");
        }
        if ((err_num & 0b01000) == 0) {
            msgs.push("Password has to contain at least 1 special character (&%*^ etc.).");
        }
        if ((err_num & 0b10000) == 0) {
            msgs.push("Password contains an invalid character");
        }
        return msgs.map((msg, i) => {
            return (
                <li key={i}>
                    {msg}
                </li>
            );
        });
    }

    function newUserSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();

        const bool = e.isDefaultPrevented() && passwordFormatErr() == 0b11111;

        if (bool) {
            // todo
            // pseudocode:
            // backend.username = username
            // backend.password = password
        } else {
            // show error message
            console.log("Invalid password") // this should cuz the website to go up or something or highlight the button
        }
    }

    function changePasswordSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();

        const bool = e.isDefaultPrevented() && passwordFormatErr() == 0b1111 && password == password2;

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

    return (
        <div>
            <header></header>

            <section>
                <h1>Login Successful</h1>
                <br></br>

                {/* Add New Account */}
                <h3>Add New Account</h3>
                <form onSubmit={newUserSubmit}>
                    <label htmlFor="application-name">Application Name:</label>
                    <input type="text" id="application-name" name="application" />
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
                    <br></br>
                    <p>{passwordFormatMsg()}</p>
                    {/*The code above probably needs a different method, or we implement inputs*/}

                    <button type="submit">Submit</button>
                </form>
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
                    <ul>{passwordFormatMsg()}</ul>
                    <p>{passwordMatchMsg()}</p>

                    <button type="submit">Submit</button>
                </form>
                <br></br>
                {/* View Passwords */}
                <h3>View Passwords</h3>

                <br></br>
                <button type="button" onClick={showPassword}>View Passwords</button>
                <p>{password_elem}</p>
            </section>

            <footer>
                <p>© Password Vault 2026</p>
            </footer>
        </div>
    );
}

export default UserMenu;
