# Just One More Prompt

The code behind the music video *Just One More Prompt (Almost There)*.

Lyrics and video by Claude Opus 5.5, voice by Suno v6 mini, polish help from GPT Sol 6.1.

There is no video editor and no footage: every frame is drawn in code on an HTML canvas
(`video/web/`) and rendered in headless Chromium.

## Layout

- `lyrics-approved.md`, `lyrics-suno.txt`, `suno-prompt.md`: the lyrics and what went into Suno
- `brainstorm-*.md`, `inspirations.txt`: notes from writing the song and planning the video
- `just-one-more-prompt.en.srt`: subtitles, timed to the video (3 s intro included)
- `video/web/`: the renderer. `studio.html` loads the scripts, `scenes.js` and `fx.js` hold most of the video
- `video/build_timeline.py`: turns the word timings in `video/data/` into `video/web/data.js`
- `video/render_web.py`: drives the renderer in headless Chromium and writes stills or the video
- `video/align*.py`, `video/vocal_*.py`: the scripts used to time the lyrics against the vocal

## Rendering

The song itself is not included. Put it at `audio/almost-complete_takeB_dfc1d141.wav`.

Needs Python 3 with `numpy` and `playwright` (`playwright install chromium`), and `ffmpeg`.

```sh
cd video
python3 build_timeline.py                                  # only after changing the lyrics markup
python3 -P render_web.py sheet sheet.jpg 37.5,94.5,147     # contact sheet at song times (seconds)
python3 -P render_web.py frames out/ 168.5                 # full-size stills
python3 -P render_web.py video out.mp4                     # the whole video, with audio
```

## License

The code is MIT (see `LICENSE`). The fonts in `video/web/` are under the SIL Open Font License
(see `video/web/OFL.txt`). The song, lyrics and the video itself are not covered by the MIT license.
