const fs = require('fs');
const zlib = require('zlib');

// CRC32 table
const crcTable = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    if (c & 1) c = 0xedb88320 ^ (c >>> 1);
    else c = c >>> 1;
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function createChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);

  const crcBuf = Buffer.alloc(4);
  const crcData = Buffer.concat([typeBuf, data]);
  crcBuf.writeUInt32BE(crc32(crcData), 0);

  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function generatePng(width, height, isMaskable = false) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // 8 bit depth
  ihdr[9] = 6; // RGBA color type
  ihdr[10] = 0; // deflate
  ihdr[11] = 0; // filter method
  ihdr[12] = 0; // non-interlaced

  const ihdrChunk = createChunk('IHDR', ihdr);

  // Generate image data (row filter byte 0 + RGBA pixels)
  const rowLength = 1 + width * 4;
  const rawData = Buffer.alloc(rowLength * height);

  const cx = width / 2;
  const cy = height / 2;
  const outerR = width * 0.48;
  const innerR = width * (isMaskable ? 0.32 : 0.42);

  for (let y = 0; y < height; y++) {
    const rowStart = y * rowLength;
    rawData[rowStart] = 0; // filter type None

    for (let x = 0; x < width; x++) {
      const idx = rowStart + 1 + x * 4;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Background: Deep Slate gradient
      const bgR = 15;
      const bgG = 23;
      const bgB = 42;
      const bgA = 255;

      // Inside safe radius: KaBiRa Blue & Gold branding
      if (dist <= innerR) {
        // Render stylized K symbol
        // Normalized coordinates in [-1, 1]
        const nx = dx / innerR;
        const ny = dy / innerR;

        // Vertical stem of K: nx between -0.45 and -0.22, ny between -0.65 and 0.65
        const isStem = nx >= -0.48 && nx <= -0.22 && ny >= -0.65 && ny <= 0.65;

        // Upper arm of K: diagonal
        const isUpperArm = nx >= -0.22 && nx <= 0.48 && Math.abs(ny - (-0.65 + (nx - (-0.22)) * 1.0)) < 0.18;

        // Lower arm of K: diagonal
        const isLowerArm = nx >= -0.20 && nx <= 0.45 && Math.abs(ny - (0.05 + (nx - (-0.20)) * 1.1)) < 0.18;

        // Blue orbit ring
        const isOrbit = Math.abs(dist - innerR * 0.85) < innerR * 0.08 && ny > -0.2;

        // Gold dot accent
        const isGoldDot = nx >= 0.32 && nx <= 0.48 && ny >= -0.72 && ny <= -0.56;

        if (isStem) {
          rawData[idx] = 248;     // R (White)
          rawData[idx + 1] = 250; // G
          rawData[idx + 2] = 252; // B
          rawData[idx + 3] = 255; // A
        } else if (isUpperArm) {
          rawData[idx] = 0;       // R (Sky Blue)
          rawData[idx + 1] = 163; // G
          rawData[idx + 2] = 255; // B
          rawData[idx + 3] = 255; // A
        } else if (isLowerArm) {
          rawData[idx] = 56;      // R (Light Blue)
          rawData[idx + 1] = 189; // G
          rawData[idx + 2] = 248; // B
          rawData[idx + 3] = 255; // A
        } else if (isOrbit) {
          rawData[idx] = 0;       // R (Royal Blue Orbit)
          rawData[idx + 1] = 102; // G
          rawData[idx + 2] = 238; // B
          rawData[idx + 3] = 230; // A
        } else if (isGoldDot) {
          rawData[idx] = 245;     // R (Amber / Gold)
          rawData[idx + 1] = 189; // G
          rawData[idx + 2] = 71;  // B
          rawData[idx + 3] = 255; // A
        } else {
          // Radial subtle dark glow
          const radial = Math.min(1, dist / innerR);
          rawData[idx] = Math.round(bgR + 15 * (1 - radial));
          rawData[idx + 1] = Math.round(bgG + 25 * (1 - radial));
          rawData[idx + 2] = Math.round(bgB + 45 * (1 - radial));
          rawData[idx + 3] = bgA;
        }
      } else {
        if (isMaskable) {
          // Full bleed to edge for maskable
          rawData[idx] = bgR;
          rawData[idx + 1] = bgG;
          rawData[idx + 2] = bgB;
          rawData[idx + 3] = bgA;
        } else {
          // Rounded corners for standard app icon
          const cornerR = width * 0.22;
          // check distance to 4 rounded corners
          const cx_box = Math.max(cornerR, Math.min(width - cornerR, x));
          const cy_box = Math.max(cornerR, Math.min(height - cornerR, y));
          const c_dist = Math.sqrt((x - cx_box) ** 2 + (y - cy_box) ** 2);

          if (c_dist <= cornerR) {
            rawData[idx] = bgR;
            rawData[idx + 1] = bgG;
            rawData[idx + 2] = bgB;
            rawData[idx + 3] = bgA;
          } else {
            rawData[idx] = 0;
            rawData[idx + 1] = 0;
            rawData[idx + 2] = 0;
            rawData[idx + 3] = 0; // transparent
          }
        }
      }
    }
  }

  const deflated = zlib.deflateSync(rawData);
  const idatChunk = createChunk('IDAT', deflated);
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

// Write files
fs.writeFileSync('public/pwa-192x192.png', generatePng(192, 192, false));
fs.writeFileSync('public/pwa-512x512.png', generatePng(512, 512, false));
fs.writeFileSync('public/pwa-maskable-512x512.png', generatePng(512, 512, true));
fs.writeFileSync('public/apple-touch-icon.png', generatePng(180, 180, false));
fs.writeFileSync('public/favicon.ico', generatePng(32, 32, false));

console.log('Successfully generated all PWA PNG icons!');
