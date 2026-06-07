/**
 * Academy Screenshot — Targeted Fix Pass
 * Re-captures pages that failed in the first run:
 *  • Provider Console tabs (from the provider portal URL)
 *  • GRC Administration pages (managed entities, GRC users, AI settings)
 *  • Vision AI configuration
 *  • RiskOps entitlement toggle (from provider portal)
 */

const { chromium } = require('playwright');
const path = require('path');
const fs   = require('fs');

const PROVIDER_URL = 'https://3hue.cloudsignals.aivric.com';
const MAIN_URL     = 'https://gcp-dev-defense.aivric.com';
const EMAIL        = process.env.CS_EMAIL;
const PASSWORD     = process.env.CS_PASS;
const OUT          = path.join(__dirname, '..', 'screenshots');
const VIEWPORT     = { width: 1440, height: 900 };

const TEXT_REPLACEMENTS = [
  ['aramirez@3hue.net', 'admin@acme-corp.com'],
  ['aramirez@aivric.com', 'admin@acme-corp.com'],
  ['Andrew Ramirez', 'Alex Rivera'],
  ['Andrew', 'Alex'],
  ['Ramirez', 'Rivera'],
  ['aramirez', 'admin'],
  ['3hue', 'Acme Corp'],
];

const ANON_CSS = `
  [class*="avatar"]:not([class*="step"]):not([class*="mod"]):not([class*="ip-"]):not(.acad-) { filter: blur(10px) !important; }
  #intercom-container, .intercom-launcher-frame { display: none !important; }
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
      // AWS account IDs (12 digits)
      t = t.replace(/\b\d{12}\b/g, 'xxxxxxxxxxxx');
      // UUIDs
      t = t.replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx');
      if (t !== node.textContent) node.textContent = t;
    }
  }, TEXT_REPLACEMENTS);
}

async function waitForContent(page, timeout = 12000) {
  try { await page.waitForLoadState('networkidle', { timeout }); } catch (_) {}
  // Wait for skeleton loaders to resolve
  try {
    await page.waitForFunction(() => {
      const skeletons = document.querySelectorAll('[class*="skeleton"], [class*="loading"], [class*="shimmer"], [class*="placeholder"]');
      return skeletons.length === 0 || Array.from(skeletons).every(el => el.offsetParent === null);
    }, { timeout: 8000 });
  } catch (_) {}
  await page.waitForTimeout(1800);
}

async function shot(page, name) {
  await anonymize(page);
  await page.waitForTimeout(500);
  const file = path.join(OUT, `${name}.png`);
  await page.screenshot({ path: file, fullPage: false, type: 'png' });
  console.log(`  ✓  ${name}.png`);
}

async function login(page, url) {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(2000);
  try { await page.fill('input[type="email"]', EMAIL); } catch (_) {}
  try { await page.fill('input[type="password"]', PASSWORD); } catch (_) {}
  try { await page.click('button[type="submit"]'); } catch (_) {}
  await waitForContent(page, 15000);
}

async function clickTab(page, label) {
  const sel = `button:has-text("${label}"), [role="tab"]:has-text("${label}"), a:has-text("${label}")`;
  try {
    const el = page.locator(sel).first();
    if (await el.isVisible({ timeout: 3000 })) { await el.click(); await page.waitForTimeout(1500); return true; }
  } catch (_) {}
  return false;
}

(async () => {
  console.log('Academy Screenshot Fix Pass');
  console.log('===========================');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 60,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--disable-extensions', '--no-sandbox'],
  });

  // ── PASS 1: Provider portal tabs ──────────────────────────────────────────
  console.log('\n── Pass 1: Provider Console tabs ───────────────────────────────');
  {
    const ctx  = await browser.newContext({ viewport: VIEWPORT });
    const page = await ctx.newPage();
    await login(page, PROVIDER_URL);

    // Navigate to provider console home (should already be there or close)
    await page.goto(`${PROVIDER_URL}/provider-console`, { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(
      async () => page.goto(PROVIDER_URL, { waitUntil: 'domcontentloaded', timeout: 20000 })
    );
    await waitForContent(page);

    // Provider Console Dashboard — re-take with content fully loaded
    console.log('  Provider Console dashboard');
    await shot(page, 'provider-console-dashboard');

    // Clients & Environments tab
    console.log('  Clients & Environments');
    await clickTab(page, 'Clients & Environments') || await clickTab(page, 'Clients');
    await waitForContent(page);
    await shot(page, 'provider-clients-list');

    // Branding tab
    console.log('  Branding');
    await clickTab(page, 'Branding');
    await waitForContent(page);
    await shot(page, 'provider-branding-config');

    // Price Book tab
    console.log('  Price Book');
    await clickTab(page, 'Price Book');
    await waitForContent(page);
    await shot(page, 'provider-price-book');

    // Invoices tab
    console.log('  Invoices');
    await clickTab(page, 'Invoices');
    await waitForContent(page);
    await shot(page, 'provider-invoices');

    // Support tab
    console.log('  Support');
    await clickTab(page, 'Support');
    await waitForContent(page);
    await shot(page, 'provider-support-cases');

    // Team & Activity tab
    console.log('  Team & Activity');
    await clickTab(page, 'Team & Activity') || await clickTab(page, 'Team');
    await waitForContent(page);
    await shot(page, 'provider-team-activity');

    // RiskOps entitlement — scroll to RiskOps Module section
    console.log('  RiskOps entitlement');
    await clickTab(page, 'Dashboard');
    await waitForContent(page);
    try {
      const riskEl = page.locator(':has-text("RiskOps Module"), :has-text("Enable RiskOps")').first();
      await riskEl.scrollIntoViewIfNeeded();
      await page.waitForTimeout(600);
    } catch (_) {}
    await shot(page, 'riskops-entitlement-toggle');

    await ctx.close();
  }

  // ── PASS 2: Main app — GRC Administration & Vision AI ────────────────────
  console.log('\n── Pass 2: GRC Admin + Vision AI ───────────────────────────────');
  {
    const ctx  = await browser.newContext({ viewport: VIEWPORT });
    const page = await ctx.newPage();
    await login(page, MAIN_URL);

    // GRC Managed Entities
    console.log('  GRC Managed Entities');
    await page.goto(`${MAIN_URL}/settings/grc-administration`, { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
    await waitForContent(page, 15000);
    // Try to click managed entities link in sidebar
    try {
      const link = page.locator('a:has-text("Managed Entities"), [href*="managed-entit"]').first();
      if (await link.isVisible({ timeout: 3000 })) { await link.click(); await waitForContent(page); }
    } catch (_) {}
    await shot(page, 'grc-managed-entities');

    // GRC Users
    console.log('  GRC Users');
    try {
      const link = page.locator('a:has-text("GRC Users"), [href*="grc-user"]').first();
      if (await link.isVisible({ timeout: 3000 })) { await link.click(); await waitForContent(page); }
      else {
        await page.goto(`${MAIN_URL}/settings/grc-users`, { waitUntil: 'domcontentloaded', timeout: 15000 });
        await waitForContent(page);
      }
    } catch (_) {}
    await shot(page, 'grc-users-list');

    // GRC AI Settings
    console.log('  GRC AI Settings');
    try {
      const link = page.locator('a:has-text("AI Settings"), a:has-text("AI Config")').first();
      if (await link.isVisible({ timeout: 3000 })) { await link.click(); await waitForContent(page); }
      else {
        await page.goto(`${MAIN_URL}/settings/grc-administration/ai-settings`, { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(
          async () => page.goto(`${MAIN_URL}/settings/ai`, { waitUntil: 'domcontentloaded', timeout: 15000 })
        );
        await waitForContent(page);
      }
    } catch (_) {}
    await shot(page, 'grc-ai-settings');

    // Vision AI
    console.log('  Vision AI configuration');
    await page.goto(`${MAIN_URL}/vision`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await waitForContent(page);
    try {
      const link = page.locator('a:has-text("AI Signals"), a:has-text("Model Config"), a:has-text("Vision Model"), a:has-text("AI Config")').first();
      if (await link.isVisible({ timeout: 3000 })) { await link.click(); await waitForContent(page); }
    } catch (_) {}
    await shot(page, 'vision-ai-config');

    // Vision Chat (for motion graphic reference)
    console.log('  Vision Chat');
    try {
      const link = page.locator('a:has-text("Chat"), [href*="chat"]').first();
      if (await link.isVisible({ timeout: 3000 })) { await link.click(); await waitForContent(page); }
    } catch (_) {}
    await shot(page, 'vision-chat');

    // Scans page
    console.log('  Scans');
    await page.goto(`${MAIN_URL}/scans`, { waitUntil: 'domcontentloaded', timeout: 12000 }).catch(() => {});
    await waitForContent(page);
    await shot(page, 'scans-list');

    // Compliance overview
    console.log('  Compliance');
    await page.goto(`${MAIN_URL}/compliance`, { waitUntil: 'domcontentloaded', timeout: 12000 }).catch(() => {});
    await waitForContent(page);
    await shot(page, 'compliance-overview');

    await ctx.close();
  }

  await browser.close();

  const all = fs.readdirSync(OUT).filter(f => f.endsWith('.png'));
  console.log(`\n════ Fix pass complete — ${all.length} total screenshots ════\n`);
})();
