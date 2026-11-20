import { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';
import FaceCapture from '../components/FaceCapture';
import toast from 'react-hot-toast';
import { 
  HiOutlineLockClosed, 
  HiOutlineCamera, 
  HiOutlineShieldCheck, 
  HiOutlineMail,
  HiOutlineQrcode,
  HiOutlineStop,
  HiOutlineUpload
} from 'react-icons/hi';

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
  const [loginMethod, setLoginMethod] = useState('aadhaar'); // 'aadhaar' | 'qr'
  const [loading, setLoading] = useState(false);
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [userId, setUserId] = useState(null);
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [devOtp, setDevOtp] = useState('');
  const [isScanning, setIsScanning] = useState(false);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const scanIntervalRef = useRef(null);

  // Stop camera on unmount or step change
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  useEffect(() => {
    if (step === 1 && loginMethod === 'qr') {
      startCamera();
    } else {
      stopCamera();
    }
  }, [step, loginMethod]);

  const stopCamera = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsScanning(false);
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setIsScanning(true);
      toast.success('Camera activated. Align Voter ID QR code in view.', { id: 'cam-login' });
      startDetectionLoop();
    } catch (err) {
      console.warn('Camera access note:', err);
      toast('Camera unavailable. You can use 1-click test or Aadhaar sign-in.', { icon: '📷', id: 'cam-err' });
      setIsScanning(false);
    }
  };

  const startDetectionLoop = () => {
    if (typeof window === 'undefined') return;
    let detector = null;
    if ('BarcodeDetector' in window) {
      try {
        // eslint-disable-next-line no-undef
        detector = new BarcodeDetector({ formats: ['qr_code'] });
      } catch {}
    }

    const captureCanvas = document.createElement('canvas');
    const captureCtx = captureCanvas.getContext('2d', { willReadFrequently: true });

    scanIntervalRef.current = setInterval(async () => {
      const video = videoRef.current;
      if (!video || video.readyState < 2) return;

      // 1. Native BarcodeDetector
      if (detector) {
        try {
          const barcodes = await detector.detect(video);
          if (barcodes.length > 0 && barcodes[0].rawValue) {
            stopCamera();
            handleLoginWithIdentifier(barcodes[0].rawValue);
            return;
          }
        } catch {}
      }

      // 2. High-speed jsQR
      if (window.jsQR && captureCtx) {
        try {
          const w = video.videoWidth || 640;
          const h = video.videoHeight || 480;
          if (captureCanvas.width !== w || captureCanvas.height !== h) {
            captureCanvas.width = w;
            captureCanvas.height = h;
          }
          captureCtx.drawImage(video, 0, 0, w, h);
          const imgData = captureCtx.getImageData(0, 0, w, h);
          const code = window.jsQR(imgData.data, w, h, { inversionAttempts: 'attemptBoth' });
          if (code && code.data) {
            stopCamera();
            handleLoginWithIdentifier(code.data);
            return;
          }
        } catch (e) {
          console.debug('Login scan error:', e);
        }
      }
    }, 200);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const img = new Image();
      img.src = URL.createObjectURL(file);
      await new Promise(r => { img.onload = r; });

      if (window.jsQR) {
        const c = document.createElement('canvas');
        c.width = img.width;
        c.height = img.height;
        const ctx = c.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const imgData = ctx.getImageData(0, 0, c.width, c.height);
        const code = window.jsQR(imgData.data, imgData.width, imgData.height, { inversionAttempts: 'attemptBoth' });
        if (code && code.data) {
          handleLoginWithIdentifier(code.data);
          return;
        }
      }
    } catch (err) {
      console.warn('File decode note:', err);
    }

    toast('Image analyzed. Checking demo elector record...', { icon: '🔍' });
    handleLoginWithIdentifier('EB-2026-000001');
  };

  // ═══ STEP 1: Process Login Identifier (Aadhaar or Scanned QR) ═══
  const handleLoginWithIdentifier = async (identifier) => {
    if (!identifier) return;
    setLoading(true);
    try {
      const res = await authAPI.login(identifier);
      setUserId(res.data.userId);
      setUserName(res.data.name);
      if (res.data.rawEmail || res.data.email) {
        setUserEmail(res.data.rawEmail || res.data.email);
        setMaskedEmail(res.data.email || res.data.rawEmail);
      }
      toast.success(`Elector verified: ${res.data.name}! Proceed with email verification.`);
      stopCamera();
      setStep(2);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed - Elector not found');
    }
    setLoading(false);
  };

  const handleAadhaarSubmit = async () => {
    if (!/^\d{12}$/.test(aadhaarNumber)) {
      toast.error('Enter valid 12-digit Aadhaar number');
      return;
    }
    handleLoginWithIdentifier(aadhaarNumber);
  };

  // ═══ STEP 2: Email Verification Code ═══
  const handleSendOTP = async () => {
    const targetEmail = userEmail;
    if (!targetEmail || !/^\S+@\S+\.\S+$/.test(targetEmail)) {
      toast.error('Valid registered email address is required');
      return;
    }
    setLoading(true);
    try {
      const res = await authAPI.sendOTP({ email: targetEmail });
      toast.success(res.data.message || `Verification code dispatched to ${targetEmail}!`);
      setOtpSent(true);
      if (res.data.otp) {
        setDevOtp(res.data.otp);
        toast(`Dev Code: ${res.data.otp}`, { icon: '🔑', duration: 10000 });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send verification code');
    }
    setLoading(false);
  };

  const handleVerifyOTP = async () => {
    if (otp.length !== 6) {
      toast.error('Verification code must be 6 digits');
      return;
    }
    setLoading(true);
    try {
      await authAPI.verifyOTP({ email: userEmail, otp });
      toast.success('Email verified! Proceed to facial authentication.');
      setStep(3);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid verification code');
    }
    setLoading(false);
  };

  // ═══ STEP 3: Face Verification ═══
  const handleFaceVerify = async (descriptor, meta = {}) => {
    setLoading(true);
    try {
      const res = await authAPI.verifyFace(userId, descriptor, meta.isDemo === true);
      toast.success('Face biometric match verified! Welcome 🎉');
      loginVoter(res.data.token, res.data.user);
      navigate('/vote');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Face verification failed');
      setLoading(false);
    }
  };

  return (
    <div className="page-container" style={{ maxWidth: 580, margin: '0 auto' }}>
      <div className="page-header" style={{ marginTop: 'var(--space-xl)' }}>
        <div className="badge badge--primary mb-sm">Secure Authentication</div>
        <h1 className="page-title">Voter Sign In</h1>
        <p className="page-subtitle">3-Factor Identity Verification: Aadhaar / Voter QR • Email Code • Biometric Face</p>
      </div>

      {/* Stepper Header */}
      <div className="steps">
        {[
          { label: 'Identity / QR', icon: <HiOutlineLockClosed /> },
          { label: 'Email Code', icon: <HiOutlineMail /> },
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
          
          {/* Top Method Switcher */}
          <div className="flex gap-xs mb-lg" style={{ background: '#f1f5f9', padding: 4, borderRadius: 12 }}>
            <button
              type="button"
              className={`btn btn-sm ${loginMethod === 'aadhaar' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setLoginMethod('aadhaar')}
              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
            >
              <HiOutlineLockClosed size={16} />
              <span>By Aadhaar Number</span>
            </button>
            <button
              type="button"
              className={`btn btn-sm ${loginMethod === 'qr' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setLoginMethod('qr')}
              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
            >
              <HiOutlineCamera size={16} />
              <span>📷 Scan Voter QR (Camera)</span>
            </button>
          </div>

          {/* METHOD 1: AADHAAR NUMBER */}
          {loginMethod === 'aadhaar' && (
            <div className="animate-fade-in">
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

              {/* Quick Demo Aadhaar auto-fill */}
              <div className="badge badge--info mb-lg animate-fade-in" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', width: '100%', borderRadius: 'var(--radius-md)' }}>
                <div>
                  <span style={{ fontWeight: 600 }}>⚡ Demo Aadhaar:</span>{' '}
                  <code style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: 4, letterSpacing: '1px' }}>111122223333</code>
                </div>
                <button 
                  type="button"
                  onClick={() => setAadhaarNumber('111122223333')} 
                  style={{ background: 'none', border: 'none', color: '#38bdf8', fontWeight: 700, textDecoration: 'underline', cursor: 'pointer' }}
                >
                  Auto-fill
                </button>
              </div>

              <button
                className="btn btn-primary btn-lg btn-block"
                onClick={handleAadhaarSubmit}
                disabled={loading || aadhaarNumber.length !== 12}
              >
                {loading ? 'Verifying on Ledger...' : 'Continue to OTP Verification →'}
              </button>
            </div>
          )}

          {/* METHOD 2: CAMERA QR SCANNER */}
          {loginMethod === 'qr' && (
            <div className="animate-fade-in">
              <div 
                style={{
                  position: 'relative',
                  width: '100%',
                  height: 250,
                  background: '#091e42',
                  borderRadius: 14,
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '2px solid rgba(56, 189, 248, 0.4)',
                  marginBottom: 14
                }}
              >
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: isScanning ? 'block' : 'none' }}
                />

                {!isScanning && (
                  <div style={{ textAlign: 'center', color: '#94a3b8', padding: 16 }}>
                    <HiOutlineCamera size={44} style={{ opacity: 0.35, margin: '0 auto 8px' }} />
                    <div style={{ fontWeight: 700, color: '#f8fafc', fontSize: '0.95rem' }}>Camera Standby</div>
                    <div style={{ fontSize: '0.8rem' }}>Click below to start live scanner</div>
                  </div>
                )}

                {isScanning && (
                  <div 
                    style={{
                      position: 'absolute',
                      width: 170,
                      height: 170,
                      border: '2px solid rgba(255,255,255,0.4)',
                      borderRadius: 12,
                      boxShadow: '0 0 0 9999px rgba(9, 30, 66, 0.52)'
                    }}
                  >
                    <div style={{ position: 'absolute', top: -3, left: -3, width: 16, height: 16, borderTop: '3.5px solid #38bdf8', borderLeft: '3.5px solid #38bdf8' }} />
                    <div style={{ position: 'absolute', top: -3, right: -3, width: 16, height: 16, borderTop: '3.5px solid #38bdf8', borderRight: '3.5px solid #38bdf8' }} />
                    <div style={{ position: 'absolute', bottom: -3, left: -3, width: 16, height: 16, borderBottom: '3.5px solid #38bdf8', borderLeft: '3.5px solid #38bdf8' }} />
                    <div style={{ position: 'absolute', bottom: -3, right: -3, width: 16, height: 16, borderBottom: '3.5px solid #38bdf8', borderRight: '3.5px solid #38bdf8' }} />
                    <div style={{ position: 'absolute', left: 0, right: 0, height: 3, background: '#38bdf8', boxShadow: '0 0 10px #38bdf8', animation: 'loginLaser 2s ease-in-out infinite' }} />
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                {!isScanning ? (
                  <button
                    type="button"
                    onClick={startCamera}
                    className="btn btn-primary"
                    style={{ flex: 1, padding: '8px 14px', borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                  >
                    <HiOutlineCamera size={16} />
                    <span>Start Camera</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={stopCamera}
                    className="btn btn-secondary"
                    style={{ flex: 1, padding: '8px 14px', borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                  >
                    <HiOutlineStop size={16} />
                    <span>Stop Camera</span>
                  </button>
                )}

                <label className="btn btn-ghost" style={{ cursor: 'pointer', borderRadius: 999, border: '1px solid #cbd5e1', display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px' }}>
                  <HiOutlineUpload size={16} />
                  <span>Upload QR</span>
                  <input type="file" accept="image/*" onChange={handleFileUpload} style={{ display: 'none' }} />
                </label>
              </div>

              {/* Quick 1-Click Test Login */}
              <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: 12, border: '1px solid #e2e8f0', textAlign: 'center' }}>
                <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 700, display: 'block', marginBottom: 6 }}>
                  ⚡ 1-CLICK DEMO ELECTOR VERIFY:
                </span>
                <button
                  type="button"
                  onClick={() => handleLoginWithIdentifier('EB-2026-000001')}
                  disabled={loading}
                  className="btn btn-ghost btn-sm"
                  style={{ color: '#0284c7', fontWeight: 700, fontSize: '0.82rem' }}
                >
                  ⚡ Verify &amp; Sign In as Shashank K (EB-2026-000001)
                </button>
              </div>
            </div>
          )}

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
            <div className="feature-card__icon stat-card__icon--primary" style={{ width: 42, height: 42, marginBottom: 0 }}>
              <HiOutlineMail size={22} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Email Verification Code
              </h2>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                Identity matched: <strong style={{ color: '#38bdf8' }}>{userName}</strong>
              </p>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">
              Registered Voter Email Address {maskedEmail && `(${maskedEmail})`}
            </label>
            <div className="flex gap-sm">
              <input
                type="email"
                className="form-input"
                placeholder="voter@example.com"
                value={userEmail}
                onChange={e => setUserEmail(e.target.value)}
                style={{ flex: 1 }}
              />
              <button 
                type="button"
                className="btn btn-secondary" 
                onClick={handleSendOTP} 
                disabled={loading || !userEmail}
              >
                {loading ? 'Sending...' : (otpSent ? 'Resend Code' : 'Send Code')}
              </button>
            </div>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>
              Verification email is dispatched from <strong>ehterballotproject@gmail.com</strong>
            </span>
          </div>

          {devOtp && (
            <div className="badge badge--info mb-md animate-fade-in" style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', width: '100%' }}>
              <span>🔑 Test Code: <strong>{devOtp}</strong></span>
              <button 
                onClick={() => setOtp(devOtp)} 
                style={{ background: 'none', color: '#38bdf8', fontWeight: 700, textDecoration: 'underline' }}
              >
                Auto-fill
              </button>
            </div>
          )}

          <div className="form-group">
            <label className="form-label" style={{ textAlign: 'center', display: 'block' }}>Enter 6-Digit Email Verification Code</label>
            <input
              type="text"
              className="form-input otp-input-code"
              placeholder="••••••"
              value={otp}
              onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
              maxLength={6}
              onKeyDown={e => e.key === 'Enter' && handleVerifyOTP()}
              autoFocus
            />
          </div>

          <button 
            className="btn btn-primary btn-lg btn-block" 
            onClick={handleVerifyOTP} 
            disabled={loading || otp.length !== 6}
          >
            {loading ? 'Verifying Code...' : 'Verify & Proceed to Face Scan →'}
          </button>

          <button
            type="button"
            className="btn btn-ghost btn-sm btn-block mt-sm"
            onClick={() => setStep(1)}
          >
            ← Back to Identity Entry
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

          <button
            type="button"
            className="btn btn-ghost btn-sm btn-block mt-md"
            onClick={() => setStep(2)}
          >
            ← Back to Email Code
          </button>
        </motion.div>
      )}
      </AnimatePresence>

      <style>{`
        @keyframes loginLaser {
          0%, 100% { top: 6px; opacity: 0.8; }
          50% { top: 155px; opacity: 0.35; }
        }
      `}</style>
    </div>
  );
};

export default Login;
