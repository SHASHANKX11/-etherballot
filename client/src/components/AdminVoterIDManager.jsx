import { useState, useEffect } from 'react';
import { voterCardAPI } from '../services/api';
import DigitalVoterCard from './DigitalVoterCard';
import toast from 'react-hot-toast';
import { 
  HiOutlineSearch, 
  HiOutlineCheck, 
  HiOutlineX, 
  HiOutlineShieldCheck, 
  HiOutlineRefresh, 
  HiOutlineQrcode,
  HiOutlineEye,
  HiOutlineBan,
  HiOutlineFilter,
  HiOutlineIdentification,
  HiOutlineOfficeBuilding
} from 'react-icons/hi';

export default function AdminVoterIDManager() {
  const [stats, setStats] = useState(null);
  const [voters, setVoters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [district, setDistrict] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [previewCard, setPreviewCard] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadStats();
    loadVoters();
  }, [district, statusFilter]);

  const loadStats = async () => {
    try {
      const res = await voterCardAPI.getAdminStats();
      if (res.data.stats) setStats(res.data.stats);
    } catch (err) {
      console.warn('Failed to load stats:', err);
    }
  };

  const loadVoters = async () => {
    setLoading(true);
    try {
      const res = await voterCardAPI.getAdminList({
        search,
        district,
        status: statusFilter
      });
      if (res.data.voters) setVoters(res.data.voters);
    } catch (err) {
      console.error('Failed to load voters list:', err);
    }
    setLoading(false);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadVoters();
  };

  const handleUpdateApproval = async (voterId, status) => {
    setActionLoading(true);
    try {
      await voterCardAPI.updateApproval({ voterId, status });
      toast.success(`Voter status updated to ${status.toUpperCase()}!`);
      loadVoters();
      loadStats();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update approval');
    }
    setActionLoading(false);
  };

  const handleRevokeQR = async (voterId) => {
    if (!window.confirm(`Revoke QR token for voter ID: ${voterId}? Scanners will immediately reject this card.`)) return;
    setActionLoading(true);
    try {
      await voterCardAPI.revokeQR({ voterId });
      toast.success('QR token revoked successfully! Previous card is rendered invalid.');
      loadVoters();
      loadStats();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to revoke token');
    }
    setActionLoading(false);
  };

  const handleRegenerateQR = async (voterId) => {
    setActionLoading(true);
    try {
      await voterCardAPI.regenerateQR({ voterId });
      toast.success('Fresh secure QR verification token minted!');
      loadVoters();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to regenerate token');
    }
    setActionLoading(false);
  };

  const handleViewCard = (voter) => {
    setPreviewCard({
      name: voter.name,
      voterId: voter.voterId,
      voterRegId: voter.voterRegId,
      dateOfBirth: voter.dateOfBirth,
      state: voter.state || 'Karnataka',
      district: voter.district || 'Bangalore Urban',
      constituency: voter.constituency || 'Karnataka - Bangalore Central',
      assignedPollingStation: voter.assignedPollingStation || 'Government High School, Bangalore',
      approvalStatus: voter.approvalStatus,
      votingStatus: voter.votingStatus,
      registrationDate: voter.createdAt,
      qrToken: voter.voterRegId
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* ═══ 1. METRICS CARDS ═══ */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
        <div className="stat-card">
          <div className="stat-card__label">Total Registered</div>
          <div className="stat-card__value" style={{ color: '#2563eb' }}>{stats?.totalRegistered || 0}</div>
          <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Electors Enrolled</span>
        </div>

        <div className="stat-card">
          <div className="stat-card__label">Approved Voters</div>
          <div className="stat-card__value" style={{ color: '#16a34a' }}>{stats?.approvedVoters || 0}</div>
          <span style={{ fontSize: '0.74rem', color: '#16a34a' }}>✓ Valid for Voting</span>
        </div>

        <div className="stat-card">
          <div className="stat-card__label">Pending Approvals</div>
          <div className="stat-card__value" style={{ color: '#eab308' }}>{stats?.pendingApprovals || 0}</div>
          <span style={{ fontSize: '0.74rem', color: '#ca8a04' }}>Awaiting Review</span>
        </div>

        <div className="stat-card">
          <div className="stat-card__label">Rejected Voters</div>
          <div className="stat-card__value" style={{ color: '#ef4444' }}>{stats?.rejectedVoters || 0}</div>
          <span style={{ fontSize: '0.74rem', color: '#dc2626' }}>Deactivated</span>
        </div>

        <div className="stat-card">
          <div className="stat-card__label">Generated ID Cards</div>
          <div className="stat-card__value" style={{ color: '#0284c7' }}>{stats?.totalGeneratedCards || 0}</div>
          <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>e-EPIC Minted</span>
        </div>

        <div className="stat-card">
          <div className="stat-card__label">Total QR Scans</div>
          <div className="stat-card__value" style={{ color: '#7c3aed' }}>{stats?.totalScans || 0}</div>
          <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Camera Scans Logged</span>
        </div>

        <div className="stat-card">
          <div className="stat-card__label">Voter Check-Ins</div>
          <div className="stat-card__value" style={{ color: '#0d9488' }}>{stats?.totalCheckIns || 0}</div>
          <span style={{ fontSize: '0.74rem', color: '#0d9488' }}>Confirmed at Booth</span>
        </div>
      </div>

      {/* ═══ 2. SEARCH & FILTER TOOLBAR ═══ */}
      <div 
        className="glass-card"
        style={{
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 14
        }}
      >
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: 8, flex: 1, minWidth: 260 }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <HiOutlineSearch size={18} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search by voter name, registration ID (EBV...), email, Aadhaar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="form-input"
              style={{ paddingLeft: 38 }}
            />
          </div>
          <button type="submit" className="btn btn-primary btn-sm" style={{ padding: '0 18px', borderRadius: 8 }}>
            Search
          </button>
        </form>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <select
            value={district}
            onChange={(e) => setDistrict(e.target.value)}
            className="form-input"
            style={{ width: 170, padding: '8px 12px', fontSize: '0.85rem' }}
          >
            <option value="">All Districts</option>
            <option value="Bangalore Urban">Bangalore Urban</option>
            <option value="Mumbai">Mumbai</option>
            <option value="Delhi">Delhi</option>
            <option value="Pune">Pune</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="form-input"
            style={{ width: 160, padding: '8px 12px', fontSize: '0.85rem' }}
          >
            <option value="">All Statuses</option>
            <option value="approved">Approved</option>
            <option value="pending">Pending</option>
            <option value="rejected">Rejected</option>
          </select>

          <button 
            type="button" 
            onClick={() => { setSearch(''); setDistrict(''); setStatusFilter(''); loadVoters(); }}
            className="btn btn-ghost btn-sm"
            style={{ borderRadius: 8 }}
          >
            <HiOutlineRefresh size={16} /> Reset
          </button>
        </div>
      </div>

      {/* ═══ 3. VOTERS TABLE ═══ */}
      <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>
            Voter ID Registry &amp; QR Credentials ({voters.length})
          </h2>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Real-time synchronization with sovereign identity ledger
          </span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="admin-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.03)', textAlign: 'left', borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ padding: '12px 16px' }}>Elector / Full Name</th>
                <th style={{ padding: '12px 16px' }}>Voter Reg ID</th>
                <th style={{ padding: '12px 16px' }}>Constituency &amp; District</th>
                <th style={{ padding: '12px 16px' }}>Polling Station</th>
                <th style={{ padding: '12px 16px' }}>Approval</th>
                <th style={{ padding: '12px 16px' }}>Check-In</th>
                <th style={{ padding: '12px 16px' }}>QR Status</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: 32 }}>
                    <div className="spinner" style={{ margin: '0 auto' }} />
                  </td>
                </tr>
              ) : voters.length > 0 ? (
                voters.map((v) => (
                  <tr key={v.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{v.name}</div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>{v.email}</div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <strong style={{ color: '#2563eb', letterSpacing: '0.02em' }}>{v.voterRegId}</strong>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{v.voterId}</div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div>{v.constituency || `${v.state} - ${v.district}`}</div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>{v.district}</div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontSize: '0.82rem', maxWidth: 180, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {v.assignedPollingStation || 'Government High School'}
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span 
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: 999,
                          background: v.approvalStatus === 'approved' ? 'rgba(34,197,94,0.15)' : (v.approvalStatus === 'pending' ? 'rgba(234,179,8,0.15)' : 'rgba(239,68,68,0.15)'),
                          color: v.approvalStatus === 'approved' ? '#16a34a' : (v.approvalStatus === 'pending' ? '#ca8a04' : '#dc2626')
                        }}
                      >
                        {v.approvalStatus?.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span 
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          color: v.checkInStatus === 'checked_in' ? '#ca8a04' : 'var(--text-muted)'
                        }}
                      >
                        {v.checkInStatus === 'checked_in' ? 'Checked In' : 'Not Checked In'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {v.qrTokenRevoked ? (
                        <span style={{ fontSize: '0.72rem', color: '#dc2626', fontWeight: 700 }}>REVOKED</span>
                      ) : (
                        <span style={{ fontSize: '0.72rem', color: '#16a34a', fontWeight: 700 }}>ACTIVE ({v.totalScans} scans)</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        {/* View Card */}
                        <button
                          type="button"
                          onClick={() => handleViewCard(v)}
                          title="View Digital Voter ID Card"
                          className="btn btn-ghost btn-sm"
                          style={{ padding: '5px 8px', borderRadius: 6 }}
                        >
                          <HiOutlineEye size={16} />
                        </button>

                        {/* Approve */}
                        {v.approvalStatus !== 'approved' && (
                          <button
                            type="button"
                            onClick={() => handleUpdateApproval(v.voterId, 'approved')}
                            disabled={actionLoading}
                            title="Approve Registration"
                            className="btn btn-sm"
                            style={{ padding: '5px 8px', borderRadius: 6, background: '#16a34a', color: '#fff' }}
                          >
                            <HiOutlineCheck size={16} />
                          </button>
                        )}

                        {/* Reject */}
                        {v.approvalStatus !== 'rejected' && (
                          <button
                            type="button"
                            onClick={() => handleUpdateApproval(v.voterId, 'rejected')}
                            disabled={actionLoading}
                            title="Reject Registration"
                            className="btn btn-ghost btn-sm"
                            style={{ padding: '5px 8px', borderRadius: 6, color: '#dc2626' }}
                          >
                            <HiOutlineX size={16} />
                          </button>
                        )}

                        {/* Revoke QR */}
                        {!v.qrTokenRevoked ? (
                          <button
                            type="button"
                            onClick={() => handleRevokeQR(v.voterId)}
                            disabled={actionLoading}
                            title="Revoke Compromised QR Code"
                            className="btn btn-ghost btn-sm"
                            style={{ padding: '5px 8px', borderRadius: 6, color: '#f97316' }}
                          >
                            <HiOutlineBan size={16} />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleRegenerateQR(v.voterId)}
                            disabled={actionLoading}
                            title="Regenerate Fresh QR Code"
                            className="btn btn-ghost btn-sm"
                            style={{ padding: '5px 8px', borderRadius: 6, color: '#0284c7' }}
                          >
                            <HiOutlineRefresh size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>
                    No matching voters found in current electoral roll.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ═══ 4. CARD MODAL PREVIEW ═══ */}
      {previewCard && (
        <div 
          className="modal-overlay"
          onClick={(e) => e.target === e.currentTarget && setPreviewCard(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 16
          }}
        >
          <div style={{ maxWidth: 820, width: '100%', position: 'relative' }}>
            <button
              onClick={() => setPreviewCard(null)}
              style={{
                position: 'absolute',
                right: -10,
                top: -36,
                background: '#ffffff',
                border: 'none',
                borderRadius: '50%',
                width: 32,
                height: 32,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800
              }}
            >
              ✕
            </button>
            <DigitalVoterCard voter={previewCard} showActions={true} />
          </div>
        </div>
      )}
    </div>
  );
}
