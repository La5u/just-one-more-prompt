// logs.js: generic lines taken from real pi and Claude Code sessions (what was typed, what failed, what the
// agent said). Each pool is shuffled once; windows read different stretches of it so nothing repeats on screen.
const shuffled = (a, seed) => a.map((s, i) => [hash(i * 13.7 + seed), s]).sort((x, y) => x[0] - y[0]).map(p => p[1]);
const pick = (pool, n) => pool[((Math.floor(n) % pool.length) + pool.length) % pool.length];

const PROMPTS = shuffled(['eta', 'continue', 'sure', 'eta?', 'resume', 'done', 'ok', 'audit', 'ping', 'hi', 'sorry i restarted can u resume', 'fix',
  'resume based on handoff', 'conitnue', 'what abt now', 'restart it', 'status update?', 'sure do it', 'next steps', 'doit', 'it crashed', 'same thing',
  'same issu', 'sure do that', 'go', 'completely useless. try again', 'its done', 'js fix it carefully', 'i already did that tho', 'nice ty', 'okay do that',
  'status?', 'oka', 'look at handoff and recommend next stesp', 'audit this project, suggest next steps', 'i think its prime time to refactor this project',
  'okay u do it ill allow u', 'write in handoff how to restsart', 'continue based on handoff', 'nice. continue', 'continue. another erstart',
  'how much time is left', 'should we pause and work w waht we have', 'fix it', 'ran it', 'whats the progress', 'can u make the performance better and faster',
  'its so slowww', 'fix and refactir', 'another restart, alst one frfr', 'how uch progress was lost', 'can u pause it', 'but i dnt want to lose progress',
  'how to mkae it faster', 'what can u do in the meantime', 'why is everythig so slow', 'last restart frfr', "finally we're starting to get somehwer",
  'continue retry', 'not bad. but we can improve further', 'contunu', 'contine', 'review', 'ok do it', 'why is it takin so long', 'so its been a while',
  'still nothing?', 'why do i haeto wait an hour', 'can u continue narrowing it down', 'what abt the other bug', 'seems to work fine', 'trya gain',
  'oaky it worked.', 'can u debug for me', 'find the leak?', 'again', 'what else?', 'okay try again, and send notification when ur done',
  'okay im ready to test it can u test for me', 'well', 'so in conlusion, what was the issue', 'audit, commit, push', 'contnue',
  'okay do that, and implement the recommended points', 'write that in handoff so i can refresh session', 'ead handoff and suggest next stesps',
  'do 1 2 3 4, and put off 4, 5, 6 for later', 'downloaded. cant u do those in parallel', 'sure if its fast', 'cant u run it', 'no rate limits?',
  'maybe reduce paralleliztion', 'cant u parallellize', 'js test first', 'why not run 20 subagents at once', 'assume unlimited usage',
  'why isnt it running 32 in prallel', 'do u want to start refactoring this project ?', 'limit reset', 'ran out of usage',
  'stuck on loading data. cmon optimize it bruh', 'ok i got more ram', 'should i increase swap?', 'r u sure theres no other memory leaks',
  'it restarted again', 'bruh i had to restart again', 'then its useles', 'try again', 'sure test then puhs', 'nice. do it', 'sure continue investigating',
  'anything better? give me options', 'sure 1+2+3.', 'im trying to improve this to 97% accuracy', 'do u want me to label more?',
  'wait whats the one sentence summary again?', 'hiiiiiiii', 'onitu', '8sn8t done', 'contiue', 'okay dig deeper', 'keep going', 'what next?'], 1);

const ERRORS = shuffled(['Traceback (most recent call last):', 'Exit code 1', 'Exit code 2', 'Exit code 144', 'Exit code 127', 'Exit code 143', 'Exit code 128',
  'FAILED (failures=1)', 'FAILED (errors=1)', 'throw new AssertionError(obj);', 'sqlite3: command not found', 'Error opening output files: Encoder not found',
  'environment variable not found', 'AssertionError: 1 != 0', 'FAILED (failures=1, skipped=23)', 'IndexError: list index out of range',
  "name: 'TimeoutError'", 'FAILED (failures=1, errors=1)', "ModuleNotFoundError: No module named 'selenium'", 'FAILED (failures=2)',
  'Timeout 30000ms exceeded.', "ModuleNotFoundError: No module named 'scipy'", 'error: rate limited, try again in a minute', 'error: offline',
  'AssertionError: 38 != 26', '[worker] failed (error)', 'xxd: command not found', 'driver: error: binding mismatch',
  'BrokenPipeError: [Errno 32] Broken pipe', 'Authorization failed.', 'AssertionError: 1092 != 1098', 'uv: command not found', 'raise self._exception',
  'Error: No such file or directory (os error 2)', "[page error] Unexpected token ')'", "ModuleNotFoundError: No module named 'demucs'",
  'fatal: Needed a single revision', 'openssl: command not found', 'no such option', "AssertionError: 'amount' not found in []", 'AssertionError: 5 != 6',
  'KeyError: 0', 'FAILED (errors=4)', "fatal: --mirror can't be combined with refspecs", "throw er; // Unhandled 'error' event",
  'triggerUncaughtException(', "KeyError: 'model_path'", '404: Not Found', 'HTTP Error 404: Not Found', '[Errno 5] Input/output error',
  'base64: invalid input', "error: unknown option '-g'", 'flatpak: command not found', 'erofs: failed to open image file',
  'ValueError: min() iterable argument is empty', 'AssertionError: 0 != 1', "NameError: name 'pp' is not defined", 'SyntaxError: invalid syntax',
  'FAILED (errors=29)', 'ERROR: Reconnecting... 2/5', 'TimeoutError: The read operation timed out', 'failed timeout after 900 s',
  'InputValidationError', 'ValueError: Stale source: script.js', 'fatal: is not a working tree', 'ugrep: error: error at position 113',
  'bfs: error: Invalid timestamp.', 'tail: option used in invalid context -- 5', 'codex exec failed (exit 1)', 'Retrying 1 fetch_error records',
  'python3 failed with exit status 1.', 'raise HTTPError(http_error_msg)', 'usage limit reached; resets 01:30', "You've hit your usage limit.",
  "ModuleNotFoundError: No module named 'cv2'", "ModuleNotFoundError: No module named 'librosa'", 'FAILED (failures=1, errors=5)',
  'ValueError: unexpected payload', 'heap out of memory', 'Killed', 'Segmentation fault (core dumped)', 'npm ERR! code ELIFECYCLE'], 2);

