// core.js: canvas, time, easing, deterministic randomness, type and shape helpers.
// Every frame is a pure function of song time t (frames render in parallel, out of order).
const W = 1920, H = 1080, TAU = Math.PI * 2;
const INTRO = 3.0;                       // typed "continue" before the song; song time runs from -INTRO
const END = TL.end;

// black and white only
const C = { paper: '#FFFFFF', ink: '#000000', mid: '#888888', soft: '#B8B8B8', faint: '#DDDDDD', dark: '#000000', white: '#FFFFFF' };
const F = { serif: '"DM Serif Display"', ital: '"Instrument Serif"', round: '"Nunito"', mono: '"IBM Plex Mono"', sans: '"Adwaita Sans"',
  play: '"Playfair Display"', garamond: '"EB Garamond"', bodoni: '"Bodoni Moda"', fraunces: '"Fraunces"',
  jet: '"JetBrains Mono"', space: '"Space Mono"', courier: '"Courier Prime"' };

// ---------- math ----------
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const lerp = (a, b, x) => a + (b - a) * x;
const frac = x => x - Math.floor(x);
const ease = x => { x = clamp(x); return x * x * (3 - 2 * x); };
const easeOut = x => 1 - Math.pow(1 - clamp(x), 3);
const easeIn = x => Math.pow(clamp(x), 3);
const backOut = x => { x = clamp(x); const s = 1.7; return 1 + (s + 1) * Math.pow(x - 1, 3) + s * Math.pow(x - 1, 2); };
const seg = (t, a, b) => clamp((t - a) / (b - a));
const hash = i => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
function kf(t, keys, e = ease) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) if (t < keys[i][0]) {
    const [a, va] = keys[i - 1], [b, vb] = keys[i], k = e((t - a) / (b - a));
    return Array.isArray(va) ? va.map((v, j) => lerp(v, vb[j], k)) : lerp(va, vb, k);
  }
  return keys[keys.length - 1][1];
}
const shakeXY = (t, amt) => { const f = Math.floor(t * 24); return [(hash(f * 1.7) - .5) * 2 * amt, (hash(f * 2.3 + 9) - .5) * 2 * amt]; };
function mixCol(a, b, k) {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16), c = i => Math.round(lerp((pa >> i) & 255, (pb >> i) & 255, clamp(k)));
  return '#' + ((1 << 24) + (c(16) << 16) + (c(8) << 8) + c(0)).toString(16).slice(1);
}

// ---------- song structure ----------
const SEC = TL.sections.map(([name, a, b]) => ({ name, a, b }));
const secAt = t => t < 0 ? { name: 'intro', a: -INTRO, b: 0 } : (SEC.find(s => t >= s.a && t < s.b) || SEC[SEC.length - 1]);
const BEATS = TL.beats;
// 1 on each music beat, decaying
function beatPulse(t, k = 7) {
  let lo = 0, hi = BEATS.length - 1;
  while (lo < hi) { const m = (lo + hi + 1) >> 1; if (BEATS[m] <= t) lo = m; else hi = m - 1; }
  const b = BEATS[lo]; return b <= t ? Math.exp(-(t - b) * k) : 0;
}
const CARDS = TL.cards;
// whisper pins a line's first word to the start of its clip; it is really sung just before the second word
CARDS.forEach((c, ci) => {
  (SYNC[ci] || []).forEach((v, wi) => { if (v !== null) c.words[wi].t = v; });            // re-measured on the vocal stem
  const [a, b] = c.words; if (!(SYNC[ci] || [])[0] && b && b.t - a.t > .45) a.t = +(b.t - .4).toFixed(3);
  c.start = Math.min(c.start, c.words[0].t);
  if (c.text === "We're almost there") c.words.forEach(w => { if (w.w.startsWith('there')) w.big = false; });     // only "almost" is big
});
// the two whispered "continue"s of the outro, measured on the vocal stem (176-180 s is humming)
const OUT_CONT = [171.6, 181.6];
const cardsIn = (sec) => CARDS.filter(c => c.sec === sec);

// ---------- canvas ----------
let X = null, OUT = null, T = 0;
const mkCanvas = (w = W, h = H) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const LAYERS = [];
function withLayer(i, fn) {
  if (!LAYERS[i]) LAYERS[i] = mkCanvas();
  const c = LAYERS[i], prev = X; X = c.getContext('2d');
  X.setTransform(1, 0, 0, 1, 0, 0); X.globalAlpha = 1; X.globalCompositeOperation = 'source-over'; X.filter = 'none';
  X.clearRect(0, 0, W, H);
  try { fn(X); } finally { X = prev; }
  return c;
}
function blit(c, { a = 1, filter = 'none', dx = 0, dy = 0, s = 1, op = 'source-over' } = {}) {
  X.save(); X.setTransform(1, 0, 0, 1, 0, 0); X.globalAlpha = a; X.filter = filter; X.globalCompositeOperation = op;
  X.drawImage(c, dx + W * (1 - s) / 2, dy + H * (1 - s) / 2, W * s, H * s); X.restore();
}
function bg(col) { X.save(); X.setTransform(1, 0, 0, 1, 0, 0); X.globalAlpha = 1; X.fillStyle = col; X.fillRect(0, 0, W, H); X.restore(); }

