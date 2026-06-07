/**
 * AiVRIC Academy — New Pages Capture
 * Captures the specific pages requested:
 *   Integrations, Vision Config, Intelligence/Reporting,
 *   Compliance TrustSignals & Audits, RiskOps full suite,
 *   Projects full suite, Settings pages, External docs URLs
 */

const { chromium } = require('playwright');
const path = require('path');
const fs   = require('fs');

const MAIN_URL = 'https://gcp-dev-defense.aivric.com';
const EMAIL    = process.env.CS_EMAIL;
const PASSWORD = process.env.CS_PASS;
const OUT      = path.join(__dirname, '..', 'screenshots');
const VIEWPORT = { width: 1440, height: 900 };

if (!EMAIL || !PASSWORD) {
  console.error('Set CS_EMAIL and CS_PASS env vars first.');
  process.exit(1);
}

fs.mkdirSync(OUT, { recursive: true });

// ── Anonymization ────────────────────────────────────────────────────────────

const TEXT_REPS = [
  ['aramirez@3hue.net',   'admin@acme-corp.com'],
  ['aramirez@aivric.com', 'admin@acme-corp.com'],
  ['Andrew Ramirez',      'Alex Rivera'],
  ['Andrew',              'Alex'],
  ['Ramirez',             'Rivera'],
  ['aramirez',            'admin'],
  ['3hue',                'Acme Corp'],
];

const ANON_CSS = `
  [class*="avatar"]:not([class*="step"]):not([class*="mod"]):not([class*="ip-"]):not(.acad-):not(.ug-) { filter: blur(10px) !important; }
  #intercom-container, .intercom-launcher-frame, [class*="intercom"] { display: none !important; }
  [class*="api-key"] > *, [class*="token-value"] > *, [class*="secret-key"] > * { filter: blur(8px) !important; }
`;

async function anonymize(page) {
  await page.addStyleTag({ content: ANON_CSS }).catch(() => {});
  await page.evaluate((reps) => {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const nodes = []; let n;
    while ((n = walker.nextNode())) nodes.push(n);
    for (const node of nodes) {
      let t = node.textContent;
      for (const [f, r] of reps) t = t.split(f).join(r);
      t = t.replace(/\b\d{12}\b/g, 'xxxxxxxxxxxx');
      t = t.replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx');
      if (t !== node.textContent) node.textContent = t;
    }
    // Blur input values that may contain credentials
    for (const el of document.querySelectorAll('input[type="password"], input[name*="key"], input[name*="secret"], input[name*="token"]')) {
      el.value = '••••••••••••••••••••';
    }
  }, TEXT_REPS);
}

async function settle(page, ms = 1800) {
  try { await page.waitForLoadState('networkidle', { timeout: 10000 }); } catch (_) {}
  // Wait for skeleton loaders to resolve
  try {
    await page.waitForFunction(() => {
      const skel = document.querySelectorAll('[class*="skeleton"], [class*="shimmer"], [class*="placeholder"]');
      return skel.length === 0 || Array.from(skel).every(el => el.offsetParent === null);
    }, { timeout: 6000 });
  } catch (_) {}
  await page.waitForTimeout(ms);
}

async function shot(page, name) {
  await anonymize(page);
  await page.waitForTimeout(500);
  const file = path.join(OUT, `${name}.png`);
  await page.screenshot({ path: file, fullPage: false, type: 'png' });
  console.log(`  ✓  ${name}.png`);
}

async function goto(page, path_, label) {
  console.log(`  → ${label}`);
  const url = path_.startsWith('http') ? path_ : `${MAIN_URL}${path_}`;
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 }).catch(async (e) => {
    console.log(`    ⚠  Navigation failed (${e.message.slice(0,60)}), retrying...`);
    await page.goto(url, { waitUntil: 'commit', timeout: 15000 }).catch(() => {});
  });
  await settle(page);
}

async function login(page) {
  await page.goto(MAIN_URL, { waitUntil: 'domcontentloaded', timeout: 25000 });
  await page.waitForTimeout(2000);
  for (const sel of ['input[type="email"]', 'input[name="email"]']) {
    try { if (await page.locator(sel).isVisible({ timeout: 1200 })) { await page.fill(sel, EMAIL); break; } } catch (_) {}
  }
  for (const sel of ['input[type="password"]', 'input[name="password"]']) {
    try { if (await page.locator(sel).isVisible({ timeout: 1200 })) { await page.fill(sel, PASSWORD); break; } } catch (_) {}
  }
  for (const sel of ['button[type="submit"]', 'button:has-text("Sign in")', 'button:has-text("Log in")']) {
    try { if (await page.locator(sel).isVisible({ timeout: 1200 })) { await page.click(sel); break; } } catch (_) {}
  }
  await settle(page, 3000);
  console.log('  → Logged in');
}

