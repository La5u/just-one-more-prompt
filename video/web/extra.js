// extra.js: second batch of devices (sampled words, stamps, odometers, boil, text on a path, glitch, the cursor with eyes).

// ---------- boil: hand-drawn jitter, re-drawn 12× a second ----------
const boilK = (seed, i) => hash(seed * 7.13 + i * 3.71 + Math.floor(T * 12) * 17.3) - .5;
function boilPts(pts, amp, seed = 1) { return pts.map(([x, y], i) => [x + boilK(seed, i) * amp, y + boilK(seed + 50, i) * amp]); }

// ---------- sampled words: the AI picks the nicest word ----------
const CANDS = {
  well: ['fine', 'great', 'good', 'swell'], corner: ['horizon', 'edge', 'finish', 'bend'], 'tell?': ['see?', 'feel?', 'say?'],
  stop: ['quit', 'rest', 'sleep'], almost: ['nearly', 'basically', 'so'], proud: ['happy', 'glad', 'impressed'],
  pushing: ['trying', 'going', 'building'], 'continue?': ['stop?', 'rest?', 'sleep?'],
};
function sampledWord(tk, t, col, a) {
  const tw = tk.word.t, key = tk.s.toLowerCase();
  if (t < tw - .55) return;
  if (t < tw) {
    const p = seg(t, tw - .55, tw), list = [tk.s, ...(CANDS[key] || ['…', 'hm', 'ok'])];
    const r = Math.floor(t * 14);
    const probs = list.map((_, i) => Math.pow(hash(r * 3.3 + i * 9.1), 1.5) * (i === 0 ? lerp(.4, 4, p) : 1));
    const sum = probs.reduce((x, y) => x + y, 0);
    const order = list.map((w, i) => [w, probs[i] / sum]).sort((x, y) => y[1] - x[1]);
    const f = { f: 'mono', size: 24 }, rowH = 32, appear = easeOut(p / .2);
    order.forEach(([w, pr], i) => {
      const y = tk.y - tk.o.size * .3 + (i - (order.length - 1) / 2) * rowH * appear, hot = i === 0;
      txt(w, tk.x, y + 8, { ...f, col, a: a * appear * (hot ? 1 : .4) });
    });
    return;
  }
  const k = clamp((t - tw) / .25), sc = lerp(1.25, 1, backOut(k));
  X.save(); X.translate(tk.x, tk.y); X.scale(sc, sc); txt(tk.s, 0, 0, { ...tk.o, col, a: a * clamp(k * 4) }); X.restore();
}

// ---------- odometer: digits roll like a mechanical counter ----------
function odometer(v, x, y, o = {}) {
  const f = { f: 'mono', size: o.size || 22, ...o.font }, digits = o.digits || Math.max(1, String(Math.floor(v)).length);
  const cw = measure('0', f), h = f.size * 1.2, col = o.col || C.ink, a = o.a ?? 1;
  let xx = o.al === 'right' ? x - digits * cw : o.al === 'center' ? x - digits * cw / 2 : x;
  X.save(); X.beginPath(); X.rect(xx - 2, y - h * .85, digits * cw + 4, h * 1.05); X.clip();
  for (let i = digits - 1; i >= 0; i--) {
    const pw = Math.pow(10, i), d = Math.floor(v / pw) % 10;
    // a digit rolls only while everything to its right is passing 9…9 → 0…0
    const roll = i === 0 ? frac(v) : clamp((v % pw) - (pw - 1));
    const dx = xx + (digits - 1 - i) * cw;
    txt(String(d), dx, y - roll * h, { ...f, col, a });
    txt(String((d + 1) % 10), dx, y + (1 - roll) * h, { ...f, col, a });
  }
  X.restore();
  return digits * cw;
}

