// AiVRIC Learning: builds the hub, the schools, the course pages and the lessons from content/ into static HTML.
//   node tools/vendor.mjs   (once, and after aivric.com's header, footer or kit changes)
//   node tools/build.mjs
// content/catalog.json   the schools, every course (live or outline) and the paths by role
// content/<school>/<course>/course.json   a course: summary, outcomes, lessons, assessment
// content/<school>/<course>/<lesson>.html + .json   a written lesson (sections) and its objectives, checks and product bridge
// A lesson listed in course.json without its .html is shown as "in writing" and not linked.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';

const here = dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1'));
const repo = join(here, '..');
const SITE = 'https://academy.aivric.com/';
const read = (p) => readFileSync(join(repo, p), 'utf8');
const json = (p) => JSON.parse(read(p));
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const HEADER = read('partials/header.html'), FOOTER = read('partials/footer.html');
const catalog = json('content/catalog.json');
let written = 0;

function course(slug) {
  const meta = catalog.courses[slug];
  const p = `content/${meta.school}/${slug}/course.json`;
  const c = existsSync(join(repo, p)) ? json(p) : { slug, lessons: [], ...meta };
  c.slug = slug; c.school = meta.school; c.status = meta.status;
  c.url = `${meta.school}/${slug}/`;
  for (const l of c.lessons || []) l.ready = existsSync(join(repo, `content/${meta.school}/${slug}/${l.slug}.html`));
  return c;
}
const COURSES = Object.keys(catalog.courses).map(course);
const bySlug = Object.fromEntries(COURSES.map((c) => [c.slug, c]));

