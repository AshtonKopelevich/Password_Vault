import { BrowserRouter, Routes, Route } from "react-router-dom";
import React from "react";
import LoginPage from "./pages/LoginPage";
import UserMenu from "./pages/UserMenu";

export default function App() {
  return (
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route path="/UserMenu" element={<UserMenu />} />
        </Routes>
      </BrowserRouter>
  );
}
