// phone.js: verse 3. The terminals give way to a phone on the lock screen, filling up with news; behind it the feed
// scrolls by and the API bill climbs on the beat. On "look up" an asteroid comes in and covers everything,
// then the black opens into the night (the spiral).
const PHONE_T = [113.7, 124.1];
const AST = [122.45, 123.8];                    // the asteroid: first speck → it fills the screen; IMPACT: the night
const IMPACT = 124.1;
const isPhone = t => t >= PHONE_T[0] && t < PHONE_T[1];
const PH = { x: 345, y: 100, w: 430, h: 880 };

// [time, icon, app, title, body]: one every 0.7 s, from the timeline to the end of the world
const NOTIFS = [['X', '@nora', 'built a SaaS in a weekend', '$10k MRR. no code. just vibes'],
  ['T', 'TechCrunch', 'Two 19-year-olds raise $40M', 'for an agent that builds agents'],
  ['X', '@devdaily', 'new model drops tonight', 'benchmarks are insane'],
  ['$', 'Anthropic Console', 'Spend alert', "You've used $1,000 of API credit"],
  ['$', 'OpenAI', 'Usage limit approaching', '92% of your monthly budget'],
  ['X', '@sec_news', 'CVEs up 400% this year', 'most of it AI-written code'],
  ['M', 'Mom', 'Missed call (3)', ''],
  ['X', '@maths', 'AI proves 40-year-old conjecture', 'mathematicians "not sure how to feel"'],
  ['N', 'BBC News', 'Hottest year on record, again', 'records broken on four continents'],
  ['X', '@ben', 'everyone is building rn', 'if you sleep you fall behind'],
  ['N', 'Reuters', 'Markets swing on AI jobs report', '"the entry-level job is gone"'],
  ['N', 'NASA', 'Comet confirmed on impact course', 'experts urge calm'],
  ['C', 'Claude', 'Task complete', 'Want me to keep going?']].map((n, i) => [114 + i * .7, ...n]);

// the feed behind the phone: posts nobody reads, in grey
const FEED = ['just mass-replaced my team with agents', 'my agent ran for 72 hours straight', 'prompt engineering is dead. long live prompt engineering',
  'context windows are 10M tokens now', 'we are so back', 'it is so over', 'shipped 14 apps this month', 'AGI by friday', 'vibe coded a unicorn',
  'you are not behind. (you are behind)', 'stop sleeping. start shipping.', 'the new model is a junior dev', 'the new model is a senior dev',
  'the new model is my therapist', 'built this in 4 minutes', 'claude code > cursor > copilot', 'rewrote it in rust (the agent did)',
  'hot take: tests are optional now', '10x engineer → 100x engineer', 'touch grass?', 'my token bill is my rent', 'it compiles. ship it.',
  'agents talking to agents talking to agents', 'just one more prompt', 'who needs sleep', 'open source model beats everything (again)'];
const HANDLES = ['@nora', '@ben', '@devdaily', '@sama_fan', '@kai', '@techbro', '@founder', '@mia', '@aidaily', '@shipfast', '@10x', '@ml_memes'];

function feedWall(t, a) {
  const cols = 4, cw = 395;
  X.save(); X.beginPath(); X.rect(SIDE + 20, 0, W - SIDE - 20, H); X.clip();
  for (let c = 0; c < cols; c++) {
    const x = 270 + c * 410, rowH = 150 + c * 9, scroll = (t - PHONE_T[0]) * (60 + c * 22) + Math.pow(Math.max(0, t - 119), 2) * 30;
    for (let k = Math.floor(scroll / rowH) - 1; k * rowH - scroll < H; k++) {
      const y = k * rowH - scroll + c * 47, id = k * 4 + c * 31;
      rrect(x, y, cw, rowH - 14, 14, { stroke: C.faint, lw: 1.5, a });
      X.save(); X.globalAlpha *= a; X.strokeStyle = C.faint; X.lineWidth = 1.5; X.beginPath(); X.arc(x + 32, y + 32, 16, 0, TAU); X.stroke(); X.restore();
      txt(pick(HANDLES, id * 7 + 3), x + 58, y + 38, { f: 'round', w: 800, size: 17, col: C.soft, a });
      txt('· ' + (1 + Math.floor(hash(id) * 59)) + 'm', x + 58 + measure(pick(HANDLES, id * 7 + 3), { f: 'round', w: 800, size: 17 }) + 8, y + 38, { f: 'round', size: 16, col: C.soft, a });
      txt(fitTo(pick(FEED, id * 5 + 1), cw - 44, { f: 'round', w: 600, size: 19 }), x + 22, y + 80, { f: 'round', w: 600, size: 19, col: C.soft, a });
      txt(`♡ ${(hash(id * 2.3) * 40).toFixed(1)}k    ↻ ${(hash(id * 3.7) * 9).toFixed(1)}k`, x + 22, y + rowH - 34, { f: 'mono', size: 15, col: C.soft, a });
    }
  }
  X.restore();
}

