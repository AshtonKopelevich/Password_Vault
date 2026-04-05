import React, {useEffect, useState} from "react";
import "./sheets.css";
import {useNavigate} from "react-router-dom";
import axios from 'axios';

function PasswordList() {
    // The log-in process //
    var unauth = false; // the idea is that this is set to true if the backend recognizes the current session.
    const navigate = useNavigate();

    if (unauth) {
        navigate("/");
    }

    // password obtainment
    const [passwords, setPasswords] = useState([""]);
    const [hasError, setError] = useState(false);

    // uses the backend to get the list of passwords
    // the below uses dummy data for the time being
    setPasswords(["Gr3gorzBreczyszczkiew!cz", "Sl@g1niumYassifier", "P@ssw0rd1sPotat0e"]);
    useEffect(() => {
        const fetchPasswords = async () => {
            try {
                await axios.get("http://localhost:8000/app/database")
                        .then((response) => setPasswords(response.data)); // set url
                // todo set the url from the backend position
                //setPasswords(data.) // todo, put the instance variable from the data
            } catch (err) {
                // empty temp code.
                setError(true);
            }
        };
    }, []);

    const listPass = passwords.map((password, i) => {
        return (
            <li key={i}>
                {password}
            </li>
        ); // depending on the format, this may get changed to a table rather than a list.
    });

    function passList() {
        if (hasError) {
            return (
                <p>There was an error loading the password</p>
            );
        } else {
            return (
                <ul>{listPass}</ul>
            );
        }
    }

    function goBack() {
        navigate("/UserMenu");
    }

    return (
        <div>
            <header></header>
            <section>
                <h3>Your Passwords:</h3>
                <button onClick={goBack}>Go Back</button>
                {passList()}
            </section>
            <footer>
                <p>© Password Vault 2026</p>
            </footer>
        </div>
    );
}

export default PasswordList;