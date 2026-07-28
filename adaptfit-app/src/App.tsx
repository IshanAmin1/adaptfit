import { useCallback, useEffect, useRef, useState } from "react";
import {
	BrowserRouter as Router,
	Route,
	Routes,
	Navigate,
} from "react-router-dom";
import { authService } from "./api/auth-service";
import Dashboard from "./components/Dashboard";
import InsightsCard from "./components/InsightsCard";
import RequireAuth from "./components/common/RequireAuth";
import RequireSubscription from "./components/common/RequireSubscription";
import AuthCallback from "./pages/AuthCallback";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Navbar from "./components/Navbar";
import Onboarding from "./pages/Onboarding";
import Plan from "./pages/Plan";
import Subscribe from "./pages/Subscribe";
import type { AuthUser } from "./types/auth";
import { getAuthenticatedPath } from "./utils/auth-utils";

function App() {
	const [authUser, setAuthUser] = useState<AuthUser | null>(null);
	const [authChecked, setAuthChecked] = useState(false);
	const isMountedRef = useRef(false);

	const refreshCurrentUser = useCallback(() => {
		return authService
			.getCurrentUser()
			.then((user) => {
				if (isMountedRef.current) {
					setAuthUser(user);
				}
				return user;
			})
			.catch(() => {
				if (isMountedRef.current) {
					setAuthUser(null);
				}
				return null;
			});
	}, []);

	useEffect(() => {
		isMountedRef.current = true;

		refreshCurrentUser().finally(() => {
			if (isMountedRef.current) {
				setAuthChecked(true);
			}
		});

		return () => {
			isMountedRef.current = false;
		};
	}, [refreshCurrentUser]);

	const handleLogin = (user: AuthUser) => {
		setAuthUser(user);
	};

	const handleLogout = () => {
		return authService
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
			<div className="min-h-screen scroll-smooth bg-[linear-gradient(90deg,rgba(37,99,235,0.10),transparent_40%),linear-gradient(180deg,#ffffff_0%,#f7faff_55%,#edf4ff_100%)] font-['Trebuchet_MS','Segoe_UI',system-ui,sans-serif] text-[#111827] antialiased">
				<Navbar authUser={authUser} onLogout={handleLogout} />
				<main className="pt-19.5">
					<Routes>
						<Route
							path="/"
							element={
								authChecked && authUser ? (
									<Navigate to={getAuthenticatedPath(authUser)} replace />
								) : (
									<Landing />
								)
							}
						/>
						<Route path="/login" element={<Login authUser={authUser} />} />
						<Route
							path="/auth/callback"
							element={
								<AuthCallback authUser={authUser} onLogin={handleLogin} />
							}
						/>
						<Route
							path="/subscribe/*"
							element={
								<RequireAuth authChecked={authChecked} authUser={authUser}>
									<Subscribe
										authChecked={authChecked}
										authUser={authUser}
										onUserRefresh={refreshCurrentUser}
									/>
								</RequireAuth>
							}
						/>
						<Route
							path="/onboarding"
							element={
								<RequireSubscription
									authChecked={authChecked}
									authUser={authUser}
									requireOnboarding={false}
								>
									<Onboarding authUser={authUser} onComplete={handleLogin} />
								</RequireSubscription>
							}
						/>
						<Route
							path="/dashboard"
							element={
								<RequireSubscription
									authChecked={authChecked}
									authUser={authUser}
								>
									<Dashboard />
								</RequireSubscription>
							}
						/>
						<Route
							path="/insights"
							element={
								<RequireSubscription
									authChecked={authChecked}
									authUser={authUser}
								>
									<InsightsCard />
								</RequireSubscription>
							}
						/>
						<Route
							path="/plan"
							element={
								<RequireSubscription
									authChecked={authChecked}
									authUser={authUser}
								>
									<Plan authUser={authUser} />
								</RequireSubscription>
							}
						/>
					</Routes>
				</main>
			</div>
		</Router>
	);
}

export default App;
