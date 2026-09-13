import { lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import CyberBackground from './components/CyberBackground';
import ProtectedRoute from './components/ProtectedRoute';
import AnimatedEmblem from './components/AnimatedEmblem';
import { HiOutlinePhone, HiOutlineLocationMarker, HiOutlineExternalLink } from 'react-icons/hi';

// ─── Lazy-loaded pages (code-split per route for faster initial load) ──────────
const Home           = lazy(() => import('./pages/Home'));
const Register       = lazy(() => import('./pages/Register'));
const Login          = lazy(() => import('./pages/Login'));
const AdminLogin     = lazy(() => import('./pages/AdminLogin'));
const Voting         = lazy(() => import('./pages/Voting'));
const Results        = lazy(() => import('./pages/Results'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));

function App() {
  return (
    <div className="app-container">
      <CyberBackground />
      <Navbar />
      <main style={{ paddingTop: '114px', flex: 1, position: 'relative', zIndex: 1 }}>
        <Routes>
          <Route path="/"            element={<Home />} />
          <Route path="/register"    element={<Register />} />
          <Route path="/login"       element={<Login />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/results"     element={<Results />} />

          {/* Protected Voter Routes */}
          <Route path="/vote" element={
            <ProtectedRoute roles={['voter']}>
              <Voting />
            </ProtectedRoute>
          } />

          {/* Protected Admin Routes */}
          <Route path="/admin" element={
            <ProtectedRoute roles={['super_admin', 'state_admin', 'district_admin']}>
              <AdminDashboard />
            </ProtectedRoute>
          } />
          <Route path="/admin/elections" element={
            <ProtectedRoute roles={['super_admin', 'state_admin', 'district_admin']}>
              <AdminDashboard tab="elections" />
            </ProtectedRoute>
          } />
          <Route path="/admin/voters" element={
            <ProtectedRoute roles={['super_admin', 'state_admin', 'district_admin']}>
              <AdminDashboard tab="voters" />
            </ProtectedRoute>
          } />
        </Routes>
      </main>

      {/* ═══ OFFICIAL GIGW GOVERNMENT FOOTER ═══ */}
      <footer className="gov-footer">
        {/* Tricolor Strip */}
        <div className="gov-footer-tricolor" />

        {/* Top Government Links Matrix */}
        <div className="gov-footer-links-bar">
          <div className="page-container">
            <div className="gov-footer-links-grid">
              <div>
                <h4 className="gov-footer-heading">National Portals</h4>
                <ul className="gov-footer-list">
                  <li><a href="https://www.india.gov.in" target="_blank" rel="noreferrer">National Portal of India (india.gov.in) <HiOutlineExternalLink size={12} /></a></li>
                  <li><a href="https://digitalindia.gov.in" target="_blank" rel="noreferrer">Digital India Initiative <HiOutlineExternalLink size={12} /></a></li>
                  <li><a href="https://uidai.gov.in" target="_blank" rel="noreferrer">Unique Identification Authority (UIDAI) <HiOutlineExternalLink size={12} /></a></li>
                  <li><a href="https://data.gov.in" target="_blank" rel="noreferrer">Open Government Data (data.gov.in) <HiOutlineExternalLink size={12} /></a></li>
                  <li><a href="https://mygov.in" target="_blank" rel="noreferrer">MyGov Citizen Engagement <HiOutlineExternalLink size={12} /></a></li>
                </ul>
              </div>

              <div>
                <h4 className="gov-footer-heading">Electoral Services</h4>
                <ul className="gov-footer-list">
                  <li><a href="/register">Form 6 - New Voter Registration</a></li>
                  <li><a href="/register">Form 6A - Overseas Voter Enrollment</a></li>
                  <li><a href="/register">Form 8 - Shifting &amp; Corrections</a></li>
                  <li><a href="/results">Electoral Tally &amp; Ledger Audits</a></li>
                  <li><a href="/login">Voter Biometric Login</a></li>
                </ul>
              </div>

              <div>
                <h4 className="gov-footer-heading">Website Policies (GIGW)</h4>
                <ul className="gov-footer-list">
                  <li><a href="#policies">Website Policies &amp; Privacy Charter</a></li>
                  <li><a href="#hyperlink">Hyperlinking Policy</a></li>
                  <li><a href="#copyright">Copyright &amp; Trademark Policy</a></li>
                  <li><a href="#terms">Terms &amp; Conditions of Service</a></li>
                  <li><a href="#help">Help &amp; Screen Reader Access</a></li>
                </ul>
              </div>

              <div>
                <h4 className="gov-footer-heading">National Helpline &amp; Contact</h4>
                <div className="gov-footer-contact-item">
                  <HiOutlinePhone size={16} style={{ color: '#ff9933' }} />
                  <div>
                    <strong>Toll-Free Helpline: 1950</strong>
                    <span style={{ display: 'block', fontSize: '0.75rem', color: '#cbd5e1' }}>24x7 Citizen Assistance Desk</span>
                  </div>
                </div>
                <div className="gov-footer-contact-item mt-sm">
                  <HiOutlineLocationMarker size={16} style={{ color: '#38bdf8' }} />
                  <div>
                    <span>Nirvachan Sadan, Ashoka Road, New Delhi 110001</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Sovereign Statements & Credits */}
        <div className="gov-footer-bottom">
          <div className="page-container">
            <div className="gov-footer-bottom__inner">
              <div className="flex items-center gap-md">
                <AnimatedEmblem size={38} />
                <div>
                  <div className="gov-footer-title">भारत निर्वाचन आयोग • Election Commission of India</div>
                  <div className="gov-footer-sub">
                    EtherBallot Autonomous Sovereign Portal v2.0 • Hosted &amp; Managed under Academic Pilot Framework
                  </div>
                </div>
              </div>

              <div className="gov-footer-compliance">
                <div className="gov-compliance-badge">
                  <span>GIGW 3.0 Compliant</span>
                </div>
                <div className="gov-compliance-badge">
                  <span>WCAG 2.1 Level AA</span>
                </div>
                <div className="gov-compliance-badge">
                  <span>SHA-256 / zk-SNARKs Verified</span>
                </div>
                <div className="gov-compliance-badge">
                  <span>v2.0.0</span>
                </div>
              </div>
            </div>

            <div className="gov-footer-meta-row">
              <span>© 2026 Election Commission of India / EtherBallot Project. All rights reserved.</span>
              <span>Page Last Updated On: <strong>31 August 2026</strong> • Ledger Telemetry: Active</span>
            </div>
          </div>
        </div>

        <style>{`
          .gov-footer {
            background: #0f172a;
            color: #ffffff;
            margin-top: auto;
            position: relative;
            z-index: 1;
          }
          .gov-footer-tricolor {
            height: 4px;
            background: linear-gradient(90deg, #ff9933 0%, #ff9933 33.33%, #ffffff 33.33%, #ffffff 66.66%, #138808 66.66%, #138808 100%);
          }
          .gov-footer-links-bar {
            background: #1e293b;
            padding: var(--space-2xl) 0 var(--space-xl);
            border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          }
          .gov-footer-links-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: var(--space-xl);
          }
          .gov-footer-heading {
            font-size: 0.92rem;
            font-weight: 800;
            color: #ffffff;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin-bottom: var(--space-md);
            padding-bottom: 6px;
            border-bottom: 2px solid #2563eb;
            display: inline-block;
          }
          .gov-footer-list {
            display: flex;
            flex-direction: column;
            gap: 8px;
          }
          .gov-footer-list a {
            color: #cbd5e1;
            font-size: 0.84rem;
            transition: color 0.2s;
            display: flex;
            align-items: center;
            gap: 4px;
          }
          .gov-footer-list a:hover {
            color: #ff9933;
            text-decoration: underline;
          }
          .gov-footer-contact-item {
            display: flex;
            gap: 8px;
            font-size: 0.84rem;
            color: #cbd5e1;
          }
          .gov-footer-bottom {
            padding: var(--space-xl) 0 var(--space-lg);
            background: #0f172a;
          }
          .gov-footer-bottom__inner {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: var(--space-lg);
            padding-bottom: var(--space-lg);
            border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          }
          .gov-footer-title {
            font-family: 'Noto Sans Devanagari', 'Inter', sans-serif;
            font-weight: 800;
            font-size: 0.95rem;
            color: #ffffff;
          }
          .gov-footer-sub {
            font-size: 0.76rem;
            color: #94a3b8;
          }
          .gov-footer-compliance {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
          }
          .gov-compliance-badge {
            background: rgba(255, 255, 255, 0.08);
            border: 1px solid rgba(255, 255, 255, 0.15);
            padding: 3px 8px;
            border-radius: 4px;
            font-size: 0.7rem;
            color: #e2e8f0;
            font-weight: 600;
            transition: background 0.2s;
          }
          .gov-compliance-badge:hover {
            background: rgba(255, 255, 255, 0.14);
          }
          .gov-footer-meta-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding-top: var(--space-md);
            font-size: 0.76rem;
            color: #94a3b8;
          }

          @media (max-width: 900px) {
            .gov-footer-links-grid { grid-template-columns: repeat(2, 1fr); }
            .gov-footer-bottom__inner { flex-direction: column; text-align: center; }
            .gov-footer-meta-row { flex-direction: column; gap: 6px; text-align: center; }
          }
          @media (max-width: 600px) {
            .gov-footer-links-grid { grid-template-columns: 1fr; }
          }
        `}</style>
      </footer>
    </div>
  );
}

export default App;
