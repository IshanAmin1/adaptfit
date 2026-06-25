import { Link, useLocation } from 'react-router-dom';

// Navbar component that renders the top navigation bar with links to different sections of the application.
export default function Navbar() {
  const location = useLocation();

  return (
    <header className="topbar">
      <Link to="/" className="brand" style={{ textDecoration: 'none', color: 'inherit' }}>
        <div className="brand-logo">A</div>
        <div className="brand-text">AdaptFit</div>
      </Link>
      <nav aria-label="Main navigation">
        <Link className={location.pathname === '/' ? 'active' : ''} to="/">Today</Link>
        <a href="#insights">AI Insights</a>
        <a href="#nutrition">Nutrition</a>
        <a href="#progress">Progress</a>
      </nav>
      <Link to="/login" className="login-button" style={{ textDecoration: 'none' }}>
        {location.pathname === '/login' ? 'Dashboard' : 'Log in'}
      </Link>
    </header>
  );
}