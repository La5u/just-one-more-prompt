// more.js: third batch: wall clock, unread badge, the little Claude robots, subagents, code/docs tabs, button icons.

// ---------- a wall clock that ticks once a second ----------
function wallClock(x, y, r, m, t, o = {}) {
  const a = o.a ?? 1;
  X.save(); X.translate(x, y); X.globalAlpha *= a;
  X.fillStyle = C.white; X.strokeStyle = C.ink; X.lineWidth = 4; X.beginPath(); X.arc(0, 0, r, 0, TAU); X.fill(); X.stroke();
  for (let i = 0; i < 12; i++) { const an = i / 12 * TAU; line([[Math.cos(an) * r * .78, Math.sin(an) * r * .78], [Math.cos(an) * r * .9, Math.sin(an) * r * .9]], { lw: i % 3 ? 2 : 4 }); }
  if (o.nums > 0) for (let i = 1; i <= 12; i++) {                         // numerals (they quietly go away later)
    const an = i / 12 * TAU - Math.PI / 2;
    txt(String(i), Math.cos(an) * r * .6, Math.sin(an) * r * .6 + r * .08, { f: 'sans', w: 800, size: r * .22, al: 'center', a: o.nums });
  }
  const hand = (an, L, lw) => line([[0, 0], [Math.cos(an - Math.PI / 2) * L, Math.sin(an - Math.PI / 2) * L]], { lw });
  hand((m % 720) / 720 * TAU, r * .5, 5); hand((m % 60) / 60 * TAU, r * .72, 3.5);
  const s = Math.floor(t), tick = backOut(clamp((t - s) / .12));           // the second hand jumps, with a little overshoot
  hand((s - 1 + tick) / 60 * TAU, r * .82, 1.6);
  X.fillStyle = C.ink; X.beginPath(); X.arc(0, 0, 5, 0, TAU); X.fill();
  X.restore();
}

// ---------- messages app with an unread badge ----------
const UNREAD = [[18, 0], [24, 1], [40, 2], [57, 4], [63.9, 6], [66.4, 7], [69.6, 9], [92, 17], [113, 31], [124, 58], [145, 84], [168, 140]];
// ---------- the little Claude robot (pixel body, two eyes, four legs) ----------
function clawd(x, y, s, t, o = {}) {
  const a = o.a ?? 1, col = o.col || C.ink, u = s / 10, bob = (o.bob ?? 1) * Math.abs(Math.sin((t + (o.ph || 0)) * 6)) * u * .6;
  X.save(); X.translate(x, y - bob); X.globalAlpha *= a; X.fillStyle = col;
  X.fillRect(-5 * u, -7 * u, 10 * u, 5 * u);                    // body
  X.fillRect(-6.2 * u, -5.5 * u, 1.2 * u, 1.6 * u); X.fillRect(5 * u, -5.5 * u, 1.2 * u, 1.6 * u);   // arms
  const step = Math.floor((t + (o.ph || 0)) * 8) % 2;
  for (const lx of [-4, -2.2, 1.2, 3]) X.fillRect(lx * u, -2 * u, u, (step ^ (lx > 0 ? 1 : 0)) ? 2 * u : 1.5 * u);   // legs
  X.fillStyle = o.eye || C.paper; X.fillRect(-3 * u, -5.6 * u, u, 1.6 * u); X.fillRect(2 * u, -5.6 * u, u, 1.6 * u);
  X.restore();
}

// ---------- tabs of docs and code (the early, curious days) ----------
const CODE = ['import time', 'from model import train, evaluate', '', 'def main():', '    for attempt in range(10_000):', '        train(epochs=1)',
  '        if evaluate() > 0.99:', '            break  # almost there', '        time.sleep(0)  # TODO: sleep', '    print("done?")', '',
  'if __name__ == "__main__":', '    main()', ''];
