import React, {useState} from "react";
import "./sheets.css";
import {useNavigate} from "react-router-dom";


function PasswordList() {
    // The log-in process //
    var unauth = false; // the idea is that this is set to true if the backend recognizes the current session.
    const navigate = useNavigate();

    if (unauth) {
        navigate("/");
    }

    // password obtaination
    let passwords = [];
    // uses the backend to get the list of passwords
    // the below uses dummy data for the time being
    passwords = ["Gr3gorzBreczyszczkiew!cz", "Sl@g1niumYassifier", "P@ssw0rd1sPotat0e"];

    const listPass = passwords.map((password, i) => {
        return (
            <li key={i}>
                {password}
            </li>
        ); // depending on the format, this may get changed to a table rather than a list.
    });

    function goBack() {
        navigate("/UserMenu");
    }

    return (
        <div>
            <header></header>
            <section>
                <h3>Your Passwords:</h3>
                <ul>{listPass}</ul>
                <button onClick={goBack}>Go Back</button>
            </section>
            <footer>
                <p>© Password Vault 2026</p>
            </footer>
        </div>
    );
}

export default PasswordList;