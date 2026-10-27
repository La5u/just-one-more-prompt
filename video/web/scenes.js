// scenes.js: one fixed layout for the whole song.
//   left column (x < SIDE): the wall clock at the top, the day and usage under it, the mug at the bottom
//   right of it, a 3×3 grid of tall cells: from verse 2 on, terminals open into cells and never move;
//     empty cells hold the rest of the world (AGENTS.md, progress, the output graph, the robots)
//   before verse 2, and again in the outro, one web chat sits there instead (with the window above it)
//   bottom strip: the heartbeat
// Lyrics are drawn last, on top of all of it (fx.js).

// ================================================================ layout
const SIDE = 250;
const GRID = { x: 270, y: 36, w: 514, h: 310, gx: 24, gy: 16 };
// after the night (spiral, contributions) the nine terminals come back edge to edge, in the dark
const DARK_ON = 142.72, WALL = 151;
const isDark = t => t >= 123.8 && t < 170.5;          // from the moment the asteroid fills the screen
const NIGHT = t => t >= 124.1 && t < 142.72;          // bridge and pre-chorus 3: the spiral, then the contribution graph
const fullK = t => t >= DARK_ON ? 1 : 0;
const cell = (i, t = T) => {
  const k = fullK(t), x = lerp(GRID.x, 0, k), y = lerp(GRID.y, 0, k), w = lerp(GRID.w, W / 3, k), h = lerp(GRID.h, H / 3, k);
  const gx = lerp(GRID.gx, 0, k), gy = lerp(GRID.gy, 0, k);
  return [x + (i % 3) * (w + gx), y + Math.floor(i / 3) * (h + gy), w, h];
};
const STRIP_Y = 1046;
const CHAT = [600, 250, 720, 760];
const GRID_ON = 57.3, GRID_OFF = 170.5;
const chatPhase = t => t < GRID_ON || t >= GRID_OFF;

// terminals: when each cell opens, which model runs in it, and its folder
const OPEN = { 4: GRID_ON, 3: GRID_ON, 5: 92.6, 1: 92.6, 7: 102.1, 0: 102.17, 2: 102.24, 6: 102.31, 8: 102.38 };
const BRANDS = { 4: 'claude', 3: 'claude', 5: 'claude', 1: 'gpt', 7: 'claude', 0: 'claude', 2: 'gpt', 6: 'opencode', 8: 'claude' };
const FOLDER = { 4: '~/project', 3: '~/startup-idea', 5: '~/rewrite-in-rust', 1: '~/thesis', 7: '~/side-project-7', 0: '~/agent-swarm', 2: '~/dotfiles', 6: '~/sisyphus', 8: '~/todo-app-v12' };
const TERM_FONT = { claude: 'mono', gpt: 'jet', opencode: 'space' };
const isOpen = (slot, t) => t >= OPEN[slot] && t < GRID_OFF;
// from verse 3 on, every 1.7 s one session quits and a new one starts in another folder (never the same one twice)
const EGG_DIRS = ['~/madness-definition', '~/burnout', '~/slop', '~/one-more-thing', '~/final-final-v3', '~/touch-grass', '~/agi-by-friday',
  '~/untitled-47', '~/this-time-for-real', '~/rewrite-the-rewrite', '~/sleep-schedule', '~/startup-idea-2', '~/todo-app-v13', '~/new-new-project',
  '~/hello-world-again', '~/abandoned', '~/vibes', '~/2am-idea', '~/side-project-8', '~/fix-everything', '~/just-one-more', '~/almost-done',
  '~/do-not-open', '~/sunk-cost', '~/the-last-refactor', '~/dopamine', '~/no-tests', '~/prod-hotfix', '~/deadline-yesterday', '~/inbox-zero',
  '~/self-care-app', '~/meditation-app', '~/agents-for-agents', '~/why'];
const folderOf = (slot, t) => {
  if (t < 113.7) return FOLDER[slot];
  for (let n = Math.floor((t - 113.7) / 1.7); n >= 0; n--) if ((n * 4 + 1) % 9 === slot) return EGG_DIRS[n % EGG_DIRS.length];
  return FOLDER[slot];
};

// ================================================================ story clock
const CLOCK = [[-INTRO, 960], [35.7, 1421], [57.29, 1630], [57.3, 1860], [92.6, 2870], [113.7, 3150], [124.1, 5940],
  [145, 13160], [170.5, 140 * 1440 + 240], [END, 141 * 1440 + 960]];
const DAYS = ['tue', 'wed', 'thu', 'fri', 'sat', 'sun', 'mon'];
const storyMin = t => kf(t, CLOCK, x => x);

// ================================================================ what gets typed and answered
const ACT = ['enter', 'retry', 'enter', 'edit', 'enter', 'undo', 'enter', 'retry', 'enter'];
const REPLIES = ["Here's another version.", 'Let me try a different approach.', 'The strongest remaining lead is…', 'One further round is justified.'];
const SAYS = ['Hi! How can I help you today?', "Sure! Here's a fix.", 'The next step is to add tests.', 'Great, continuing.'];
const TYPOS_HEAVY = ['cnotinue', 'cont', 'c', 'contiunue', 'cntiue', 'go', 'k', 'conitnue'];
function typoed(w, level, seed) {             // swapped, dropped letters; worse as the song goes
  if (level <= 0) return w;
  if (level >= 1 && hash(seed * 1.9) < .7) return TYPOS_HEAVY[Math.floor(hash(seed * 5.3) * TYPOS_HEAVY.length)];
  const a = [...w], i = 2 + Math.floor(hash(seed * 3.1) * (a.length - 3));
  if (hash(seed * 7.7) < level) [a[i], a[i + 1]] = [a[i + 1], a[i]];
  if (hash(seed * 9.1) < level * .5) a.splice(Math.floor(hash(seed) * a.length), 1);
  return a.join('');
}
const typoLevel = t => t < 92.6 ? 0 : t < 145 ? .55 : 1;

