import { useMemo, useRef, useEffect } from 'react';
import { generateQRMatrix, matrixToDataUrl } from '../utils/qrGenerator';

export default function QRCodeView({
  value = '',
  size = 180,
  className = '',
  primaryColor = '#0f172a',
  bgColor = '#ffffff',
  margin = 2,
  onDataUrlReady = null
}) {
  const canvasRef = useRef(null);

  const matrix = useMemo(() => {
    try {
      return generateQRMatrix(value || 'EB-DEMO-TOKEN');
    } catch (e) {
      console.warn('QR matrix generation fallback:', e);
      return Array.from({ length: 25 }, () => Array(25).fill(0));
    }
  }, [value]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // 1. Try standard ISO QRCode engine first for 100% universal camera readability
    if (typeof window !== 'undefined' && window.QRCode && value) {
      try {
        const tempDiv = document.createElement('div');
        new window.QRCode(tempDiv, {
          text: value,
          width: Math.max(256, size * 2),
          height: Math.max(256, size * 2),
          colorDark: primaryColor,
          colorLight: bgColor,
          correctLevel: window.QRCode.CorrectLevel.M
        });

        setTimeout(() => {
          const generatedCanvas = tempDiv.querySelector('canvas');
          if (generatedCanvas && canvasRef.current) {
            canvas.width = generatedCanvas.width;
            canvas.height = generatedCanvas.height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(generatedCanvas, 0, 0);
              if (onDataUrlReady) {
                try {
                  onDataUrlReady(canvas.toDataURL('image/png'));
                } catch {}
              }
            }
          }
        }, 50);
        return;
      } catch (err) {
        console.warn('window.QRCode error, falling back to matrix:', err);
      }
    }

    // 2. Pure JavaScript Matrix Fallback
    if (!matrix) return;
    const mSize = matrix.length;
    const fullUnits = mSize + margin * 2;
    const scale = Math.max(2, Math.floor(size / fullUnits));
    const fullPx = fullUnits * scale;

    canvas.width = fullPx;
    canvas.height = fullPx;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, fullPx, fullPx);

    ctx.fillStyle = primaryColor;
    for (let r = 0; r < mSize; r++) {
      for (let c = 0; c < mSize; c++) {
        if (matrix[r][c] === 1) {
          ctx.fillRect((c + margin) * scale, (r + margin) * scale, scale, scale);
        }
      }
    }

    if (onDataUrlReady) {
      try {
        onDataUrlReady(canvas.toDataURL('image/png'));
      } catch {}
    }
  }, [value, matrix, size, margin, primaryColor, bgColor, onDataUrlReady]);

  return (
    <div className={`qr-code-view ${className}`} style={{ display: 'inline-block', lineHeight: 0 }}>
      <canvas
        ref={canvasRef}
        style={{
          width: size,
          height: size,
          maxWidth: '100%',
          imageRendering: 'pixelated',
          borderRadius: 8
        }}
        alt="Voter QR Verification Code"
      />
    </div>
  );
}
