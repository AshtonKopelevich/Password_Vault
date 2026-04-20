import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { passwordFormatErr, passwordFormatMsg, passwordMatchMsg } from "../App";
import "./sheets.css";

function bufferToBase64(buffer: ArrayBuffer): string {
    return btoa(String.fromCharCode(...new Uint8Array(buffer)));
}

async function encryptPassword(plaintext: string, encryptionKeyHex: string) {
    const keyBytes = Uint8Array.from(encryptionKeyHex.match(/.{2}/g)!.map(b => parseInt(b, 16)));
    const key = await crypto.subtle.importKey("raw", keyBytes, { name: "AES-GCM" }, false, ["encrypt"]);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(plaintext));
    return { password: bufferToBase64(ciphertext), iv: bufferToBase64(iv.buffer) };
}

function UserMenu() {
    const navigate = useNavigate();
    const username = sessionStorage.getItem("username") ?? "user";

    const [newPassword, setNewPassword] = useState("");
    const [newPassword2, setNewPassword2] = useState("");
    const [changeMsg, setChangeMsg] = useState("");
    const [changeSuccess, setChangeSuccess] = useState(false);
    const [showChangeForm, setShowChangeForm] = useState(false);

    function getSessionOrRedirect() {
        const encryptionKey = sessionStorage.getItem("encryptionKey");
        const userId = sessionStorage.getItem("userId");
        if (!encryptionKey || !userId) { navigate("/"); return null; }
        return { encryptionKey, userId };
    }

    async function changePasswordSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setChangeMsg(""); setChangeSuccess(false);
        const session = getSessionOrRedirect();
        if (!session) return;
        if (passwordFormatErr(newPassword) !== 0b11111) { setChangeMsg("Password does not meet requirements."); return; }
        if (newPassword !== newPassword2) { setChangeMsg("Passwords do not match."); return; }

        try {
            const { password: encryptedPassword, iv } = await encryptPassword(newPassword, session.encryptionKey);
            const salt = bufferToBase64(crypto.getRandomValues(new Uint8Array(16)).buffer);

            const response = await fetch(`/vault/entry/${session.userId}`, {
                method: "PUT", credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ account: "", password: encryptedPassword, iv, salt }),
            });

            if (!response.ok) { setChangeMsg("Failed to update password."); return; }
            setChangeSuccess(true);
            setChangeMsg("Password updated successfully.");
            setNewPassword(""); setNewPassword2("");
        } catch {
            setChangeMsg("Encryption or network error.");
        }
    }

    async function handleLogout() {
        try { await fetch("/auth/logout", { method: "POST", credentials: "include" }); } catch {}
        sessionStorage.clear();
        navigate("/");
    }

    return (
        <div className="page">
            <div className="topbar">
                <span className="topbar-logo">pw<span>vault</span></span>
                <div className="topbar-actions">
                    <button className="btn-ghost" onClick={handleLogout}>Sign out</button>
                </div>
            </div>

            <div className="dashboard-layout">
                <div className="welcome-badge">Signed in as <span>{username}</span></div>

                {/* Main action grid */}
                <div className="menu-grid">
                    <div className="menu-card" onClick={() => navigate("/PasswordList")} role="button" tabIndex={0}>
                        <div className="menu-card-icon">🔐</div>
                        <div className="menu-card-title">View Passwords</div>
                        <div className="menu-card-desc">Browse and reveal your stored credentials</div>
                    </div>
                    <div className="menu-card" onClick={() => navigate("/AddPassword")} role="button" tabIndex={0}>
                        <div className="menu-card-icon">＋</div>
                        <div className="menu-card-title">Add Password</div>
                        <div className="menu-card-desc">Encrypt and store a new credential</div>
                    </div>
                </div>

                {/* Change password section */}
                <div className="card card-wide" style={{ marginTop: 8 }}>
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                        <div>
                            <div className="card-title" style={{ fontSize: 15 }}>Change Master Password</div>
                            <div className="card-subtitle" style={{ marginBottom: 0 }}>RE-ENCRYPTS ALL VAULT ENTRIES</div>
                        </div>
                        <button className="btn-ghost" onClick={() => setShowChangeForm(v => !v)}>
                            {showChangeForm ? "Cancel" : "Change"}
                        </button>
                    </div>

                    {showChangeForm && (
                        <form onSubmit={changePasswordSubmit} style={{ display:"flex", flexDirection:"column", gap:0, maxWidth:"none", width:"100%", alignSelf:"unset", marginTop: 20 }}>
                            <div className="field">
                                <label htmlFor="new-password">New Password</label>
                                <input type="password" id="new-password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="••••••••••••" />
                            </div>
                            <div className="field">
                                <label htmlFor="new-password2">Confirm New Password</label>
                                <input type="password" id="new-password2" value={newPassword2} onChange={e => setNewPassword2(e.target.value)} placeholder="••••••••••••" />
                            </div>
                            {newPassword && <ul className="validation-list">{passwordFormatMsg(newPassword)}</ul>}
                            {newPassword2 && newPassword !== newPassword2 && (
                                <div className="msg msg-error" style={{ marginTop: 8 }}>{passwordMatchMsg(newPassword, newPassword2)}</div>
                            )}
                            {changeMsg && <div className={`msg ${changeSuccess ? "msg-success" : "msg-error"}`}>{changeMsg}</div>}
                            <button type="submit" className="btn-primary" style={{ marginTop: 16 }}>Update Password</button>
                        </form>
                    )}
                </div>
            </div>

            <footer><p>© Password Vault 2026</p></footer>
        </div>
    );
}

export default UserMenu;