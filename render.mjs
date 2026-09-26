// render.mjs: renders studio.html in headless Chrome. Length and fps come from the page (PROJECT in src/config.js).
//
//   Look at it (open the images with your image viewer / Read tool):
//     node render.mjs --sheet=0.5,1,1.5,2 [--cols=4] [--w=480] --out=out/check/a.jpg        contact sheet of chosen times
//     node render.mjs --strip=2.0:2.5 [--cols=6] [--w=320] --out=out/check/strip.jpg        EVERY frame in a stretch (motion)
//     node render.mjs --sheet=2.1,2.2 --crop=760,300,400,400 --w=600 --out=out/check/face.jpg full-res crops (details)
//     node render.mjs --stills=1.2,3.4 --out=out/stills                                     full-res PNGs
//   Make the video:
//     node render.mjs --clip [--range=0:4] --out=out/video.mp4                               straight to MP4 (one worker)
//     node render.mjs --frames [--range=0:8] --workers=4                                     JPEG frames → out/frames/<scene> (parallel, resumable)
//     node render.mjs --encode --out=out/video.mp4                                           out/frames/<scene> → MP4 (pass the same --scene)
//   Standalone loops (LOOPS in the page): add --loop=<name> to any of the above (times are then loop times), or
//     node render.mjs --loop=emotions --png --out=out/loop_emotions                          one cycle as PNGs (for GIFs)
//   Stale frames: --frames refuses to resume when the scene, engine, libraries or pixel flags changed since its frames
//   were rendered. Then pass --fresh (delete them all and render again) or --redo=a:b (re-render only those seconds and
//   keep the rest, only when the change is limited to them).
//   Before a render: node render.mjs --probe --scene=x [--script=...] [--look/--draft/--blur]   which GPU Chrome uses, free
//   memory, the cost of a frame at three points of the scene, and how many --workers to use
//   Check: node render.mjs --smoke [--script=projects/x.js]     every scene renders without page errors (exit 1 otherwise)
//   Look and finish: --look=flat (or any LOOKS entry; default: the scene's look) · --draft (fast flat preview for
//   iterating on motion and timing) · --blur=4 [--shutter=.5] motion blur from 4 subframes per frame (4x the time) ·
//   --post=bloom|film|punch colour/glow pass on --clip and --encode. Frames for a look, draft or blur go to their own
//   folder, so pass the same flags to --encode.
//   Music: --audio=assets/song.mp3 (or PROJECT.audio) is muxed into --clip and --encode. Other flags: --fps=24,
//   --chrome=<path to Chrome/Chromium>.
import puppeteer from 'puppeteer-core';
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, readFileSync, existsSync, statSync, renameSync, readdirSync, unlinkSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { cpus, freemem, totalmem } from 'node:os';
import { execSync } from 'node:child_process';

