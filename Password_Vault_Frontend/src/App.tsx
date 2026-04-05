import React from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import UserMenu from "./pages/UserMenu";

// Checks sessionStorage for encryptionKey — if missing, user is not logged in
function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const encryptionKey = sessionStorage.getItem("encryptionKey");
    const userId = sessionStorage.getItem("userId");

    if (!encryptionKey || !userId) {
        return <Navigate to="/" replace />;  // boot to login
    }

    return <>{children}</>;
}

export default function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<LoginPage />} />
                <Route path="/UserMenu" element={
                    <ProtectedRoute>
                        <UserMenu />
                    </ProtectedRoute>
                } />
            </Routes>
        </BrowserRouter>
    );
}
