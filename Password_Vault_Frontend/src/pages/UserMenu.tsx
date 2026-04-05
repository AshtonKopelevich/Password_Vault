import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./sheets.css";

// Convert ArrayBuffer to Base64 for sending over JSON
function bufferToBase64(buffer: ArrayBuffer): string {
    return btoa(String.fromCharCode(...new Uint8Array(buffer)));
}

// Convert Base64 back to ArrayBuffer for decryption
function base64ToBuffer(b64: string): ArrayBuffer {
    return Uint8Array.from(atob(b64), c => c.charCodeAt(0)).buffer;
}

// Encrypts a plaintext password using the encryptionKey from sessionStorage
async function encryptPassword(plaintext: string, encryptionKeyHex: string) {
    const keyBytes = Uint8Array.from(
        encryptionKeyHex.match(/.{2}/g)!.map(b => parseInt(b, 16))
    );
    const key = await crypto.subtle.importKey(
        "raw", keyBytes, { name: "AES-GCM" }, false, ["encrypt"]
    );
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ciphertext = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv },
        key,
        new TextEncoder().encode(plaintext)
    );
    return {
        password: bufferToBase64(ciphertext),
        iv: bufferToBase64(iv.buffer)
    };
}

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
        let err_num = 0b0000;
        if (password.length >= 8) {
            err_num |= 0b0001;
        }
        for (let i = 0; i < password.length; i++) {
            let c = password.charCodeAt(i);
            if (47 < c && c < 58) {
                err_num |= 0b0010;
            }
            if (64 < c && c < 91) {
                err_num |= 0b0100;
            }
            if ((32 < c && c < 48) || (57 < c && c < 65) || (90 < c && c < 97) || (122 < c && c < 127)) {
                err_num |= 0b1000;
            }
        }
        return err_num; // the return is in bitwise which helps with determining error type for a program
        // as a boolean statement:
        // if err_num == 0b1111
        //      there are no errors
        // else
        //      there are errors
    }

    function passwordFormatMsg() {
        let msg = "";
        const err_num = passwordFormatErr();
        if ((err_num & 0b0001) == 0) {
            msg += "Password has to be at least 8 characters long.\n";
        }
        if ((err_num & 0b0010) == 0) {
            msg += "Password has to contain at least 1 numerical character [0-9].\n";
        }
        if ((err_num & 0b0100) == 0) {
            msg += "Password has to contain at least 1 uppercase character [A-Z].\n";
        }
        if ((err_num & 0b1000) == 0) {
            msg += "Password has to contain at least 1 special character (&%*^ etc.).\n"
        }

        return msg;
    }

    async function newUserSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Pull encryptionKey from session — if missing, session expired
    const encryptionKey = sessionStorage.getItem("encryptionKey");
    if (!encryptionKey) {
        navigate("/");  // boot back to login
        return;
    }

    if (passwordFormatErr() !== 0b1111) {
        console.log("Invalid password format");
        return;
    }

    try {
        // ✅ Encrypt before anything leaves the browser
        const { password: encryptedPassword, iv } = await encryptPassword(password, encryptionKey);

        // ✅ Send encrypted bytes to backend, not plaintext to localStorage
        const response = await fetch("/vault", {
            method: "POST",
            credentials: "include",  // cookie is sent automatically
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ account: username, password: encryptedPassword, iv, salt: "" })
        });

        if (!response.ok) {
            console.log("Failed to save entry");
            return;
        }

        console.log("Entry saved successfully");

    } catch (err) {
        console.log("Encryption or network error");
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
        const bool = true;
        // for some odd reason this does not work, this will need to be fixed in the future.
        if (bool) {
            password_elem = "TBA"; // todo, connect this to fast API
        } else {
            password_elem = "Password cannot be retrieved at the moment, please try again later";
        }
    }

        function handleLogout() {
        sessionStorage.removeItem("encryptionKey");
        sessionStorage.removeItem("userId");
        navigate("/");
    }

// Add a logout button to the JSX
<button type="button" onClick={handleLogout}>Logout</button>

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
                    <p>{passwordFormatMsg()}</p>
                    <p>{passwordMatchMsg()}</p>

                    <button type="submit">Submit</button>
                </form>
                <br></br>
                {/* View Passwords */}
                <h3>View Passwords</h3>

                <br></br>
                <button type="button" onSubmit={showPassword}>View Password</button>
                <p>{password_elem}</p>
            </section>

            <footer>
                <p>© Password Vault 2026</p>
            </footer>
        </div>
    );
}


export default UserMenu;
