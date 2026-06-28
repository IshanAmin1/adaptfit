import { useState } from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import Dashboard from "./components/Dashboard";
import Login from "./pages/Login";
import Navbar from "./components/Navbar";
import type { AuthUser } from "./types/auth";

const getStoredUser = (): AuthUser | null => {
	const storedUser = localStorage.getItem("adaptfitUser");

	if (!storedUser) {
		return null;
	}

	try {
		return JSON.parse(storedUser) as AuthUser;
	} catch {
		localStorage.removeItem("adaptfitUser");
		return null;
	}
};

function App() {
	const [authUser, setAuthUser] = useState<AuthUser | null>(getStoredUser);

	const handleLogin = (user: AuthUser) => {
		setAuthUser(user);
		localStorage.setItem("adaptfitUser", JSON.stringify(user));
	};

	const handleLogout = () => {
		setAuthUser(null);
		localStorage.removeItem("adaptfitUser");
	};

	return (
		<Router>
			<div className="min-h-screen scroll-smooth bg-[linear-gradient(90deg,rgba(15,139,111,0.08),transparent_40%),linear-gradient(180deg,#ffffff_0%,#f6faf7_55%,#edf6f1_100%)] font-[Arial,Helvetica,sans-serif] text-[#17211f] antialiased">
				<Navbar authUser={authUser} onLogout={handleLogout} />
				<main className="pt-19.5">
					<Routes>
						<Route path="/" element={<Dashboard />} />
						<Route path="/login" element={<Login onLogin={handleLogin} />} />
					</Routes>
				</main>
			</div>
		</Router>
	);
}

export default App;
