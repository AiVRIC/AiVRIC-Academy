// AiVRIC Learning wears aivric.com's design: this copies the editorial kit, the header, the footer and the brand
// files from the site's workspace (../aivric-site) into assets/kit/ and partials/, so the Academy deploys on its
// own (academy.aivric.com) and still matches the main site. Re-run after the site's header, footer or kit changes:
//   node tools/vendor.mjs [path to aivric-site]
// Every link in the header and footer is made absolute to https://aivric.com/ (they point at the main site); the
// brand images are served from this repo. {{ROOT}} in the partials is the way back to this repo's root.
import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { join, dirname } from 'node:path';

const here = dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1'));
const repo = join(here, '..');
const kit = process.argv[2] || join(repo, '..', 'aivric-site');

const COPY = {
  'assets/site/v1/site.css': 'assets/kit/site.css',
  'assets/site/v1/site.js': 'assets/kit/site.js',
  'assets/site/v1/preloader.js': 'assets/kit/preloader.js',
  'assets/cv-hero/v1/mnav.css': 'assets/kit/mnav.css',
  'assets/cv-hero/v1/mnav.js': 'assets/kit/mnav.js',
  'assets/cv-hero/v1/shell.css': 'assets/kit/shell.css',
  'assets/brand/aivric-horizontal-reversed.svg': 'assets/brand/aivric-horizontal-reversed.svg',
  'assets/brand/aivric-icon-reversed.svg': 'assets/brand/aivric-icon-reversed.svg',
  'assets/brand/favicon.svg': 'assets/brand/favicon.svg',
  'assets/brand/favicon.ico': 'assets/brand/favicon.ico',
  'assets/brand/apple-touch-icon.png': 'assets/brand/apple-touch-icon.png',
};
// the product stills the lessons' "see it in Enterprise Vision" panels use (demo workspace, sample data)
for (const s of ['crosswalk', 'screen-decisions', 'screen-poam', 'screen-groc', 'screen-roar', 'screen-threats']) {
  COPY[`assets/cv-hero/v1/media-enterprise/${s}.jpg`] = `assets/learn/stills/${s.replace(/^screen-/, '')}.jpg`;
}
for (const [from, to] of Object.entries(COPY)) {
  mkdirSync(dirname(join(repo, to)), { recursive: true });
  copyFileSync(join(kit, from), join(repo, to));
}

// the header (bar + phone sheet) and the footer, from the compliance hub (one folder down on aivric.com)
function block(html, from, tag) {
  const re = new RegExp(`<${tag}\\b|</${tag}>`, 'gi');
  re.lastIndex = from; let depth = 0, m;
  while ((m = re.exec(html))) { depth += m[0][1] === '/' ? -1 : 1; if (depth === 0) return html.slice(from, m.index + m[0].length); }
  throw new Error(`no closing </${tag}>`);
}
const src = readFileSync(join(kit, 'compliance/index.html'), 'utf8');
const pick = (opener, tag) => { const at = src.indexOf(opener); if (at < 0) throw new Error('no ' + opener); return block(src, at, tag); };
const toSite = (html) => html
  .replace(/(href|src)="\.\.\/assets\/brand\//g, '$1="{{ROOT}}assets/brand/')
  .replace(/(href|src)="\.\.\/"/g, '$1="https://aivric.com/"')
  .replace(/(href|src)="\.\.\/(?!\/)/g, '$1="https://aivric.com/')
  .replace(/href="(\?door=)/g, 'href="https://aivric.com/$1')
  .replace(/href="#/g, 'href="https://aivric.com/compliance/#')
  .replace(/utm_content=compliance_hub/g, 'utm_content=academy_header')
  .replace(/utm_campaign=([a-z_]+)/g, 'utm_campaign=$1')
  .replace(/https:\/\/academy\.aivric\.com\/?"/g, '{{ROOT}}"');
const header = toSite(pick('<header class="site-header mnav"', 'header') + '\n    ' + pick('<div class="mnav-sheet"', 'div'));
const footer = toSite(pick('<footer class="site-footer"', 'footer'));
mkdirSync(join(repo, 'partials'), { recursive: true });
writeFileSync(join(repo, 'partials/header.html'), header + '\n');
writeFileSync(join(repo, 'partials/footer.html'), footer + '\n');
const rel = header.match(/href="(?!https?:|\{\{ROOT\}\}|mailto:|#)[^"]+"/g) || [];
console.log(`kit: ${Object.keys(COPY).length} files; header ${header.length} chars, footer ${footer.length} chars` + (rel.length ? `; relative links left: ${rel.slice(0, 5).join(' ')}` : ''));
