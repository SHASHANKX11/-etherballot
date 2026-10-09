import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
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

  const handleFontResize = (direction) => {
    if (direction === 'inc' && fontSizeScale < 1.15) {
      const next = fontSizeScale + 0.05;
      setFontSizeScale(next);
      document.documentElement.style.fontSize = `${next * 100}%`;
    } else if (direction === 'dec' && fontSizeScale > 0.9) {
      const next = fontSizeScale - 0.05;
      setFontSizeScale(next);
      document.documentElement.style.fontSize = `${next * 100}%`;
    } else if (direction === 'reset') {
      setFontSizeScale(1);
      document.documentElement.style.fontSize = '100%';
    }
  };

  const navLinks = isAuthenticated
    ? isAdmin
      ? [
          { path: '/admin', label: lang === 'hi' ? 'डैशबोर्ड' : 'Dashboard' },
          { path: '/admin/elections', label: lang === 'hi' ? 'निर्वाचन' : 'Elections' },
          { path: '/admin/voters', label: lang === 'hi' ? 'मतदाता सूची' : 'Electoral Roll' },
          { path: '/results', label: lang === 'hi' ? 'परिणाम व ऑडिट' : 'Results & Audits' },
        ]
      : [
          { path: '/vote', label: lang === 'hi' ? 'इलेक्ट्रॉनिक मतपत्र' : 'Electronic Ballot' },
        ]
    : [
        { path: '/', label: lang === 'hi' ? 'मुख्य पृष्ठ' : 'Home' },
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
              <HiOutlinePhone size={13} style={{ color: '#ff9933' }} />
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
            <AnimatedEmblem size={44} />
            <div className="navbar__brand-text-container">
              <div className="navbar__gov-org-hi">भारत निर्वाचन आयोग</div>
              <div className="navbar__gov-org-en">ELECTION COMMISSION OF INDIA</div>
              <div className="navbar__gov-sub">
                <strong>EtherBallot</strong> • Decentralized Autonomous Voting Infrastructure
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
              <HiOutlineSearch size={16} />
              <span>Search in Electoral Roll / e-EPIC</span>
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
        /* ─── GIGW Tricolor Ribbon Strip ─── */
        .gov-tricolor-strip {
          height: 4px;
          background: linear-gradient(90deg, #ff9933 0%, #ff9933 33.33%, #ffffff 33.33%, #ffffff 66.66%, #138808 66.66%, #138808 100%);
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 102;
          box-shadow: 0 1px 6px rgba(0, 0, 0, 0.1);
        }

        /* ─── Sovereign Top Bar ─── */
        .gov-top-bar {
          background: linear-gradient(90deg, #1e3a8a 0%, #1e40af 50%, #1e3a8a 100%); /* Deep Sovereign Blue */
          color: #ffffff;
          font-size: 0.76rem;
          height: 36px;
          position: fixed;
          top: 4px;
          left: 0;
          right: 0;
          z-index: 101;
          display: flex;
          align-items: center;
          border-bottom: 1px solid rgba(255, 255, 255, 0.15);
        }
        .gov-top-bar__inner {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: 0 !important;
          padding-bottom: 0 !important;
        }
        .gov-top-bar__left, .gov-top-bar__right {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .gov-skip-link {
          position: absolute;
          left: -9999px;
          top: 0;
          background: #ffffff;
          color: #0f172a;
          padding: 6px 12px;
          z-index: 1000;
          font-weight: 700;
        }
        .gov-skip-link:focus {
          left: 10px;
          top: 4px;
        }
        .gov-title-hi {
          font-family: 'Noto Sans Devanagari', sans-serif;
          font-weight: 700;
          color: #ff9933;
        }
        .gov-title-en {
          font-weight: 600;
          letter-spacing: 0.02em;
        }
        .gov-auth-tag {
          font-size: 0.68rem;
          background: rgba(255, 255, 255, 0.15);
          padding: 1px 6px;
          border-radius: 3px;
          color: #e2e8f0;
        }
        .gov-divider {
          color: rgba(255, 255, 255, 0.3);
        }
        .gov-helpline-pill {
          display: flex;
          align-items: center;
          gap: 6px;
          color: #ffffff;
          font-size: 0.74rem;
          padding: 2px 8px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 4px;
          transition: background 0.2s;
        }
        .gov-helpline-pill:hover {
          background: rgba(255, 255, 255, 0.2);
        }
        .gov-font-resizer {
          display: flex;
          gap: 3px;
        }
        .gov-font-resizer button {
          padding: 1px 6px;
          background: rgba(255, 255, 255, 0.15);
          border-radius: 3px;
          color: #ffffff;
          font-size: 0.7rem;
          font-weight: 700;
          transition: all 0.2s;
        }
        .gov-font-resizer button:hover {
          background: #ff9933;
          color: #0f172a;
        }
        .gov-lang-switcher {
          display: flex;
          align-items: center;
          gap: 4px;
          color: rgba(255, 255, 255, 0.85);
        }
        .gov-lang-btn {
          background: none;
          color: #cbd5e1;
          font-size: 0.72rem;
          padding: 0 2px;
          font-weight: 600;
        }
        .gov-lang-btn.active {
          color: #ff9933;
          font-weight: 800;
          text-decoration: underline;
        }

        /* ─── Main Navbar ─── */
        .navbar {
          position: fixed;
          top: 40px;
          left: 0;
          right: 0;
          z-index: 100;
          padding: 0 var(--space-md);
          background: rgba(255, 255, 255, 0.94);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border-bottom: 1.5px solid rgba(226, 232, 240, 0.85);
          box-shadow: 0 4px 20px rgba(15, 23, 42, 0.04);
          transition: all var(--transition-normal);
        }
        .navbar--scrolled {
          top: 0;
          background: rgba(255, 255, 255, 0.97);
          box-shadow: 0 8px 25px rgba(15, 23, 42, 0.08), 0 0 15px rgba(37, 99, 235, 0.05);
          border-bottom-color: rgba(30, 58, 138, 0.3);
        }
        .navbar__inner {
          max-width: 1240px;
          margin: 0 auto;
          height: 74px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: var(--space-md);
        }
        .navbar__gov-brand {
          display: flex;
          align-items: center;
          gap: 12px;
          text-decoration: none;
          transition: transform 0.2s ease;
        }
        .navbar__gov-brand:hover {
          transform: translateY(-1px);
        }
        .navbar__brand-text-container {
          display: flex;
          flex-direction: column;
          line-height: 1.15;
          text-align: left;
        }
        .navbar__gov-org-hi {
          font-family: 'Noto Sans Devanagari', sans-serif;
          font-size: 0.95rem;
          font-weight: 900;
          color: #0f172a;
          letter-spacing: 0.01em;
        }
        .navbar__gov-org-en {
          font-family: var(--font-heading);
          font-size: 0.78rem;
          font-weight: 800;
          color: #1e3a8a;
          letter-spacing: 0.04em;
        }
        .navbar__gov-sub {
          font-size: 0.7rem;
          color: #64748b;
          margin-top: 1px;
        }
        .navbar__gov-sub strong {
          color: #2563eb;
        }
        
        .gov-search-trigger-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          background: #f8fafc;
          border: 1px solid var(--border-primary);
          border-radius: var(--radius-full);
          font-size: 0.84rem;
          color: #334155;
          font-weight: 600;
          transition: all 0.25s ease;
          cursor: pointer;
        }
        .gov-search-trigger-btn:hover {
          background: #ffffff;
          border-color: #2563eb;
          color: #1d4ed8;
          box-shadow: 0 4px 14px rgba(37, 99, 235, 0.18), 0 0 0 2px rgba(37, 99, 235, 0.1);
          transform: translateY(-1px);
        }

        .navbar__links {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .navbar__link {
          padding: 8px 16px;
          border-radius: var(--radius-md);
          font-size: 0.9rem;
          font-weight: 600;
          color: #334155;
          transition: all var(--transition-fast);
          position: relative;
        }
        .navbar__link:hover {
          color: #1e3a8a;
          background: rgba(37, 99, 235, 0.05);
          transform: translateY(-1px);
        }
        .navbar__link--active {
          color: #1d4ed8;
          background: rgba(37, 99, 235, 0.08);
          border-bottom: 2px solid #2563eb;
          font-weight: 700;
        }

        .navbar__right {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .navbar__user {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .navbar__user-info {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          line-height: 1.2;
        }
        .navbar__user-name {
          font-size: 0.88rem;
          font-weight: 700;
          color: #0f172a;
        }
        .navbar__user-role {
          font-size: 0.72rem;
          color: #2563eb;
          font-weight: 600;
        }
        .navbar__auth-buttons {
          display: flex;
          gap: 8px;
          align-items: center;
        }
        .navbar__mobile-toggle {
          display: none;
          background: transparent;
          color: #0f172a;
          padding: 6px;
          border-radius: 6px;
        }
        .navbar__mobile-menu {
          position: absolute;
          top: 74px;
          left: 0;
          right: 0;
          background: #ffffff;
          border-bottom: 2px solid #1e3a8a;
          padding: var(--space-lg);
          display: flex;
          flex-direction: column;
          gap: 8px;
          box-shadow: 0 12px 30px rgba(15, 23, 42, 0.15);
        }
        .navbar__mobile-link {
          padding: 12px 16px;
          border-radius: var(--radius-sm);
          color: #334155;
          font-weight: 600;
          font-size: 0.95rem;
        }
        .navbar__mobile-link:hover,
        .navbar__mobile-link--active {
          background: #f1f5f9;
          color: #1d4ed8;
          font-weight: 700;
        }
        .navbar__mobile-auth-group {
          margin-top: var(--space-md);
          padding-top: var(--space-md);
          border-top: 1px solid var(--border-primary);
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        @media (max-width: 992px) {
          .gov-top-bar { display: none; }
          .navbar { top: 4px; }
          .navbar__mobile-toggle { display: block; }
          .navbar__links { display: none !important; }
          .navbar__quick-actions { display: none !important; }
          .navbar__auth-buttons { display: none; }
        }
      `}</style>
    </>
  );
};

export default Navbar;
