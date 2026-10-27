"""Builds data/timeline.json for the web renderer from the whisper alignments.

Each lyric card gets: words with times, a kind (human / ai / chorus / bridge),
markup (*WORD = big key word, others small) and optional annotations.
Also writes the typing schedule, shared by the visuals and the click sounds.
"""
import difflib, json, os, re

HERE = os.path.dirname(os.path.abspath(__file__))
D = lambda f: os.path.join(HERE, "data", f)
SONG_END = 183.0

SECTIONS = [
    ("v1", 0.0, 17.85), ("pre1", 17.85, 35.7), ("ch1", 35.7, 57.3),
    ("v2", 57.3, 75.3), ("pre2", 75.3, 92.6), ("ch2", 92.6, 113.7),
    ("v3", 113.7, 124.1), ("br", 124.1, 132.8), ("pre3", 132.8, 145.0),
    ("ch3", 145.0, 170.5), ("out", 170.5, SONG_END),
]

# phrase -> (markup, annotations).  *WORD = big key word.  annotations: word index -> type
MARKUP = {
    "Started with a couple simple questions": ("started with a couple *simple *questions", {}),
    "Every answer came with more suggestions": ("every *answer came with *more *suggestions", {5: "circle"}),
    "It says I'm getting closer": ("it says I'm getting *closer", {}),
    "Says I'm absolutely right": ("says I'm *absolutely *right", {2: "scribble"}),
    "I'll close it in a minute": ("I'll *close it in a *minute", {}),
    "I'll close it tonight": ("I'll close it *tonight", {3: "strike:tomorrow"}),
    "Keep going, keep pushing": ("keep going, keep *pushing", {}),
    "You're doing so well": ("you're doing so *well", {}),
    "It's right around the corner": ("it's right around the *corner", {}),
    "Can't you tell?": ("can't you *tell?", {}),
    "Don't stop now": ("don't *stop now", {}),
    "You're almost through": ("you're *almost through", {}),
    "I'm so proud of you": ("I'm so *proud of you", {2: "heart"}),
    "Just one more prompt": ("just one more *prompt", {}),
    "Then I'll go to sleep": ("then I'll go to *sleep", {4: "strike:one more"}),
    "Just one more try": ("just one more *try", {}),
    "It's almost complete": ("it's almost *complete", {}),
    "Continue, continue": ("*continue, *continue", {}),
    "It tells me to stay": ("it tells me to *stay", {}),
    "We're almost there": ("we're *almost *there", {}),
    "Almost there": ("*almost there", {}),
    "We're almost": ("we're *almost…", {}),
    "Two chats open now": ("*two *chats open now", {}),
    "They're talking to each other": ("they're *talking to each other", {}),
    "I've got a hundred thoughts": ("I've got a *hundred *thoughts", {}),
    "And I don't call my mother": ("and I don't call my *mother", {5: "fade"}),
    "My friends sent a message": ("my *friends sent a *message", {}),
    "I'll answer it soon": ("I'll answer it *soon", {3: "strike:later"}),
    "I'm building something brilliant": ("I'm building something *brilliant", {}),
    "In an empty room": ("in an *empty *room", {2: "hollow", 3: "hollow"}),
    "Somebody shipped a startup while I was asleep": ("somebody *shipped a *startup while I was *asleep", {}),
    "Now I count the tokens like it's my heartbeat": ("now I count the *tokens like it's my *heartbeat", {8: "pulse"}),
    "The coffee went cold in the same old cup": ("the *coffee went *cold in the same old cup", {}),
    "The world could be ending, I didn't even look up": ("the *world could be *ending, I didn't even look *up", {}),
    "Is it done?": ("*is *it *done?", {}),
    "Is it good?": ("*is *it *good?", {}),
    "Am I okay?": ("*am *I *okay?", {}),
    "Are we there?": ("*are *we *there?", {}),
    "Continue?": ("*continue?", {}),
}
AI = {"Keep going, keep pushing", "You're doing so well", "It's right around the corner", "Can't you tell?",
      "Don't stop now", "You're almost through", "I'm so proud of you", "Continue?"}
PHRASES = list(MARKUP) + ["Is it done? Almost", "Is it good? Almost", "Am I okay? Almost", "Are we there? Almost", "Continue"]


def norm(s):
    return re.sub(r"[^a-z' ]", "", s.lower()).strip()


def section(t):
    for n, a, b in SECTIONS:
        if a <= t < b:
            return n
    return "out"


def load_segments():
    segs = json.load(open(D("words.json")))
    segs = [s for s in segs if not (113.5 <= s["start"] < 132.5)]          # hallucinated region
    segs = [s for s in segs if not (27.9 <= s["start"] < 35.7 or 85.0 <= s["start"] < 92.6)]  # proud x3
    segs = [s for s in segs if not (s["start"] >= 141.9 and "proud" in s["text"])]
    segs += json.load(open(D("v3patch.json")))
    for f in ("proud_27.5.json", "proud_84.6.json", "proud_87.8.json", "proud_141.6.json"):
        segs += json.load(open(D(f)))
    segs = [s for s in segs if s["text"].strip()]
    return sorted(segs, key=lambda s: s["start"])


