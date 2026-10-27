"""Re-time every lyric word against the isolated vocal: whisper on the stem, align to the cards, snap to onsets."""
import json, re, sys, difflib, numpy as np, soundfile as sf
from faster_whisper import WhisperModel
VOC, TL, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
tl = json.load(open(TL)); cards = tl["cards"]
y, sr = sf.read(VOC); y = y.mean(1) if y.ndim > 1 else y
norm = lambda w: re.sub(r"[^a-z]", "", w.lower())
# whisper on the stem, with the lyrics as a hint
y16 = np.interp(np.arange(0, len(y), sr / 16000), np.arange(len(y)), y).astype(np.float32)
m = WhisperModel(sys.argv[4] if len(sys.argv) > 4 else "medium.en", device="cpu", compute_type="int8")
hint = " ".join(dict.fromkeys(c["text"] for c in cards))
segs, _ = m.transcribe(y16, language="en", word_timestamps=True, vad_filter=False, initial_prompt=hint[:800], condition_on_previous_text=False)
hw = [(norm(w.word), w.start, w.end) for s in segs for w in s.words if norm(w.word)]
print("whisper words:", len(hw), file=sys.stderr)
# vocal energy, 10 ms hop
hop = int(sr * .01); n = len(y) // hop
e = np.array([np.sqrt(np.mean(y[i * hop:(i + 1) * hop] ** 2)) + 1e-6 for i in range(n)])
le = 20 * np.log10(e); floor = np.percentile(le, 30)
def onset(t, lo=-.15, hi=.2):
    """the strongest rise of vocal energy near t (a word starting after a gap or a consonant)"""
    a, b = max(1, int((t + lo) * 100)), min(n - 1, int((t + hi) * 100))
    if b <= a: return t
    d = np.convolve(le, np.ones(3) / 3, "same")
    rise = d[a:b] - d[a - 1:b - 1]
    k = int(np.argmax(rise))
    return (a + k) / 100 if rise[k] > 1.5 else t
# align lyric words (all cards, in order) with whisper's words
lw = [(ci, wi, norm(w["w"])) for ci, c in enumerate(cards) for wi, w in enumerate(c["words"])]
sm = difflib.SequenceMatcher(None, [x[2] for x in lw], [x[0] for x in hw], autojunk=False)
new = {}
for a, b, size in sm.get_matching_blocks():
    for k in range(size):
        ci, wi, _ = lw[a + k]; t0 = hw[b + k][1]
        old = cards[ci]["words"][wi]["t"]
        if abs(t0 - old) < 1.5: new[(ci, wi)] = round(onset(t0), 3)
print("matched", len(new), "of", len(lw), file=sys.stderr)
out = {}
for ci, c in enumerate(cards):
    ts = [new.get((ci, wi)) for wi in range(len(c["words"]))]
    # keep order; drop a matched time that runs backwards
    last = -9
    for wi, v in enumerate(ts):
        if v is not None and v <= last + .05: ts[wi] = None
        if ts[wi] is not None: last = ts[wi]
    out[ci] = ts
    print(ci, c["text"][:34].ljust(34), " ".join(f"{w['w']}:{w['t']:.2f}>{'--' if v is None else f'{v:.2f}'}" for w, v in zip(c["words"], ts)), file=sys.stderr)
json.dump({"words": out, "whisper": hw}, open(OUT, "w"))