// scripted conversations per slot: [{ t, kind: 'user'|'reply'|'act'|'out', text, act }]
// PENDING: what is being typed into a slot's input box, { t0, t1, text, cps }
const SCRIPT = { 4: [], 3: [] }, PENDING = { 4: [], 3: [] };
TL.typing.forEach((e, i) => {
  const v2 = e.t > 57 && e.t < 75, slot = v2 && i % 2 ? 3 : 4;
  PENDING[slot].push({ t0: e.t, t1: e.send, text: e.text, cps: e.cps });
  SCRIPT[slot].push({ t: e.send, kind: 'user', text: e.text, act: 'enter' },
    { t: e.send + .5, kind: 'reply', text: e.t < 20 ? SAYS[i] : ['On it.', 'Done. Next?'][i % 2] });
  if (v2) {                                     // verse 2: the two sessions talk to each other
    const other = slot === 3 ? 4 : 3;
    SCRIPT[other].push({ t: e.send + 1.5, kind: 'user', text: `@session-${slot === 3 ? 2 : 1}: ${['thoughts?', 'agree?', 'your turn', 'check this'][i % 4]}` },
      { t: e.send + 1.9, kind: 'reply', text: ['Agreed. Continuing.', 'Good point!', 'On it.'][i % 3] });
  }
});
['ch1', 'ch2', 'ch3'].forEach(sec => cardsIn(sec).forEach((c, i) => {
  const act = ACT[i % ACT.length], at = c.start - .06;
  if (act === 'enter') {
    const word = typoed('continue', typoLevel(c.start), i + c.start), win = { ch1: .42, ch2: .32, ch3: .22 }[sec];
    PENDING[4].push({ t0: at - win, t1: at, text: word, cps: word.length / win });
    SCRIPT[4].push({ t: at, kind: 'user', text: word, act });
  } else SCRIPT[4].push({ t: at, kind: 'act', text: { retry: '↻ regenerated', edit: '✎ edited', undo: '↶ undone' }[act], act });
  SCRIPT[4].push({ t: at + .35, kind: 'reply', text: REPLIES[i % REPLIES.length] });
}));
// outro: the AI asks "continue?" on the first whisper; a pause; then "continue" is typed in one second, ending on the
// second whisper, and never sent (render_web.py reads OUT_CONT and makes the same clicks)
SCRIPT[4].push({ t: GRID_OFF + .05, kind: 'work' }, { t: OUT_CONT[0], kind: 'reply', text: 'continue?' });
const OUTRO_KEYS = [...'continue'].map((_, k) => OUT_CONT[1] - 1.0 + k * .12 + (hash(k * 4.1) - .5) * .04);
PENDING[4].push({ t0: OUTRO_KEYS[0], t1: 1e9, text: 'continue', keys: OUTRO_KEYS });
for (const k in SCRIPT) SCRIPT[k].sort((a, b) => a.t - b.t);

// every other session (and the main one between the choruses later on): an endless loop of prompts and output
function autoSession(slot, t, from) {
  const P = 3.2 + hash(slot) * 1.8, ph = hash(slot * 7) * P, items = [];
  let pending = null;
  const kNow = Math.floor((t - from - ph) / P);
  for (let k = Math.max(0, kNow - 4); k <= kNow; k++) {
    const s0 = from + ph + k * P, prompt = pick(PROMPTS, k * 4 + slot * 13);
    if (t < s0 + .5) { pending = { t0: s0, t1: s0 + .5, text: prompt, cps: prompt.length / .5 }; continue; }
    items.push({ t: s0 + .5, kind: 'user', text: prompt });
    for (let j = 0; j < 3; j++) items.push({ t: s0 + .8 + j * .3, kind: 'out', text: termLine(k * 3 + j, s0 + .8 + j * .3, slot * 17) });
  }
  return { items, pending };
}
// a new folder is a new session: its transcript starts empty at the moment the folder changes (folderOf)
const restartOf = (slot, t) => {
  if (t < 113.7 || t >= GRID_OFF) return -1e9;
  for (let n = Math.floor((t - 113.7) / 1.7); n >= 0; n--) if ((n * 4 + 1) % 9 === slot) return 113.7 + n * 1.7;
  return -1e9;
};
function sessionAt(slot, t) {
  // the main session restarts clean for the outro, so the loop matches the opening
  const r = restartOf(slot, t);
  let items = (SCRIPT[slot] || []).filter(e => e.t <= t && e.t >= r && (t < GRID_OFF || e.t >= GRID_OFF));
  let pending = (PENDING[slot] || []).find(p => t >= p.t0 && t < p.t1 && p.t0 >= r) || null;
  // when it isn't scripted a session runs on its own; the main one only between chorus 2 and 3, and what it wrote then stays in its history
  const [a0, a1] = slot === 4 ? [113.7, 145] : slot === 3 ? [75.3, Infinity] : [OPEN[slot] + .3, Infinity];
  if (t >= a0 && t < GRID_OFF) {
    const a = autoSession(slot, Math.min(t, a1), Math.max(a0, r));
    items = items.concat(a.items.filter(e => e.t >= r)).sort((p, q) => p.t - q.t);
    if (t < a1) pending = pending || a.pending;
  }
  return { items, pending };
}
const lastAct = items => items.filter(e => e.act).pop();
const pressOf = (last, t) => last && t - last.t < .16 ? 1 - (t - last.t) / .16 : 0;
const typedOf = (pending, t) => !pending ? '' : pending.keys ? pending.text.slice(0, pending.keys.filter(k => k <= t).length)
  : pending.text.slice(0, Math.max(0, Math.floor((t - pending.t0) * pending.cps)));

// ================================================================ the web chat (opening and outro)
// the outro opens on the tail of a very long answer: everything it did while nobody was looking
const WORKLOG = ['● Task(explore) → 12 subagents', '● Update(src/auth.ts)', '  ⎿  +2,114 −388', '● Bash(npm test)', '  ⎿  1,203 passed, 1 failed',
  '● Update(src/auth.ts)', '  ⎿  +96 −2,114', '● Bash(npm test)', '  ⎿  1,203 passed, 1 failed', '● Read(AGENTS.md)', '● Task(plan) → 4 subagents',
  '● Update(src/everything.ts)', '  ⎿  +18,240 −9,013', '● Bash(git worktree add ../try-14)', '● Bash(npm test)', '  ⎿  1,204 passed, 1 failed',
  '● Update(src/everything.ts)', '  ⎿  +3,377 −3,377', '● Bash(git push)', '', 'Here is everything I did overnight:', '',
  '• rewrote the auth layer (third pass)', '• migrated 214 files to the new API', '• added 1,204 tests; 1 still fails', '• opened 37 pull requests',
  '• merged 9 worktrees, reverted 4', '• refactored the refactor', '• updated AGENTS.md: "never stop"', '• started a rewrite in rust', '',
  'The strongest remaining lead is the last failing test.', 'Public evidence is not exhausted.', 'One further round is justified.', 'The next step is…'];
const WORK_RATE = 34;                      // lines a second
const SUGG = [['Want me to dig deeper?', 7.4], ['I can also add tests', 7.9], ['Next step →', 8.4]];
const MORE = ['I updated the function and added a retry.', 'All the tests should pass now.', 'I also tidied up a few names.',
  'This version should be much faster.', 'I can also add a cache.', 'I rewrote the parser from scratch.'];