// ── Main ────────────────────────────────────────────────────────────────────

(async () => {
  console.log('AiVRIC Academy — New Pages Capture');
  console.log('====================================');
  console.log(`Output: ${OUT}\n`);

  const browser = await chromium.launch({
    headless: false,
    slowMo: 60,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--disable-extensions', '--no-sandbox'],
  });

  // ── SESSION 1: Authenticated pages ────────────────────────────────────────
  {
    const ctx  = await browser.newContext({ viewport: VIEWPORT });
    const page = await ctx.newPage();
    await login(page);

    // ── INTEGRATIONS ─────────────────────────────────────────────────────────
    console.log('\n[Integrations]');
    await goto(page, '/integration', 'Integration hub');
    await shot(page, 'integration-hub');

    await goto(page, '/settings/integrations/microsoft-365', 'M365 integration settings');
    await shot(page, 'integration-m365');

    await goto(page, '/vision/config', 'Vision config/AI Signals Config');
    await shot(page, 'vision-config-page');

    // ── VISION / INTELLIGENCE & REPORTING ────────────────────────────────────
    console.log('\n[Vision — Intelligence & Reporting]');
    await goto(page, '/vision/intelligence-brief', 'Intelligence brief');
    await shot(page, 'vision-intelligence-brief');

    await goto(page, '/vision/reporting', 'Vision reporting');
    await shot(page, 'vision-reporting');

    // ── COMPLIANCE ───────────────────────────────────────────────────────────
    console.log('\n[Compliance]');
    await goto(page, '/compliance/trustsignals', 'Compliance — TrustSignals');
    await shot(page, 'compliance-trustsignals');

    await goto(page, '/projects/audits', 'Projects — Audits');
    await shot(page, 'projects-audits');

    // ── RISKOPS FULL SUITE ───────────────────────────────────────────────────
    console.log('\n[RiskOps — full suite]');

    await goto(page, '/risks', 'Risk Governance / Command Center');
    await shot(page, 'riskops-command-center');

    await goto(page, '/risks/my-work', 'My Work');
    await shot(page, 'riskops-my-work');

    await goto(page, '/risks/business-processes', 'Business Processes');
    await shot(page, 'riskops-business-processes');

    await goto(page, '/risks/scenarios', 'Scenario Intelligence');
    await shot(page, 'riskops-scenarios');

    await goto(page, '/risks/quantification', 'Quantification Studio');
    await shot(page, 'riskops-quantification');

    await goto(page, '/projects/exceptions', 'Security Exceptions');
    await shot(page, 'projects-exceptions');

    // ── PROJECTS SUITE ───────────────────────────────────────────────────────
    console.log('\n[Projects suite]');

    await goto(page, '/projects', 'Projects — main');
    await shot(page, 'projects-main');

    await goto(page, '/projects/sla', 'Projects — SLA tracking');
    await shot(page, 'projects-sla');

    await goto(page, '/projects/intake', 'Projects — Intake');
    await shot(page, 'projects-intake');

    // ── SETTINGS ─────────────────────────────────────────────────────────────
    console.log('\n[Settings]');

    await goto(page, '/settings/data-governance', 'Data governance');
    await shot(page, 'settings-data-governance');

    await goto(page, '/manage-groups', 'Manage groups');
    await shot(page, 'settings-manage-groups');

    await goto(page, '/invitations', 'Invitations');
    await shot(page, 'settings-invitations');

    await goto(page, '/users', 'Users');
    await shot(page, 'settings-users');

    await goto(page, '/settings/security', 'Security settings');
    await shot(page, 'settings-security');

    await ctx.close();
  }

  // ── SESSION 2: Public / external URLs (no login) ──────────────────────────
  console.log('\n[External — public URLs]');
  {
    const ctx  = await browser.newContext({ viewport: VIEWPORT });
    const page = await ctx.newPage();

    await goto(page, 'https://cloudsignals.aivric.com/api/v1/docs', 'CloudSignals API docs');
    await settle(page, 2500);
    await shot(page, 'api-docs');

    // docs.aivric.com
    await goto(page, 'https://docs.aivric.com/', 'AiVRIC docs site');
    await settle(page, 2500);
    await shot(page, 'docs-site');

    // aivric.com/support.html
    await goto(page, 'https://aivric.com/support.html', 'AiVRIC support page');
    await settle(page, 2500);
    await shot(page, 'support-page');

    await ctx.close();
  }

  await browser.close();

  const all = fs.readdirSync(OUT).filter(f => f.endsWith('.png'));
  console.log(`\n════ Done — ${all.length} total screenshots in ${OUT} ════\n`);
})();
