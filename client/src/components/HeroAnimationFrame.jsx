import { useEffect, useRef } from 'react';

const RING_COUNT = 5;

export default function HeroAnimationFrame() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let raf;
    let W = 0, H = 0;
    const particles = Array.from({ length: 42 }, () => ({
      x: Math.random(), y: Math.random(),
      r: 1.4 + Math.random() * 2.0,
      vx: (Math.random() - 0.5) * 0.00028,
      vy: (Math.random() - 0.5) * 0.00028,
      a: 0.15 + Math.random() * 0.45,
    }));
    const resize = () => {
      W = canvas.offsetWidth; H = canvas.offsetHeight;
      canvas.width = W; canvas.height = H;
    };
    resize();
    window.addEventListener('resize', resize);
    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      particles.forEach(p => {
        p.x = (p.x + p.vx + 1) % 1;
        p.y = (p.y + p.vy + 1) % 1;
        ctx.beginPath();
        ctx.arc(p.x * W, p.y * H, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(56,189,248,${p.a})`;
        ctx.fill();
      });
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, []);

  const nodes = [[430,180],[620,210],[740,160],[800,290],[680,360],[540,340]];
  const lines = [
    [430,180,620,210],[620,210,740,160],[740,160,800,290],
    [800,290,680,360],[680,360,540,340],[540,340,430,180],
    [620,210,630,255],[630,255,680,360],
  ];

  return (
    <section className="haf" aria-label="EtherBallot hero">
      <canvas ref={canvasRef} className="haf__canvas" aria-hidden="true" />
      <div className="haf__rings" aria-hidden="true">
        {Array.from({ length: RING_COUNT }).map((_, i) => (
          <div key={i} className="haf__ring" style={{ animationDelay: `${i * 0.9}s` }} />
        ))}
      </div>
      <div className="haf__frame">
        <svg className="haf__svg" viewBox="0 0 900 540" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
          <defs>
            <radialGradient id="hG1" cx="50%" cy="40%" r="60%">
              <stop offset="0%" stopColor="#bae6fd" stopOpacity="0.9"/>
              <stop offset="60%" stopColor="#38bdf8" stopOpacity="0.5"/>
              <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0"/>
            </radialGradient>
            <radialGradient id="hG2" cx="50%" cy="50%" r="60%">
              <stop offset="0%" stopColor="#e0f2fe" stopOpacity="0.95"/>
              <stop offset="70%" stopColor="#7dd3fc" stopOpacity="0.4"/>
              <stop offset="100%" stopColor="#38bdf8" stopOpacity="0"/>
            </radialGradient>
            <radialGradient id="hG3" cx="50%" cy="50%" r="60%">
              <stop offset="0%" stopColor="#2563eb" stopOpacity="0.75"/>
              <stop offset="100%" stopColor="#38bdf8" stopOpacity="0"/>
            </radialGradient>
            <filter id="hB1"><feGaussianBlur stdDeviation="20"/></filter>
            <filter id="hB2"><feGaussianBlur stdDeviation="9"/></filter>
          </defs>
          <ellipse className="haf__blob haf__blob--1" cx="625" cy="268" rx="205" ry="198" fill="url(#hG1)" filter="url(#hB1)"/>
          <ellipse className="haf__blob haf__blob--2" cx="682" cy="312" rx="132" ry="118" fill="url(#hG2)" filter="url(#hB1)"/>
          <ellipse className="haf__blob haf__blob--3" cx="632" cy="255" rx="72" ry="66" fill="url(#hG3)" filter="url(#hB2)"/>
          {lines.map(([x1,y1,x2,y2], i) => (
            <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
              stroke="rgba(56,189,248,0.28)" strokeWidth="1.2"
              className="haf__line" style={{ animationDelay: `${i * 0.3}s` }} />
          ))}
          {nodes.map(([cx,cy], i) => (
            <circle key={i} cx={cx} cy={cy} r="5"
              fill="rgba(56,189,248,0.65)" className="haf__node"
              style={{ animationDelay: `${i * 0.25}s` }} />
          ))}
          <g className="haf__arm haf__arm--l">
            <rect x="130" y="185" width="18" height="92" rx="9" fill="rgba(148,163,184,0.5)"/>
            <rect x="124" y="269" width="30" height="12" rx="6" fill="rgba(100,116,139,0.6)"/>
            <rect x="134" y="155" width="10" height="36" rx="5" fill="rgba(148,163,184,0.42)"/>
            <circle cx="139" cy="153" r="10" fill="rgba(56,189,248,0.52)"/>
            <line x1="148" y1="153" x2="175" y2="140" stroke="rgba(148,163,184,0.5)" strokeWidth="3" strokeLinecap="round"/>
            <line x1="148" y1="153" x2="172" y2="165" stroke="rgba(148,163,184,0.5)" strokeWidth="3" strokeLinecap="round"/>
            <line x1="148" y1="153" x2="180" y2="153" stroke="rgba(148,163,184,0.5)" strokeWidth="3" strokeLinecap="round"/>
          </g>
          <g className="haf__arm haf__arm--r">
            <rect x="737" y="232" width="18" height="80" rx="9" fill="rgba(148,163,184,0.5)"/>
            <rect x="731" y="304" width="30" height="12" rx="6" fill="rgba(100,116,139,0.6)"/>
            <rect x="741" y="207" width="10" height="30" rx="5" fill="rgba(148,163,184,0.42)"/>
            <circle cx="746" cy="206" r="9" fill="rgba(37,99,235,0.52)"/>
            <line x1="737" y1="206" x2="710" y2="193" stroke="rgba(148,163,184,0.5)" strokeWidth="3" strokeLinecap="round"/>
            <line x1="737" y1="206" x2="712" y2="218" stroke="rgba(148,163,184,0.5)" strokeWidth="3" strokeLinecap="round"/>
            <line x1="737" y1="206" x2="705" y2="206" stroke="rgba(148,163,184,0.5)" strokeWidth="3" strokeLinecap="round"/>
          </g>
        </svg>
        <nav className="haf__nav">
          <span className="haf__brand">⬡ EtherBallot</span>
          <div className="haf__nav-links">
            <a href="/" className="haf__link haf__link--on">Home</a>
            <a href="/voter-card" className="haf__link">Voter ID Card</a>
            <a href="/qr-scanner" className="haf__link">QR Scanner</a>
            <a href="/register" className="haf__link">Register</a>
            <a href="/login" className="haf__link">Login</a>
            <a href="/results" className="haf__link">Results</a>
          </div>
          <a href="/register" className="haf__cta">Get Voter ID <span aria-hidden="true">→</span></a>
        </nav>
        <div className="haf__body">
          <div className="haf__col">
            <p className="haf__label">About</p>
            <h1 className="haf__title">
              Decentralized<br />
              <span className="haf__accent">Blockchain Voting</span><br />
              Platform
            </h1>
            <p className="haf__label" style={{ marginTop: 28 }}>How It Works</p>
            <div className="haf__points">
              <div className="haf__point">
                <span className="haf__dot">.01</span>
                <p>EtherBallot stores every ballot on an Ethereum smart contract — tamper-proof, transparent, and permanently auditable by any citizen.</p>
              </div>
              <div className="haf__point" style={{ animationDelay: '0.18s' }}>
                <span className="haf__dot">.02</span>
                <p>Face-AI liveness detection &amp; Aadhaar-backed identity ensure one-person-one-vote with zero-knowledge privacy.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      <style>{`
.haf{position:relative;width:100%;min-height:100vh;background:linear-gradient(145deg,#dbeafe 0%,#bfdbfe 28%,#93c5fd 60%,#60a5fa 100%);overflow:hidden;display:flex;align-items:center;justify-content:center;padding:20px;box-sizing:border-box}
.haf__canvas{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:0}
.haf__rings{position:absolute;inset:0;display:flex;align-items:center;justify-content:flex-end;padding-right:5%;pointer-events:none;z-index:0}
.haf__ring{position:absolute;right:12%;border-radius:50%;border:1px solid rgba(255,255,255,0.22);animation:hafRing 8s ease-in-out infinite}
.haf__ring:nth-child(1){width:160px;height:160px}.haf__ring:nth-child(2){width:300px;height:300px}.haf__ring:nth-child(3){width:460px;height:460px}.haf__ring:nth-child(4){width:620px;height:620px}.haf__ring:nth-child(5){width:800px;height:800px}
@keyframes hafRing{0%,100%{opacity:.18;transform:scale(1)}50%{opacity:.38;transform:scale(1.04)}}
.haf__frame{position:relative;z-index:2;width:100%;max-width:1060px;min-height:540px;background:rgba(255,255,255,0.13);backdrop-filter:blur(28px);-webkit-backdrop-filter:blur(28px);border:1px solid rgba(255,255,255,0.4);border-radius:24px;box-shadow:0 8px 60px rgba(37,99,235,0.18),inset 0 1px 0 rgba(255,255,255,0.5);overflow:hidden;display:flex;flex-direction:column}
.haf__svg{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:0}
.haf__blob--1{animation:hb1 7s ease-in-out infinite}.haf__blob--2{animation:hb2 9s ease-in-out infinite}.haf__blob--3{animation:hb3 5.5s ease-in-out infinite}
@keyframes hb1{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(-16px,20px) scale(1.04)}}
@keyframes hb2{0%,100%{transform:translate(0,0)}50%{transform:translate(13px,-14px) scale(1.06)}}
@keyframes hb3{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(-7px,11px) scale(1.09)}}
.haf__line{animation:hLine 3.5s ease-in-out infinite}@keyframes hLine{0%,100%{opacity:.18}50%{opacity:.55}}
.haf__node{animation:hNode 2.5s ease-in-out infinite}@keyframes hNode{0%,100%{opacity:.6}50%{opacity:1}}
.haf__arm--l{animation:hArmL 7s ease-in-out infinite;transform-origin:139px 185px}@keyframes hArmL{0%,100%{transform:rotate(0deg) translateY(0)}50%{transform:rotate(-5deg) translateY(-6px)}}
.haf__arm--r{animation:hArmR 9s ease-in-out infinite;transform-origin:746px 232px}@keyframes hArmR{0%,100%{transform:rotate(0deg) translateY(0)}50%{transform:rotate(4deg) translateY(-5px)}}
.haf__nav{position:relative;z-index:3;display:flex;align-items:center;gap:10px;padding:18px 28px 0}
.haf__brand{font-size:.88rem;font-weight:700;color:rgba(255,255,255,.92);letter-spacing:.05em;margin-right:8px;white-space:nowrap}
.haf__nav-links{display:flex;gap:4px;flex:1;justify-content:center}
.haf__link{font-size:.82rem;color:rgba(255,255,255,.7);text-decoration:none;padding:6px 14px;border-radius:999px;transition:all .2s}
.haf__link:hover,.haf__link--on{background:rgba(255,255,255,.18);color:#fff}
.haf__cta{display:flex;align-items:center;gap:5px;font-size:.82rem;font-weight:700;color:#0f172a;background:rgba(255,255,255,.9);padding:8px 18px;border-radius:999px;text-decoration:none;box-shadow:0 2px 12px rgba(37,99,235,.18);transition:all .2s;white-space:nowrap}
.haf__cta:hover{background:#fff;transform:translateY(-1px);box-shadow:0 4px 20px rgba(37,99,235,.28)}
.haf__body{position:relative;z-index:3;flex:1;display:flex;align-items:flex-end;padding:20px 32px 36px}
.haf__col{max-width:460px}
.haf__label{font-size:.7rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:rgba(255,255,255,.5);margin:0 0 10px}
.haf__title{font-size:clamp(1.85rem,4vw,3.1rem);font-weight:800;color:#fff;line-height:1.12;margin:0 0 4px;text-shadow:0 2px 24px rgba(37,99,235,.3);animation:hTitle 1s ease both}
@keyframes hTitle{from{opacity:0;transform:translateY(28px)}to{opacity:1;transform:translateY(0)}}
.haf__accent{background:linear-gradient(90deg,#bae6fd,#60a5fa,#2563eb);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.haf__points{display:flex;gap:28px;flex-wrap:wrap;margin-top:8px}
.haf__point{max-width:210px;animation:hFade .9s ease both}.haf__point:last-child{animation-delay:.2s}
@keyframes hFade{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
.haf__dot{font-size:.7rem;font-weight:700;color:rgba(255,255,255,.45);letter-spacing:.08em;display:block;margin-bottom:5px}
.haf__point p{font-size:.79rem;line-height:1.56;color:rgba(255,255,255,.72);margin:0;font-weight:500}
@media(max-width:640px){.haf__nav-links{display:none}.haf__frame{min-height:420px;border-radius:16px}.haf__title{font-size:1.7rem}.haf__body{padding:14px 18px 24px}.haf__points{gap:16px}.haf__point{max-width:100%}}
      `}</style>
    </section>
  );
}
