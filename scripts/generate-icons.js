import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import zlib from 'zlib';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

function crc32(buf) {
  // Standard CRC32 (IEEE)
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      const mask = -(crc & 1);
      crc = (crc >>> 1) ^ (0xedb88320 & mask);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function u32be(n) {
  const b = Buffer.alloc(4);
  b.writeUInt32BE(n >>> 0, 0);
  return b;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const len = u32be(data.length);
  const crc = u32be(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([len, typeBuf, data, crc]);
}

function encodePngRGBA(width, height, rgba) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(8, 8); // bit depth
  ihdr.writeUInt8(6, 9); // color type: RGBA
  ihdr.writeUInt8(0, 10); // compression
  ihdr.writeUInt8(0, 11); // filter
  ihdr.writeUInt8(0, 12); // interlace

  // Raw scanlines: each row prefixed with filter type 0
  const stride = width * 4;
  const raw = Buffer.alloc(height * (1 + stride));
  for (let y = 0; y < height; y++) {
    const rowStart = y * (1 + stride);
    raw[rowStart] = 0;
    rgba.copy(raw, rowStart + 1, y * stride, y * stride + stride);
  }

  const compressed = zlib.deflateSync(raw, { level: 9 });
  const png = Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0)),
  ]);
  return png;
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function setPixel(buf, w, h, x, y, r, g, b, a) {
  if (x < 0 || y < 0 || x >= w || y >= h) return;
  const idx = (y * w + x) * 4;
  // Alpha blend over existing
  const oa = buf[idx + 3] / 255;
  const na = a / 255;
  const outA = na + oa * (1 - na);
  if (outA <= 0) {
    buf[idx] = 0;
    buf[idx + 1] = 0;
    buf[idx + 2] = 0;
    buf[idx + 3] = 0;
    return;
  }
  const or = buf[idx] / 255;
  const og = buf[idx + 1] / 255;
  const ob = buf[idx + 2] / 255;
  const nr = r / 255;
  const ng = g / 255;
  const nb = b / 255;
  const outR = (nr * na + or * oa * (1 - na)) / outA;
  const outG = (ng * na + og * oa * (1 - na)) / outA;
  const outB = (nb * na + ob * oa * (1 - na)) / outA;
  buf[idx] = Math.round(outR * 255);
  buf[idx + 1] = Math.round(outG * 255);
  buf[idx + 2] = Math.round(outB * 255);
  buf[idx + 3] = Math.round(outA * 255);
}

function drawFilledCircle(buf, w, h, cx, cy, radius, r, g, b, a) {
  const r2 = radius * radius;
  const minX = Math.floor(cx - radius);
  const maxX = Math.ceil(cx + radius);
  const minY = Math.floor(cy - radius);
  const maxY = Math.ceil(cy + radius);
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const dx = x + 0.5 - cx;
      const dy = y + 0.5 - cy;
      if (dx * dx + dy * dy <= r2) {
        setPixel(buf, w, h, x, y, r, g, b, a);
      }
    }
  }
}

function drawThickLine(buf, w, h, x0, y0, x1, y1, thickness, r, g, b, a) {
  // Simple line sampling with round caps (not perfect AA but OK for icons)
  const dx = x1 - x0;
  const dy = y1 - y0;
  const steps = Math.max(Math.abs(dx), Math.abs(dy)) * 2 + 1;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = x0 + dx * t;
    const y = y0 + dy * t;
    drawFilledCircle(buf, w, h, x, y, thickness / 2, r, g, b, a);
  }
}

function generateIcon(size) {
  const w = size;
  const h = size;
  const buf = Buffer.alloc(w * h * 4, 0);

  // Background: green circle
  const bg = { r: 34, g: 197, b: 94, a: 255 }; // emerald-ish
  drawFilledCircle(buf, w, h, w / 2, h / 2, (w * 0.48), bg.r, bg.g, bg.b, bg.a);

  // Foreground: a simple "enter" arrow (white)
  const fg = { r: 255, g: 255, b: 255, a: 255 };
  const t = clamp(Math.round(w * 0.10), 2, 14);

  const xA = w * 0.30;
  const yTop = h * 0.30;
  const yMid = h * 0.62;
  const xMid = w * 0.62;

  // Vertical stem
  drawThickLine(buf, w, h, xA, yTop, xA, yMid, t, fg.r, fg.g, fg.b, fg.a);
  // Horizontal bar
  drawThickLine(buf, w, h, xA, yMid, xMid, yMid, t, fg.r, fg.g, fg.b, fg.a);
  // Arrow head
  drawThickLine(buf, w, h, xMid - w * 0.10, yMid - h * 0.10, xMid, yMid, t, fg.r, fg.g, fg.b, fg.a);
  drawThickLine(buf, w, h, xMid - w * 0.10, yMid + h * 0.10, xMid, yMid, t, fg.r, fg.g, fg.b, fg.a);

  // Small notch to hint "Ctrl" (a tiny corner in top-left)
  if (w >= 32) {
    const nt = clamp(Math.round(w * 0.06), 2, 8);
    drawThickLine(buf, w, h, w * 0.28, h * 0.28, w * 0.38, h * 0.28, nt, fg.r, fg.g, fg.b, 200);
    drawThickLine(buf, w, h, w * 0.28, h * 0.28, w * 0.28, h * 0.38, nt, fg.r, fg.g, fg.b, 200);
  }

  return encodePngRGBA(w, h, buf);
}

function main() {
  const outDir = path.join(rootDir, 'icons');
  fs.mkdirSync(outDir, { recursive: true });

  const sizes = [16, 32, 48, 128];
  for (const size of sizes) {
    const png = generateIcon(size);
    const file = path.join(outDir, `icon${size}.png`);
    fs.writeFileSync(file, png);
    console.log(`Generated ${file}`);
  }
}

main();