const AI_SAYS = shuffled(['Nothing is committed yet.', 'All checks pass.', 'Which do you want?', 'Should I go ahead?', 'Everything passes.', 'Checking why:',
  "You're right.", 'Updating HANDOFF.md:', 'Committing and pushing:', 'The handoff is updated.', 'I have what I need.', 'Now the edits.', 'All tests pass.',
  'The test passes.', 'Checking the logs:', 'Sorry about that.', 'Want me to build it?', 'Want me to do that?', "It's running.", 'Now the regression tests.',
  "I'll wait for it to finish.", 'Fixing both:', "Here's where things stand.", 'Now making the edits:', "While that rebuilds, I'm updating HANDOFF.md.",
  'Smoke test passes.', 'Reading the key ones in full:', "No, I'm not sure.", 'The suite passes.', 'Should I start it?', 'Checking progress:',
  'None of this is committed yet.', 'Should I commit and push?', 'Still running.', 'Reverting that line:', 'The response above may be incomplete.',
  'Fixing that now.', 'Everything checks out.', "It's pushed and the checks pass.", 'Running the tests:', 'Fixing the test:', 'All 152 tests pass.',
  'Both are fixed.', "I haven't changed anything.", "That's normal.", "Here's the draft.", "I haven't found the cause yet.", 'Same crash on a fresh launch.',
  'Tell me what to adjust.', "I'm sorry it cost you an hour and a restart.", "I'd keep it.", 'Debugging why the zip step fails.', 'Checking when that started.',
  'Deleting now.', "Next I'll run the full suite.", 'The full suite passes.', 'All four steps are done.', 'Nothing has been committed.',
  'Downloads are still running.', 'Reading the surrounding code:', 'Writing the code now.', 'Only three suites fail.', 'Checking CI:',
  "The CI run hasn't appeared yet.", "That's your call.", 'Now the tests.', 'Still blocked for the cleanup.', 'Trying the commits:', 'Rerunning those steps.',
  'Now the housekeeping.', "While that runs, I'm building the feature.", 'The next step is…', 'The strongest remaining lead is…',
  'Public evidence is not exhausted.', 'One further round is justified.'], 3);

const TOOLS = shuffled(['Bash(npm test)', 'Read(README.md)', 'Edit(src/app.ts)', 'Grep(TODO)', 'Bash(git status)', 'Bash(python3 -m pytest)',
  'Read(HANDOFF.md)', 'Write(HANDOFF.md)', 'Bash(git push)', 'Task(explore) → 3 subagents', 'Bash(uv run main.py)', 'Glob(**/*.ts)', 'Bash(make)',
  'Edit(tests/test_app.py)', 'Bash(pip install -r requirements.txt)', 'WebSearch(error message)', 'Bash(git diff)', 'Bash(npm run build)',
  'Read(package.json)', 'Bash(kill %1)', 'Bash(tail -f log.txt)', 'Bash(sleep 600)', 'Edit(AGENTS.md)', 'Bash(git commit -m "fix")', 'Read(src/app.ts)',
  'Edit(src/everything.ts)', 'Bash(rm -rf node_modules)', 'Bash(npm install)', 'Task(plan) → 4 subagents', 'Bash(git stash)', 'Read(log.txt)'], 4);

// Claude Code's own spinner words
const SPIN = ['Thinking…', 'Pondering…', 'Reticulating…', 'Deliberating…', 'Cogitating…', 'Percolating…', 'Noodling…', 'Brewing…', 'Simmering…', 'Musing…',
  'Ruminating…', 'Churning…', 'Mulling…', 'Synthesizing…', 'Wrangling…', 'Spelunking…'];
// everything typed and answered, for the wall and the spiral
const CHATPOOL = shuffled([...PROMPTS, ...AI_SAYS, ...ERRORS, ...TOOLS], 5);