const args = Object.fromEntries(process.argv.slice(2).map(a => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? true]; }));
const CHROMES = [args.chrome, process.env.CHROME_PATH, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'];
const CHROME = CHROMES.find(p => p && existsSync(p));
if (!CHROME) { console.error('Chrome not found: pass --chrome=<path> or set CHROME_PATH'); process.exit(1); }
const fps = +(args.fps || 24), look = args.draft ? 'flat' : args.look, blur = args.draft ? 1 : +(args.blur || 1), shutter = +(args.shutter || .5);
const FRAMES_DIR = `out/frames/${args.scene || 'default'}${args.draft ? '.draft' : look ? '.' + look : ''}${blur > 1 ? '.blur' + blur : ''}`;
// Finishing passes applied while encoding (FFmpeg filters, in planar RGB so the screen blend treats colour correctly).
const GLOW = (lift, sigma, op) => `format=gbrp,split[a][b];[b]curves=all='0/0 ${lift}/0 1/1',gblur=sigma=${sigma}[g];[a][g]blend=all_mode=screen:all_opacity=${op}`;
const POST = {
  bloom: `${GLOW(.62, 22, .55)},format=yuv420p`,
  film: `${GLOW(.66, 26, .45)},eq=contrast=1.06:saturation=1.08:gamma=.98,vignette=PI/5,noise=alls=4,format=yuv420p`,
  punch: `${GLOW(.55, 30, .7)},eq=contrast=1.12:saturation=1.25,vignette=PI/4.5,format=yuv420p`,
};
if (args.post && !POST[args.post]) { console.error(`unknown --post=${args.post} (one of: ${Object.keys(POST).join(', ')})`); process.exit(1); }
const postArgs = args.post ? ['-vf', POST[args.post]] : [];
// What a folder of frames is made of: every script the studio page loads (the page, the libraries, the engine, the
// scenes and the --script files) plus the flags that change pixels. Frames made from anything else are stale.
function fingerprint() {
  const html = readFileSync('studio.html', 'utf8'), h = createHash('sha256').update(html);
  const scripts = [...html.matchAll(/<script\s+src="([^"]+)"/g)].map(m => m[1]).concat(String(args.script || args.project || '').split(',').filter(Boolean));
  for (const f of scripts) h.update(f + '\0').update(existsSync(f) ? readFileSync(f) : 'missing');
  h.update(JSON.stringify({ scene: args.scene || null, look: look || null, blur, shutter, fps }));
  return h.digest('hex').slice(0, 16);
}
const run = (cmd, a) => new Promise((ok, bad) => { const p = spawn(cmd, a, { stdio: 'inherit' }); p.on('close', c => c ? bad(new Error(cmd + ' exited ' + c)) : ok()); });
const times = s => String(s).split(',').map(Number);
const span = s => String(s).split(':').map(Number);

if (args.encode) {
  if (!existsSync(FRAMES_DIR)) { console.error(`no frames in ${FRAMES_DIR}: render them first, and pass --encode the same --scene/--look/--draft/--blur`); process.exit(1); }
  const out = args.out || 'out/video.mp4', nums = readdirSync(FRAMES_DIR).filter(f => /^f\d{5}\.jpg$/.test(f)).map(f => +f.slice(1, 6)).sort((a, b) => a - b);
  // FFmpeg reads an image sequence only up to its first gap, so a missing frame would silently cut the video short
  const missing = []; for (let i = 0, k = 0; i <= (nums[nums.length - 1] ?? -1); i++) { if (nums[k] === i) k++; else missing.push(i); }
  if (!nums.length || missing.length) { console.error(`${FRAMES_DIR}: ${nums.length ? `${missing.length} frames missing (${missing.slice(0, 10).join(', ')}${missing.length > 10 ? ', …' : ''})` : 'no frames'}; re-run the same --frames command to render them`); process.exit(1); }
  const n = nums.length;
  let audio = args.audio;
  const sceneMeta = `${FRAMES_DIR}/scene.json`;
  if (!audio && existsSync(sceneMeta)) {
    const { audio: a } = JSON.parse(readFileSync(sceneMeta, 'utf8'));
    if (a && existsSync(a)) audio = a;
  }
  if (!audio) {
    try {
      const cfg = readFileSync('src/config.js', 'utf8');
      const m = cfg.match(/audio:\s*['"]([^'"]+)['"]/);
      if (m && m[1] && existsSync(m[1])) audio = m[1];
    } catch {}
  }
  console.log(`encoding ${n} frames → ${out}${audio ? ' with ' + audio : ''}`);
  await run('ffmpeg', ['-y', '-loglevel', 'error', '-stats', '-framerate', String(fps), '-i', `${FRAMES_DIR}/f%05d.jpg`,
    ...(audio ? ['-i', audio, '-map', '0:v', '-map', '1:a', '-c:a', 'aac', '-b:a', '192k', '-shortest'] : []),
    ...postArgs, '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out]);
  console.log('wrote ' + out);
  process.exit(0);
}

// On laptops with two GPUs Chrome picks the integrated one by default; ask for the dedicated one (no effect with a single GPU)
const gpu = [...(process.platform === 'win32' ? ['--use-angle=d3d11'] : process.platform === 'darwin' ? ['--use-angle=metal'] : ['--use-gl=angle']), '--force_high_performance_gpu'];
// Each worker gets its own browser: pages in one browser share a single GPU process that runs their WebGL one at a
// time, so they queue behind each other; separate browsers feed the GPU in parallel (about 4x faster with 4 workers).
const browsers = [];
async function launchBrowser() {
  const b = await puppeteer.launch({
    executablePath: CHROME, headless: true, protocolTimeout: 0,
    args: ['--allow-file-access-from-files', '--ignore-gpu-blocklist', ...gpu, '--enable-gpu-rasterization', '--window-size=1920,1080', '--disable-renderer-backgrounding', '--disable-background-timer-throttling']
  });
  browsers.push(b);
  return b;
}
const closeAll = () => Promise.all(browsers.map(b => b.close().catch(() => {})));
const browser = await launchBrowser();
// p5.brush logs these WebGL warnings once per page in some scenes; they are harmless (see ANIMATION_GUIDE.md)
const HARMLESS = /WebGL: INVALID_OPERATION: .* location is not from the associated program/;
let pageErrors = 0;
async function openPage(tag = '', br = browser) {
  const page = await br.newPage();
  page.on('console', m => {
    if (!['error', 'warn'].includes(m.type()) || HARMLESS.test(m.text())) return;
    if (m.type() === 'error') pageErrors++;
    console.log(`[page${tag}]`, m.text());
  });
  page.on('pageerror', e => { pageErrors++; console.log(`[page error${tag}]`, e.message); });
  const sceneParam = args.scene ? `&scene=${encodeURIComponent(args.scene)}` : '';
  const scriptParam = args.script ? `&script=${encodeURIComponent(args.script)}` : (args.project ? `&script=${encodeURIComponent(args.project)}` : '');
  await page.goto(pathToFileURL(resolve('studio.html')).href + '?render' + sceneParam + scriptParam + (look ? `&look=${encodeURIComponent(look)}` : ''), { waitUntil: 'networkidle0', timeout: 120000 });
  await page.waitForFunction('window.ready === true', { timeout: 60000 });
  if (args.loop) {
    const ok = await page.evaluate(name => { if (!LOOPS[name]) return false; window.LOOP = LOOPS[name]; return true; }, args.loop);
    if (!ok) { console.error(`no loop named "${args.loop}"`); process.exit(1); }
  }
  return page;
}
const frameOf = async (page, t, type, q) => {
  const url = await page.evaluate((t, type, q, sub, sh, fps) => window.renderAt(t, type, q, sub, sh, fps), t, type, q, blur, shutter, fps);
  return Buffer.from(url.slice(url.indexOf(',') + 1), 'base64');
};
// the length of whatever is being rendered: a loop's .len, or the active scene's duration
const lengthOf = page => page.evaluate(() => window.LOOP ? window.LOOP.len : (window.ACTIVE_SCENE ? window.ACTIVE_SCENE.duration : (typeof DUR !== 'undefined' ? DUR : 11)));

if (args.sheet || args.strip) {
  const page = await openPage(), out = args.out || 'out/sheet.jpg'; mkdirSync(dirname(out), { recursive: true });
  let ts;
  if (args.strip) { const [a, b] = span(args.strip); ts = []; for (let i = Math.round(a * fps); i <= Math.round(b * fps); i++) ts.push(i / fps); }
  else ts = times(args.sheet);
  const crop = args.crop ? times(args.crop) : null;
  const { url, ms } = await page.evaluate((ts, c, w, crop) => window.renderSheet(ts, c, w, crop), ts, +(args.cols || (args.strip ? 6 : 3)), +(args.w || (args.strip ? 320 : 640)), crop);
  writeFileSync(out, Buffer.from(url.slice(url.indexOf(',') + 1), 'base64'));
  console.log(`${out}  (${ts.length} frames)  ms/frame: ${ms.join(' ')}`);
} else if (args.stills) {
  const page = await openPage(), out = args.out || 'out/stills'; mkdirSync(out, { recursive: true });
  console.log('GPU:', await page.evaluate(() => window.gpuInfo()));
  for (const s of times(args.stills)) {
    const t0 = Date.now(), buf = await frameOf(page, s, 'image/png');
    const f = `${out}/t${s.toFixed(2).replace('.', '_')}.png`; writeFileSync(f, buf);
    console.log(`${f}  ${Date.now() - t0} ms`);
  }
} else if (args.png) {
  // PNG sequence (for GIFs): a loop's full cycle (frame n equals frame 0, so it isn't rendered), or --range=a:b.
  const probe = await openPage(), len = await lengthOf(probe); await probe.close();
  const [a, b] = args.range ? span(args.range) : [0, len], n = Math.round((b - a) * fps);
  const out = args.out || `out/${args.loop ? 'loop_' + args.loop : 'png'}`, workers = +(args.workers || 3); mkdirSync(out, { recursive: true });
  let next = 0; const start = Date.now();
  await Promise.all(Array.from({ length: workers }, async (_, w) => {
    const page = await openPage('#' + w, w ? await launchBrowser() : browser);
    while (next < n) { const i = next++; writeFileSync(`${out}/f${String(i).padStart(4, '0')}.png`, await frameOf(page, a + i / fps, 'image/png')); }
  }));
  console.log(`${n} frames → ${out}  (${((Date.now() - start) / n).toFixed(0)} ms/frame)`);
} else if (args.frames) {
  // Parallel and resumable: each worker pulls the next missing frame; files are written atomically.
  const probe = await openPage(), len = await lengthOf(probe);
  // --encode runs without a page, so it reads the scene's audio track from here
  const sceneAudio = await probe.evaluate(() => (window.ACTIVE_SCENE && window.ACTIVE_SCENE.audio) || '');
  await probe.close();
  const [a, b] = args.range ? span(args.range) : [0, len], workers = +(args.workers || 4);
  mkdirSync(FRAMES_DIR, { recursive: true });
  // Resuming reuses every frame already on disk, so frames from an older version of the scene must never be mixed in.
  const metaFile = `${FRAMES_DIR}/scene.json`, fp = fingerprint(), meta = existsSync(metaFile) ? JSON.parse(readFileSync(metaFile, 'utf8')) : {};
  const onDisk = () => readdirSync(FRAMES_DIR).filter(f => /^f\d{5}\.jpg$/.test(f));
  if (args.fresh) for (const f of onDisk()) unlinkSync(`${FRAMES_DIR}/${f}`);
  else if (args.redo) {
    const [r0, r1] = span(args.redo);
    for (const f of onDisk()) { const i = +f.slice(1, 6); if (i >= Math.round(r0 * fps) && i < Math.round(r1 * fps)) unlinkSync(`${FRAMES_DIR}/${f}`); }
  } else if (onDisk().length && meta.fingerprint !== fp) {
    console.error(`${FRAMES_DIR} holds frames rendered from a different version of the scene, engine or flags, and resuming would mix them in.\n` +
      `  --fresh        delete them all and render again (the safe choice)\n` +
      `  --redo=a:b     re-render only seconds a to b and keep the rest (only when the change is limited to those seconds)`);
    await closeAll();
    process.exit(1);
  }
  writeFileSync(metaFile, JSON.stringify({ audio: sceneAudio, fingerprint: fp }));
  const first = Math.round(a * fps), last = Math.min(Math.ceil(len * fps) - 1, Math.round(b * fps) - 1);
  const todo = []; for (let i = first; i <= last; i++) { const f = `${FRAMES_DIR}/f${String(i).padStart(5, '0')}.jpg`; if (!existsSync(f) || statSync(f).size < 1000) todo.push(i); }
  console.log(`${todo.length} frames to render (${last - first + 1 - todo.length} already done), ${workers} workers`);
  let next = 0, done = 0; const start = Date.now(), failed = [];
  // A lost WebGL context or a page that loads too slowly under GPU/memory pressure must not kill the whole render:
  // each frame gets a few attempts on a fresh page with a growing pause; a frame that still fails is left missing,
  // so re-running the same command renders only what's left. The browser flags a lost context a few frames late, and
  // the frames drawn in between come out blank without any error, so a context loss also re-queues the frames that
  // page wrote last.
  const ATTEMPTS = 4, SUSPECT = 12, requeued = new Map();
  await Promise.all(Array.from({ length: workers }, async (_, w) => {
    let page = null, count = 0, recent = [], own = null;
    const requeueRecent = () => {
      if (!recent.length) return;
      console.log(`[worker ${w}] re-queueing ${recent.length} frames drawn before the context loss`);
      for (const r of recent) {
        const n = (requeued.get(r) || 0) + 1;
        requeued.set(r, n); unlinkSync(`${FRAMES_DIR}/f${String(r).padStart(5, '0')}.jpg`); done--;
        if (n > ATTEMPTS) failed.push(r); else todo.push(r);
      }
      recent = [];
    };
    const freshPage = async () => {
      // a page retired on schedule may have lost its context without saying so yet: ask before trusting its last frames
      if (page && await page.evaluate(() => lostContext()).catch(() => true)) requeueRecent();
      if (page) await page.close().catch(() => {});
      page = null; count = 0; recent = [];
      if (!own || !own.connected) { if (own) await own.close().catch(() => {}); own = await launchBrowser(); }
      page = await openPage('#' + w, own);
    };
    // the outer loop re-checks the page when the queue runs dry: its last frames may have been drawn on a lost context
    for (;;) {
    while (next < todo.length) {
      const i = todo[next++], f = `${FRAMES_DIR}/f${String(i).padStart(5, '0')}.jpg`;
      let buf = null;
      for (let attempt = 1; attempt <= ATTEMPTS && !buf; attempt++) {
        try {
          if (!page || count >= 40) await freshPage();
          buf = await frameOf(page, i / fps, 'image/jpeg', .94);
          count++;
        } catch (err) {
          console.log(`[worker ${w}] frame ${i} attempt ${attempt}/${ATTEMPTS} failed:`, err.message.split('\n')[0]);
          if (/context lost/i.test(err.message)) requeueRecent();
          recent = [];
          if (page) await page.close().catch(() => {});
          page = null;
          // a failure can leave this worker's GPU process in a bad state: start its browser over
          if (own) { await own.close().catch(() => {}); own = null; }
          if (attempt < ATTEMPTS) await new Promise(r => setTimeout(r, 5000 * attempt));
        }
      }
      if (!buf) { failed.push(i); continue; }
      writeFileSync(f + '.tmp', buf); renameSync(f + '.tmp', f);
      recent.push(i); if (recent.length > SUSPECT) recent.shift();
      if (++done % 24 === 0 || done === todo.length) {
        const el = (Date.now() - start) / 1000;
        console.log(`frame ${done}/${todo.length}  ${(el / done * 1000).toFixed(0)} ms/frame effective  eta ${((todo.length - done) * el / done / 60).toFixed(1)} min`);
      }
    }
    if (page && recent.length && await page.evaluate(() => lostContext()).catch(() => true)) { requeueRecent(); await page.close().catch(() => {}); page = null; continue; }
    break;
    }
    if (page) await page.close().catch(() => {});
    if (own) await own.close().catch(() => {});
  }));
  if (failed.length) {
    console.error(`${failed.length} frames failed after ${ATTEMPTS} attempts (${failed.slice(0, 10).join(', ')}${failed.length > 10 ? ', …' : ''}): run the same command again to render them`);
    await closeAll();
    process.exit(1);
  }
} else if (args.clip) {
  const page = await openPage(), len = await lengthOf(page);
  const [a, b] = args.range ? span(args.range) : typeof args.clip === 'string' ? span(args.clip) : [0, len];
  const audio = args.audio || await page.evaluate(() => (window.ACTIVE_SCENE && window.ACTIVE_SCENE.audio) || (typeof PROJECT !== 'undefined' && PROJECT.audio) || '');
  const out = args.out || 'out/clip.mp4'; mkdirSync(dirname(out), { recursive: true });
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-',
    ...(audio ? ['-ss', String(a), '-t', String(b - a), '-i', audio, '-map', '0:v', '-map', '1:a', '-c:a', 'aac', '-b:a', '192k', '-shortest'] : []),
    ...postArgs, '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out],
    { stdio: ['pipe', 'inherit', 'inherit'] });
  const n = Math.round((b - a) * fps), start = Date.now();
  for (let i = 0; i < n; i++) {
    const buf = await frameOf(page, a + i / fps, 'image/jpeg', .93);
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (i % 24 === 0 || i === n - 1) console.log(`frame ${i + 1}/${n}  ${((Date.now() - start) / (i + 1)).toFixed(0)} ms/frame`);
  }
  ff.stdin.end(); await new Promise(r => ff.on('close', r));
  console.log(`wrote ${out}`);
} else if (args.probe) {
  // What this machine can give a render: the GPU Chrome really uses, the memory left, and the cost of a frame at three
  // points of the scene. Workers are pages sharing that GPU: aim high, and let memory and heavy frames set the ceiling.
  const GB = 2 ** 30, before = freemem(), page = await openPage(), len = await lengthOf(page), used = await page.evaluate(() => window.gpuInfo());
  console.log('GPU used by Chrome:', used);
  let gpus = '';
  try { gpus = process.platform === 'win32' ? execSync('powershell -NoProfile -Command "(Get-CimInstance Win32_VideoController).Name -join \', \'"').toString().trim() : ''; } catch {}
  try { gpus += (gpus ? ' | ' : '') + execSync('nvidia-smi --query-gpu=name,memory.used,memory.total --format=csv,noheader').toString().trim().replace(/\r?\n/g, '; '); } catch {}
  if (gpus) console.log('GPUs on this machine:', gpus);
  const DISCRETE = /NVIDIA|GeForce|Quadro|RTX|Radeon RX|Radeon Pro|Arc A\d/i;
  if (DISCRETE.test(gpus) && !DISCRETE.test(used)) console.log('WARNING: Chrome is NOT using the dedicated GPU of this machine. Fix it before rendering (Windows: Settings > System > Display > Graphics, set Chrome to High performance), or frames will take about twice as long.');
  const ms = [];
  // nine points spread over the scene, so a heavy section can't hide between the samples
  const at = [...Array(9)].map((_, i) => .05 + i * .1125);
  for (const k of at) { await page.evaluate(t => window.renderAt(t, 'image/jpeg', .9, 1), len * k); const t0 = Date.now(); await frameOf(page, len * k, 'image/jpeg', .9); ms.push(Date.now() - t0); }
  // what one page really took from the system while rendering this scene (with a floor, since other programs move it too)
  const perPage = Math.max(.4, (before - freemem()) / GB * 1.25), free = freemem() / GB;
  const byMem = Math.max(1, Math.floor(free * .75 / perPage)), cap = Math.min(8, byMem, Math.max(2, Math.floor(cpus().length / 2)));
  console.log(`CPU: ${cpus().length} cores · RAM: ${free.toFixed(1)} GB free of ${(totalmem() / GB).toFixed(0)} GB · about ${perPage.toFixed(1)} GB per page`);
  console.log(`frame cost (ms, blur ${blur}): ${ms.join(' / ')} at ${at.map(k => Math.round(k * 100) + '%').join(' / ')} of ${len.toFixed(1)} s`);
  // Workers share one GPU, so more of them only help until it saturates: measure the real throughput with 1, 2, 4... pages
  // rendering the heaviest samples at once, and take the count that renders the most frames per second.
  const heavyT = at.map((k, i) => [ms[i], len * k]).sort((a, b) => b[0] - a[0]).slice(0, 3).map(x => x[1]);
  const pages = [page], rate = { 1: 3 / (heavyT.reduce((a, t) => a + ms[at.findIndex(k => len * k === t)], 0) / 1000) };
  for (const n of [2, 4, 6, 8].filter(n => n <= cap)) {
    while (pages.length < n) { const pg = await openPage('#' + pages.length, await launchBrowser()); await frameOf(pg, heavyT[0], 'image/jpeg', .9); pages.push(pg); }   // warm up before timing
    const t0 = Date.now();
    await Promise.all(pages.map(async pg => { for (const t of heavyT) await frameOf(pg, t, 'image/jpeg', .9); }));
    rate[n] = n * heavyT.length / ((Date.now() - t0) / 1000);
  }
  const best = +Object.keys(rate).reduce((a, b) => rate[b] >= rate[a] * .97 ? b : a);
  console.log('throughput on the heaviest frames (frames/s): ' + Object.entries(rate).map(([n, r]) => `${n} page${n > 1 ? 's' : ''} ${r.toFixed(2)}`).join(' · '));
  console.log(`recommended: --workers=${best}${best === cap && cap < 8 ? ` (the ceiling here: ${byMem} by memory, ${Math.floor(cpus().length / 2)} by CPU)` : ''}. If the GPU loses its context or memory runs short, drop by one or two and re-run: the render resumes`);
  const avg = ms.reduce((a, b) => a + b, 0) / ms.length, heavyAvg = heavyT.length ? 3 / rate[1] : avg / 1000;
  console.log(`estimate: roughly ${Math.ceil(len * fps * (avg / 1000) / (rate[best] * heavyAvg) / 60)} min for ${Math.round(len * fps)} frames`);
} else if (args.smoke) {
  // Every registered scene (plus --script ones) renders three frames without page errors, or the process exits 1.
  const page = await openPage(), ids = await page.evaluate(() => Object.keys(window.SCENES));
  for (const id of ids) {
    const before = pageErrors, t0 = Date.now();
    try {
      const len = await page.evaluate(id => { window.loadScene(id); return window.ACTIVE_SCENE.duration; }, id);
      for (const k of [.1, .5, .9]) await page.evaluate(t => window.renderAt(t, 'image/jpeg', .5), len * k);
    } catch (err) { pageErrors++; console.log(`[${id}]`, err.message.split(String.fromCharCode(10))[0]); }
    console.log(`${pageErrors > before ? 'FAIL' : 'ok  '}  ${id}  (${((Date.now() - t0) / 3).toFixed(0)} ms/frame)`);
  }
  await closeAll();
  process.exit(pageErrors ? 1 : 0);
} else {
  console.log('nothing to do: see the usage notes at the top of render.mjs');
}
await closeAll();
