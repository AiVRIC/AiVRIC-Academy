/* AiVRIC Learning: the practice activities inside a lesson. Each <div class="lx-act" data-act="N"> is filled from
   lx-data.activities[N]. Four kinds:
     sort      tap an item, then a bucket (or drag it there); Check marks each item and explains it
     sequence  reorder steps with drag or the up and down buttons; Check marks each position
     choose    pick the stronger of two; the answer and the reason show at once
     matrix    a 5 x 5 likelihood x impact grid: switch controls on and watch the residual risk move against the tolerance
   Keyboard, touch and mouse all work; nothing is stored. Results are announced to screen readers through aria-live. */
(function () {
  'use strict';
  var data = {};
  try { data = JSON.parse(document.getElementById('lx-data').textContent); } catch (e) { return; }
  var acts = data.activities || [];
  if (!acts.length) return;
  var esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };
  var KIND = { sort: 'Sort it', sequence: 'Put it in order', choose: 'Pick the stronger', matrix: 'Try it' };
  function shuffle(a, seed) {
    a = a.slice(); var s = seed || 7;
    for (var i = a.length - 1; i > 0; i--) { s = (s * 9301 + 49297) % 233280; var j = Math.floor(s / 233280 * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  function shell(el, a, i, body) {
    el.innerHTML = '<div class="lx-act-head"><p class="lx-act-k"><span class="lx-act-ic" aria-hidden="true"></span>' + esc(KIND[a.type] || 'Practice') + ' · activity ' + (i + 1) + '</p>' +
      '<h3>' + esc(a.title) + '</h3><p class="lx-act-p">' + esc(a.prompt) + '</p></div>' + body +
      '<p class="lx-act-msg" aria-live="polite"></p>';
    el.setAttribute('data-kind', a.type);
    el.setAttribute('role', 'group');
    el.setAttribute('aria-label', a.title);
  }
  var msg = function (el, t, ok) { var m = el.querySelector('.lx-act-msg'); m.innerHTML = t; m.className = 'lx-act-msg' + (ok == null ? '' : ok ? ' is-ok' : ' is-no'); };

  /* ---------------- sort ---------------- */
  function sort(el, a, i) {
    var items = shuffle(a.items.map(function (it, k) { return { it: it, k: k }; }), i + 3);
    shell(el, a, i,
      '<div class="lx-sort-tray" data-bucket="" aria-label="Items to sort">' + items.map(function (x) {
        return '<button type="button" class="lx-chipbtn" draggable="true" data-k="' + x.k + '">' + esc(x.it.text) + '</button>';
      }).join('') + '</div>' +
      '<div class="lx-sort-buckets" style="--n:' + a.buckets.length + '">' + a.buckets.map(function (b) {
        return '<div class="lx-bucket" data-bucket="' + esc(b.id) + '"><button type="button" class="lx-bucket-h">' + esc(b.label) + '<small>Tap to place here</small></button><div class="lx-bucket-in"></div></div>';
      }).join('') + '</div>' +
      '<div class="lx-act-foot"><button type="button" class="sx-btn sx-btn-primary" data-check>Check my sorting</button><button type="button" class="sx-btn sx-btn-ghost" data-reset>Start again</button></div>');
    var tray = el.querySelector('.lx-sort-tray'), picked = null;
    function place(btn, bucketEl) {
      btn.classList.remove('is-picked', 'is-right', 'is-wrong'); btn.removeAttribute('title');
      var why = btn.querySelector('.lx-why-s'); if (why) why.remove();
      (bucketEl.querySelector('.lx-bucket-in') || bucketEl).appendChild(btn);
      picked = null; el.classList.remove('is-picking');
      if (!tray.querySelector('.lx-chipbtn')) tray.classList.add('is-empty'); else tray.classList.remove('is-empty');
    }
    el.addEventListener('click', function (e) {
      var chip = e.target.closest('.lx-chipbtn'), head = e.target.closest('.lx-bucket-h');
      if (chip && !el.classList.contains('is-checked')) {
        if (picked === chip) { chip.classList.remove('is-picked'); picked = null; el.classList.remove('is-picking'); return; }
        if (chip.parentElement !== tray) { place(chip, tray); return; }      // a placed item goes back to the tray
        if (picked) picked.classList.remove('is-picked');
        picked = chip; chip.classList.add('is-picked'); el.classList.add('is-picking');
        msg(el, 'Now choose where <b>' + esc(a.items[+chip.dataset.k].text) + '</b> belongs.');
        return;
      }
      if (head && picked) { place(picked, head.parentElement); msg(el, ''); }
    });
    // drag and drop (desktop)
    el.addEventListener('dragstart', function (e) { var c = e.target.closest('.lx-chipbtn'); if (!c || el.classList.contains('is-checked')) return; picked = c; e.dataTransfer.setData('text/plain', c.dataset.k); e.dataTransfer.effectAllowed = 'move'; });
    el.addEventListener('dragover', function (e) { var b = e.target.closest('.lx-bucket, .lx-sort-tray'); if (b && picked) { e.preventDefault(); b.classList.add('is-over'); } });
    el.addEventListener('dragleave', function (e) { var b = e.target.closest('.lx-bucket, .lx-sort-tray'); if (b) b.classList.remove('is-over'); });
    el.addEventListener('drop', function (e) { var b = e.target.closest('.lx-bucket, .lx-sort-tray'); if (b && picked) { e.preventDefault(); b.classList.remove('is-over'); place(picked, b); } });
    el.querySelector('[data-check]').addEventListener('click', function () {
      if (tray.querySelector('.lx-chipbtn')) { msg(el, 'Place every item first. ' + tray.querySelectorAll('.lx-chipbtn').length + ' left in the tray.'); return; }
      var right = 0;
      el.querySelectorAll('.lx-bucket .lx-chipbtn').forEach(function (c) {
        var it = a.items[+c.dataset.k], ok = c.closest('.lx-bucket').dataset.bucket === it.bucket;
        if (ok) right++;
        c.classList.add(ok ? 'is-right' : 'is-wrong');
        var label = (a.buckets.filter(function (b) { return b.id === it.bucket; })[0] || {}).label;
        c.insertAdjacentHTML('beforeend', '<span class="lx-why-s">' + (ok ? '' : 'Belongs in <b>' + esc(label) + '</b>. ') + esc(it.why || '') + '</span>');
      });
      el.classList.add('is-checked');
      msg(el, right === a.items.length ? '<b>All ' + right + ' right.</b> Nicely sorted.' : '<b>' + right + ' of ' + a.items.length + ' right.</b> Read the notes on the ones marked, then start again to try once more.', right === a.items.length);
    });
    el.querySelector('[data-reset]').addEventListener('click', function () { el.classList.remove('is-checked'); el.querySelectorAll('.lx-chipbtn').forEach(function (c) { place(c, tray); }); shuffle([].slice.call(tray.children), Date.now() % 997).forEach(function (c) { tray.appendChild(c); }); msg(el, ''); });
  }

  /* ---------------- sequence ---------------- */
  function sequence(el, a, i) {
    var order = shuffle(a.steps.map(function (s, k) { return k; }), i + 5);
    if (order.every(function (k, j) { return k === j; })) order.reverse();
    shell(el, a, i, '<ol class="lx-seq">' + order.map(function (k) {
      return '<li class="lx-seq-i" draggable="true" data-k="' + k + '"><span class="lx-seq-n"></span><span class="lx-seq-t">' + esc(a.steps[k]) + '</span>' +
        '<span class="lx-seq-btns"><button type="button" data-up aria-label="Move up">↑</button><button type="button" data-down aria-label="Move down">↓</button></span></li>';
    }).join('') + '</ol><div class="lx-act-foot"><button type="button" class="sx-btn sx-btn-primary" data-check>Check the order</button><button type="button" class="sx-btn sx-btn-ghost" data-reset>Shuffle</button></div>');
    var list = el.querySelector('.lx-seq'), drag = null;
    function clear() { el.classList.remove('is-checked'); list.querySelectorAll('.lx-seq-i').forEach(function (li) { li.classList.remove('is-right', 'is-wrong'); }); msg(el, ''); }
    list.addEventListener('click', function (e) {
      var li = e.target.closest('.lx-seq-i'); if (!li) return;
      if (e.target.closest('[data-up]') && li.previousElementSibling) { list.insertBefore(li, li.previousElementSibling); clear(); li.querySelector('[data-up]').focus(); }
      if (e.target.closest('[data-down]') && li.nextElementSibling) { list.insertBefore(li.nextElementSibling, li); clear(); li.querySelector('[data-down]').focus(); }
    });
    list.addEventListener('dragstart', function (e) { drag = e.target.closest('.lx-seq-i'); if (drag) { drag.classList.add('is-drag'); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', ''); } });
    list.addEventListener('dragend', function () { if (drag) drag.classList.remove('is-drag'); drag = null; });
    list.addEventListener('dragover', function (e) {
      if (!drag) return; e.preventDefault();
      var over = e.target.closest('.lx-seq-i'); if (!over || over === drag) return;
      var r = over.getBoundingClientRect(); list.insertBefore(drag, e.clientY < r.top + r.height / 2 ? over : over.nextElementSibling); clear();
    });
    el.querySelector('[data-check]').addEventListener('click', function () {
      var right = 0;
      list.querySelectorAll('.lx-seq-i').forEach(function (li, j) { var ok = +li.dataset.k === j; if (ok) right++; li.classList.add(ok ? 'is-right' : 'is-wrong'); });
      el.classList.add('is-checked');
      var all = right === a.steps.length;
      msg(el, (all ? '<b>Exactly right.</b> ' : '<b>' + right + ' of ' + a.steps.length + ' in the right place.</b> ') + esc(a.why || ''), all);
    });
    el.querySelector('[data-reset]').addEventListener('click', function () { clear(); shuffle([].slice.call(list.children), Date.now() % 991).forEach(function (li) { list.appendChild(li); }); });
  }

  /* ---------------- choose ---------------- */
  function choose(el, a, i) {
    shell(el, a, i, '<div class="lx-pairs">' + a.pairs.map(function (p, k) {
      return '<div class="lx-pair" data-k="' + k + '"><p class="lx-pair-n">' + (k + 1) + ' of ' + a.pairs.length + '</p><div class="lx-pair-opts">' +
        '<button type="button" class="lx-pick" data-side="a"><span class="lx-pick-l">A</span><span>' + esc(p.a) + '</span></button>' +
        '<button type="button" class="lx-pick" data-side="b"><span class="lx-pick-l">B</span><span>' + esc(p.b) + '</span></button></div>' +
        '<p class="lx-pair-why"></p></div>';
    }).join('') + '</div>');
    var right = 0, done = 0;
    el.addEventListener('click', function (e) {
      var b = e.target.closest('.lx-pick'); if (!b) return;
      var pair = b.closest('.lx-pair'); if (pair.classList.contains('is-done')) return;
      var p = a.pairs[+pair.dataset.k], ok = b.dataset.side === p.better;
      pair.classList.add('is-done'); done++; if (ok) right++;
      pair.querySelectorAll('.lx-pick').forEach(function (x) { x.disabled = true; x.classList.add(x.dataset.side === p.better ? 'is-right' : (x === b ? 'is-wrong' : 'is-off')); });
      pair.querySelector('.lx-pair-why').innerHTML = '<b>' + (ok ? 'Yes. ' : 'Not this one. ') + '</b>' + esc(p.why);
      if (done === a.pairs.length) msg(el, '<b>' + right + ' of ' + a.pairs.length + '.</b> ' + (right === a.pairs.length ? 'A sharp eye.' : 'The reasons above are the part worth keeping.'), right === a.pairs.length);
    });
  }

  /* ---------------- matrix ---------------- */
  function matrix(el, a, i) {
    var t = a.tolerance, cells = '';
    for (var row = 5; row >= 1; row--) for (var col = 1; col <= 5; col++) {
      var s = row * col;
      cells += '<span class="lx-cell' + (s > t ? ' is-over' : '') + '" style="--s:' + (s / 25).toFixed(2) + '" data-l="' + row + '" data-i="' + col + '">' + s + '</span>';
    }
    shell(el, a, i,
      '<p class="lx-mx-scn">' + esc(a.scenario) + '</p>' +
      '<div class="lx-mx">' +
        '<div class="lx-mx-grid-wrap"><span class="lx-mx-y">Likelihood →</span><div class="lx-mx-grid">' + cells +
          '<span class="lx-mx-dot is-in" aria-hidden="true">I</span><span class="lx-mx-dot is-res" aria-hidden="true">R</span></div><span class="lx-mx-x">Impact →</span></div>' +
        '<div class="lx-mx-side">' +
          '<p class="lx-mx-h">Switch controls on</p>' +
          a.controls.map(function (c, k) {
            var eff = [c.dl ? 'likelihood ' + c.dl : '', c.di ? 'impact ' + c.di : ''].filter(Boolean).join(', ');
            return '<label class="lx-ctl"><input type="checkbox" data-k="' + k + '" /><span>' + esc(c.label) + '<small>' + esc(eff || 'no change to the score') + '</small></span></label>';
          }).join('') +
          '<div class="lx-mx-read"><div><small>Inherent</small><b data-inh></b></div><div><small>Residual</small><b data-res></b></div><div><small>Tolerance</small><b>' + t + '</b></div></div>' +
          '<p class="lx-mx-verdict" aria-live="polite"></p>' +
        '</div>' +
      '</div>' + (a.why ? '<p class="lx-mx-why">' + esc(a.why) + '</p>' : ''));
    var grid = el.querySelector('.lx-mx-grid'), dIn = el.querySelector('.is-in'), dRes = el.querySelector('.is-res');
    function put(dot, l, im, off) { dot.style.left = ((im - 0.5) / 5 * 100) + '%'; dot.style.top = ((5 - l + 0.5) / 5 * 100) + '%'; dot.style.setProperty('--off', off + 'px'); }
    function update() {
      var l = a.inherent.l, im = a.inherent.i;
      el.querySelectorAll('.lx-ctl input').forEach(function (cb) { if (cb.checked) { var c = a.controls[+cb.dataset.k]; l += c.dl || 0; im += c.di || 0; } });
      l = Math.max(1, Math.min(5, l)); im = Math.max(1, Math.min(5, im));
      var s0 = a.inherent.l * a.inherent.i, s = l * im, same = l === a.inherent.l && im === a.inherent.i;
      put(dIn, a.inherent.l, a.inherent.i, same ? -9 : 0); put(dRes, l, im, same ? 9 : 0);
      el.querySelector('[data-inh]').textContent = s0 + ' (' + a.inherent.l + ' × ' + a.inherent.i + ')';
      el.querySelector('[data-res]').textContent = s + ' (' + l + ' × ' + im + ')';
      el.querySelectorAll('.lx-cell').forEach(function (c) { c.classList.toggle('is-here', +c.dataset.l === l && +c.dataset.i === im); });
      var v = el.querySelector('.lx-mx-verdict');
      if (s <= t) { v.className = 'lx-mx-verdict is-ok'; v.innerHTML = '<b>Within tolerance.</b> The risk owner can accept the residual risk and keep monitoring it.'; }
      else { v.className = 'lx-mx-verdict is-no'; v.innerHTML = '<b>Above tolerance by ' + (s - t) + '.</b> Treat it further, or someone with authority must decide to accept it, in writing and with a review date.'; }
    }
    el.addEventListener('change', update);
    update();
  }

  var R = { sort: sort, sequence: sequence, choose: choose, matrix: matrix };
  document.querySelectorAll('.lx-act[data-act]').forEach(function (el) {
    var i = +el.getAttribute('data-act'), a = acts[i];
    if (a && R[a.type]) { try { R[a.type](el, a, i); } catch (e) { el.hidden = true; } }
  });
})();
