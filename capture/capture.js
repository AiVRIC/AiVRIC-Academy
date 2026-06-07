/**
 * AiVRIC Academy — Screenshot & Motion Capture Tool
 * Usage: CS_EMAIL=... CS_PASS=... node capture.js [--env main|provider|all]
 *
 * Captures high-resolution screenshots of CloudSignals + RiskOps for use in
 * Academy training pages. All PII and account-identifying data is anonymized
 * via DOM text replacement and CSS blur before screenshotting.
 */

const { chromium } = require('playwright');
const path = require('path');
const fs   = require('fs');

// ── Config ─────────────────────────────────────────────────────────────────

const MAIN_URL     = 'https://gcp-dev-defense.aivric.com';
const PROVIDER_URL = 'https://3hue.cloudsignals.aivric.com';
const EMAIL        = process.env.CS_EMAIL;
const PASSWORD     = process.env.CS_PASS;
const OUT          = path.join(__dirname, '..', 'screenshots');
const VIEWPORT     = { width: 1440, height: 900 };
const SLOW_MO      = 80;      // ms between actions — looks natural in recordings

const ENV_ARG = (process.argv.find(a => a.startsWith('--env=')) || '').replace('--env=', '') || 'all';

if (!EMAIL || !PASSWORD) {
  console.error('Error: Set CS_EMAIL and CS_PASS environment variables before running.');
  process.exit(1);
}

fs.mkdirSync(OUT, { recursive: true });

// ── Anonymization ───────────────────────────────────────────────────────────

/** Replacements applied to every text node in the DOM before screenshotting */
const TEXT_REPLACEMENTS = [
  ['aramirez@3hue.net',    'admin@acme-corp.com'],
  ['aramirez@aivric.com',  'admin@acme-corp.com'],
  ['Andrew Ramirez',       'Alex Rivera'],
  ['andrew ramirez',       'alex rivera'],
  ['Andrew',               'Alex'],
  ['Ramirez',              'Rivera'],
  ['aramirez',             'admin'],
  // Keep "3hue" company references generic
  ['3hue',                 'Acme Corp'],
];

/** CSS injected before every screenshot to blur sensitive UI regions */
const ANON_CSS = `
  /* Blur user avatars and profile photos */
  [class*="avatar"]:not([class*="step"]):not([class*="mod"]):not([class*="phase"]):not([class*="ip"]):not([class*="quiz"]):not([class*="acad"]):not([class*="cm"]):not([class*="lp"]):not([class*="fc"]) { filter: blur(10px) !important; pointer-events: none !important; }
  /* Blur API key / token values */
  [class*="api-key"] > *, [class*="token"] > *, [class*="secret"] > * { filter: blur(8px) !important; }
  /* Blur credit card / billing numbers */
  [class*="billing"] [class*="number"], [class*="card"] [class*="number"] { filter: blur(6px) !important; }
  /* Remove Intercom/chat widget */
  #intercom-container, .intercom-launcher-frame { display: none !important; }
`;

