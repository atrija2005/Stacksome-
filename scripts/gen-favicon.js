/**
 * Generates a minimal favicon.ico (16x16) with the Stacksome orange brand colour.
 * Run once: node scripts/gen-favicon.js
 */
const fs = require('fs');
const path = require('path');

// A 16x16 orange (#FF6719) icon with a black background
// Encoded as a raw BMP inside an ICO container

function createIco(width, height, pixels) {
  // Each pixel is [B, G, R, A]
  const bmpSize = 40 + width * height * 4;
  const icoSize = 6 + 16 + bmpSize;
  const buf = Buffer.alloc(icoSize, 0);
  let o = 0;

  // ICO header
  buf.writeUInt16LE(0, o); o += 2;      // reserved
  buf.writeUInt16LE(1, o); o += 2;      // type: 1 = ICO
  buf.writeUInt16LE(1, o); o += 2;      // count: 1 image

  // Image directory entry
  buf.writeUInt8(width,  o); o++;       // width
  buf.writeUInt8(height, o); o++;       // height
  buf.writeUInt8(0, o); o++;            // colour count
  buf.writeUInt8(0, o); o++;            // reserved
  buf.writeUInt16LE(1, o); o += 2;      // colour planes
  buf.writeUInt16LE(32, o); o += 2;     // bits per pixel
  buf.writeUInt32LE(bmpSize, o); o += 4; // size of BMP data
  buf.writeUInt32LE(22, o); o += 4;     // offset to BMP data (6 + 16)

  // BITMAPINFOHEADER (40 bytes)
  buf.writeUInt32LE(40, o); o += 4;             // header size
  buf.writeInt32LE(width, o); o += 4;           // width
  buf.writeInt32LE(height * 2, o); o += 4;      // height * 2 (XOR + AND mask)
  buf.writeUInt16LE(1, o); o += 2;              // colour planes
  buf.writeUInt16LE(32, o); o += 2;             // bits per pixel
  buf.writeUInt32LE(0, o); o += 4;              // compression (none)
  buf.writeUInt32LE(width * height * 4, o); o += 4; // image size
  buf.writeInt32LE(0, o); o += 4;               // X pixels/meter
  buf.writeInt32LE(0, o); o += 4;               // Y pixels/meter
  buf.writeUInt32LE(0, o); o += 4;              // colours in table
  buf.writeUInt32LE(0, o); o += 4;              // important colours

  // Pixel data (bottom-up)
  for (let y = height - 1; y >= 0; y--) {
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = pixels[y * width + x];
      buf.writeUInt8(b, o); o++;
      buf.writeUInt8(g, o); o++;
      buf.writeUInt8(r, o); o++;
      buf.writeUInt8(a, o); o++;
    }
  }

  return buf;
}

function hexToRgb(hex) {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff, 255];
}

const W = 16, H = 16;
const BG   = hexToRgb('#0A0A0A');
const ORNG = hexToRgb('#FF6719');
const DIM  = [0xFF, 0x67, 0x19, 120]; // orange, half opacity

// Draw 3 stacked bars on a dark background
const pixels = new Array(W * H).fill(null).map(() => [...BG]);

function fillRow(y, xStart, xEnd, color) {
  for (let x = xStart; x < xEnd && x < W; x++) {
    if (y >= 0 && y < H) pixels[y * W + x] = [...color];
  }
}

// Bar 1 (top): y=3..5, x=2..14
for (let y = 3; y <= 5; y++) fillRow(y, 2, 14, ORNG);
// Bar 2 (mid): y=7..9, x=3..13
for (let y = 7; y <= 9; y++) fillRow(y, 3, 13, DIM);
// Bar 3 (bot): y=11..13, x=5..12
for (let y = 11; y <= 13; y++) fillRow(y, 5, 12, [...ORNG.slice(0,3), 80]);

const ico = createIco(W, H, pixels);
const out = path.join(__dirname, '../public/favicon.ico');
fs.writeFileSync(out, ico);
console.log(`✓ favicon.ico written to ${out} (${ico.length} bytes)`);
