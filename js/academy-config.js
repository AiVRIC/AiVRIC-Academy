/**
 * AiVRIC Academy — Supabase Configuration
 *
 * Replace SUPABASE_URL and SUPABASE_ANON_KEY with your project values.
 * Find them at: https://supabase.com/dashboard/project/<your-project>/settings/api
 *
 * For local development you can also set these on window before this script loads:
 *   window.ACADEMY_SUPABASE_URL = 'https://xxx.supabase.co';
 *   window.ACADEMY_SUPABASE_ANON_KEY = 'eyJ...';
 */
window.ACADEMY_CONFIG = {
  supabaseUrl:     window.ACADEMY_SUPABASE_URL  || 'https://YOUR_PROJECT_ID.supabase.co',
  supabaseAnonKey: window.ACADEMY_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY',
  siteUrl:         'https://academy.aivric.com',
  authRedirectUrl: 'https://academy.aivric.com/auth.html',

  /* OAuth providers enabled in your Supabase project */
  providers: ['google', 'azure'],

  /* Course registry — drives dashboard progress cards */
  courses: [
    { id: 'governance',            title: 'Security & Privacy Governance', modules: 6, badge: '🏛️', path: 'governance-leader' },
    { id: 'asset-governance',      title: 'Asset Governance',              modules: 5, badge: '📦', path: 'governance-leader' },
    { id: 'information-assurance', title: 'Information Assurance',         modules: 6, badge: '🛡️', path: 'governance-leader' },
    { id: 'secure-engineering',    title: 'Secure Engineering & Architecture', modules: 6, badge: '📐', path: 'engineer-architect' },
    { id: 'vulnerability-management', title: 'Vulnerability Management',   modules: 6, badge: '🐛', path: 'security-operator' },
    { id: 'cloud-security',        title: 'Cloud Security',                modules: 6, badge: '☁️', path: 'security-operator' },
    { id: 'web-security',          title: 'Web Security',                  modules: 6, badge: '🌐', path: 'security-operator' },
    { id: 'riskops-getting-started', title: 'Getting Started with RiskOps', modules: 5, badge: '🚀', path: null },
  ],

  /* Learning paths */
  paths: [
    { id: 'governance-leader',   label: 'Governance Leader',   icon: 'fas fa-user-tie',         color: '#a78bfa',
      courses: ['governance', 'information-assurance', 'asset-governance'] },
    { id: 'security-operator',   label: 'Security Operator',   icon: 'fas fa-shield-alt',       color: 'var(--ug-cyan)',
      courses: ['cloud-security', 'vulnerability-management', 'web-security'] },
    { id: 'grc-audit',           label: 'GRC / Audit',         icon: 'fas fa-balance-scale',    color: 'var(--ug-green)',
      courses: ['governance', 'information-assurance', 'cloud-security'] },
    { id: 'engineer-architect',  label: 'Engineer / Architect', icon: 'fas fa-drafting-compass', color: 'var(--ug-amber)',
      courses: ['secure-engineering', 'cloud-security', 'web-security'] },
  ],
};
