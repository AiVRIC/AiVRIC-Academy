/* ══════════════════════════════════════════════════════════════════════
   AiVRIC Academy — Certificate & Badge Generator v1
   Generates SVG badges, handles downloads, LinkedIn sharing, and
   provides helpers used by certificate.html and dashboard.html.
   ══════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* ── Colour helpers ──────────────────────────────────────────────── */
  function _darken(hex, pct) {
    var n = parseInt(hex.replace('#', ''), 16);
    var r = Math.max(0, ((n >> 16) & 255) - Math.round(((n >> 16) & 255) * pct / 100));
    var g = Math.max(0, ((n >> 8)  & 255) - Math.round(((n >> 8)  & 255) * pct / 100));
    var b = Math.max(0, ( n        & 255) - Math.round(( n        & 255) * pct / 100));
    return '#' + [r, g, b].map(function (c) { return c.toString(16).padStart(2, '0'); }).join('');
  }

  /* ── SVG Badge Generator ─────────────────────────────────────────── */
  // Produces a 320 × 370 px hexagonal badge SVG string.
  // opts: { color, level, topic, year, credentialId }
  function generateBadgeSVG(opts) {
    var color  = opts.color  || '#0369a1';
    var dark   = _darken(color, 25);
    var level  = (opts.level  || 'PRACTITIONER').toUpperCase();
    var topic  = (opts.topic  || '').split('\n');
    var year   = opts.year   || new Date().getFullYear();
    var id     = (opts.credentialId || '').replace(/[^A-Z0-9-]/gi, '').slice(-12) || '——';
    var uid    = 'badge_' + Math.random().toString(36).slice(2); // unique gradient ID

    // Topic text lines (max 2 lines, centred at y=290/314)
    var t1  = topic[0] || '';
    var t2  = topic[1] || '';
    var ty1 = t2 ? '282' : '295';
    var topicSVG =
      '<text x="160" y="' + ty1 + '" text-anchor="middle" ' +
        'font-family="\'Inter\',\'Segoe UI\',Arial,sans-serif" font-size="16" font-weight="700" ' +
        'fill="rgba(255,255,255,0.95)">' + _esc(t1) + '</text>' +
      (t2 ? '<text x="160" y="308" text-anchor="middle" ' +
        'font-family="\'Inter\',\'Segoe UI\',Arial,sans-serif" font-size="16" font-weight="700" ' +
        'fill="rgba(255,255,255,0.95)">' + _esc(t2) + '</text>' : '');

    return (
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 370" width="320" height="370" role="img" ' +
        'aria-label="AiVRIC Academy ' + _esc(level) + ' badge">' +
        '<defs>' +
          '<linearGradient id="' + uid + '_bg" x1="0" y1="0" x2="1" y2="1">' +
            '<stop offset="0%" stop-color="' + color + '"/>' +
            '<stop offset="100%" stop-color="' + dark  + '"/>' +
          '</linearGradient>' +
          '<linearGradient id="' + uid + '_shine" x1="0" y1="0" x2="0" y2="1">' +
            '<stop offset="0%"   stop-color="rgba(255,255,255,0.18)"/>' +
            '<stop offset="100%" stop-color="rgba(255,255,255,0)"/>' +
          '</linearGradient>' +
          '<filter id="' + uid + '_shadow" x="-15%" y="-10%" width="130%" height="130%">' +
            '<feDropShadow dx="0" dy="5" stdDeviation="10" flood-color="rgba(0,0,0,0.3)"/>' +
          '</filter>' +
        '</defs>' +

        /* Hex background */
        '<polygon points="160,14 296,90 296,242 160,318 24,242 24,90" ' +
          'fill="url(#' + uid + '_bg)" filter="url(#' + uid + '_shadow)"/>' +
        '<polygon points="160,14 296,90 296,242 160,318 24,242 24,90" ' +
          'fill="url(#' + uid + '_shine)"/>' +

        /* Inner hex border */
        '<polygon points="160,34 276,101 276,231 160,298 44,231 44,101" ' +
          'fill="none" stroke="rgba(255,255,255,0.18)" stroke-width="1.5"/>' +

        /* "AiVRIC ACADEMY" header */
        '<text x="160" y="75" text-anchor="middle" ' +
          'font-family="\'Inter\',\'Segoe UI\',Arial,sans-serif" font-size="11" font-weight="700" ' +
          'fill="rgba(255,255,255,0.65)" letter-spacing="3.5">AiVRIC ACADEMY</text>' +

        /* Rule */
        '<line x1="90" y1="87" x2="230" y2="87" stroke="rgba(255,255,255,0.2)" stroke-width="1"/>' +

        /* Shield icon in circle */
        '<circle cx="160" cy="168" r="44" fill="rgba(255,255,255,0.12)" ' +
          'stroke="rgba(255,255,255,0.22)" stroke-width="1.5"/>' +
        '<text x="160" y="183" text-anchor="middle" font-size="36" fill="rgba(255,255,255,0.92)">🛡</text>' +

        /* Level pill */
        '<rect x="100" y="226" width="120" height="26" rx="13" fill="rgba(255,255,255,0.2)"/>' +
        '<text x="160" y="243" text-anchor="middle" ' +
          'font-family="\'Inter\',\'Segoe UI\',Arial,sans-serif" font-size="10" font-weight="800" ' +
          'fill="rgba(255,255,255,0.95)" letter-spacing="2">' + _esc(level) + '</text>' +

        /* Topic */
        topicSVG +

        /* Year */
        '<text x="160" y="342" text-anchor="middle" ' +
          'font-family="\'Inter\',\'Segoe UI\',Arial,sans-serif" font-size="11" font-weight="400" ' +
          'fill="rgba(255,255,255,0.45)" letter-spacing="1">' + year + '</text>' +

        /* Verified checkmark */
        '<circle cx="160" cy="360" r="9" fill="rgba(255,255,255,0.18)"/>' +
        '<text x="160" y="365" text-anchor="middle" font-size="10" fill="rgba(255,255,255,0.85)">✓</text>' +
      '</svg>'
    );
  }

  /* ── Render badge into a container element ───────────────────────── */
  function renderBadge(container, opts) {
    if (!container) return;
    container.innerHTML = generateBadgeSVG(opts);
  }

  /* ── Download badge as SVG file ──────────────────────────────────── */
  function downloadBadgeSVG(opts, filename) {
    var svg  = generateBadgeSVG(opts);
    var blob = new Blob([svg], { type: 'image/svg+xml' });
    var url  = URL.createObjectURL(blob);
    var a    = document.createElement('a');
    a.href  = url;
    a.download = (filename || ('aivric-badge-' + (opts.courseId || 'cert'))) + '.svg';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 5000);
  }

  /* ── Print certificate page ──────────────────────────────────────── */
  function printCertificate() {
    window.print();
  }

  /* ── LinkedIn "Add Certification" deep-link ──────────────────────── */
  // Builds a pre-filled LinkedIn certification share URL.
  function linkedInCertURL(opts) {
    var params = {
      startTask:       'CERTIFICATION_NAME',
      name:            opts.title || 'AiVRIC Academy Certification',
      organizationId:  '103393036',           // AiVRIC LinkedIn org ID placeholder
      issueYear:       new Date(opts.earnedAt || Date.now()).getFullYear(),
      issueMonth:      new Date(opts.earnedAt || Date.now()).getMonth() + 1,
      certUrl:         opts.verifyUrl || '',
      certId:          opts.credentialId || ''
    };
    if (opts.expiresAt) {
      params.expirationYear  = new Date(opts.expiresAt).getFullYear();
      params.expirationMonth = new Date(opts.expiresAt).getMonth() + 1;
    }
    var qs = Object.entries(params)
      .filter(function (kv) { return kv[1] !== ''; })
      .map(function (kv) { return encodeURIComponent(kv[0]) + '=' + encodeURIComponent(kv[1]); })
      .join('&');
    return 'https://www.linkedin.com/profile/add?' + qs;
  }

  /* ── Copy credential ID to clipboard ────────────────────────────── */
  function copyCredentialId(id, btn) {
    navigator.clipboard.writeText(id).then(function () {
      if (!btn) return;
      var orig = btn.textContent;
      btn.textContent = 'Copied!';
      setTimeout(function () { btn.textContent = orig; }, 2000);
    }).catch(function () {
      var ta = document.createElement('textarea');
      ta.value = id;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    });
  }

  /* ── Credential type from ID prefix ─────────────────────────────── */
  function credTypeFromId(id) {
    if (!id) return 'unknown';
    if (id.slice(0, 4) === 'AIB-') return 'badge';
    if (id.slice(0, 4) === 'AIC-') return 'certification';
    return 'unknown';
  }

  /* ── Format dates ────────────────────────────────────────────────── */
  function fmtDate(iso) {
    if (!iso) return '—';
    var d = new Date(iso);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  }

  /* ── Escape for SVG text ─────────────────────────────────────────── */
  function _esc(s) {
    return String(s)
      .replace(/&/g,  '&amp;')
      .replace(/</g,  '&lt;')
      .replace(/>/g,  '&gt;')
      .replace(/"/g,  '&quot;');
  }

  /* ── Public API ──────────────────────────────────────────────────── */
  window.AcademyCertGen = {
    generateBadgeSVG:   generateBadgeSVG,
    renderBadge:        renderBadge,
    downloadBadgeSVG:   downloadBadgeSVG,
    printCertificate:   printCertificate,
    linkedInCertURL:    linkedInCertURL,
    copyCredentialId:   copyCredentialId,
    credTypeFromId:     credTypeFromId,
    fmtDate:            fmtDate
  };
})();
