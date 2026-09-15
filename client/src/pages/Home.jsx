import { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  HiOutlineShieldCheck, 
  HiOutlineFingerPrint, 
  HiOutlineCube, 
  HiOutlineChartBar, 
  HiOutlineLockClosed, 
  HiOutlineGlobe, 
  HiOutlineUserGroup, 
  HiOutlineClipboardList, 
  HiOutlineExternalLink,
  HiOutlineSearch,
  HiOutlineDocumentText,
  HiOutlineIdentification,
  HiOutlineLocationMarker,
  HiOutlinePhone,
  HiOutlineSparkles,
  HiOutlineHeart,
  HiOutlineDownload
} from 'react-icons/hi';
import AnimatedEmblem from '../components/AnimatedEmblem';
import VoterSearchModal from '../components/VoterSearchModal';

const Home = () => {
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [modalDefaultTab, setModalDefaultTab] = useState('search');

  const openSearch = (tab = 'search') => {
    setModalDefaultTab(tab);
    setSearchModalOpen(true);
  };

  // ECI Official Forms Directory (Voters' Service Portal Standard)
  const voterForms = [
    {
      formNo: 'Form 6',
      title: 'New Voter Registration',
      titleHi: 'नए मतदाता के रूप में पंजीकरण',
      desc: 'Application for first-time electors (18+) or shifting from other constituency.',
      link: '/register',
      tag: 'Most Popular',
      color: '#1d4ed8'
    },
    {
      formNo: 'Form 6A',
      title: 'Overseas Elector Registration',
      titleHi: 'प्रवासी निर्वाचक के रूप में पंजीकरण',
      desc: 'Application for Indian citizens residing outside India to enroll in electoral roll.',
      link: '/register',
      tag: 'NRI Electors',
      color: '#0284c7'
    },
    {
      formNo: 'Form 7',
      title: 'Objection / Deletion in Roll',
      titleHi: 'मतदाता सूची में नाम हटाने हेतु आवेदन',
      desc: 'Objection to proposed inclusion or deletion of existing name from electoral roll.',
      link: '/register',
      tag: 'Corrections',
      color: '#d97706'
    },
    {
      formNo: 'Form 8',
      title: 'Correction & Shifting of Residence',
      titleHi: 'निवास परिवर्तन / प्रविष्टियों में सुधार',
      desc: 'Correction of particulars (Name, Photo, DOB, Address, Mobile) in electoral record.',
      link: '/register',
      tag: 'Updates',
      color: '#059669'
    }
  ];

  // Citizen Quick Services Grid
  const quickServices = [
    {
      icon: <HiOutlineSearch size={26} />,
      title: 'Search in Electoral Roll',
      titleHi: 'मतदाता सूची में नाम खोजें',
      desc: 'Verify your name, polling station, and serial number in the active roll.',
      action: () => openSearch('search')
    },
    {
      icon: <HiOutlineDownload size={26} />,
      title: 'Download Digital e-EPIC',
      titleHi: 'ई-ईपिक कार्ड डाउनलोड करें',
      desc: 'Secure cryptographic digital voter identity card with QR signature.',
      action: () => openSearch('search')
    },
    {
      icon: <HiOutlineClipboardList size={26} />,
      title: 'Track Application Status',
      titleHi: 'आवेदन की स्थिति जानें',
      desc: 'Real-time tracking of Form 6 / 8 submission via Reference ID.',
      action: () => openSearch('track')
    },
    {
      icon: <HiOutlineLocationMarker size={26} />,
      title: 'Know Polling Station & BLO',
      titleHi: 'मतदान केंद्र व बीएलओ की जानकारी',
      desc: 'Locate designated Booth Level Officer, Electoral Registration Officer & Polling Booth.',
      action: () => openSearch('search')
    }
  ];

  const fourPillars = [
    {
      icon: <HiOutlineCube size={28} />,
      title: 'Blockchain Immutability',
      desc: 'Ballot tallies and transactions are cryptographically sealed on an Ethereum smart contract ledger.'
    },
    {
      icon: <HiOutlineFingerPrint size={28} />,
      title: 'AI Face Liveness Verification',
      desc: 'Neural vision checks 128-D facial embeddings and micro-blinks to prevent synthetic spoofing.'
    },
    {
      icon: <HiOutlineShieldCheck size={28} />,
      title: 'Aadhaar Identity Integrity',
      desc: 'Guarantees the Constitutional principle of one-person-one-vote via SHA-256 validation.'
    },
    {
      icon: <HiOutlineLockClosed size={28} />,
      title: 'End-to-End Zero-Knowledge',
      desc: 'Voter ballot choices remain mathematically secret and anonymous through zk-SNARKs.'
    }
  ];

  return (
    <div className="gov-home-page" id="main-content">
      {/* ═══ OFFICIAL GAZETTE & PRESS MARQUEE ═══ */}
      <div className="gov-news-ticker">
        <div className="gov-news-ticker__label">
          <span>आधिकारिक सूचना / OFFICIAL PRESS NOTE</span>
        </div>
        <div className="gov-news-ticker__marquee">
          <div className="gov-news-ticker__content">
            <span>📢 Special Summary Revision of Electoral Roll 2026: Qualifying date 01-01-2026. Enroll now using Form 6.</span>
            <span>🔒 All electors are requested to link their verified mobile number for biometric e-voting enablement.</span>
            <span>⚡ Decentralized Autonomous Voting Prototype active under academic pilot demonstration.</span>
            <span>📢 Special Summary Revision of Electoral Roll 2026: Qualifying date 01-01-2026. Enroll now using Form 6.</span>
            <span>🔒 All electors are requested to link their verified mobile number for biometric e-voting enablement.</span>
          </div>
        </div>
      </div>

      {/* ═══ SOVEREIGN HERO SECTION ═══ */}
      <section className="gov-hero">
        <div className="page-container gov-hero__inner">
          <div className="gov-hero__content">
            {/* National Emblem & Title Group */}
            <div className="flex items-center gap-md mb-md flex-wrap">
              <AnimatedEmblem size={56} />
              <div>
                <div className="gov-hero__sub-title">
                  भारत सरकार • निर्वाचन आयोग
                </div>
                <h1 className="gov-hero__org-title">
                  ELECTION COMMISSION OF INDIA
                </h1>
                <div className="gov-hero__portal-tag">
                  National Voters’ Service Portal • EtherBallot Decentralized Platform
                </div>
              </div>
            </div>

            <h2 className="gov-hero__main-heading">
              Sovereign Digital Electoral Roll & <br />
              <span className="gov-hero__highlight shimmer-text">Voting Infrastructure</span>
            </h2>

            <p className="gov-hero__description">
              Welcome to the official decentralized voting and electoral services portal. 
              Empowering every Indian citizen with self-sovereign identity, biometric face liveness authentication, 
              and immutable smart contract vote tabulation.
            </p>

            {/* Quick Hero Actions */}
            <div className="gov-hero__cta-group">
              <Link to="/register" className="btn btn-primary btn-lg card-interactive">
                📝 Register as New Voter (Form 6)
              </Link>
              <button onClick={() => openSearch('search')} className="btn btn-secondary btn-lg card-interactive">
                🔍 Search in Electoral Roll / e-EPIC
              </button>
              <Link to="/login" className="btn btn-ghost btn-lg card-interactive">
                🔐 Voter Sign In
              </Link>
            </div>

            {/* Sovereign Credential Badges */}
            <div className="gov-hero__badges-row">
              <div className="gov-cred-badge shimmer-badge">
                <HiOutlineShieldCheck style={{ color: '#059669' }} />
                <span>Constitutional Integrity</span>
              </div>
              <div className="gov-cred-badge shimmer-badge">
                <HiOutlineLockClosed style={{ color: '#2563eb' }} />
                <span>zk-SNARKs Anonymity</span>
              </div>
              <div className="gov-cred-badge shimmer-badge">
                <HiOutlineFingerPrint style={{ color: '#d97706' }} />
                <span>AI Face Liveness</span>
              </div>
              <div className="gov-cred-badge shimmer-badge">
                <HiOutlineGlobe style={{ color: '#0284c7' }} />
                <span>24x7 Digital Access</span>
              </div>
            </div>
          </div>

          {/* Right Hero Widget: Quick Search Box (Like ECI Portal) */}
          <div className="gov-hero__quick-card border-gradient-glow card-interactive">
            <div className="gov-quick-card__header">
              <div className="flex items-center gap-xs">
                <AnimatedEmblem size={24} />
                <span className="gov-quick-card__title">Quick Electoral Roll Lookup</span>
              </div>
              <span className="badge badge--success shimmer-badge flex items-center gap-xs">
                <span className="radar-pulse-container" style={{ width: 8, height: 8, marginRight: 2 }}>
                  <span className="radar-pulse-dot" style={{ width: 6, height: 6 }} />
                  <span className="radar-pulse-wave" />
                </span>
                LIVE ROLL
              </span>
            </div>

            <div className="gov-quick-card__body">
              <p style={{ fontSize: '0.84rem', color: '#475569', marginBottom: 'var(--space-md)' }}>
                Instant verification of citizen enrollment status, polling station location, and e-EPIC generation.
              </p>

              <button 
                className="btn btn-primary btn-block mb-sm card-interactive"
                onClick={() => openSearch('search')}
              >
                <HiOutlineSearch /> Search by EPIC / Aadhaar No.
              </button>

              <button 
                className="btn btn-secondary btn-block mb-md card-interactive"
                onClick={() => openSearch('track')}
              >
                <HiOutlineClipboardList /> Track Form Reference ID
              </button>

              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 10, fontSize: '0.78rem', color: '#64748b' }}>
                💡 Need assistance? Call National Voter Helpline <strong>1950</strong> (Toll-Free).
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ VOTER SERVICES DIRECTORY (ECI SINGLE WINDOW) ═══ */}
      <section className="section" style={{ background: '#ffffff', borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0' }}>
        <div className="page-container">
          <div className="section__header" style={{ textAlign: 'left', marginBottom: 'var(--space-xl)' }}>
            <div className="badge badge--primary mb-xs">
              <HiOutlineIdentification /> Voter Services Directory
            </div>
            <h2 className="section__title" style={{ fontSize: '1.85rem' }}>
              National Voter Portal Services (मतदाता सेवा पोर्टल)
            </h2>
            <p className="section__subtitle" style={{ margin: 0 }}>
              Single window access for electoral registration, modifications, digital e-EPIC, and grievance redressal.
            </p>
          </div>

          {/* 4 Quick Action Cards */}
          <div className="grid grid-4 mb-2xl">
            {quickServices.map((qs, i) => (
              <div 
                key={i} 
                className="glass-card gov-service-card"
                onClick={qs.action}
              >
                <div className="gov-service-card__icon">
                  {qs.icon}
                </div>
                <h3 className="gov-service-card__title">{qs.title}</h3>
                <div className="gov-service-card__title-hi">{qs.titleHi}</div>
                <p className="gov-service-card__desc">{qs.desc}</p>
                <span className="gov-service-card__link">Access Service →</span>
              </div>
            ))}
          </div>

          {/* Forms 6, 6A, 7, 8 Directory Grid */}
          <div className="section__header" style={{ textAlign: 'left', marginBottom: 'var(--space-md)' }}>
            <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a' }}>
              Electoral Registration Forms (मतदाता पंजीकरण प्रपत्र)
            </h3>
          </div>

          <div className="grid grid-4">
            {voterForms.map((f, i) => (
              <div key={i} className="glass-card gov-form-card">
                <div className="flex justify-between items-center mb-xs">
                  <span className="gov-form-card__num" style={{ color: f.color }}>{f.formNo}</span>
                  <span className="badge badge--primary" style={{ fontSize: '0.68rem' }}>{f.tag}</span>
                </div>
                <h4 className="gov-form-card__title">{f.title}</h4>
                <div className="gov-form-card__title-hi">{f.titleHi}</div>
                <p className="gov-form-card__desc">{f.desc}</p>
                <Link to={f.link} className="btn btn-secondary btn-sm btn-block mt-md">
                  Fill {f.formNo} Online →
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ SVEEP & ETHICAL VOTING PLEDGE (GOV HIGHLIGHT) ═══ */}
      <section className="section" style={{ background: '#f8fafc' }}>
        <div className="page-container">
          <div className="gov-sveep-banner glass-card glass-card--no-hover">
            <div className="gov-sveep-banner__content">
              <div className="badge badge--warning mb-sm">
                <HiOutlineHeart /> SVEEP Initiative • मतदानाचा हक्क
              </div>
              <h2 style={{ fontSize: '1.8rem', fontWeight: 900, color: '#0f172a', marginBottom: 'var(--space-xs)' }}>
                "No Voter to be Left Behind" • कोई भी मतदाता न छूटे
              </h2>
              <p style={{ color: '#475569', fontSize: '0.95rem', lineHeight: 1.6, maxWidth: 720 }}>
                Systematic Voters’ Education and Electoral Participation (SVEEP) is the flagship program of the Election Commission of India for voter education, spreading voter awareness, and promoting voter literacy across the nation.
              </p>
              <div className="flex gap-md mt-lg flex-wrap">
                <Link to="/vote" className="btn btn-primary">
                  🗳️ Participate in Active Ballot
                </Link>
                <Link to="/results" className="btn btn-secondary">
                  📊 View Verified Election Audits
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ CRYPTOGRAPHIC ARCHITECTURE ═══ */}
      <section className="section" style={{ background: '#ffffff', borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0' }}>
        <div className="page-container">
          <div className="section__header">
            <div className="badge badge--primary mb-xs">Technology & Sovereign Trust</div>
            <h2 className="section__title">Decentralized Autonomous Architecture</h2>
            <p className="section__subtitle">
              Engineered with zero-trust cryptographic verification, biometric machine learning, and transparent audit trails.
            </p>
          </div>

          <div className="grid grid-4">
            {fourPillars.map((p, i) => (
              <div key={i} className="feature-card glass-card">
                <div className="feature-card__icon stat-card__icon--primary">
                  {p.icon}
                </div>
                <h3 className="feature-card__title">{p.title}</h3>
                <p className="feature-card__desc">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ VERIFIED CITIZEN SERVICES & WELFARE DIRECTORY ═══ */}
      <section className="section" style={{ background: '#f8fafc' }}>
        <div className="page-container">
          <div className="section__header" style={{ textAlign: 'left', marginBottom: 'var(--space-xl)' }}>
            <div className="badge badge--info mb-xs">
              <HiOutlineGlobe /> Sovereign Portal Interoperability
            </div>
            <h2 className="section__title" style={{ fontSize: '1.85rem' }}>
              Citizen Welfare & Public Data Directory
            </h2>
            <p className="section__subtitle" style={{ margin: 0 }}>
              Direct access to open government portals, citizen registries, and public welfare schemes.
            </p>
          </div>

          <div className="grid grid-3">
            {[
              {
                title: 'National Portal of India (india.gov.in)',
                desc: 'Single-entry window to all information and services provided by the Indian Government.',
                ministry: 'National Informatics Centre',
                url: 'https://www.india.gov.in'
              },
              {
                title: 'Digital India Mission (digitalindia.gov.in)',
                desc: 'Flagship programme to transform India into a digitally empowered society and knowledge economy.',
                ministry: 'Ministry of Electronics & IT',
                url: 'https://digitalindia.gov.in'
              },
              {
                title: 'Unique Identification Authority (UIDAI)',
                desc: 'Aadhaar identity verification and secure authentication infrastructure for residents.',
                ministry: 'Government of India',
                url: 'https://uidai.gov.in'
              },
              {
                title: 'Postal Life Insurance by India Post',
                desc: 'Online application access for citizen life insurance and financial security plans.',
                ministry: 'Ministry of Communications',
                url: 'https://www.india.gov.in/services/details/apply-for-postal-life-insurance-by-india-post'
              },
              {
                title: 'National Social Assistance Programme (NSAP)',
                desc: 'Open datasets regarding verified national beneficiary allocations and welfare disbursements.',
                ministry: 'Ministry of Rural Development',
                url: 'https://data.gov.in/catalog/national-social-assistance-programmensap-beneficiaries-abstract'
              },
              {
                title: 'National Open Data Portal (data.gov.in)',
                desc: 'Platform for supporting open data initiative of Government of India.',
                ministry: 'NIC / MeitY',
                url: 'https://data.gov.in'
              }
            ].map((service, idx) => (
              <div 
                key={idx} 
                className="glass-card gov-external-card"
                onClick={() => window.open(service.url, '_blank')}
              >
                <div className="gov-external-card__ministry">
                  {service.ministry}
                </div>
                <h3 className="gov-external-card__title">
                  {service.title}
                </h3>
                <p className="gov-external-card__desc">
                  {service.desc}
                </p>
                <div className="gov-external-card__link">
                  <span>Visit Official Portal</span>
                  <HiOutlineExternalLink size={15} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Modal */}
      <VoterSearchModal
        isOpen={searchModalOpen}
        onClose={() => setSearchModalOpen(false)}
        defaultTab={modalDefaultTab}
      />

      <style>{`
        /* ─── Gazette Ticker ─── */
        .gov-news-ticker {
          background: #ffffff;
          border-bottom: 1px solid #e2e8f0;
          display: flex;
          align-items: center;
          height: 38px;
          overflow: hidden;
          font-size: 0.8rem;
          box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
        }
        .gov-news-ticker__label {
          background: #1e3a8a;
          color: #ffffff;
          font-weight: 800;
          font-size: 0.72rem;
          letter-spacing: 0.05em;
          padding: 0 16px;
          height: 100%;
          display: flex;
          align-items: center;
          white-space: nowrap;
          z-index: 2;
        }
        .gov-news-ticker__marquee {
          overflow: hidden;
          white-space: nowrap;
          width: 100%;
        }
        .gov-news-ticker__content {
          display: inline-flex;
          gap: 36px;
          animation: marquee 35s linear infinite;
          color: #334155;
        }
        .gov-news-ticker__content span {
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }

        /* ─── Sovereign Hero ─── */
        .gov-hero {
          background: linear-gradient(180deg, #f8fafc 0%, #ffffff 100%);
          padding: var(--space-2xl) 0;
          border-bottom: 1px solid #e2e8f0;
        }
        .gov-hero__inner {
          display: grid;
          grid-template-columns: 1.35fr 0.85fr;
          gap: var(--space-2xl);
          align-items: center;
        }
        .gov-hero__sub-title {
          font-family: 'Noto Sans Devanagari', sans-serif;
          font-size: 0.85rem;
          font-weight: 700;
          color: #ff9933;
        }
        .gov-hero__org-title {
          font-family: var(--font-heading);
          font-size: 1.4rem;
          font-weight: 900;
          color: #1e3a8a;
          letter-spacing: 0.04em;
          margin: 0;
        }
        .gov-hero__portal-tag {
          font-size: 0.76rem;
          color: #64748b;
          font-weight: 600;
        }
        .gov-hero__main-heading {
          font-family: var(--font-heading);
          font-size: 2.5rem;
          font-weight: 900;
          line-height: 1.2;
          color: #0f172a;
          margin: var(--space-md) 0;
          letter-spacing: -0.02em;
        }
        .gov-hero__highlight {
          color: #2563eb;
        }
        .gov-hero__description {
          font-size: 1.02rem;
          color: #475569;
          line-height: 1.65;
          margin-bottom: var(--space-xl);
          max-width: 680px;
        }
        .gov-hero__cta-group {
          display: flex;
          gap: var(--space-md);
          flex-wrap: wrap;
          margin-bottom: var(--space-xl);
        }
        .gov-hero__badges-row {
          display: flex;
          gap: 16px;
          flex-wrap: wrap;
        }
        .gov-cred-badge {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.8rem;
          color: #334155;
          font-weight: 600;
          background: #f1f5f9;
          padding: 5px 12px;
          border-radius: var(--radius-full);
          border: 1px solid var(--border-primary);
        }

        /* ─── Hero Quick Card ─── */
        .gov-hero__quick-card {
          background: #ffffff;
          border: 2px solid #1e3a8a;
          border-radius: var(--radius-lg);
          box-shadow: 0 8px 30px rgba(15, 23, 42, 0.08);
          overflow: hidden;
        }
        .gov-quick-card__header {
          background: #1e3a8a;
          color: #ffffff;
          padding: 12px 18px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .gov-quick-card__title {
          font-weight: 700;
          font-size: 0.9rem;
          color: #ffffff;
        }
        .gov-quick-card__body {
          padding: var(--space-lg);
          background: #ffffff;
        }

        /* ─── Voter Service Cards ─── */
        .gov-service-card {
          padding: var(--space-lg);
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          cursor: pointer;
          border-top: 3px solid #1e3a8a;
          background: #ffffff;
        }
        .gov-service-card__icon {
          width: 48px;
          height: 48px;
          border-radius: var(--radius-md);
          background: rgba(37, 99, 235, 0.08);
          color: #1d4ed8;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: var(--space-sm);
        }
        .gov-service-card__title {
          font-size: 1.05rem;
          font-weight: 800;
          color: #0f172a;
          margin-bottom: 2px;
        }
        .gov-service-card__title-hi {
          font-family: 'Noto Sans Devanagari', sans-serif;
          font-size: 0.78rem;
          color: #64748b;
          margin-bottom: var(--space-xs);
        }
        .gov-service-card__desc {
          font-size: 0.85rem;
          color: #475569;
          line-height: 1.5;
          flex: 1;
          margin-bottom: var(--space-md);
        }
        .gov-service-card__link {
          font-size: 0.84rem;
          font-weight: 700;
          color: #2563eb;
        }

        /* ─── Forms Cards ─── */
        .gov-form-card {
          padding: var(--space-lg);
          display: flex;
          flex-direction: column;
          background: #ffffff;
          border: 1px solid var(--border-primary);
        }
        .gov-form-card__num {
          font-family: var(--font-display);
          font-size: 1.2rem;
          font-weight: 900;
        }
        .gov-form-card__title {
          font-size: 1rem;
          font-weight: 800;
          color: #0f172a;
          margin-bottom: 2px;
        }
        .gov-form-card__title-hi {
          font-family: 'Noto Sans Devanagari', sans-serif;
          font-size: 0.78rem;
          color: #64748b;
          margin-bottom: var(--space-xs);
        }
        .gov-form-card__desc {
          font-size: 0.84rem;
          color: #475569;
          line-height: 1.5;
          flex: 1;
        }

        /* ─── SVEEP Banner ─── */
        .gov-sveep-banner {
          background: linear-gradient(135deg, rgba(255, 153, 51, 0.08) 0%, rgba(255, 255, 255, 0.95) 50%, rgba(19, 136, 8, 0.08) 100%);
          border: 2px solid #cbd5e1;
          padding: var(--space-2xl);
        }

        /* ─── External Welfare Card ─── */
        .gov-external-card {
          border-top: 3px solid #0284c7;
          display: flex;
          flex-direction: column;
          cursor: pointer;
          background: #ffffff;
          padding: var(--space-lg);
        }
        .gov-external-card__ministry {
          font-size: 0.72rem;
          font-weight: 700;
          color: #0284c7;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          margin-bottom: var(--space-xs);
        }
        .gov-external-card__title {
          font-size: 1.02rem;
          font-weight: 800;
          color: #0f172a;
          margin-bottom: var(--space-xs);
        }
        .gov-external-card__desc {
          font-size: 0.85rem;
          color: #475569;
          line-height: 1.5;
          flex: 1;
          margin-bottom: var(--space-md);
        }
        .gov-external-card__link {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.84rem;
          font-weight: 700;
          color: #0284c7;
        }

        @media (max-width: 992px) {
          .gov-hero__inner { grid-template-columns: 1fr; }
          .gov-hero__main-heading { font-size: 2.1rem; }
        }
      `}</style>
    </div>
  );
};

export default Home;
