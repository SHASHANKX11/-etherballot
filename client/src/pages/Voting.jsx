import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { votingAPI, authAPI } from '../services/api';
import toast from 'react-hot-toast';
import { 
  HiOutlineCheckCircle, 
  HiOutlineShieldCheck, 
  HiOutlineClipboardCopy, 
  HiOutlineArrowLeft,
  HiOutlineExclamation,
  HiOutlineMail,
  HiOutlineRefresh
} from 'react-icons/hi';

const Voting = () => {
  const { user } = useAuth();
  const [elections, setElections] = useState([]);
  const [selectedElection, setSelectedElection] = useState(null);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(false);
  const [voteReceipt, setVoteReceipt] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [copied, setCopied] = useState(false);
  const [resendingEmail, setResendingEmail] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    let timer;
    if (resendCooldown > 0) {
      timer = setInterval(() => setResendCooldown(prev => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleResendVerification = async () => {
    if (!user?.email) {
      toast.error('No email associated with this account');
      return;
    }
    if (resendCooldown > 0) return;

    setResendingEmail(true);
    try {
      const res = await authAPI.resendVerification(user.email);
      toast.success(res.data.message || 'Verification link sent to your email!');
      setResendCooldown(60);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to resend verification link');
    }
    setResendingEmail(false);
  };

  useEffect(() => {
    loadElections();
  }, []);

  const loadElections = async () => {
    try {
      const res = await votingAPI.getEligibleElections();
      setElections(res.data.elections);
    } catch {
      toast.error('Failed to load eligible elections');
    }
    setLoading(false);
  };

  const handleVote = async () => {
    if (selectedCandidate === null || !selectedElection) return;
    setVoting(true);
    try {
      const res = await votingAPI.castVote(selectedElection._id, selectedCandidate);
      toast.success('Vote broadcast to smart contract! 🎉');
      setVoteReceipt(res.data.receipt);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to record vote');
    }
    setVoting(false);
    setShowConfirm(false);
  };

  const handleCopyHash = () => {
    if (!voteReceipt?.voteHash) return;
    navigator.clipboard.writeText(voteReceipt.voteHash);
    setCopied(true);
    toast.success('Transaction hash copied to clipboard!');
    setTimeout(() => setCopied(false), 3000);
  };

  if (loading) {
    return (
      <div className="page-container text-center" style={{ paddingTop: '20vh' }}>
        <div className="spinner" style={{ margin: '0 auto' }} />
        <p className="loading-text mt-md">Synchronizing smart contract ballots...</p>
      </div>
    );
  }

  // ═══ VOTE RECEIPT VIEW ═══
  if (voteReceipt) {
    return (
      <div className="page-container" style={{ maxWidth: 580, margin: '0 auto' }}>
        <div className="vote-success glass-card glass-card--no-hover border-gradient-glow animate-scale-in" style={{ marginTop: 'var(--space-2xl)' }}>
          <div className="vote-success__icon">✓</div>
          
          <div className="badge badge--success shimmer-badge mb-sm">
            <HiOutlineShieldCheck /> Confirmed on Blockchain
          </div>

          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>
            Ballot Sealed & Recorded
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-xl)', fontSize: '0.92rem' }}>
            Your encrypted vote has been validated and permanently written to the smart contract ledger.
          </p>
          
          <div style={{ textAlign: 'left', marginBottom: 'var(--space-xl)', background: '#f8fafc', padding: 'var(--space-md)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-secondary)' }}>
            <div className="flex justify-between items-center" style={{ padding: '8px 0', borderBottom: '1px solid var(--border-secondary)' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.86rem' }}>Election</span>
              <span style={{ fontWeight: 700, fontSize: '0.92rem', color: '#0f172a' }}>{voteReceipt.electionName}</span>
            </div>
            <div className="flex justify-between items-center" style={{ padding: '8px 0', borderBottom: '1px solid var(--border-secondary)' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.86rem' }}>Consensus Status</span>
              <span className="badge badge--success shimmer-badge">Confirmed</span>
            </div>
            <div className="flex justify-between items-center" style={{ padding: '8px 0' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.86rem' }}>Timestamp (UTC)</span>
              <span style={{ fontWeight: 500, fontSize: '0.86rem', color: 'var(--text-secondary)' }}>
                {new Date(voteReceipt.timestamp).toLocaleString()}
              </span>
            </div>
          </div>

          <div style={{ marginBottom: 'var(--space-xl)', textAlign: 'left' }}>
            <div className="flex justify-between items-center mb-xs">
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', fontWeight: 600 }}>
                Cryptographic Vote Hash:
              </span>
              <button 
                onClick={handleCopyHash} 
                className="btn btn-ghost btn-xs"
                style={{ fontSize: '0.78rem', gap: 4 }}
              >
                <HiOutlineClipboardCopy /> {copied ? 'Copied!' : 'Copy Hash'}
              </button>
            </div>
            <div className="vote-hash" style={{ wordBreak: 'break-all', fontFamily: 'var(--font-mono)', fontSize: '0.78rem', padding: 12, borderRadius: 8, background: '#f1f5f9', color: '#0f172a', border: '1px solid #cbd5e1' }}>
              {voteReceipt.voteHash}
            </div>
          </div>

          <button 
            className="btn btn-primary btn-block card-interactive" 
            onClick={() => { setVoteReceipt(null); setSelectedElection(null); setSelectedCandidate(null); loadElections(); }}
          >
            ← Back to Ballot Center
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header" style={{ marginTop: 'var(--space-xl)' }}>
        <div className="badge badge--primary mb-sm">Official Electronic Ballot</div>
        <h1 className="page-title">Cast Your Vote</h1>
        <p className="page-subtitle">
          Authenticated voter: <strong style={{ color: '#2563eb' }}>{user?.name}</strong>. Choose an active election for your registered constituency.
        </p>
      </div>

      {/* Unverified Email Warning Banner */}
      {user && user.emailVerified === false && (
        <div 
          className="glass-card mb-xl animate-scale-in"
          style={{ 
            background: 'rgba(254, 242, 242, 0.95)', 
            border: '1.5px solid #f87171',
            padding: 'var(--space-md) var(--space-lg)' 
          }}
        >
          <div className="flex justify-between items-center" style={{ flexWrap: 'wrap', gap: 12 }}>
            <div className="flex items-center gap-md">
              <div style={{ color: '#dc2626', fontSize: '1.5rem', display: 'flex' }}>
                <HiOutlineMail />
              </div>
              <div>
                <strong style={{ color: '#991b1b', fontSize: '0.98rem' }}>
                  Email Verification Required for Ballot Casting
                </strong>
                <p style={{ color: '#7f1d1d', fontSize: '0.86rem', margin: '2px 0 0' }}>
                  Please verify your registered email (<strong>{user.email}</strong>) to unlock electronic vote casting.
                </p>
              </div>
            </div>

            <div className="flex gap-sm">
              <button
                className="btn btn-secondary btn-sm"
                onClick={handleResendVerification}
                disabled={resendingEmail || resendCooldown > 0}
                style={{ background: '#ffffff', color: '#dc2626', borderColor: '#fca5a5' }}
              >
                <HiOutlineRefresh className={resendingEmail ? 'spin' : ''} />
                {resendCooldown > 0 ? `Resend (${resendCooldown}s)` : resendingEmail ? 'Sending...' : 'Resend Email'}
              </button>
              <Link to={`/check-email?email=${encodeURIComponent(user.email || '')}`} className="btn btn-primary btn-sm">
                Instructions →
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* No elections available */}
      {elections.length === 0 && (
        <div className="glass-card glass-card--no-hover text-center" style={{ padding: 'var(--space-3xl)', maxWidth: 600, margin: '0 auto' }}>
          <p style={{ fontSize: '3rem', marginBottom: 'var(--space-md)' }}>🗳️</p>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 'var(--space-xs)' }}>
            No Active Elections Found
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            There are currently no active ballots open for your jurisdiction. Please verify back when scheduled voting begins.
          </p>
        </div>
      )}

      {/* Election Selection List */}
      {!selectedElection && elections.length > 0 && (
        <div className="grid grid-2 stagger-children">
          {elections.map((election) => (
            <div
              key={election._id}
              className={`glass-card card-interactive ${election.hasVoted ? 'glass-card--no-hover' : ''}`}
              onClick={() => !election.hasVoted && setSelectedElection(election)}
              style={{ cursor: election.hasVoted ? 'default' : 'pointer', opacity: election.hasVoted ? 0.75 : 1 }}
            >
              <div className="flex justify-between items-center mb-md">
                <span className={`badge shimmer-badge ${election.status === 'active' ? 'badge--success' : 'badge--info'}`}>
                  ● {election.status}
                </span>
                <span className="badge badge--primary">{election.type.toUpperCase()}</span>
              </div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 'var(--space-xs)' }}>
                {election.name}
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: 'var(--space-md)', lineHeight: 1.5 }}>
                {election.description}
              </p>
              
              <div className="flex justify-between items-center pt-md" style={{ borderTop: '1px solid var(--border-secondary)', fontSize: '0.84rem', color: 'var(--text-muted)' }}>
                <span>{election.candidates?.length || 0} Candidates Contesting</span>
                <span>{election.type !== 'national' ? `${election.state || ''} ${election.district || ''}` : 'National'}</span>
              </div>

              {election.hasVoted ? (
                <div className="badge badge--success mt-md" style={{ width: '100%', justifyContent: 'center', padding: '8px' }}>
                  <HiOutlineCheckCircle /> You have already cast your ballot
                </div>
              ) : (
                <button className="btn btn-secondary btn-sm btn-block mt-md card-interactive">
                  Select Ballot →
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Ballot & Candidate Selection */}
      {selectedElection && (
        <div className="animate-fade-in" style={{ maxWidth: 840, margin: '0 auto' }}>
          <button
            className="btn btn-ghost mb-lg card-interactive"
            onClick={() => { setSelectedElection(null); setSelectedCandidate(null); }}
          >
            <HiOutlineArrowLeft /> Back to Ballot Directory
          </button>
          
          <div className="glass-card glass-card--no-hover border-gradient-glow mb-xl">
            <div className="flex justify-between items-center mb-xs">
              <span className="badge badge--primary">{selectedElection.type.toUpperCase()} ELECTION</span>
              <span className="badge badge--success shimmer-badge">● Active Ballot</span>
            </div>
            <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', margin: '8px 0 4px' }}>
              {selectedElection.name}
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
              {selectedElection.description}
            </p>
          </div>

          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: 'var(--space-md)', color: 'var(--text-primary)' }}>
            Choose Candidate:
          </h3>

          <div className="grid grid-3 stagger-children">
            {selectedElection.candidates?.map((candidate, idx) => (
              <div
                key={idx}
                className={`candidate-card card-interactive animate-fade-in ${selectedCandidate === idx ? 'selected' : ''}`}
                onClick={() => setSelectedCandidate(idx)}
              >
                <div className="candidate-avatar">
                  {candidate.name.charAt(0)}
                </div>
                <h4 className="candidate-name">{candidate.name}</h4>
                <p className="candidate-party">{candidate.party}</p>
                
                <div className="mt-md" style={{ fontSize: '0.8rem', color: selectedCandidate === idx ? '#2563eb' : 'var(--text-muted)', fontWeight: selectedCandidate === idx ? 700 : 500 }}>
                  {selectedCandidate === idx ? '● Selected Choice' : 'Click to select'}
                </div>
              </div>
            ))}
          </div>

          {selectedCandidate !== null && (
            <div className="text-center mt-2xl animate-scale-in">
              {user && user.emailVerified === false ? (
                <div style={{ maxWidth: 500, margin: '0 auto' }}>
                  <button
                    className="btn btn-secondary btn-lg"
                    onClick={() => toast.error('Please verify your email address to cast your ballot.')}
                    disabled
                    style={{ padding: '16px 40px', fontSize: '1.05rem', opacity: 0.7, cursor: 'not-allowed' }}
                  >
                    🔒 Verify Email to Unlock Ballot Casting
                  </button>
                  <p style={{ fontSize: '0.82rem', color: '#dc2626', marginTop: 8, fontWeight: 600 }}>
                    Official policy mandates verified citizen email before smart contract vote authorization.
                  </p>
                </div>
              ) : (
                <button
                  className="btn btn-success btn-lg"
                  onClick={() => setShowConfirm(true)}
                  style={{ padding: '16px 40px', fontSize: '1.1rem', fontWeight: 800 }}
                >
                  🗳️ Review & Submit Vote for {selectedElection.candidates[selectedCandidate]?.name}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="modal-overlay animate-fade-in">
          <div className="modal-content animate-scale-in">
            <div className="badge badge--warning mb-sm">
              <HiOutlineExclamation /> Irreversible Action
            </div>
            <h3 className="modal-title">Confirm Ballot Submission</h3>
            
            <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-lg)', fontSize: '0.95rem', lineHeight: 1.6 }}>
              You are about to cast your vote for <strong style={{ color: '#2563eb' }}>
                {selectedElection.candidates[selectedCandidate]?.name}
              </strong> ({selectedElection.candidates[selectedCandidate]?.party}) in{' '}
              <strong style={{ color: '#0f172a' }}>{selectedElection.name}</strong>.
            </p>

            <div style={{ background: 'rgba(220, 38, 38, 0.08)', border: '1px solid rgba(220, 38, 38, 0.25)', padding: '12px', borderRadius: 'var(--radius-sm)', marginBottom: 'var(--space-xl)', fontSize: '0.84rem', color: '#b91c1c', fontWeight: 500 }}>
              ⚠️ Once submitted, your vote is immutably sealed on the blockchain and cannot be retracted or altered.
            </div>

            <div className="flex gap-md">
              <button className="btn btn-ghost btn-block" onClick={() => setShowConfirm(false)} disabled={voting}>
                Cancel
              </button>
              <button
                className="btn btn-success btn-block"
                onClick={handleVote}
                disabled={voting}
              >
                {voting ? '⏳ Sealing on Ledger...' : '✓ Confirm & Broadcast Vote'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Voting;
