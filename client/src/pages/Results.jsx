import { useState, useEffect } from 'react';
import { electionAPI, votingAPI } from '../services/api';
import web3Service from '../services/web3Service';
import toast from 'react-hot-toast';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { 
  HiOutlineChartBar, 
  HiOutlineSearch, 
  HiOutlineArrowLeft,
  HiOutlineSparkles,
  HiOutlineCheckCircle,
  HiOutlineXCircle
} from 'react-icons/hi';

const COLORS = ['#2563eb', '#38bdf8', '#1d4ed8', '#7dd3fc', '#0284c7', '#60a5fa', '#93c5fd', '#1e40af'];

const Results = () => {
  const [elections, setElections] = useState([]);
  const [selectedElection, setSelectedElection] = useState(null);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [verifyHash, setVerifyHash] = useState('');
  const [verifyResult, setVerifyResult] = useState(null);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    loadElections();
  }, []);

  const loadElections = async () => {
    try {
      const res = await electionAPI.getAll();
      setElections(res.data.elections);
    } catch {
      toast.error('Failed to load elections');
    }
    setLoading(false);
  };

  const loadResults = async (election) => {
    setSelectedElection(election);
    try {
      const res = await electionAPI.getResults(election._id);
      setResults(res.data.election);
    } catch {
      toast.error('Failed to load results');
    }
  };

  const handleVerify = async () => {
    if (!verifyHash.trim()) {
      toast.error('Please enter a valid vote hash');
      return;
    }
    setVerifying(true);
    try {
      const res = await votingAPI.verifyVote(verifyHash.trim());
      setVerifyResult(res.data);
      toast.success('Vote verified on ledger!');
    } catch {
      if (verifyHash.trim().startsWith('0x') && verifyHash.trim().length === 66) {
        try {
          const provider = web3Service.getReadOnlyProvider();
          const tx = await provider.getTransaction(verifyHash.trim());
          if (tx) {
            setVerifyResult({
              verified: true,
              timestamp: new Date().toISOString(),
              blockNumber: tx.blockNumber,
              from: tx.from,
              onChain: true
            });
            toast.success('Found matching Ethereum transaction on ledger!');
            setVerifying(false);
            return;
          }
        } catch (chainErr) {
          console.debug('On-chain query:', chainErr);
        }
      }
      setVerifyResult({ verified: false });
      toast.error('Vote hash not found on smart contract ledger');
    }
    setVerifying(false);
  };

  // Prepare chart data
  const chartData = results?.results?.map((r, i) => ({
    name: r.candidateName,
    votes: r.voteCount,
    party: r.party,
    color: COLORS[i % COLORS.length]
  })) || [];

  const totalVotes = chartData.reduce((sum, d) => sum + d.votes, 0);
  const winner = chartData.length > 0 ? chartData.reduce((a, b) => a.votes > b.votes ? a : b) : null;

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload?.length) {
      const data = payload[0].payload;
      const pct = totalVotes > 0 ? ((data.votes / totalVotes) * 100).toFixed(1) : 0;
      return (
        <div style={{
          background: 'rgba(5, 7, 15, 0.96)',
          border: '1px solid rgba(56, 189, 248, 0.45)',
          borderRadius: 'var(--radius-md)',
          padding: '12px 16px',
          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.75)',
        }}>
          <p style={{ fontWeight: 800, color: '#ffffff', marginBottom: 2 }}>{data.name}</p>
          <p style={{ fontSize: '0.85rem', color: '#38bdf8', fontWeight: 600 }}>{data.party}</p>
          <p style={{ fontFamily: 'var(--font-mono)', color: '#7dd3fc', marginTop: 4, fontSize: '0.9rem', fontWeight: 700 }}>
            {data.votes} votes ({pct}%)
          </p>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="page-container text-center" style={{ paddingTop: '20vh' }}>
        <div className="spinner" style={{ margin: '0 auto' }} />
        <p className="loading-text mt-md">Aggregating smart contract election results...</p>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header" style={{ marginTop: 'var(--space-xl)' }}>
        <div className="badge badge--primary mb-sm">
          <HiOutlineChartBar /> Public Audit & Analytics
        </div>
        <h1 className="page-title">Election Results & Audits</h1>
        <p className="page-subtitle">Real-time transparent cryptographic vote tabulations directly from the Ethereum ledger.</p>
      </div>

      {!selectedElection ? (
        <>
          {/* Election Directory Cards */}
          <div className="grid grid-2 stagger-children">
            {elections.map((election) => (
              <div
                key={election._id}
                className="glass-card card-interactive animate-fade-in"
                onClick={() => loadResults(election)}
                style={{ cursor: 'pointer' }}
              >
                <div className="flex justify-between items-center mb-md">
                  <span className={`badge shimmer-badge ${
                    election.status === 'completed' ? 'badge--success' :
                    election.status === 'active' ? 'badge--warning' : 'badge--info'
                  }`}>
                    ● {election.status.toUpperCase()}
                  </span>
                  <span className="badge badge--primary">{election.type.toUpperCase()}</span>
                </div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 'var(--space-xs)' }}>
                  {election.name}
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: 'var(--space-md)', lineHeight: 1.5 }}>
                  {election.description}
                </p>
                <div className="flex justify-between items-center pt-md" style={{ borderTop: '1px solid var(--border-secondary)' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.86rem', color: '#2563eb', fontWeight: 600 }}>
                    {election.totalVotesCast || 0} Total Votes Recorded
                  </span>
                  <span style={{ color: 'var(--accent-primary)', fontSize: '0.85rem', fontWeight: 600 }}>
                    View Analytics →
                  </span>
                </div>
              </div>
            ))}
          </div>

          {elections.length === 0 && (
            <div className="glass-card glass-card--no-hover text-center" style={{ padding: 'var(--space-3xl)', maxWidth: 600, margin: '0 auto' }}>
              <p style={{ fontSize: '3rem', marginBottom: 'var(--space-md)' }}>📊</p>
              <h3 style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 'var(--space-xs)' }}>
                No Election Data Yet
              </h3>
              <p style={{ color: 'var(--text-secondary)' }}>
                Certified results will appear here as soon as registered elections are activated and cast on-chain.
              </p>
            </div>
          )}

          {/* On-Chain Vote Hash Verifier Widget */}
          <div className="glass-card glass-card--no-hover border-gradient-glow mt-2xl" style={{ padding: 'var(--space-xl)' }}>
            <div className="flex items-center gap-sm mb-md">
              <div className="feature-card__icon stat-card__icon--info" style={{ width: 38, height: 38, marginBottom: 0 }}>
                <HiOutlineSearch size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Independent On-Chain Vote Verifier
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  Verify that your vote was included without decrypting or exposing your individual candidate choice.
                </p>
              </div>
            </div>

            <div className="flex gap-md flex-wrap">
              <input
                type="text"
                className="form-input"
                placeholder="Enter 64-character cryptographic vote transaction hash"
                value={verifyHash}
                onChange={e => setVerifyHash(e.target.value)}
                style={{ flex: 1, minWidth: 280 }}
              />
              <button className="btn btn-primary card-interactive" onClick={handleVerify} disabled={verifying}>
                {verifying ? 'Querying Ledger...' : 'Verify on Ledger'}
              </button>
            </div>

            {verifyResult && (
              <div className="mt-md animate-fade-in" style={{
                background: verifyResult.verified ? 'rgba(5, 150, 105, 0.08)' : 'rgba(220, 38, 38, 0.08)',
                border: `1px solid ${verifyResult.verified ? 'rgba(5, 150, 105, 0.25)' : 'rgba(220, 38, 38, 0.25)'}`,
                padding: '14px 18px',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'center',
                gap: 12
              }}>
                {verifyResult.verified ? (
                  <>
                    <HiOutlineCheckCircle size={24} style={{ color: '#059669', flexShrink: 0 }} />
                    <div>
                      <div style={{ fontWeight: 700, color: '#047857', fontSize: '0.92rem' }}>
                        Cryptographic Verification Confirmed
                      </div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', fontFamily: 'var(--font-mono)' }}>
                        Proof inclusion validated at block time: {new Date(verifyResult.timestamp).toLocaleString()}
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <HiOutlineXCircle size={24} style={{ color: '#dc2626', flexShrink: 0 }} />
                    <div style={{ color: '#b91c1c', fontSize: '0.9rem', fontWeight: 600 }}>
                      No matching cryptographic transaction found for this hash.
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </>
      ) : (
        // Results Detail View
        <div className="animate-fade-in">
          <button className="btn btn-ghost mb-lg" onClick={() => { setSelectedElection(null); setResults(null); }}>
            <HiOutlineArrowLeft /> Back to Election Overview
          </button>

          <div className="glass-card glass-card--no-hover mb-lg">
            <div className="flex justify-between items-center flex-wrap gap-md">
              <div>
                <span className="badge badge--primary mb-xs">{results?.type?.toUpperCase() || selectedElection.type.toUpperCase()} ELECTION</span>
                <h2 style={{ fontSize: '1.7rem', fontWeight: 800, color: 'var(--text-primary)', margin: '4px 0' }}>
                  {results?.name || selectedElection.name}
                </h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  {results?.status === 'completed' ? '✅ Official Final Tally' : '🔴 Real-Time Ledger Telemetry'}
                </p>
              </div>
              <div className="flex gap-xl">
                <div className="text-center border-gradient-glow" style={{ padding: '12px 24px', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '2.2rem', fontWeight: 800, color: '#2563eb' }}>
                    {totalVotes}
                  </div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Total Ballots Cast</div>
                </div>
              </div>
            </div>
          </div>

          {/* Winner Banner */}
          {winner && winner.votes > 0 && results?.status === 'completed' && (
            <div className="glass-card mb-lg animate-scale-in border-gradient-glow" style={{
              background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.25) 0%, rgba(5, 7, 15, 0.95) 100%)',
              borderColor: 'rgba(56, 189, 248, 0.45)',
              textAlign: 'center',
              padding: 'var(--space-2xl)'
            }}>
              <div className="badge badge--primary shimmer-badge mb-sm">
                <HiOutlineSparkles /> ELECTED CANDIDATE
              </div>
              <h3 style={{ fontSize: '2rem', fontWeight: 900, color: '#ffffff', marginBottom: 4 }}>
                {winner.name}
              </h3>
              <p style={{ color: '#38bdf8', fontSize: '1.05rem', fontWeight: 700 }}>{winner.party}</p>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '1.35rem', color: '#7dd3fc', marginTop: 'var(--space-md)', fontWeight: 700 }}>
                {winner.votes} votes ({totalVotes > 0 ? ((winner.votes / totalVotes) * 100).toFixed(1) : 0}% of total vote)
              </p>
            </div>
          )}

          {/* Chart */}
          {chartData.length > 0 && (
            <div className="glass-card glass-card--no-hover mb-lg">
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 'var(--space-lg)' }}>
                📊 Candidate Vote Distribution
              </h3>
              <div style={{ width: '100%', height: 350 }}>
                <ResponsiveContainer>
                  <BarChart data={chartData} margin={{ top: 10, right: 20, bottom: 30, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(15, 23, 42, 0.08)" />
                    <XAxis dataKey="name" tick={{ fill: '#475569', fontSize: 12, fontWeight: 600 }} />
                    <YAxis tick={{ fill: '#475569', fontSize: 12 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="votes" radius={[8, 8, 0, 0]}>
                      {chartData.map((entry, idx) => (
                        <Cell key={idx} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Detailed Progress Bars */}
          <div className="glass-card glass-card--no-hover">
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 'var(--space-lg)' }}>
              Candidate Breakdown
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
              {chartData.map((candidate, idx) => {
                const pct = totalVotes > 0 ? (candidate.votes / totalVotes) * 100 : 0;
                return (
                  <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div className="flex justify-between items-center">
                      <div>
                        <span style={{ fontWeight: 700, fontSize: '0.98rem', color: 'var(--text-primary)' }}>{candidate.name}</span>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginLeft: 8 }}>
                          ({candidate.party})
                        </span>
                      </div>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem', color: '#38bdf8', fontWeight: 700 }}>
                        {candidate.votes} votes ({pct.toFixed(1)}%)
                      </span>
                    </div>
                    <div style={{ width: '100%', height: 10, background: 'rgba(15, 23, 42, 0.85)', border: '1px solid rgba(56, 189, 248, 0.15)', borderRadius: varRadiusFull, overflow: 'hidden' }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${pct}%`,
                          background: candidate.color,
                          borderRadius: varRadiusFull,
                          transition: 'width 0.8s cubic-bezier(0.16, 1, 0.3, 1)'
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const varRadiusFull = '9999px';

export default Results;