// ---------- text along a polyline ----------
function textPath(s, pts, o = {}) {
  const L = [0]; for (let i = 1; i < pts.length; i++) L.push(L[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const total = L[L.length - 1]; let d = o.start || 0, k = 0;
  X.save(); X.font = fontStr(o); X.textAlign = 'center'; X.textBaseline = 'middle'; X.fillStyle = o.col || C.ink; X.globalAlpha *= o.a ?? 1;
  for (let n = 0; d < total && n < 60000; n++) {
    const ch = s[n % s.length], cw = X.measureText(ch).width, dd = d + cw / 2;
    while (k < L.length - 2 && L[k + 1] < dd) k++;
    const u = (dd - L[k]) / Math.max(1e-6, L[k + 1] - L[k]), [ax, ay] = pts[k], [bx, by] = pts[k + 1];
    const px = lerp(ax, bx, u), py = lerp(ay, by, u);
    if (dd > 0 && px > -40 && px < W + 40 && py > -40 && py < H + 40) { X.save(); X.translate(px, py); X.rotate(Math.atan2(by - ay, bx - ax)); X.fillText(ch, 0, 0); X.restore(); }
    d += cw;
  }
  X.restore();
}

// ---------- glitch (black and white): slices slide sideways, a grey ghost trails ----------
let _gl = null;
function glitch(t, amt) {
  if (amt <= .01) return;
  if (!_gl) _gl = mkCanvas();
  const g = _gl.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, H); g.drawImage(OUT, 0, 0);
  X.save(); X.setTransform(1, 0, 0, 1, 0, 0);
  const f = Math.floor(t * 20);
  for (let i = 0; i < 9; i++) {
    const y = hash(f * 3.1 + i) * H, h = 8 + hash(f * 7.7 + i) * 70, dx = (hash(f * 5.3 + i * 2) - .5) * 160 * amt;
    X.drawImage(_gl, 0, y, W, h, dx, y, W, h);
  }
  X.globalAlpha = .28 * amt; X.drawImage(_gl, 18 * amt, 0); X.drawImage(_gl, -12 * amt, 0);
  X.restore();
}

// ---------- exhaustion: letters scrambling (only twice; "go to sleep" in the last chorus has its own glitch) ----------
// [start, length, strength]
const EPISODES = [[119.6, 1.0, .55], [165.4, 1.3, .9]];
function exhaustion(t) {
  let e = 0;
  for (const [a, d, k] of EPISODES) if (t >= a && t < a + d) e = Math.max(e, k * Math.sin((t - a) / d * Math.PI));
  return e;
}
// letters keep their shape-identity; only the font flickers between the families
const GLF = [{ f: 'serif' }, { f: 'ital', it: true }, { f: 'mono', w: 600 }, { f: 'sans', w: 900 }, { f: 'round', w: 800 }, { f: 'sans', it: true, w: 200 },
  { f: 'play', w: 900, it: true }, { f: 'bodoni', w: 900 }, { f: 'garamond', w: 500 }];
function glitchFont(o, i, t) {
  const e = exhaustion(t), fr = Math.floor(t * 15); if (e < .15 || hash(i * 3.7 + fr * 1.3) >= e * .55) return o;
  const g = GLF[Math.floor(hash(i * 9.1 + fr) * GLF.length)]; return { ...o, f: g.f, it: !!g.it, w: g.w || 400 };
}
// a string drawn letter by letter, so each letter can change font (falls back to one txt() when calm)
function txtGlitch(s, x, y, o, seed, t) {
  if (exhaustion(t) < .15) { txt(s, x, y, o); return; }
  for (let k = 0; k < s.length; k++) {
    const x0 = prefixW(s, o, k), cw = prefixW(s, o, k + 1) - x0;
    txt(s[k], x + x0 + cw / 2, y, { ...glitchFont(o, seed + k, t), track: 0, al: 'center' });
  }
}
// moving the goalposts: a dot walks along a line toward a "done" flag; each time it gets close, the flag
// slides further on. The view follows once the flag nears the right edge. The eta never changes.
function goalpost(x, y, w, h, lt, a) {
  const v = 70, base = y + h * .66, D = v * lt;
  let F = 260, jt = -9;                              // the flag's resting place, and when it last moved
  for (let n = 0; n < 40; n++) { const at = (F - 60) / v; if (at > lt) break; jt = at; F += 170; }
  const Fx = F - 170 * (1 - easeOut((lt - jt) / .45));      // sliding to its new place
  const cam = Math.max(0, Fx - w * .78), sx = u => x + u - cam;
  X.save(); X.globalAlpha *= a; X.beginPath(); X.rect(x - 10, y, w + 20, h); X.clip();
  line([[x, base], [x + w, base]], { lw: 2 });
  for (let u = Math.ceil(cam / 50) * 50; u < cam + w; u += 50) line([[sx(u), base], [sx(u), base + 9]], { lw: 1.5 });
  const fx = sx(Fx);
  line([[fx, base], [fx, base - 70]], { lw: 2.5 });
  X.fillStyle = C.ink; X.beginPath(); X.moveTo(fx, base - 70); X.lineTo(fx + 42, base - 58); X.lineTo(fx, base - 46); X.fill();
  txt('done', fx + 6, base - 80, { f: 'mono', w: 600, size: 20 });
  X.beginPath(); X.arc(sx(D), base, 10, 0, TAU); X.fill();
  X.restore();
  txt('eta ~5 min', x, y + h - 8, { f: 'mono', size: 18, a });
}

// ---------- what was really typed and answered (brainstorm, "my case specifically"), never the lyrics ----------
const CHATWORDS = ['contiue', 'conitnue', 'cintinue', 'okay continue', 'okay do that', 'dig deeper', 'okay. dig deepr', 'okay, keep digging',
  "keep going until you've exhausted all evidence", 'what next?', 'anything else?', "is there anything that isn't reported yet?", 'try harder',
  "surely we're not trying hard enough", 'sureeelyy were not trying hard enough', 'never stop until u have exhausted',
  'keep going until ur recommendation is either to report or give up', 'the next step is…', 'the strongest remaining lead is…',
  'the missing evidence remains…', 'public evidence is not exhausted', "I'll investigate further", 'I can also…',
  'one further investigative round is justified', 'k', 'lgtm', 'lmk', 'eta?', '~5 min?', '& tests', 'subagents', 'parallelize', 'refactor',
  'thinking…', 'summarize', 'explain', 'AGENTS.md', 'skills', 'plugins', 'overfitting', 'overengineering'];

// ---------- the bridge: a hypnotic spiral made only of the chat history, turning under a clock's two racing hands ----------
function hypnoSpiral(t, col, a, cx = MIDX, cy = 560) {
  const b = 21, rot = -t * 1.1, R0 = 40, R1 = 1300, s = CHATPOOL.join('   ·   ') + '   ·   ', f = { f: 'sans', w: 600, size: 26 };
  const off = -((t * 150) % measure(s, f));
  for (const arm of [0, Math.PI]) {
    const pts = [];
    for (let th = R0 / b; th < R1 / b; th += 7 / (b * th)) { const r = b * th; pts.push([cx + Math.cos(th + rot + arm) * r, cy + Math.sin(th + rot + arm) * r]); }
    textPath(s, pts, { ...f, col, a: a * .6, start: off + (arm ? 900 : 0) });
  }
  // the clock, zoomed right in: no face, no numbers, only the hands
  const hand = (an, L, lw) => {
    const p = [[-Math.cos(an - Math.PI / 2) * L * .12, -Math.sin(an - Math.PI / 2) * L * .12], [Math.cos(an - Math.PI / 2) * L, Math.sin(an - Math.PI / 2) * L]];
    line(p.map(([x, y]) => [cx + x, cy + y]), { col: C.dark, lw: lw + 26, a });
    line(p.map(([x, y]) => [cx + x, cy + y]), { col, lw, a });
  };
  hand(t * TAU * .025 + 1.2, 330, 22); hand(t * TAU * .3, 520, 10);           // two hands, hour and minute, an hour every 3 s
  X.save(); X.globalAlpha *= a; X.fillStyle = col; X.beginPath(); X.arc(cx, cy, 20, 0, TAU); X.fill(); X.restore();
}

// ---------- pre-chorus 3: a contribution graph with no day off (one square per day, a year of them) ----------
const MONTHS = ['Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'];
function contribGraph(t, t0, col, a) {
  const cols = 53, rows = 7, s = 25, g = 6, gw = cols * (s + g) - g, x0 = (W - gw) / 2, y0 = 250, lt = t - t0, sh = [.16, .32, .52, .76, 1];
  // a year of empty squares, filled in left to right, one day after another, over the whole of pre-chorus 3;
  // each square is painted once and keeps its shade
  const fill = (c, r) => (c * rows + r) * .0262;           // the last square lands just before the picture rolls on (scenes.js ROLL)
  X.save(); X.globalAlpha *= a;
  const done = clamp(lt / fill(cols, 0));
  MONTHS.forEach((m, i) => txt(m, x0 + i * 4.42 * (s + g), y0 - 14, { f: 'sans', size: 17, col, a: .7 }));
  ['Mon', 'Wed', 'Fri'].forEach((d, i) => txt(d, x0 - 14, y0 + (1 + 2 * i) * (s + g) + s * .72, { f: 'sans', size: 16, col, a: .7, al: 'right' }));
  for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) {
    const p = ease((lt - fill(c, r)) / .18);
    // every day has something, and the year gets busier as it goes
    const lvl = p <= 0 ? 0 : Math.min(4, 1 + Math.floor(hash(c * 7.3 + r * 13.1) * 2.2 + c / cols * 2.2));
    const bx = x0 + c * (s + g), by = y0 + r * (s + g), k = 1 + .25 * (p > 0 && p < 1 ? Math.sin(p * Math.PI) : 0);
    X.save(); X.translate(bx + s / 2, by + s / 2); X.scale(k, k);
    rrect(-s / 2, -s / 2, s, s, 5, { fill: mixCol(C.dark, col, lerp(sh[0], sh[lvl], p)) }); X.restore();
  }
  const yb = y0 + rows * (s + g) + 40;
  // under it, tokens per day over the same year: drawn along with the squares, bending upward
  // a jagged random walk on top of the upward bend: noisy days, sudden spikes, a few near-empty days off a limit
  const vn = i => { const h = hash(i * 3.17 + 5), sp = hash(i * 7.9) > .93 ? .5 * hash(i * 1.3) : 0, dip = hash(i * 5.3 + 2) > .96 ? -.8 : 0; return (h - .5) * .5 + sp + dip; };
  const v = u => { const i = u * 120, f = i - Math.floor(i), n = lerp(vn(Math.floor(i)), vn(Math.floor(i) + 1), f * f * (3 - 2 * f));
    const tr = (Math.exp(3.2 * u) - 1) / (Math.exp(3.2) - 1) * .8 + .06, tt = t0 + u * fill(cols, 0);
    // hidden in the climb: a heartbeat on every beat of the music, as the line is drawn
    const hb = BEATS.reduce((q, b) => q + beatShape(tt - b), 0);
    return clamp(tr * (1 + n) + .03 * (hash(Math.floor(u * 400)) - .5) + hb * (.05 + .2 * tr), .01, .98); };
  const cy0 = yb + 70, ch = 1010 - cy0;
  txt('tokens', x0, cy0 - 14, { f: 'sans', w: 700, size: 24, col });
  for (let i = 0; i <= 2; i++) line([[x0, cy0 + ch - i * ch / 2], [x0 + gw - 50, cy0 + ch - i * ch / 2]], { col, lw: 1, a: .25 });
  const pts = []; for (let i = 0; i <= 1600 * done; i++) { const u = i / 1600; pts.push([x0 + u * (gw - 50), cy0 + ch - v(u) * ch]); }
  if (pts.length > 1) {
    line(pts, { col, lw: 3.5 });
    const lp = pts[pts.length - 1]; X.fillStyle = col; X.beginPath(); X.arc(lp[0], lp[1], 7, 0, TAU); X.fill();
  }
  X.restore();
}
