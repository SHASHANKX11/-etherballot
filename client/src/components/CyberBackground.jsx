import { useEffect, useRef } from 'react';

const CyberBackground = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let animationFrameId;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Particle nodes
    const particleCount = Math.min(Math.floor((width * height) / 18000), 65);
    const particles = [];
    const colors = [
      { r: 37, g: 99, b: 235 },   // Royal Blue (#2563eb)
      { r: 56, g: 189, b: 248 },  // Electric Light Blue (#38bdf8)
      { r: 125, g: 211, b: 252 }, // Sky Light Blue (#7dd3fc)
      { r: 255, g: 255, b: 255 }, // Crisp White (#ffffff)
      { r: 29, g: 78, b: 216 }    // Deep Blue (#1d4ed8)
    ];

    // Floating 3D Geometric Prisms / Wireframe Hexagons
    const blocks = [];
    const blockCount = Math.max(4, Math.floor(width / 320));

    for (let i = 0; i < blockCount; i++) {
      const color = colors[i % colors.length];
      blocks.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * 26 + 16,
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.25,
        angle: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 0.006,
        color: `rgba(${color.r}, ${color.g}, ${color.b}, `,
        depth: Math.random() * 0.4 + 0.6
      });
    }

    for (let i = 0; i < particleCount; i++) {
      const color = colors[Math.floor(Math.random() * colors.length)];
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: Math.random() * 2.2 + 1.2,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        colorObj: color,
        colorStr: `rgba(${color.r}, ${color.g}, ${color.b}, `,
        alpha: Math.random() * 0.35 + 0.25,
        pulseSpeed: Math.random() * 0.025 + 0.008,
        pulseVal: Math.random() * Math.PI * 2
      });
    }

    let mouse = { x: -1000, y: -1000, radius: 160 };
    const ripples = [];

    const handleMouseMove = (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };

    const handleMouseLeave = () => {
      mouse.x = -1000;
      mouse.y = -1000;
    };

    const handleClick = (e) => {
      if (ripples.length > 5) ripples.shift();
      ripples.push({
        x: e.clientX,
        y: e.clientY,
        radius: 0,
        maxRadius: 180,
        alpha: 0.45,
        color: colors[Math.floor(Math.random() * colors.length)]
      });
    };

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('click', handleClick);
    document.addEventListener('mouseleave', handleMouseLeave);

    // Draw isometric polygon / cyber prism with glowing depth
    const drawHexPrism = (x, y, size, angle, colorStr) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);

      // Outer Hexagon
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI) / 3;
        const hx = Math.cos(a) * size;
        const hy = Math.sin(a) * size;
        if (i === 0) ctx.moveTo(hx, hy);
        else ctx.lineTo(hx, hy);
      }
      ctx.closePath();
      ctx.strokeStyle = `${colorStr}0.24)`;
      ctx.lineWidth = 1.3;
      ctx.stroke();

      // Subtle fill
      ctx.fillStyle = `${colorStr}0.03)`;
      ctx.fill();

      // Inner wireframe isometric spokes
      ctx.beginPath();
      for (let i = 0; i < 6; i += 2) {
        const a = (i * Math.PI) / 3;
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(a) * size, Math.sin(a) * size);
      }
      ctx.strokeStyle = `${colorStr}0.15)`;
      ctx.lineWidth = 1;
      ctx.stroke();

      // Center glowing node
      ctx.beginPath();
      ctx.arc(0, 0, 2, 0, Math.PI * 2);
      ctx.fillStyle = `${colorStr}0.4)`;
      ctx.fill();

      ctx.restore();
    };

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // 1. Draw click ripples
      for (let r = ripples.length - 1; r >= 0; r--) {
        const ripple = ripples[r];
        ripple.radius += 3.5;
        ripple.alpha *= 0.95;

        if (ripple.alpha < 0.01 || ripple.radius > ripple.maxRadius) {
          ripples.splice(r, 1);
          continue;
        }

        ctx.beginPath();
        ctx.arc(ripple.x, ripple.y, ripple.radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${ripple.color.r}, ${ripple.color.g}, ${ripple.color.b}, ${ripple.alpha})`;
        ctx.lineWidth = 1.8;
        ctx.stroke();
      }

      // 2. Draw floating geometric cyber blocks
      blocks.forEach((b) => {
        b.x += b.vx;
        b.y += b.vy;
        b.angle += b.vRot;

        if (b.x < -60) b.x = width + 60;
        if (b.x > width + 60) b.x = -60;
        if (b.y < -60) b.y = height + 60;
        if (b.y > height + 60) b.y = -60;

        drawHexPrism(b.x, b.y, b.size, b.angle, b.color);
      });

      // 3. Update & draw constellation nodes
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        p.x += p.vx;
        p.y += p.vy;
        p.pulseVal += p.pulseSpeed;

        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        // Interactive mouse interaction (repulsion with elastic return)
        const dxMouse = p.x - mouse.x;
        const dyMouse = p.y - mouse.y;
        const distMouse = Math.sqrt(dxMouse * dxMouse + dyMouse * dyMouse);
        if (distMouse < mouse.radius) {
          const force = (mouse.radius - distMouse) / mouse.radius;
          p.x += (dxMouse / distMouse) * force * 2.2;
          p.y += (dyMouse / distMouse) * force * 2.2;
        }

        // Draw connections between nearby nodes
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 130) {
            const lineAlpha = (1 - dist / 130) * 0.22;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `${p.colorStr}${lineAlpha})`;
            ctx.lineWidth = 0.9;
            ctx.stroke();
          }
        }

        // Draw node with pulsating glow halo
        const currentAlpha = Math.max(0.12, p.alpha + Math.sin(p.pulseVal) * 0.2);
        
        // Outer halo
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * 2.2, 0, Math.PI * 2);
        ctx.fillStyle = `${p.colorStr}${currentAlpha * 0.25})`;
        ctx.fill();

        // Core particle
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `${p.colorStr}${currentAlpha})`;
        ctx.fill();
      }

      // 4. Mouse radiant ambient glow when hovering
      if (mouse.x > 0 && mouse.y > 0) {
        const radGrad = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, 140);
        radGrad.addColorStop(0, 'rgba(37, 99, 235, 0.08)');
        radGrad.addColorStop(0.5, 'rgba(2, 132, 199, 0.03)');
        radGrad.addColorStop(1, 'rgba(37, 99, 235, 0)');
        ctx.fillStyle = radGrad;
        ctx.fillRect(mouse.x - 140, mouse.y - 140, 280, 280);
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('click', handleClick);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  return (
    <div className="cyber-background-container">
      <div className="cyber-grid-mesh" />
      <div className="cyber-aurora cyber-aurora--1" />
      <div className="cyber-aurora cyber-aurora--2" />
      <div className="cyber-aurora cyber-aurora--3" />
      <div className="cyber-aurora cyber-aurora--4" />
      <div className="cyber-scanbeam" />
      <canvas ref={canvasRef} className="cyber-canvas" />

      <style>{`
        .cyber-background-container {
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 0;
          overflow: hidden;
          background: linear-gradient(135deg, #f8fbff 0%, #eef5fc 100%);
        }
        .cyber-grid-mesh {
          position: absolute;
          inset: 0;
          background-image: 
            linear-gradient(rgba(56, 189, 248, 0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(56, 189, 248, 0.05) 1px, transparent 1px);
          background-size: 40px 40px;
          background-position: center center;
          opacity: 0.85;
        }
        .cyber-canvas {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
        }
        .cyber-aurora {
          position: absolute;
          border-radius: 50%;
          filter: blur(110px);
          opacity: 0.35;
          pointer-events: none;
        }
        .cyber-aurora--1 {
          width: 650px;
          height: 650px;
          background: radial-gradient(circle, rgba(37, 99, 235, 0.45) 0%, rgba(99, 102, 241, 0.2) 50%, transparent 70%);
          top: -12%;
          left: -8%;
          animation: auroraDrift1 22s ease-in-out infinite alternate;
        }
        .cyber-aurora--2 {
          width: 600px;
          height: 600px;
          background: radial-gradient(circle, rgba(99, 102, 241, 0.4) 0%, rgba(2, 132, 199, 0.22) 50%, transparent 70%);
          bottom: -12%;
          right: -8%;
          animation: auroraDrift2 26s ease-in-out infinite alternate;
        }
        .cyber-aurora--3 {
          width: 500px;
          height: 500px;
          background: radial-gradient(circle, rgba(56, 189, 248, 0.35) 0%, rgba(5, 150, 105, 0.18) 50%, transparent 70%);
          top: 35%;
          left: 42%;
          animation: auroraDrift3 20s ease-in-out infinite alternate;
        }
        .cyber-aurora--4 {
          width: 420px;
          height: 420px;
          background: radial-gradient(circle, rgba(217, 119, 6, 0.25) 0%, rgba(37, 99, 235, 0.15) 50%, transparent 70%);
          bottom: 20%;
          left: 10%;
          animation: auroraDrift1 28s ease-in-out infinite alternate-reverse;
        }
        .cyber-scanbeam {
          position: absolute;
          top: -100px;
          left: 0;
          right: 0;
          height: 2px;
          background: linear-gradient(90deg, transparent, rgba(37, 99, 235, 0.35), rgba(2, 132, 199, 0.6), rgba(37, 99, 235, 0.35), transparent);
          box-shadow: 0 0 15px rgba(2, 132, 199, 0.4);
          animation: scanSweep 12s linear infinite;
          opacity: 0.6;
        }

        @keyframes scanSweep {
          0% { top: -10px; opacity: 0; }
          5% { opacity: 0.8; }
          95% { opacity: 0.8; }
          100% { top: 105vh; opacity: 0; }
        }

        @keyframes auroraDrift1 {
          0% { transform: translate(0px, 0px) scale(1); }
          50% { transform: translate(70px, 50px) scale(1.18); }
          100% { transform: translate(-40px, 80px) scale(0.95); }
        }
        @keyframes auroraDrift2 {
          0% { transform: translate(0px, 0px) scale(1); }
          50% { transform: translate(-60px, -50px) scale(1.12); }
          100% { transform: translate(50px, -70px) scale(0.92); }
        }
        @keyframes auroraDrift3 {
          0% { transform: translate(0px, 0px) scale(1); }
          50% { transform: translate(-50px, 60px) scale(1.22); }
          100% { transform: translate(60px, -40px) scale(0.88); }
        }

        @media (prefers-reduced-motion: reduce) {
          .cyber-aurora, .cyber-scanbeam {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
};

export default CyberBackground;
