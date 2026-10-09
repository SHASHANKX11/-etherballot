import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { authAPI } from '../services/api';
import toast from 'react-hot-toast';
import { 
  HiOutlineMail, 
  HiOutlineCheckCircle, 
  HiOutlineRefresh, 
  HiOutlineShieldCheck,
  HiOutlineArrowRight,
  HiOutlineClock
} from 'react-icons/hi';

const CheckEmail = () => {
  const [searchParams] = useSearchParams();
  const initialEmail = searchParams.get('email') || '';
  const [email, setEmail] = useState(initialEmail);
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    let timer;
    if (cooldown > 0) {
      timer = setInterval(() => setCooldown(prev => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleResend = async (e) => {
    if (e) e.preventDefault();
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      toast.error('Please enter a valid email address');
      return;
    }
    if (cooldown > 0) return;

    setLoading(true);
    try {
      const res = await authAPI.resendVerification(email);
      toast.success(res.data.message || 'Verification email resent! Please check your inbox.');
      setCooldown(60); // 60 seconds rate limit cooldown
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to resend verification email');
    }
    setLoading(false);
  };

  return (
    <div className="page-container" style={{ maxWidth: 620, margin: '0 auto', paddingTop: 'var(--space-2xl)' }}>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card glass-card--no-hover border-gradient-glow text-center"
        style={{ padding: 'var(--space-2xl) var(--space-xl)' }}
      >
        <div 
          className="feature-card__icon stat-card__icon--primary" 
          style={{ width: 64, height: 64, margin: '0 auto var(--space-md)', fontSize: '1.8rem' }}
        >
          <HiOutlineMail size={36} />
        </div>

        <div className="badge badge--primary mb-sm">Action Required</div>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 'var(--space-xs)' }}>
          Check Your Email
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', marginBottom: 'var(--space-lg)', lineHeight: 1.6 }}>
          We've sent an official verification link to:
          <br />
          <strong style={{ color: '#2563eb', fontSize: '1.1rem' }}>{email || 'your registered email'}</strong>
        </p>

        <div style={{ background: '#f8fafc', padding: 'var(--space-md)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-secondary)', textAlign: 'left', marginBottom: 'var(--space-xl)' }}>
          <div className="flex items-center gap-sm mb-xs" style={{ color: '#0f172a', fontWeight: 700, fontSize: '0.92rem' }}>
            <HiOutlineClock style={{ color: '#d97706' }} /> Verification Notice
          </div>
          <ul style={{ margin: 0, paddingLeft: 20, fontSize: '0.88rem', color: '#475569', lineHeight: 1.6 }}>
            <li>The secure link will expire in <strong>30 minutes</strong>.</li>
            <li>Click <strong>Verify Email Address</strong> inside the email to activate full ballot access.</li>
            <li>Check your Spam or Junk folder if you do not see it within a couple minutes.</li>
          </ul>
        </div>

        {/* Resend Section */}
        <div style={{ borderTop: '1px solid var(--border-secondary)', paddingTop: 'var(--space-lg)' }}>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: 'var(--space-md)' }}>
            Didn't receive the email or need a fresh link?
          </p>

          {!initialEmail && (
            <div className="form-group" style={{ maxWidth: 360, margin: '0 auto var(--space-md)' }}>
              <input
                type="email"
                className="form-input text-center"
                placeholder="Confirm your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          )}

          <button
            className="btn btn-secondary"
            onClick={handleResend}
            disabled={loading || cooldown > 0 || !email}
            style={{ margin: '0 auto', gap: 6 }}
          >
            <HiOutlineRefresh className={loading ? 'spin' : ''} />
            {cooldown > 0 ? `Resend available in ${cooldown}s` : loading ? 'Sending...' : 'Resend Verification Email'}
          </button>
        </div>

        <div className="flex justify-center gap-lg mt-2xl pt-md" style={{ borderTop: '1px solid var(--border-secondary)', fontSize: '0.88rem' }}>
          <Link to="/vote" style={{ color: 'var(--accent-primary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
            Go to Ballot Center <HiOutlineArrowRight />
          </Link>
          <span style={{ color: 'var(--text-muted)' }}>•</span>
          <Link to="/login" style={{ color: 'var(--text-secondary)' }}>
            Back to Sign In
          </Link>
        </div>
      </motion.div>
    </div>
  );
};

export default CheckEmail;
