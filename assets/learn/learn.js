/* AiVRIC Learning: progress kept in this browser (no account yet), the knowledge checks, the lesson outline and the
   reading bar. The pages carry their data as attributes and one JSON block; this file never fetches anything.
   Storage: localStorage "aivric.learn.v1" = { courses: { <slug>: { done: [lesson], last: lesson, answers: { lesson: [i] } } } }.
   If storage is blocked, everything still works for the visit; it just isn't remembered. */
(function () {
  'use strict';
  var KEY = 'aivric.learn.v1';
  var mem = { courses: {} };
  // read once: every course() hands back the same live object, so a change made anywhere is the one save() writes
  try { var s0 = JSON.parse(localStorage.getItem(KEY)); if (s0 && s0.courses) mem = s0; } catch (e) {}
  function save() { try { localStorage.setItem(KEY, JSON.stringify(mem)); } catch (e) {} }
  function course(slug) { var c = mem.courses[slug] || (mem.courses[slug] = { done: [], last: null, answers: {} }); c.done = c.done || []; c.answers = c.answers || {}; return c; }
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)); };
  var data = {};
  try { var el = document.getElementById('lx-data'); if (el) data = JSON.parse(el.textContent); } catch (e) {}

  /* ---- marks: any [data-course][data-lesson] gets is-done; bars get --done; continue cards light up ---- */
  function paint() {
    $$('[data-lesson][data-course]').forEach(function (n) {
      n.classList.toggle('is-done', course(n.getAttribute('data-course')).done.indexOf(n.getAttribute('data-lesson')) >= 0);
    });
    $$('[data-course-bar]').forEach(function (n) {
      var c = course(n.getAttribute('data-course-bar')), total = +n.getAttribute('data-total') || 1;
      n.style.setProperty('--done', Math.round(100 * c.done.length / total) + '%');
    });
    $$('[data-course-count]').forEach(function (n) {
      var c = course(n.getAttribute('data-course-count')), total = +n.getAttribute('data-total') || 1;
      n.textContent = c.done.length ? c.done.length + ' of ' + total + ' done' : '';
    });
    // the course page's main button: start, continue, or review
    $$('[data-start]').forEach(function (a) {
      var slug = a.getAttribute('data-start'), c = course(slug), list = (a.getAttribute('data-order') || '').split(',');
      var next = list.filter(function (l) { return c.done.indexOf(l) < 0; })[0];
      if (!c.done.length && !c.last) return;
      var target = next || list[list.length - 1];
      a.href = a.getAttribute('data-base') + target + '/';
      a.firstChild.nodeValue = next ? (c.done.length ? 'Continue the course ' : 'Pick up where you left off ') : 'Review the course ';
    });
    // the home and catalog "continue" card: the most recent course with unfinished lessons
    var card = $('[data-continue]');
    if (card && data.catalog) {
      var best = null;
      data.catalog.forEach(function (k) {
        var c = course(k.slug); if (!c.last && !c.done.length) return;
        var next = k.lessons.filter(function (l) { return c.done.indexOf(l.slug) < 0; })[0];
        if (!next) return;
        if (!best || (c.t || 0) > (best.t || 0)) best = { k: k, next: next, n: c.done.length, t: c.t || 0 };
      });
      if (best) {
        card.href = best.k.url + best.next.slug + '/';
        $('[data-continue-course]', card).textContent = best.k.title;
        $('[data-continue-lesson]', card).textContent = best.next.title;
        var ring = $('.lx-continue-ring', card); var pct = Math.round(100 * best.n / best.k.lessons.length);
        ring.style.setProperty('--v', pct); ring.textContent = pct + '%';
        card.classList.add('is-on');
      }
    }
  }

  /* ---- lesson page --------------------------------------------------------------------------------- */
  var lesson = data.lesson, slug = data.course;
  if (lesson && slug) {
    var c = course(slug); c.last = lesson; c.t = Date.now(); save();

    // reading bar, under the header
    var bar = $('.lx-progress span'), art = $('.lx-article');
    var hdr = document.querySelector('.site-header');
    function setTop() { if (hdr) document.documentElement.style.setProperty('--lx-bar-top', Math.round(hdr.getBoundingClientRect().bottom) + 'px'); }
    function onScroll() {
      if (!bar || !art) return;
      var r = art.getBoundingClientRect(), h = r.height - innerHeight * 0.6;
      bar.style.setProperty('--p', Math.max(0, Math.min(1, -r.top / Math.max(1, h))).toFixed(3));
      // the "on this page" list follows the section in view
      var here = null;
      $$('.lx-sec').forEach(function (s) { if (s.getBoundingClientRect().top < innerHeight * 0.35) here = s.id; });
      $$('.lx-toc a').forEach(function (a) { a.classList.toggle('is-here', a.getAttribute('href') === '#' + here); });
    }
    setTop(); onScroll();
    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('resize', function () { setTop(); onScroll(); });

    // knowledge check
    var box = $('.lx-check'), checks = data.checks || [];
    if (box && checks.length) {
      var saved = c.answers[lesson] || [];
      var score = $('[data-score]', box), doneBtn = $('[data-complete]', box), doneMsg = $('[data-complete-msg]', box);
      function tally() {
        var a = c.answers[lesson] || [], answered = 0, right = 0;
        checks.forEach(function (q, i) { if (a[i] != null) { answered++; if (a[i] === q.answer) right++; } });
        if (score) score.textContent = answered ? right + ' of ' + checks.length + ' correct' : checks.length + ' questions';
        var complete = c.done.indexOf(lesson) >= 0;
        if (doneBtn) { doneBtn.disabled = answered < checks.length; doneBtn.hidden = complete; }
        if (doneMsg) doneMsg.hidden = !complete;
      }
      function reveal(qEl, i, pick) {
        var q = checks[i];
        qEl.classList.add('is-answered');
        $$('.lx-opt', qEl).forEach(function (b, j) {
          b.disabled = true;
          if (j === q.answer) b.classList.add('is-right');
          else if (j === pick) b.classList.add('is-wrong');
          b.setAttribute('aria-pressed', j === pick ? 'true' : 'false');
        });
        var w = $('.lx-why', qEl);
        if (w) w.innerHTML = '<b>' + (pick === q.answer ? 'Correct. ' : 'Not quite. ') + '</b>' + w.getAttribute('data-why');
      }
      $$('.lx-q', box).forEach(function (qEl, i) {
        if (saved[i] != null) reveal(qEl, i, saved[i]);
        $$('.lx-opt', qEl).forEach(function (b, j) {
          b.addEventListener('click', function () {
            var a = c.answers[lesson] || (c.answers[lesson] = []);
            if (a[i] != null) return;
            a[i] = j; save(); reveal(qEl, i, j); tally();
          });
        });
      });
      $('[data-retry]', box) && $('[data-retry]', box).addEventListener('click', function () {
        c.answers[lesson] = []; save();
        $$('.lx-q', box).forEach(function (qEl) {
          qEl.classList.remove('is-answered');
          $$('.lx-opt', qEl).forEach(function (b) { b.disabled = false; b.classList.remove('is-right', 'is-wrong'); b.removeAttribute('aria-pressed'); });
        });
        tally();
      });
      doneBtn && doneBtn.addEventListener('click', function () {
        if (c.done.indexOf(lesson) < 0) c.done.push(lesson);
        c.t = Date.now(); save(); tally(); paint();
        var next = $('.lx-pager .is-next'); if (next) next.focus();
      });
      tally();
    }
  }

  /* ---- course page: forget my progress ----------------------------------------------------------------- */
  $$('[data-reset]').forEach(function (b) {
    b.addEventListener('click', function () {
      var s = b.getAttribute('data-reset');
      if (!confirm('Clear your progress in this course on this browser?')) return;
      delete mem.courses[s]; save(); location.reload();
    });
  });

  paint();
})();
