// escalate.js: the last third piles on, a different effect each time, never the same one twice:
//   bridge "am I okay?": the picture blurs for a split second
//   pre 3 → chorus 3: the picture rolls up into the dark terminals (scenes.js, rollTo)
//   chorus 3, the wall: the whole frame punches in on every beat
//   chorus 3 "continue, continue": the screen turns negative on each word
//   chorus 3, the last second before the quiet outro: a fast strobe (there is a warning at the start)
const cardAt = (sec, text, n = 0) => cardsIn(sec).filter(c => c.text === text)[n];
let _post = null, _small = null;
const postCanvas = () => { if (!_post) _post = mkCanvas(); const g = _post.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, H); g.drawImage(OUT, 0, 0); return _post; };

// ---------- whole-frame effects (on the finished picture) ----------
function invertAll(a = 1) { X.save(); X.setTransform(1, 0, 0, 1, 0, 0); X.globalAlpha = a; X.globalCompositeOperation = 'difference'; X.fillStyle = C.white; X.fillRect(0, 0, W, H); X.restore(); }
function postFX(t) {
  // bridge: "am I okay?" goes out of focus for a moment on "okay"
  const ok = cardAt('br', 'Am I okay?');
  if (ok) {
    const lt = t - ok.words[2].t, r = lt < 0 ? 0 : 18 * ease(lt / .1) * (1 - ease((lt - .1) / .5));
    if (r > .3) { const src = postCanvas(); X.save(); X.setTransform(1, 0, 0, 1, 0, 0); X.filter = `blur(${r.toFixed(2)}px)`; X.drawImage(src, 0, 0); X.restore(); }
  }
  // chorus 3, the wall: a punch in on each beat
  if (t >= WALL + 3.4 && t < 170.4) {
    const k = 1 + .035 * beatPulse(t, 10);
    if (k > 1.002) { const src = postCanvas(); X.save(); X.setTransform(1, 0, 0, 1, 0, 0); X.drawImage(src, W * (1 - k) / 2, H * (1 - k) / 2, W * k, H * k); X.restore(); }
  }
  // chorus 3: each "continue" turns the screen negative for a moment
  const cc = cardAt('ch3', 'Continue, continue');
  if (cc) for (const w of cc.words) if (t >= w.t && t < w.t + .14) invertAll();
  // the last second before the outro: a fast strobe
  const st = t - (GRID_OFF - 1.2);
  if (st >= 0 && t < GRID_OFF && frac(st * 11) < .45) invertAll(.9);
}
