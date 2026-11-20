import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { adminAPI } from '../services/api';
import toast from 'react-hot-toast';
import AnimatedEmblem from '../components/AnimatedEmblem';
import { HiOutlineShieldCheck, HiOutlineLockClosed, HiOutlineUser } from 'react-icons/hi';

const AdminLogin = () => {
  const navigate = useNavigate();
  const { loginAdmin } = useAuth();
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      toast.error('Please enter both username and password');
      return;
    }
    setLoading(true);
    try {
      const res = await adminAPI.login(username, password);
      toast.success(`Welcome, ${res.data.admin.name}!`);
      loginAdmin(res.data.token, res.data.admin);
      navigate('/admin');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed - check your credentials');
    }
    setLoading(false);
  };

  return (
    <div className="page-container" style={{ maxWidth: 460, margin: '0 auto' }}>
      <div style={{ marginTop: 'var(--space-2xl)' }}>
        <div className="glass-card glass-card--no-hover animate-scale-in">
          <div className="text-center mb-lg">
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 'var(--space-md)' }}>
              <AnimatedEmblem size={64} animate={true} />
            </div>
            
            <div className="badge badge--primary mb-xs">
              <HiOutlineShieldCheck /> Election Official
            </div>
            
            <h1 className="page-title" style={{ fontSize: '1.8rem', marginBottom: 4 }}>
              Admin Portal
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
              National, State & District Election Oversight
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">
                <HiOutlineUser style={{ color: '#38bdf8' }} /> Administrator Username
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. admin_national"
                value={username}
                onChange={e => setUsername(e.target.value)}
                autoFocus
              />
            </div>
            
            <div className="form-group">
              <label className="form-label">
                <HiOutlineLockClosed style={{ color: '#38bdf8' }} /> Password
              </label>
              <input
                type="password"
                className="form-input"
                placeholder="••••••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>
            
            <button
              type="submit"
              className="btn btn-primary btn-lg btn-block mt-md"
              disabled={loading}
            >
              {loading ? 'Authenticating Official...' : 'Sign In as Administrator →'}
            </button>
          </form>

          <div className="text-center mt-xl pt-md" style={{ borderTop: '1px solid var(--border-secondary)' }}>
            <Link to="/login" style={{ color: 'var(--text-muted)', fontSize: '0.88rem', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              ← Return to Voter Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
