import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import Dashboard from "./components/Dashboard";
import Login from "./pages/Login";
import Navbar from "./components/Navbar";

function App() {
	return (
		<Router>
			<div className="min-h-screen scroll-smooth bg-[linear-gradient(90deg,rgba(15,139,111,0.08),transparent_40%),linear-gradient(180deg,#ffffff_0%,#f6faf7_55%,#edf6f1_100%)] font-[Arial,Helvetica,sans-serif] text-[#17211f] antialiased">
				<Navbar />
				<main className="pt-19.5">
					<Routes>
						<Route path="/" element={<Dashboard />} />
						<Route path="/login" element={<Login />} />
					</Routes>
				</main>
			</div>
		</Router>
	);
}

export default App;
