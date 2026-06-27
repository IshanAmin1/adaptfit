import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Dashboard from './components/Dashboard';
import Login from './pages/Login';

// Main App component that sets up routing and renders the Navbar and different pages based on the route.
function App() {
  const [authUser, setAuthUser] = useState(() => {
    const storedUser = localStorage.getItem('adaptfitUser');
    return storedUser ? JSON.parse(storedUser) : null;
  });

  const handleLogin = (user) => {
    setAuthUser(user);
    localStorage.setItem('adaptfitUser', JSON.stringify(user));
  };

  const handleLogout = () => {
    setAuthUser(null);
    localStorage.removeItem('adaptfitUser');
  };

  return (
    <Router>
      <Navbar authUser={authUser} onLogout={handleLogout} />
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/login" element={<Login onLogin={handleLogin} />} />
      </Routes>
    </Router>
  );
}

export default App;
