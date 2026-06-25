import { useNavigate } from 'react-router-dom';

export default function Login() {
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    // Verification logic will run here later
    navigate('/');
  };

  return (
    <div className="login-page-container">
      <section className="card login-card">
        <div>
          <p className="tiny-label">Welcome back</p>
          <h2>Access AdaptFit</h2>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="form-group">
            <label className="tiny-label" htmlFor="email" style={{ marginBottom: 0 }}>Email Address</label>
            <input type="email" id="email" placeholder="name@example.com" required />
          </div>

          <div className="form-group">
            <label className="tiny-label" htmlFor="password" style={{ marginBottom: 0 }}>Password</label>
            <input type="password" id="password" placeholder="••••••••" required />
          </div>

          <button type="submit" className="login-button" style={{ width: '100%', marginTop: '10px' }}>
            Sign In
          </button>
        </form>
      </section>
    </div>
  );
}