import { useState, useEffect } from 'react';

const AnimatedEmblem = ({ size = 48, showText = false, titleHindi = "भारत सरकार", titleEng = "Government of India" }) => {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setLoaded(true), 50);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className={`gov-emblem-wrapper ${loaded ? 'gov-emblem-loaded' : ''}`}>
      <div className="gov-emblem-container" style={{ width: size + 8, height: size + 8 }}>
        <div className="gov-emblem-aura" />
        <img 
          src="/emblem.png" 
          alt="State Emblem of India - Satyameva Jayate" 
          className="gov-emblem-image"
          style={{ width: size, height: size }}
          onLoad={() => setLoaded(true)}
        />
      </div>
      {showText && (
        <div className="gov-emblem-text-group">
          <span className="gov-emblem-hindi">{titleHindi}</span>
          <span className="gov-emblem-english">{titleEng}</span>
          <span className="gov-emblem-motto">सत्यमेव जयते</span>
        </div>
      )}

      <style>{`
        .gov-emblem-wrapper {
          display: inline-flex;
          align-items: center;
          gap: 14px;
          opacity: 0;
          transform: translateY(2px);
          transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1);
          cursor: pointer;
        }
        .gov-emblem-loaded {
          opacity: 1;
          transform: translateY(0);
        }
        .gov-emblem-container {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #ffffff;
          border-radius: 10px;
          box-shadow: 0 2px 10px rgba(15, 23, 42, 0.08), 0 0 0 1px rgba(37, 99, 235, 0.12);
          transition: all 0.35s ease;
        }
        .gov-emblem-wrapper:hover .gov-emblem-container {
          transform: translateY(-2px) scale(1.04);
          box-shadow: 0 8px 25px rgba(37, 99, 235, 0.18), 0 0 0 1.5px rgba(37, 99, 235, 0.35);
        }
        .gov-emblem-aura {
          position: absolute;
          inset: -4px;
          border-radius: 12px;
          background: radial-gradient(circle, rgba(56, 189, 248, 0.3) 0%, rgba(37, 99, 235, 0.2) 60%, transparent 85%);
          filter: blur(6px);
          opacity: 0.6;
          animation: auraPulse 4s ease-in-out infinite alternate;
          pointer-events: none;
        }
        .gov-emblem-image {
          position: relative;
          z-index: 2;
          object-fit: contain;
          display: block;
          filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.15));
          transition: transform 0.35s ease;
        }
        .gov-emblem-wrapper:hover .gov-emblem-image {
          filter: drop-shadow(0 3px 6px rgba(37, 99, 235, 0.25));
        }
        .gov-emblem-text-group {
          display: flex;
          flex-direction: column;
          line-height: 1.25;
          text-align: left;
        }
        .gov-emblem-hindi {
          font-family: 'Noto Sans Devanagari', 'Inter', sans-serif;
          font-size: 0.98rem;
          font-weight: 800;
          color: #0f172a;
          letter-spacing: 0.01em;
          transition: color 0.2s ease;
        }
        .gov-emblem-wrapper:hover .gov-emblem-hindi {
          color: #1d4ed8;
        }
        .gov-emblem-english {
          font-size: 0.8rem;
          font-weight: 700;
          color: #1e3a8a;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .gov-emblem-motto {
          font-family: 'Noto Sans Devanagari', 'Inter', sans-serif;
          font-size: 0.68rem;
          color: #64748b;
          font-weight: 600;
          letter-spacing: 0.02em;
        }

        @keyframes auraPulse {
          0% { opacity: 0.4; transform: scale(0.95); }
          100% { opacity: 0.85; transform: scale(1.08); }
        }
      `}</style>
    </div>
  );
};

export default AnimatedEmblem;