// the bill: dollars and tokens climbing, the spend per second beating with the music
function costPanel(t, a) {
  const x = 1380, y = 770, w = 500, h = 250, lt = Math.max(0, t - PHONE_T[0]);
  rrect(x, y, w, h, 16, { fill: C.white, stroke: C.ink, lw: 2, a });
  txt('API usage', x + 24, y + 38, { f: 'jet', size: 18, a });
  txt('live', x + w - 24, y + 38, { f: 'jet', w: 700, size: 18, al: 'right', a: a * (frac(t * 2) < .6 ? 1 : .3) });
  const usd = 312.4 + lt * 38 + Math.pow(lt, 2.2) * 6, tok = Math.floor(usd * 24310);
  txt('$' + usd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), x + 24, y + 112, { f: 'jet', w: 800, size: 62, a });
  txt(tok.toLocaleString('en-US') + ' tokens', x + 24, y + 148, { f: 'jet', size: 20, a });
  // spend per second over the verse: climbing exponentially, a heartbeat on every beat
  const gx0 = x + 24, gx1 = x + w - 24, gy = y + 228, gh = 62, span = PHONE_T[1] - PHONE_T[0], pts = [];
  for (let gx = gx0; gx <= gx1; gx += 2) {
    const tt = PHONE_T[0] + (gx - gx0) / (gx1 - gx0) * span; if (tt > t) break;
    const g = (Math.exp(2.6 * (tt - PHONE_T[0]) / span) - 1) / (Math.exp(2.6) - 1), hb = BEATS.reduce((q, b) => q + beatShape(tt - b), 0);
    pts.push([gx, gy - gh * clamp(.08 + .62 * g + hb * (.12 + .25 * g), 0, 1)]);
  }
  line(pts, { lw: 2.2, a });
  if (pts.length) { const [lx, ly] = pts[pts.length - 1]; rrect(lx - 4, ly - 4, 8, 8, 4, { fill: C.ink, a }); }
}

function notifCard(x, y, w, n, a) {
  const [, ic, app, title, body] = n, h = body ? 100 : 76, alert = ic === '!';
  rrect(x, y, w, h, 22, alert ? { fill: C.ink, a } : { fill: C.white, stroke: C.ink, lw: 1.6, a });
  const fg = alert ? C.white : C.ink, bgc = alert ? C.ink : C.white;
  rrect(x + 14, y + 16, 42, 42, 11, { fill: fg, a });
  txt(ic, x + 35, y + 45, { f: 'round', w: 900, size: 22, col: bgc, al: 'center', a });
  txt(app.toUpperCase(), x + 70, y + 31, { f: 'sans', w: 700, size: 13, col: fg, a: a * .7, track: 1 });
  txt('now', x + w - 16, y + 31, { f: 'sans', size: 13, col: fg, a: a * .7, al: 'right' });
  txt(fitTo(title, w - 86, { f: 'sans', w: 800, size: 17 }), x + 70, y + 55, { f: 'sans', w: 800, size: 17, col: fg, a });
  if (body) txt(fitTo(body, w - 86, { f: 'sans', size: 16 }), x + 70, y + 80, { f: 'sans', size: 16, col: fg, a });
  return h;
}

function phone(t, a) {
  const { x, y, w, h } = PH, lt = t - PHONE_T[0];
  // it buzzes harder as the alerts come in
  const buzz = NOTIFS.reduce((q, n) => q + (t >= n[0] && t < n[0] + .25 ? 1 : 0), 0) * (3 + 4 * seg(t, 120, 122.6));
  const [bx, by] = shakeXY(t * 1.5, buzz);
  X.save(); X.translate(bx, by);
  rrect(x, y, w, h, 66, { fill: C.ink, a });
  const sx = x + 14, sy = y + 14, sw = w - 28, sh = h - 28;
  rrect(sx, sy, sw, sh, 54, { fill: C.white, a });
  X.save(); X.beginPath(); X.roundRect(sx, sy, sw, sh, 54); X.clip();
  // status bar, the island, the lock-screen clock
  const m = storyMin(t), hh = Math.floor(m % 1440 / 60), mm = Math.floor(m % 60), clock = `${hh}:${String(mm).padStart(2, '0')}`;
  rrect(x + w / 2 - 62, sy + 14, 124, 36, 18, { fill: C.ink, a });
  txt(clock, sx + 40, sy + 42, { f: 'sans', w: 700, size: 19, a });
  rrect(sx + sw - 76, sy + 27, 36, 17, 5, { stroke: C.ink, lw: 1.6, a }); rrect(sx + sw - 73, sy + 30, 4, 11, 1.5, { fill: C.ink, a });
  txt('2%', sx + sw - 84, sy + 42, { f: 'sans', w: 700, size: 16, al: 'right', a });
  const DAYN = ['Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday', 'Monday'];
  txt(DAYN[Math.floor(m / 1440) % 7], x + w / 2, sy + 118, { f: 'sans', w: 600, size: 22, al: 'center', a });
  txt(clock, x + w / 2, sy + 228, { f: 'sans', w: 900, size: 112, al: 'center', a, track: -3 });
  // notifications: the newest slides in at the top and pushes the rest down
  const top = sy + 270, cw = sw - 28;
  NOTIFS.forEach((n, i) => {
    if (t < n[0]) return;
    let off = 0;
    for (let j = i + 1; j < NOTIFS.length; j++) if (t >= NOTIFS[j][0]) off += ease((t - NOTIFS[j][0]) / .28) * ((NOTIFS[j][4] ? 100 : 76) + 10);
    const k = easeOut((t - n[0]) / .3), yy = top + off - (1 - k) * 60;
    if (yy > sy + sh) return;
    notifCard(sx + 14, yy, cw, n, a * clamp(k * 1.5));
  });
  X.restore();
  X.restore();
}

