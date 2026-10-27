// fx.js: the lyric typesetter, line icons and small UI pieces. All black and white.

// ================================================================ lyrics
// Every card gets its own place and type: a line (sometimes tilted up to 45°), a stack of words that all fill
// one width, a staircase, a curve, words scattered across the screen, or one word at a time. Lyrics sit on
// top of everything with a halo in the ground colour, so they can cross the terminals. Words leave in
// reading order, so the last ones stay up longest.
const _lay = new Map();
const _pre = new Map();
function prefixW(s, o, i) {           // width of s[0..i), memoised (kerning-correct letter positions)
  const k = s + '|' + fontStr(o) + '|' + i;
  if (!_pre.has(k)) _pre.set(k, measure(s.slice(0, i), o));
  return _pre.get(k);
}
const IMPORTANT = new Set(['prompt', 'continue', 'almost', 'heartbeat', 'empty', 'room', 'tonight', 'sleep', 'mother', 'questions', 'there']);
const MIDX = 1065;                     // middle of the grid
const DEG = Math.PI / 180;
const PLACES = {
  tl: { style: 'line', x: 300, y: 190, al: 'left', maxW: 1450 },
  tc: { style: 'line', x: MIDX, y: 170, al: 'center', maxW: 1500 },
  mid: { style: 'line', x: MIDX, y: 540, al: 'center', maxW: 1500, big: 190, maxH: 420 },
  midsp: { style: 'line', x: MIDX, y: 520, al: 'center', maxW: 1500, set: 'garamond', big: 180 },
  bl: { style: 'line', x: 300, y: 900, al: 'left', maxW: 1300 },
  br: { style: 'line', x: 1850, y: 900, al: 'right', maxW: 1300 },
  diagR: { style: 'line', x: 1420, y: 560, al: 'center', maxW: 1050, rot: -34 * DEG, maxH: 360 },
  diagL: { style: 'line', x: 760, y: 540, al: 'center', maxW: 1050, rot: 28 * DEG, maxH: 360 },
  stackL: { style: 'stack', x: 300, y: 90, w: 600, al: 'left', hMax: 860 },
  stackR: { style: 'stack', x: 1850, y: 90, w: 600, al: 'right', hMax: 860 },
  stairs: { style: 'stairs', x: 300, y: 170, maxW: 1500, dy: 120 },
  curve: { style: 'curve', x0: 330, x1: 1830, y: 820, amp: 120 },
  one: { style: 'one', x: MIDX, y: 600, maxW: 1450 },
  scatter: { style: 'scatter' },
  huge: { style: 'line', x: MIDX, y: 540, al: 'center', maxW: 1650, big: 260, maxH: 620 },
  bridge: { style: 'line', x: MIDX, y: 210, al: 'center', maxW: 1500, big: 210, maxH: 400, set: 'sans' },
  chat: { style: 'line', x: 1350, y: 900, al: 'left', maxW: 520, big: 110, rot: -6 * DEG },
  // verse 1: quiet lines in the empty space above the chat and right of it
  top: { style: 'line', x: 300, y: 150, al: 'left', maxW: 1560, maxH: 150 },
  topR: { style: 'line', x: 1860, y: 150, al: 'right', maxW: 1560, maxH: 150 },
  side: { style: 'line', x: 1370, y: 640, al: 'left', maxW: 500, maxH: 260 },
  // verse 3: right of the phone, above the API bill (phone.js)
  v3L: { style: 'line', x: 830, y: 330, al: 'left', maxW: 1030, maxH: 420 },
  v3S: { style: 'stack', x: 1860, y: 50, w: 560, al: 'right', hMax: 680 },
  v3St: { style: 'stairs', x: 830, y: 20, maxW: 1040 },
  v3C: { style: 'line', x: 1345, y: 400, al: 'center', maxW: 1030, maxH: 440 },
};
// where each card goes: a different place every time, even when a line comes back
const ORDER = {
  v1: ['top', 'topR', 'side', 'top', 'side', 'top'],
  pre1: ['tc', 'bl', 'stackL', 'tl', 'mid', 'br', 'tc', 'stackL', 'one'],
  ch1: ['stackL', 'br', 'tl', 'stackR', 'midsp', 'bl', 'tl', 'one', 'tc'],
  v2: ['tl', 'bl', 'stackL', 'diagR', 'scatter', 'bl', 'stairs', 'one'],
  pre2: ['br', 'tl', 'diagL', 'stackR', 'curve', 'tc', 'mid', 'bl', 'one'],
  ch2: ['tc', 'stackR', 'bl', 'diagL', 'midsp', 'br', 'stackL', 'curve', 'mid'],
  v3: ['v3L', 'v3S', 'v3St', 'v3C'],
  pre3: ['tl', 'br', 'stackL', 'diagR', 'curve', 'tc', 'one'],
  ch3: ['stackL', 'one', 'stackR', 'bl', 'huge', 'diagR', 'stackL', 'stackR', 'huge'],
  out: ['chat', 'chat'],
};
// one style for the user's own lines: the prompts are typed in mono, the rest keep their face every chorus.
// A word that keeps moving, only once each (only: the one section it moves in):
//  'away' drifts off to the right as if you were walking toward it, 'stay' keeps still while the rest floats up
const LINE = {
  pre: { "It's right around the corner": { move: 'away', word: 'corner', only: 'pre1' } },
  ch: {
    'Just one more prompt': { set: 'jet', fx: 'type' }, "Then I'll go to sleep": { set: 'garamond', fx: 'plain' },
    'Just one more try': { set: 'jet', fx: 'type' }, "It's almost complete": { set: 'fraunces', fx: 'plain' },
    'Continue, continue': { set: 'jet', fx: 'type' }, 'It tells me to stay': { set: 'play', fx: 'plain', move: 'stay', word: 'stay', only: 'ch2' },
    "We're almost there": { set: 'sans', fx: 'plain' }, 'Almost there': { set: 'sans', fx: 'plain', move: 'away', word: 'there', only: 'ch1' },
  },
};
const lineSpec = c => (LINE[c.sec.slice(0, c.sec.startsWith('pre') ? 3 : 2)] || {})[c.text];
const FONTSETS = ['sans', 'play', 'courier', 'garamond', 'sansit', 'jet', 'bodoni', 'fraunces', 'courier', 'garamond', 'play', 'sans', 'fraunces', 'space'];
// the video starts plain and gets louder: verse 1 is one quiet serif with no animation; each stage adds fonts,
// ways in, tilts and glitches (stage 3, from verse 3 on, has everything)
const STAGE = { v1: 0, pre1: 1, ch1: 1, v2: 2, pre2: 2, ch2: 2 };
const stageOf = c => STAGE[c.sec] ?? 3;
const SETS_AT = [['calm'], ['garamond', 'fraunces', 'garamond', 'play'], ['garamond', 'courier', 'play', 'fraunces', 'garamond', 'jet'], FONTSETS];
const FX_AT = [['plain'], ['plain', 'type', 'plain'], ['plain', 'type', 'still', 'drop', 'plain'], ['plain', 'drop', 'type', 'plain', 'still']];
// filling up from the bottom only once (the last "complete"), and one blurred shadow in the whole video
// "empty room" just appears: nothing bounces in an empty room
const fxFor = c => c.sec === 'ch3' && c.text === "It's almost complete" ? 'fill' : c.sec === 'ch3' && c.text === 'It tells me to stay' ? 'soft' : c.text === 'In an empty room' ? 'still' : null;
// high-contrast faces with hairline strokes: only ever at modest sizes
const HAIRLINE = new Set(['play', 'bodoni', 'serif', 'ital']), HAIR_MAX = 110;
// scatter: words land far apart, in reading order
const SCAT = [[300, 190], [1180, 150], [1560, 330], [720, 330], [330, 560], [1050, 520], [1480, 660], [640, 790], [1200, 860], [320, 980], [1600, 990]];
// the last "go to sleep": "g", nothing, then "go"
const isStutter = (c, w) => c.sec === 'ch3' && c.text === "Then I'll go to sleep" && w.w === 'go';
const STUT = [.14, .3];
// torn into slices of different fonts: the first "continue" and the last "almost" of the final chorus
const isBedGlitch = (c, w) => c.sec === 'ch3' && ((c.text === 'Continue, continue' && w === c.words[0]) || (c.text === "We're almost" && w.w.startsWith('almost')));
// "tonight", "soon" (never "sleep"): the word flickers between itself and what it really means, then stays that way
const swapOf = (c, w) => { const a = w.ann; return a && a.startsWith('strike') && w.w !== 'sleep' ? a.split(':')[1] : null; };
const SWAP_FLICK = .7;
const swapped = (tk, t) => { const lt = t - tk.word.t - .3; return lt >= SWAP_FLICK || (lt >= 0 && hash(Math.floor(t * 26) + tk.i * 3.1) < .2 + .7 * lt / SWAP_FLICK); };
// "I'm so proud of you": "you" becomes a beating heart (pre 1 and 3); in pre 2 it stays the word
const heartMode = c => !c.words.some(w => w.ann === 'heart') || c.sec === 'pre2' ? null : 'replace';
// the second "continue" of the later choruses: mirrored, then upside down
const flipOf = (c, tk) => c.text === 'Continue, continue' && tk.i === 1 ? { ch2: 'mirror', ch3: 'flip' }[c.sec] : null;