// ---------- type ----------
const fontStr = ({ f = 'serif', size = 80, w = 400, it = false }) => `${it ? 'italic ' : ''}${w} ${size}px ${F[f] || f}, serif`;
function measure(s, o = {}) { X.save(); X.font = fontStr(o); X.letterSpacing = (o.track || 0) + 'px'; const m = X.measureText(s).width; X.restore(); return m; }
// the longest start of s that fits in maxW, with "…" when it had to be cut (text never runs past a window's border)
const _fit = new Map();
function fitTo(s, maxW, o = {}) {
  if (!s) return s;
  const k = s + '|' + fontStr(o) + '|' + (o.track || 0) + '|' + Math.round(maxW);
  if (_fit.has(k)) return _fit.get(k);
  let r = s;
  if (measure(s, o) > maxW) { let lo = 0, hi = s.length; while (lo < hi) { const m = (lo + hi + 1) >> 1; if (measure(s.slice(0, m).trimEnd() + '…', o) <= maxW) lo = m; else hi = m - 1; } r = s.slice(0, lo).trimEnd() + '…'; }
  _fit.set(k, r); return r;
}
// while HALO_W > 0 (the lyrics' first pass) text and lines draw only a border in HALO, HALO_W px wide
let HALO_W = 0, HALO = C.paper;
function txt(s, x, y, o = {}) {
  const a = o.a ?? 1; if (a <= 0.003 || !s) return;
  X.save(); X.translate(x, y); if (o.rot) X.rotate(o.rot); if (o.sx || o.sy) X.scale(o.sx ?? 1, o.sy ?? o.sx ?? 1);
  X.globalAlpha *= a; X.font = fontStr(o); X.letterSpacing = (o.track || 0) + 'px';
  X.textAlign = o.al || 'left'; X.textBaseline = o.base || 'alphabetic';
  if (HALO_W) { X.lineJoin = 'round'; X.strokeStyle = HALO; X.lineWidth = HALO_W * 2 + (o.stroke ? o.sw || 2 : 0); X.strokeText(s, 0, 0); X.restore(); return; }
  if (o.stroke) { X.lineJoin = 'round'; X.strokeStyle = o.stroke; X.lineWidth = o.sw || 2; X.strokeText(s, 0, 0); }
  if (!o.fillOff) { X.fillStyle = o.col || C.ink; X.fillText(s, 0, 0); }
  X.restore();
}

// ---------- shapes ----------
function rrect(x, y, w, h, r, o = {}) {
  X.save(); X.globalAlpha *= o.a ?? 1; X.beginPath(); X.roundRect(x, y, w, h, r);
  if (o.fill) { X.fillStyle = o.fill; X.fill(); }
  if (o.stroke) { X.strokeStyle = o.stroke; X.lineWidth = o.lw || 2; X.stroke(); }
  X.restore();
}
function line(pts, o = {}) {
  if (pts.length < 2) return;
  X.save(); X.globalAlpha *= o.a ?? 1; X.strokeStyle = HALO_W ? HALO : o.col || C.ink; X.lineWidth = (o.lw || 2) + HALO_W * 2; X.lineCap = 'round'; X.lineJoin = 'round';
  if (o.dash) X.setLineDash(o.dash);
  X.beginPath(); pts.forEach(([x, y], i) => i ? X.lineTo(x, y) : X.moveTo(x, y)); X.stroke(); X.restore();
}
// draw the first fraction k of a polyline (for "drawn-on" strokes)
function partial(pts, k) {
  if (k >= 1) return pts;
  const L = [0]; for (let i = 1; i < pts.length; i++) L.push(L[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const goal = L[L.length - 1] * clamp(k), out = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    if (L[i] <= goal) out.push(pts[i]);
    else { const u = (goal - L[i - 1]) / (L[i] - L[i - 1]); out.push([lerp(pts[i - 1][0], pts[i][0], u), lerp(pts[i - 1][1], pts[i][1], u)]); break; }
  }
  return out;
}

// ---------- boot / render hooks ----------
async function boot() {
  OUT = document.getElementById('out'); X = OUT.getContext('2d');
  const specs = [];
  for (const f of Object.keys(F)) for (const w of [300, 400, 600, 800, 900]) for (const it of [false, true]) specs.push(fontStr({ f, size: 40, w, it }));
  await Promise.all(specs.map(s => document.fonts.load(s, 'Aa0').catch(() => {})));
  await document.fonts.ready;
  window.ready = true;
}
function renderFrame(t) { T = t; X = OUT.getContext('2d'); X.setTransform(1, 0, 0, 1, 0, 0); X.globalAlpha = 1; X.filter = 'none'; drawWorld(t); }
window.renderAt = (t, type = 'image/jpeg', q = .93) => { renderFrame(t); return OUT.toDataURL(type, q); };
window.renderSheet = (ts, cols = 3, w = 640) => {
  const h = Math.round(w * 9 / 16), rows = Math.ceil(ts.length / cols), s = mkCanvas(cols * w, rows * (h + 26)), g = s.getContext('2d'), ms = [];
  g.fillStyle = '#222'; g.fillRect(0, 0, s.width, s.height); g.font = '18px monospace'; g.fillStyle = '#ddd';
  ts.forEach((t, i) => { const t0 = performance.now(); renderFrame(t); ms.push(Math.round(performance.now() - t0)); const x = (i % cols) * w, y = Math.floor(i / cols) * (h + 26); g.drawImage(OUT, x, y, w, h); g.fillText(t.toFixed(2) + 's', x + 6, y + h + 19); });
  return { url: s.toDataURL('image/jpeg', .88), ms };
};
