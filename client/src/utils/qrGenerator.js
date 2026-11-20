/**
 * EtherBallot Sovereign QR Code Generator
 * Self-contained pure-JavaScript QR Code implementation (Model 2, Byte Mode, EC level L & M)
 * Zero external dependencies. Generates matrix, SVG and Canvas data URLs.
 */

// ─── Reed-Solomon & GF(256) Math ─────────────────────────────────────────────
const EXP_TABLE = new Uint8Array(512);
const LOG_TABLE = new Uint8Array(256);

(function initGaloisField() {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    EXP_TABLE[i] = x;
    EXP_TABLE[i + 255] = x;
    LOG_TABLE[x] = i;
    x <<= 1;
    if (x & 256) x ^= 0x11d;
  }
})();

function gMul(a, b) {
  if (a === 0 || b === 0) return 0;
  return EXP_TABLE[LOG_TABLE[a] + LOG_TABLE[b]];
}

function rsGeneratorPoly(degree) {
  let poly = [1];
  for (let i = 0; i < degree; i++) {
    const next = [1];
    const factor = EXP_TABLE[i];
    for (let j = 0; j < poly.length; j++) {
      next[j] = gMul(poly[j], factor);
    }
    next.push(0);
    for (let j = 0; j < poly.length; j++) {
      next[j + 1] ^= poly[j];
    }
    poly = next;
  }
  return poly;
}

function rsEncode(data, ecCount) {
  const gen = rsGeneratorPoly(ecCount);
  const msg = new Uint8Array(data.length + ecCount);
  msg.set(data);

  for (let i = 0; i < data.length; i++) {
    const coef = msg[i];
    if (coef !== 0) {
      for (let j = 0; j < gen.length; j++) {
        msg[i + j] ^= gMul(gen[j], coef);
      }
    }
  }
  return msg.slice(data.length);
}

// ─── Version & Capacity Definitions ──────────────────────────────────────────
const VERSIONS = [
  null,
  { ver: 1, total: 26, ec: 7, rem: 0 },
  { ver: 2, total: 44, ec: 10, rem: 7 },
  { ver: 3, total: 70, ec: 15, rem: 7 },
  { ver: 4, total: 100, ec: 20, rem: 7 },
  { ver: 5, total: 134, ec: 26, rem: 7 },
  { ver: 6, total: 172, ec: 36, rem: 7 },
  { ver: 7, total: 196, ec: 40, rem: 0 },
  { ver: 8, total: 242, ec: 48, rem: 0 },
  { ver: 9, total: 292, ec: 60, rem: 0 },
  { ver: 10, total: 346, ec: 72, rem: 0 },
  { ver: 11, total: 404, ec: 80, rem: 0 },
  { ver: 12, total: 466, ec: 96, rem: 0 },
  { ver: 13, total: 532, ec: 104, rem: 0 },
  { ver: 14, total: 581, ec: 120, rem: 3 }
];

const ALIGN_PATTERNS = [
  [],
  [],
  [6, 18],
  [6, 22],
  [6, 26],
  [6, 30],
  [6, 34],
  [6, 22, 38],
  [6, 24, 42],
  [6, 26, 46],
  [6, 28, 50],
  [6, 30, 54],
  [6, 32, 58],
  [6, 34, 62],
  [6, 26, 46, 66]
];