const CF = { user: { f: 'round', w: 600, size: 24 }, reply: { f: 'round', w: 700, size: 24 }, more: { f: 'round', w: 400, size: 21 } };
const chatInput = () => { const [x, y, w, h] = CHAT; return [x + 24, y + h - 84, w - 48, 64]; };
// where the cursor sits in the chat box (the loop opens and closes on it)
const MAIN_CURSOR = (() => { const [ix, iy, , ih] = chatInput(); return [ix + 32, iy + ih / 2]; })();
// the suggestions go as soon as the next message is sent
const SUGG_OFF = TL.typing.find(e => e.send > SUGG[0][1]).send;
function webChat(t) {
  const [x, y, w, h] = CHAT, [ix, iy, iw, ih] = chatInput();
  rrect(x, y, w, h, 18, { fill: C.white, stroke: C.ink, lw: 2.2 });
  for (let k = 0; k < 3; k++) { X.save(); X.strokeStyle = C.ink; X.lineWidth = 1.5; X.beginPath(); X.arc(x + 24 + k * 20, y + 24, 5.5, 0, TAU); X.stroke(); X.restore(); }
  rrect(x + 110, y + 10, w - 220, 28, 14, { stroke: C.ink, lw: 1.3 });
  brand('claude', x + 130, y + 24, 16); txt('claude.ai/chat', x + 146, y + 30, { f: 'mono', size: 15 });
  line([[x, y + 48], [x + w, y + 48]], { lw: 1.2 });
  const { items, pending } = sessionAt(4, t), last = lastAct(items), press = pressOf(last, t);
  // suggestions under the answer, in verse 1
  const chipsK = backOut(seg(t, SUGG[0][1], SUGG[0][1] + .3)) * (1 - ease(seg(t, SUGG_OFF, SUGG_OFF + .25)));
  const bottom = iy - 18 - (t > SUGG[0][1] ? 3 * 56 * clamp(chipsK) : 0);
  if (chipsK > .01) SUGG.forEach(([s2, t0], i) => {
    const k = backOut(seg(t, t0, t0 + .3)) * (1 - ease(seg(t, SUGG_OFF, SUGG_OFF + .25))); if (k <= 0) return;
    const f = { f: 'round', w: 600, size: 21 }, cw = measure(s2, f) + 36, cy = iy - 40 - (2 - i) * 54;
    X.save(); X.translate(x + w - 30 - cw / 2, cy); X.scale(k, k);
    rrect(-cw / 2, -21, cw, 42, 21, { stroke: C.ink, lw: 1.6, fill: C.white });
    txt(s2, 0, 8, { ...f, al: 'center' }); X.restore();
  });
  // transcript: newest at the bottom, older ones scroll up
  const top = y + 60, rows = [];
  items.forEach((e, i) => {
    if (e.kind === 'user') rows.push({ e, h: 72 });
    else if (e.kind === 'act') rows.push({ e, h: 40 });
    else if (e.kind === 'work') rows.push({ e, h: 20 + Math.min(WORKLOG.length, Math.floor((t - e.t) * WORK_RATE)) * 25 });
    else rows.push({ e, h: 112 + (i === items.length - 1 ? 56 : 0) });
  });
  X.save(); X.beginPath(); X.rect(x + 2, top, w - 4, bottom - top); X.clip();
  const lastUser = rows.map(r => r.e.kind).lastIndexOf('user');
  let yy = bottom;
  for (let i = rows.length - 1; i >= 0 && yy > top - 200; i--) {
    const { e, h: rh } = rows[i], k = easeOut((t - e.t) / .3);
    yy -= rh * (i === rows.length - 1 ? k : 1);
    if (e.kind === 'user') {
      const bw = Math.min(w - 120, measure(e.text, CF.user) + 52), bx = x + w - 28 - bw;
      rrect(bx, yy + 10, bw, 54, 27, { fill: C.ink, a: k });
      txt(fitTo(e.text, bw - 52, CF.user), bx + 26, yy + 45, { ...CF.user, col: C.white, a: k });
      if (i === lastUser) {                                     // edit pencil next to the latest message
        X.save(); X.globalAlpha = k; editIcon(bx - 24, yy + 37, 11, C.ink); X.restore();
      }
    } else if (e.kind === 'work') {
      const n = Math.min(WORKLOG.length, Math.floor((t - e.t) * WORK_RATE));
      brand('claude', x + 44, yy + 22, 26);
      WORKLOG.slice(0, n).forEach((l, j) => txt(l, x + 74, yy + 30 + j * 25, { f: l.startsWith('●') || l.startsWith(' ') ? 'mono' : 'round', w: l.startsWith('•') || !l.startsWith('●') && !l.startsWith(' ') ? 600 : 400, size: 18 }));
    } else if (e.kind === 'act') {
      txt(e.text, x + w / 2, yy + 28, { f: 'mono', size: 17, al: 'center', a: k });
      line([[x + 40, yy + 22], [x + w / 2 - 90, yy + 22]], { lw: 1, a: k }); line([[x + w / 2 + 90, yy + 22], [x + w - 40, yy + 22]], { lw: 1, a: k });
    } else {
      const shown = Math.floor((t - e.t) * 70), more = e.t < 0 || e.t >= GRID_OFF ? '' : MORE[Math.floor(hash(e.t * 3.1) * MORE.length)];
      brand('claude', x + 44, yy + 30, 26, C.ink, k);
      txt(e.text.slice(0, shown), x + 74, yy + 38, { ...CF.reply, a: k });
      txt(fitTo(more.slice(0, Math.max(0, shown - e.text.length)), w - 104, CF.more), x + 74, yy + 72, { ...CF.more, a: k });
      if (i === rows.length - 1) ['copy', 'retry', 'edit', 'undo'].forEach((b, j) =>
        actionIcon(b, x + 96 + j * 54, yy + 128, last && last.act === b ? press : 0));
    }
  }
  X.restore();
  // the message box, with its send button
  const typed = typedOf(pending, t), f = { f: 'round', w: 600, size: 26 };
  rrect(ix, iy, iw, ih, ih / 2, { fill: C.white, stroke: C.ink, lw: 2.2 });
  // before the first message the placeholder is the "continue" the video ended on, in grey
  const first = t < TL.typing[0].send;
  txt(typed || (first ? 'continue' : 'Reply to Claude…'), ix + 32, iy + 41, typed ? f : { ...f, w: first ? 600 : 400, a: .45 });
  if (frac(t * 1.7) < .55 || typed) rrect(ix + 32 + (typed ? measure(typed, f) + 3 : 0), iy + 18, 3, 30, 1, { fill: C.ink });
  const sp = last && last.act === 'enter' ? press : 0, on = typed || sp > 0;
  X.save(); X.translate(ix + iw - 34, iy + ih / 2); X.scale(1 - .15 * sp, 1 - .15 * sp);
  X.fillStyle = C.ink; X.strokeStyle = C.ink; X.lineWidth = 2; X.beginPath(); X.arc(0, 0, 22, 0, TAU); on ? X.fill() : X.stroke();
  line([[0, 10], [0, -9]], { col: on ? C.white : C.ink, lw: 3 }); line([[-8, -1], [0, -9], [8, -1]], { col: on ? C.white : C.ink, lw: 3 });
  X.restore();
}