/** Regex patterns for AWS account IDs and UUIDs — replaced in text nodes */
const REGEX_REPLACEMENTS = [
  [/\b\d{12}\b/g, 'xxxxxxxxxxxx'],
  [/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'],
  [/\/subscriptions\/[^/\s"']+/g, '/subscriptions/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'],
  [/projects\/[0-9]{6,}/g, 'projects/xxxxxxxxxxxx'],
  [/\b1\d{10}\b/g, 'xxxxxxxxxxxxx'],  // phone numbers
];

/** Inject anonymization into the current page */
async function anonymize(page) {
  // 1. CSS — blur avatars and API key areas
  await page.addStyleTag({ content: ANON_CSS }).catch(() => {});

  // 2. Text replacements
  await page.evaluate(([textReps, regexReps]) => {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const nodes = [];
    let n;
    while ((n = walker.nextNode())) nodes.push(n);

    for (const node of nodes) {
      let t = node.textContent;
      // Literal replacements
      for (const [find, rep] of textReps) {
        t = t.split(find).join(rep);
      }
      // Regex replacements — passed as [source, flags, replacement]
      for (const [src, flags, rep] of regexReps) {
        t = t.replace(new RegExp(src, flags), rep);
      }
      if (t !== node.textContent) node.textContent = t;
    }

    // Also patch input values
    for (const input of document.querySelectorAll('input[value], textarea')) {
      for (const [find, rep] of textReps) {
        if (input.value.includes(find)) input.value = input.value.split(find).join(rep);
      }
    }
  },
  [
    TEXT_REPLACEMENTS,
    REGEX_REPLACEMENTS.map(([re, rep]) => [re.source, re.flags, rep]),
  ]);
}

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Wait for network to be mostly idle, then stabilise */
async function settle(page, ms = 1200) {
  try { await page.waitForLoadState('networkidle', { timeout: 8000 }); } catch (_) {}
  await page.waitForTimeout(ms);
}

/** Dismiss any modal/overlay that might obscure the screenshot */
async function dismissModals(page) {
  const selectors = [
    '[aria-label="Close"]', 'button:has-text("Dismiss")',
    'button:has-text("Skip")', 'button:has-text("Got it")',
    '.modal-close', '[data-testid="modal-close"]',
    '.onboarding-dismiss', '[class*="close-button"]',
  ];
  for (const sel of selectors) {
    try {
      const el = page.locator(sel).first();
      if (await el.isVisible({ timeout: 600 })) await el.click();
    } catch (_) {}
  }
}

/** Take a named screenshot after anonymizing */
async function shot(page, name, opts = {}) {
  await dismissModals(page);
  await anonymize(page);
  await page.waitForTimeout(400);

  const file = path.join(OUT, `${name}.png`);
  const options = {
    path: file,
    fullPage: opts.fullPage || false,
    type: 'png',
    ...( opts.clip ? { clip: opts.clip } : {} ),
  };
  await page.screenshot(options);
  console.log(`  ✓  ${name}.png`);
  return file;
}

/** Record a short video clip, then stop and save as webm */
async function recordClip(context, page, name, fn) {
  // Video is configured at context level; just run the action and rename
  await fn(page);
  const videoPath = await page.video()?.path();
  if (videoPath) {
    const dest = path.join(OUT, `${name}.webm`);
    await page.context().close();   // flush video
    fs.copyFileSync(videoPath, dest);
    console.log(`  ✓  ${name}.webm`);
  }
}

// ── Login ───────────────────────────────────────────────────────────────────

async function login(page, baseUrl) {
  console.log(`  → Navigating to ${baseUrl}`);
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await settle(page, 1000);

  // Fill email
  const emailSels = ['input[type="email"]', 'input[name="email"]', 'input[placeholder*="email" i]', '#email'];
  for (const sel of emailSels) {
    try {
      if (await page.locator(sel).isVisible({ timeout: 1500 })) {
        await page.fill(sel, EMAIL);
        break;
      }
    } catch (_) {}
  }

  // Fill password
  const passSels = ['input[type="password"]', 'input[name="password"]', '#password'];
  for (const sel of passSels) {
    try {
      if (await page.locator(sel).isVisible({ timeout: 1500 })) {
        await page.fill(sel, PASSWORD);
        break;
      }
    } catch (_) {}
  }

  // Submit
  const submitSels = [
    'button[type="submit"]', 'input[type="submit"]',
    'button:has-text("Sign in")', 'button:has-text("Log in")',
    'button:has-text("Continue")',
  ];
  for (const sel of submitSels) {
    try {
      if (await page.locator(sel).isVisible({ timeout: 1500 })) {
        await page.click(sel);
        break;
      }
    } catch (_) {}
  }

  await page.waitForTimeout(3000);

  // Detect MFA prompt
  const mfaSels = [
    'input[name="code"]', 'input[placeholder*="code" i]', 'input[placeholder*="MFA" i]',
    'input[placeholder*="verification" i]', '[class*="mfa"]', '[class*="otp"]',
  ];
  let mfaNeeded = false;
  for (const sel of mfaSels) {
    try {
      if (await page.locator(sel).isVisible({ timeout: 1200 })) {
        mfaNeeded = true; break;
      }
    } catch (_) {}
  }

  if (mfaNeeded) {
    console.log('\n  ⚠  MFA prompt detected.');
    console.log('     Please complete MFA in the browser window, then press Enter here to continue...');
    await new Promise(resolve => {
      const rl = require('readline').createInterface({ input: process.stdin, output: process.stdout });
      rl.question('  → Press Enter after completing MFA: ', () => { rl.close(); resolve(); });
    });
    await settle(page, 2000);
  }

  // Wait for a dashboard indicator
  try {
    await page.waitForSelector(
      '[class*="overview"], [class*="dashboard"], [class*="posture"], nav, .sidebar, [class*="sidebar"]',
      { timeout: 20000 }
    );
  } catch (_) {
    console.warn('  ⚠  Could not confirm dashboard load — continuing anyway');
  }
  await settle(page, 1500);
  console.log('  → Logged in');
}

// ── Shot plans ───────────────────────────────────────────────────────────────

/**
 * MAIN APP — CloudSignals + RiskOps practitioner views
 * These screenshots go into riskops-getting-started.html
 */
async function captureMainApp(browser) {
  console.log('\n── Main app: CloudSignals+RiskOps ──────────────────────────────');

  const ctx = await browser.newContext({
    viewport: VIEWPORT,
    recordVideo: { dir: path.join(OUT, 'video'), size: VIEWPORT },
  });
  const page = await ctx.newPage();

  await login(page, MAIN_URL);

  // 1. Overview / Command Center
  console.log('\n  [1/12] Overview dashboard');
  await page.goto(`${MAIN_URL}/overview`, { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(
    async () => page.goto(MAIN_URL, { waitUntil: 'domcontentloaded', timeout: 20000 })
  );
  await settle(page);
  await shot(page, 'overview-dashboard', { fullPage: false });

  // 2. Assets — dashboard
  console.log('  [2/12] Assets dashboard');
  await page.goto(`${MAIN_URL}/assets`, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await settle(page);
  await shot(page, 'assets-dashboard');

  // 3. Assets — all assets list
  console.log('  [3/12] All assets list');
  try {
    const allAssetsLink = page.locator('a:has-text("All Assets"), a:has-text("All assets"), [href*="all"]').first();
    if (await allAssetsLink.isVisible({ timeout: 2000 })) await allAssetsLink.click();
    await settle(page, 800);
  } catch (_) {}
  await shot(page, 'assets-list');

  // 4. Findings — list
  console.log('  [4/12] Findings list');
  await page.goto(`${MAIN_URL}/findings`, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await settle(page);
  await shot(page, 'findings-list', { fullPage: false });

  // 5. Findings — filter to Critical + High
  console.log('  [5/12] Findings filtered Critical+High');
  try {
    // Try clicking a severity filter for Critical
    const critBtn = page.locator(
      'button:has-text("Critical"), [data-value="critical"], [aria-label*="Critical" i], .filter-critical'
    ).first();
    if (await critBtn.isVisible({ timeout: 2000 })) {
      await critBtn.click();
      await page.waitForTimeout(800);
    }
  } catch (_) {}
  await shot(page, 'findings-critical-high');

  // 6. Finding detail — open first finding
  console.log('  [6/12] Finding detail panel');
  try {
    const firstFinding = page.locator('[class*="finding-row"], [class*="finding-item"], tbody tr').first();
    if (await firstFinding.isVisible({ timeout: 3000 })) {
      await firstFinding.click();
      await settle(page, 1200);
    }
  } catch (_) {}
  await shot(page, 'finding-detail');

  // 7. Risk Governance / RiskOps overview
  console.log('  [7/12] Risk governance overview');
  await page.goto(`${MAIN_URL}/risks`, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await settle(page);
  await shot(page, 'risk-governance-overview');

  // 8. Business Processes
  console.log('  [8/12] Business processes');
  try {
    const bpLink = page.locator('a:has-text("Business Process"), [href*="business-process"]').first();
    if (await bpLink.isVisible({ timeout: 2000 })) { await bpLink.click(); await settle(page, 1000); }
  } catch (_) {
    await page.goto(`${MAIN_URL}/risks/business-processes`, { waitUntil: 'domcontentloaded', timeout: 12000 }).catch(() => {});
    await settle(page);
  }
  await shot(page, 'business-processes');

  // 9. Risk Register
  console.log('  [9/12] Risk register');
  try {
    const rrLink = page.locator('a:has-text("Risk Register"), a:has-text("Risk register"), [href*="risk-register"]').first();
    if (await rrLink.isVisible({ timeout: 2000 })) { await rrLink.click(); await settle(page, 1000); }
  } catch (_) {
    await page.goto(`${MAIN_URL}/risks/register`, { waitUntil: 'domcontentloaded', timeout: 12000 }).catch(() => {});
    await settle(page);
  }
  await shot(page, 'risk-register');

  // 10. Treatments list
  console.log('  [10/12] Treatments list');
  await page.goto(`${MAIN_URL}/risks/treatments`, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await settle(page);
  await shot(page, 'treatments-list');

  // 11. Pending decisions tab
  console.log('  [11/12] Pending decisions');
  try {
    const pendingTab = page.locator(
      '[role="tab"]:has-text("Pending"), button:has-text("Pending"), a:has-text("Pending decisions")'
    ).first();
    if (await pendingTab.isVisible({ timeout: 2000 })) { await pendingTab.click(); await settle(page, 800); }
  } catch (_) {}
  await shot(page, 'pending-decisions');

  // 12. Portfolio view
  console.log('  [12/12] Portfolio exposure');
  await page.goto(`${MAIN_URL}/risks/portfolio`, { waitUntil: 'domcontentloaded', timeout: 12000 }).catch(() => {});
  await settle(page);
  await shot(page, 'portfolio-exposure');

  await ctx.close();
  console.log('\n  ✓ Main app capture complete');
}

/**
 * PROVIDER CONSOLE — Admin views
 * These screenshots go into provider-admin.html and provider-onboarding.html
 */
async function captureProviderConsole(browser) {
  console.log('\n── Provider Console ────────────────────────────────────────────');

  const ctx = await browser.newContext({
    viewport: VIEWPORT,
    recordVideo: { dir: path.join(OUT, 'video'), size: VIEWPORT },
  });
  const page = await ctx.newPage();

  // Login via main app first, then navigate to provider console
  await login(page, MAIN_URL);

  // Navigate to provider console
  console.log('\n  → Navigating to Provider Console');
  await page.goto(`${MAIN_URL}/provider-console`, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await settle(page, 1500);

  // 1. Provider Console dashboard
  console.log('  [1/10] Provider Console dashboard');
  await shot(page, 'provider-console-dashboard');

  // 2. Clients & Environments
  console.log('  [2/10] Clients & Environments');
  try {
    const clientsLink = page.locator('a:has-text("Clients"), [href*="clients"]').first();
    if (await clientsLink.isVisible({ timeout: 2000 })) { await clientsLink.click(); await settle(page, 1200); }
  } catch (_) {
    await page.goto(`${MAIN_URL}/provider-console/clients`, { waitUntil: 'domcontentloaded', timeout: 12000 }).catch(() => {});
    await settle(page);
  }
  await shot(page, 'provider-clients-list');

  // 3. Branding configuration
  console.log('  [3/10] Branding configuration');
  try {
    const brandLink = page.locator('a:has-text("Branding"), [href*="branding"]').first();
    if (await brandLink.isVisible({ timeout: 2000 })) { await brandLink.click(); await settle(page, 1200); }
  } catch (_) {
    await page.goto(`${MAIN_URL}/provider-console/branding`, { waitUntil: 'domcontentloaded', timeout: 12000 }).catch(() => {});
    await settle(page);
  }
  await shot(page, 'provider-branding-config');

  // 4. Price Book
  console.log('  [4/10] Price Book');
  try {
    const pbLink = page.locator('a:has-text("Price Book"), a:has-text("Pricing"), [href*="price"]').first();
    if (await pbLink.isVisible({ timeout: 2000 })) { await pbLink.click(); await settle(page, 1000); }
  } catch (_) {}
  await shot(page, 'provider-price-book');

  // 5. Support cases
  console.log('  [5/10] Support cases');
  try {
    const suppLink = page.locator('a:has-text("Support"), [href*="support"]').first();
    if (await suppLink.isVisible({ timeout: 2000 })) { await suppLink.click(); await settle(page, 1000); }
  } catch (_) {}
  await shot(page, 'provider-support-cases');

  // 6. GRC Administration — Managed Entities
  console.log('  [6/10] GRC Admin — Managed Entities');
  await page.goto(`${MAIN_URL}/settings/grc-administration`, { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(
    async () => page.goto(`${MAIN_URL}/settings`, { waitUntil: 'domcontentloaded', timeout: 15000 })
  );
  await settle(page, 1000);
  try {
    const meLink = page.locator('a:has-text("Managed Entities"), [href*="managed-entit"]').first();
    if (await meLink.isVisible({ timeout: 2000 })) { await meLink.click(); await settle(page, 1200); }
  } catch (_) {}
  await shot(page, 'grc-managed-entities');

  // 7. GRC Administration — GRC Users
  console.log('  [7/10] GRC Admin — GRC Users');
  try {
    const gcLink = page.locator('a:has-text("GRC Users"), a:has-text("GRC User"), [href*="grc-user"]').first();
    if (await gcLink.isVisible({ timeout: 2000 })) { await gcLink.click(); await settle(page, 1200); }
  } catch (_) {
    await page.goto(`${MAIN_URL}/settings/grc-users`, { waitUntil: 'domcontentloaded', timeout: 12000 }).catch(() => {});
    await settle(page);
  }
  await shot(page, 'grc-users-list');

  // 8. GRC AI Settings
  console.log('  [8/10] GRC AI Settings');
  try {
    const aiLink = page.locator('a:has-text("AI Settings"), a:has-text("AI Config"), [href*="ai-settings"]').first();
    if (await aiLink.isVisible({ timeout: 2000 })) { await aiLink.click(); await settle(page, 1200); }
  } catch (_) {
    await page.goto(`${MAIN_URL}/settings/grc-administration/ai`, { waitUntil: 'domcontentloaded', timeout: 12000 }).catch(() => {});
    await settle(page);
  }
  await shot(page, 'grc-ai-settings');

  // 9. Vision AI configuration
  console.log('  [9/10] Vision AI configuration');
  await page.goto(`${MAIN_URL}/vision`, { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {});
  await settle(page, 1000);
  try {
    const aiCfg = page.locator('a:has-text("AI Signals"), a:has-text("Model Config"), a:has-text("Vision Model")').first();
    if (await aiCfg.isVisible({ timeout: 2000 })) { await aiCfg.click(); await settle(page, 1200); }
  } catch (_) {}
  await shot(page, 'vision-ai-config');

  // 10. RiskOps entitlement area
  console.log('  [10/10] RiskOps entitlement toggle');
  await page.goto(`${MAIN_URL}/provider-console`, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await settle(page, 1200);
  try {
    const riskopsEl = page.locator('[class*="riskops"], [class*="RiskOps"], :has-text("RiskOps Module")').first();
    if (await riskopsEl.isVisible({ timeout: 3000 })) {
      await riskopsEl.scrollIntoViewIfNeeded();
      await page.waitForTimeout(500);
    }
  } catch (_) {}
  await shot(page, 'riskops-entitlement-toggle');

  await ctx.close();
  console.log('\n  ✓ Provider Console capture complete');
}

/**
 * PROVIDER PORTAL — Branded white-label view
 * These screenshots go into provider-onboarding.html
 */
async function captureProviderPortal(browser) {
  console.log('\n── Provider Portal (white-label) ───────────────────────────────');

  const ctx = await browser.newContext({ viewport: VIEWPORT });
  const page = await ctx.newPage();

  await login(page, PROVIDER_URL);

  // 1. Provider portal overview
  console.log('  [1/3] Provider portal overview');
  await settle(page, 1000);
  await shot(page, 'provider-portal-overview');

  // 2. Findings in provider portal context
  console.log('  [2/3] Provider portal — findings');
  await page.goto(`${PROVIDER_URL}/findings`, { waitUntil: 'domcontentloaded', timeout: 12000 }).catch(() => {});
  await settle(page);
  await shot(page, 'provider-portal-findings');

  // 3. Assets in provider portal
  console.log('  [3/3] Provider portal — assets');
  await page.goto(`${PROVIDER_URL}/assets`, { waitUntil: 'domcontentloaded', timeout: 12000 }).catch(() => {});
  await settle(page);
  await shot(page, 'provider-portal-assets');

  await ctx.close();
  console.log('\n  ✓ Provider portal capture complete');
}

/**
 * ANIMATED CLIPS — Short WebM recordings of key interactions
 * These will be embedded as <video autoplay loop muted> elements
 */
async function captureAnimatedClips(browser) {
  console.log('\n── Animated clips (WebM) ───────────────────────────────────────');

  // Clip 1: Findings triage flow (filter → click → panel)
  const ctx1 = await browser.newContext({
    viewport: VIEWPORT,
    recordVideo: { dir: path.join(OUT, 'video'), size: VIEWPORT },
  });
  const page1 = await ctx1.newPage();
  await login(page1, MAIN_URL);
  await page1.goto(`${MAIN_URL}/findings`, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await settle(page1, 800);

  console.log('  [Clip 1] Findings triage interaction');
  try {
    // Hover over severity filter
    const critBtn = page1.locator('button:has-text("Critical"), [data-value="critical"]').first();
    if (await critBtn.isVisible({ timeout: 2000 })) {
      await critBtn.hover(); await page1.waitForTimeout(400);
      await critBtn.click(); await settle(page1, 1000);
      // Click first finding row
      const row = page1.locator('tbody tr, [class*="finding-row"]').first();
      if (await row.isVisible({ timeout: 2000 })) { await row.hover(); await page1.waitForTimeout(400); await row.click(); await settle(page1, 1200); }
    }
  } catch (_) {}
  await anonymize(page1);
  const vid1 = await page1.video();
  await ctx1.close();
  if (vid1) {
    const p = await vid1.path();
    if (p && fs.existsSync(p)) { fs.copyFileSync(p, path.join(OUT, 'clip-findings-triage.webm')); console.log('  ✓  clip-findings-triage.webm'); }
  }

  // Clip 2: RiskOps flow — treatments
  const ctx2 = await browser.newContext({
    viewport: VIEWPORT,
    recordVideo: { dir: path.join(OUT, 'video'), size: VIEWPORT },
  });
  const page2 = await ctx2.newPage();
  await login(page2, MAIN_URL);
  await page2.goto(`${MAIN_URL}/risks/treatments`, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await settle(page2, 1000);
  console.log('  [Clip 2] Treatments workflow');
  await anonymize(page2);
  try {
    const row = page2.locator('tbody tr, [class*="treatment-row"]').first();
    if (await row.isVisible({ timeout: 3000 })) { await row.hover(); await page2.waitForTimeout(600); }
  } catch (_) {}
  const vid2 = await page2.video();
  await ctx2.close();
  if (vid2) {
    const p = await vid2.path();
    if (p && fs.existsSync(p)) { fs.copyFileSync(p, path.join(OUT, 'clip-treatments.webm')); console.log('  ✓  clip-treatments.webm'); }
  }

  console.log('\n  ✓ Animated clips capture complete');
}

// ── Main ────────────────────────────────────────────────────────────────────

(async () => {
  fs.mkdirSync(path.join(OUT, 'video'), { recursive: true });

  console.log('AiVRIC Academy — Screenshot Capture');
  console.log('====================================');
  console.log(`Output: ${OUT}`);
  console.log(`Environments: ${ENV_ARG}`);
  console.log(`Viewport: ${VIEWPORT.width}×${VIEWPORT.height}`);
  console.log('');

  const browser = await chromium.launch({
    headless: false,          // headed so user can complete MFA
    slowMo: SLOW_MO,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--start-maximized', '--disable-extensions', '--no-sandbox'],
  });

  try {
    if (ENV_ARG === 'main' || ENV_ARG === 'all') {
      await captureMainApp(browser);
    }
    if (ENV_ARG === 'provider' || ENV_ARG === 'all') {
      await captureProviderConsole(browser);
      await captureProviderPortal(browser);
    }
    if (ENV_ARG === 'clips' || ENV_ARG === 'all') {
      await captureAnimatedClips(browser);
    }
  } finally {
    await browser.close();
  }

  const screenshots = fs.readdirSync(OUT).filter(f => f.endsWith('.png'));
  const videos      = fs.readdirSync(OUT).filter(f => f.endsWith('.webm'));
  console.log(`\n════════════════════════════════════`);
  console.log(`  Done!  ${screenshots.length} screenshots, ${videos.length} video clips`);
  console.log(`  Output directory: ${OUT}`);
  console.log(`════════════════════════════════════\n`);
})();