// ─── Encode String to QR Matrix ──────────────────────────────────────────────
export function generateQRMatrix(text) {
  const utf8 = new TextEncoder().encode(text || 'EB');
  const dataLen = utf8.length;

  let verInfo = null;
  for (let v = 1; v < VERSIONS.length; v++) {
    const candidate = VERSIONS[v];
    const dataCapacity = candidate.total - candidate.ec;
    const headerBits = v < 10 ? 12 : 20;
    const requiredBits = headerBits + dataLen * 8;
    if (requiredBits <= dataCapacity * 8) {
      verInfo = candidate;
      break;
    }
  }

  if (!verInfo) {
    verInfo = VERSIONS[VERSIONS.length - 1];
  }

  const ver = verInfo.ver;
  const size = 17 + 4 * ver;
  const dataCapacity = verInfo.total - verInfo.ec;

  const bitArr = [];
  function pushBits(val, len) {
    for (let i = len - 1; i >= 0; i--) {
      bitArr.push((val >> i) & 1);
    }
  }

  // Byte mode: 0100
  pushBits(0b0100, 4);
  // Char count
  pushBits(dataLen, ver < 10 ? 8 : 16);
  // Data bytes
  for (let i = 0; i < dataLen; i++) {
    pushBits(utf8[i], 8);
  }

  // Terminator
  const maxBits = dataCapacity * 8;
  const termLen = Math.min(4, maxBits - bitArr.length);
  pushBits(0, termLen);

  while (bitArr.length % 8 !== 0) {
    bitArr.push(0);
  }

  const padPatterns = [0xec, 0x11];
  let pIdx = 0;
  while (bitArr.length < maxBits) {
    pushBits(padPatterns[pIdx % 2], 8);
    pIdx++;
  }

  const dataCodewords = new Uint8Array(dataCapacity);
  for (let i = 0; i < dataCapacity; i++) {
    let byteVal = 0;
    for (let b = 0; b < 8; b++) {
      byteVal = (byteVal << 1) | bitArr[i * 8 + b];
    }
    dataCodewords[i] = byteVal;
  }

  const ecCodewords = rsEncode(dataCodewords, verInfo.ec);

  const allCodewords = new Uint8Array(verInfo.total);
  allCodewords.set(dataCodewords, 0);
  allCodewords.set(ecCodewords, dataCapacity);

  const finalBits = [];
  for (let i = 0; i < allCodewords.length; i++) {
    for (let b = 7; b >= 0; b--) {
      finalBits.push((allCodewords[i] >> b) & 1);
    }
  }
  for (let r = 0; r < verInfo.rem; r++) {
    finalBits.push(0);
  }

  const matrix = Array.from({ length: size }, () => Array(size).fill(-1));
  const isFunction = Array.from({ length: size }, () => Array(size).fill(false));

  function setFinder(row, col) {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const nr = row + r;
        const nc = col + c;
        if (nr < 0 || nr >= size || nc < 0 || nc >= size) continue;
        isFunction[nr][nc] = true;
        if (r >= 0 && r <= 6 && c >= 0 && c <= 6) {
          if (r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4)) {
            matrix[nr][nc] = 1;
          } else {
            matrix[nr][nc] = 0;
          }
        } else {
          matrix[nr][nc] = 0;
        }
      }
    }
  }

  setFinder(0, 0);
  setFinder(0, size - 7);
  setFinder(size - 7, 0);

  for (let i = 8; i < size - 8; i++) {
    if (!isFunction[6][i]) {
      matrix[6][i] = i % 2 === 0 ? 1 : 0;
      isFunction[6][i] = true;
    }
    if (!isFunction[i][6]) {
      matrix[i][6] = i % 2 === 0 ? 1 : 0;
      isFunction[i][6] = true;
    }
  }

  const alignCoords = ALIGN_PATTERNS[ver] || [];
  for (let i = 0; i < alignCoords.length; i++) {
    for (let j = 0; j < alignCoords.length; j++) {
      const ar = alignCoords[i];
      const ac = alignCoords[j];
      if ((ar <= 8 && ac <= 8) || (ar <= 8 && ac >= size - 8) || (ar >= size - 8 && ac <= 8)) continue;
      for (let r = -2; r <= 2; r++) {
        for (let c = -2; c <= 2; c++) {
          isFunction[ar + r][ac + c] = true;
          if (Math.abs(r) === 2 || Math.abs(c) === 2 || (r === 0 && c === 0)) {
            matrix[ar + r][ac + c] = 1;
          } else {
            matrix[ar + r][ac + c] = 0;
          }
        }
      }
    }
  }

  matrix[4 * ver + 9][8] = 1;
  isFunction[4 * ver + 9][8] = true;

  for (let i = 0; i <= 8; i++) {
    if (!isFunction[8][i]) isFunction[8][i] = true;
    if (!isFunction[i][8]) isFunction[i][8] = true;
  }
  for (let i = 0; i <= 7; i++) {
    if (!isFunction[8][size - 1 - i]) isFunction[8][size - 1 - i] = true;
    if (!isFunction[size - 1 - i][8]) isFunction[size - 1 - i] = true;
  }

  let bitIdx = 0;
  let dir = -1;
  for (let col = size - 1; col > 0; col -= 2) {
    if (col === 6) col--;
    const rStart = dir === -1 ? size - 1 : 0;
    const rEnd = dir === -1 ? -1 : size;
    for (let row = rStart; row !== rEnd; row += (dir === -1 ? -1 : 1)) {
      for (let c = 0; c < 2; c++) {
        const cPos = col - c;
        if (!isFunction[row][cPos]) {
          const bitVal = bitIdx < finalBits.length ? finalBits[bitIdx++] : 0;
          const mask = (row + cPos) % 2 === 0 ? 1 : 0;
          matrix[row][cPos] = bitVal ^ mask;
        }
      }
    }
    dir = -dir;
  }

  const formatBits = [1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 0, 0, 1, 0, 0];
  const fPosTopLeft = [
    [8, 0], [8, 1], [8, 2], [8, 3], [8, 4], [8, 5], [8, 7], [8, 8],
    [7, 8], [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8]
  ];
  for (let i = 0; i < 15; i++) {
    const [r, c] = fPosTopLeft[i];
    matrix[r][c] = formatBits[i];
  }
  const fPosSplit = [
    [size - 1, 8], [size - 2, 8], [size - 3, 8], [size - 4, 8], [size - 5, 8], [size - 6, 8], [size - 7, 8],
    [8, size - 8], [8, size - 7], [8, size - 6], [8, size - 5], [8, size - 4], [8, size - 3], [8, size - 2], [8, size - 1]
  ];
  for (let i = 0; i < 15; i++) {
    const [r, c] = fPosSplit[i];
    matrix[r][c] = formatBits[i];
  }

  return matrix;
}

// ─── Render to Canvas & Export Data URL ───────────────────────────────────────
export function matrixToDataUrl(matrix, scale = 7, margin = 2, primaryColor = '#0f172a', bg = '#ffffff') {
  if (typeof document === 'undefined') return '';
  const size = matrix.length;
  const fullSize = (size + margin * 2) * scale;
  const canvas = document.createElement('canvas');
  canvas.width = fullSize;
  canvas.height = fullSize;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, fullSize, fullSize);

  ctx.fillStyle = primaryColor;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (matrix[r][c] === 1) {
        ctx.fillRect((c + margin) * scale, (r + margin) * scale, scale, scale);
      }
    }
  }
  return canvas.toDataURL('image/png');
}
