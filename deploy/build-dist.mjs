// Builds the upload package (D-12, D-87): only the files the pages use, from the working copy
// of this repository, into dist/ (or the folder after --out). Runs the same on Windows and
// Linux (the VPS pull-deploy, deploy/vps-deploy.sh); needs Node only, and git for the
// sitemap dates. Checks that every local reference in the pages and the CSS exists.
//   node deploy/build-dist.mjs                    staging (robots.txt disallows everything, noindex header)
//   node deploy/build-dist.mjs --launch           the launch package (D-70, D-83): no staging block in
//                                                 .htaccess, a robots.txt that allows every crawler (AI
//                                                 search and training bots included) and sitemap.xml
//   node deploy/build-dist.mjs --out ../tmp/dist  another output folder (relative to the current one)
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outArg = process.argv.indexOf('--out');
const OUT = outArg > 0 ? resolve(process.argv[outArg + 1]) : join(REPO, 'dist');
const launch = process.argv.includes('--launch');

const PAGES = ['index.html', 'impressum.html', 'datenschutz.html',
  'hotels-resorts/index.html', 'bergbahnen/index.html', 'wellness-thermen/index.html', 'ueber-uns/index.html', 'kontakt/index.html',
  '404.html'];
// the pages search engines should find, with their public URLs (sitemap.xml at the launch)
const SITE = 'https://blauestunde.media/';
const INDEXED = { 'index.html': '', 'hotels-resorts/index.html': 'hotels-resorts/', 'bergbahnen/index.html': 'bergbahnen/',
  'wellness-thermen/index.html': 'wellness-thermen/', 'ueber-uns/index.html': 'ueber-uns/', 'kontakt/index.html': 'kontakt/' };
// whole folders the scripts load by computed path (frames) or that belong together
// api/: the form's mail script and its library (D-04); its secrets stay outside the web root
const DIRS = ['css', 'js', 'api', 'assets/fonts', 'assets/icons', 'assets/brand', 'assets/frames-hd', 'assets/frames-phone'];
const FILES = ['site.webmanifest', 'favicon.ico', '.htaccess', 'llms.txt'];

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
const copy = p => { mkdirSync(dirname(join(OUT, p)), { recursive: true }); cpSync(join(REPO, p), join(OUT, p), { recursive: true }); };
[...PAGES, ...DIRS, ...FILES].forEach(copy);

