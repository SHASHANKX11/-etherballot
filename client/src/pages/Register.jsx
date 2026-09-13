import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';
import FaceCapture from '../components/FaceCapture';
import toast from 'react-hot-toast';
import { 
  HiOutlineLockClosed, 
  HiOutlineUser, 
  HiOutlineCamera, 
  HiOutlineCheckCircle, 
  HiOutlineLocationMarker,
  HiOutlineDeviceMobile,
  HiOutlineShieldCheck
} from 'react-icons/hi';

// ─── Framer Motion step card variants ───────────────────────────────────────
const stepVariants = {
  enter:  { x: 56,  opacity: 0, scale: 0.97 },
  center: { x: 0,   opacity: 1, scale: 1,   transition: { type: 'spring', stiffness: 280, damping: 26 } },
  exit:   { x: -56, opacity: 0, scale: 0.97, transition: { duration: 0.16 } }
};

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
  'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
  'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Delhi'
];

const Register = () => {
  const navigate = useNavigate();
  const { loginVoter } = useAuth();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  // Form data
  const [formData, setFormData] = useState({
    aadhaarNumber: '',
    name: '',
    email: '',
    mobile: '',
    dateOfBirth: '',
    gender: '',
    state: '',
    district: '',
    pincode: '',
    addressLine: ''
  });
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [devOtp, setDevOtp] = useState('');
  const [faceDescriptor, setFaceDescriptor] = useState(null);
  const [userLocation, setUserLocation] = useState(null);

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleDetectLocation = (e) => {
    e.preventDefault();
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
        toast.success("Location precisely detected via browser GPS!");
        setLoading(false);
      },
      (error) => {
        // Fallback for demonstration / permissions
        setUserLocation({
          lat: 19.0760,
          lng: 72.8777
        });
        toast.success("Default jurisdiction coordinates assigned for demo.");
        setLoading(false);
      }
    );
  };

  // ═══ STEP 1: Aadhaar Validation ═══
  const handleValidateAadhaar = async () => {
    if (!/^\d{12}$/.test(formData.aadhaarNumber)) {
      toast.error('Aadhaar must be exactly 12 digits');
      return;
    }
    setLoading(true);
    try {
      const res = await authAPI.validateAadhaar(formData.aadhaarNumber);
      toast.success(res.data.message || 'Aadhaar available for registration!');
      setStep(2);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Validation failed - Aadhaar may already be registered');
    }
    setLoading(false);
  };

  // ═══ STEP 2: Personal Details + OTP ═══
  const handleSendOTP = async () => {
    if (!/^\d{10}$/.test(formData.mobile)) {
      toast.error('Mobile number must be exactly 10 digits');
      return;
    }
    setLoading(true);
    try {
      const res = await authAPI.sendOTP(formData.mobile);
      toast.success('OTP sent to your mobile!');
      setOtpSent(true);
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
    if (otp.length !== 6) {
      toast.error('OTP must be 6 digits');
      return;
    }
    setLoading(true);
    try {
      await authAPI.verifyOTP(formData.mobile, otp);
      toast.success('Mobile verified successfully!');
      setOtpVerified(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'OTP verification failed');
    }
    setLoading(false);
  };

  const handleStep2Submit = () => {
    const { name, mobile, dateOfBirth, gender, state, district } = formData;
    if (!name || !mobile || !dateOfBirth || !gender || !state || !district) {
      toast.error('Please fill all mandatory fields marked with *');
      return;
    }
    if (!userLocation) {
      toast.error('Please detect or confirm your voting location');
      return;
    }
    if (!otpVerified) {
      toast.error('Please verify your mobile number with OTP first');
      return;
    }
    setStep(3);
  };

  // ═══ STEP 3: Face Capture ═══
  const handleFaceCapture = (descriptor) => {
    setFaceDescriptor(descriptor);
    toast.success('Biometric facial vector captured!');
    setStep(4);
  };

  // ═══ STEP 4: Review & Submit ═══
  const handleSubmit = async () => {
    setLoading(true);
    try {
      const res = await authAPI.register({
        ...formData,
        faceDescriptor
      });
      toast.success('Registration successful! Welcome to EtherBallot 🎉');
      loginVoter(res.data.token, res.data.user);
      navigate('/vote');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    }
    setLoading(false);
  };

  const stepLabels = ['Aadhaar', 'Details & OTP', 'Face AI', 'Review'];

  return (
    <div className="page-container" style={{ maxWidth: 660, margin: '0 auto' }}>
      <div className="page-header" style={{ marginTop: 'var(--space-xl)' }}>
        <div className="badge badge--primary mb-sm">Voter Enrollment</div>
        <h1 className="page-title">Voter Registration</h1>
        <p className="page-subtitle">Enroll your decentralized identity with verified credentials</p>
      </div>

      {/* Step Indicator */}
      <div className="steps">
        {stepLabels.map((label, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center' }}>
            <div className={`step ${step > i + 1 ? 'completed' : ''} ${step === i + 1 ? 'active' : ''}`}>
              <div className="step__circle">
                {step > i + 1 ? '✓' : i + 1}
              </div>
              <span className="step__label">{label}</span>
            </div>
            {i < stepLabels.length - 1 && <div className="step__line" />}
          </div>
        ))}
      </div>

      {/* ─── Animated Step Cards ─── */}
      <AnimatePresence mode="wait">

      {/* ═══ STEP 1: Aadhaar ═══ */}
      {step === 1 && (
        <motion.div key="reg-step1" variants={stepVariants} initial="enter" animate="center" exit="exit"
          className="glass-card glass-card--no-hover">
          <div className="flex items-center gap-sm mb-lg">
            <div className="feature-card__icon stat-card__icon--primary" style={{ width: 42, height: 42, marginBottom: 0 }}>
              <HiOutlineLockClosed size={22} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Step 1: Aadhaar Check
              </h2>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Unique 12-digit citizen identification number</p>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Aadhaar Number</label>
            <input
              type="text"
              name="aadhaarNumber"
              className="form-input"
              placeholder="Enter 12-digit Aadhaar"
              value={formData.aadhaarNumber}
              onChange={e => setFormData(prev => ({ ...prev, aadhaarNumber: e.target.value.replace(/\D/g, '') }))}
              maxLength={12}
              autoFocus
              onKeyDown={e => e.key === 'Enter' && handleValidateAadhaar()}
            />
          </div>

          <button
            className="btn btn-primary btn-lg btn-block"
            onClick={handleValidateAadhaar}
            disabled={loading || formData.aadhaarNumber.length !== 12}
          >
            {loading ? 'Validating on Ledger...' : 'Validate Aadhaar & Proceed →'}
          </button>

          <p style={{ textAlign: 'center', marginTop: 'var(--space-xl)', fontSize: '0.88rem', color: 'var(--text-muted)' }}>
            Already registered? <Link to="/login" style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>Sign In here</Link>
          </p>
        </motion.div>
      )}

      {/* ═══ STEP 2: Personal Details & Location ═══ */}
      {step === 2 && (
        <motion.div key="reg-step2" variants={stepVariants} initial="enter" animate="center" exit="exit"
          className="glass-card glass-card--no-hover">
          <div className="flex items-center gap-sm mb-lg">
            <div className="feature-card__icon stat-card__icon--info" style={{ width: 42, height: 42, marginBottom: 0 }}>
              <HiOutlineUser size={22} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Step 2: Personal & Location Details
              </h2>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Required for electoral constituency matching</p>
            </div>
          </div>

          <div className="grid grid-2">
            <div className="form-group">
              <label className="form-label">Full Legal Name *</label>
              <input type="text" name="name" className="form-input" placeholder="Your full name" value={formData.name} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input type="email" name="email" className="form-input" placeholder="name@example.com" value={formData.email} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label className="form-label">Date of Birth *</label>
              <input type="date" name="dateOfBirth" className="form-input" value={formData.dateOfBirth} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label className="form-label">Gender *</label>
              <select name="gender" className="form-select" value={formData.gender} onChange={handleChange}>
                <option value="">Select Gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">State / UT *</label>
              <select name="state" className="form-select" value={formData.state} onChange={handleChange}>
                <option value="">Select State</option>
                {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">District *</label>
              <input type="text" name="district" className="form-input" placeholder="e.g. Mumbai" value={formData.district} onChange={handleChange} />
            </div>
          </div>
            
          {/* Geo Location */}
          <div className="form-group" style={{ marginTop: 'var(--space-md)' }}>
            <label className="form-label">
              <HiOutlineLocationMarker style={{ color: '#38bdf8' }} /> Voting Constituency Location *
            </label>
            {!userLocation ? (
              <button 
                className="btn btn-secondary btn-block" 
                onClick={handleDetectLocation} 
                disabled={loading}
              >
                {loading ? 'Detecting GPS...' : '📍 Auto-Detect Voting Jurisdiction Coordinates'}
              </button>
            ) : (
              <div className="animate-scale-in" style={{ borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border-primary)' }}>
                <iframe 
                  title="Constituency Location"
                  width="100%" 
                  height="180" 
                  frameBorder="0" 
                  src={`https://maps.google.com/maps?q=${userLocation.lat},${userLocation.lng}&z=14&output=embed`} 
                  allowFullScreen>
                </iframe>
                <div style={{ padding: '8px 12px', background: '#f1f5f9', borderTop: '1px solid var(--border-primary)', fontSize: '0.85rem', color: '#2563eb', textAlign: 'center', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                  ✅ GPS Coordinates: {userLocation.lat.toFixed(4)}° N, {userLocation.lng.toFixed(4)}° E
                </div>
              </div>
            )}
          </div>

          {/* Mobile + OTP */}
          <div className="form-group" style={{ borderTop: '1px solid var(--border-secondary)', paddingTop: 'var(--space-lg)', marginTop: 'var(--space-lg)' }}>
            <label className="form-label">
              <HiOutlineDeviceMobile style={{ color: '#fbbf24' }} /> Mobile Number & OTP Verification *
            </label>
            <div className="flex gap-sm">
              <input
                type="text"
                name="mobile"
                className="form-input"
                placeholder="10-digit mobile"
                value={formData.mobile}
                onChange={e => setFormData(prev => ({ ...prev, mobile: e.target.value.replace(/\D/g, '') }))}
                maxLength={10}
                style={{ flex: 1 }}
              />
              <button className="btn btn-secondary" onClick={handleSendOTP} disabled={loading || otpSent || formData.mobile.length !== 10}>
                {otpSent ? 'OTP Sent ✓' : 'Send OTP'}
              </button>
            </div>
          </div>

          {devOtp && !otpVerified && (
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

          {otpSent && !otpVerified && (
            <div className="form-group animate-fade-in">
              <label className="form-label">Enter 6-Digit OTP</label>
              <div className="flex gap-sm">
                <input
                  type="text"
                  className="form-input"
                  placeholder="6-digit code"
                  value={otp}
                  onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                  maxLength={6}
                  style={{ flex: 1 }}
                />
                <button className="btn btn-success" onClick={handleVerifyOTP} disabled={loading || otp.length !== 6}>
                  Verify OTP
                </button>
              </div>
            </div>
          )}

          {otpVerified && (
            <div className="badge badge--success mb-lg animate-scale-in" style={{ display: 'flex', justifyContent: 'center', padding: '10px' }}>
              <HiOutlineCheckCircle /> Mobile Number Verified
            </div>
          )}

          <button 
            className="btn btn-primary btn-lg btn-block mt-md" 
            onClick={handleStep2Submit} 
            disabled={!otpVerified}
          >
            Continue to Face Biometrics →
          </button>
        </motion.div>
      )}

      {/* ═══ STEP 3: Face Capture ═══ */}
      {step === 3 && (
        <motion.div key="reg-step3" variants={stepVariants} initial="enter" animate="center" exit="exit"
          className="glass-card glass-card--no-hover">
          <div className="text-center mb-md">
            <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
              Step 3: Biometric Enrollment
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
              Hold steady within the guide and blink naturally to complete liveness verification.
            </p>
          </div>
          <FaceCapture 
            onCapture={handleFaceCapture}
            onError={(msg) => toast.error(msg)}
            mode="register"
          />
        </motion.div>
      )}

      {/* ═══ STEP 4: Review & Confirm ═══ */}
      {step === 4 && (
        <motion.div key="reg-step4" variants={stepVariants} initial="enter" animate="center" exit="exit"
          className="glass-card glass-card--no-hover">
          <div className="flex items-center gap-sm mb-lg">
            <div className="feature-card__icon stat-card__icon--success" style={{ width: 42, height: 42, marginBottom: 0 }}>
              <HiOutlineShieldCheck size={24} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Step 4: Review & Complete Enrollment
              </h2>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Finalize your cryptographic voting credential</p>
            </div>
          </div>

          <div style={{ display: 'grid', gap: 10, marginBottom: 'var(--space-xl)' }}>
            {[
              ['Aadhaar Identifier', `****-****-${formData.aadhaarNumber.slice(-4)}`],
              ['Full Name', formData.name],
              ['Mobile Number', formData.mobile],
              ['Date of Birth', formData.dateOfBirth],
              ['Gender', formData.gender.toUpperCase()],
              ['State & District', `${formData.state}, ${formData.district}`],
              ['Constituency Coordinates', userLocation ? `${userLocation.lat.toFixed(4)}° N, ${userLocation.lng.toFixed(4)}° E` : 'Verified'],
              ['Biometric Vector', faceDescriptor ? '✅ 128-D Neural Embedding Generated' : 'Pending']
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between items-center" style={{ padding: '8px 0', borderBottom: '1px solid var(--border-secondary)' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.86rem' }}>{label}</span>
                <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{value}</span>
              </div>
            ))}
          </div>

          <button className="btn btn-success btn-lg btn-block" onClick={handleSubmit} disabled={loading}>
            {loading ? 'Submitting to Blockchain...' : '🗳️ Confirm & Issue Voting ID'}
          </button>
        </motion.div>
      )}
      </AnimatePresence>
    </div>
  );
};

export default Register;
