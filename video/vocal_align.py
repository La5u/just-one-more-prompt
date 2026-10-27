"""Re-time every lyric word by forced alignment (wav2vec2 MMS_FA) of the known words against the isolated vocal.

  ~/.cache/vox-venv/bin/python -I vocal_align.py vocals.wav data/timeline.json data/vocal_sync.json data/vocal_align.json

Each card is aligned on its own window (from just before its first word to just after the next card starts),
with a star token on both sides to soak up breaths and backing vocals. Times that jump more than MAXJ from the
current ones, or run backwards, are kept as they were.
"""
import json, re, sys
import numpy as np, soundfile as sf, torch, torchaudio
from torchaudio.pipelines import MMS_FA as B

VOC, TL, OLD, OUT = sys.argv[1:5]
MAXJ = .8
tl = json.load(open(TL)); cards = tl["cards"]
old = json.load(open(OLD))["words"]
cur = []                                    # the times the video uses now (vocal_sync over timeline)
for ci, c in enumerate(cards):
    ts = [w["t"] for w in c["words"]]
    for wi, v in enumerate(old.get(str(ci), [])):
        if v is not None: ts[wi] = v
    cur.append(ts)

y, sr = sf.read(VOC); y = y.mean(1) if y.ndim > 1 else y
wav = torchaudio.functional.resample(torch.tensor(y, dtype=torch.float32)[None], sr, B.sample_rate)
model, tok, aligner = B.get_model(with_star=True), B.get_tokenizer(), B.get_aligner()
norm = lambda w: re.sub(r"[^a-z]", "", w.lower().replace("'", ""))
out, rep = {}, []
for ci, c in enumerate(cards):
    words = [norm(w["w"]) for w in c["words"]]
    if not all(words):
        out[ci] = [None] * len(words); continue
    a = max(0, cur[ci][0] - .9)
    nxt = cur[ci + 1][0] if ci + 1 < len(cards) else cur[ci][-1] + 2
    b = max(cur[ci][-1] + .9, nxt + .3)
    seg = wav[:, int(a * B.sample_rate):int(b * B.sample_rate)]
    with torch.inference_mode():
        em, _ = model(seg)
    spans = aligner(em[0], tok(["*"] + words + ["*"]))[1:-1]
    fps = seg.shape[1] / em.shape[1] / B.sample_rate
    ts, last = [], -9
    for wi, sp in enumerate(spans):
        t = round(a + sp[0].start * fps, 3)
        if abs(t - cur[ci][wi]) > MAXJ or t <= last + .05: t = None
        ts.append(t)
        if t is not None: last = t
    out[ci] = ts
    rep.append(f"{ci:2d} {c['text'][:30]:30s} " + " ".join(
        f"{w['w']}:{cur[ci][wi]:.2f}>{'--' if v is None else f'{v:.2f}'}" for wi, (w, v) in enumerate(zip(c['words'], ts))))
d = np.array([v - cur[ci][wi] for ci, ts in out.items() for wi, v in enumerate(ts) if v is not None])
print("\n".join(rep), file=sys.stderr)
print(f"aligned {len(d)} words; shift vs now: median {np.median(d):+.3f}  mean {d.mean():+.3f}  |>.15| {np.sum(abs(d) > .15)}", file=sys.stderr)
json.dump({"words": {str(k): v for k, v in out.items()}}, open(OUT, "w"))
