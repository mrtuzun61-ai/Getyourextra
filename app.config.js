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

function writeSafePng(file, size = 1024) {
  const w = size, h = size;
  const rgb = Buffer.alloc(w * h * 3);
  const set = (x, y, r, g, b) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const i = (y * w + x) * 3; rgb[i] = r; rgb[i+1] = g; rgb[i+2] = b;
  };
  const rect = (x0,y0,x1,y1,c) => {
    for (let y=y0;y<y1;y++) for (let x=x0;x<x1;x++) set(x,y,...c);
  };
  const circle = (cx,cy,r,c) => {
    const rr=r*r; for(let y=cy-r;y<=cy+r;y++) for(let x=cx-r;x<=cx+r;x++) if((x-cx)*(x-cx)+(y-cy)*(y-cy)<=rr) set(x,y,...c);
  };
  const line = (x0,y0,x1,y1,t,c) => {
    const dx=x1-x0, dy=y1-y0, n=Math.max(Math.abs(dx),Math.abs(dy));
    for(let s=0;s<=n;s++){ const x=Math.round(x0+dx*s/n), y=Math.round(y0+dy*s/n); circle(x,y,Math.floor(t/2),c); }
  };

  const navy=[5,28,44], blue=[46,103,210], blue2=[82,137,229], green=[12,174,83], white=[255,255,255], pale=[220,233,255];
  rect(0,0,w,h,navy);
  rect(230,270,795,695,blue);
  rect(690,270,795,375,blue2);
  rect(300,420,670,446,pale); rect(300,505,600,531,pale); rect(300,590,560,616,pale);
  circle(706,596,119,green);
  line(654,598,690,634,24,white); line(690,634,760,552,24,white);

  const font={
    G:['01110','10000','10000','10111','10001','10001','01110'],
    Y:['10001','10001','01010','00100','00100','00100','00100'],
    E:['11111','10000','10000','11110','10000','10000','11111'],
    X:['10001','10001','01010','00100','01010','10001','10001']
  };
  function glyph(ch,x,y,s,c){ const rows=font[ch]; rows.forEach((row,ry)=>[...row].forEach((v,rx)=>{if(v==='1') rect(x+rx*s,y+ry*s,x+(rx+1)*s,y+(ry+1)*s,c)})); }
  const s=24, gap=26, gw=5*s; let x=270, y=770;
  for (const ch of 'GYEX'){ glyph(ch,x,y,s,white); x += gw+gap; }

  const raw = Buffer.alloc(h * (1 + w*3));
  for(let y=0;y<h;y++){ const o=y*(1+w*3); raw[o]=0; rgb.copy(raw,o+1,y*w*3,(y+1)*w*3); }
  const ihdr=Buffer.alloc(13); ihdr.writeUInt32BE(w,0); ihdr.writeUInt32BE(h,4); ihdr[8]=8; ihdr[9]=2; ihdr[10]=0; ihdr[11]=0; ihdr[12]=0;
  const png=Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',ihdr),chunk('IDAT',zlib.deflateSync(raw,{level:9})),chunk('IEND',Buffer.alloc(0))]);
  fs.mkdirSync(path.dirname(file),{recursive:true}); fs.writeFileSync(file,png);
}

const safe = path.join(__dirname,'assets','generated-safe.png');
writeSafePng(safe);

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
