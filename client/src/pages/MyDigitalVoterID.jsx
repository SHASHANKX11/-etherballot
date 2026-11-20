import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { voterCardAPI } from '../services/api';
import DigitalVoterCard from '../components/DigitalVoterCard';
import HomeQRScannerModal from '../components/HomeQRScannerModal';
import { useNavigate, Link } from 'react-router-dom';
import { 
  HiOutlineIdentification, 
  HiOutlineShieldCheck, 
  HiOutlineOfficeBuilding, 
  HiOutlineQrcode,
  HiOutlineCube,
  HiOutlineRefresh,
  HiOutlineCamera
} from 'react-icons/hi';
import toast from 'react-hot-toast';

export default function MyDigitalVoterID() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [cardData, setCardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  useEffect(() => {
    fetchVoterCard();
  }, []);

  const fetchVoterCard = async () => {
    setLoading(true);
    try {
      const res = await voterCardAPI.getMyCard();
      if (res.data.card) {
        setCardData(res.data.card);
      }
    } catch (err) {
      console.warn('Could not fetch online voter card, fallback to stored session:', err);
      // Fallback with session details
      if (user) {
        setCardData({
          name: user.name || 'Shashank K',
          voterId: user.voterId || 'EB-2026-000142',
          voterRegId: user.voterRegId || 'EBV2025110001',
          dateOfBirth: user.dateOfBirth || '2004-06-15',
          state: user.state || 'Karnataka',
          district: user.district || 'Bangalore Urban',
          constituency: user.constituency || 'Karnataka - Bangalore Central',
          assignedPollingStation: user.assignedPollingStation || 'Government High School, Bangalore',
          pollingStationAddress: 'Bangalore Central, Karnataka - 560001',
          approvalStatus: 'approved',
          votingStatus: 'Not Voted',
          accountStatus: 'Active',
          registrationDate: new Date('2025-11-10'),
          qrToken: user.qrToken || 'EBV2025110001-SECURE-TOKEN'
        });
      }
    }
    setLoading(false);
  };

  const handleScanClick = () => {
    setIsScannerOpen(true);
  };

  if (loading) {
    return (
      <div className="page-container text-center" style={{ paddingTop: '20vh' }}>
        <div className="spinner" style={{ margin: '0 auto' }} />
        <p className="loading-text mt-md">Retrieving Digital Voter ID from Sovereign Ledger...</p>
      </div>
    );
  }

  return (
    <div className="page-container" style={{ maxWidth: 860, margin: '0 auto', padding: '30px 16px' }}>
      {/* ═══ PAGE HEADER ═══ */}
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <div className="badge badge--primary mb-sm">Sovereign Electoral Identity</div>
        <h1 style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--text-primary)', margin: '4px 0' }}>
          My Digital Voter ID Card
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
          Official e-EPIC credential powered by EtherBallot decentralized infrastructure
        </p>
      </div>

      {/* ═══ DIGITAL VOTER ID CARD COMPONENT ═══ */}
      <DigitalVoterCard
        voter={cardData || {
          name: user?.name || 'Shashank K',
          voterId: user?.voterId || 'EB-2026-000142',
          voterRegId: user?.voterRegId || 'EBV2025110001',
          dateOfBirth: '2004-06-15',
          state: 'Karnataka',
          district: 'Bangalore Urban',
          constituency: 'Karnataka - Bangalore Central',
          assignedPollingStation: 'Government High School, Bangalore',
          pollingStationAddress: 'Bangalore Central, Karnataka',
          approvalStatus: 'approved',
          accountStatus: 'Active',
          votingStatus: 'Not Voted',
          registrationDate: new Date('2025-11-10'),
          qrToken: 'EBV2025110001'
        }}
        onScanClick={handleScanClick}
        showActions={true}
      />

      {/* ═══ ELECTORAL ROLL & POLLING INFORMATION ACCORDION ═══ */}
      <div 
        className="glass-card mt-xl"
        style={{
          padding: 24,
          borderRadius: 20,
          background: 'var(--card-bg)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <HiOutlineOfficeBuilding size={22} style={{ color: '#0284c7' }} />
            <span>Assigned Polling Station &amp; Electoral Details</span>
          </h2>
          <span 
            style={{
              padding: '4px 12px',
              borderRadius: 999,
              fontSize: '0.75rem',
              fontWeight: 700,
              background: 'rgba(34, 197, 94, 0.15)',
              color: '#16a34a'
            }}
          >
            ✓ Polling Booth Confirmed
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
          <div style={{ background: 'rgba(255,255,255,0.04)', padding: 14, borderRadius: 12, border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 600 }}>Constituency</div>
            <div style={{ fontSize: '0.94rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: 3 }}>
              {cardData?.constituency || 'Karnataka - Bangalore Central'}
            </div>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.04)', padding: 14, borderRadius: 12, border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 600 }}>Polling Station</div>
            <div style={{ fontSize: '0.94rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: 3 }}>
              {cardData?.assignedPollingStation || 'Government High School, Bangalore'}
            </div>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.04)', padding: 14, borderRadius: 12, border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 600 }}>EPIC / Voter Registration No.</div>
            <div style={{ fontSize: '0.94rem', fontWeight: 800, color: '#2563eb', marginTop: 3 }}>
              {cardData?.voterRegId || 'EBV2025110001'}
            </div>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.04)', padding: 14, borderRadius: 12, border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 600 }}>Check-In Status</div>
            <div style={{ fontSize: '0.94rem', fontWeight: 700, color: cardData?.checkInStatus === 'checked_in' ? '#ca8a04' : '#16a34a', marginTop: 3 }}>
              {cardData?.checkInStatus === 'checked_in' ? 'Checked In at Polling Station' : 'Eligible for Polling Check-In'}
            </div>
          </div>
        </div>

        {/* Quick Navigation to Polling Check-In or Ballot */}
        <div style={{ marginTop: 20, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <button 
            type="button"
            onClick={() => setIsScannerOpen(true)}
            className="btn btn-primary"
            style={{ borderRadius: 999, padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 8, background: '#091e42' }}
          >
            <HiOutlineCamera size={18} />
            <span>📷 Verify Card via Camera Scanner</span>
          </button>

          <Link 
            to="/qr-scanner" 
            className="btn btn-secondary"
            style={{ borderRadius: 999, padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <HiOutlineQrcode size={18} />
            <span>Polling Officer Station Scanner</span>
          </Link>

          <Link 
            to="/vote" 
            className="btn btn-ghost"
            style={{ borderRadius: 999, padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 8, border: '1px solid #cbd5e1' }}
          >
            <HiOutlineCube size={18} />
            <span>Proceed to Voting Booth →</span>
          </Link>
        </div>
      </div>

      {/* Camera QR Scanner Modal */}
      <HomeQRScannerModal 
        isOpen={isScannerOpen} 
        onClose={() => setIsScannerOpen(false)} 
      />
    </div>
  );
}
