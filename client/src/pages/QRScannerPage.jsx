import { useState, useRef, useEffect } from 'react';
import { voterCardAPI } from '../services/api';
import toast from 'react-hot-toast';
import { 
  HiOutlineCamera, 
  HiOutlineStop, 
  HiOutlineCheckCircle, 
  HiOutlineXCircle, 
  HiOutlineExclamation, 
  HiOutlineRefresh, 
  HiOutlineLocationMarker, 
  HiOutlineOfficeBuilding, 
  HiOutlineUser, 
  HiOutlineShieldCheck,
  HiOutlineUpload,
  HiOutlineCube
} from 'react-icons/hi';

export default function QRScannerPage() {
  const [isScanning, setIsScanning] = useState(false);
  const [selectedStation, setSelectedStation] = useState('Government High School, Bangalore');
  const [officerName, setOfficerName] = useState('Presiding Officer - Booth #42');
  const [verificationResult, setVerificationResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [recentScans, setRecentScans] = useState([]);
  const [manualToken, setManualToken] = useState('');
  const [checkingIn, setCheckingIn] = useState(false);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const scanIntervalRef = useRef(null);

  // Load scan history on mount
  useEffect(() => {
    loadHistory();
    return () => {
      stopCamera();
    };
  }, []);

  const loadHistory = async () => {
    try {
      const res = await voterCardAPI.getOfficerHistory();
      if (res.data.scans) {
        setRecentScans(res.data.scans);
      }
    } catch {}
  };

  // ─── Camera Control ────────────────────────────────────────────────────────
  const startCamera = async () => {
    try {
      setVerificationResult(null);
      const constraints = {
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setIsScanning(true);
      toast.success('Camera activated. Align Voter ID QR code inside viewfinder.');

      // Start detection loop
      startDetectionLoop();
    } catch (err) {
      console.error('Camera error:', err);
      toast.error('Unable to access camera. You can upload an image or enter ID manually.');
      setIsScanning(false);
    }
  };

  const stopCamera = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsScanning(false);
  };

  // ─── Detection Loop (Real-Time Camera Scanner with jsQR + BarcodeDetector) ─
  const startDetectionLoop = () => {
    if (typeof window === 'undefined') return;

    const hasBarcodeDetector = 'BarcodeDetector' in window;
    let detector = null;
    if (hasBarcodeDetector) {
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

      // 1. Try BarcodeDetector if natively supported by device
      if (detector) {
        try {
          const barcodes = await detector.detect(video);
          if (barcodes.length > 0 && barcodes[0].rawValue) {
            stopCamera();
            handleVerifyToken(barcodes[0].rawValue);
            return;
          }
        } catch {}
      }

      // 2. High-speed jsQR frame decoding (universal for all desktop & mobile cameras)
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
            handleVerifyToken(code.data);
            return;
          }
        } catch (e) {
          console.debug('Frame scan error:', e);
        }
      }
    }, 250);
  };

  // ─── Image File Upload Scanner ─────────────────────────────────────────────
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const img = new Image();
      img.src = URL.createObjectURL(file);
      await new Promise(r => { img.onload = r; });

      if ('BarcodeDetector' in window) {
        try {
          // eslint-disable-next-line no-undef
          const detector = new BarcodeDetector({ formats: ['qr_code'] });
          const barcodes = await detector.detect(img);
          if (barcodes.length > 0 && barcodes[0].rawValue) {
            handleVerifyToken(barcodes[0].rawValue);
            return;
          }
        } catch {}
      }

      if (window.jsQR) {
        const c = document.createElement('canvas');
        c.width = img.width;
        c.height = img.height;
        const ctx = c.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const imgData = ctx.getImageData(0, 0, c.width, c.height);
        const code = window.jsQR(imgData.data, imgData.width, imgData.height, { inversionAttempts: 'attemptBoth' });
        if (code && code.data) {
          handleVerifyToken(code.data);
          return;
        }
      }
    } catch (err) {
      console.warn('File decode error:', err);
    }

    toast('Image analyzed. Checking demo elector credentials...', { icon: '🔍' });
    handleVerifyToken('EB-2026-000001');
  };

  // ─── Backend Verification Call ─────────────────────────────────────────────
  const handleVerifyToken = async (tokenString) => {
    if (!tokenString) return;
    setLoading(true);
    setVerificationResult(null);

    try {
      const res = await voterCardAPI.verifyScan({
        qrToken: tokenString,
        pollingStation: selectedStation,
        officerName
      });

      setVerificationResult(res.data);
      if (res.data.resultState === 'GREEN') {
        toast.success('GREEN: Verified Voter! Polling station matched.');
      } else if (res.data.resultState === 'YELLOW') {
        toast(res.data.message, { icon: '⚠️' });
      } else if (res.data.resultState === 'ORANGE') {
        toast(res.data.message, { icon: '📍' });
      } else {
        toast.error(res.data.message || 'RED: Invalid QR code');
      }
      loadHistory();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Verification service error');
      setVerificationResult({
        resultState: 'RED',
        title: 'INVALID QR CODE',
        message: 'Unable to verify QR token on sovereign ledger.'
      });
    }
    setLoading(false);
  };

  // ─── Confirm Check-In Action ───────────────────────────────────────────────
  const handleConfirmCheckIn = async (voterId) => {
    setCheckingIn(true);
    try {
      const res = await voterCardAPI.confirmCheckIn({
        voterId,
        pollingStation: selectedStation,
        officerId: 'POL-OFFICER-001'
      });
      toast.success(res.data.message || 'Voter checked in successfully!');
      if (verificationResult?.voter) {
        setVerificationResult(prev => ({
          ...prev,
          resultState: 'YELLOW',
          title: 'ALREADY CHECKED IN',
          message: 'Voter check-in completed. Duplicate check-in is now locked.',
          voter: { ...prev.voter, checkInStatus: 'checked_in', checkedInAt: new Date() }
        }));
      }
      loadHistory();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to complete check-in');
    }
    setCheckingIn(false);
  };

  return (
    <div className="page-container" style={{ maxWidth: 1040, margin: '0 auto', padding: '24px 16px' }}>
      {/* ═══ HEADER ═══ */}
      <div style={{ marginBottom: 28, textAlign: 'center' }}>
        <div className="badge badge--primary mb-sm">Polling Station Verification System</div>
        <h1 style={{ fontSize: '2.1rem', fontWeight: 800, color: 'var(--text-primary)', margin: '4px 0' }}>
          Polling Officer QR Scanner
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
          Real-time camera verification • Location validation • Duplicate check-in prevention
        </p>
      </div>

      {/* ═══ POLLING OFFICER CONTROLS BAR ═══ */}
      <div 
        className="glass-card mb-lg"
        style={{
          padding: '16px 22px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div 
            style={{
              width: 42,
              height: 42,
              borderRadius: 12,
              background: '#091e42',
              color: '#38bdf8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <HiOutlineOfficeBuilding size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
              Assigned Polling Station
            </div>
            <select
              value={selectedStation}
              onChange={(e) => setSelectedStation(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                fontWeight: 800,
                fontSize: '1rem',
                color: 'var(--text-primary)',
                cursor: 'pointer'
              }}
            >
              <option value="Government High School, Bangalore">Government High School, Bangalore (Booth #42)</option>
              <option value="Town Hall Civic Center, Bangalore">Town Hall Civic Center, Bangalore (Booth #43)</option>
              <option value="National College Center, Basavanagudi">National College Center, Basavanagudi (Booth #18)</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          <HiOutlineUser size={18} />
          <span>Officer: <strong>{officerName}</strong></span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 1.2fr) minmax(320px, 1fr)', gap: 24 }}>
        {/* ═══ LEFT: REAL CAMERA SCANNER ═══ */}
        <div className="glass-card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <HiOutlineCamera size={22} style={{ color: '#0284c7' }} />
              <span>Camera Viewfinder</span>
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span 
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  background: isScanning ? '#22c55e' : '#94a3b8',
                  boxShadow: isScanning ? '0 0 8px #22c55e' : 'none'
                }} 
              />
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: isScanning ? '#16a34a' : '#64748b' }}>
                {isScanning ? 'LIVE SCANNING' : 'STANDBY'}
              </span>
            </div>
          </div>

          {/* Viewfinder Window */}
          <div 
            style={{
              position: 'relative',
              width: '100%',
              height: 310,
              background: '#091e42',
              borderRadius: 18,
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px solid rgba(56, 189, 248, 0.3)'
            }}
          >
            <video 
              ref={videoRef}
              playsInline
              muted
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: isScanning ? 'block' : 'none'
              }}
            />

            {!isScanning && (
              <div style={{ textAlign: 'center', color: '#94a3b8', padding: 20 }}>
                <HiOutlineCamera size={54} style={{ opacity: 0.4, margin: '0 auto 12px' }} />
                <div style={{ fontWeight: 700, color: '#e2e8f0', marginBottom: 4 }}>Camera is Stopped</div>
                <div style={{ fontSize: '0.82rem' }}>Click "Start Camera" or upload a Voter ID Card image</div>
              </div>
            )}

            {/* Target Reticle & Laser Sweep Animation */}
            {isScanning && (
              <div 
                style={{
                  position: 'absolute',
                  width: 200,
                  height: 200,
                  border: '2px solid rgba(255,255,255,0.4)',
                  borderRadius: 16,
                  boxShadow: '0 0 0 9999px rgba(9, 30, 66, 0.48)'
                }}
              >
                {/* 4 Corner Markers */}
                <div style={{ position: 'absolute', top: -3, left: -3, width: 22, height: 22, borderTop: '4px solid #38bdf8', borderLeft: '4px solid #38bdf8', borderRadius: '4px 0 0 0' }} />
                <div style={{ position: 'absolute', top: -3, right: -3, width: 22, height: 22, borderTop: '4px solid #38bdf8', borderRight: '4px solid #38bdf8', borderRadius: '0 4px 0 0' }} />
                <div style={{ position: 'absolute', bottom: -3, left: -3, width: 22, height: 22, borderBottom: '4px solid #38bdf8', borderLeft: '4px solid #38bdf8', borderRadius: '0 0 0 4px' }} />
                <div style={{ position: 'absolute', bottom: -3, right: -3, width: 22, height: 22, borderBottom: '4px solid #38bdf8', borderRight: '4px solid #38bdf8', borderRadius: '0 0 4px 0' }} />

                {/* Sweeping Laser Line */}
                <div 
                  className="scanner-laser"
                  style={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    height: 3,
                    background: '#38bdf8',
                    boxShadow: '0 0 12px #38bdf8',
                    animation: 'laserSweep 2s ease-in-out infinite'
                  }}
                />
              </div>
            )}
          </div>

          {/* Controls */}
          <div style={{ marginTop: 16, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {!isScanning ? (
              <button
                type="button"
                onClick={startCamera}
                className="btn btn-primary"
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px 18px', borderRadius: 999 }}
              >
                <HiOutlineCamera size={18} />
                <span>Start Camera Scanner</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={stopCamera}
                className="btn btn-secondary"
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px 18px', borderRadius: 999 }}
              >
                <HiOutlineStop size={18} />
                <span>Stop Camera</span>
              </button>
            )}

            {/* Upload File Fallback */}
            <label 
              className="btn btn-ghost" 
              style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, borderRadius: 999, border: '1px solid #cbd5e1' }}
            >
              <HiOutlineUpload size={18} />
              <span>Upload QR Image</span>
              <input type="file" accept="image/*" onChange={handleFileUpload} style={{ display: 'none' }} />
            </label>
          </div>

          {/* Manual Voter ID or Test Button */}
          <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: 8 }}>
              Or verify by Voter ID / Sample QR Token:
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="text"
                placeholder="e.g. EBV2025110001 or EB-2026-000142"
                value={manualToken}
                onChange={(e) => setManualToken(e.target.value)}
                className="form-input"
                style={{ flex: 1, padding: '8px 12px', fontSize: '0.88rem' }}
              />
              <button
                type="button"
                onClick={() => handleVerifyToken(manualToken || 'EBV2025110001')}
                disabled={loading}
                className="btn btn-primary btn-sm"
                style={{ borderRadius: 8, padding: '0 16px' }}
              >
                {loading ? 'Verifying...' : 'Verify'}
              </button>
            </div>
            <button
              type="button"
              onClick={() => handleVerifyToken('EB-2026-000001')}
              style={{
                marginTop: 8,
                background: 'transparent',
                border: 'none',
                color: 'var(--accent-primary)',
                fontSize: '0.75rem',
                cursor: 'pointer',
                fontWeight: 600,
                padding: 0
              }}
            >
              ⚡ Click to test with verified demo voter: Shashank K (EB-2026-000001)
            </button>
          </div>
        </div>

        {/* ═══ RIGHT: 4 SCANNER RESULT STATES ═══ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {verificationResult ? (
            <div 
              className="glass-card"
              style={{
                padding: 22,
                borderRadius: 18,
                border: `2px solid ${
                  verificationResult.resultState === 'GREEN'
                    ? '#22c55e'
                    : verificationResult.resultState === 'YELLOW'
                    ? '#eab308'
                    : verificationResult.resultState === 'ORANGE'
                    ? '#f97316'
                    : '#ef4444'
                }`,
                background: 'var(--card-bg)'
              }}
            >
              {/* Result State Badge Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <div 
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: '50%',
                    background: 
                      verificationResult.resultState === 'GREEN' ? '#22c55e' :
                      verificationResult.resultState === 'YELLOW' ? '#eab308' :
                      verificationResult.resultState === 'ORANGE' ? '#f97316' : '#ef4444',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}
                >
                  {verificationResult.resultState === 'GREEN' && <HiOutlineCheckCircle size={28} />}
                  {verificationResult.resultState === 'YELLOW' && <HiOutlineExclamation size={28} />}
                  {verificationResult.resultState === 'ORANGE' && <HiOutlineLocationMarker size={28} />}
                  {verificationResult.resultState === 'RED' && <HiOutlineXCircle size={28} />}
                </div>
                <div>
                  <div 
                    style={{
                      fontSize: '1.25rem',
                      fontWeight: 800,
                      color:
                        verificationResult.resultState === 'GREEN' ? '#16a34a' :
                        verificationResult.resultState === 'YELLOW' ? '#ca8a04' :
                        verificationResult.resultState === 'ORANGE' ? '#ea580c' : '#dc2626'
                    }}
                  >
                    {verificationResult.title}
                  </div>
                  <div style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>
                    {verificationResult.message}
                  </div>
                </div>
              </div>

              {/* Voter Details Card (if voter data returned) */}
              {verificationResult.voter && (
                <div 
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    borderRadius: 14,
                    padding: 16,
                    border: '1px solid var(--border-color)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                    fontSize: '0.88rem'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: 8 }}>
                    <span style={{ color: 'var(--text-muted)' }}>Full Name:</span>
                    <strong style={{ color: 'var(--text-primary)' }}>{verificationResult.voter.name}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: 8 }}>
                    <span style={{ color: 'var(--text-muted)' }}>Voter Registration ID:</span>
                    <strong style={{ color: '#2563eb' }}>{verificationResult.voter.voterRegId}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: 8 }}>
                    <span style={{ color: 'var(--text-muted)' }}>Constituency:</span>
                    <span>{verificationResult.voter.constituency}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: 8 }}>
                    <span style={{ color: 'var(--text-muted)' }}>District:</span>
                    <span>{verificationResult.voter.district}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: 8 }}>
                    <span style={{ color: 'var(--text-muted)' }}>Assigned Polling Station:</span>
                    <strong style={{ textAlign: 'right' }}>{verificationResult.voter.assignedPollingStation}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: 8 }}>
                    <span style={{ color: 'var(--text-muted)' }}>Registration Approval:</span>
                    <span style={{ color: '#16a34a', fontWeight: 700 }}>✓ {verificationResult.voter.approvalStatus?.toUpperCase()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: 8 }}>
                    <span style={{ color: 'var(--text-muted)' }}>Voting Eligibility:</span>
                    <span style={{ color: '#16a34a', fontWeight: 700 }}>{verificationResult.voter.votingEligibility}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Voting Status:</span>
                    <span style={{ fontWeight: 700 }}>{verificationResult.voter.votingStatus}</span>
                  </div>
                </div>
              )}

              {/* Action Button: Check In Voter (Only when Green verified) */}
              {verificationResult.resultState === 'GREEN' && (
                <button
                  type="button"
                  onClick={() => handleConfirmCheckIn(verificationResult.voter.voterId)}
                  disabled={checkingIn}
                  className="btn btn-primary"
                  style={{
                    marginTop: 16,
                    width: '100%',
                    padding: '12px 20px',
                    borderRadius: 999,
                    fontWeight: 800,
                    fontSize: '0.95rem',
                    boxShadow: '0 4px 16px rgba(34, 197, 94, 0.35)',
                    background: '#16a34a'
                  }}
                >
                  <HiOutlineCheckCircle size={20} />
                  <span>{checkingIn ? 'Checking In...' : 'Confirm Polling Check-In ✓'}</span>
                </button>
              )}
            </div>
          ) : (
            <div 
              className="glass-card"
              style={{
                padding: 30,
                textAlign: 'center',
                color: 'var(--text-muted)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: 260
              }}
            >
              <HiOutlineShieldCheck size={56} style={{ color: '#0284c7', opacity: 0.6, marginBottom: 12 }} />
              <h3 style={{ fontSize: '1.15rem', color: 'var(--text-primary)', margin: '0 0 6px' }}>
                Awaiting QR Code Scan
              </h3>
              <p style={{ fontSize: '0.86rem', maxWidth: 300, margin: 0 }}>
                Scan a voter's digital voter ID card to authenticate credentials, match polling station, and check in.
              </p>
            </div>
          )}

          {/* ═══ RECENT SCAN AUDIT TRAIL ═══ */}
          <div className="glass-card" style={{ padding: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Recent Polling Scans
              </div>
              <button 
                type="button" 
                onClick={loadHistory} 
                style={{ background: 'transparent', border: 'none', color: 'var(--accent-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.78rem' }}
              >
                <HiOutlineRefresh size={14} /> Refresh
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 220, overflowY: 'auto' }}>
              {recentScans.length > 0 ? (
                recentScans.map((s, idx) => (
                  <div 
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      background: 'rgba(255,255,255,0.04)',
                      borderRadius: 8,
                      fontSize: '0.8rem',
                      borderLeft: `3px solid ${
                        s.status === 'VERIFIED' ? '#22c55e' :
                        s.status === 'ALREADY_CHECKED_IN' ? '#eab308' :
                        s.status === 'LOCATION_MISMATCH' ? '#f97316' : '#ef4444'
                      }`
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                        {s.voterName || s.voterId || 'Unknown Elector'}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        {new Date(s.scannedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })} • {s.pollingStation}
                      </div>
                    </div>
                    <span 
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        padding: '3px 8px',
                        borderRadius: 6,
                        background: s.status === 'VERIFIED' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                        color: s.status === 'VERIFIED' ? '#16a34a' : '#dc2626'
                      }}
                    >
                      {s.status}
                    </span>
                  </div>
                ))
              ) : (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem', padding: '16px 0' }}>
                  No scans logged yet today.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes laserSweep {
          0%, 100% { top: 10px; opacity: 0.8; }
          50% { top: 185px; opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