// ================================================================ a terminal
function terminal(slot, t, a = 1) {
  const [x, y, w, h] = cell(slot), dk = isDark(t), ink = dk ? C.paper : C.ink, pap = dk ? '#111111' : C.white, tf = TERM_FONT[BRANDS[slot]];
  windowFrame(x, y, w, h, folderOf(slot, t), { brand: BRANDS[slot], fill: pap, a, col: ink });
  const { items, pending } = sessionAt(slot, t);
  // body: newest at the bottom; an answer is a line of text plus two lines of work
  const top = y + 52, bottom = y + h - 62, lh = 22, rows = [];
  for (const e of items) {
    if (e.kind === 'user') rows.push({ s: '> ' + e.text, w: 500, t: e.t });
    else if (e.kind === 'act') rows.push({ s: e.text, w: 400, t: e.t });
    else if (e.kind === 'out') rows.push({ s: e.text, w: 400, t: e.t });
    else rows.push({ s: '● ' + e.text, w: 500, t: e.t }, { s: termLine(Math.floor(e.t * 7), e.t, slot), w: 400, t: e.t + .25 },
      { s: termLine(Math.floor(e.t * 7) + 3, e.t, slot), w: 400, t: e.t + .45 });
  }
  const vis = rows.filter(r => r.t <= t).slice(-Math.floor((bottom - top) / lh));
  X.save(); X.beginPath(); X.rect(x + 2, top - 18, w - 4, bottom - top + 22); X.clip();
  vis.forEach((r, i) => {
    const yy = bottom - (vis.length - 1 - i) * lh, k = easeOut((t - r.t) / .25);
    const o = { f: tf, w: r.w, size: 16, col: ink, a: a * k }; txt(fitTo(r.s, w - 36, o), x + 18, yy, o);
  });
  X.restore();
  // its own input box, with a send (⏎) key
  const iy = y + h - 46, iw = w - 32, f = { f: tf, size: 16, col: ink, a };
  rrect(x + 16, iy, iw, 34, 17, { fill: pap, stroke: ink, lw: 1.5, a });
  const typed = typedOf(pending, t);
  txt(typed || 'Message…', x + 32, iy + 23, typed ? f : { ...f, a: a * .45 });
  if (frac(t * 1.7) < .55 || typed) rrect(x + 32 + (typed ? measure(typed, f) + 2 : 0), iy + 8, 8, 18, 1.5, { fill: ink, a });
  const last = lastAct(items), press = pressOf(last, t), sp = last && last.act === 'enter' ? press : 0, on = typed || sp > 0;
  X.save(); X.translate(x + 16 + iw - 20, iy + 17); X.scale(1 - .15 * sp, 1 - .15 * sp);
  rrect(-15, -12, 30, 24, 7, on ? { fill: ink, a } : { fill: pap, stroke: ink, lw: 1.3, a });
  line([[5, -5], [5, 3], [-5, 3]], { col: on ? pap : ink, lw: 2, a }); line([[-2, 0], [-5, 3], [-2, 6]], { col: on ? pap : ink, lw: 2, a });
  X.restore();
  // the main session's reply buttons, in its title bar; the one used gets pressed
  if (slot === 4 && secAt(t).name.startsWith('ch')) ['retry', 'edit', 'undo'].forEach((k, i) => {
    X.save(); X.translate(x + w - 120 + i * 40, y + 20); X.scale(.6, .6);
    actionIcon(k, 0, 0, last && last.act === k ? press : 0, ink); X.restore();
  });
}

// ================================================================ the world outside the terminals
const fadeIO = (t, a, b) => ease(seg(t, a, a + .6)) * (1 - ease(seg(t, b - .4, b)));
// before verse 2: around the web chat
function chatWorld(t) {
  // "a couple simple questions": a note, then the list keeps growing
  if (t >= .8 && t < 8.6) questionsNote(1380, 300, t, fadeIO(t, .8, 8.6));
  if (t >= 17.85 && t < 35.7) {
    docsPage(1360, 250, 500, 330, fadeIO(t, 17.85, 35.7));
    barBuild(300, 700, 260, t - 17.85, fadeIO(t, 17.85, 35.7));
  }
  if (t >= 35.7 && t < 57.3) {                        // chorus 1: windows everywhere, edge to edge round the chat
    const a = fadeIO(t, 35.7, 57.3);
    docsPage(1340, 24, 556, 500, a);
    codeEditor(1340, 540, 556, 516, t, { a });
    logWindow(270, 24, 314, 1032, 'error.log', ERRORS, t, 3.2, a, 'courier');
    logWindow(600, 24, 720, 210, 'session.log', TOOLS, t, 1.4, a, 'jet');
  }
}
// a window of log lines that never stops scrolling
function logWindow(x, y, w, h, title, lines, t, rate, a, font = 'mono') {
  windowFrame(x, y, w, h, title, { fill: C.white, a });
  const rows = Math.floor((h - 60) / 24), off = t * rate, sh = frac(off) * 24;
  X.save(); X.beginPath(); X.rect(x + 2, y + 46, w - 4, h - 54); X.clip();
  for (let i = -1; i < rows + 1; i++) {
    const l = pick(lines, Math.floor(off) + i), o = { f: font, w: l.includes('✗') || l.startsWith('Error') || l.includes('Error:') ? 600 : 400, size: 15, a };
    txt(fitTo(l, w - 32, o), x + 16, y + 68 + i * 24 - sh, o);
  }
  X.restore();
}
const QUESTIONS = ['how do I fix this?', 'and the tests?', 'why is it slow?', 'can you make it faster?', 'what about mobile?', 'should I use rust?', 'is this good?'];
function questionsNote(x, y, t, a) {
  X.save(); X.globalAlpha *= a; X.translate(x + 230, y + 150); X.rotate(-.04); X.translate(-x - 230, -y - 150);
  rrect(x, y, 460, 330, 6, { fill: C.white, stroke: C.ink, lw: 2 });
  txt('notes.txt', x + 24, y + 42, { f: 'courier', w: 700, size: 21 });
  const n = Math.min(QUESTIONS.length, t < 4 ? 2 : 2 + Math.floor((t - 4) / .7));
  QUESTIONS.slice(0, n).forEach((q, i) => txt(`${i + 1}. ${q}`, x + 24, y + 86 + i * 34, { f: 'courier', size: 22 }));
  X.restore();
}
// the manual page for sleep(1): the one command never run
const MAN = [['SLEEP(1)', 'User Commands', 'SLEEP(1)'], 'NAME', '       sleep - delay for a specified amount of time', '', 'SYNOPSIS',
  '       sleep NUMBER[SUFFIX]...', '       sleep OPTION', '', 'DESCRIPTION', '       Pause for NUMBER seconds.  SUFFIX may be',
  "       's' for seconds (the default), 'm' for", "       minutes, 'h' for hours or 'd' for days.", '', '       --help display this help and exit', '',
  'SEE ALSO', '       sleep(3)'];
