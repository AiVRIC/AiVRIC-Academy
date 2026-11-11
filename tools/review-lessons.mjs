// Checks every written lesson in a course before it is built: length, markup limited to the lx- components, the
// site's naming and claims rules, and the knowledge-check data.
//   node tools/review-lessons.mjs [content/foundations/grc-management]
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';

const here = dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1'));
const dir = join(here, '..', process.argv[2] || 'content/foundations/grc-management');
const course = JSON.parse(readFileSync(join(dir, 'course.json'), 'utf8'));
const ALLOWED = new Set(['lx-sec', 'lx-practice', 'lx-n', 'lx-list', 'lx-trio', 'lx-trio-item', 'lx-trio-k', 'lx-trio-q', 'lx-def', 'lx-def-k', 'lx-note', 'lx-note-k',
  'lx-grid2', 'lx-tile', 'lx-tile-k', 'lx-lines', 'lx-line-row', 'lx-line-k', 'lx-line-gov', 'lx-line-3', 'lx-tablewrap', 'lx-table', 'lx-checklist', 'lx-fig', 'lx-steps', 'lx-terms']);
const RETIRED = /CloudSignals\+|Vision AI|Vision Enterprise|AiVRIC Eval|AIRE Security Mesh|AI-Powered Remediation|GovOps|AI Signals|RogueAgent|OTSignals|WorldSignals/;
const PRODUCT = /AiVRIC|CloudSignals|AISignals|RiskOps|Enterprise Vision|Client Vision|Black Kite/;
let fail = 0;
for (const l of course.lessons) {
  const h = join(dir, `${l.slug}.html`), j = join(dir, `${l.slug}.json`);
  if (!existsSync(h)) { console.log(`--   ${l.slug}: not written`); continue; }
  const html = readFileSync(h, 'utf8'), issues = [];
  const text = html.replace(/<svg[\s\S]*?<\/svg>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/&[a-z#0-9]+;/g, ' ');
  const words = text.split(/\s+/).filter(Boolean).length;
  if (words < 1100 || words > 2100) issues.push(`length ${words} words`);
  for (const m of html.matchAll(/class="([^"]+)"/g)) for (const k of m[1].split(/\s+/)) if (!ALLOWED.has(k)) issues.push(`class ${k}`);
  if (/<script|style="|<img|<a\s/i.test(html)) issues.push('script, inline style, image or link');
  if (RETIRED.test(html)) issues.push('retired name: ' + html.match(RETIRED)[0]);
  if (PRODUCT.test(text)) issues.push('product name: ' + text.match(PRODUCT)[0]);
  for (const m of text.matchAll(/[^.]*\b(compliant|certified)\b[^.]*\./gi)) issues.push('claim word: "' + m[0].trim().slice(0, 110) + '"');
  // figures are allowed only inside a marked example (an lx-note headed "Example"), where they are a fictional company's
  const plain = html.replace(/<aside class="lx-note"><p class="lx-note-k">Example<\/p>[\s\S]*?<\/aside>/g, ' ').replace(/<svg[\s\S]*?<\/svg>/g, ' ').replace(/<[^>]+>/g, ' ');
  for (const m of plain.matchAll(/[^.]*\d+(\.\d+)?\s?%[^.]*\./g)) issues.push('percentage: "' + m[0].trim().slice(0, 110) + '"');
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
  const dup = ids.filter((x, i) => ids.indexOf(x) !== i); if (dup.length) issues.push('duplicate ids ' + dup.join(','));
  const svgIds = [...html.matchAll(/<svg[\s\S]*?<\/svg>/g)].flatMap((m) => [...m[0].matchAll(/id="([^"]+)"/g)].map((x) => x[1]));
  if (svgIds.some((x) => !/^fig\d-/.test(x))) issues.push('svg ids without a figN- prefix');
  if (!/class="lx-sec lx-practice"/.test(html)) issues.push('no In practice section');
  if (!/class="lx-terms"/.test(html)) issues.push('no key terms');
  let checks = [];
  try { const d = JSON.parse(readFileSync(j, 'utf8')); checks = d.checks || []; if (!d.objectives?.length) issues.push('no objectives'); }
  catch (e) { issues.push('json: ' + e.message); }
  const pos = checks.map((q) => q.answer);
  checks.forEach((q, i) => { if (q.options?.length !== 4 || !(q.answer >= 0 && q.answer < 4) || !q.why) issues.push(`check ${i + 1} malformed`); });
  if (checks.length < 4) issues.push(`${checks.length} checks`);
  if (new Set(pos).size < 2) issues.push('every answer in the same position');
  if (RETIRED.test(JSON.stringify(checks)) || PRODUCT.test(JSON.stringify(checks))) issues.push('name in checks');
  console.log(`${issues.length ? 'FIX ' : 'OK  '} ${l.slug.padEnd(12)} ${String(words).padStart(5)} words, ${checks.length} checks, answers at ${pos.join('')}` + (issues.length ? '\n       - ' + issues.join('\n       - ') : ''));
  if (issues.length) fail++;
}
process.exitCode = fail ? 1 : 0;
