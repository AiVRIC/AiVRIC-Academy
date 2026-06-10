/* ══════════════════════════════════════════════════════════════════════
   AiVRIC Academy — Badge & Certification Engine v1
   Manages course badges (per-course) and path certifications (per-path).
   Dual-layer: localStorage + Supabase, consistent with academy-progress.js
   ══════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var STORAGE_KEY    = 'aivric_badges_v1';
  var QUIZ_THRESHOLD = 80; // minimum quiz % to earn a badge

  /* ── Course badge metadata ───────────────────────────────────────── */
  var BADGE_META = {
    'governance':              { label: 'Security & Privacy Governance Practitioner',     level: 'Practitioner', color: '#7c3aed', topic: 'Security & Privacy\nGovernance' },
    'asset-governance':        { label: 'Asset Governance Practitioner',                  level: 'Practitioner', color: '#0369a1', topic: 'Asset\nGovernance' },
    'ast-assessor':            { label: 'AST Assessor Procedures Practitioner',           level: 'Practitioner', color: '#0369a1', topic: 'AST Assessor\nProcedures' },
    'information-assurance':   { label: 'Information Assurance Practitioner',             level: 'Practitioner', color: '#047857', topic: 'Information\nAssurance' },
    'secure-engineering':      { label: 'Secure Engineering & Architecture Practitioner', level: 'Practitioner', color: '#b45309', topic: 'Secure Engineering\n& Architecture' },
    'vulnerability-management':{ label: 'Vulnerability Management Practitioner',          level: 'Practitioner', color: '#c2410c', topic: 'Vulnerability\nManagement' },
    'cloud-security':          { label: 'Cloud Security Practitioner',                    level: 'Practitioner', color: '#0369a1', topic: 'Cloud\nSecurity' },
    'web-security':            { label: 'Web Security Practitioner',                      level: 'Practitioner', color: '#b91c1c', topic: 'Web\nSecurity' },
    'riskops-getting-started': { label: 'RiskOps Foundations',                           level: 'Foundations',  color: '#0369a1', topic: 'RiskOps\nFoundations' }
  };

  /* ── Path certification metadata ─────────────────────────────────── */
  var PATH_META = {
    'governance-leader': {
      label:   'Governance Leader Professional',
      level:   'Professional',
      color:   '#7c3aed',
      fa:      'fa-user-shield',
      courses: ['governance', 'information-assurance', 'asset-governance']
    },
    'security-operator': {
      label:   'Security Operator Professional',
      level:   'Professional',
      color:   '#0369a1',
      fa:      'fa-shield-halved',
      courses: ['cloud-security', 'vulnerability-management', 'web-security']
    },
    'grc-audit': {
      label:   'GRC / Audit Professional',
      level:   'Professional',
      color:   '#047857',
      fa:      'fa-scale-balanced',
      courses: ['governance', 'information-assurance', 'cloud-security', 'ast-assessor']
    },
    'engineer-architect': {
      label:   'Engineer / Architect Professional',
      level:   'Professional',
      color:   '#b45309',
      fa:      'fa-drafting-compass',
      courses: ['secure-engineering', 'information-assurance', 'cloud-security']
    }
  };

  /* ── Local store helpers ─────────────────────────────────────────── */
  function _load() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); }
    catch (e) { return {}; }
  }
  function _save(d) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)); } catch (e) {}
  }

  /* ── Credential ID generators ────────────────────────────────────── */
  function _hex(n) {
    var arr = new Uint8Array(Math.ceil(n / 2));
    crypto.getRandomValues(arr);
    return Array.from(arr).map(function (b) { return b.toString(16).padStart(2, '0'); }).join('').toUpperCase().slice(0, n);
  }
  function _badgeId(courseId) {
    return 'AIB-' + courseId.replace(/-/g, '').toUpperCase().slice(0, 6) + '-' + new Date().getFullYear() + '-' + _hex(6);
  }
  function _certId(pathId) {
    return 'AIC-' + pathId.replace(/-/g, '').toUpperCase().slice(0, 8) + '-' + new Date().getFullYear() + '-' + _hex(8);
  }

  /* ── Award a course completion badge ─────────────────────────────── */
  async function awardCourseBadge(courseId, quizScore) {
    var meta = BADGE_META[courseId];
    if (!meta) return null;

    var user = await AcademyAuth.getUser();
    if (!user) return null;

    var store = _load();
    if (store[courseId]) return store[courseId]; // already earned

    var score = (quizScore != null) ? quizScore : 100;
    var name  = _displayName(user);
    var cid   = _badgeId(courseId);
    var site  = (window.ACADEMY_CONFIG || {}).siteUrl || 'https://academy.aivric.com';

    var badge = {
      courseId:     courseId,
      credentialId: cid,
      title:        meta.label,
      level:        meta.level,
      color:        meta.color,
      topic:        meta.topic,
      quizScore:    score,
      earnedAt:     new Date().toISOString(),
      learnerName:  name,
      verifyUrl:    site + '/verify.html?id=' + cid
    };

    store[courseId] = badge;
    _save(store);

    // Persist to Supabase
    try {
      var sb = AcademyAuth.init();
      await sb.from('user_badges').upsert({
        user_id:      user.id,
        course_id:    courseId,
        badge_type:   'course_complete',
        badge_level:  meta.level.toLowerCase(),
        credential_id: cid,
        course_title: meta.label,
        quiz_score:   score,
        learner_name: name
      }, { onConflict: 'user_id,course_id,badge_type' });
    } catch (e) { /* offline — local record is sufficient */ }

    document.dispatchEvent(new CustomEvent('academy:badge-earned', {
      detail: { courseId: courseId, badge: badge }
    }));

    // Check whether completing this badge unlocks a path certification
    _checkPaths(user, _load());

    return badge;
  }

  /* ── Check all paths for newly satisfied requirements ────────────── */
  async function _checkPaths(user, store) {
    var pathCerts = store.__paths || {};
    for (var pid in PATH_META) {
      if (pathCerts[pid]) continue;
      var required = PATH_META[pid].courses;
      var allDone  = required.every(function (c) { return !!store[c]; });
      if (allDone) {
        await _awardPathCert(pid, user, store);
        store = _load(); // refresh after each save
      }
    }
  }

  /* ── Award a path-level certification ───────────────────────────── */
  async function _awardPathCert(pathId, user, store) {
    var meta      = PATH_META[pathId];
    var pathCerts = (store.__paths || {});
    if (pathCerts[pathId]) return pathCerts[pathId];

    var name  = _displayName(user);
    var cid   = _certId(pathId);
    var site  = (window.ACADEMY_CONFIG || {}).siteUrl || 'https://academy.aivric.com';
    var exp   = new Date(); exp.setFullYear(exp.getFullYear() + 2);

    var completedCourses = meta.courses.map(function (cId) {
      return {
        courseId: cId,
        title:    (store[cId] || {}).title || cId,
        earnedAt: (store[cId] || {}).earnedAt || new Date().toISOString()
      };
    });

    var cert = {
      pathId:           pathId,
      credentialId:     cid,
      title:            meta.label + ' Certification',
      level:            meta.level,
      color:            meta.color,
      earnedAt:         new Date().toISOString(),
      expiresAt:        exp.toISOString(),
      learnerName:      name,
      completedCourses: completedCourses,
      verifyUrl:        site + '/verify.html?id=' + cid
    };

    pathCerts[pathId] = cert;
    store.__paths     = pathCerts;
    _save(store);

    try {
      var sb = AcademyAuth.init();
      await sb.from('certifications').upsert({
        user_id:      user.id,
        course_id:    pathId,
        course_title: cert.title,
        credential_id: cid,
        cert_type:    'path',
        path_id:      pathId,
        learner_name: name,
        expires_at:   cert.expiresAt
      }, { onConflict: 'user_id,course_id' });
    } catch (e) {}

    document.dispatchEvent(new CustomEvent('academy:certification-earned', {
      detail: { pathId: pathId, cert: cert }
    }));

    return cert;
  }

  /* ── Public getters ──────────────────────────────────────────────── */
  function getBadge(courseId)   { return _load()[courseId] || null; }
  function getPathCert(pathId)  { return (_load().__paths || {})[pathId] || null; }
  function getBadges()          { var s = _load(); var out = {}; Object.keys(s).forEach(function(k){ if (k !== '__paths') out[k] = s[k]; }); return out; }
  function getPathCerts()       { return _load().__paths || {}; }
  function getBadgeMeta(cId)    { return BADGE_META[cId]  || null; }
  function getPathMeta(pId)     { return PATH_META[pId]   || null; }
  function getAllBadgeMeta()     { return BADGE_META; }
  function getAllPathMeta()      { return PATH_META; }
  function passesThreshold(n)   { return (n == null ? true : n >= QUIZ_THRESHOLD); }
  function getThreshold()       { return QUIZ_THRESHOLD; }

  /* ── Sync from Supabase on login ─────────────────────────────────── */
  async function syncFromSupabase() {
    var user = await AcademyAuth.getUser();
    if (!user) return;
    var sb   = AcademyAuth.init();
    var site = (window.ACADEMY_CONFIG || {}).siteUrl || 'https://academy.aivric.com';

    var [{ data: rows }, { data: certs }] = await Promise.all([
      sb.from('user_badges').select('*').eq('user_id', user.id),
      sb.from('certifications').select('*').eq('user_id', user.id).eq('cert_type', 'path')
    ]);

    var store = _load();

    (rows || []).forEach(function (r) {
      if (!store[r.course_id]) {
        store[r.course_id] = {
          courseId: r.course_id, credentialId: r.credential_id,
          title: r.course_title, level: r.badge_level,
          color: (BADGE_META[r.course_id] || {}).color || '#0369a1',
          topic: (BADGE_META[r.course_id] || {}).topic || r.course_id,
          quizScore: r.quiz_score, earnedAt: r.earned_at,
          learnerName: r.learner_name,
          verifyUrl: site + '/verify.html?id=' + r.credential_id
        };
      }
    });

    var pathCerts = store.__paths || {};
    (certs || []).forEach(function (r) {
      var pid = r.path_id || r.course_id;
      if (!pathCerts[pid]) {
        pathCerts[pid] = {
          pathId: pid, credentialId: r.credential_id, title: r.course_title,
          level: 'Professional', color: (PATH_META[pid] || {}).color || '#0369a1',
          earnedAt: r.issued_at, expiresAt: r.expires_at,
          learnerName: r.learner_name,
          verifyUrl: site + '/verify.html?id=' + r.credential_id
        };
      }
    });
    store.__paths = pathCerts;
    _save(store);
  }

  /* ── Utility ─────────────────────────────────────────────────────── */
  function _displayName(user) {
    var m = user.user_metadata || {};
    return m.full_name || m.name || user.email || 'Academy Learner';
  }

  /* ── Auto-sync on auth ready ─────────────────────────────────────── */
  document.addEventListener('DOMContentLoaded', function () {
    if (!window.AcademyAuth) return;
    AcademyAuth.getUser().then(function (user) { if (user) syncFromSupabase(); });
  });

  /* ── Public API ──────────────────────────────────────────────────── */
  window.AcademyBadges = {
    awardCourseBadge:  awardCourseBadge,
    getBadge:          getBadge,
    getBadges:         getBadges,
    getPathCert:       getPathCert,
    getPathCerts:      getPathCerts,
    getBadgeMeta:      getBadgeMeta,
    getPathMeta:       getPathMeta,
    getAllBadgeMeta:   getAllBadgeMeta,
    getAllPathMeta:    getAllPathMeta,
    passesThreshold:  passesThreshold,
    getThreshold:     getThreshold,
    syncFromSupabase: syncFromSupabase
  };
})();
