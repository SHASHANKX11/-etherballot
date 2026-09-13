import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { adminAPI, electionAPI } from '../services/api';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  HiOutlineUserGroup, 
  HiOutlineClipboardList, 
  HiOutlineShieldCheck, 
  HiOutlineChartBar, 
  HiOutlinePlus, 
  HiOutlineRefresh,
  HiOutlineTrash,
  HiOutlineCheckCircle,
  HiOutlineExclamation
} from 'react-icons/hi';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#2563eb', '#0284c7', '#059669', '#d97706', '#7c3aed', '#ec4899', '#4f46e5', '#f97316'];

const AdminDashboard = ({ tab: initialTab }) => {
  const { user, isSuperAdmin, isStateAdmin, isDistrictAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState(initialTab || 'overview');
  const [stats, setStats] = useState(null);
  const [elections, setElections] = useState([]);
  const [voters, setVoters] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateElection, setShowCreateElection] = useState(false);
  const [showCreateAdmin, setShowCreateAdmin] = useState(false);
  const [states, setStates] = useState([]);
  const [deleteElectionId, setDeleteElectionId] = useState(null); // For confirm modal
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Election form
  const [electionForm, setElectionForm] = useState({
    name: '', description: '', type: 'national', state: '', district: '',
    startDate: '', endDate: '', candidates: [
      { name: '', party: '' },
      { name: '', party: '' }
    ]
  });

  // Admin form
  const [adminForm, setAdminForm] = useState({
    username: '', password: '', name: '', email: '', state: '', district: '',
    type: 'state_admin'
  });

  // Sync tab when prop changes (from route /admin/elections, /admin/voters etc.)
  useEffect(() => {
    if (initialTab && initialTab !== activeTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsRes, statesRes] = await Promise.all([
        adminAPI.getStats(),
        adminAPI.getStates()
      ]);
      setStats(statsRes.data.stats);
      setStates(statesRes.data.states);

      if (activeTab === 'elections') {
        const res = await electionAPI.getAll();
        setElections(res.data.elections);
      }
      if (activeTab === 'voters') {
        const res = await adminAPI.getVoters({ limit: 50 });
        setVoters(res.data.voters);
      }
      if (activeTab === 'admins' && (isSuperAdmin || isStateAdmin)) {
        const res = await adminAPI.listAdmins({});
        setAdmins(res.data.admins);
      }
      if (activeTab === 'logs') {
        const res = await adminAPI.getAuditLogs({ limit: 50 });
        setAuditLogs(res.data.logs);
      }
    } catch (err) {
      console.error('Dashboard load error:', err);
    }
    setLoading(false);
  };

  // ═══ CREATE ELECTION ═══
  const handleCreateElection = async () => {
    const { name, description, type, startDate, endDate, candidates } = electionForm;
    if (!name || !description || !startDate || !endDate) {
      toast.error('Please fill all required fields');
      return;
    }
    const validCandidates = candidates.filter(c => c.name && c.party);
    if (validCandidates.length < 2) {
      toast.error('At least 2 candidates required');
      return;
    }
    try {
      await electionAPI.create({
        ...electionForm,
        candidates: validCandidates
      });
      toast.success('Election created!');
      setShowCreateElection(false);
      setElectionForm({
        name: '', description: '', type: 'national', state: '', district: '',
        startDate: '', endDate: '', candidates: [{ name: '', party: '' }, { name: '', party: '' }]
      });
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create election');
    }
  };

  // ═══ DELETE ELECTION ═══
  const handleDeleteElection = async () => {
    if (!deleteElectionId) return;
    setDeleteLoading(true);
    try {
      await electionAPI.deleteElection(deleteElectionId);
      toast.success('Election deleted successfully.');
      setDeleteElectionId(null);
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete election');
    }
    setDeleteLoading(false);
  };

  // ═══ CREATE ADMIN ═══
  const handleCreateAdmin = async () => {
    const { username, password, name, email, state, type, district } = adminForm;
    if (!username || !password || !name || !email) {
      toast.error('Please fill all required fields');
      return;
    }
    try {
      if (type === 'state_admin') {
        await adminAPI.createStateAdmin({ username, password, name, email, state });
      } else {
        await adminAPI.createDistrictAdmin({ username, password, name, email, state, district });
      }
      toast.success('Admin created!');
      setShowCreateAdmin(false);
      setAdminForm({ username: '', password: '', name: '', email: '', state: '', district: '', type: 'state_admin' });
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create admin');
    }
  };

  // ═══ ELECTION STATUS ═══
  const handleElectionStatus = async (id, status) => {
    try {
      await electionAPI.updateStatus(id, status);
      toast.success(`Election status updated to ${status}!`);
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    }
  };

  // ═══ DELETE VOTER ═══
  const handleDeleteVoter = async (id, name) => {
    if (!window.confirm(`Are you sure you want to permanently delete voter: ${name}?`)) return;
    try {
      await adminAPI.deleteVoter(id);
      toast.success('Voter deleted successfully');
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete voter');
    }
  };

  const addCandidate = () => {
    setElectionForm(prev => ({
      ...prev,
      candidates: [...prev.candidates, { name: '', party: '' }]
    }));
  };

  const updateCandidate = (idx, field, value) => {
    setElectionForm(prev => ({
      ...prev,
      candidates: prev.candidates.map((c, i) => i === idx ? { ...c, [field]: value } : c)
    }));
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: <HiOutlineChartBar size={18} /> },
    { id: 'elections', label: 'Elections', icon: <HiOutlineClipboardList size={18} /> },
    { id: 'voters', label: 'Voters', icon: <HiOutlineUserGroup size={18} /> },
    ...(isSuperAdmin || isStateAdmin ? [{ id: 'admins', label: 'Administrators', icon: <HiOutlineShieldCheck size={18} /> }] : []),
    ...(isSuperAdmin || isStateAdmin ? [{ id: 'logs', label: 'Audit Trail' }] : [])
  ];

  return (
    <div className="page-container">
      <div className="page-header" style={{ marginTop: 'var(--space-md)', textAlign: 'left' }}>
        <div className="flex justify-between items-center flex-wrap gap-md">
          <div>
            <div className="badge badge--warning mb-xs">
              <HiOutlineShieldCheck />
              {isSuperAdmin ? 'National Oversight' : isStateAdmin ? 'State Jurisdiction' : 'District Jurisdiction'}
            </div>
            <h1 className="page-title" style={{ fontSize: '2.2rem', margin: 0 }}>
              {isSuperAdmin ? 'National Election Authority' : isStateAdmin ? `${user?.state} State Commission` : `${user?.district} District Commission`}
            </h1>
            <p className="page-subtitle" style={{ margin: 0, fontSize: '0.9rem' }}>
              Authenticated Official: <strong>{user?.name}</strong> • Role: <code>{user?.role}</code>
            </p>
          </div>

          <button className="btn btn-secondary btn-sm" onClick={loadData}>
            <HiOutlineRefresh size={16} /> Refresh Telemetry
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="admin-tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`admin-tab ${activeTab === tab.id ? 'admin-tab--active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center" style={{ padding: 'var(--space-3xl)' }}>
          <div className="spinner" style={{ margin: '0 auto' }} />
          <p className="loading-text mt-md">Retrieving administrative database...</p>
        </div>
      ) : (
        <>
          {/* ═══ OVERVIEW TAB ═══ */}
          {activeTab === 'overview' && stats && (
            <div className="animate-fade-in">
              <div className="grid grid-4 mb-xl">
                <div className="glass-card stat-card">
                  <div className="stat-card__icon stat-card__icon--primary">👥</div>
                  <div className="stat-card__value">{stats.totalVoters}</div>
                  <div className="stat-card__label">Enrolled Voters</div>
                </div>
                <div className="glass-card stat-card">
                  <div className="stat-card__icon stat-card__icon--success">✅</div>
                  <div className="stat-card__value">{stats.activeVoters}</div>
                  <div className="stat-card__label">Active Verified Voters</div>
                </div>
                <div className="glass-card stat-card">
                  <div className="stat-card__icon stat-card__icon--info">🛡️</div>
                  <div className="stat-card__value">{stats.managedAdmins}</div>
                  <div className="stat-card__label">Managed Officials</div>
                </div>
                <div className="glass-card stat-card">
                  <div className="stat-card__icon stat-card__icon--warning">🗳️</div>
                  <div className="stat-card__value">{elections.length || stats.recentLogs?.length || '—'}</div>
                  <div className="stat-card__label">Live System Events</div>
                </div>
              </div>

              {/* State Distribution Chart */}
              {stats.stateWiseVoters?.length > 0 && (
                <div className="glass-card glass-card--no-hover mb-lg">
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 'var(--space-lg)' }}>
                    State-wise Enrolled Voter Distribution
                  </h3>
                  <div style={{ width: '100%', height: 320 }}>
                    <ResponsiveContainer>
                      <BarChart data={stats.stateWiseVoters.map(s => ({ name: s._id, count: s.count }))}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(15, 23, 42, 0.08)" />
                        <XAxis dataKey="name" tick={{ fill: '#475569', fontSize: 10, fontWeight: 600 }} angle={-35} textAnchor="end" height={60} />
                        <YAxis tick={{ fill: '#475569', fontSize: 12 }} />
                        <Tooltip contentStyle={{ background: '#ffffff', border: '1px solid rgba(37, 99, 235, 0.25)', borderRadius: 8, color: '#0f172a', boxShadow: '0 4px 16px rgba(15,23,42,0.1)' }} />
                        <Bar dataKey="count" fill="#2563eb" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* District Distribution Chart */}
              {stats.districtWiseVoters?.length > 0 && (
                <div className="glass-card glass-card--no-hover mb-lg">
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 'var(--space-lg)' }}>
                    District Demographics Breakdown
                  </h3>
                  <div style={{ width: '100%', height: 280 }}>
                    <ResponsiveContainer>
                      <PieChart>
                        <Pie
                          data={stats.districtWiseVoters.map(d => ({ name: d._id, value: d.count }))}
                          cx="50%" cy="50%" outerRadius={90}
                          dataKey="value" label={({ name, value }) => `${name}: ${value}`}
                        >
                          {stats.districtWiseVoters.map((_, idx) => (
                            <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ background: '#ffffff', border: '1px solid rgba(37, 99, 235, 0.25)', borderRadius: 8, color: '#0f172a', boxShadow: '0 4px 16px rgba(15,23,42,0.1)' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Recent Activity */}
              {stats.recentLogs?.length > 0 && (
                <div className="glass-card glass-card--no-hover">
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 'var(--space-lg)' }}>
                    Recent System Event Stream
                  </h3>
                  <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                    {stats.recentLogs.map((log, i) => (
                      <div key={i} className="flex justify-between items-center" style={{
                        padding: '10px 0', borderBottom: '1px solid var(--border-secondary)'
                      }}>
                        <div>
                          <span className={`badge badge--${log.success ? 'success' : 'danger'}`} style={{ marginRight: 10 }}>
                            {log.action}
                          </span>
                          <span style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>{log.details}</span>
                        </div>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                          {new Date(log.createdAt).toLocaleTimeString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ═══ ELECTIONS TAB ═══ */}
          {activeTab === 'elections' && (
            <div className="animate-fade-in">
              {(isSuperAdmin || isStateAdmin) && (
                <div className="mb-lg">
                  <button className="btn btn-primary" onClick={() => setShowCreateElection(true)}>
                    <HiOutlinePlus /> Create New Election Ballot
                  </button>
                </div>
              )}

              {showCreateElection && (
                <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowCreateElection(false)}>
                  <div className="modal-content animate-scale-in" style={{ maxWidth: 640, maxHeight: '90vh', overflowY: 'auto' }}>
                    <h3 className="modal-title">Create New Election Ballot</h3>
                    <div className="grid grid-2">
                      <div className="form-group">
                        <label className="form-label">Election Name *</label>
                        <input type="text" className="form-input" placeholder="e.g. 2026 Parliamentary Election" value={electionForm.name}
                          onChange={e => setElectionForm(p => ({...p, name: e.target.value}))} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Jurisdiction Level *</label>
                        <select className="form-select" value={electionForm.type}
                          onChange={e => setElectionForm(p => ({...p, type: e.target.value}))}>
                          <option value="national">National</option>
                          <option value="state">State</option>
                          <option value="district">District</option>
                        </select>
                      </div>
                      {electionForm.type !== 'national' && (
                        <div className="form-group">
                          <label className="form-label">State</label>
                          <select className="form-select" value={electionForm.state}
                            onChange={e => setElectionForm(p => ({...p, state: e.target.value}))}>
                            <option value="">Select State</option>
                            {states.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </div>
                      )}
                      {electionForm.type === 'district' && (
                        <div className="form-group">
                          <label className="form-label">District</label>
                          <input type="text" className="form-input" placeholder="e.g. Mumbai" value={electionForm.district}
                            onChange={e => setElectionForm(p => ({...p, district: e.target.value}))} />
                        </div>
                      )}
                      <div className="form-group">
                        <label className="form-label">Start Date & Time *</label>
                        <input type="datetime-local" className="form-input" value={electionForm.startDate}
                          onChange={e => setElectionForm(p => ({...p, startDate: e.target.value}))} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">End Date & Time *</label>
                        <input type="datetime-local" className="form-input" value={electionForm.endDate}
                          onChange={e => setElectionForm(p => ({...p, endDate: e.target.value}))} />
                      </div>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Ballot Description *</label>
                      <textarea className="form-textarea" rows={3} placeholder="Provide details regarding this vote..." value={electionForm.description}
                        onChange={e => setElectionForm(p => ({...p, description: e.target.value}))} />
                    </div>

                    <h4 style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 'var(--space-md)' }}>Contesting Candidates</h4>
                    {electionForm.candidates.map((c, idx) => (
                      <div key={idx} className="grid grid-2 mb-md">
                        <input type="text" className="form-input" placeholder={`Candidate ${idx + 1} Name`}
                          value={c.name} onChange={e => updateCandidate(idx, 'name', e.target.value)} />
                        <input type="text" className="form-input" placeholder="Party Affiliation"
                          value={c.party} onChange={e => updateCandidate(idx, 'party', e.target.value)} />
                      </div>
                    ))}
                    <button className="btn btn-ghost btn-sm mb-xl" onClick={addCandidate}>
                      + Add Additional Candidate
                    </button>

                    <div className="flex gap-md">
                      <button className="btn btn-ghost btn-block" onClick={() => setShowCreateElection(false)}>Cancel</button>
                      <button className="btn btn-primary btn-block" onClick={handleCreateElection}>Publish Ballot</button>
                    </div>
                  </div>
                </div>
              )}

              {/* Elections Table */}
              <div className="glass-card glass-card--no-hover table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Election</th>
                      <th>Type</th>
                      <th>Status</th>
                      <th>Votes Cast</th>
                      <th>Timeline</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {elections.map(el => (
                      <tr key={el._id}>
                        <td style={{ fontWeight: 700, color: '#0f172a' }}>{el.name}</td>
                        <td><span className="badge badge--primary">{el.type.toUpperCase()}</span></td>
                        <td>
                          <span className={`badge badge--${
                            el.status === 'active' ? 'success' :
                            el.status === 'completed' ? 'info' :
                            el.status === 'cancelled' ? 'danger' : 'warning'
                          }`}>● {el.status.toUpperCase()}</span>
                        </td>
                        <td style={{ fontFamily: 'var(--font-mono)', color: '#2563eb', fontWeight: 600 }}>{el.totalVotesCast || 0}</td>
                        <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                          {new Date(el.startDate).toLocaleDateString()} - {new Date(el.endDate).toLocaleDateString()}
                        </td>
                        <td>
                          <div className="flex gap-sm items-center">
                            {el.status === 'draft' && (
                              <button className="btn btn-sm btn-secondary" onClick={() => handleElectionStatus(el._id, 'upcoming')}>
                                Publish
                              </button>
                            )}
                            {el.status === 'upcoming' && (
                              <button className="btn btn-sm btn-success" onClick={() => handleElectionStatus(el._id, 'active')}>
                                Start
                              </button>
                            )}
                            {el.status === 'active' && (
                              <button className="btn btn-sm btn-danger" onClick={() => handleElectionStatus(el._id, 'completed')}>
                                Conclude
                              </button>
                            )}
                            {(isSuperAdmin || isStateAdmin) && (
                              <button
                                className="btn btn-sm btn-ghost"
                                onClick={() => setDeleteElectionId(el._id)}
                                title="Delete Election"
                                style={{ color: '#dc2626', padding: '4px 8px' }}
                              >
                                <HiOutlineTrash size={16} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {elections.length === 0 && (
                      <tr><td colSpan={6} style={{ textAlign: 'center', padding: 'var(--space-xl)', color: 'var(--text-muted)' }}>No elections registered</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ═══ VOTERS TAB ═══ */}
          {activeTab === 'voters' && (
            <div className="animate-fade-in">
              <div className="glass-card glass-card--no-hover table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Voter Name</th>
                      <th>Aadhaar Hash</th>
                      <th>Mobile</th>
                      <th>State / UT</th>
                      <th>District</th>
                      <th>Status</th>
                      <th>Enrolled On</th>
                      {isSuperAdmin && <th>Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {voters.map(v => (
                      <tr key={v._id}>
                        <td style={{ fontWeight: 700, color: '#0f172a' }}>{v.name}</td>
                        <td style={{ fontFamily: 'var(--font-mono)', color: '#2563eb', fontWeight: 600 }}>****{v.aadhaarNumber?.slice(-4)}</td>
                        <td style={{ fontFamily: 'var(--font-mono)' }}>{v.mobile}</td>
                        <td>{v.address?.state}</td>
                        <td>{v.address?.district}</td>
                        <td>
                          <span className={`badge ${v.isActive ? 'badge--success' : 'badge--danger'}`}>
                            {v.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                          {new Date(v.createdAt).toLocaleDateString()}
                        </td>
                        {isSuperAdmin && (
                          <td>
                            <button className="btn btn-sm btn-ghost" style={{ color: '#dc2626' }} onClick={() => handleDeleteVoter(v._id, v.name)}>
                              <HiOutlineTrash />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                    {voters.length === 0 && (
                      <tr><td colSpan={isSuperAdmin ? 8 : 7} style={{ textAlign: 'center', padding: 'var(--space-xl)', color: 'var(--text-muted)' }}>No voters found</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ═══ ADMINS TAB ═══ */}
          {activeTab === 'admins' && (
            <div className="animate-fade-in">
              <div className="mb-lg flex gap-md">
                <button className="btn btn-primary" onClick={() => setShowCreateAdmin(true)}>
                  <HiOutlinePlus /> Appoint Official
                </button>
              </div>

              {showCreateAdmin && (
                <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowCreateAdmin(false)}>
                  <div className="modal-content animate-scale-in">
                    <h3 className="modal-title">Appoint Election Official</h3>
                    <div className="form-group">
                      <label className="form-label">Official Tier</label>
                      <select className="form-select" value={adminForm.type}
                        onChange={e => setAdminForm(p => ({...p, type: e.target.value}))}>
                        {isSuperAdmin && <option value="state_admin">State Admin</option>}
                        <option value="district_admin">District Admin</option>
                      </select>
                    </div>
                    <div className="grid grid-2">
                      <div className="form-group">
                        <label className="form-label">Username *</label>
                        <input type="text" className="form-input" value={adminForm.username}
                          onChange={e => setAdminForm(p => ({...p, username: e.target.value}))} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Temporary Password *</label>
                        <input type="password" className="form-input" value={adminForm.password}
                          onChange={e => setAdminForm(p => ({...p, password: e.target.value}))} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Full Name *</label>
                        <input type="text" className="form-input" value={adminForm.name}
                          onChange={e => setAdminForm(p => ({...p, name: e.target.value}))} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Email *</label>
                        <input type="email" className="form-input" value={adminForm.email}
                          onChange={e => setAdminForm(p => ({...p, email: e.target.value}))} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">State *</label>
                        <select className="form-select" value={adminForm.state}
                          onChange={e => setAdminForm(p => ({...p, state: e.target.value}))}>
                          <option value="">Select State</option>
                          {states.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                      {adminForm.type === 'district_admin' && (
                        <div className="form-group">
                          <label className="form-label">District *</label>
                          <input type="text" className="form-input" value={adminForm.district}
                            onChange={e => setAdminForm(p => ({...p, district: e.target.value}))} />
                        </div>
                      )}
                    </div>
                    <div className="flex gap-md mt-md">
                      <button className="btn btn-ghost btn-block" onClick={() => setShowCreateAdmin(false)}>Cancel</button>
                      <button className="btn btn-primary btn-block" onClick={handleCreateAdmin}>Confirm Appointment</button>
                    </div>
                  </div>
                </div>
              )}

              <div className="glass-card glass-card--no-hover table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Official Name</th>
                      <th>Username</th>
                      <th>Jurisdiction Tier</th>
                      <th>State</th>
                      <th>District</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {admins.map(a => (
                      <tr key={a._id}>
                        <td style={{ fontWeight: 700, color: '#0f172a' }}>{a.name}</td>
                        <td style={{ fontFamily: 'var(--font-mono)' }}>{a.username}</td>
                        <td>
                          <span className={`badge ${a.role === 'state_admin' ? 'badge--primary' : 'badge--info'}`}>
                            {a.role.replace('_', ' ').toUpperCase()}
                          </span>
                        </td>
                        <td>{a.state || '—'}</td>
                        <td>{a.district || '—'}</td>
                        <td>
                          <span className={`badge ${a.isActive ? 'badge--success' : 'badge--danger'}`}>
                            {a.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {admins.length === 0 && (
                      <tr><td colSpan={6} style={{ textAlign: 'center', padding: 'var(--space-xl)', color: 'var(--text-muted)' }}>No administrators found</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ═══ AUDIT LOGS TAB ═══ */}
          {activeTab === 'logs' && (
            <div className="animate-fade-in">
              <div className="glass-card glass-card--no-hover table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Timestamp</th>
                      <th>Action</th>
                      <th>Event Details</th>
                      <th>Actor Type</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.map((log, i) => (
                      <tr key={i}>
                        <td style={{ fontSize: '0.82rem', whiteSpace: 'nowrap', fontFamily: 'var(--font-mono)' }}>
                          {new Date(log.createdAt).toLocaleString()}
                        </td>
                        <td>
                          <span className="badge badge--primary">{log.action}</span>
                        </td>
                        <td style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                          {log.details}
                        </td>
                        <td style={{ fontSize: '0.85rem' }}>{log.performedBy?.userType || '—'}</td>
                        <td>
                          <span className={`badge ${log.success ? 'badge--success' : 'badge--danger'}`}>
                            {log.success ? 'Success' : 'Failed'}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {auditLogs.length === 0 && (
                      <tr><td colSpan={5} style={{ textAlign: 'center', padding: 'var(--space-xl)', color: 'var(--text-muted)' }}>No audit logs recorded</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      <style>{`
        .admin-tabs {
          display: flex;
          gap: 8px;
          border-bottom: 1px solid var(--border-primary);
          margin-bottom: var(--space-xl);
          overflow-x: auto;
          padding-bottom: 4px;
        }
        .admin-tab {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 20px;
          background: #ffffff;
          color: var(--text-secondary);
          border-radius: var(--radius-sm);
          font-weight: 600;
          font-size: 0.92rem;
          transition: all var(--transition-fast);
          white-space: nowrap;
          border: 1px solid var(--border-primary);
          box-shadow: var(--shadow-sm);
        }
        .admin-tab:hover {
          color: #0f172a;
          background: rgba(37, 99, 235, 0.05);
          border-color: rgba(37, 99, 235, 0.3);
        }
        .admin-tab--active {
          color: #1d4ed8;
          background: rgba(37, 99, 235, 0.1);
          border-color: rgba(37, 99, 235, 0.4);
          font-weight: 700;
        }
        .stat-card {
          padding: var(--space-lg);
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          background: #ffffff;
        }
        .stat-card__icon {
          font-size: 1.8rem;
          margin-bottom: var(--space-xs);
        }
        .stat-card__value {
          font-family: var(--font-display);
          font-size: 2.2rem;
          font-weight: 800;
          color: #2563eb;
        }
        .stat-card__label {
          font-size: 0.82rem;
          color: var(--text-muted);
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
      `}</style>

      {/* ═══ DELETE ELECTION CONFIRM MODAL ═══ */}
      <AnimatePresence>
        {deleteElectionId && (
          <motion.div
            key="delete-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="modal-overlay"
            onClick={e => e.target === e.currentTarget && setDeleteElectionId(null)}
            style={{ zIndex: 200 }}
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0, transition: { type: 'spring', stiffness: 340, damping: 28 } }}
              exit={{ scale: 0.92, opacity: 0, y: 20, transition: { duration: 0.15 } }}
              className="modal-content"
              style={{ maxWidth: 420, textAlign: 'center' }}
            >
              <div style={{
                width: 56, height: 56, borderRadius: '50%',
                background: 'rgba(220, 38, 38, 0.1)', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                margin: '0 auto var(--space-lg)'
              }}>
                <HiOutlineExclamation size={28} style={{ color: '#dc2626' }} />
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
                Delete Election?
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: 'var(--space-xl)' }}>
                This action is <strong>irreversible</strong>. All election data and results will be permanently removed.
              </p>
              <div className="flex gap-md" style={{ justifyContent: 'center' }}>
                <button
                  className="btn btn-ghost"
                  onClick={() => setDeleteElectionId(null)}
                  disabled={deleteLoading}
                >
                  Cancel
                </button>
                <button
                  className="btn"
                  style={{ background: 'var(--accent-danger)', color: '#ffffff' }}
                  onClick={handleDeleteElection}
                  disabled={deleteLoading}
                >
                  {deleteLoading ? 'Deleting...' : 'Yes, Delete Election'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminDashboard;