// verse 3. The terminals give way in its first half second
function phoneWorld(t) {
  if (t >= AST[1]) return;                                         // covered by the asteroid
  const inK = easeOut(seg(t, PHONE_T[0], PHONE_T[0] + .7));
  if (inK < 1) {
    const out = 1 - ease(seg(t, PHONE_T[0], PHONE_T[0] + .5));
    X.save(); X.globalAlpha = out; X.translate(MIDX, 540); X.scale(1 - .08 * (1 - out), 1 - .08 * (1 - out)); X.translate(-MIDX, -540);
    for (let i = 0; i < 9; i++) if (isOpen(i, t)) terminal(i, t, 1);
    X.restore();
  }
  feedWall(t, ease(seg(t, PHONE_T[0] + .2, PHONE_T[0] + .9)));
  costPanel(t, ease(seg(t, PHONE_T[0] + .4, PHONE_T[0] + 1)));
  X.save(); X.translate(0, (1 - inK) * (H - PH.y + 40)); phone(t, 1); X.restore();
}

// ---------- the asteroid ("Don't Look Up") ----------
const astK = t => seg(t, AST[0], AST[1]);
const astShake = t => t >= AST[0] && t < IMPACT ? 22 * Math.pow(astK(t), 2) : 0;
function asteroid(t) {
  if (t < AST[0] || t >= IMPACT) return;                    // after impact the black opens straight into the night (scenes.js)
  {
    const k = astK(t), r = 9 * Math.pow(1700 / 9, Math.pow(k, 1.25)), e = ease(k);
    const cx = lerp(1720, 1000, e), cy = lerp(130, 560, e), rot = t * .5;
    if (k >= 1) { bg(C.dark); return; }
    // the trail: streaks back toward where it came from
    const back = Math.atan2(130 - 560, 1720 - 1000);
    X.save(); X.strokeStyle = C.ink; X.lineCap = 'round';
    for (let j = 0; j < 14; j++) {
      const off = (hash(j * 3.3) - .5) * 1.6 * r, len = r * (1.5 + hash(j * 5.1) * 2.5) * (1 + 3 * (1 - k)), lw = Math.max(1, r * (.03 + hash(j) * .05));
      const px = cx + Math.cos(back + Math.PI / 2) * off, py = cy + Math.sin(back + Math.PI / 2) * off;
      X.lineWidth = lw; X.globalAlpha = .35 + .5 * hash(j * 7.7);
      X.beginPath(); X.moveTo(px, py); X.lineTo(px + Math.cos(back) * len, py + Math.sin(back) * len); X.stroke();
    }
    X.restore();
    // the rock: lumpy, black, with white craters
    X.save(); X.translate(cx, cy); X.rotate(rot); X.beginPath();
    for (let i = 0; i <= 48; i++) {
      const u = i / 48 * TAU, rr = r * (1 + .1 * Math.sin(3 * u + 1) + .06 * Math.sin(7 * u + 2) + .03 * Math.sin(13 * u));
      i ? X.lineTo(Math.cos(u) * rr, Math.sin(u) * rr) : X.moveTo(Math.cos(u) * rr, Math.sin(u) * rr);
    }
    X.fillStyle = C.ink; X.fill();
    X.strokeStyle = C.white; X.lineWidth = Math.max(1, Math.min(4, r * .015)); X.globalAlpha = 1 - seg(r, 150, 450);      // close up it is only black
    [[-.3, -.2, .22], [.35, .1, .16], [-.05, .45, .12], [.2, -.45, .1], [-.5, .25, .08]].forEach(([u, v, s]) => { X.beginPath(); X.arc(u * r, v * r, s * r, 0, TAU); X.stroke(); });
    X.restore();
  }
}
