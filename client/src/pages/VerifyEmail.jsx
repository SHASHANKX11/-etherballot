import { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { authAPI } from '../services/api';
import toast from 'react-hot-toast';
import { 
  HiOutlineCheckCircle, 
  HiOutlineXCircle, 
  HiOutlineClock, 
  HiOutlineShieldCheck,
  HiOutlineArrowRight,
  HiOutlineRefresh
} from 'react-icons/hi';

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const statusParam = searchParams.get('status');
  const messageParam = searchParams.get('message');
  const emailParam = searchParams.get('email');

  const [verificationState, setVerificationState] = useState('loading'); // 'loading' | 'success' | 'expired' | 'invalid' | 'error'
  const [statusMessage, setStatusMessage] = useState('');
  const [resendEmail, setResendEmail] = useState(emailParam || '');
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const verificationAttemptedRef = useRef(false);

  useEffect(() => {
    let timer;
    if (resendCooldown > 0) {
      timer = setInterval(() => setResendCooldown(prev => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [resendCooldown]);

  useEffect(() => {
    // 1. If redirected by backend GET /api/auth/verify-email
    if (statusParam) {
      if (statusParam === 'success' || statusParam === 'already-verified') {
        setVerificationState('success');
        setStatusMessage(messageParam || 'Email verified successfully! Your voting identity is now active.');
      } else if (statusParam === 'expired') {
        setVerificationState('expired');
        setStatusMessage(messageParam || 'This verification link has expired after 30 minutes.');
      } else {
        setVerificationState('invalid');
        setStatusMessage(messageParam || 'This verification link is invalid or has already been used.');
      }
      return;
    }

    // 2. If directly visiting with ?token= (SPA client-side verification)
    if (token) {
      if (verificationAttemptedRef.current) return;
      verificationAttemptedRef.current = true;

      const performVerification = async () => {
        try {
          const res = await authAPI.verifyEmail(token);
          setVerificationState('success');
          setStatusMessage(res.data.message || 'Email verified successfully! Your account is now fully verified.');
          if (res.data.email) setResendEmail(res.data.email);
        } catch (err) {
          const code = err.response?.data?.code;
          const msg = err.response?.data?.message;
          if (code === 'TOKEN_EXPIRED') {
            setVerificationState('expired');
            setStatusMessage(msg || 'This verification link has expired.');
          } else {
            setVerificationState('invalid');
            setStatusMessage(msg || 'This verification link is invalid or already consumed.');
          }
        }
      };

      performVerification();
      return;
    }

    // 3. No token and no status query provided
    setVerificationState('invalid');
    setStatusMessage('No verification token was provided in the URL.');
  }, [token, statusParam, messageParam]);

  const handleResend = async (e) => {
    if (e) e.preventDefault();
    if (!resendEmail || !/^\S+@\S+\.\S+$/.test(resendEmail)) {
      toast.error('Please enter a valid email address');
      return;
    }
    if (resendCooldown > 0) return;

    setResending(true);
    try {
      const res = await authAPI.resendVerification(resendEmail);
      toast.success(res.data.message || 'New verification email dispatched!');
      setResendCooldown(60);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to resend verification email');
    }
    setResending(false);
  };

  return (
    <div className="page-container" style={{ maxWidth: 580, margin: '0 auto', paddingTop: 'var(--space-2xl)' }}>
      <motion.div 
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-card glass-card--no-hover border-gradient-glow text-center"
        style={{ padding: 'var(--space-2xl) var(--space-xl)' }}
      >
        {/* State 1: Loading */}
        {verificationState === 'loading' && (
          <div>
            <div className="spinner" style={{ margin: '0 auto var(--space-md)' }} />
            <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Verifying Cryptographic Credential...
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem' }}>
              Validating SHA-256 token against official electoral records.
            </p>
          </div>
        )}

        {/* State 2: Success */}
        {verificationState === 'success' && (
          <div className="animate-scale-in">
            <div 
              className="feature-card__icon stat-card__icon--success" 
              style={{ width: 68, height: 68, margin: '0 auto var(--space-md)', color: '#059669', fontSize: '2.2rem' }}
            >
              <HiOutlineCheckCircle size={44} />
            </div>

            <div className="badge badge--success shimmer-badge mb-sm">
              <HiOutlineShieldCheck /> Verified Elector
            </div>

            <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 'var(--space-xs)' }}>
              Email Verified Successfully!
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', marginBottom: 'var(--space-xl)', lineHeight: 1.6 }}>
              {statusMessage || 'Your email address has been verified. Your decentralized electoral identity is fully activated.'}
            </p>

            <div style={{ background: '#f8fafc', padding: 'var(--space-md)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-secondary)', marginBottom: 'var(--space-xl)', textAlign: 'left' }}>
              <div style={{ fontSize: '0.86rem', color: '#334155', lineHeight: 1.6 }}>
                ✅ Electronic ballot casting permissions unlocked
                <br />
                ✅ Constituency voting jurisdiction active
                <br />
                ✅ Audit ledger synchronization complete
              </div>
            </div>

            <Link to="/vote" className="btn btn-primary btn-lg btn-block card-interactive" style={{ gap: 8 }}>
              Proceed to Ballot Center <HiOutlineArrowRight />
            </Link>
          </div>
        )}

        {/* State 3: Expired / Invalid */}
        {(verificationState === 'expired' || verificationState === 'invalid' || verificationState === 'error') && (
          <div className="animate-scale-in">
            <div 
              className="feature-card__icon stat-card__icon--danger" 
              style={{ width: 68, height: 68, margin: '0 auto var(--space-md)', color: '#dc2626', fontSize: '2.2rem' }}
            >
              {verificationState === 'expired' ? <HiOutlineClock size={44} /> : <HiOutlineXCircle size={44} />}
            </div>

            <div className={`badge ${verificationState === 'expired' ? 'badge--warning' : 'badge--danger'} mb-sm`}>
              {verificationState === 'expired' ? 'Link Expired' : 'Verification Issue'}
            </div>

            <h1 style={{ fontSize: '1.7rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 'var(--space-xs)' }}>
              {verificationState === 'expired' ? 'Verification Link Expired' : 'Unable to Verify Email'}
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.96rem', marginBottom: 'var(--space-xl)', lineHeight: 1.6 }}>
              {statusMessage}
            </p>

            {/* Resend Box */}
            <div style={{ background: '#f8fafc', padding: 'var(--space-lg)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-secondary)', textAlign: 'left', marginBottom: 'var(--space-xl)' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', marginBottom: 'var(--space-xs)' }}>
                Request a New Verification Link
              </h3>
              <p style={{ fontSize: '0.84rem', color: '#64748b', marginBottom: 'var(--space-md)' }}>
                Enter your registered email below to receive an updated 30-minute verification link.
              </p>

              <form onSubmit={handleResend} className="flex gap-sm">
                <input
                  type="email"
                  className="form-input"
                  placeholder="name@example.com"
                  value={resendEmail}
                  onChange={(e) => setResendEmail(e.target.value)}
                  style={{ flex: 1 }}
                  required
                />
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={resending || resendCooldown > 0 || !resendEmail}
                >
                  <HiOutlineRefresh className={resending ? 'spin' : ''} />
                  {resendCooldown > 0 ? `${resendCooldown}s` : resending ? 'Sending...' : 'Send Link'}
                </button>
              </form>
            </div>

            <div className="flex justify-center gap-md">
              <Link to="/login" className="btn btn-ghost btn-sm">
                Back to Sign In
              </Link>
              <Link to="/" className="btn btn-secondary btn-sm">
                Return to Home
              </Link>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default VerifyEmail;