function docsPage(x, y, w, h, a) {
  windowFrame(x, y, w, h, 'man sleep', { fill: C.white, a });
  const f = { f: 'courier', size: 18, col: C.ink, a }, rows = Math.floor((h - 70) / 24);
  MAN.slice(0, rows).forEach((l, i) => {
    const yy = y + 74 + i * 24;
    if (Array.isArray(l)) { txt(l[0], x + 20, yy, f); txt(l[1], x + w / 2, yy, { ...f, al: 'center' }); txt(l[2], x + w - 20, yy, { ...f, al: 'right' }); }
    else { const o = { ...f, w: /^[A-Z ]+$/.test(l) ? 700 : 400 }; txt(fitTo(l.replace(/^ {7}/, '    '), w - 40, o), x + 20, yy, o); }
  });
}
// from verse 2 on: what the empty cells hold
function cellContent(slot, t) {
  const [x, y, w, h] = cell(slot);
  // verse 2: what's around the two sessions; all of it goes at "empty room"
  const room = CARDS.find(c => c.text === 'In an empty room').words.find(w => w.w === 'empty').t;
  if (t >= 57.6 && t < room + .5) {
    const a = fadeIO(t, 57.6, room + .5);
    if (slot === 0) ideasCell(x, y, w, h, t, a);
    if (slot === 1) pluginsCell(x, y, w, h, t, a);
    if (slot === 5) todoCell(x, y, w, h, t, a);
    if (slot === 6) brilliantCell(x, y, cell(7)[0] + w - x, h, t, a);
    if (slot === 8) { txt('open threads', x + w / 2, y + 100, { f: 'sans', it: true, w: 300, size: 40, al: 'center', a });
      // past a hundred around "hundred thoughts", and it never stops: faster and faster until the room empties
      const n = 60 * (Math.exp(.55 * Math.max(0, t - 61.6)) - 1);
      odometer(n, x + w / 2, y + 230, { size: 110, al: 'center', digits: Math.max(3, String(Math.floor(n)).length), a, font: { f: 'sans', w: 800 } }); }
  }
  if (slot === 5 && t >= 75.3 && t < 92.6) agentsCell(x, y, w, h, t - 75.3, fadeIO(t, 75.3, 92.6));
  if (t >= 75.3 && t < 92.6) {
    const lt = t - 75.3, a = fadeIO(t, 75.3, 92.6);
    if (slot === 0) barTests(x + 60, y + 120, lt, a);
    if (slot === 1) goalpost(x + 40, y + 60, w - 80, h - 90, lt, a);           // the goalposts keep moving
    if (slot === 2) barTraining(x + w / 2, y + h / 2 - 20, 100, lt, a);
    if (slot === 8) barContext(x + 40, y + 160, w - 80, lt, a);
  }
  // chorus 2: the swarm (orchestrator → subagents → workers), branches forking, pull requests piling up
  if (slot === 0) swarmTree(x, y, w, h, t, 92.9, 1);
  if (slot === 2) gitGraph(x, y, w, h, t, 93.15);
  if (slot === 8) prQueue(x, y, w, h, t, 93.4);
}
// `git log --graph --oneline --all`, as text: newest at the top, a new commit every 0.3 s pushes the rest down
const GITLOG = [
  ['*', 'HEAD -> agent/fix-auth-3', 'try a different approach'], ['| *', 'claude/one-more-try', 'fix the fix'],
  ['|/', '', ''], ['*', '', 'revert "refactor auth"'], ['| *', 'gpt/rewrite-2', 'rewrite in rust (again)'],
  ['| | *', 'opencode/tests', 'add tests for the tests'], ['| |/', '', ''], ['|/|', '', ''], ['* |', '', 'fix: borrow of moved value'],
  ['| *', '', 'wip'], ['* |', '', 'Merge branch claude/refactor-v3'], ['|\\ \\', '', ''], ['| * |', 'claude/refactor-v3', 'refactor the refactor'],
  ['| |/', '', ''], ['* |', '', 'fix segfault (core dumped)'], ['| *', 'agent/fix-the-fix', 'retry on CUDA OOM'], ['|/', '', ''],
  ['*', '', 'bump deps'], ['| *', 'gpt/rewrite', 'rewrite in rust'], ['* |', '', 'fix flaky test'], ['| *', '', 'Dockerfile: try alpine'],
  ['|/', '', ''], ['*', 'claude/try-again', 'make: *** [all] Error 2'], ['*', '', 'add retry'], ['| *', 'agent/fix-auth-2', 'fix migration'],
  ['|/', '', ''], ['*', 'agent/fix-auth', 'fix auth'], ['*', 'main', 'initial commit']];
function gitGraph(x, y, w, h, t, t0) {
  const a = ease(seg(t, t0, t0 + .4)); if (a <= 0) return;
  windowFrame(x, y, w, h, 'git log --graph --oneline --all', { fill: C.white, a });
  const lh = 22, n = clamp(Math.floor((t - t0) / .3) + 4, 0, GITLOG.length), k = easeOut(frac((t - t0) / .3) / .35);
  const f = { f: 'mono', size: 15, a }, fb = { ...f, w: 600 };
  X.save(); X.beginPath(); X.rect(x + 2, y + 46, w - 4, h - 54); X.clip();
  GITLOG.slice(GITLOG.length - n).forEach(([g, ref, msg], i) => {
    const yy = y + 70 + (i - 1 + (n < GITLOG.length ? k : 1)) * lh, sha = (hash(i + GITLOG.length - n) * 0xfffffff | 0).toString(16).padStart(7, '0');
    let xx = x + 18;
    txt(g, xx, yy, fb); xx += measure(g + ' ', fb);
    if (!msg) return;
    txt(sha, xx, yy, { ...f, a: a * .55 }); xx += measure(sha + ' ', f);
    if (ref) { const r = `(${ref})`; txt(r, xx, yy, fb); xx += measure(r + ' ', fb); }
    txt(fitTo(msg, x + w - 18 - xx, f), xx, yy, f);
  });
  X.restore();
}
const PR_T = ['refactor auth (again)', 'add tests for the tests', 'rewrite in rust', 'fix flaky test', 'revert "fix flaky test"', 'add retry', 'bump deps',
  'remove retry', 'try a different approach', 'migrate db', 'fix migration', 'update AGENTS.md', 'one more try', 'refactor the refactor'];
// pull requests open faster than anyone could read them; nobody reviews any
function prQueue(x, y, w, h, t, t0) {
  const a = ease(seg(t, t0, t0 + .4)); if (a <= 0) return;
  windowFrame(x, y, w, h, 'pull requests', { fill: C.white, a });
  const n = Math.max(1, Math.floor((t - t0) / .3) + 1);
  txt(`${n} open`, x + 22, y + 82, { f: 'sans', w: 800, size: 32, a });
  txt('0 reviewed', x + 26 + measure(`${n} open`, { f: 'sans', w: 800, size: 32 }) + 14, y + 82, { f: 'sans', it: true, w: 300, size: 28, a });
  X.save(); X.beginPath(); X.rect(x + 2, y + 96, w - 4, h - 98); X.clip();
  const k = easeOut(frac((t - t0) / .3) / .4);
  for (let r = 0; r < 9; r++) {
    const i = n - 1 - r; if (i < 0) break;
    const yy = y + 124 + (r - 1 + k) * 26, add = Math.round(40 + hash(i * 3.1) * 4000);
    const pf = { f: 'mono', size: 15, a: a * (r === 0 ? k : 1) };
    txt(fitTo(`○ #${1040 + i}  ${PR_T[i % PR_T.length]}`, w - 130, pf), x + 22, yy, pf);
    txt(`+${add.toLocaleString('en')}`, x + w - 22, yy, { f: 'mono', w: 600, size: 15, al: 'right', a: a * (r === 0 ? k : 1) });
  }
  X.restore();
}
const IDEAS = ['uber for dogs', 'AI that writes AIs', 'rewrite it in rust', 'a todo app (v12)', 'notion but faster', 'agents for agents', 'a startup?', 'a second startup',
  'learn piano', 'sleep tracker', 'call mom app', 'a better terminal'];