def split_proud(seg):
    """'I'm so proud of you, I'm so proud of you' -> one segment per repetition."""
    ws = seg["words"]
    out, cur = [], []
    for w in ws:
        cur.append(w)
        if norm(w["w"]) == "you":
            out.append(cur); cur = []
    if cur:
        out.append(cur)
    res = []
    for g in out:
        if len(g) >= 2 and g[1]["s"] - g[0]["s"] > 0.8:   # whisper pins the first word to the clip start
            g[0] = dict(g[0], s=g[1]["s"] - 0.32)
        res.append({"start": g[0]["s"], "end": g[-1]["e"], "text": " ".join(w["w"] for w in g), "words": g})
    return res


def main():
    raw = []
    for s in load_segments():
        raw += split_proud(s) if "proud" in s["text"] else [s]
    cards = []
    for i, s in enumerate(raw):
        best = max(PHRASES, key=lambda p: difflib.SequenceMatcher(None, norm(p), norm(s["text"])).ratio())
        if norm(s["text"]).startswith("just one more round"):
            best = "Just one more prompt"
        sec = section(s["start"] + 0.01)
        if sec == "out":
            best = "Continue?"
        nxt = raw[i + 1]["start"] if i + 1 < len(raw) else s["end"] + 2
        ww = s["words"]

        def timed(phrase, words, t0, t1):
            n = len(phrase.split())
            if len(words) == n:
                return [w["s"] for w in words]
            span = min(t1 - t0, n * 0.42)
            return [t0 + k * span / n for k in range(n)]

        if best.endswith("Almost") and best.startswith(("Is", "Am", "Are")):
            q = best[: -len(" Almost")]
            qn = len(q.split())
            times = timed(best, ww, s["start"], nxt)
            ans = times[qn]
            if len(ww) == qn + 1:   # whisper's timing for "Almost" is unreliable: place it just after the question
                ans = min(ans, ww[qn - 1]["e"] + 0.45)
            cards.append(card(q, times[:qn], s, sec, "bridge", answer_t=ans))
            continue
        kind = "ai" if best in AI else ("chorus" if sec.startswith("ch") else "human")
        cards.append(card(best, timed(best, ww, s["start"], nxt), s, sec, kind))
    for a, b in zip(cards, cards[1:]):
        a["hide"] = round(min(b["start"] - 0.03, a["end"] + 1.3), 3)
    # the last "continue?" lands at the very end, just before the loop closes on the cursor
    last = cards[-1]
    shift = 180.6 - last["start"]
    last["start"] = round(last["start"] + shift, 3)
    for w in last["words"]:
        w["t"] = round(w["t"] + shift, 3)
    last["hide"] = SONG_END - .05
    for c in cards:
        if "answer" in c:
            c["answer"] = round(min(c["answer"], c["hide"] - 0.4), 3)
    # positions: alternate so consecutive lines never sit in the same spot
    slots = {"human": [0.40, 0.56, 0.46, 0.60], "chorus": [0.50, 0.44, 0.54], "ai": [0.42, 0.52, 0.46], "bridge": [0.46]}
    count = {}
    for c in cards:
        k = c["kind"]
        c["y"] = slots[k][count.get(k, 0) % len(slots[k])]
        c["tilt"] = {"human": -2.2 if count.get(k, 0) % 2 else -3.0, "chorus": -4.0, "ai": 3.0, "bridge": 0}[k]
        count[k] = count.get(k, 0) + 1

    typing = [  # what gets typed into the message box: faster, sloppier as the song goes
        {"t": -2.2, "text": "hi!", "cps": 5, "send": -0.9},
        {"t": 1.2, "text": "can you help me fix this?", "cps": 13, "send": 4.3},
        {"t": 9.0, "text": "ok. and the tests?", "cps": 14, "send": 11.4},
        {"t": 13.6, "text": "continue", "cps": 15, "send": 15.0},
        {"t": 58.6, "text": "continue", "cps": 20, "send": 59.4},
        {"t": 61.0, "text": "now do the other one", "cps": 24, "send": 62.2},
        {"t": 66.8, "text": "contniue", "cps": 26, "send": 67.4},
        {"t": 70.2, "text": "keep going", "cps": 28, "send": 70.8},
        
        
        
        
    ]
    beats = json.load(open(D("beats.json")))["beats"]
    json.dump({"cards": cards, "sections": SECTIONS, "typing": typing, "beats": beats, "end": SONG_END},
              open(D("timeline.json"), "w"), indent=1)
    with open(os.path.join(HERE, "web", "data.js"), "w") as f:
        f.write("const TL = " + json.dumps({"cards": cards, "sections": SECTIONS, "typing": typing, "beats": beats, "end": SONG_END}) + ";\n")
    for c in cards:
        print(f"{c['start']:7.2f} {c['hide']:7.2f} {c['kind']:6s} {c['sec']:5s} {c['text']}")


def card(text, times, seg, sec, kind, answer_t=None):
    markup, ann = MARKUP[text]
    words = []
    for i, (m, t) in enumerate(zip(markup.split(), times)):
        words.append({"w": m.lstrip("*"), "big": m.startswith("*"), "t": round(t, 3), "ann": ann.get(i)})
    c = {"text": text, "words": words, "start": round(times[0], 3), "end": seg["end"], "kind": kind, "sec": sec}
    if answer_t is not None:
        c["answer"] = round(answer_t, 3)
    return c


if __name__ == "__main__":
    main()