// local references in the pages (src, href, srcset, <use href>) and in the CSS (url())
const refs = new Map();   // package path → where it is referenced
const add = (from, raw) => {
  // (%23… is a fragment inside an inline SVG, e.g. the grain filter's url(%23n))
  if (/^(#|%23)/.test(raw.trim())) return;
  let u = raw.trim().split('#')[0].split('?')[0];
  // the site's own absolute URLs (canonical, Open Graph) count as local files
  if (u.startsWith(SITE)) u = '/' + u.slice(SITE.length);
  if (!u || /^(https?:|mailto:|tel:|data:|javascript:)/.test(u)) return;
  // paths from the site root (404.html) resolve from the package root
  let p = (u.startsWith('/') ? u.slice(1) : relative(OUT, resolve(dirname(join(OUT, from)), u))).replace(/\\/g, '/');
  if (p === '' || p.endsWith('/') || !p.includes('.')) p = (p ? p.replace(/\/?$/, '/') : '') + 'index.html';
  if (!refs.has(p)) refs.set(p, from);
};
for (const page of PAGES) {
  const html = readFileSync(join(OUT, page), 'utf8');
  for (const m of html.matchAll(/\s(?:src|href)="([^"]+)"/g)) add(page, m[1]);
  for (const m of html.matchAll(/\ssrcset="([^"]+)"/g)) m[1].split(',').forEach(s => add(page, s.trim().split(/\s+/)[0]));
  // link-preview images and the URLs in the structured data must exist in the package too
  for (const m of html.matchAll(/property="og:(?:image|url)" content="([^"]+)"/g)) add(page, m[1]);
  for (const m of html.matchAll(/"(?:url|item|logo|image|@id)": "(https:\/\/blauestunde\.media\/[^"#]*)/g)) add(page, m[1]);
}
for (const css of readdirSync(join(OUT, 'css'))) {
  const text = readFileSync(join(OUT, 'css', css), 'utf8');
  for (const m of text.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/g)) add(`css/${css}`, m[1]);
}
// the content images: copy the referenced ones only
for (const p of refs.keys()) if (p.startsWith('assets/img/') && !existsSync(join(OUT, p)) && existsSync(join(REPO, p))) copy(p);
// the frame sets: 120 frames per scene and set (js/main.js)
for (const set of ['frames-hd', 'frames-phone']) for (const scene of ['hero', 'spa', 'skilift'])
  for (let i = 1; i <= 120; i++) refs.set(`assets/${set}/${scene}/frame_${String(i).padStart(4, '0')}.webp`, 'js/main.js');

const missing = [...refs].filter(([p]) => !existsSync(join(OUT, p)));
if (missing.length) {
  console.error('MISSING in the package:\n' + missing.map(([p, from]) => `  ${p}  (from ${from})`).join('\n'));
  process.exit(1);
}

// the launch package must not carry an open point: the legal pages mark them "[TBD: …]" (D-86)
if (launch) {
  const open = [...PAGES, ...FILES.filter(f => f.endsWith('.txt'))].filter(p => readFileSync(join(OUT, p), 'utf8').includes('[TBD'));
  if (open.length) { console.error(`launch: open [TBD] points in ${open.join(', ')}`); process.exit(1); }
}

if (!launch) {
  writeFileSync(join(OUT, 'robots.txt'),'# staging: not for search engines until the launch (C1)\nUser-agent: *\nDisallow: /\n');
  // nginx on the VPS sends the noindex header while this marker exists (D-87); Apache uses .htaccess
  writeFileSync(join(OUT, '.staging'), '');
} else {
  // the staging block in .htaccess (from "# STAGING" to its closing </IfModule>) is left out
  const ht = readFileSync(join(OUT, '.htaccess'), 'utf8');
  const launched = ht.replace(/# STAGING:[\s\S]*?<\/IfModule>\r?\n(\r?\n)?/, '');
  if (launched === ht) { console.error('launch: no staging block found in .htaccess'); process.exit(1); }
  writeFileSync(join(OUT, '.htaccess'), launched);
  // every crawler is welcome (D-70), the AI search and training bots named on purpose, so a
  // later edit does not shut them out by accident
  const bots = ['GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-SearchBot', 'Claude-User', 'PerplexityBot', 'Google-Extended', 'Applebot-Extended'];
  writeFileSync(join(OUT, 'robots.txt'), `# Blaue Stunde: every crawler is welcome, search engines and AI assistants alike (D-70)\n` +
    `User-agent: *\nAllow: /\n\n${bots.map(b => `User-agent: ${b}`).join('\n')}\nAllow: /\n\nSitemap: ${SITE}sitemap.xml\n`);
  // the pages with the date of their last commit (the build date for uncommitted changes)
  const lastmod = page => execSync(`git -C "${REPO}" --no-optional-locks log -1 --format=%cs -- "${page}"`).toString().trim() || new Date().toISOString().slice(0, 10);
  writeFileSync(join(OUT, 'sitemap.xml'), '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    Object.entries(INDEXED).map(([page, url]) => `  <url><loc>${SITE}${url}</loc><lastmod>${lastmod(page)}</lastmod></url>`).join('\n') + '\n</urlset>\n');
}

// size and file count
let files = 0, bytes = 0;
const walk = d => { for (const n of readdirSync(d)) { const p = join(d, n), s = statSync(p); if (s.isDirectory()) walk(p); else { files++; bytes += s.size; } } };
walk(OUT);

const commit = execSync(`git -C "${REPO}" --no-optional-locks rev-parse --short HEAD`).toString().trim();
const dirty = execSync(`git -C "${REPO}" --no-optional-locks status --porcelain`).toString().trim();
console.log(`${launch ? 'launch' : 'staging'} package from ${commit}${dirty ? ' + uncommitted changes' : ''}: ${files} files, ${(bytes / 1e6).toFixed(1)} MB, ${refs.size} references checked`);
console.log(`out: ${OUT}`);
