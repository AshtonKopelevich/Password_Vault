import { BrowserRouter, Routes, Route } from "react-router-dom";
import React from "react";
import LoginPage from "./pages/LoginPage";
import UserMenu from "./pages/UserMenu";
import PasswordList from "./pages/PasswordList";
import NewAccount from "./pages/NewAccount";

export default function App() {
  return (
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route path="/NewAccount" element={<NewAccount />} />
          <Route path="/UserMenu" element={<UserMenu />} />
          <Route path="/PasswordList" element={<PasswordList />} />
        </Routes>
      </BrowserRouter>
  );
}


// the use of these global methods may be insecure
// todo, find a way to ensure that nobody could read values passed thorugh.
export function passwordMatchMsg(password: string, password2: string) {
    if (password2 != password) {
        return "Passwords MUST match";
    }
}

export function passwordFormatErr(password: string) {
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

export function passwordFormatMsg(password: string) {
    let msgs = [];
    const err_num = passwordFormatErr(password);
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