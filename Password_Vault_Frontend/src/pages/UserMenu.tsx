import React from "react";
import "./sheets.css";

function UserMenu() {
    return (
        <div>
            <header></header>

            <section>
                <h1>Login Successful</h1>

                {/* Add New Account */}
                <h3>Add New Account</h3>
                <form>
                    <label htmlFor="application-name">Application Name:</label>
                    <input type="text" id="application-name" name="application" />

                    <label htmlFor="new-acc-user">Username:</label>
                    <input type="text" id="new-acc-user" name="new-user" />

                    <label htmlFor="new-acc-password">Password:</label>
                    <input type="password" id="new-acc-password" name="new-password" />

                    <button type="submit">Submit</button>
                </form>

                {/* Change Password */}
                <h3>Change Password</h3>
                <form>
                    <label htmlFor="new-password">New Password:</label>
                    <input type="text" id="new-password" name="new-password" />

                    <label htmlFor="password2">Enter Password Again:</label>
                    <input type="text" id="password2" name="password2" />

                    <button type="submit">Submit</button>
                </form>

                {/* View Passwords */}
                <h3>View Passwords</h3>
                <button type="button">View Password</button>
            </section>

            <footer>
                <p>© Password Vault 2026</p>
            </footer>
        </div>
    );
}

export default UserMenu;
