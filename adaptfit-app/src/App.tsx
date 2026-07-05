import { useEffect, useState } from "react";
import {
	BrowserRouter as Router,
	Navigate,
	Route,
	Routes,
} from "react-router-dom";
import { getCurrentUser, logout } from "./api/auth";
import Dashboard from "./components/Dashboard";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Navbar from "./components/Navbar";
import type { AuthUser } from "./types/auth";

function RequireAuth({
	authChecked,
	authUser,
}: {
	authChecked: boolean;
	authUser: AuthUser | null;
}) {
	if (!authChecked) {
		return (
			<div className="grid min-h-[calc(100vh-78px)] place-items-center px-4 text-sm font-black uppercase tracking-[0.08em] text-[#62706b]">
				Loading
			</div>
		);
	}

	if (!authUser) {
		return <Navigate to="/login" replace />;
	}

	return <Dashboard />;
}

function App() {
	const [authUser, setAuthUser] = useState<AuthUser | null>(null);
	const [authChecked, setAuthChecked] = useState(false);

	useEffect(() => {
		let isMounted = true;

		getCurrentUser()
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

	const handleLogout = async () => {
		try {
			await logout();
		} catch (error) {
			console.error(error);
		} finally {
			setAuthUser(null);
		}
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
								<RequireAuth authChecked={authChecked} authUser={authUser} />
							}
						/>
					</Routes>
				</main>
			</div>
		</Router>
	);
}

export default App;