function ideasCell(x, y, w, h, t, a) {
  windowFrame(x, y, w, h, 'ideas.md', { fill: C.white, a });
  const n = clamp(Math.floor((t - 59.5) / .6), 0, IDEAS.length);
  IDEAS.slice(Math.max(0, n - 7), n).forEach((s, i) => txt('- ' + s, x + 24, y + 78 + i * 32, { f: 'courier', size: 20, a }));
}
// a hundred thoughts become a hundred settings: the config gets tweaked, switch by switch
const PLUGINS = [['auto-approve edits', 1], ['skip permission prompts', 1], ['subagents', 1], ['parallel sessions', 1], ['auto-continue', 1], ['memory', 1], ['notifications', 0]];
function pluginsCell(x, y, w, h, t, a) {
  windowFrame(x, y, w, h, 'settings.json', { fill: C.white, a });
  PLUGINS.forEach(([name, on], i) => {
    const yy = y + 76 + i * 33, k = ease(seg(t, 61.8 + i * .75, 62.05 + i * .75)), v = on ? k : 1 - k;
    txt(name, x + 24, yy + 6, { f: 'sans', size: 19, a });
    const sx = x + w - 76;
    rrect(sx, yy - 11, 46, 24, 12, { stroke: C.ink, lw: 1.6, fill: v > .5 ? C.ink : C.white, a });
    X.save(); X.globalAlpha *= a; X.fillStyle = v > .5 ? C.white : C.ink; X.beginPath(); X.arc(sx + 12 + 22 * v, yy + 1, 8, 0, TAU); X.fill(); X.restore();
  });
}
// the swarm, organised: orchestrator → 3 subagents → 9 workers, wired with right-angled lines, marching in step
const ROLES = ['explore', 'plan', 'test'];
function swarmTree(x, y, w, h, t, t0, sp) {
  const at = d => t0 + d / sp, ry = y + 70, ky = y + 168, gy = y + 266;
  const node = (px, py, s, when, label) => {
    const k = ease(seg(t, when, when + .2)); if (k <= 0) return;
    X.save(); X.globalAlpha *= k; clawd(px, py, s, t, { ph: 0, bob: .5 });
    if (label) txt(label, px, py + 20, { f: 'mono', size: 14, al: 'center' });
    X.restore();
  };
  const wire = (x0, y0, x1, y1, when) => { const k = ease(seg(t, when - .25, when)); if (k > 0) line(partial([[x0, y0], [x0, (y0 + y1) / 2], [x1, (y0 + y1) / 2], [x1, y1]], k), { lw: 1.6 }); };
  node(x + w / 2, ry, 46, at(0), 'orchestrator');
  for (let i = 0; i < 3; i++) {
    const kx = x + w * (i + .5) / 3;
    wire(x + w / 2, ry + 28, kx, ky - 30, at(.5 + i * .15)); node(kx, ky, 34, at(.5 + i * .15), ROLES[i]);
    for (let j = 0; j < 3; j++) {
      const gx = x + w * (i * 3 + j + .5) / 9, when = at(1.3 + (i * 3 + j) * .08);
      wire(kx, ky + 26, gx, gy - 22, when); node(gx, gy, 24, when);
    }
  }
}
const TODO = [['call mom', 64.2], ['reply to mia', 69], ['sleep', 1e9], ['eat something', 1e9]];
function todoCell(x, y, w, h, t, a) {
  txt('today', x + 30, y + 64, { f: 'sans', w: 800, size: 48, a });
  TODO.forEach(([s, moved], i) => {
    const yy = y + 120 + i * 44, k = ease((t - moved) / .4);
    rrect(x + 30, yy - 22, 26, 26, 4, { stroke: C.ink, lw: 2, a });
    txt(s, x + 72, yy, { f: 'round', w: 600, size: 26, a });
    if (k > 0) {
      line([[x + 68, yy - 9], [x + 72 + measure(s, { f: 'round', w: 600, size: 26 }) * k + 4, yy - 9]], { lw: 3, a });
      txt('→ tomorrow', x + 80 + measure(s, { f: 'round', w: 600, size: 26 }), yy, { f: 'sans', it: true, w: 300, size: 28, a: a * k });
    }
  });
}
function brilliantCell(x, y, w, h, t, a) {             // "something brilliant": a wireframe, drawn line by line
  const k = seg(t, 66.4, 73.5), boxes = [[0, 0, 1, .14], [0, .2, .22, .8], [.26, .2, .74, .36], [.26, .62, .35, .38], [.65, .62, .35, .38], [.3, .3, .3, .08], [.3, .45, .5, .06]];
  txt('landing-page.fig', x + 30, y + 40, { f: 'sans', it: true, w: 300, size: 36, a });
  boxes.forEach(([bx, by, bw, bh], i) => {
    const p = clamp(k * boxes.length - i); if (p <= 0) return;
    const X0 = x + 30 + bx * (w - 60), Y0 = y + 70 + by * (h - 100), X1 = X0 + bw * (w - 60), Y1 = Y0 + bh * (h - 100);
    line(partial([[X0, Y0], [X1, Y0], [X1, Y1], [X0, Y1], [X0, Y0]], p), { lw: 2.5, a });
  });
}
// the output graph spans the two bottom-left cells while they are empty
function graphOver(t) {
  if (t < 75.3 || t >= OPEN[7] + .2) return;                // until the nine terminals open over it
  const [x0, y0] = cell(6), [x1, , w1, h1] = cell(7);
  liveGraph(x0 + 30, y0 + 40, x1 + w1 - x0 - 60, h1 - 80, t, 75.3, { a: fadeIO(t, 75.3, OPEN[7] + .2) });
}
const AGENTS = [[0, ['# AGENTS.md', '- be concise', '- ask before big changes', '- run the tests']],
  [2.0, 2, "- don't ask, just do it"], [5.6, 4, "- keep going until it's done"], [8.4, 1, '- be thorough'], [11.2, 5, '- never stop']];
