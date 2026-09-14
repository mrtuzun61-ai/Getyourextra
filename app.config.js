const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const base = require('./app.json');

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ ((c & 1) ? 0xedb88320 : 0);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const t = Buffer.from(type, 'ascii');
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  t.copy(out, 4);
  data.copy(out, 8);
  out.writeUInt32BE(crc32(Buffer.concat([t, data])), 8 + data.length);
  return out;
}

function writePalettePng(file, size = 1024) {
  const w = size, h = size;
  const px = new Uint8Array(w * h); // 0 navy, 1 white
  const set = (x, y, v = 1) => {
    if (x >= 0 && y >= 0 && x < w && y < h) px[y * w + x] = v;
  };
  const rect = (x0, y0, x1, y1, v = 1) => {
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) set(x, y, v);
  };
  const circle = (cx, cy, r, v = 1) => {
    const rr = r * r;
    for (let y = cy-r; y <= cy+r; y++) for (let x = cx-r; x <= cx+r; x++) {
      if ((x-cx)*(x-cx) + (y-cy)*(y-cy) <= rr) set(x, y, v);
    }
  };
  const line = (x0, y0, x1, y1, t, v = 1) => {
    const dx = x1-x0, dy = y1-y0, n = Math.max(Math.abs(dx), Math.abs(dy));
    for (let s = 0; s <= n; s++) {
      const x = Math.round(x0 + dx*s/n), y = Math.round(y0 + dy*s/n);
      circle(x, y, Math.floor(t/2), v);
    }
  };

  // document + check
  rect(250, 210, 760, 665, 1);
  rect(305, 285, 705, 620, 0);
  rect(345, 350, 655, 376, 1);
  rect(345, 440, 610, 466, 1);
  rect(345, 530, 565, 556, 1);
  circle(700, 615, 115, 1);
  circle(700, 615, 78, 0);
  line(655, 615, 687, 647, 22, 1);
  line(687, 647, 755, 568, 22, 1);

  // simple GYEX text bitmap
  const font = {
    G:['01110','10000','10000','10111','10001','10001','01110'],
    Y:['10001','10001','01010','00100','00100','00100','00100'],
    E:['11111','10000','10000','11110','10000','10000','11111'],
    X:['10001','10001','01010','00100','01010','10001','10001']
  };
  const glyph = (ch, x, y, s) => font[ch].forEach((row, ry) => [...row].forEach((v, rx) => {
    if (v === '1') rect(x + rx*s, y + ry*s, x + (rx+1)*s, y + (ry+1)*s, 1);
  }));
  let x = 245; const y = 770, s = 22, gap = 32;
  for (const ch of 'GYEX') { glyph(ch, x, y, s); x += 5*s + gap; }

  // 1-bit indexed PNG, matching the format of the repo's previously working icon
  const rowBytes = Math.ceil(w / 8);
  const raw = Buffer.alloc(h * (rowBytes + 1));
  for (let y = 0; y < h; y++) {
    const off = y * (rowBytes + 1);
    raw[off] = 0; // PNG filter: None
    for (let x = 0; x < w; x++) {
      if (px[y*w + x]) raw[off + 1 + (x >> 3)] |= (0x80 >> (x & 7));
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 1; // 1-bit
  ihdr[9] = 3; // indexed/palette
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const plte = Buffer.from([5,28,44, 255,255,255]);
  const png = Buffer.concat([
    Buffer.from([137,80,78,71,13,10,26,10]),
    chunk('IHDR', ihdr),
    chunk('PLTE', plte),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ]);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, png);
}

const safe = path.join(__dirname, 'assets', 'generated-safe.png');
writePalettePng(safe);

module.exports = {
  ...base.expo,
  icon: './assets/generated-safe.png',
  splash: { ...(base.expo.splash || {}), image: './assets/generated-safe.png' },
  android: {
    ...(base.expo.android || {}),
    adaptiveIcon: {
      ...((base.expo.android && base.expo.android.adaptiveIcon) || {}),
      foregroundImage: './assets/generated-safe.png'
    }
  }
};
