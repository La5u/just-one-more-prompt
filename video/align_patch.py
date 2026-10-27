import json, sys, librosa
from faster_whisper import WhisperModel
wav, t0, t1 = sys.argv[1], float(sys.argv[2]), float(sys.argv[3])
y, sr = librosa.load(wav, sr=16000, offset=t0, duration=t1 - t0)
m = WhisperModel("small", device="cpu", compute_type="int8")
hint = ("Somebody shipped a startup while I was asleep. Now I count the tokens like it's my heartbeat. "
        "The coffee went cold in the same old cup. The world could be ending, I didn't even look up. "
        "Is it done? Almost. Is it good? Almost. Am I okay? Almost. Are we there? Almost.")
segs, _ = m.transcribe(y.astype("float32"), language="en", word_timestamps=True, vad_filter=False, condition_on_previous_text=False)
out = [{"start": s.start + t0, "end": s.end + t0, "text": s.text.strip(),
        "words": [{"w": w.word.strip(), "s": w.start + t0, "e": w.end + t0} for w in s.words]} for s in segs]
json.dump(out, open(sys.argv[4] if len(sys.argv) > 4 else "data/patch.json", "w"), indent=1)
for s in out: print(f"{s['start']:6.2f}-{s['end']:6.2f} {s['text']}")