function tokStyle(set, w, imp, big) {
  // one plain serif for every word; only a circled word stands out, in capitals
  if (set === 'calm') return w.ann === 'circle' ? { o: { f: 'garamond', w: 500, size: big * .6, track: big * .02 }, up: true }
    : { o: { f: 'garamond', w: 400, size: big * .55 }, up: false };
  if (set === 'jet') return w.big ? { o: { f: 'jet', w: 800, size: imp ? big * .82 : big * .66 }, up: false }
    : { o: { f: 'jet', w: 400, size: Math.max(34, big * .42) }, up: false };
  if (set === 'courier') return w.big ? { o: { f: 'courier', w: 700, size: imp ? big * .9 : big * .72 }, up: false }
    : { o: { f: 'courier', it: true, w: 400, size: Math.max(36, big * .44) }, up: false };
  if (set === 'space') return w.big ? { o: { f: 'space', w: 700, size: imp ? big * .8 : big * .64 }, up: true }
    : { o: { f: 'space', w: 400, size: Math.max(32, big * .38) }, up: false };
  if (set === 'sans') return w.big ? { o: { f: 'sans', w: 900, size: imp ? big : big * .74, track: -big * .02 }, up: true }
    : { o: { f: 'sans', w: 400, size: Math.max(32, big * .38) }, up: false };
  if (set === 'sansit') return w.big ? { o: { f: 'sans', it: true, w: 800, size: big * (imp ? 1.05 : .9) }, up: false }
    : { o: { f: 'sans', it: true, w: 300, size: Math.max(36, big * .46) }, up: false };
  if (set === 'round') return { o: { f: 'round', size: w.big ? big * 1.2 : big * .85, w: w.big ? 800 : 400 }, up: false };
  if (set === 'play') return w.big ? { o: { f: 'play', w: 900, it: imp, size: imp ? big * 1.05 : big * .82 }, up: false }
    : { o: { f: 'play', it: true, w: 400, size: Math.max(38, big * .46) }, up: false };
  if (set === 'garamond') return w.big ? { o: { f: 'garamond', w: 500, size: imp ? big * 1.05 : big * .8, track: big * .03 }, up: true }
    : { o: { f: 'garamond', it: true, w: 400, size: Math.max(40, big * .52) }, up: false };
  if (set === 'bodoni') return w.big ? { o: { f: 'bodoni', w: 900, size: imp ? big * 1.1 : big * .85 }, up: false }
    : { o: { f: 'bodoni', w: 400, size: Math.max(36, big * .42) }, up: false };
  if (set === 'fraunces') return w.big ? { o: { f: 'fraunces', w: 900, size: imp ? big * 1.05 : big * .8 }, up: false }
    : { o: { f: 'fraunces', w: 300, size: Math.max(36, big * .42) }, up: false };
  if (set === 'soft') return { o: { f: 'ital', it: true, size: w.big ? big * 1.2 : big * .66 }, up: false };
  if (set === 'mono') return w.big ? { o: { f: 'mono', w: 600, size: imp ? big * .74 : big * .56, track: big * .07 }, up: true }
    : { o: { f: 'mono', size: Math.max(28, big * .3), track: 4 }, up: false };
  if (!w.big) return set === 'ital' ? { o: { f: 'ital', it: true, size: Math.max(40, big * .52) }, up: false }
    : { o: { f: 'round', size: Math.max(32, big * .36), w: 600 }, up: false };
  return { o: { f: 'serif', size: imp ? big : big * .72 }, up: true };
}
function cardLayout(ci) {
  if (_lay.has(ci)) return _lay.get(ci);
  const c = CARDS[ci], kind = c.kind, ai = kind === 'ai';
  const huge = c.sec === 'ch3' && (c.text === 'Continue, continue' || c.text === "We're almost");
  const idx = CARDS.filter(d => d.sec === c.sec).indexOf(c), order = ORDER[c.sec] || ['tc'], stage = stageOf(c), sets = SETS_AT[stage];
  const spec = lineSpec(c) || {}, place = huge ? 'huge' : null;
  let P = kind === 'bridge' ? PLACES.bridge : PLACES[place || order[idx % order.length]];
  // pre-chorus 2: the top and bottom rows are full of progress, so its lines keep their alignment but sit on the terminals' row
  if (c.sec === 'pre2' && P.style === 'line') P = { ...P, y: 517, maxH: Math.min(P.maxH || 330, 300) };
  let set = stage === 0 ? 'calm' : ai ? 'round' : huge ? 'fraunces' : spec.set || P.set || (P.style === 'scatter' ? ['sansit', 'sans'][ci % 2] : sets[Math.floor(hash(ci * 5.7 + 1) * sets.length)]);
  if (HAIRLINE.has(set) && (P.style === 'stack' || P.style === 'one')) set = ci % 2 ? 'garamond' : 'fraunces';
  const mk = big => c.words.map((w, i) => {
    const imp = huge || kind === 'bridge' || IMPORTANT.has(w.w.toLowerCase().replace(/[^a-z]/g, ''));
    const { o, up } = tokStyle(set, w, imp, big);
    if (HAIRLINE.has(o.f) && o.size > HAIR_MAX) { if (o.track) o.track *= HAIR_MAX / o.size; o.size = HAIR_MAX; }
    let s = up ? w.w.toUpperCase() : w.w.toLowerCase().replace(/^i('|$)/, 'I$1');
    return { i, s, o, w: measure(s, o), word: w, rot: 0 };
  });
  const gapOf = big => ai ? big * .3 : big * .22, lhOf = big => ai ? big * 1.25 : set === 'calm' ? big * .72 : big * .98;
  let toks, rot = 0, ax = P.x, ay = P.y;
  if (P.style === 'line') {
    const maxH = P.maxH || 330;
    let big = P.big || (ai ? 80 : 160), lines;
    for (; ; big -= 4) {
      toks = mk(big); lines = [[]]; let cw = 0;
      for (const tk of toks) {
        if (lines[lines.length - 1].length && cw + gapOf(big) + tk.w > P.maxW) { lines.push([]); cw = 0; }
        cw += (lines[lines.length - 1].length ? gapOf(big) : 0) + tk.w; lines[lines.length - 1].push(tk);
      }
      if ((lines.length <= 2 && lhOf(big) * (lines.length - 1) + big * .75 <= maxH) || big < 36) break;
    }
    const lh = lhOf(big);
    lines.forEach((l, li) => {
      const lw = l.reduce((q, tk) => q + tk.w, 0) + gapOf(big) * (l.length - 1);
      let x = P.al === 'right' ? ax - lw : P.al === 'center' ? ax - lw / 2 : ax;
      const y = ay - lh * (lines.length - 1) / 2 + li * lh + big * .3;
      l.forEach(tk => { tk.x = x; tk.y = y; x += tk.w + gapOf(big); });
    });
    rot = P.rot ?? (stage < 2 ? 0 : { human: -1.5, chorus: -2, ai: 2, bridge: 0 }[kind] || 0) * DEG;
  } else if (P.style === 'stack') {
    // every word on its own line, each scaled to the same width
    toks = mk(100);
    const fit = k => toks.forEach(tk => {
      const f = Math.min(P.w * k / tk.w * tk.o.size, (tk.word.big ? 240 : 110) * k);
      tk.o = { ...tk.o, size: f, track: tk.o.track ? tk.o.track * f / tk.o.size : 0 }; tk.w = measure(tk.s, tk.o);
    });
    fit(1);
    const adv = tk => tk.o.size * (tk.o.f === 'serif' ? .86 : .92);
    let total = toks.reduce((q, tk) => q + adv(tk), 0);
    if (total > P.hMax) { fit(P.hMax / total); total = toks.reduce((q, tk) => q + adv(tk), 0); }
    let y = P.y + (P.hMax - total) / 2;
    toks.forEach(tk => { y += adv(tk); tk.y = y - tk.o.size * .1; tk.x = P.al === 'right' ? P.x - tk.w : P.x; });
  } else if (P.style === 'stairs') {
    // each word sits one step down and right of the last, touching it: the step is the word's own height
    let big = 170, gap;
    for (; ; big -= 4) { toks = mk(big); gap = big * .12; if (toks.reduce((q, tk) => q + tk.w, 0) + gap * (toks.length - 1) <= P.maxW || big < 36) break; }
    const step = tk => tk.o.size * .62;
    let total = toks.slice(1).reduce((q, tk) => q + step(tk), 0), k = Math.min(1, 700 / Math.max(1, total));
    let x = P.x, y = P.y + (700 - total * k) / 2;
    toks.forEach((tk, i) => { if (i) y += step(tk) * k; tk.x = x; tk.y = y; x += tk.w + gap; });
  } else if (P.style === 'curve') {
    // one wave across the screen; every word sits on it, turned with the slope
    const yAt = x => P.y - P.amp * Math.sin((x - P.x0) / (P.x1 - P.x0) * TAU * .9 + .4);
    let big = 150;
    for (; ; big -= 4) { toks = mk(big); if (toks.reduce((q, tk) => q + tk.w, 0) + gapOf(big) * (toks.length - 1) <= (P.x1 - P.x0) * .92 || big < 36) break; }
    let x = P.x0;
    toks.forEach(tk => { tk.x = x; tk.y = yAt(x); tk.rot = clamp(Math.atan2(yAt(x + tk.w) - tk.y, tk.w), -45 * DEG, 45 * DEG); x += tk.w + gapOf(big); });
  } else if (P.style === 'one') {
    // one word at a time, as big as it fits, in the middle
    toks = mk(260);
    toks.forEach((tk, i) => {
      const k = Math.min(1, P.maxW / tk.w);
      tk.o = { ...tk.o, size: tk.o.size * k * (tk.word.big ? 1 : 1.5), track: (tk.o.track || 0) * k }; tk.w = measure(tk.s, tk.o);
      if (tk.w > P.maxW) { tk.o.size *= P.maxW / tk.w; tk.w = measure(tk.s, tk.o); }
      tk.x = P.x - tk.w / 2; tk.y = P.y + tk.o.size * .3;
      tk.until = i < toks.length - 1 ? c.words[i + 1].t : 1e9;
    });
  } else {
    // a one-letter word ("a", "I") never stands alone: it lands with the word after it
    toks = mk(170);
    let spot = 0;
    toks.forEach((tk, i) => {
      const prev = toks[i - 1], glued = prev && prev.s.length === 1;
      if (glued) { tk.x = prev.x + prev.w + 170 * .22; tk.y = prev.y; return; }
      const nx = tk.s.length === 1 && toks[i + 1] ? toks[i + 1].w + 170 * .22 : 0, [px, py] = SCAT[(spot++ * 4 + ci) % SCAT.length];
      tk.x = clamp(px, 290, W - 50 - tk.w - nx); tk.y = py;
    });
  }
  // words leave in reading order: the first ones a little before the card's end, the last ones well after
  const n = toks.length, next = CARDS[ci + 1], cap = next && next.sec !== 'out' ? Math.max(next.words[0].t + .1, c.words[n - 1].t + .6) : 1e9;
  toks.forEach((tk, i) => { tk.exit = Math.min(cap, c.hide + lerp(-.1, .8, n > 1 ? i / (n - 1) : 1)); });
  if (c.sec === 'ch3' && c.text === "We're almost") { toks[0].exit = c.words[1].t + 1; toks[1].exit = c.hide + 2; toks[1].fade = 1.8; }   // the very end: only "almost" is left, fading slowly
  // how it stands off the picture: mostly a thin border in the ground colour, sometimes nothing
  // (never in the pre-choruses, where the words cross the progress bars' black squares)
  const back = hash(ci * 3.3 + .7) < .25 && !c.sec.startsWith('pre') ? 'none' : 'stroke';
  // how its big words come in
  const fxs = FX_AT[stage], fx = ai ? 'plain' : fxFor(c) || spec.fx || fxs[(ci * 2 + 1) % fxs.length];
  const L = { toks, ax, ay, rot, set, back, fx, style: P.style, end: Math.max(Math.min(cap, c.hide + .8), ...toks.map(tk => tk.exit)), move: !spec.only || spec.only === c.sec ? spec.move : null, mword: spec.word };
  _lay.set(ci, L); return L;
}

function drawCard(ci, t, fg) {
  const c = CARDS[ci], L = cardLayout(ci);
  if (t < c.start - .1 || t >= L.end) return;
  const hm = heartMode(c), back = fg === C.ink ? L.back : 'none';     // white text needs no border
  X.save();
  X.translate(L.ax, L.ay); X.rotate(L.rot); X.translate(-L.ax, -L.ay);
  try {
    for (const pass of [0, 1]) {
      if (pass === 0 && back === 'none') continue;
      for (const tk of L.toks) {
        const tw = tk.word.t;
        if (t >= tk.exit || (tk.until && t >= tk.until + .05)) continue;
        const exA = 1 - ease(seg(t, tk.exit - (tk.fade || .25), tk.exit));
        HALO_W = pass === 0 ? clamp(tk.o.size * .028, 3, 7) : 0;
        drawTok(c, L, tk, t, fg, exA, hm);
        HALO_W = 0;
      }
    }
  } finally { HALO_W = 0; X.restore(); }
}
const bounce = x => { x = clamp(x); const n = 7.5625, d = 2.75;
  return x < 1 / d ? n * x * x : x < 2 / d ? n * (x -= 1.5 / d) * x + .75 : x < 2.5 / d ? n * (x -= 2.25 / d) * x + .9375 : n * (x -= 2.625 / d) * x + .984375; };
function drawTok(c, L, tk0, t, fg, exA, hm) {
  const w = tk0.word, tw = w.t, ann = w.ann, ex = seg(t, tk0.exit - (tk0.fade || .25), tk0.exit), sw = swapOf(c, w), still = L.fx === 'still';
  let tk = sw && swapped(tk0, t) ? swapTok(tk0, sw) : tk0;
  if (isStutter(c, w) && t >= tw && t < tw + STUT[1]) {
    if (t >= tw + STUT[0]) return;
    tk = tk0.stut || (tk0.stut = { ...tk0, s: tk0.s[0], w: measure(tk0.s[0], tk0.o) });
  }
  X.save();
  if (!still) X.translate(0, -24 * ease(ex));
  const [mx, my] = motionOf(c, L, tk0, t); if (mx || my) X.translate(mx, my);
  if (tk.rot) { X.translate(tk.x, tk.y); X.rotate(tk.rot); X.translate(-tk.x, -tk.y); }
  const flip = flipOf(c, tk);
  if (flip) { const cx = tk.x + tk.w / 2, cy = tk.y - tk.o.size * .36; X.translate(cx, cy); X.scale(flip === 'mirror' ? -1 : 1, flip === 'flip' ? -1 : 1); X.translate(-cx, -cy); }
  const pulse = ann === 'pulse' ? 1 + .1 * beatPulse(t, 9) : 1;
  if (hm && tk.s.toLowerCase() === 'you') { if (!HALO_W) youHeart(tk, t, fg, exA, hm); }
  else if (isBedGlitch(c, w) && t >= tw) bedGlitch(tk, t, fg, exA);
  else if (w.big && c.kind !== 'ai') bigWord(c, L.fx, tk, t, fg, exA, pulse);
  else if (w.big && c.kind === 'ai') sampledWord(tk, t, fg, exA);
  else {
    const p = clamp((t - tw + .04) / .2);
    if (p > 0) {
      X.save(); X.translate(tk.x, tk.y + (still ? 0 : 16 * (1 - easeOut(p))));
      if (pulse !== 1) X.scale(pulse, pulse);
      if (L.fx === 'soft' && !HALO_W) softShadow(tk.o.size, fg);
      txtGlitch(tk.s, 0, 0, { ...tk.o, col: fg, a: p * exA }, tk.i * 7, t);
      X.restore();
    }
  }
  annotate(c, tk, t, fg, exA);
  X.restore();
}
// words that keep moving after they land (see LINE)
function motionOf(c, L, tk, t) {
  if (!L.move) return [0, 0];
  const own = L.mword && tk.word.w.toLowerCase().replace(/[^a-z]/g, '') === L.mword, lt = Math.max(0, t - tk.word.t);
  if (L.move === 'push') return [28 * Math.max(0, t - c.start), 0];
  if (L.move === 'away' && own) return [70 * lt * (1 + .15 * lt), 0];
  if (L.move === 'stay' && !own) return [0, -22 * lt];
  return [0, 0];
}
function swapTok(tk, s) {
  if (!tk.swap) {
    const up = /[A-Z]/.test(tk.s) && tk.s === tk.s.toUpperCase(), ss = up ? s.toUpperCase() : s, w = measure(ss, tk.o);
    tk.swap = { ...tk, s: ss, w, x: Math.min(tk.x, W - 50 - w) };   // starts where the word did (unless it would run off the edge)
  }
  return tk.swap;
}
// a blurred drop shadow (black under black text reads as grey; white text gets a dark one)
function softShadow(size, fg) {
  X.shadowColor = fg === C.ink ? 'rgba(0,0,0,.45)' : 'rgba(0,0,0,.9)'; X.shadowBlur = size * .18; X.shadowOffsetX = size * .04; X.shadowOffsetY = size * .07;
}
// a big word, letter by letter. fx: still (the whole word fades in, nothing moves), plain (scale in from a ghost, outline then fill),
// fill (outlines that fill up from the bottom like a progress bar), type (one letter per keystroke, with a caret),
// drop (letters fall in and bounce), soft (plain with a blurred shadow)
function bigWord(c, fx, tk, t, fg, exA, pulse) {
  const w = tk.word, tw = w.t, ann = w.ann, size = tk.o.size, still = fx === 'still';
  const fillUp = fx === 'fill' ? ease((t - tw - .05) / Math.max(.7, Math.min(1.6, (tk.exit - tw) * .6))) : 0;
  let lastX = null;
  for (let k = 0; k < tk.s.length; k++) {
    const lt = t - (tw + (still ? 0 : k * (fx === 'type' ? .05 : .028)) - (isStutter(c, w) && t >= tw + STUT[1] ? 1 : 0));
    const p = fx === 'type' ? (lt >= 0 ? 1 : 0) : still ? clamp((lt + .04) / .2) : clamp(lt / (fx === 'drop' ? .36 : .24));
    if (p <= 0) continue;
    const gone = ann === 'fade' ? ease((t - tw - .8 - k * .12) / .25) : 0;    // "mother": letters drop out one by one
    if (gone >= 1) continue;
    const x0 = tk.x + prefixW(tk.s, tk.o, k), cw = prefixW(tk.s, tk.o, k + 1) - prefixW(tk.s, tk.o, k);
    lastX = x0 + cw;
    const sc = (fx === 'type' || fx === 'drop' || still ? 1 : lerp(1.45, 1, backOut(p))) * pulse;
    const dy = fx === 'drop' ? -70 * (1 - bounce(p)) : 0;
    const fillA = ann === 'hollow' || fx === 'fill' ? 0 : fx === 'type' || still ? 1 : ease((lt - .1) / .28);
    X.save(); X.translate(x0 + cw / 2, tk.y + gone * 40 + dy); X.scale(sc, sc);
    const o = glitchFont({ ...tk.o, track: 0, al: 'center', a: (still ? p : clamp(p * 3)) * exA * (1 - gone) }, k + tk.i * 13, t), ch = tk.s[k];
    {
      if (fx === 'soft' && !HALO_W && fillA > .5) softShadow(size, fg);
      if (fx !== 'type' && (!still || fillA < 1)) txt(ch, 0, 0, { ...o, stroke: fg, sw: 2.2, fillOff: true });
      if (fillA > 0) txt(ch, 0, 0, { ...o, col: fg, a: o.a * fillA });
      if (fillUp > 0 && !HALO_W) {
        const yl = lerp(size * .25, -size * .9, fillUp) + Math.sin(t * 9 + k) * size * .015 * (1 - fillUp);
        X.save(); X.beginPath(); X.rect(-cw * 2, yl, cw * 4, size * 1.5); X.clip(); txt(ch, 0, 0, { ...o, col: fg }); X.restore();
      }
    }
    X.restore();
  }
  // one caret, after the last letter typed so far: it moves on when the next word starts
  const nextW = c.words[tk.i + 1], caretTo = nextW ? nextW.t : Math.min(tk.exit - .25, tw + tk.s.length * .05 + 1.2);
  if (fx === 'type' && lastX !== null && !HALO_W && t < caretTo && (t < tw + tk.s.length * .05 || frac(t * 2.5) < .6))
    rrect(lastX + size * .04, tk.y - size * .72, size * .07, size * .8, 0, { fill: fg, a: exA });
}
// "you" as a heart that beats with the music
function youHeart(tk, t, fg, a, mode) {
  const tw = tk.word.t; if (t < tw) return;
  const pop = backOut(clamp((t - tw) / .3)), beat = 1 + .3 * beatPulse(t, 8);
  if (mode === 'after') {
    txt(tk.s, tk.x, tk.y, { ...tk.o, col: fg, a: a * clamp((t - tw) / .15) });
    const hs = Math.max(50, tk.o.size * .95);
    heart(tk.x + tk.w + hs * .62, tk.y - tk.o.size * .32, hs * pop * beat, { fill: fg, a });
  } else {
    const hs = Math.max(60, tk.o.size * 1.15);
    heart(tk.x + tk.w / 2, tk.y - tk.o.size * .32, hs * pop * beat, { fill: fg, a });
  }
}
// "sleep", the last time: torn slices, each in a different font for a moment (the letters never change)
function bedGlitch(tk, t, fg, a) {
  const f = Math.floor(t * 16), live = t < tk.word.t + 1.2, o = { ...tk.o, col: fg, a }, h = tk.o.size;
  if (!live) { txt(tk.s, tk.x, tk.y, o); return; }
  for (let i = 0; i < 6; i++) {
    const y0 = tk.y - h + i * h * 1.2 / 6, dx = (hash(f * 7.1 + i) - .5) * 70, g = GLF[Math.floor(hash(f * 3.3 + i * 1.7) * GLF.length)];
    const oi = hash(f * 1.3 + i) > .45 ? { ...o, f: g.f, it: !!g.it, w: g.w || 400 } : o;
    X.save(); X.beginPath(); X.rect(tk.x - 100, y0, tk.w + 300, h * 1.2 / 6 + 1); X.clip();
    txt(tk.s, tk.x + dx, tk.y, oi); X.restore();
  }
}

function annotate(c, tk, t, fg, a) {
  const ann = tk.word.ann, tw = tk.word.t, s = tk.o.size;
  if (!ann || t < tw) return;
  const x0 = tk.x, x1 = tk.x + tk.w, yb = tk.y, yt = tk.y - s * .72;
  if (ann === 'circle') {
    const k = ease((t - tw - .35) / .5), cx = (x0 + x1) / 2, cy = (yb + yt) / 2, rx = (x1 - x0) / 2 + 34, ry = (yb - yt) / 2 + 30;
    const pts = []; for (let i = 0; i <= 64; i++) { const u = i / 64, ang = -2.2 + u * TAU * 1.08; pts.push([cx + Math.cos(ang) * rx * (1 + .04 * Math.sin(u * 9)), cy + Math.sin(ang) * ry * (1 + .05 * Math.cos(u * 7))]); }
    line(boilPts(partial(pts, k), 2.4, 3), { col: fg, lw: 3.2, a });
  } else if (ann === 'scribble') {
    const k = ease((t - tw - .3) / .45), pts = [];
    for (let i = 0; i <= 60; i++) { const u = i / 60; pts.push([lerp(x0, x1, u), yb + 22 + Math.sin(u * 26) * 7]); }
    line(boilPts(partial(pts, k), 2, 5), { col: fg, lw: 3, a });
  }
}

function drawLyrics(t, fg) {
  for (let i = 0; i < CARDS.length; i++) {
    const c = CARDS[i];
    if (c.sec === 'out' || t < c.start - .1 || t >= cardLayout(i).end) continue;                         // both "continue?"s live in the chat (scenes.js)
    if (c.kind === 'bridge') drawBridgeCard(i, t, fg); else drawCard(i, t, fg);
  }
}
// the answer is always the same word, somewhere else each time, in another voice
const ALMOST_AT = [[1420, 700, 'round'], [420, 760, 'sansit'], [1250, 880, 'mono'], [640, 650, 'sans']];
function drawBridgeCard(ci, t, fg) {
  drawCard(ci, t, fg);
  const c = CARDS[ci], at = c.answer, a = 1 - ease(seg(t, c.hide + .4, c.hide + .7));
  if (t < at || t >= c.hide + .7) return;
  const p = clamp((t - at) / .3), n = CARDS.filter(d => d.kind === 'bridge').indexOf(c), [x, y, f] = ALMOST_AT[n % 4];
  const o = { f: f === 'sansit' ? 'sans' : f, it: f === 'sansit', w: f === 'sans' ? 900 : f === 'sansit' ? 300 : 400, size: f === 'sansit' ? 96 : 70, col: fg, a: p * a, track: f === 'mono' ? 14 : 0 };
  const s = f === 'sans' ? 'ALMOST.' : 'almost.', yy = y + 10 * (1 - easeOut(p));
  if (fg === C.ink) { HALO_W = 5; txt(s, x, yy, o); HALO_W = 0; }
  txt(s, x, yy, o);
}

// ================================================================ icons (line art, ink)
function heart(x, y, s, o = {}) {
  X.save(); X.translate(x, y); X.globalAlpha *= o.a ?? 1; X.beginPath();
  X.moveTo(0, s * .38);
  X.bezierCurveTo(-s * .06, s * .32, -s * .52, s * .06, -s * .52, -s * .2);
  X.bezierCurveTo(-s * .52, -s * .46, -s * .2, -s * .58, 0, -s * .32);
  X.bezierCurveTo(s * .2, -s * .58, s * .52, -s * .46, s * .52, -s * .2);
  X.bezierCurveTo(s * .52, s * .06, s * .06, s * .32, 0, s * .38);
  if (o.stroke) { X.strokeStyle = o.stroke; X.lineWidth = o.lw || 3; X.lineJoin = 'round'; X.stroke(); }
  if (o.fill) { X.fillStyle = o.fill; X.fill(); }
  X.restore();
}
// coffee mug on a saucer; steam 0..1
function mug(x, y, s, steam, t, o = {}) {
  const col = o.col || C.ink, lw = Math.max(2.5, s * .035);
  X.save(); X.translate(x, y); X.globalAlpha *= o.a ?? 1; X.strokeStyle = col; X.lineWidth = lw; X.lineCap = 'round'; X.lineJoin = 'round';
  X.beginPath(); X.moveTo(-s * .32, -s * .22); X.lineTo(s * .32, -s * .22); X.lineTo(s * .28, s * .22);
  X.quadraticCurveTo(s * .26, s * .3, s * .16, s * .3); X.lineTo(-s * .16, s * .3); X.quadraticCurveTo(-s * .26, s * .3, -s * .28, s * .22); X.closePath();
  X.fillStyle = o.fill || C.paper; X.fill(); X.stroke();
  X.beginPath(); X.arc(s * .34, s * .0, s * .12, -Math.PI / 2 + .25, Math.PI / 2 - .25); X.stroke();
  X.beginPath(); X.ellipse(0, s * .36, s * .5, s * .06, 0, 0, TAU); X.stroke();
  X.beginPath(); X.moveTo(-s * .28, -s * .14); X.lineTo(s * .29, -s * .14); X.globalAlpha *= .35; X.stroke(); X.globalAlpha /= .35;
  // steam: wavy wisps rising; as it cools, fewer and fewer of them are born (steam 1 → 0)
  for (let k = 0; k < 9; k++) {
    const per = 2.2 + hash(k * 5.1) * .8, u = frac(t / per + hash(k * 9.3));
    if (hash(k * 3.7 + 1) > (o.steamAt ? o.steamAt(t - u * per) : steam)) continue;     // decided when the wisp is born
    const lane = ((k % 3) - 1) * s * .14 + (hash(k * 2.9) - .5) * s * .05, base = -s * .3 - u * s * .35, len = s * (.22 + .12 * u), pts = [];
    for (let j = 0; j <= 16; j++) { const v = j / 16; pts.push([lane + Math.sin(v * 5.5 + t * 2.4 + k * 1.9) * s * .045 * (.6 + u), base - v * len]); }
    X.save(); X.globalAlpha *= Math.sin(u * Math.PI) * .9; X.lineWidth = Math.max(1.5, lw * .7);
    X.beginPath(); pts.forEach(([px, py], j) => j ? X.lineTo(px, py) : X.moveTo(px, py)); X.stroke(); X.restore();
  }
  X.restore();
}
function retryIcon(x, y, r, col, lw = 3) {
  X.save(); X.strokeStyle = col; X.fillStyle = col; X.lineWidth = lw; X.lineCap = 'round';
  X.beginPath(); X.arc(x, y, r, -Math.PI * .35, Math.PI * 1.45); X.stroke();
  const a = -Math.PI * .35, hx = x + Math.cos(a) * r, hy = y + Math.sin(a) * r;
  X.beginPath(); X.moveTo(hx + r * .55, hy - r * .1); X.lineTo(hx - r * .05, hy - r * .5); X.lineTo(hx - r * .1, hy + r * .25); X.closePath(); X.fill();
  X.restore();
}
function windowFrame(x, y, w, h, title, o = {}) {
  const col = o.col || C.ink, a = o.a ?? 1;
  rrect(x, y, w, h, 14, { stroke: col, lw: o.lw || 2, a, fill: o.fill });
  line([[x, y + 40], [x + w, y + 40]], { col, lw: 1.2, a });
  for (let k = 0; k < 3; k++) { X.save(); X.globalAlpha *= a; X.strokeStyle = col; X.lineWidth = 1.5; X.beginPath(); X.arc(x + 22 + k * 20, y + 20, 5.5, 0, TAU); X.stroke(); X.restore(); }
  if (o.brand) { brand(o.brand, x + 98, y + 20, 22, col, a); txt(BRAND_NAME[o.brand] + (title ? ' · ' + title : ''), x + 118, y + 27, { f: 'mono', size: 17, col, a }); }
  else if (title) txt(title, x + 90, y + 27, { f: 'mono', size: 17, col, a });
}
// one heartbeat (P wave, spike, dip, T wave), d seconds after the beat; 0 outside -0.06…0.2
const beatShape = d => d < -.06 || d > .2 ? 0 : d < 0 ? -Math.sin((d + .06) / .06 * Math.PI) * .12 : d < .035 ? Math.sin(d / .035 * Math.PI)
  : d < .07 ? -Math.sin((d - .035) / .035 * Math.PI) * .4 : Math.sin((d - .07) / .13 * Math.PI) * .18;
// heart-monitor line. spikes: array of times; speed px/s
function ecg(x0, x1, y, amp, spikes, t, o = {}) {
  const speed = o.speed || 320, pts = [];
  for (let x = x0; x <= x1; x += 3) {
    const tt = t - (x1 - x) / speed; let v = 0;
    for (const s of spikes) v += beatShape((tt - s) / (o.stretch || 1));
    pts.push([x, y - v * amp]);
  }
  // with words, the trace drawn from o.textFrom on is made of text: it turns into words from the leading edge back
  const xs = !o.words ? x1 + 20 : clamp(x1 - (t - (o.textFrom ?? -1e9)) * speed, x0 - 20, x1 + 20);
  const clipX = (a, b, fn) => { X.save(); X.beginPath(); X.rect(a, y - 200, b - a, 400); X.clip(); fn(); X.restore(); };
  if (xs > x0) clipX(x0 - 10, xs, () => line(pts, { col: o.col || C.ink, lw: o.lw || 2.5, a: o.a ?? 1 }));
  if (xs < x1) clipX(xs, x1 + 10, () => textPath(o.words, pts, { f: 'mono', w: 500, size: o.wsize || 12, col: o.col || C.ink, a: o.a ?? 1, start: -((t * speed) % 1200) }));
  // the leading dot
  const lp = pts[pts.length - 1]; X.save(); X.globalAlpha *= o.a ?? 1; X.fillStyle = o.col || C.ink; X.beginPath(); X.arc(lp[0], lp[1], 5, 0, TAU); X.fill(); X.restore();
}
// ================================================================ model marks (simplified, monochrome line art)
const BRAND_NAME = { opencode: 'opencode', claude: 'Claude', gpt: 'ChatGPT', gemini: 'Gemini', grok: 'Grok', deepseek: 'DeepSeek', meta: 'Llama', mistral: 'Mistral' };
function brand(kind, x, y, s, col = C.ink, a = 1) {
  X.save(); X.translate(x, y); X.globalAlpha *= a; X.strokeStyle = col; X.fillStyle = col; X.lineCap = 'round'; X.lineJoin = 'round';
  if (kind === 'claude') {                        // starburst
    X.lineWidth = s * .1;
    for (let i = 0; i < 11; i++) {
      const ang = i / 11 * TAU + hash(i) * .12, r1 = s * (.38 + hash(i + 7) * .12);
      X.beginPath(); X.moveTo(Math.cos(ang) * s * .1, Math.sin(ang) * s * .1); X.lineTo(Math.cos(ang) * r1, Math.sin(ang) * r1); X.stroke();
    }
  } else if (kind === 'gpt') {                    // six interlocking petals
    X.lineWidth = s * .07;
    for (let k = 0; k < 6; k++) { X.save(); X.rotate(k * TAU / 6); X.beginPath(); X.roundRect(-s * .12, -s * .46, s * .24, s * .5, s * .12); X.stroke(); X.restore(); }
  } else if (kind === 'gemini') {                 // four-point sparkle
    const r = s * .48; X.beginPath(); X.moveTo(0, -r);
    X.quadraticCurveTo(0, 0, r, 0); X.quadraticCurveTo(0, 0, 0, r); X.quadraticCurveTo(0, 0, -r, 0); X.quadraticCurveTo(0, 0, 0, -r); X.fill();
  } else if (kind === 'grok') {                   // broken ring with a slash
    X.lineWidth = s * .09; X.beginPath(); X.arc(0, 0, s * .34, .9, TAU - .5); X.stroke();
    X.beginPath(); X.moveTo(-s * .42, s * .42); X.lineTo(s * .42, -s * .42); X.stroke();
  } else if (kind === 'deepseek') {               // whale
    X.lineWidth = s * .07; X.beginPath();
    X.moveTo(-s * .3, 0); X.bezierCurveTo(-s * .2, -s * .32, s * .4, -s * .3, s * .44, s * .02); X.bezierCurveTo(s * .4, s * .25, -s * .1, s * .28, -s * .3, 0);
    X.lineTo(-s * .48, -s * .2); X.moveTo(-s * .3, 0); X.lineTo(-s * .5, s * .12); X.stroke();
    X.beginPath(); X.arc(s * .22, -s * .04, s * .04, 0, TAU); X.fill();
  } else if (kind === 'meta') {                   // infinity loop
    X.lineWidth = s * .09; X.beginPath();
    for (let i = 0; i <= 60; i++) { const u = i / 60 * TAU, d = 1 + Math.sin(u) ** 2; X.lineTo(s * .46 * Math.cos(u) / d, s * .46 * Math.sin(u) * Math.cos(u) / d); }
    X.closePath(); X.stroke();
  } else if (kind === 'opencode') {               // blocky O
    const c = s * .2;
    for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) if (i === 0 || j === 0 || i === 3 || j === 3) X.fillRect(-s * .42 + i * c * 1.05, -s * .42 + j * c * 1.05, c * .92, c * .92);
  } else if (kind === 'mistral') {                // pixel M
    const M = ['10001', '11011', '10101', '10001', '10001'], c = s * .18;
    M.forEach((r, j) => [...r].forEach((b, i) => { if (b === '1') X.fillRect(-s * .45 + i * c, -s * .45 + j * c, c * .9, c * .9); }));
  }
  X.restore();
}
