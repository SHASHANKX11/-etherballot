import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';
import FaceCapture from '../components/FaceCapture';
import toast from 'react-hot-toast';
import { HiOutlineLockClosed, HiOutlineDeviceMobile, HiOutlineCamera, HiOutlineShieldCheck, HiOutlineSparkles } from 'react-icons/hi';

// ─── Framer Motion step card variants ────────────────────────────────────────
const stepVariants = {
  enter:  { x: 48,  opacity: 0, scale: 0.98 },
  center: { x: 0,   opacity: 1, scale: 1,   transition: { type: 'spring', stiffness: 300, damping: 28 } },
  exit:   { x: -48, opacity: 0, scale: 0.98, transition: { duration: 0.18 } }
};

const Login = () => {
  const navigate = useNavigate();
  const { loginVoter } = useAuth();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [userId, setUserId] = useState(null);
  const [userName, setUserName] = useState('');
  const [maskedMobile, setMaskedMobile] = useState('');
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [otpVerified, setOtpVerified] = useState(false);
  const [devOtp, setDevOtp] = useState('');

  // ═══ STEP 1: Aadhaar Check ═══
  const handleAadhaarSubmit = async () => {
    if (!/^\d{12}$/.test(aadhaarNumber)) {
      toast.error('Enter valid 12-digit Aadhaar number');
      return;
    }
    setLoading(true);
    try {
      const res = await authAPI.login(aadhaarNumber);
      setUserId(res.data.userId);
      setUserName(res.data.name);
      setMaskedMobile(res.data.mobile);
      toast.success('Aadhaar matched! Proceed with mobile OTP.');
      setStep(2);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed - Aadhaar not found');
    }
    setLoading(false);
  };

  // ═══ STEP 2: OTP ═══
  const handleSendOTP = async () => {
    if (!/^\d{10}$/.test(mobile)) {
      toast.error('Enter your registered 10-digit mobile number');
      return;
    }
    setLoading(true);
    try {
      const res = await authAPI.sendOTP(mobile);
      toast.success('OTP sent to your mobile!');
      if (res.data.otp) {
        setDevOtp(res.data.otp);
        toast(`Dev OTP: ${res.data.otp}`, { icon: '🔑', duration: 10000 });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send OTP');
    }
    setLoading(false);
  };

  const handleVerifyOTP = async () => {
    setLoading(true);
    try {
      await authAPI.verifyOTP(mobile, otp);
      toast.success('Mobile verified! Proceed to facial authentication.');
      setOtpVerified(true);
      setStep(3);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid OTP');
    }
    setLoading(false);
  };

  // ═══ STEP 3: Face Verification ═══
  const handleFaceVerify = async (descriptor) => {
    setLoading(true);
    try {
      const res = await authAPI.verifyFace(userId, descriptor);
      toast.success('Face biometric match verified! Welcome 🎉');
      loginVoter(res.data.token, res.data.user);
      navigate('/vote');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Face verification failed');
      setLoading(false);
    }
  };

  return (
    <div className="page-container" style={{ maxWidth: 540, margin: '0 auto' }}>
      <div className="page-header" style={{ marginTop: 'var(--space-xl)' }}>
        <div className="badge badge--primary mb-sm">Secure Authentication</div>
        <h1 className="page-title">Voter Sign In</h1>
        <p className="page-subtitle">3-Factor Identity Verification: Aadhaar • OTP • Biometric Face</p>
      </div>

      {/* Stepper Header */}
      <div className="steps">
        {[
          { label: 'Aadhaar', icon: <HiOutlineLockClosed /> },
          { label: 'Mobile OTP', icon: <HiOutlineDeviceMobile /> },
          { label: 'Face AI', icon: <HiOutlineCamera /> }
        ].map((item, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center' }}>
            <div className={`step ${step > i + 1 ? 'completed' : ''} ${step === i + 1 ? 'active' : ''}`}>
              <div className="step__circle">
                {step > i + 1 ? '✓' : i + 1}
              </div>
              <span className="step__label">{item.label}</span>
            </div>
            {i < 2 && <div className="step__line" />}
          </div>
        ))}
      </div>

      {/* Animated Step Cards */}
      <AnimatePresence mode="wait">
      {step === 1 && (
        <motion.div key="step1" variants={stepVariants} initial="enter" animate="center" exit="exit"
          className="glass-card glass-card--no-hover">
          <div className="flex items-center gap-sm mb-lg">
            <div className="feature-card__icon stat-card__icon--primary" style={{ width: 42, height: 42, marginBottom: 0 }}>
              <HiOutlineLockClosed size={22} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Enter Aadhaar Number
              </h2>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>12-digit Unique Identification Number</p>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Aadhaar Number</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. 123456789012"
              value={aadhaarNumber}
              onChange={e => setAadhaarNumber(e.target.value.replace(/\D/g, ''))}
              maxLength={12}
              autoFocus
              onKeyDown={e => e.key === 'Enter' && handleAadhaarSubmit()}
            />
          </div>

          <button
            className="btn btn-primary btn-lg btn-block"
            onClick={handleAadhaarSubmit}
            disabled={loading || aadhaarNumber.length !== 12}
          >
            {loading ? 'Verifying on Ledger...' : 'Continue to OTP Verification →'}
          </button>

          <div className="flex justify-between items-center mt-xl pt-md" style={{ borderTop: '1px solid var(--border-secondary)', fontSize: '0.88rem' }}>
            <Link to="/register" style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>
              New Voter? Register Now
            </Link>
            <Link to="/admin/login" style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <HiOutlineShieldCheck /> Admin Portal
            </Link>
          </div>
        </motion.div>
      )}

      {step === 2 && (
        <motion.div key="step2" variants={stepVariants} initial="enter" animate="center" exit="exit"
          className="glass-card glass-card--no-hover">
          <div className="flex items-center gap-sm mb-md">
            <div className="feature-card__icon stat-card__icon--info" style={{ width: 42, height: 42, marginBottom: 0 }}>
              <HiOutlineDeviceMobile size={22} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Mobile OTP Verification
              </h2>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                Identity matched: <strong style={{ color: '#fbbf24' }}>{userName}</strong>
              </p>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Registered Mobile Number (Registered: {maskedMobile})</label>
            <div className="flex gap-sm">
              <input
                type="text"
                className="form-input"
                placeholder="Enter 10-digit mobile"
                value={mobile}
                onChange={e => setMobile(e.target.value.replace(/\D/g, ''))}
                maxLength={10}
                style={{ flex: 1 }}
              />
              <button className="btn btn-secondary" onClick={handleSendOTP} disabled={loading || mobile.length !== 10}>
                {loading ? 'Sending...' : 'Send OTP'}
              </button>
            </div>
          </div>

          {devOtp && (
            <div className="badge badge--warning mb-md animate-fade-in" style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', width: '100%' }}>
              <span>🔑 Test OTP: <strong>{devOtp}</strong></span>
              <button 
                onClick={() => setOtp(devOtp)} 
                style={{ background: 'none', color: '#fbbf24', fontWeight: 700, textDecoration: 'underline' }}
              >
                Auto-fill
              </button>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Enter 6-Digit OTP</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. 123456"
              value={otp}
              onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
              maxLength={6}
              onKeyDown={e => e.key === 'Enter' && handleVerifyOTP()}
            />
          </div>

          <button 
            className="btn btn-primary btn-lg btn-block" 
            onClick={handleVerifyOTP} 
            disabled={loading || otp.length !== 6}
          >
            {loading ? 'Verifying OTP...' : 'Verify & Proceed to Face Scan →'}
          </button>
        </motion.div>
      )}

      {/* Step 3: Face Verification */}
      {step === 3 && (
        <motion.div key="step3" variants={stepVariants} initial="enter" animate="center" exit="exit"
          className="glass-card glass-card--no-hover">
          <div className="text-center mb-md">
            <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
              Biometric Liveness Verification
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
              Verifying live facial descriptors against stored cryptographic enrollment vector for <strong>{userName}</strong>.
            </p>
          </div>
          
          <FaceCapture
            onCapture={handleFaceVerify}
            onError={msg => toast.error(msg)}
            mode="verify"
          />
        </motion.div>
      )}
      </AnimatePresence>
    </div>
  );
};

export default Login;
