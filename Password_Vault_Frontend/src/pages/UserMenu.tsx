import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { passwordFormatErr, passwordFormatMsg, passwordMatchMsg } from "../App";
import "./sheets.css";

// ---------------------------------------------------------------------------
// Crypto helpers
// ---------------------------------------------------------------------------

function bufferToBase64(buffer: ArrayBuffer): string {
    return btoa(String.fromCharCode(...new Uint8Array(buffer)));
}

async function encryptPassword(plaintext: string, encryptionKeyHex: string) {
    const keyBytes = Uint8Array.from(
        encryptionKeyHex.match(/.{2}/g)!.map(b => parseInt(b, 16))
    );
    const key = await crypto.subtle.importKey(
        "raw",
        keyBytes,
        { name: "AES-GCM" },
        false,
        ["encrypt"]
    );
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ciphertext = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv },
        key,
        new TextEncoder().encode(plaintext)
    );
    return {
        password: bufferToBase64(ciphertext),
        iv: bufferToBase64(iv.buffer),
    };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function UserMenu() {
    const navigate = useNavigate();

    const [newPassword, setNewPassword] = useState("");
    const [newPassword2, setNewPassword2] = useState("");
    const [changeMsg, setChangeMsg] = useState("");

    // ---------------------------------------------------------------------------
    // Helpers — pull session data or boot to login
    // ---------------------------------------------------------------------------

    function getSessionOrRedirect(): { encryptionKey: string; userId: string } | null {
        const encryptionKey = sessionStorage.getItem("encryptionKey");
        const userId = sessionStorage.getItem("userId");
        if (!encryptionKey || !userId) {
            navigate("/");
            return null;
        }
        return { encryptionKey, userId };
    }

    // ---------------------------------------------------------------------------
    // Change password handler
    // ---------------------------------------------------------------------------

    async function changePasswordSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setChangeMsg("");

        const session = getSessionOrRedirect();
        if (!session) return;

        if (passwordFormatErr(newPassword) !== 0b11111) {
            setChangeMsg("Password does not meet requirements.");
            return;
        }
        if (newPassword !== newPassword2) {
            setChangeMsg("Passwords do not match.");
            return;
        }

        try {
            const { password: encryptedPassword, iv } = await encryptPassword(
                newPassword,
                session.encryptionKey
            );

            const salt = bufferToBase64(crypto.getRandomValues(new Uint8Array(16)).buffer);

            const response = await fetch(`/vault/entry/${session.userId}`, {
                method: "PUT",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    account: "",
                    password: encryptedPassword,
                    iv,
                    salt,
                }),
            });

            if (!response.ok) {
                setChangeMsg("Failed to update password.");
                return;
            }

            setChangeMsg("Password updated successfully.");
            setNewPassword("");
            setNewPassword2("");

        } catch (err) {
            setChangeMsg("Encryption or network error.");
        }
    }

    // ---------------------------------------------------------------------------
    // Logout
    // ---------------------------------------------------------------------------

    async function handleLogout() {
        try {
            await fetch("/auth/logout", {
                method: "POST",
                credentials: "include",
            });
        } catch {
            // proceed with client-side logout even if the request fails
        }
        sessionStorage.removeItem("encryptionKey");
        sessionStorage.removeItem("userId");
        navigate("/");
    }

    // ---------------------------------------------------------------------------
    // Render
    // ---------------------------------------------------------------------------

    return (
        <div>
            <header></header>

            <section>
                <h1>Password Vault</h1>
                <br />

                {/* View Passwords */}
                <h3>Your Passwords</h3>
                <button type="button" onClick={() => navigate("/PasswordList")}>
                    View Passwords
                </button>
                <br /><br />

                {/* Add Password */}
                <h3>Add New Password</h3>
                <button type="button" onClick={() => navigate("/AddPassword")}>
                    Add Password
                </button>
                <br /><br />

                {/* Change Password */}
                <h3>Change Password</h3>
                <form onSubmit={changePasswordSubmit}>
                    <label htmlFor="new-password">New Password:</label>
                    <input
                        type="password"
                        id="new-password"
                        name="new-password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                    />
                    <br />

                    <label htmlFor="new-password2">Confirm New Password:</label>
                    <input
                        type="password"
                        id="new-password2"
                        name="new-password2"
                        value={newPassword2}
                        onChange={(e) => setNewPassword2(e.target.value)}
                    />
                    <br />

                    <ul>{passwordFormatMsg(newPassword)}</ul>
                    <p>{passwordMatchMsg(newPassword, newPassword2)}</p>
                    {changeMsg && (
                        <p style={{ color: changeMsg.includes("success") ? "green" : "red" }}>
                            {changeMsg}
                        </p>
                    )}

                    <button type="submit">Update Password</button>
                </form>
                <br />

                {/* Logout */}
                <h3>Logout</h3>
                <button type="button" onClick={handleLogout}>Logout</button>
            </section>

            <footer>
                <p>© Password Vault 2026</p>
            </footer>
        </div>
    );
}

export default UserMenu;