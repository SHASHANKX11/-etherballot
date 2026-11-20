import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useWeb3 } from '../context/Web3Context';
import { 
  HiOutlineMenu, 
  HiOutlineX, 
  HiOutlineLogout, 
  HiOutlineShieldCheck, 
  HiOutlineSearch, 
  HiOutlinePhone,
  HiOutlineGlobeAlt
} from 'react-icons/hi';
import AnimatedEmblem from './AnimatedEmblem';
import VoterSearchModal from './VoterSearchModal';

const Navbar = () => {
  const { isAuthenticated, user, role, isAdmin, logout } = useAuth();
  const { isConnected, account, connectWallet, disconnectWallet } = useWeb3();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [fontSizeScale, setFontSizeScale] = useState(1);
  const [lang, setLang] = useState('en'); // 'en' | 'hi'
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 15);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setIsMobileOpen(false);
  }, [location]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  useEffect(() => {
    document.documentElement.style.fontSize = '100%';
  }, []);

  const handleFontResize = (direction) => {
    const mainEl = document.querySelector('main');
    if (!mainEl) return;

    if (direction === 'inc' && fontSizeScale < 1.25) {
      const next = fontSizeScale + 0.05;
      setFontSizeScale(next);
      mainEl.style.fontSize = `${next * 100}%`;
    } else if (direction === 'dec' && fontSizeScale > 0.85) {
      const next = fontSizeScale - 0.05;
      setFontSizeScale(next);
      mainEl.style.fontSize = `${next * 100}%`;
    } else if (direction === 'reset') {
      setFontSizeScale(1);
      mainEl.style.fontSize = '100%';
    }
  };

  const navLinks = isAuthenticated
    ? isAdmin
      ? [
          { path: '/admin', label: lang === 'hi' ? 'डैशबोर्ड' : 'Dashboard' },
          { path: '/qr-scanner', label: lang === 'hi' ? 'क्यूआर स्कैनर' : '📷 QR Scanner' },
          { path: '/admin/elections', label: lang === 'hi' ? 'निर्वाचन' : 'Elections' },
          { path: '/admin/voters', label: lang === 'hi' ? 'मतदाता सूची' : 'Electoral Roll' },
          { path: '/results', label: lang === 'hi' ? 'परिणाम व ऑडिट' : 'Results & Audits' },
        ]
      : [
          { path: '/voter-card', label: lang === 'hi' ? 'मेरा डिजिटल वोटर कार्ड' : 'MY DIGITAL VOTER ID' },
          { path: '/qr-scanner', label: lang === 'hi' ? 'क्यूआर स्कैनर' : '📷 QR Scanner' },
          { path: '/vote', label: lang === 'hi' ? 'इलेक्ट्रॉनिक मतपत्र' : 'Electronic Ballot' },
          { path: '/results', label: lang === 'hi' ? 'चुनाव परिणाम' : 'Election Results' },
        ]
    : [
        { path: '/', label: lang === 'hi' ? 'मुख्य पृष्ठ' : 'Home' },
        { path: '/voter-card', label: lang === 'hi' ? 'डिजिटल वोटर कार्ड' : 'Digital Voter ID' },
        { path: '/qr-scanner', label: lang === 'hi' ? 'क्यूआर स्कैनर' : '📷 QR Scanner' },
        { path: '/results', label: lang === 'hi' ? 'चुनाव परिणाम' : 'Election Results' },
      ];

  return (
    <>
      {/* ═══ TRICOLOR TOP STRIP (GIGW MANDATE) ═══ */}
      <div className="gov-tricolor-strip" />

      {/* ═══ SOVEREIGN ACCESSIBILITY & IDENTITY TOP BAR ═══ */}
      <div className="gov-top-bar hide-mobile">
        <div className="page-container gov-top-bar__inner">
          <div className="gov-top-bar__left">
            <a href="#main-content" className="gov-skip-link">Skip to main content</a>
            <span className="gov-title-hi">भारत सरकार</span>
            <span className="gov-divider">|</span>
            <span className="gov-title-en">Government of India</span>
            <span className="gov-divider">|</span>
            <span className="gov-auth-tag">Digital India Sovereign Portal</span>
          </div>

          <div className="gov-top-bar__right">
            {/* Toll-Free National Voter Helpline */}
            <a href="tel:1950" className="gov-helpline-pill" title="National Voter Helpline 1950">
              <HiOutlinePhone size={13} style={{ color: '#38bdf8' }} />
              <span>Voter Helpline: <strong>1950</strong> (Toll-Free)</span>
            </a>

            <span className="gov-divider">|</span>

            {/* Accessibility Font Size Controls */}
            <div className="gov-font-resizer" aria-label="Font Size Controls">
              <button onClick={() => handleFontResize('dec')} title="Decrease Font Size">A-</button>
              <button onClick={() => handleFontResize('reset')} title="Normal Font Size">A</button>
              <button onClick={() => handleFontResize('inc')} title="Increase Font Size">A+</button>
            </div>

            <span className="gov-divider">|</span>

            {/* Language Switcher */}
            <div className="gov-lang-switcher">
              <HiOutlineGlobeAlt size={14} />
              <button 
                className={`gov-lang-btn ${lang === 'en' ? 'active' : ''}`}
                onClick={() => setLang('en')}
              >
                English
              </button>
              <span>/</span>
              <button 
                className={`gov-lang-btn ${lang === 'hi' ? 'active' : ''}`}
                onClick={() => setLang('hi')}
              >
                हिन्दी
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ PRIMARY GOVERNMENT NAVIGATION ═══ */}
      <nav className={`navbar ${isScrolled ? 'navbar--scrolled' : ''}`}>
        <div className="navbar__inner">
          {/* Official Emblem & Branding */}
          <Link to="/" className="navbar__gov-brand">
            <AnimatedEmblem size={40} />
            <div className="navbar__brand-text-container">
              <div className="navbar__gov-org-hi">भारत निर्वाचन आयोग</div>
              <div className="navbar__gov-org-en">ELECTION COMMISSION OF INDIA</div>
              <div className="navbar__gov-sub">
                <strong>EtherBallot</strong> • Decentralized Voting System
              </div>
            </div>
          </Link>

          {/* Center Search Trigger (Voter Service Portal style) */}
          <div className="navbar__quick-actions hide-mobile">
            <button 
              className="gov-search-trigger-btn"
              onClick={() => setIsSearchModalOpen(true)}
              title="Search Electoral Roll or Download e-EPIC"
            >
              <HiOutlineSearch size={15} />
              <span className="gov-search-full">Search Electoral Roll / e-EPIC</span>
              <span className="gov-search-short">Search Roll</span>
            </button>
          </div>

          {/* Desktop Navigation Links */}
          <div className="navbar__links hide-mobile">
            {navLinks.map(link => (
              <Link
                key={link.path}
                to={link.path}
                className={`navbar__link ${location.pathname === link.path ? 'navbar__link--active' : ''}`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Right Action / Auth Buttons */}
          <div className="navbar__right">
            {/* MetaMask Web3 Status Pill */}
            <button
              type="button"
              onClick={isConnected ? disconnectWallet : connectWallet}
              className="btn btn-sm"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '5px 10px',
                borderRadius: 7,
                border: isConnected ? '1.5px solid #10b981' : '1.5px solid #38bdf8',
                background: isConnected ? 'rgba(16, 185, 129, 0.08)' : 'rgba(56, 189, 248, 0.08)',
                color: isConnected ? '#059669' : '#0284c7',
                fontWeight: 600,
                fontSize: '0.75rem',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s ease',
              }}
              title={isConnected ? `Connected: ${account}. Click to disconnect.` : 'Connect MetaMask Ethereum Wallet'}
            >
              <span style={{ fontSize: '0.95rem', lineHeight: 1 }}>🦊</span>
              <span className="hide-mobile">
                {isConnected ? `${account.slice(0, 6)}...${account.slice(-4)}` : 'Connect Wallet'}
              </span>
            </button>

            {isAuthenticated ? (
              <div className="navbar__user">
                <div className="navbar__user-info hide-mobile">
                  <span className="navbar__user-name">{user?.name}</span>
                  <span className="navbar__user-role">
                    {role === 'voter' 
                      ? (user?.emailVerified ? '🗳️ Verified Elector' : '⚠️ Email Pending') 
                      : role === 'super_admin' ? '👑 Chief Election Officer' :
                      role === 'state_admin' ? '🏛️ State Election Officer' : '📍 District Magistrate / DEO'}
                  </span>
                </div>
                <button onClick={handleLogout} className="btn btn-ghost btn-sm" title="Logout">
                  <HiOutlineLogout size={16} />
                  <span className="hide-mobile">Sign Out</span>
                </button>
              </div>
            ) : (
              <div className="navbar__auth-buttons">
                <Link to="/login" className="btn btn-ghost btn-sm">
                  Voter Login
                </Link>
                <Link to="/register" className="btn btn-primary btn-sm">
                  Form 6 (Register)
                </Link>
                <Link to="/admin/login" className="btn btn-secondary btn-sm hide-mobile">
                  <HiOutlineShieldCheck size={16} />
                  Official Portal
                </Link>
              </div>
            )}
            
            {/* Mobile Menu Toggle */}
            <button 
              className="navbar__mobile-toggle"
              onClick={() => setIsMobileOpen(!isMobileOpen)}
              aria-label="Toggle Navigation Menu"
            >
              {isMobileOpen ? <HiOutlineX size={24} /> : <HiOutlineMenu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu Drawer */}
        {isMobileOpen && (
          <div className="navbar__mobile-menu animate-slide-up">
            {/* Mobile MetaMask Pill */}
            <button
              type="button"
              onClick={isConnected ? disconnectWallet : connectWallet}
              className="btn btn-block btn-sm"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                padding: '8px 14px',
                borderRadius: 8,
                marginBottom: 8,
                border: isConnected ? '1.5px solid #10b981' : '1.5px solid #38bdf8',
                background: isConnected ? 'rgba(16, 185, 129, 0.08)' : 'rgba(56, 189, 248, 0.08)',
                color: isConnected ? '#059669' : '#0284c7',
                fontWeight: 600,
                fontSize: '0.85rem',
              }}
            >
              <span>🦊</span>
              <span>{isConnected ? `Connected (${account.slice(0, 6)}...${account.slice(-4)})` : 'Connect MetaMask Wallet'}</span>
            </button>

            <button 
              className="gov-search-trigger-btn mb-sm"
              style={{ width: '100%', justifyContent: 'center' }}
              onClick={() => { setIsMobileOpen(false); setIsSearchModalOpen(true); }}
            >
              <HiOutlineSearch size={16} />
              <span>Search in Electoral Roll / e-EPIC</span>
            </button>

            {navLinks.map(link => (
              <Link
                key={link.path}
                to={link.path}
                className={`navbar__mobile-link ${location.pathname === link.path ? 'navbar__mobile-link--active' : ''}`}
              >
                {link.label}
              </Link>
            ))}

            {!isAuthenticated && (
              <div className="navbar__mobile-auth-group">
                <Link to="/login" className="btn btn-ghost btn-block">Voter Login</Link>
                <Link to="/register" className="btn btn-primary btn-block">New Registration (Form 6)</Link>
                <Link to="/admin/login" className="btn btn-secondary btn-block">Election Official Portal</Link>
              </div>
            )}
          </div>
        )}
      </nav>

      {/* Voter Search Modal */}
      <VoterSearchModal 
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
      />

      <style>{`
        /* ─── Top Strip (Blue - Light Blue - White - Royal Blue) ─── */
        .gov-tricolor-strip {
          height: 3px;
          background: linear-gradient(90deg, #2563eb 0%, #38bdf8 30%, #ffffff 50%, #38bdf8 70%, #2563eb 100%);
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 102;
          box-shadow: 0 0 10px rgba(56, 189, 248, 0.4);
        }

        /* ─── Sovereign Top Bar (Light Government) ─── */
        .gov-top-bar {
          background: linear-gradient(90deg, #ffffff 0%, #f1f5f9 50%, #ffffff 100%);
          color: #0f172a;
          font-size: 11.5px;
          height: 32px;
          position: fixed;
          top: 3px;
          left: 0;
          right: 0;
          z-index: 101;
          display: flex;
          align-items: center;
          border-bottom: 1px solid rgba(37, 99, 235, 0.12);
        }
        .gov-top-bar__inner {
          max-width: 1480px;
          margin: 0 auto;
          width: 100%;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0 16px !important;
        }
        .gov-top-bar__left, .gov-top-bar__right {
          display: flex;
          align-items: center;
          gap: 8px;
          white-space: nowrap;
        }
        .gov-skip-link {
          position: absolute;
          left: -9999px;
          top: 0;
          background: #ffffff;
          color: #0f172a;
          padding: 4px 8px;
          z-index: 1000;
          font-weight: 700;
        }
        .gov-skip-link:focus {
          left: 10px;
          top: 2px;
        }
        .gov-title-hi {
          font-family: 'Noto Sans Devanagari', -apple-system, sans-serif;
          font-weight: 700;
          color: #0369a1;
          font-size: 12px;
          line-height: 1;
        }
        .gov-title-en {
          font-weight: 600;
          letter-spacing: 0.02em;
          color: #334155;
          font-size: 11.5px;
          line-height: 1;
        }
        .gov-auth-tag {
          font-size: 10.5px;
          background: rgba(37, 99, 235, 0.08);
          padding: 1px 6px;
          border-radius: 4px;
          color: #475569;
          font-weight: 500;
        }
        .gov-divider {
          color: rgba(15, 23, 42, 0.25);
          font-size: 11px;
        }
        .gov-helpline-pill {
          display: flex;
          align-items: center;
          gap: 5px;
          color: #334155;
          font-size: 11.5px;
          padding: 2px 8px;
          background: rgba(37, 99, 235, 0.07);
          border-radius: 4px;
          transition: background 0.2s;
          white-space: nowrap;
        }
        .gov-helpline-pill:hover {
          background: rgba(37, 99, 235, 0.14);
        }
        .gov-font-resizer {
          display: flex;
          gap: 3px;
          align-items: center;
        }
        .gov-font-resizer button {
          padding: 1px 6px;
          background: rgba(37, 99, 235, 0.08);
          border-radius: 3px;
          color: #334155;
          font-size: 11px;
          font-weight: 700;
          transition: all 0.2s;
          border: none;
          cursor: pointer;
        }
        .gov-font-resizer button:hover {
          background: #38bdf8;
          color: #05070f;
        }
        .gov-lang-switcher {
          display: flex;
          align-items: center;
          gap: 4px;
          color: #334155;
          font-size: 11.5px;
        }
        .gov-lang-btn {
          background: none;
          border: none;
          color: #64748b;
          font-size: 11.5px;
          padding: 0 2px;
          font-weight: 600;
          cursor: pointer;
        }
        .gov-lang-btn.active {
          color: #0284c7;
          font-weight: 800;
          text-decoration: underline;
        }

        /* ─── Main Navbar (Light Sovereign) ─── */
        .navbar {
          position: fixed;
          top: 35px;
          left: 0;
          right: 0;
          z-index: 100;
          background: rgba(255, 255, 255, 0.96);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border-bottom: 1px solid rgba(37, 99, 235, 0.12);
          box-shadow: 0 3px 18px rgba(15, 23, 42, 0.06);
          transition: all var(--transition-normal);
          font-size: 13px;
        }
        .navbar--scrolled {
          top: 0;
          background: rgba(255, 255, 255, 0.98);
          box-shadow: 0 6px 24px rgba(15, 23, 42, 0.10);
        }
        .navbar__inner {
          max-width: 1480px;
          margin: 0 auto;
          height: 64px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 0 16px;
        }
        .navbar__gov-brand {
          display: flex;
          align-items: center;
          gap: 10px;
          text-decoration: none;
          flex-shrink: 0;
          white-space: nowrap;
          transition: transform 0.2s ease;
        }
        .navbar__gov-brand:hover {
          transform: translateY(-1px);
        }
        .navbar__brand-text-container {
          display: flex;
          flex-direction: column;
          line-height: 1.25;
          text-align: left;
          justify-content: center;
          white-space: nowrap;
        }
        .navbar__gov-org-hi {
          font-family: 'Noto Sans Devanagari', -apple-system, sans-serif;
          font-size: 13.5px;
          font-weight: 700;
          line-height: 1.35;
          padding-top: 1px;
          color: #0f172a;
          letter-spacing: 0.01em;
          white-space: nowrap;
        }
        .navbar__gov-org-en {
          font-family: var(--font-heading);
          font-size: 11px;
          font-weight: 800;
          line-height: 1.2;
          color: #0369a1;
          letter-spacing: 0.04em;
          white-space: nowrap;
        }
        .navbar__gov-sub {
          font-size: 10px;
          line-height: 1.2;
          color: #64748b;
          white-space: nowrap;
          margin-top: 1px;
        }
        .navbar__gov-sub strong {
          color: #2563eb;
        }

        .gov-search-trigger-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          background: rgba(255, 255, 255, 0.95);
          border: 1px solid rgba(56, 189, 248, 0.28);
          border-radius: var(--radius-full);
          font-size: 12px;
          color: #334155;
          font-weight: 600;
          white-space: nowrap;
          flex-shrink: 0;
          transition: all 0.2s ease;
          cursor: pointer;
        }
        .gov-search-trigger-btn:hover {
          background: rgba(224, 242, 254, 0.95);
          border-color: #38bdf8;
          color: #0f172a;
          box-shadow: 0 0 14px rgba(56, 189, 248, 0.25);
          transform: translateY(-1px);
        }
        .gov-search-short {
          display: none;
        }

        .navbar__links {
          display: flex;
          align-items: center;
          gap: 2px;
          flex-shrink: 0;
        }
        .navbar__link {
          padding: 6px 10px;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 600;
          color: #334155;
          white-space: nowrap;
          line-height: 1.4;
          display: inline-flex;
          align-items: center;
          gap: 4px;
          transition: all var(--transition-fast);
        }
        .navbar__link:hover {
          color: #0f172a;
          background: rgba(56, 189, 248, 0.12);
        }
        .navbar__link--active {
          color: #0284c7;
          background: rgba(56, 189, 248, 0.16);
          border-bottom: 2px solid #0284c7;
          font-weight: 700;
        }

        .navbar__right {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-shrink: 0;
        }
        .navbar__user {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-shrink: 0;
        }
        .navbar__user-info {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          line-height: 1.2;
          white-space: nowrap;
        }
        .navbar__user-name {
          font-size: 13px;
          font-weight: 700;
          color: #0f172a;
        }
        .navbar__user-role {
          font-size: 11px;
          color: #0284c7;
          font-weight: 600;
        }
        .navbar__auth-buttons {
          display: flex;
          gap: 6px;
          align-items: center;
          flex-shrink: 0;
        }
        .navbar__auth-buttons .btn {
          white-space: nowrap;
          font-size: 12px;
          padding: 6px 11px;
          border-radius: 6px;
          font-weight: 600;
        }
        .navbar__mobile-toggle {
          display: none;
          background: transparent;
          color: #0f172a;
          padding: 6px;
          border-radius: 6px;
          border: none;
          cursor: pointer;
        }
        .navbar__mobile-menu {
          position: absolute;
          top: 64px;
          left: 0;
          right: 0;
          background: rgba(255, 255, 255, 0.98);
          border-bottom: 2px solid #38bdf8;
          padding: var(--space-md);
          display: flex;
          flex-direction: column;
          gap: 8px;
          box-shadow: 0 12px 30px rgba(15, 23, 42, 0.14);
          backdrop-filter: blur(20px);
        }
        .navbar__mobile-link {
          padding: 10px 14px;
          border-radius: var(--radius-sm);
          color: #334155;
          font-weight: 600;
          font-size: 0.88rem;
        }
        .navbar__mobile-link:hover,
        .navbar__mobile-link--active {
          background: rgba(56, 189, 248, 0.15);
          color: #0284c7;
          font-weight: 700;
        }
        .navbar__mobile-auth-group {
          margin-top: var(--space-sm);
          padding-top: var(--space-sm);
          border-top: 1px solid var(--border-primary);
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        /* Responsive Breakpoints */
        @media (max-width: 1320px) {
          .navbar__gov-sub { display: none; }
          .gov-search-full { display: none; }
          .gov-search-short { display: inline; }
        }

        @media (max-width: 1100px) {
          .navbar__quick-actions { display: none !important; }
        }

        @media (max-width: 960px) {
          .gov-top-bar { display: none; }
          .navbar { top: 3px; }
          .navbar__mobile-toggle { display: block; }
          .navbar__links { display: none !important; }
          .navbar__auth-buttons { display: none; }
        }
      `}</style>
    </>
  );
};

export default Navbar;
