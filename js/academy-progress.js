/**
 * AiVRIC Academy — Progress Tracking Module
 *
 * Wraps course progress in a dual-layer system:
 *  1. localStorage  — instant, always available, works without auth
 *  2. Supabase      — persisted server-side when user is signed in
 *
 * Usage in course pages: replace direct localStorage calls with
 *   AcademyProgress.markComplete(courseId, moduleId)
 *   AcademyProgress.isComplete(courseId, moduleId)
 *   AcademyProgress.getProgress(courseId)        → { pct, done, total }
 *   AcademyProgress.setQuizResult(courseId, moduleId, correct)
 *   AcademyProgress.awardCertification(courseId)
 *
 * The module also auto-migrates any existing localStorage keys from
 * the old per-course format (e.g. aivric_gov_v1) to the unified
 * schema used by the Supabase tables.
 */
(function () {
  'use strict';

  /* ── Old localStorage key map (from v1 course pages) ─────────────── */
  var LEGACY_KEYS = {
    'governance':               'aivric_gov_v1',
    'asset-governance':         'aivric_assetgov_v1',
    'ast-assessor':             'aivric_ast_v1',
    'information-assurance':    'aivric_ia_v1',
    'secure-engineering':       'aivric_seceng_v1',
    'vulnerability-management': 'aivric_vulnmgmt_v1',
    'cloud-security':           'aivric_cloudsec_v1',
    'web-security':             'aivric_websec_v1',
    'riskops-getting-started':  'riskops_guide_v1',
  };

  /* Unified local key */
  var LOCAL_KEY = 'aivric_academy_progress_v2';

  /* ── Local storage helpers ────────────────────────────────────────── */
  function loadLocal() {
    try { return JSON.parse(localStorage.getItem(LOCAL_KEY) || '{}'); }
    catch(e) { return {}; }
  }

  function saveLocal(state) {
    try { localStorage.setItem(LOCAL_KEY, JSON.stringify(state)); }
    catch(e) {}
  }

  /* Migrate old per-course keys into the unified schema */
  function migrateLegacy() {
    var unified = loadLocal();
    var changed = false;
    Object.keys(LEGACY_KEYS).forEach(function(courseId) {
      var legacyKey = LEGACY_KEYS[courseId];
      var raw = localStorage.getItem(legacyKey);
      if (!raw) return;
      try {
        var old = JSON.parse(raw);
        if (!unified[courseId]) unified[courseId] = {};
        Object.keys(old).forEach(function(modId) {
          if (!unified[courseId][modId]) {
            unified[courseId][modId] = old[modId];
            changed = true;
          }
        });
      } catch(e) {}
    });
    if (changed) saveLocal(unified);
  }

  /* ── Supabase helpers ─────────────────────────────────────────────── */
  function sb() {
    return window.AcademyAuth ? window.AcademyAuth.init() : null;
  }

  async function getUserId() {
    if (!window.AcademyAuth) return null;
    var user = await window.AcademyAuth.getUser();
    return user ? user.id : null;
  }

  /* Upsert a single module completion row */
  async function upsertModuleRow(userId, courseId, moduleId, data) {
    var client = sb();
    if (!client || !userId) return;
    try {
      await client.from('course_progress').upsert({
        user_id:      userId,
        course_id:    courseId,
        module_id:    moduleId,
        completed:    data.complete   || false,
        quiz_correct: data.quizCorrect != null ? data.quizCorrect : null,
        completed_at: data.complete ? (data.completedAt || new Date().toISOString()) : null,
      }, { onConflict: 'user_id,course_id,module_id' });
    } catch(e) { console.warn('AcademyProgress: Supabase upsert failed', e); }
  }

  /* Fetch all progress for this user from Supabase and merge into local */
  async function syncFromSupabase() {
    var client = sb();
    var userId = await getUserId();
    if (!client || !userId) return;
    try {
      var { data, error } = await client
        .from('course_progress')
        .select('course_id, module_id, completed, quiz_correct, completed_at')
        .eq('user_id', userId);
      if (error || !data) return;

      var local = loadLocal();
      data.forEach(function(row) {
        if (!local[row.course_id]) local[row.course_id] = {};
        local[row.course_id][row.module_id] = {
          complete:    row.completed,
          quizCorrect: row.quiz_correct,
          completedAt: row.completed_at,
        };
      });
      saveLocal(local);
    } catch(e) { console.warn('AcademyProgress: sync failed', e); }
  }

  /* Push all local progress rows to Supabase (called after sign-in) */
  async function pushLocalToSupabase() {
    var client = sb();
    var userId = await getUserId();
    if (!client || !userId) return;

    var local = loadLocal();
    var rows = [];
    Object.keys(local).forEach(function(courseId) {
      Object.keys(local[courseId]).forEach(function(modId) {
        var d = local[courseId][modId];
        rows.push({
          user_id:      userId,
          course_id:    courseId,
          module_id:    modId,
          completed:    d.complete   || false,
          quiz_correct: d.quizCorrect != null ? d.quizCorrect : null,
          completed_at: d.complete ? (d.completedAt || new Date().toISOString()) : null,
        });
      });
    });
    if (!rows.length) return;
    try {
      await client.from('course_progress').upsert(rows, { onConflict: 'user_id,course_id,module_id' });
    } catch(e) { console.warn('AcademyProgress: push failed', e); }
  }

  /* ── Course module list lookup ────────────────────────────────────── */
  function getModuleList(courseId) {
    var cfg = window.ACADEMY_CONFIG;
    if (!cfg) return [];
    var course = cfg.courses.find(function(c){ return c.id === courseId; });
    if (!course) return [];
    var list = [];
    for (var i = 1; i <= course.modules; i++) list.push('mod' + i);
    return list;
  }

  /* ── Public API ───────────────────────────────────────────────────── */

  function markComplete(courseId, moduleId) {
    var local = loadLocal();
    if (!local[courseId]) local[courseId] = {};
    local[courseId][moduleId] = Object.assign(
      local[courseId][moduleId] || {},
      { complete: true, completedAt: new Date().toISOString() }
    );
    saveLocal(local);

    /* Fire-and-forget to Supabase */
    getUserId().then(function(uid) {
      upsertModuleRow(uid, courseId, moduleId, local[courseId][moduleId]);
    });

    /* Check if course is fully complete → auto-award certification */
    var mods = getModuleList(courseId);
    if (mods.length && mods.every(function(m){ return local[courseId][m] && local[courseId][m].complete; })) {
      awardCertification(courseId);
    }
  }

  function setQuizResult(courseId, moduleId, correct) {
    var local = loadLocal();
    if (!local[courseId]) local[courseId] = {};
    if (!local[courseId][moduleId]) local[courseId][moduleId] = {};
    local[courseId][moduleId].quizCorrect = correct;
    saveLocal(local);

    getUserId().then(function(uid) {
      upsertModuleRow(uid, courseId, moduleId, local[courseId][moduleId]);
    });
  }

  function isComplete(courseId, moduleId) {
    var local = loadLocal();
    return !!(local[courseId] && local[courseId][moduleId] && local[courseId][moduleId].complete);
  }

  function getProgress(courseId) {
    var local = loadLocal();
    var mods  = getModuleList(courseId);
    if (!mods.length) return { pct: 0, done: 0, total: 0 };
    var done = mods.filter(function(m){ return local[courseId] && local[courseId][m] && local[courseId][m].complete; }).length;
    return { pct: Math.round((done / mods.length) * 100), done: done, total: mods.length };
  }

  function getAllProgress() {
    var cfg = window.ACADEMY_CONFIG;
    if (!cfg) return {};
    var result = {};
    cfg.courses.forEach(function(c) {
      result[c.id] = getProgress(c.id);
    });
    return result;
  }

  /* ── Certifications ───────────────────────────────────────────────── */
  var CERT_LOCAL_KEY = 'aivric_academy_certs_v2';

  function loadCerts() {
    try { return JSON.parse(localStorage.getItem(CERT_LOCAL_KEY) || '{}'); }
    catch(e) { return {}; }
  }

  function saveCerts(certs) {
    try { localStorage.setItem(CERT_LOCAL_KEY, JSON.stringify(certs)); }
    catch(e) {}
  }

  async function awardCertification(courseId) {
    var certs = loadCerts();
    if (certs[courseId]) return; /* already awarded */

    var cfg = window.ACADEMY_CONFIG;
    var course = cfg ? cfg.courses.find(function(c){ return c.id === courseId; }) : null;
    var title  = course ? course.title : courseId;

    var credId = 'AIVRIC-' + courseId.toUpperCase().replace(/-/g, '') + '-' + Date.now().toString(36).toUpperCase();
    certs[courseId] = { issuedAt: new Date().toISOString(), credentialId: credId, title: title };
    saveCerts(certs);

    /* Persist to Supabase */
    var client = sb();
    var userId = await getUserId();
    if (client && userId) {
      try {
        await client.from('certifications').upsert({
          user_id:       userId,
          course_id:     courseId,
          course_title:  title,
          credential_id: credId,
        }, { onConflict: 'user_id,course_id' });
      } catch(e) {}
    }

    /* Also award a badge via the new badge system if available */
    if (window.AcademyBadges) {
      try {
        /* Compute quiz score from legacy course storage */
        var legacyKey = LEGACY_KEYS[courseId];
        var quizScore = 100;
        if (legacyKey) {
          var raw = localStorage.getItem(legacyKey);
          if (raw) {
            var ls = JSON.parse(raw);
            var mods = Object.keys(ls).filter(function(k) { return ls[k] && ls[k].complete; });
            if (mods.length) {
              var correct = mods.filter(function(m) { return ls[m].quizCorrect === true; }).length;
              quizScore = Math.round((correct / mods.length) * 100);
            }
          }
        }
        AcademyBadges.awardCourseBadge(courseId, quizScore);
      } catch(e) {}
    }

    window.dispatchEvent(new CustomEvent('academy:certification', { detail: { courseId: courseId, title: title, credentialId: credId } }));
  }

  function getCertifications() {
    return loadCerts();
  }

  async function syncCertsFromSupabase() {
    var client = sb();
    var userId = await getUserId();
    if (!client || !userId) return;
    try {
      var { data } = await client.from('certifications').select('course_id, course_title, issued_at, credential_id').eq('user_id', userId);
      if (!data) return;
      var certs = loadCerts();
      data.forEach(function(row) {
        if (!certs[row.course_id]) {
          certs[row.course_id] = { issuedAt: row.issued_at, credentialId: row.credential_id, title: row.course_title };
        }
      });
      saveCerts(certs);
    } catch(e) {}
  }

  /* ── User profile ─────────────────────────────────────────────────── */
  async function getProfile() {
    var client = sb();
    var userId = await getUserId();
    if (!client || !userId) return null;
    try {
      var { data } = await client.from('user_profiles').select('*').eq('id', userId).single();
      return data;
    } catch(e) { return null; }
  }

  async function saveProfile(updates) {
    var client = sb();
    var userId = await getUserId();
    if (!client || !userId) return;
    try {
      await client.from('user_profiles').upsert(Object.assign({ id: userId, updated_at: new Date().toISOString() }, updates));
    } catch(e) { console.warn('AcademyProgress: profile save failed', e); }
  }

  /* ── Init: run migration + listen for auth events ─────────────────── */
  migrateLegacy();

  if (window.AcademyAuth) {
    window.AcademyAuth.onAuthStateChange(function(event) {
      if (event === 'SIGNED_IN') {
        pushLocalToSupabase();
        syncFromSupabase();
        syncCertsFromSupabase();
      }
    });
  }

  /* ── Expose ───────────────────────────────────────────────────────── */
  window.AcademyProgress = {
    markComplete:         markComplete,
    setQuizResult:        setQuizResult,
    isComplete:           isComplete,
    getProgress:          getProgress,
    getAllProgress:        getAllProgress,
    awardCertification:   awardCertification,
    getCertifications:    getCertifications,
    syncFromSupabase:     syncFromSupabase,
    pushLocalToSupabase:  pushLocalToSupabase,
    getProfile:           getProfile,
    saveProfile:          saveProfile,
  };
})();
