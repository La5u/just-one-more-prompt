"""Drive web/studio.html in headless Chromium.

  python3 -P render_web.py sheet out.jpg 1.5,8,20 [cols]      contact sheet at song times
  python3 -P render_web.py frames outdir 1.5,8,20             full-size jpgs at song times
  python3 -P render_web.py video out.mp4 [start end] [workers] full video with audio (song time; intro starts at -3)
"""
import asyncio, base64, json, os, re, subprocess, sys, wave
import numpy as np
from playwright.async_api import async_playwright

HERE = os.path.dirname(os.path.abspath(__file__))
PAGE = "file://" + os.path.join(HERE, "web", "studio.html")
SONG = os.path.join(HERE, "..", "audio", "almost-complete_takeB_dfc1d141.wav")
INTRO, FPS = 3.0, 30
ARGS = ["--enable-gpu", "--use-angle=gl-egl", "--ignore-gpu-blocklist", "--allow-file-access-from-files"]


async def open_page(p):
    b = await p.chromium.launch(headless=True, args=ARGS)
    pg = await b.new_page(viewport={"width": 1920, "height": 1080})
    pg.on("pageerror", lambda e: print("[page error]", e))
    pg.on("console", lambda m: print("[console]", m.text) if m.type in ("error", "warning") else None)
    await pg.goto(PAGE)
    await pg.wait_for_function("window.ready === true", timeout=60000)
    return b, pg


async def sheet(out, times, cols):
    async with async_playwright() as p:
        b, pg = await open_page(p)
        r = await pg.evaluate("([ts, c]) => window.renderSheet(ts, c, 640)", [times, cols])
        open(out, "wb").write(base64.b64decode(r["url"].split(",", 1)[1]))
        print(out, "ms/frame", r["ms"])
        await b.close()


async def frames(outdir, times):
    os.makedirs(outdir, exist_ok=True)
    async with async_playwright() as p:
        b, pg = await open_page(p)
        for t in times:
            url = await pg.evaluate("t => window.renderAt(t, 'image/jpeg', .9)", t)
            open(os.path.join(outdir, f"f{t:07.2f}.jpg"), "wb").write(base64.b64decode(url.split(",", 1)[1]))
        await b.close()


async def worker(p, idx, frames, seg_path):
    b, pg = await open_page(p)
    ff = subprocess.Popen(["ffmpeg", "-loglevel", "error", "-y", "-f", "image2pipe", "-framerate", str(FPS), "-c:v", "mjpeg",
                           "-i", "-", "-c:v", "libopenh264", "-b:v", "14M", "-pix_fmt", "yuv420p", seg_path], stdin=subprocess.PIPE)
    for n, t in enumerate(frames):
        url = await pg.evaluate("t => window.renderAt(t, 'image/jpeg', .93)", t)
        ff.stdin.write(base64.b64decode(url.split(",", 1)[1]))
        if idx == 0 and n % 150 == 0:
            print(f"worker0 {n}/{len(frames)}", flush=True)
    ff.stdin.close(); ff.wait(); await b.close()


def build_audio(path):
    tl = json.load(open(os.path.join(HERE, "data", "timeline.json")))
    with wave.open(SONG) as w:
        sr, ch = w.getframerate(), w.getnchannels()
        song = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).reshape(-1, ch).astype(np.float32)
    full = np.concatenate([np.zeros((int(INTRO * sr), ch), np.float32), song])
    rng = np.random.default_rng(3)

    def click(at, gain, length=.016, freq=2600):
        i = int((at + INTRO) * sr); n = int(length * sr)
        if i < 0 or i + n >= len(full): return
        env = np.exp(-np.linspace(0, 9, n))
        tone = rng.standard_normal(n) * env * .7 + np.sin(np.linspace(0, 2 * np.pi * freq * length, n)) * env * .6
        full[i:i + n] += (tone * gain * 32767)[:, None]
    for e in tl["typing"]:
        if e["t"] >= 113: continue
        g = .22 if e["t"] < 0 else .07
        for k in range(len(e["text"])):
            click(e["t"] + k / e["cps"] + rng.uniform(-.012, .012), g * rng.uniform(.8, 1.1))
        click(e["send"], g * 1.5, .03, 1500)
    # the last "continue", typed in one second and ending on the second whisper (never sent) (scenes.js OUTRO_KEYS, core.js OUT_CONT)
    send = float(re.search(r"OUT_CONT = \[[\d.]+, ([\d.]+)\]", open(os.path.join(HERE, "web", "core.js")).read()).group(1))
    for k in range(8):
        click(send - 1.0 + k * .12 + rng.uniform(-.02, .02), .1 * rng.uniform(.8, 1.1))
    ACT = ['enter', 'retry', 'enter', 'edit', 'enter', 'undo', 'enter', 'retry', 'enter']   # same order as scenes.js
    for sec in ("ch1", "ch2", "ch3"):
        cs = [c for c in tl["cards"] if c["sec"] == sec]
        for i, c in enumerate(cs):
            at = c["start"] - .06
            if ACT[i % len(ACT)] == "enter":       # "continue" typed fast, then Enter
                for k in range(8):
                    click(at - .42 + k * .05 + rng.uniform(-.01, .01), .05)
                click(at, .12, .04, 600)
            else:                                    # a button click
                click(at, .1, .02, 3200)
    out = np.clip(full, -32768, 32767).astype(np.int16)
    with wave.open(path, "wb") as o:
        o.setnchannels(ch); o.setsampwidth(2); o.setframerate(sr); o.writeframes(out.tobytes())


async def video(out, t0, t1, workers):
    n = int(round((t1 - t0) * FPS))
    frames = [t0 + i / FPS for i in range(n)]
    chunk = (n + workers - 1) // workers
    segs = [os.path.join(HERE, "data", f"seg{i}.mp4") for i in range(workers)]
    async with async_playwright() as p:
        await asyncio.gather(*[worker(p, i, frames[i * chunk:(i + 1) * chunk], segs[i]) for i in range(workers)])
    lst = os.path.join(HERE, "data", "segs.txt")
    open(lst, "w").write("".join(f"file '{s}'\n" for s in segs))
    wav = os.path.join(HERE, "data", "audio_mix.wav"); build_audio(wav)
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-f", "concat", "-safe", "0", "-i", lst,
                    "-ss", f"{t0 + INTRO:.3f}", "-t", f"{t1 - t0:.3f}", "-i", wav,
                    "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest", out], check=True)
    for s in segs: os.remove(s)
    print("wrote", out)


if __name__ == "__main__":
    mode = sys.argv[1]
    if mode == "sheet":
        asyncio.run(sheet(sys.argv[2], [float(x) for x in sys.argv[3].split(",")], int(sys.argv[4]) if len(sys.argv) > 4 else 3))
    elif mode == "frames":
        asyncio.run(frames(sys.argv[2], [float(x) for x in sys.argv[3].split(",")]))
    else:
        t0 = float(sys.argv[3]) if len(sys.argv) > 3 else -INTRO
        t1 = float(sys.argv[4]) if len(sys.argv) > 4 else 183.0
        wk = int(sys.argv[5]) if len(sys.argv) > 5 else 6
        asyncio.run(video(sys.argv[2], t0, t1, wk))