function agentsCell(x, y, w, h, lt, a) {
  const lines = [...AGENTS[0][1]]; let cur = -1;
  for (let i = 1; i < AGENTS.length; i++) {
    const [t0, li, s] = AGENTS[i]; if (lt < t0) break;
    const prev = lines[li] || '', dt = lt - t0;
    lines[li] = dt < .3 ? prev.slice(0, Math.floor(prev.length * (1 - dt / .3))) : s.slice(0, Math.floor((dt - .3) / .045)); cur = li;
  }
  windowFrame(x, y, w, h, 'AGENTS.md', { fill: C.white, a });
  lines.forEach((l, i) => { const o = { f: 'jet', w: i === cur ? 700 : 400, size: 19, col: C.ink, a }; txt(fitTo(l, w - 48, o), x + 24, y + 80 + i * 34, o); });
}

// ================================================================ the left column: clock, day, usage, mug
function sidebar(t, fg) {
  const m = storyMin(t), day = Math.floor(m / 1440), hh = Math.floor(m % 1440 / 60), mm = Math.floor(m % 60);
  const IN = { clock: .9, day: 1.5, mug: 2.8, usage: 5.0 }, come = k => ease(seg(t, IN[k], IN[k] + .6));
  const up = (k, fn) => { const c = come(k); if (c <= 0) return; X.save(); X.globalAlpha *= c; X.translate(0, 14 * (1 - c)); fn(); X.restore(); };
  up('clock', () => wallClock(125, 140, 92, m, t));
  const o = { f: 'mono', size: 22, col: fg };
  X.save(); X.globalAlpha *= come('day');
  txt('day', 34, 290, o);
  odometer(day + 1 + ease(clamp((frac(m / 1440) - .985) / .015)), 34 + measure('day ', o), 290, { digits: 3, size: 22, col: fg });
  txt(`${DAYS[day % 7]} ${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`, 34, 320, o);
  const n = Math.floor(kf(t, UNREAD, x => x));                             // unread messages
  if (n > 0) {
    const lbl = (n > 99 ? '99+' : n) + ' unread', fw = measure(lbl, { f: 'mono', size: 17 }) + 26;
    rrect(34, 340, fw, 30, 15, { fill: fg });
    txt(lbl, 47, 361, { f: 'mono', size: 17, col: fg === C.ink ? C.white : C.dark });
  }
  X.restore();
  X.save(); X.globalAlpha *= come('usage');
  // usage: Claude; + ChatGPT once there are 4 sessions; + opencode at 9
  const models = t < 92.6 ? ['claude'] : t < 102 ? ['claude', 'gpt'] : ['claude', 'gpt', 'opencode'];
  models.forEach((b, i) => {
    const per = 300 * [1, 1.3, 1.6][i], fr = frac((m - 960) / per + [0, .4, .7][i]);
    // once Claude hits its limit (104 s) it stays there; the story clock races by then, so it shows no countdown that could run out
    const stuck = i === 0 && t > 104, u = stuck ? 1 : fr, yy = 420 + i * 70;
    brand(b, 46, yy, 22, fg);
    rrect(66, yy - 8, 150, 16, 8, { stroke: fg, lw: 1.5 });
    rrect(68, yy - 6, 146 * u, 12, 6, { fill: fg });
    txt(stuck ? 'limit reached' : `${Math.floor(u * 100)}% used`, 34, yy + 32, { f: 'mono', size: 16, col: fg });
  });
  X.restore();
  // the mug: hot at first; fewer and fewer puffs of steam until "cold"
  const cold = CARDS.find(c => c.text.startsWith('The coffee went cold')).words[3].t, steamAt = tt => 1 - seg(tt, 12, cold);
  up('mug', () => mug(125, 960, 150, steamAt(t), t, { steamAt }));
}
const TOASTS = [[63.9, 'M', 'Mom', 'Missed call (2)', 67.2], [66.4, 'm', 'mia', 'are u coming tonight??', 69.4], [69.6, 'm', 'mia', 'hello?', 71.2],
  [70.4, 'm', 'mia', 'nvm', 73.4],
  // the last chorus: every limit hit, then the reset, then straight back to it
  [145.4, '!', 'Claude', 'Usage limit reached · resets in 4h 59m', 149.2], [146.5, '!', 'Codex', "You've hit your usage limit", 149.6],
  [147.7, 't', '@tibo', 'we just reset rate limits for everyone', 151.4],
  [157.8, '!', 'Claude', 'Usage limit reached · resets in 4h 58m', 160.8], [159.2, 'm', 'mia', 'are u alive', 162], [161, 'M', 'Mom', 'Missed call (5)', 164]];
function toasts(t) {
  const live = TOASTS.filter(([t0, , , , t1]) => t >= t0 && t < t1 + .4).slice(-3);
  live.forEach(([t0, ic, title, body, t1], i) => {
    const k = backOut(seg(t, t0, t0 + .35)) * (1 - ease(seg(t, t1, t1 + .4)));
    const x = W - 50 - 520 + (1 - k) * 80, y = 50 + i * 72;
    X.save(); X.globalAlpha = clamp(k);
    rrect(x, y, 520, 60, 16, { fill: C.white, stroke: C.ink, lw: 2 });
    rrect(x + 11, y + 11, 38, 38, 9, { fill: C.ink });
    txt(ic, x + 30, y + 37, { f: 'round', w: 800, size: 20, col: C.white, al: 'center' });
    txt(title, x + 62, y + 27, { f: 'round', w: 800, size: 18 });
    txt(fitTo(body, 520 - 78, { f: 'round', w: 400, size: 18 }), x + 62, y + 49, { f: 'round', w: 400, size: 18 });
    X.restore();
  });
}

// ================================================================ bottom strip: the heartbeat
const KIND_WORDS = "the next step is clear · the strongest lead is still ahead · public evidence is not exhausted · one further round is justified · I can also… · ";
function heartStrip(t, fg) {
  const s = secAt(t);
  let spikes = null, words = null;
  if (s.name === 'pre1' || s.name === 'pre2') {     // (not in pre 3: nothing under the contribution graph)
    spikes = cardsIn(s.name).filter(c => c.text.startsWith("I'm so proud")).map(c => c.words[2].t); words = KIND_WORDS; }
  if (!spikes) return;
  const a = ease(seg(t, s.a, s.a + .6)) * (1 - ease(seg(t, s.b - .4, s.b))), lastP = spikes.filter(p => p <= t).pop() ?? -9;
  // a plain line; in the later pre-choruses it turns into the AI's kind words from "you're almost through" on
  const textFrom = s.name === 'pre1' ? Infinity : cardsIn(s.name).find(c => c.text === "You're almost through").start;
  heart(296, STRIP_Y, 30 * (1 + .4 * Math.exp(-(t - lastP) * 6)), { fill: fg, a });
  ecg(330, W - 60, STRIP_Y, 18, spikes, t, { col: fg, a, speed: 300, words, textFrom, stretch: 2.6, wsize: 13 });
}

