import { BrowserRouter, Routes, Route } from "react-router-dom";
import LoginPage from "./pages/index";
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
