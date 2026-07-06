import { useEffect, useState } from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import { apiService } from "./api/api-service";
import Dashboard from "./components/Dashboard";
import RequireAuth from "./components/common/RequireAuth";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Navbar from "./components/Navbar";
import type { AuthUser } from "./types/auth";

function App() {
	const [authUser, setAuthUser] = useState<AuthUser | null>(null);
	const [authChecked, setAuthChecked] = useState(false);

	useEffect(() => {
		let isMounted = true;

		apiService
			.getCurrentUser()
			.then((user) => {
				if (isMounted) {
					setAuthUser(user);
				}
			})
			.catch(() => {
				if (isMounted) {
					setAuthUser(null);
				}
			})
			.finally(() => {
				if (isMounted) {
					setAuthChecked(true);
				}
			});

		return () => {
			isMounted = false;
		};
	}, []);

	const handleLogin = (user: AuthUser) => {
		setAuthUser(user);
	};

	const handleLogout = () => {
		return apiService
			.logout()
			.catch((error) => {
				console.error(error);
			})
			.finally(() => {
				setAuthUser(null);
			});
	};

	return (
		<Router>
			<div className="min-h-screen scroll-smooth bg-[linear-gradient(90deg,rgba(15,139,111,0.08),transparent_40%),linear-gradient(180deg,#ffffff_0%,#f6faf7_55%,#edf6f1_100%)] font-[Arial,Helvetica,sans-serif] text-[#17211f] antialiased">
				<Navbar authUser={authUser} onLogout={handleLogout} />
				<main className="pt-19.5">
					<Routes>
						<Route path="/" element={<Landing />} />
						<Route
							path="/login"
							element={<Login authUser={authUser} onLogin={handleLogin} />}
						/>
						<Route
							path="/dashboard"
							element={
								<RequireAuth authChecked={authChecked} authUser={authUser}>
									<Dashboard />
								</RequireAuth>
							}
						/>
					</Routes>
				</main>
			</div>
		</Router>
	);
}

export default App;