// ================================================================ final chorus: the wall of pushes, in front of the terminals
// each row takes the next items of the pool until it is wider than the screen, so no line shows twice at once
const _rows = [];
function wallRow(r, f) {
  for (let i = _rows.length, n = _rows.length ? _rows[_rows.length - 1].n : 0; i <= r; i++) {
    let s = '';
    while (measure(s, f) < W * 2.1) s += pick(CHATPOOL, n++) + '   ·   ';
    _rows.push({ s, n });
  }
  return _rows[r].s;
}
const wallK = t => ease(seg(t, lerp(ZOOM[0], ZOOM[1], .45), ZOOM[1] + .2)) * (1 - ease(seg(t, 169.6, 170.4))) * (1 - .5 * ease(seg(t, 167, 167.8)));
function wallSpam(t) {
  const k = wallK(t);
  if (k <= 0) return;
  const dist = (t - 151) * 160 + Math.pow(seg(t, 151, 169.5), 3) * 2200 * 18.5 / 3, rowH = 54;
  for (let r = 0; r < H / rowH + 1; r++) {
    const dir = r % 2 ? 1 : -1, mf = ['mono', 'jet', 'courier', 'space'][r % 4], f = { f: r % 3 ? mf : 'sans', w: r % 3 ? 400 : 700, size: r % 3 ? 30 : 34 };
    const unit = wallRow(r, f), uw = measure(unit, f), off = frac((dist * dir * (1 + hash(r) * .5)) / uw) * uw;
    for (let x = -uw - off; x < W + uw; x += uw) txt(unit, x, r * rowH + 30, { ...f, col: C.paper, a: .55 * k });
  }
}

// ================================================================ the zoom out: the nine terminals are one cell of a grid of nine,
// which is one cell of a bigger one, and so on; too small to read, they fade into the wall of chat lines
// over three and a half seconds, eased at both ends; z falls geometrically, so every level of the grid takes as long.
// Every copy is drawn straight from a halved copy at least as big as it (a mip chain): never blown up, and every line as thick as the next
const ZOOM = [WALL - .2, WALL + 3.3];
const _mips = [];
function zoomOut(t) {
  const u = ease(seg(t, ZOOM[0], ZOOM[1])), z = Math.pow(1 / 81, u), tw = W * z, th = H * z;
  let src = withLayer(1, () => { bg(C.dark); for (let i = 0; i < 9; i++) if (isOpen(i, t)) terminal(i, t, 1); });
  for (let l = 0; src.width / 2 >= tw && l < 8; l++) {
    const m = _mips[l] || (_mips[l] = mkCanvas(Math.round(W / 2 ** (l + 1)), Math.round(H / 2 ** (l + 1)))), g = m.getContext('2d');
    g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high'; g.clearRect(0, 0, m.width, m.height);
    g.drawImage(src, 0, 0, m.width, m.height); src = m;
  }
  const x0 = (W - tw) / 2, y0 = (H - th) / 2, ni = Math.ceil(x0 / tw) + 1, nj = Math.ceil(y0 / th) + 1;
  const layer = withLayer(2, g => {
    g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    for (let j = -nj; j <= nj; j++) for (let i = -ni; i <= ni; i++) g.drawImage(src, x0 + i * tw, y0 + j * th, tw, th);
  });
  blit(layer, { a: 1 - ease(seg(u, .6, 1)) });
}

// the picture rolls up, out of the contribution graph and into the nine dark terminals, like a TV losing its hold
const ROLL = [DARK_ON, DARK_ON + .75];
function rollTo(t) {
  const dy = Math.round(ease(seg(t, ROLL[0], ROLL[1])) * H);
  X.save(); X.translate(0, -dy); contribGraph(t, 132.9, C.paper, 1); X.restore();
  X.save(); X.translate(0, H - dy); for (let i = 0; i < 9; i++) if (isOpen(i, t)) terminal(i, t, 1); X.restore();
  X.save(); X.fillStyle = C.paper; X.fillRect(0, H - dy - 6, W, 12); X.restore();               // the blanking bar rolls through
}

// ================================================================ the frame
function drawWorld(t) {
  const s = secAt(t), dark = isDark(t), fg = dark ? C.paper : C.ink, quiet = s.name === 'intro' || s.name === 'out';
  bg(dark ? C.dark : C.paper);
  X.save();
  const [sx, sy] = shakeXY(t, astShake(t)); X.translate(sx, sy);                  // the asteroid shakes the world
  if (NIGHT(t)) {
    const a = ease(seg(t, 124.1, 125));
    if (t < 132.8) hypnoSpiral(t, C.paper, a * (1 - ease(seg(t, 132.3, 132.8))));
    else contribGraph(t, 132.9, C.paper, a * ease(seg(t, 132.8, 133.3)));
  } else if (t >= ROLL[0] && t < ROLL[1]) rollTo(t);
  else if (isPhone(t)) phoneWorld(t);
  else if (chatPhase(t)) { webChat(t); if (!quiet) chatWorld(t); }
  else if (t >= ZOOM[0] && t < ZOOM[1]) zoomOut(t);
  else if (t < ZOOM[0]) {
    for (let i = 0; i < 9; i++) {
      if (isOpen(i, t)) terminal(i, t, ease(seg(t, OPEN[i], OPEN[i] + .3)));
      else if (!dark) cellContent(i, t);
    }
    if (!dark) graphOver(t);
  }
  if (!quiet && !dark) sidebar(t, C.ink);
  X.restore();
  asteroid(t);
  if (s.name === 'ch3') wallSpam(t);
  if (!quiet) { toasts(t); heartStrip(t, fg); }
  // lyrics on top, on their own backing; when exhausted they only jitter a little
  const ex = exhaustion(t), [jx, jy] = shakeXY(t, 5 * ex);
  HALO = dark ? C.dark : C.paper;
  X.save(); X.translate(jx, jy); drawLyrics(t, fg); X.restore();
  postFX(t);
  // "the world could be ending": the one full-screen glitch
  const te = CARDS.find(c => c.text.startsWith('The world')).words[4].t;
  if (t >= te && t < te + .6) glitch(t, (hash(Math.floor(t * 20)) > .35 ? 1 : .3) * (1 - seg(t, te, te + .6)));
  // before the music: the photosensitivity warning, in the middle of the empty chat
  const wa = ease(seg(t, -INTRO, -INTRO + .25)) * (1 - ease(seg(t, -.35, 0)));
  if (wa > 0) photoWarning(960, 470, wa);
}

function photoWarning(x, y, a) {
  X.save(); X.globalAlpha = a; X.strokeStyle = C.ink; X.lineWidth = 3; X.lineJoin = 'round';
  X.beginPath(); X.moveTo(x, y - 92); X.lineTo(x + 30, y - 40); X.lineTo(x - 30, y - 40); X.closePath(); X.stroke(); X.restore();
  txt('!', x, y - 47, { f: 'sans', w: 900, size: 30, al: 'center', a });
  txt('PHOTOSENSITIVITY WARNING', x, y, { f: 'sans', w: 800, size: 30, al: 'center', a, track: 2 });
  txt('This video contains flashing lights.', x, y + 42, { f: 'round', w: 600, size: 24, al: 'center', a });
}