// neovim: line numbers, a block cursor, the mode and position in the status line
function codeEditor(x, y, w, h, t, o = {}) {
  const a = o.a ?? 1, rows = Math.floor((h - 90) / 26), off = Math.floor(t * .8) % CODE.length, cur = Math.floor(t * 1.3) % rows;
  windowFrame(x, y, w, h, 'nvim train.py', { a, fill: C.white });
  const f = { f: 'jet', size: 15, col: C.ink, a };
  for (let i = 0; i < rows; i++) {
    const l = CODE[(i + off) % CODE.length], yy = y + 70 + i * 26;
    txt(String((i + off) % CODE.length + 1).padStart(3, ' '), x + 12, yy, { ...f, a: a * .45 });
    txt(fitTo(l, w - 70, f), x + 56, yy, f);
    if (i === cur && frac(t * 1.7) < .6) rrect(x + 56 + measure(l, f), yy - 15, 9, 19, 0, { fill: C.ink, a });
  }
  rrect(x + 2, y + h - 34, w - 4, 26, 0, { fill: C.ink, a });
  txt(frac(t / 3) < .5 ? '-- INSERT --' : 'NORMAL', x + 14, y + h - 15, { ...f, w: 700, col: C.white });
  txt(`train.py [+]   ${(cur + off) % CODE.length + 1},${1 + Math.floor(hash(cur) * 30)}   All`, x + w - 14, y + h - 15, { ...f, col: C.white, al: 'right' });
}
// ---------- buttons: undo, edit, continue ----------
function undoIcon(x, y, r, col, lw = 3) {
  X.save(); X.strokeStyle = col; X.fillStyle = col; X.lineWidth = lw; X.lineCap = 'round';
  X.beginPath(); X.arc(x + r * .1, y + r * .15, r * .75, Math.PI * 1.15, Math.PI * 2.25); X.stroke();
  const hx = x - r * .55, hy = y - r * .2;
  X.beginPath(); X.moveTo(hx - r * .35, hy - r * .05); X.lineTo(hx + r * .25, hy - r * .55); X.lineTo(hx + r * .3, hy + r * .3); X.closePath(); X.fill();
  X.restore();
}
function editIcon(x, y, r, col) {
  X.save(); X.translate(x, y); X.rotate(-.8); X.fillStyle = col;
  X.fillRect(-r * .2, -r * .9, r * .4, r * 1.3);
  X.beginPath(); X.moveTo(-r * .2, r * .45); X.lineTo(r * .2, r * .45); X.lineTo(0, r * .85); X.closePath(); X.fill();
  X.restore();
}
// ---------- output, live: scrolls fast; each outage lasts longer than the one before ----------
const OUTAGES = [[77.2, .2], [79.4, .3], [81.6, .4], [83.9, .55], [86.4, .7], [89.1, .9], [92.3, 1.1], [96, 1.3]];
function liveGraph(x, y, w, h, t, t0, o = {}) {
  const a = o.a ?? 1, span = 3.2, f = tt => {
    if (tt < t0) return null;
    for (const [s, d] of OUTAGES) if (tt >= s && tt < s + d) return .04 + .02 * hash(Math.floor(tt * 40));
    const u = seg(tt, t0, 100), f6 = Math.floor(tt * 6);                    // u: how far in; the later, the less reliable
    if (hash(f6 * 1.37) < .03 + .3 * u) return .03 + .03 * hash(Math.floor(tt * 40));          // random drop-outs, more and more often
    return clamp(.15 + .7 * u + (hash(Math.floor(tt * 24)) - .5) * (.08 + .5 * u) + (hash(f6 * 2.9) - .5) * .35 * u);
  };
  line([[x, y], [x, y + h], [x + w, y + h]], { lw: 2.5, a });
  const pts = [];
  for (let i = 0; i <= 320; i++) { const tt = t - span + span * i / 320, v = f(tt); if (v !== null) pts.push([x + w * i / 320, y + h - v * h]); }
  if (pts.length > 1) {
    line(pts, { lw: 3.5, a });
    const lp = pts[pts.length - 1]; X.save(); X.globalAlpha *= a; X.fillStyle = C.ink; X.beginPath(); X.arc(lp[0], lp[1], 7, 0, TAU); X.fill(); X.restore();
  }
}
