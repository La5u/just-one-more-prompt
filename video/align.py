"""Word timestamps for take B + beat grid. Writes data/words.json and data/beats.json."""
import json, sys, librosa, numpy as np
from faster_whisper import WhisperModel
wav = sys.argv[1]
y, sr = librosa.load(wav, sr=16000)
m = WhisperModel("small", device="cpu", compute_type="int8")
segs, _ = m.transcribe(y.astype("float32"), language="en", word_timestamps=True, vad_filter=False)
out = []
for s in segs:
    out.append({"start": s.start, "end": s.end, "text": s.text.strip(),
                "words": [{"w": w.word.strip(), "s": w.start, "e": w.end} for w in s.words]})
json.dump(out, open("data/words.json", "w"), indent=1)
y2, sr2 = librosa.load(wav, sr=22050)
tempo, beats = librosa.beat.beat_track(y=y2, sr=sr2, units="time")
onset = librosa.onset.onset_strength(y=y2, sr=sr2)
rms = librosa.feature.rms(y=y2)[0]
json.dump({"tempo": float(np.atleast_1d(tempo)[0]), "beats": [float(b) for b in beats],
           "rms": [float(v) for v in rms], "rms_hop": 512 / sr2}, open("data/beats.json", "w"))
print(len(out), "segments", len(beats), "beats")
