import { useRef, useState, useEffect } from 'react';
import QRCodeView from './QRCodeView';
import { 
  HiOutlineUser, 
  HiOutlineCalendar, 
  HiOutlineIdentification, 
  HiOutlineLocationMarker, 
  HiOutlineOfficeBuilding, 
  HiOutlineShieldCheck, 
  HiOutlineCheckCircle, 
  HiOutlineDownload, 
  HiOutlinePrinter, 
  HiOutlineQrcode,
  HiOutlineCube
} from 'react-icons/hi';
import toast from 'react-hot-toast';

export default function DigitalVoterCard({
  voter = {},
  onScanClick = null,
  showActions = true,
  className = ''
}) {
  const cardRef = useRef(null);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [downloading, setDownloading] = useState(false);

  // Fallback defaults matching reference
  const name = voter.name || 'Shashank K';
  const dobRaw = voter.dateOfBirth ? new Date(voter.dateOfBirth) : new Date('2004-06-15');
  const dob = dobRaw.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-');
  const voterRegId = voter.voterRegId || voter.voterId || 'EBV2025110001';
  const voterId = voter.voterId || 'EB-2026-000142';
  const constituency = voter.constituency || `${voter.state || 'Karnataka'} - ${voter.district || 'Bangalore Central'}`;
  const pollingStation = voter.assignedPollingStation || 'Government High School, Bangalore';
  const district = voter.district || voter.address?.district || 'Bangalore Urban';
  const state = voter.state || voter.address?.state || 'Karnataka';
  const regDateRaw = voter.registrationDate || voter.createdAt ? new Date(voter.registrationDate || voter.createdAt) : new Date('2025-11-10');
  const regDate = regDateRaw.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-');
  const approvalStatus = voter.approvalStatus || 'approved';
  const accountStatus = voter.accountStatus || (voter.isActive === false ? 'Suspended' : 'Active');
  const votingStatus = voter.votingStatus || (voter.hasVoted && (voter.hasVoted.size > 0 || Object.keys(voter.hasVoted).length > 0) ? 'Voted' : 'Not Voted');
  const photoUrl = voter.photoUrl || voter.faceImage || '/default-avatar.png';

  // QR value encodes secure token - NOT raw sensitive PII
  const qrPayload = voter.qrToken || JSON.stringify({
    voterRegId,
    voterId,
    token: voter.qrToken || 'SECURE-TOKEN-MINTED',
    constituency,
    pollingStation
  });

  // ─── Download Card as PNG ──────────────────────────────────────────────────
  const handleDownloadPNG = async () => {
    setDownloading(true);
    toast.loading('Generating high-resolution Voter ID PNG...', { id: 'png-download' });

    try {
      // Draw to an offscreen high-DPI canvas
      const card = cardRef.current;
      if (!card) throw new Error('Card element not found');

      // Use modern Canvas 2D recreation with exact styling for crisp print quality
      const canvas = document.createElement('canvas');
      const scale = 2; // 2x Retina resolution
      const width = 800;
      const height = 500;
      canvas.width = width * scale;
      canvas.height = height * scale;
      const ctx = canvas.getContext('2d');
      ctx.scale(scale, scale);

      // Card Background
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.roundRect(0, 0, width, height, 20);
      ctx.fill();

      // Top Navy Header
      const headerGrad = ctx.createLinearGradient(0, 0, width, 0);
      headerGrad.addColorStop(0, '#091e42');
      headerGrad.addColorStop(0.5, '#0d3b66');
      headerGrad.addColorStop(1, '#1e40af');
      ctx.fillStyle = headerGrad;
      ctx.beginPath();
      ctx.roundRect(0, 0, width, 88, [20, 20, 0, 0]);
      ctx.fill();

      // Header Text
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText('EtherBallot', 60, 42);

      ctx.font = 'italic 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = '#7dd3fc';
      ctx.fillText('Online Voting System', 60, 62);

      // Divider in header
      ctx.strokeStyle = 'rgba(255,255,255,0.4)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(225, 20);
      ctx.lineTo(225, 70);
      ctx.stroke();

      // Digital Voter ID text
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText('DIGITAL VOTER ID CARD', 245, 42);

      ctx.font = '600 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = '#bae6fd';
      ctx.fillText('YOUR VOTE • OUR DEMOCRACY', 245, 62);

      // Tricolor Accent on right of header
      ctx.fillStyle = '#f97316'; // Saffron
      ctx.fillRect(width - 120, 24, 70, 7);
      ctx.fillStyle = '#ffffff'; // White
      ctx.fillRect(width - 120, 31, 70, 7);
      ctx.fillStyle = '#16a34a'; // Green
      ctx.fillRect(width - 120, 38, 70, 7);

      // Card Content Left: Photo Box
      ctx.fillStyle = '#f8fafc';
      ctx.strokeStyle = '#93c5fd';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(36, 112, 140, 165, 14);
      ctx.fill();
      ctx.stroke();

      // Placeholder photo portrait or avatar
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 36px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(name.charAt(0), 106, 205);
      ctx.textAlign = 'left';

      // Approved Badge
      ctx.fillStyle = '#16a34a';
      ctx.beginPath();
      ctx.roundRect(46, 290, 120, 32, 16);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 13px sans-serif';
      ctx.fillText('✓ Approved', 68, 311);

      ctx.fillStyle = '#475569';
      ctx.font = '600 11px sans-serif';
      ctx.fillText('Valid for Voting', 62, 338);

      // Center Details
      const details = [
        ['Full Name', name],
        ['Date of Birth', dob],
        ['Voter Registration ID', voterRegId],
        ['Constituency', constituency],
        ['Polling Station', pollingStation],
        ['District', district]
      ];

      let yPos = 126;
      details.forEach(([lbl, val]) => {
        ctx.fillStyle = '#64748b';
        ctx.font = '11px sans-serif';
        ctx.fillText(lbl, 230, yPos);
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 14px sans-serif';
        ctx.fillText(val, 230, yPos + 18);
        yPos += 44;
      });

      // Right Column: QR Container
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(width - 210, 112, 175, 230, 16);
      ctx.fill();
      ctx.stroke();

      // If QR data URL is ready, draw image
      if (qrDataUrl) {
        const qrImg = new Image();
        qrImg.src = qrDataUrl;
        await new Promise(r => { qrImg.onload = r; setTimeout(r, 200); });
        ctx.drawImage(qrImg, width - 195, 126, 145, 145);
      }

      // Scan to Verify Button inside card
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.roundRect(width - 195, 288, 145, 34, 17);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText('⛶  Scan to Verify', width - 176, 310);

      // Footer bar
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(0, height - 70, width, 70);
      ctx.strokeStyle = '#e2e8f0';
      ctx.beginPath();
      ctx.moveTo(0, height - 70);
      ctx.lineTo(width, height - 70);
      ctx.stroke();

      // Footer items
      ctx.fillStyle = '#64748b';
      ctx.font = '11px sans-serif';
      ctx.fillText('Registration Date', 36, height - 44);
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 13px sans-serif';
      ctx.fillText(regDate, 36, height - 24);

      ctx.fillStyle = '#64748b';
      ctx.font = '11px sans-serif';
      ctx.fillText('Status', 190, height - 44);
      ctx.fillStyle = '#16a34a';
      ctx.font = 'bold 13px sans-serif';
      ctx.fillText(accountStatus, 190, height - 24);

      ctx.fillStyle = '#64748b';
      ctx.font = '11px sans-serif';
      ctx.fillText('Voting Status', 300, height - 44);
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 13px sans-serif';
      ctx.fillText(votingStatus, 300, height - 24);

      // Tricolor slogan on bottom right
      ctx.fillStyle = '#0f172a';
      ctx.font = 'italic 16px "Georgia", serif';
      ctx.fillText('Vote for a Better Tomorrow', width - 250, height - 32);

      // Export to PNG download
      const pngUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = pngUrl;
      a.download = `Voter-ID-${voterRegId}.png`;
      a.click();

      toast.success('Digital Voter ID Card downloaded successfully (PNG)!', { id: 'png-download' });
    } catch (err) {
      console.error('Download PNG failed:', err);
      toast.error('Failed to generate PNG. Please try again or use Print.', { id: 'png-download' });
    }
    setDownloading(false);
  };

  // ─── Download Card as PDF ──────────────────────────────────────────────────
  const handleDownloadPDF = () => {
    toast.success('Opening print dialog. Select "Save as PDF" to save your Voter ID Card.');
    window.print();
  };

  // ─── Print Voter ID ────────────────────────────────────────────────────────
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className={`digital-voter-card-wrapper ${className}`}>
      {/* ═══ THE DIGITAL VOTER ID CARD ═══ */}
      <div 
        ref={cardRef}
        className="dvc-card printable-voter-card"
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 780,
          margin: '0 auto',
          background: '#ffffff',
          borderRadius: 22,
          boxShadow: '0 16px 40px -10px rgba(15, 23, 42, 0.18), 0 0 0 1px rgba(37, 99, 235, 0.18)',
          overflow: 'hidden',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          color: '#0f172a'
        }}
      >
        {/* ─── CARD HEADER ────────────────────────────────────────────── */}
        <div 
          className="dvc-header"
          style={{
            background: 'linear-gradient(90deg, #091e42 0%, #0d3b66 50%, #1e40af 100%)',
            padding: '16px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          {/* Brand & System Title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div 
              style={{
                width: 44,
                height: 44,
                background: 'rgba(255,255,255,0.12)',
                borderRadius: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid rgba(255,255,255,0.25)',
                color: '#38bdf8'
              }}
            >
              <HiOutlineCube size={26} />
            </div>
            <div>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#ffffff', lineHeight: 1.1 }}>
                EtherBallot
              </div>
              <div style={{ fontSize: '0.78rem', color: '#7dd3fc', fontStyle: 'italic', fontWeight: 500 }}>
                Online Voting System
              </div>
            </div>

            {/* Vertical Divider */}
            <div style={{ width: 1.5, height: 38, background: 'rgba(255,255,255,0.3)', margin: '0 8px' }} />

            {/* Document Title */}
            <div>
              <div style={{ fontSize: '1.12rem', fontWeight: 800, color: '#ffffff', letterSpacing: '0.04em', lineHeight: 1.1 }}>
                DIGITAL VOTER ID CARD
              </div>
              <div style={{ fontSize: '0.68rem', color: '#bae6fd', fontWeight: 700, letterSpacing: '0.12em', marginTop: 2 }}>
                YOUR VOTE • OUR DEMOCRACY
              </div>
            </div>
          </div>

          {/* Indian Tricolor Wave & Ashoka Chakra */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Ashoka Chakra SVG */}
            <svg width="34" height="34" viewBox="0 0 100 100" style={{ opacity: 0.95 }}>
              <circle cx="50" cy="50" r="46" stroke="#ffffff" strokeWidth="3" fill="none" />
              <circle cx="50" cy="50" r="10" fill="#ffffff" />
              {Array.from({ length: 24 }).map((_, i) => {
                const angle = (i * 360) / 24;
                return (
                  <line
                    key={i}
                    x1="50"
                    y1="50"
                    x2={50 + 38 * Math.cos((angle * Math.PI) / 180)}
                    y2={50 + 38 * Math.sin((angle * Math.PI) / 180)}
                    stroke="#ffffff"
                    strokeWidth="2"
                  />
                );
              })}
            </svg>

            {/* Tricolor Ribbon Stripes */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <div style={{ width: 44, height: 6, background: '#f97316', borderRadius: 3 }} />
              <div style={{ width: 44, height: 6, background: '#ffffff', borderRadius: 3 }} />
              <div style={{ width: 44, height: 6, background: '#16a34a', borderRadius: 3 }} />
            </div>
          </div>
        </div>

        {/* ─── CARD MAIN BODY (3 Columns) ─────────────────────────────── */}
        <div 
          className="dvc-body"
          style={{
            display: 'grid',
            gridTemplateColumns: '175px 1fr 200px',
            gap: 20,
            padding: '22px 26px',
            position: 'relative',
            background: 'linear-gradient(180deg, #f0f7ff 0%, #ffffff 40%)'
          }}
        >
          {/* Subtle Parliament Silhouette Background */}
          <div 
            style={{
              position: 'absolute',
              right: '25%',
              bottom: 40,
              width: 300,
              height: 180,
              pointerEvents: 'none',
              opacity: 0.04,
              backgroundImage: 'radial-gradient(circle, #0284c7 20%, transparent 80%)'
            }}
          />

          {/* ═══ COLUMN 1: Voter Photo & Approval Status ═══ */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div 
              style={{
                width: 140,
                height: 165,
                borderRadius: 16,
                border: '2.5px solid #93c5fd',
                background: '#e2e8f0',
                overflow: 'hidden',
                boxShadow: '0 4px 12px rgba(15, 23, 42, 0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative'
              }}
            >
              {voter.photoUrl ? (
                <img 
                  src={voter.photoUrl} 
                  alt={name} 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                />
              ) : (
                <div 
                  style={{
                    width: '100%',
                    height: '100%',
                    background: 'linear-gradient(145deg, #1e293b, #0f172a)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff'
                  }}
                >
                  <div style={{ fontSize: '3rem', fontWeight: 800 }}>{name.charAt(0)}</div>
                  <span style={{ fontSize: '0.68rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    Photo AI
                  </span>
                </div>
              )}
            </div>

            {/* Approved Pill Badge */}
            <div 
              style={{
                marginTop: 14,
                background: approvalStatus === 'approved' ? '#16a34a' : (approvalStatus === 'pending' ? '#eab308' : '#dc2626'),
                color: '#ffffff',
                padding: '6px 16px',
                borderRadius: 999,
                fontSize: '0.85rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                boxShadow: '0 2px 8px rgba(22, 163, 74, 0.28)'
              }}
            >
              <HiOutlineCheckCircle size={18} />
              <span>{approvalStatus === 'approved' ? 'Approved' : (approvalStatus === 'pending' ? 'Pending' : 'Rejected')}</span>
            </div>

            <span style={{ fontSize: '0.74rem', color: '#475569', fontWeight: 600, marginTop: 5 }}>
              {approvalStatus === 'approved' ? 'Valid for Voting' : 'Action Required'}
            </span>
          </div>

          {/* ═══ COLUMN 2: Voter Registration Details ═══ */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 11, borderLeft: '1px solid #e2e8f0', paddingLeft: 18 }}>
            {/* Field: Full Name */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <div className="dvc-icon-btn"><HiOutlineUser size={16} /></div>
              <div>
                <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>Full Name</div>
                <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>{name}</div>
              </div>
            </div>

            {/* Field: Date of Birth */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <div className="dvc-icon-btn"><HiOutlineCalendar size={16} /></div>
              <div>
                <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>Date of Birth</div>
                <div style={{ fontSize: '0.98rem', fontWeight: 700, color: '#0f172a' }}>{dob}</div>
              </div>
            </div>

            {/* Field: Voter Registration ID */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <div className="dvc-icon-btn"><HiOutlineIdentification size={16} /></div>
              <div>
                <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>Voter Registration ID</div>
                <div style={{ fontSize: '1rem', fontWeight: 800, color: '#1e40af', letterSpacing: '0.02em' }}>
                  {voterRegId}
                </div>
              </div>
            </div>

            {/* Field: Constituency */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <div className="dvc-icon-btn"><HiOutlineLocationMarker size={16} /></div>
              <div>
                <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>Constituency</div>
                <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#0f172a' }}>{constituency}</div>
              </div>
            </div>

            {/* Field: Polling Station */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <div className="dvc-icon-btn"><HiOutlineOfficeBuilding size={16} /></div>
              <div>
                <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>Polling Station</div>
                <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0f172a', lineHeight: 1.25 }}>
                  {pollingStation}
                </div>
              </div>
            </div>

            {/* Field: District */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <div className="dvc-icon-btn"><HiOutlineLocationMarker size={16} /></div>
              <div>
                <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>District</div>
                <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#0f172a' }}>{district}</div>
              </div>
            </div>
          </div>

          {/* ═══ COLUMN 3: QR Code Verification Section ═══ */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div 
              style={{
                background: '#ffffff',
                border: '1.5px solid #cbd5e1',
                borderRadius: 18,
                padding: '12px 12px 10px',
                boxShadow: '0 8px 24px -4px rgba(15, 23, 42, 0.08)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                position: 'relative'
              }}
            >
              {/* Cyan Decorative Corner Brackets */}
              <div style={{ position: 'absolute', top: 6, left: 6, width: 12, height: 12, borderTop: '2.5px solid #0284c7', borderLeft: '2.5px solid #0284c7', borderRadius: '4px 0 0 0' }} />
              <div style={{ position: 'absolute', top: 6, right: 6, width: 12, height: 12, borderTop: '2.5px solid #0284c7', borderRight: '2.5px solid #0284c7', borderRadius: '0 4px 0 0' }} />
              <div style={{ position: 'absolute', bottom: 50, left: 6, width: 12, height: 12, borderBottom: '2.5px solid #0284c7', borderLeft: '2.5px solid #0284c7', borderRadius: '0 0 0 4px' }} />
              <div style={{ position: 'absolute', bottom: 50, right: 6, width: 12, height: 12, borderBottom: '2.5px solid #0284c7', borderRight: '2.5px solid #0284c7', borderRadius: '0 0 4px 0' }} />

              {/* Dynamic QR Code */}
              <QRCodeView
                value={qrPayload}
                size={145}
                primaryColor="#091e42"
                onDataUrlReady={setQrDataUrl}
              />

              {/* Scan to Verify Button */}
              <button
                type="button"
                onClick={onScanClick}
                style={{
                  marginTop: 10,
                  width: '100%',
                  background: '#091e42',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 999,
                  padding: '7px 14px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                  boxShadow: '0 2px 8px rgba(9, 30, 66, 0.25)'
                }}
                onMouseOver={(e) => (e.currentTarget.style.background = '#1e3a8a')}
                onMouseOut={(e) => (e.currentTarget.style.background = '#091e42')}
              >
                <HiOutlineQrcode size={16} />
                <span>Scan to Verify</span>
              </button>
            </div>
          </div>
        </div>

        {/* ─── CARD FOOTER BAR ────────────────────────────────────────── */}
        <div 
          className="dvc-footer"
          style={{
            background: '#f8fafc',
            borderTop: '1px solid #e2e8f0',
            padding: '12px 26px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.82rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
            {/* Registration Date */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <HiOutlineCalendar size={18} style={{ color: '#0284c7' }} />
              <div>
                <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 600 }}>Registration Date</div>
                <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#0f172a' }}>{regDate}</div>
              </div>
            </div>

            {/* Account Status */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <HiOutlineShieldCheck size={18} style={{ color: '#16a34a' }} />
              <div>
                <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 600 }}>Status</div>
                <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#16a34a' }}>{accountStatus}</div>
              </div>
            </div>

            {/* Voting Status */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <HiOutlineCube size={18} style={{ color: '#1e40af' }} />
              <div>
                <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 600 }}>Voting Status</div>
                <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#0f172a' }}>{votingStatus}</div>
              </div>
            </div>
          </div>

          {/* Slogan with Tricolor accent */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <span style={{ fontStyle: 'italic', fontFamily: '"Georgia", serif', fontSize: '0.98rem', fontWeight: 600, color: '#0f172a' }}>
              Vote for a Better Tomorrow
            </span>
            <div style={{ display: 'flex', width: 90, height: 3, marginTop: 3 }}>
              <div style={{ flex: 1, background: '#f97316' }} />
              <div style={{ flex: 1, background: '#94a3b8' }} />
              <div style={{ flex: 1, background: '#16a34a' }} />
            </div>
          </div>
        </div>
      </div>

      {/* ─── 3 FUNCTIONAL ACTION BUTTONS ────────────────────────────── */}
      {showActions && (
        <div 
          className="dvc-actions"
          style={{
            marginTop: 24,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 14,
            flexWrap: 'wrap'
          }}
        >
          <button
            type="button"
            onClick={handleDownloadPDF}
            className="btn btn-secondary"
            style={{
              padding: '10px 20px',
              borderRadius: 999,
              fontWeight: 700,
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              boxShadow: '0 2px 10px rgba(0,0,0,0.06)'
            }}
          >
            <HiOutlineDownload size={18} />
            <span>1. Download Voter ID as PDF</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadPNG}
            disabled={downloading}
            className="btn btn-primary"
            style={{
              padding: '10px 22px',
              borderRadius: 999,
              fontWeight: 700,
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              boxShadow: '0 4px 14px rgba(37, 99, 235, 0.28)'
            }}
          >
            <HiOutlineDownload size={18} />
            <span>{downloading ? 'Generating PNG...' : '2. Download Voter ID as PNG'}</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="btn btn-ghost"
            style={{
              padding: '10px 20px',
              borderRadius: 999,
              fontWeight: 700,
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              border: '1px solid #cbd5e1'
            }}
          >
            <HiOutlinePrinter size={18} />
            <span>3. Print Voter ID</span>
          </button>
        </div>
      )}

      {/* Embedded Inlined Component Styles */}
      <style>{`
        .dvc-icon-btn {
          width: 26px;
          height: 26px;
          border-radius: 50%;
          background: #091e42;
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          margin-top: 1px;
        }
        @media (max-width: 768px) {
          .dvc-body {
            grid-template-columns: 1fr !important;
            text-align: center;
          }
          .dvc-body > div:nth-child(2) {
            border-left: none !important;
            padding-left: 0 !important;
            border-top: 1px solid #e2e8f0;
            padding-top: 16px;
          }
          .dvc-header {
            flex-direction: column;
            gap: 12px;
            text-align: center;
          }
          .dvc-footer {
            flex-direction: column;
            gap: 14px;
            text-align: center;
          }
        }
        @media print {
          body * {
            visibility: hidden;
          }
          .printable-voter-card, .printable-voter-card * {
            visibility: visible;
          }
          .printable-voter-card {
            position: absolute;
            left: 50%;
            top: 50%;
            transform: translate(-50%, -50%) scale(1.1);
            box-shadow: none !important;
            border: 1px solid #000 !important;
          }
          .dvc-actions {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