function page({ path, title, desc, body, data, ld, crumbs }) {
  const depth = path.split('/').length - 1;
  const root = '../'.repeat(depth);
  const canonical = SITE + path.replace(/index\.html$/, '');
  const bc = crumbs ? { '@type': 'BreadcrumbList', itemListElement: crumbs.map(([n, u], i) => ({ '@type': 'ListItem', position: i + 1, name: n, item: SITE + u })) } : null;
  const graph = [bc, ...(ld || [])].filter(Boolean);
  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${esc(title)}</title>
    <meta name="description" content="${esc(desc)}" />
    <link rel="canonical" href="${canonical}" />
    <meta property="og:type" content="website" />
    <meta property="og:title" content="${esc(title)}" />
    <meta property="og:description" content="${esc(desc)}" />
    <meta property="og:url" content="${canonical}" />
    <meta name="theme-color" content="#050c18" />
    <link rel="icon" href="${root}assets/brand/favicon.svg" type="image/svg+xml" />
    <link rel="alternate icon" href="${root}assets/brand/favicon.ico" sizes="16x16 32x32 48x48" />
    <link rel="apple-touch-icon" href="${root}assets/brand/apple-touch-icon.png" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Jost:wght@500;600;700&family=Sora:wght@600;700&family=IBM+Plex+Sans:wght@400;500&display=swap" rel="stylesheet" />
    <link rel="stylesheet" href="${root}assets/kit/shell.css" />
    <link rel="stylesheet" href="${root}assets/kit/mnav.css" />
    <link rel="stylesheet" href="${root}assets/kit/site.css" />
    <link rel="stylesheet" href="${root}assets/learn/learn.css" />
    <script async src="https://www.googletagmanager.com/gtag/js?id=G-EG2Q8GD30V"></script>
    <script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','G-EG2Q8GD30V');</script>
  </head>
  <body class="is-nav-solid">
    <script src="${root}assets/kit/preloader.js" data-aivric-preloader></script>
    ${HEADER.replace(/\{\{ROOT\}\}/g, root || './')}
    <main id="main" class="sx-page lx-page">
${body}
    </main>
    ${FOOTER.replace(/\{\{ROOT\}\}/g, root || './')}
${data ? `    <script type="application/json" id="lx-data">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>\n` : ''}${graph.length ? `    <script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@graph': graph })}</script>\n` : ''}    <script defer src="${root}assets/kit/mnav.js"></script>
    <script defer src="${root}assets/kit/site.js"></script>
    <script defer src="${root}assets/learn/learn.js"></script>
  </body>
</html>
`;
  mkdirSync(dirname(join(repo, path)), { recursive: true });
  writeFileSync(join(repo, path), html);
  written++;
}

const chips = (c) => `<span class="lx-chip"><b>${esc(c.level)}</b></span><span class="lx-chip">${esc(c.hours)}</span>` +
  (c.status === 'live' ? `<span class="lx-chip">${c.lessons.length} lessons</span><span class="lx-chip is-cyan"><span class="lx-dot"></span>Free</span>` : `<span class="lx-chip is-soon"><span class="lx-dot"></span>In writing</span>`);
const card = (c, root) => `<a class="lx-course sx-card" href="${root}${c.url}" data-reveal>
            <p class="sx-eyebrow">${esc(c.school === 'foundations' ? 'Foundations' : 'AiVRIC Platform')}</p>
            <h3>${esc(c.title)}</h3>
            <p>${esc(c.summary)}</p>
            ${c.status === 'live' ? `<div class="lx-course-bar" data-course-bar="${c.slug}" data-total="${c.lessons.length}"><span></span></div>` : ''}
            <div class="lx-meta">${chips(c)}</div>
          </a>`;
const catalogData = () => ({ catalog: COURSES.filter((c) => c.status === 'live').map((c) => ({ slug: c.slug, title: c.title, url: c.url, lessons: c.lessons.filter((l) => l.ready).map((l) => ({ slug: l.slug, title: l.title })) })) });
const continueCard = `<a class="lx-continue" data-continue href="#">
              <span class="lx-continue-ring">0%</span>
              <span><small>Continue learning</small><b data-continue-course></b><br /><span data-continue-lesson></span></span>
            </a>`;
const orgLd = { '@type': 'EducationalOrganization', name: 'AiVRIC Learning', url: SITE, parentOrganization: { '@type': 'Organization', name: 'AiVRIC', url: 'https://aivric.com/' } };

/* ================================== home ================================== */
{
  const grc = bySlug['grc-management'];
  const [fnd, plat, paths] = catalog.schools;
  page({
    path: 'index.html',
    title: 'AiVRIC Learning — security, risk and compliance, taught by practitioners',
    desc: 'Free courses in GRC management, information management and AI auditing, plus training and certification for the AiVRIC platform.',
    data: catalogData(), ld: [orgLd],
    body: `
      <section class="sx-hero center" aria-labelledby="lx-h1">
        <div class="sx-wrap">
          <div class="sx-hero-inner">
            <p class="sx-eyebrow" data-reveal>AiVRIC Learning</p>
            <h1 class="sx-h1" id="lx-h1" data-reveal style="--d:.08s">Learn the work. <span class="sx-grad">Then prove it.</span></h1>
            <p class="sx-lede" data-reveal style="--d:.16s">Free, practitioner-written courses in governance, risk, compliance and AI assurance, and the training for running it all in AiVRIC. Read any lesson, check what you learned, and pick up where you left off.</p>
            <div class="sx-actions" data-reveal style="--d:.24s">
              <a class="sx-btn sx-btn-primary" href="${grc.url}">Start GRC Management <span class="sx-arrow" aria-hidden="true">→</span></a>
              <a class="sx-btn sx-btn-ghost" href="foundations/">Browse the courses</a>
            </div>
            ${continueCard}
          </div>
        </div>
        <canvas class="sx-scene" data-scene="rise" aria-hidden="true" data-tiers='["Learn","Check","Practise","Certify"]'></canvas>
      </section>

      <section class="sx-section" aria-labelledby="lx-schools-h">
        <div class="sx-wrap">
          <div class="sx-head" data-reveal>
            <p class="sx-eyebrow">Three schools</p>
            <h2 class="sx-h" id="lx-schools-h">Start with the discipline. <span class="sx-grad">Finish in the platform.</span></h2>
            <p class="sx-lede">Foundations teaches the work any security, risk or compliance professional needs. The Platform school teaches doing it in AiVRIC. Paths string them together for the job you have.</p>
          </div>
          <div class="lx-schools">
            ${[[fnd, 'foundations/', ['GRC Management Fundamentals', 'Information Management Fundamentals', 'AI Auditing & Security Architecture']],
               [plat, 'platform/', ['Enterprise Vision Practitioner', 'Enterprise Vision Administrator', 'Client Vision Partner']],
               [paths, 'paths/', catalog.paths.map((p) => p.role).slice(0, 4)]].map(([s, href, items], i) => `<a class="lx-school" href="${href}" style="--tone:${s.tone};--glow:${s.glow};--d:${(i * 0.08).toFixed(2)}s" data-reveal>
              <p class="lx-school-k">${esc(s.name)}</p>
              <h3>${esc(s.tagline)}</h3>
              <ul>${items.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
              <span class="lx-go">Explore ${esc(s.name)} <span aria-hidden="true">→</span></span>
            </a>`).join('\n            ')}
          </div>
        </div>
      </section>

      <section class="sx-section" aria-labelledby="lx-feat-h">
        <div class="sx-wrap">
          <div class="sx-head" data-reveal>
            <p class="sx-eyebrow">Featured course</p>
            <h2 class="sx-h" id="lx-feat-h">${esc(grc.title)}</h2>
          </div>
          <div class="lx-feature" data-reveal>
            <div>
              <div class="lx-meta">${chips(grc)}</div>
              <h3>Who decided, what could go wrong, and can we show it.</h3>
              <p>${esc(grc.lede)}</p>
              <div class="sx-actions" style="margin-top:24px">
                <a class="sx-btn sx-btn-primary" href="${grc.url}">See the course <span class="sx-arrow" aria-hidden="true">→</span></a>
              </div>
            </div>
            <ol class="lx-feature-list">
              ${grc.lessons.map((l) => `<li>${esc(l.title)}<small>${l.minutes} min</small></li>`).join('\n              ')}
            </ol>
          </div>
        </div>
      </section>

      <section class="sx-section" aria-labelledby="lx-how-h">
        <div class="sx-wrap">
          <div class="sx-head" data-reveal>
            <p class="sx-eyebrow">How it works</p>
            <h2 class="sx-h" id="lx-how-h">Read. Check. <span class="sx-grad">Certify.</span></h2>
          </div>
          <div class="lx-how" data-reveal>
            <div><p class="lx-how-n">01 · LEARN</p><h3>Every lesson is open</h3><p>No sign-up to read. Lessons are written by practitioners, cite the frameworks they draw on, and end with something to try on your own program.</p></div>
            <div><p class="lx-how-n">02 · CHECK</p><h3>Knowledge checks as you go</h3><p>A short check closes each lesson, with the reasoning behind every answer. Your progress is saved in this browser, so you can pick up where you left off.</p></div>
            <div><p class="lx-how-n">03 · CERTIFY</p><h3>Certification is coming</h3><p>Course assessments and AiVRIC platform certification return with learner accounts, with credentials anyone can verify.</p></div>
          </div>
        </div>
      </section>

      <section class="sx-section" aria-labelledby="lx-paths-h">
        <div class="sx-wrap">
          <div class="sx-head" data-reveal>
            <p class="sx-eyebrow">Paths by role</p>
            <h2 class="sx-h" id="lx-paths-h">Where to start, <span class="sx-grad">for the job you do.</span></h2>
          </div>
          <div class="lx-paths">
            ${catalog.paths.map((p) => `<div class="lx-path" data-reveal><h3>${esc(p.role)}</h3><ol>${p.steps.map(([t, s]) => `<li${!s || bySlug[s]?.status !== 'live' ? ' class="is-soon"' : ''}>${s && bySlug[s]?.status === 'live' ? `<a href="${bySlug[s].url}">${esc(t)}</a>` : esc(t)}</li>`).join('')}</ol></div>`).join('\n            ')}
          </div>
        </div>
      </section>

      <section class="sx-section sx-close" aria-labelledby="lx-close-h">
        <div class="sx-wrap" data-reveal>
          <h2 class="sx-h" id="lx-close-h">Put the course to work.</h2>
          <p class="sx-lede">Everything these courses teach runs in AiVRIC Enterprise Vision: one control set for every framework, risk decisions on the record, and evidence ready before the auditor asks.</p>
          <div class="sx-actions">
            <a class="sx-btn sx-btn-primary" href="https://aivric.com/enterprise/?utm_source=academy&utm_medium=web&utm_campaign=learning&utm_content=home_close">See Enterprise Vision <span class="sx-arrow" aria-hidden="true">→</span></a>
            <a class="sx-btn sx-btn-ghost" href="https://calendly.com/aivric-sales/aivric-walkthrough-demo?primary_color=00b8ff&utm_source=academy&utm_medium=web&utm_campaign=learning&utm_content=home_close">Book a walkthrough</a>
          </div>
        </div>
      </section>`,
  });
}

/* ============================== school pages ============================== */
for (const s of catalog.schools) {
  const root = '../';
  const list = s.courses.map((k) => bySlug[k]);
  let inner = '';
  if (s.key === 'foundations') inner = `<div class="lx-courses">${list.map((c) => card(c, root)).join('\n          ')}</div>`;
  if (s.key === 'platform') inner = `<div class="lx-courses">
            ${[['Enterprise Vision Practitioner', 'Work the control baseline, risk registers, decisions and POA&M in an Enterprise Vision workspace, and produce the reports leadership reads.'],
               ['Enterprise Vision Administrator', 'Set up a workspace: people and roles, feeds and connectors, frameworks in scope, and the audit trail.'],
               ['Client Vision Partner', 'For service providers: onboard clients, run each one in its own workspace, and deliver the program under your brand.']].map(([t, d]) => `<div class="lx-course" data-reveal><p class="sx-eyebrow">AiVRIC Platform</p><h3>${esc(t)}</h3><p>${esc(d)}</p><div class="lx-meta"><span class="lx-chip"><b>Certification</b></span><span class="lx-chip is-soon"><span class="lx-dot"></span>In development</span></div></div>`).join('\n            ')}
          </div>
          <div class="lx-soon" data-reveal><h2>Until the platform courses open</h2><p>The <a href="https://aivric.com/AiVRIC-UserGuide/index.html">Platform Guide</a> covers setup and connectors, and the <a href="https://aivric.com/compliance/">compliance pages</a> walk through Enterprise Vision screen by screen. Want a guided tour now? <a href="https://calendly.com/aivric-sales/aivric-walkthrough-demo?primary_color=00b8ff&utm_source=academy&utm_medium=web&utm_campaign=learning&utm_content=platform_school">Book a walkthrough</a>.</p></div>`;
  if (s.key === 'paths') inner = `<div class="lx-paths">
            ${catalog.paths.map((p) => `<div class="lx-path" data-reveal><h3>${esc(p.role)}</h3><ol>${p.steps.map(([t, k]) => `<li${!k || bySlug[k]?.status !== 'live' ? ' class="is-soon"' : ''}>${k && bySlug[k]?.status === 'live' ? `<a href="../${bySlug[k].url}">${esc(t)}</a>` : esc(t)}</li>`).join('')}</ol></div>`).join('\n            ')}
          </div>`;
  page({
    path: `${s.key}/index.html`,
    title: `${s.name} — AiVRIC Learning`,
    desc: s.tagline, data: catalogData(),
    crumbs: [['AiVRIC Learning', ''], [s.name, `${s.key}/`]],
    body: `
      <section class="sx-hero" aria-labelledby="lx-h1">
        <nav class="sx-crumbs sx-wrap" aria-label="Breadcrumb"><ol><li><a href="../">AiVRIC Learning</a></li><li><span aria-current="page">${esc(s.name)}</span></li></ol></nav>
        <div class="sx-wrap">
          <div class="sx-hero-inner">
            <p class="sx-eyebrow" data-reveal style="color:${s.tone}">${esc(s.name)}</p>
            <h1 class="sx-h1" id="lx-h1" data-reveal style="--d:.08s">${esc(s.tagline)}</h1>
            ${s.lede ? `<p class="sx-lede" data-reveal style="--d:.16s">${esc(s.lede)}</p>` : ''}
            ${continueCard}
          </div>
        </div>
      </section>
      <section class="sx-section" style="padding-top:0">
        <div class="sx-wrap">
          ${inner}
        </div>
      </section>`,
  });
}

/* ============================== course pages ============================== */
for (const c of COURSES) {
  const root = '../../';
  const order = c.lessons.filter((l) => l.ready).map((l) => l.slug);
  const first = order[0];
  const syllabus = (c.lessons || []).map((l, i) => {
    const inner = `<span class="lx-mod-n"><span>${String(i + 1).padStart(2, '0')}</span></span><span><h3>${esc(l.title)}</h3><p>${esc(l.summary)}</p></span><span class="lx-mod-t">${l.ready ? `${l.minutes} min` : 'In writing'}</span>`;
    return l.ready ? `<a class="lx-mod" href="${l.slug}/" data-course="${c.slug}" data-lesson="${l.slug}">${inner}</a>` : `<div class="lx-mod is-locked">${inner}</div>`;
  }).join('\n            ');
  const assess = c.assessment ? `\n            <div class="lx-mod is-final is-locked"><span class="lx-mod-n"><span>✦</span></span><span><h3>Course assessment</h3><p>${c.assessment.questions} questions across the whole course; ${c.assessment.pass}% to pass. Opens with learner accounts, alongside the course certificate.</p></span><span class="lx-mod-t">Coming</span></div>` : '';
  page({
    path: `${c.url}index.html`,
    title: `${c.title} — AiVRIC Learning`,
    desc: c.summary, data: catalogData(),
    crumbs: [['AiVRIC Learning', ''], ['Foundations', 'foundations/'], [c.title, c.url]],
    ld: [{ '@type': 'Course', name: c.title, description: c.summary, url: SITE + c.url, isAccessibleForFree: true, inLanguage: 'en', educationalLevel: c.level, provider: { '@type': 'Organization', name: 'AiVRIC', sameAs: 'https://aivric.com/' } }],
    body: `
      <section class="sx-hero" aria-labelledby="lx-h1">
        <nav class="sx-crumbs sx-wrap" aria-label="Breadcrumb"><ol><li><a href="${root}">AiVRIC Learning</a></li><li><a href="${root}foundations/">Foundations</a></li><li><span aria-current="page">${esc(c.short || c.title)}</span></li></ol></nav>
        <div class="sx-wrap">
          <div class="sx-hero-inner">
            <p class="sx-eyebrow" data-reveal>Foundations course</p>
            <h1 class="sx-h1" id="lx-h1" data-reveal style="--d:.08s">${esc(c.title)}</h1>
            <p class="sx-lede" data-reveal style="--d:.16s">${esc(c.lede || c.summary)}</p>
            <div class="lx-meta" data-reveal style="--d:.2s">${chips(c)}</div>
            ${first ? `<div class="sx-actions" data-reveal style="--d:.24s"><a class="sx-btn sx-btn-primary" href="${first}/" data-start="${c.slug}" data-base="" data-order="${order.join(',')}">Start the course <span class="sx-arrow" aria-hidden="true">→</span></a><span class="lx-chip" data-course-count="${c.slug}" data-total="${order.length}"></span></div>` : ''}
          </div>
        </div>
      </section>
      <section class="sx-section" style="padding-top:0">
        <div class="sx-wrap lx-course-grid">
          <div>
            ${c.outcomes ? `<div data-reveal><p class="sx-eyebrow">What you'll be able to do</p><ul class="lx-outcomes">${c.outcomes.map((o) => `<li>${esc(o)}</li>`).join('')}</ul></div>` : ''}
            <div style="margin-top:48px" data-reveal>
              <p class="sx-eyebrow">The course</p>
              ${c.lessons?.length ? `<div class="lx-syllabus">
            ${syllabus}${assess}
              </div>` : `<div class="lx-soon"><h2>Lessons in writing</h2><p>${esc(c.summary)} The outline and first lessons are next after GRC Management Fundamentals.</p></div>`}
            </div>
            ${c.frameworks ? `<div style="margin-top:48px" data-reveal><p class="sx-eyebrow">Frameworks and sources referenced</p><div class="lx-frameworks">${c.frameworks.map((f) => `<span class="lx-chip">${esc(f)}</span>`).join('')}</div></div>` : ''}
          </div>
          <aside class="lx-side" data-reveal>
            ${c.audience ? `<h3>Who it's for</h3><ul>${c.audience.map((a) => `<li>${esc(a)}</li>`).join('')}</ul>` : ''}
            <h3>How it works</h3>
            <ul><li>Free and open: no sign-up to read</li><li>A knowledge check closes each lesson</li><li>Progress saved in this browser</li><li>Certificate with learner accounts (coming)</li></ul>
            ${first ? `<a class="sx-btn sx-btn-primary" href="${first}/">Start lesson 1 <span class="sx-arrow" aria-hidden="true">→</span></a>` : ''}
            ${order.length ? `<button type="button" class="sx-btn sx-btn-ghost" data-reset="${c.slug}" style="justify-content:center;cursor:pointer;font:inherit">Clear my progress</button>` : ''}
          </aside>
        </div>
      </section>`,
  });

  /* ------------------------------ lessons ------------------------------ */
  const ready = c.lessons.filter((l) => l.ready);
  c.lessons.forEach((l, i) => {
    if (!l.ready) return;
    const base = `content/${c.school}/${c.slug}/${l.slug}`;
    const body = read(`${base}.html`);
    const meta = json(`${base}.json`);
    const root = '../../../';
    const toc = [...body.matchAll(/<section class="lx-sec[^"]*" id="([^"]+)">\s*<h2>(?:<span class="lx-n">\d+<\/span>)?([^<]+)<\/h2>/g)].map((m) => [m[1], m[2]]);
    const ri = ready.indexOf(l), prev = ready[ri - 1], next = ready[ri + 1];
    const nextAll = c.lessons[i + 1];
    const rail = c.lessons.map((x, j) => x.ready
      ? `<li><a href="../${x.slug}/" data-course="${c.slug}" data-lesson="${x.slug}"${x.slug === l.slug ? ' aria-current="page"' : ''}><span class="lx-rail-n"><span>${j + 1}</span></span><span>${esc(x.title)}</span></a></li>`
      : `<li><a aria-disabled="true" style="opacity:.45;pointer-events:none"><span class="lx-rail-n"><span>${j + 1}</span></span><span>${esc(x.title)}</span></a></li>`).join('');
    const bridges = existsSync(join(repo, `content/${c.school}/${c.slug}/bridges.json`)) ? json(`content/${c.school}/${c.slug}/bridges.json`) : {};
    const b = bridges[l.slug] || meta.bridge;
    const checks = meta.checks || [];
    page({
      path: `${c.url}${l.slug}/index.html`,
      title: `${l.title} — ${c.short || c.title} | AiVRIC Learning`,
      desc: l.summary,
      data: { course: c.slug, lesson: l.slug, checks: checks.map((q) => ({ answer: q.answer })) },
      crumbs: [['AiVRIC Learning', ''], ['Foundations', 'foundations/'], [c.title, c.url], [l.title, `${c.url}${l.slug}/`]],
      ld: [{ '@type': 'LearningResource', name: l.title, description: l.summary, url: `${SITE}${c.url}${l.slug}/`, isAccessibleForFree: true, timeRequired: `PT${l.minutes}M`, learningResourceType: 'Lesson', isPartOf: { '@type': 'Course', name: c.title, url: SITE + c.url }, provider: { '@type': 'Organization', name: 'AiVRIC', sameAs: 'https://aivric.com/' } }],
      body: `
      <div class="lx-progress" aria-hidden="true"><span></span></div>
      <div class="sx-wrap lx-lesson">
        <nav class="lx-rail" aria-label="Course outline">
          <a class="lx-rail-course" href="../"><small>${esc(c.level)} · ${esc(c.short || c.title)}</small><b>${esc(c.title)}</b>
            <div class="lx-course-bar lx-rail-bar" data-course-bar="${c.slug}" data-total="${ready.length}"><span></span></div></a>
          <ol>${rail}</ol>
          ${toc.length ? `<div class="lx-toc"><p>On this page</p>${toc.map(([id, t]) => `<a href="#${id}">${esc(t.trim())}</a>`).join('')}<a href="#check">Knowledge check</a></div>` : ''}
        </nav>
        <article class="lx-article">
          <header class="lx-article-head">
            <nav class="sx-crumbs" aria-label="Breadcrumb" style="padding:0"><ol><li><a href="${root}">Learning</a></li><li><a href="${root}foundations/">Foundations</a></li><li><a href="../">${esc(c.short || c.title)}</a></li></ol></nav>
            <p class="sx-eyebrow" style="margin-top:22px">Lesson ${i + 1} of ${c.lessons.length} · ${l.minutes} min</p>
            <h1>${esc(l.title)}</h1>
            <p class="sx-lede">${esc(l.summary)}</p>
            ${meta.objectives ? `<div class="lx-objectives"><p>By the end of this lesson you can</p><ul>${meta.objectives.map((o) => `<li>${esc(o)}</li>`).join('')}</ul></div>` : ''}
          </header>
${body.replace(/\{\{ROOT\}\}/g, root)}
          ${checks.length ? `<section class="lx-check" id="check" aria-labelledby="lx-check-h">
            <div class="lx-check-head"><h2 id="lx-check-h">Knowledge check</h2><span class="lx-check-score" data-score>${checks.length} questions</span></div>
            ${checks.map((q, qi) => `<div class="lx-q">
              <p class="lx-q-t"><span>Q${qi + 1}</span>${esc(q.q)}</p>
              <div class="lx-opts">${q.options.map((o, oi) => `<button type="button" class="lx-opt"><span class="lx-opt-l">${'ABCD'[oi]}</span><span>${esc(o)}</span></button>`).join('')}</div>
              <p class="lx-why" data-why="${esc(q.why)}" aria-live="polite"></p>
            </div>`).join('\n            ')}
            <div class="lx-check-foot">
              <p>Answer every question to complete the lesson. Your answers stay in this browser.</p>
              <span>
                <button type="button" class="sx-btn sx-btn-ghost" data-retry style="cursor:pointer;font:inherit">Try again</button>
                <button type="button" class="sx-btn sx-btn-primary" data-complete disabled style="cursor:pointer;font:inherit">Complete the lesson <span class="sx-arrow" aria-hidden="true">✓</span></button>
                <span class="lx-done" data-complete-msg hidden>✓ Lesson complete</span>
              </span>
            </div>
          </section>` : ''}
          ${b ? `<aside class="lx-bridge" aria-label="See it in AiVRIC Enterprise Vision">
            <div class="lx-bridge-copy">
              <p class="sx-eyebrow">See it in AiVRIC Enterprise Vision</p>
              <h3>${esc(b.title)}</h3>
              <p>${esc(b.text)}</p>
              <a class="sx-btn sx-btn-ghost" href="${b.link}${b.link.includes('?') ? '&' : '?'}utm_source=academy&utm_medium=web&utm_campaign=learning&utm_content=${c.slug}_${l.slug}">${esc(b.cta)} <span class="sx-arrow" aria-hidden="true">→</span></a>
            </div>
            <figure><img src="${root}assets/learn/stills/${b.still}.jpg" alt="${esc(b.alt)}" loading="lazy" decoding="async" width="1280" height="800" /><figcaption>Demo workspace · sample data</figcaption></figure>
          </aside>` : ''}
          <nav class="lx-pager" aria-label="Lessons">
            ${prev ? `<a href="../${prev.slug}/"><small>← Previous</small><b>${esc(prev.title)}</b></a>` : `<a href="../"><small>← Course</small><b>${esc(c.title)}</b></a>`}
            ${next ? `<a class="is-next" href="../${next.slug}/"><small>Next lesson →</small><b>${esc(next.title)}</b></a>` : nextAll ? `<a class="is-next" href="../"><small>Coming next</small><b>${esc(nextAll.title)}</b></a>` : `<a class="is-next" href="../"><small>Course complete →</small><b>Back to the course</b></a>`}
          </nav>
        </article>
      </div>`,
    });
  });
}
console.log(`built ${written} pages`);
