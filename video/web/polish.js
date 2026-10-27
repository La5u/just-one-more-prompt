// polish.js: fourth batch: reply buttons, progress bars, terminal lines with diffs and easter eggs.

// ---------- reply action icons (under the assistant's reply) ----------
function actionIcon(kind, x, y, press, col = C.ink) {
  const sc = 1 - .18 * press, r = 15;
  X.save(); X.translate(x, y); X.scale(sc, sc);
  const on = press > .05; if (on) col = col === C.ink ? C.white : C.ink;
  rrect(-22, -22, 44, 44, 10, on ? { fill: col === C.white ? C.ink : C.white } : { stroke: col, lw: 1.5 });
  if (kind === 'retry') retryIcon(0, 0, r * .65, col, 2.6);
  else if (kind === 'edit') editIcon(0, 0, r * .8, col);
  else if (kind === 'undo') undoIcon(0, 0, r * .85, col, 2.6);
  else if (kind === 'copy') { rrect(-8, -10, 14, 16, 3, { stroke: col, lw: 2 }); rrect(-3, -5, 14, 16, 3, { stroke: col, lw: 2, fill: C.white }); }
  X.restore();
}

// ---------- progress, going forward... and sometimes back. Each one looks different and lives somewhere else ----------
const BARS = {
  build: [[0, .1], [2, .45], [3.5, .4], [5, .8], [6.5, .74], [8, .95], [9, .9], [11, .99], [13, .97], [17, .995]],
  tests: [[0, .3], [2.5, .7], [3.4, .52], [6, .88], [7.2, .81], [9.5, .97], [10.4, .93], [13, .98], [15, .95], [17, .99]],
  training: [[0, .05], [4, .3], [5, .28], [9, .62], [10, .55], [14, .9], [15, .86], [17, .93]],
};
const barAt = (name, lt) => { const k = BARS[name], p = kf(lt, k); return [p, kf(lt + .05, k) < kf(lt - .05, k)]; };
// build: a hairline with a dot riding it, a big percentage (no label)
function barBuild(x, y, w, lt, a) {
  const [p, back] = barAt('build', lt);
  txt(`${(p * 100).toFixed(1)}%`, x + w, y - 22, { f: 'sans', w: 800, size: 64, al: 'right', a });
  line([[x, y], [x + w, y]], { lw: 1.5, a });
  line([[x, y], [x + w * p, y]], { lw: 5, a });
  X.save(); X.globalAlpha *= a; X.fillStyle = C.ink; X.beginPath(); X.arc(x + w * p, y, 9, 0, TAU); X.fill(); X.restore();
}
// tests: one square per test; a regression empties some again, and near the end the passing ones start to flicker out (flaky)
function barTests(x, y, lt, a) {
  const [p, back] = barAt('tests', lt), n = Math.round(p * 43), s = 26, cols = 11, flaky = .25 * Math.pow(clamp((p - .75) / .24), 1.5);
  txt(`${n}/43`, x, y, { f: 'round', w: 900, size: 54, a });
  txt(back ? 'regressed' : 'passing', x + measure(`${n}/43 `, { f: 'round', w: 900, size: 54 }), y, { f: 'sans', it: true, w: 300, size: 40, a });
  for (let i = 0; i < 43; i++) {
    const bx = x + (i % cols) * (s + 6), by = y + 20 + Math.floor(i / cols) * (s + 6);
    const on = i < n && hash(i * 7.3 + Math.floor(lt * 14) * 1.9) >= flaky;
    rrect(bx, by, s, s, 3, on ? { fill: C.ink, a } : { stroke: C.ink, lw: 1.5, a });
  }
}
// context: a row of ticks fills up; just before it's full the conversation compacts and it drops back, again and again
function barContext(x, y, w, lt, a) {
  const P = 5.6, k = lt % P, n = 48, gap = w / n;
  const used = k < 4.6 ? lerp(.2, .97, Math.pow(k / 4.6, 1.5)) : lerp(.97, .2, ease((k - 4.6) / .8)), compact = k >= 4.4;
  txt(`${Math.round((1 - used) * 100)}%`, x, y - 30, { f: 'sans', w: 800, size: 64, a });
  txt(compact ? '✻ compacting conversation…' : 'context left', x, y + 110, { f: 'sans', it: true, w: 300, size: 32, a });
  for (let i = 0; i < n; i++) {
    const tx = x + i * gap + gap / 2, on = i < used * n;
    line([[tx, y], [tx, y + 60]], { lw: on ? gap * .55 : 1.2, a });
  }
}
// training: a ring, the epoch in the middle
function barTraining(cx, cy, r, lt, a) {
  const [p, back] = barAt('training', lt);
  X.save(); X.globalAlpha *= a; X.strokeStyle = C.ink; X.lineCap = 'butt';
  X.lineWidth = 2; X.beginPath(); X.arc(cx, cy, r, 0, TAU); X.stroke();
  X.lineWidth = 16; X.beginPath(); X.arc(cx, cy, r - 14, -Math.PI / 2, -Math.PI / 2 + TAU * p); X.stroke(); X.restore();
  txt(String(1 + Math.floor(p * 10)), cx, cy + 22, { f: 'sans', w: 800, size: 70, al: 'center', a });
  txt(back ? 'loss went up' : 'epoch /10', cx, cy + r + 40, { f: 'sans', it: true, w: 300, size: 32, al: 'center', a });
}

// a session's lines, from the real logs (logs.js): prompt, spinner, tool call, its result or error, a remark, a diff.
// seed picks the session, so two windows never show the same stretch
function diffLine(t, seed) {
  const add = Math.round(8 * Math.exp(Math.max(0, t) / 26) * (.6 + hash(seed) * .8)), rem = Math.round(1 + hash(seed * 3) * 30);
  return `  ⎿  +${add.toLocaleString('en')} −${rem}`;
}
function termLine(k, t, seed) {
  const n = Math.floor(k / 6) + seed * 7, kind = ((k % 6) + 6) % 6;
  if (kind === 0) return '> ' + pick(PROMPTS, n);
  if (kind === 1) return '✻✳✶✺'[Math.floor(t * 6 + seed) % 4] + ' ' + pick(SPIN, n + seed);
  if (kind === 2) return '● ' + pick(TOOLS, n * 3 + seed);
  if (kind === 3) return hash(n * 1.7 + seed) < .55 ? '  ⎿  ' + pick(ERRORS, n * 5 + seed) : diffLine(t, seed + k);
  if (kind === 4) return '● ' + pick(AI_SAYS, n * 2 + seed);
  return '● ' + pick(TOOLS, n * 3 + seed + 11);
}
