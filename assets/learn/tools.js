/* AiVRIC Learning: the learner's tools on every lesson.
   - Listen: the lesson's TLDR read aloud in the browser's most natural voice. As each part is spoken the page scrolls to
     the section it summarizes and lights it, with the words on screen. Pause, skip, speed. No voice? It plays as timed captions.
   - Notebook: select any text to save it, save any figure or product screen, write your own notes. Grouped by lesson,
     each entry links back to where it came from; export as Markdown. Kept in this browser (localStorage
     "aivric.notebook.v1") until learner accounts arrive, when it moves to the profile.
   - Key terms: every term from the lesson's Key terms list is defined where it appears (hover, focus or tap).
   - Flashcards: the lesson's key terms as a deck: flip, then mark it known or keep it in the deck.
   The notebook drawer also works on course and school pages, so saved notes are always one click away. */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };
  var data = {};
  try { var d = document.getElementById('lx-data'); if (d) data = JSON.parse(d.textContent); } catch (e) {}
  var ROOT = (document.querySelector('script[src$="assets/learn/tools.js"]') || {}).getAttribute ? document.querySelector('script[src$="assets/learn/tools.js"]').getAttribute('src').replace(/assets\/learn\/tools\.js$/, '') : '';
  var page = $('.sx-page');
  if (!page) return;

  /* ================================ notebook store ================================ */
  var NB = 'aivric.notebook.v1', notes = [];
  try { notes = JSON.parse(localStorage.getItem(NB)) || []; } catch (e) {}
  function saveNotes() { try { localStorage.setItem(NB, JSON.stringify(notes)); } catch (e) {} paintCount(); }
  function addNote(n) {
    n.id = 'n' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    n.t = Date.now(); n.course = data.course || ''; n.lesson = data.lesson || ''; n.lessonTitle = data.title || document.title.split(' — ')[0];
    n.url = location.pathname + (n.section ? '#' + n.section : '');
    notes.unshift(n); saveNotes(); return n;
  }
  function paintCount() { $$('[data-nb-count]').forEach(function (b) { b.textContent = notes.length ? notes.length : ''; }); }
  function sectionOf(node) { var s = node && (node.nodeType === 1 ? node : node.parentElement); s = s && s.closest('.lx-sec, .lx-fig, .lx-bridge, .lx-check, .lx-act'); var sec = s && (s.closest('.lx-sec') || s); return sec && sec.id ? sec.id : (s && s.closest('.lx-sec') ? s.closest('.lx-sec').id : ''); }
  function toast(t) {
    var el = $('.lx-toast') || document.body.appendChild(Object.assign(document.createElement('div'), { className: 'lx-toast', role: 'status' }));
    el.textContent = t; el.classList.add('is-on'); clearTimeout(el._t); el._t = setTimeout(function () { el.classList.remove('is-on'); }, 2200);
  }

  /* ================================ the drawer ================================ */
  var drawer = document.createElement('aside');
  drawer.className = 'lx-nb'; drawer.setAttribute('aria-label', 'Your notebook'); drawer.hidden = true;
  drawer.innerHTML = '<div class="lx-nb-head"><div><p class="lx-nb-k">Your notebook</p><p class="lx-nb-sub">Saved in this browser. Moves to your profile when learner accounts open.</p></div>' +
    '<button type="button" class="lx-x" data-nb-close aria-label="Close the notebook">×</button></div>' +
    '<div class="lx-nb-new"><textarea rows="3" placeholder="Write a note about this lesson…" aria-label="New note"></textarea><button type="button" class="sx-btn sx-btn-primary" data-nb-add>Add note</button></div>' +
    '<div class="lx-nb-list" aria-live="polite"></div>' +
    '<div class="lx-nb-foot"><button type="button" class="sx-btn sx-btn-ghost" data-nb-export>Export as Markdown</button><button type="button" class="lx-linkbtn" data-nb-clear>Clear the notebook</button></div>';
  document.body.appendChild(drawer);
  var scrim = document.body.appendChild(Object.assign(document.createElement('div'), { className: 'lx-scrim', hidden: true }));
  function openNb() { drawer.hidden = false; scrim.hidden = false; requestAnimationFrame(function () { drawer.classList.add('is-open'); scrim.classList.add('is-on'); }); renderNb(); setTimeout(function () { $('textarea', drawer).focus(); }, 250); }
  function closeNb() { drawer.classList.remove('is-open'); scrim.classList.remove('is-on'); setTimeout(function () { drawer.hidden = true; scrim.hidden = true; }, 260); }
  function renderNb() {
    var list = $('.lx-nb-list', drawer);
    if (!notes.length) { list.innerHTML = '<p class="lx-nb-empty">Nothing saved yet. Select any text in a lesson and choose <b>Save to notebook</b>, or use <b>Save</b> on a figure.</p>'; return; }
    var groups = {}, order = [];
    notes.forEach(function (n) { var k = n.lessonTitle || 'Notes'; if (!groups[k]) { groups[k] = []; order.push(k); } groups[k].push(n); });
    list.innerHTML = order.map(function (k) {
      return '<section class="lx-nb-g"><h3>' + esc(k) + '</h3>' + groups[k].map(function (n) {
        var body = n.kind === 'figure'
          ? (n.svg ? '<div class="lx-nb-fig">' + n.svg + '</div>' : n.src ? '<img class="lx-nb-img" src="' + esc(n.src) + '" alt="' + esc(n.text) + '" loading="lazy" />' : '') + '<p class="lx-nb-cap">' + esc(n.text) + '</p>'
          : n.kind === 'quote' ? '<blockquote>' + esc(n.text) + '</blockquote>' : '';
        return '<article class="lx-nb-i" data-id="' + n.id + '">' + body +
          '<textarea rows="' + (n.kind === 'note' ? 3 : 2) + '" placeholder="Add your thoughts…" aria-label="Your note">' + esc(n.note || '') + '</textarea>' +
          '<p class="lx-nb-meta"><a href="' + esc(n.url) + '">Go to source</a><span>' + new Date(n.t).toLocaleDateString() + '</span><button type="button" class="lx-linkbtn" data-nb-del>Delete</button></p></article>';
      }).join('') + '</section>';
    }).join('');
  }
  drawer.addEventListener('input', function (e) {
    var it = e.target.closest('.lx-nb-i'); if (!it || e.target.tagName !== 'TEXTAREA') return;
    var n = notes.filter(function (x) { return x.id === it.dataset.id; })[0]; if (n) { n.note = e.target.value; clearTimeout(drawer._t); drawer._t = setTimeout(saveNotes, 400); }
  });
  drawer.addEventListener('click', function (e) {
    if (e.target.closest('[data-nb-close]')) return closeNb();
    if (e.target.closest('[data-nb-add]')) { var ta = $('.lx-nb-new textarea', drawer); if (!ta.value.trim()) return ta.focus(); addNote({ kind: 'note', text: '', note: ta.value.trim(), section: '' }); ta.value = ''; renderNb(); return; }
    if (e.target.closest('[data-nb-del]')) { var id = e.target.closest('.lx-nb-i').dataset.id; notes = notes.filter(function (x) { return x.id !== id; }); saveNotes(); renderNb(); return; }
    if (e.target.closest('[data-nb-clear]')) { if (confirm('Delete every note in your notebook on this browser?')) { notes = []; saveNotes(); renderNb(); } return; }
    if (e.target.closest('[data-nb-export]')) {
      var md = '# My AiVRIC Learning notebook\n\nExported ' + new Date().toLocaleString() + '\n';
      var g = {}; notes.slice().reverse().forEach(function (n) { (g[n.lessonTitle || 'Notes'] = g[n.lessonTitle || 'Notes'] || []).push(n); });
      Object.keys(g).forEach(function (k) {
        md += '\n## ' + k + '\n';
        g[k].forEach(function (n) {
          var src = location.origin + n.url;
          if (n.kind === 'quote') md += '\n> ' + n.text.replace(/\n/g, '\n> ') + '\n';
          if (n.kind === 'figure') md += '\n**Figure:** ' + n.text + (n.src ? '\n\n![' + n.text + '](' + new URL(n.src, location.href).href + ')' : '') + '\n';
          if (n.note) md += '\n' + n.note + '\n';
          md += '\n[Source](' + src + ')\n';
        });
      });
      var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([md], { type: 'text/markdown' })); a.download = 'aivric-learning-notebook.md'; a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    }
  });
  scrim.addEventListener('click', function () { closeNb(); closeFlash(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { if (!drawer.hidden) closeNb(); closeFlash(); hideSel(); } });

  /* ================================ select to save ================================ */
  var art = $('.lx-article');
  var pop = document.body.appendChild(Object.assign(document.createElement('div'), { className: 'lx-selpop', hidden: true }));
  pop.innerHTML = '<button type="button" data-sel-save>Save to notebook</button><button type="button" data-sel-listen>Read aloud</button>';
  var selText = '', selSec = '';
  function hideSel() { pop.hidden = true; }
  function onSel() {
    var s = window.getSelection(); if (!s || s.isCollapsed || !art) return hideSel();
    var t = s.toString().trim(); if (t.length < 3 || !art.contains(s.anchorNode)) return hideSel();
    var r = s.getRangeAt(0).getBoundingClientRect(); if (!r.width) return hideSel();
    selText = t.slice(0, 2000); selSec = sectionOf(s.anchorNode);
    pop.hidden = false;
    var x = Math.max(12, Math.min(innerWidth - pop.offsetWidth - 12, r.left + r.width / 2 - pop.offsetWidth / 2));
    var y = r.top - pop.offsetHeight - 10; if (y < 70) y = r.bottom + 10;
    pop.style.left = x + 'px'; pop.style.top = (y + scrollY) + 'px';
  }
  if (art) {
    document.addEventListener('mouseup', function (e) { if (!pop.contains(e.target)) setTimeout(onSel, 10); });
    document.addEventListener('keyup', function (e) { if (e.shiftKey) onSel(); });
    document.addEventListener('selectionchange', function () { var s = window.getSelection(); if (!s || s.isCollapsed) setTimeout(function () { if (window.getSelection().isCollapsed) hideSel(); }, 150); });
    pop.addEventListener('mousedown', function (e) { e.preventDefault(); });
    pop.addEventListener('click', function (e) {
      if (e.target.closest('[data-sel-save]')) { addNote({ kind: 'quote', text: selText, section: selSec }); toast('Saved to your notebook'); window.getSelection().removeAllRanges(); hideSel(); }
      if (e.target.closest('[data-sel-listen]')) { speakOnce(selText); hideSel(); }
    });
  }

  /* ================================ save a figure ================================ */
  $$('.lx-fig, .lx-bridge figure').forEach(function (f) {
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'lx-figsave'; b.innerHTML = '<span aria-hidden="true">＋</span> Save';
    b.setAttribute('aria-label', 'Save this figure to your notebook');
    f.style.position = 'relative'; f.appendChild(b);
    b.addEventListener('click', function () {
      var svg = $('svg', f), img = $('img', f), cap = ($('figcaption', f) || {}).textContent || (img && img.alt) || 'Figure';
      var copy = svg ? svg.outerHTML.replace(/\sid="([^"]+)"/g, ' id="nb-$1"').replace(/url\(#/g, 'url(#nb-').replace(/aria-labelledby="[^"]*"/g, '') : '';
      addNote({ kind: 'figure', text: cap.trim(), svg: copy, src: img ? img.getAttribute('src') : '', section: sectionOf(f) });
      b.innerHTML = '<span aria-hidden="true">✓</span> Saved'; toast('Figure saved to your notebook');
      setTimeout(function () { b.innerHTML = '<span aria-hidden="true">＋</span> Save'; }, 2000);
    });
  });

  /* ================================ key terms, where they appear ================================ */
  var terms = $$('.lx-terms div').map(function (row) { return { t: ($('dt', row) || {}).textContent || '', d: ($('dd', row) || {}).textContent || '' }; }).filter(function (x) { return x.t && x.d; });
  if (art && terms.length) {
    var done = {};
    var walker = document.createTreeWalker(art, NodeFilter.SHOW_TEXT, { acceptNode: function (n) {
      var p = n.parentElement; if (!p || p.closest('h1, h2, h3, .lx-terms, .lx-check, .lx-act, figure, button, a, .lx-gloss, .lx-tools, .lx-objectives, .lx-article-head')) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT; } });
    var nodes = []; while (walker.nextNode()) nodes.push(walker.currentNode);
    terms.sort(function (a, b) { return b.t.length - a.t.length; }).forEach(function (term) {
      var re = new RegExp('\\b(' + term.t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')(s?)\\b', 'i');
      for (var k = 0; k < nodes.length && (done[term.t] || 0) < 2; k++) {
        var n = nodes[k]; if (!n.parentNode) continue;
        var m = n.nodeValue.match(re); if (!m) continue;
        var after = n.splitText(m.index); after.splitText(m[0].length);
        var span = document.createElement('span'); span.className = 'lx-gloss'; span.tabIndex = 0;
        span.setAttribute('data-def', term.d); span.setAttribute('aria-label', m[0] + ': ' + term.d);
        span.textContent = after.nodeValue; after.parentNode.replaceChild(span, after);
        nodes.splice(k + 1, 0, span.nextSibling); done[term.t] = (done[term.t] || 0) + 1;
      }
    });
    var tip = document.body.appendChild(Object.assign(document.createElement('div'), { className: 'lx-tip', role: 'tooltip', hidden: true }));
    function showTip(el) { tip.innerHTML = '<b>' + esc(el.textContent) + '</b>' + esc(el.getAttribute('data-def')); tip.hidden = false; var r = el.getBoundingClientRect(); var x = Math.max(12, Math.min(innerWidth - 332, r.left)); tip.style.left = x + 'px'; tip.style.top = (r.bottom + scrollY + 8) + 'px'; }
    art.addEventListener('mouseover', function (e) { var g = e.target.closest('.lx-gloss'); if (g) showTip(g); });
    art.addEventListener('mouseout', function (e) { if (e.target.closest('.lx-gloss')) tip.hidden = true; });
    art.addEventListener('focusin', function (e) { var g = e.target.closest('.lx-gloss'); if (g) showTip(g); });
    art.addEventListener('focusout', function (e) { if (e.target.closest('.lx-gloss')) tip.hidden = true; });
    art.addEventListener('click', function (e) { var g = e.target.closest('.lx-gloss'); if (g) { tip.hidden ? showTip(g) : (tip.hidden = true); } });
  }

  /* ================================ flashcards ================================ */
  var flash = null;
  function openFlash() {
    if (!terms.length) return;
    var deck = terms.slice().sort(function () { return Math.random() - 0.5; }), known = 0, total = deck.length;
    flash = document.body.appendChild(Object.assign(document.createElement('div'), { className: 'lx-flash', role: 'dialog' }));
    flash.setAttribute('aria-label', 'Flashcards'); flash.setAttribute('aria-modal', 'true');
    scrim.hidden = false; requestAnimationFrame(function () { scrim.classList.add('is-on'); });
    function card() {
      if (!deck.length) {
        flash.innerHTML = '<div class="lx-flash-done"><p class="lx-nb-k">Deck complete</p><h3>All ' + total + ' terms known.</h3><p>Come back tomorrow and run the deck again: spacing it out is what makes it stick.</p><div class="lx-act-foot"><button type="button" class="sx-btn sx-btn-primary" data-again>Run it again</button><button type="button" class="sx-btn sx-btn-ghost" data-close>Close</button></div></div>';
        return;
      }
      var c = deck[0];
      flash.innerHTML = '<div class="lx-flash-top"><p class="lx-nb-k">Flashcards · ' + (total - deck.length + 1 > total ? total : known + 1) + ' of ' + total + '</p><button type="button" class="lx-x" data-close aria-label="Close flashcards">×</button></div>' +
        '<button type="button" class="lx-card" data-flip aria-label="Flip the card"><span class="lx-card-in"><span class="lx-card-f"><small>Term</small><b>' + esc(c.t) + '</b><em>Tap to see the definition</em></span><span class="lx-card-b"><small>' + esc(c.t) + '</small><span>' + esc(c.d) + '</span></span></span></button>' +
        '<div class="lx-flash-btns"><button type="button" class="sx-btn sx-btn-ghost" data-again1>Keep it in the deck</button><button type="button" class="sx-btn sx-btn-primary" data-know>I know this</button></div>' +
        '<div class="lx-flash-bar"><span style="width:' + Math.round(100 * known / total) + '%"></span></div>';
      $('[data-flip]', flash).focus();
    }
    flash.addEventListener('click', function (e) {
      if (e.target.closest('[data-close]')) return closeFlash();
      if (e.target.closest('[data-flip]')) return $('.lx-card', flash).classList.toggle('is-flipped');
      if (e.target.closest('[data-know]')) { deck.shift(); known++; return card(); }
      if (e.target.closest('[data-again1]')) { deck.push(deck.shift()); return card(); }
      if (e.target.closest('[data-again]')) { deck = terms.slice().sort(function () { return Math.random() - 0.5; }); known = 0; return card(); }
    });
    card();
  }
  function closeFlash() { if (!flash) return; flash.remove(); flash = null; if (drawer.hidden) { scrim.classList.remove('is-on'); setTimeout(function () { scrim.hidden = true; }, 250); } }

  /* ================================ listen: the TLDR ================================ */
  var tldr = data.tldr || [], synth = window.speechSynthesis, voice = null, rate = 1;
  function pickVoice() {
    if (!synth) return null;
    var vs = synth.getVoices().filter(function (v) { return /^en(-|_)/i.test(v.lang); });
    var score = function (v) { var n = v.name; return (/natural|neural/i.test(n) ? 50 : 0) + (/online/i.test(n) ? 10 : 0) + (/google/i.test(n) ? 20 : 0) + (/aria|jenny|guy|samantha|ava|emma|andrew|brian/i.test(n) ? 8 : 0) + (/en-US/i.test(v.lang) ? 5 : 0) + (v.localService ? 0 : 2); };
    vs.sort(function (a, b) { return score(b) - score(a); });
    return vs[0] || null;
  }
  if (synth) { voice = pickVoice(); if (synth.onvoiceschanged !== undefined) synth.onvoiceschanged = function () { voice = pickVoice(); }; }
  function utter(text, onend) {
    var u = new SpeechSynthesisUtterance(text); if (voice) u.voice = voice; u.rate = rate; u.pitch = 1; u.lang = voice ? voice.lang : 'en-US';
    u.onend = onend; u.onerror = function (e) { if (e.error !== 'interrupted' && e.error !== 'canceled') onend && onend(); };
    return u;
  }
  function speakOnce(text) { if (!synth) return toast('Your browser has no speech voice'); synth.cancel(); synth.speak(utter(text)); }

  var player = null, idx = 0, playing = false, timer = null;
  function words(t) { return t.split(/\s+/).length; }
  function buildPlayer() {
    player = document.body.appendChild(Object.assign(document.createElement('div'), { className: 'lx-tldr', role: 'region' }));
    player.setAttribute('aria-label', 'Lesson TLDR player');
    player.innerHTML = '<div class="lx-tldr-top"><p class="lx-nb-k"><span class="lx-eq" aria-hidden="true"><i></i><i></i><i></i></span>TLDR · <span data-pos></span></p>' +
      '<div class="lx-tldr-ctl"><button type="button" data-prev aria-label="Previous part">⏮</button><button type="button" data-play aria-label="Pause">❚❚</button><button type="button" data-next aria-label="Next part">⏭</button>' +
      '<button type="button" data-rate aria-label="Speed">1×</button><button type="button" class="lx-x" data-stop aria-label="Close the player">×</button></div></div>' +
      '<p class="lx-tldr-cap" aria-live="polite"></p><div class="lx-tldr-dots">' + tldr.map(function (s, k) { return '<button type="button" data-go="' + k + '" aria-label="Part ' + (k + 1) + '"></button>'; }).join('') + '</div>' +
      (synth ? '' : '<p class="lx-tldr-note">No speech voice in this browser, so the TLDR plays as captions.</p>');
    player.addEventListener('click', function (e) {
      if (e.target.closest('[data-play]')) return playing ? pause() : resume();
      if (e.target.closest('[data-next]')) return go(idx + 1);
      if (e.target.closest('[data-prev]')) return go(idx - 1);
      if (e.target.closest('[data-stop]')) return stop();
      var g = e.target.closest('[data-go]'); if (g) return go(+g.dataset.go);
      if (e.target.closest('[data-rate]')) { rate = rate === 1 ? 1.2 : rate === 1.2 ? 0.9 : 1; e.target.closest('[data-rate]').textContent = rate + '×'; go(idx); }
    });
  }
  function light(k) {
    $$('.lx-sec.is-speaking, .lx-check.is-speaking').forEach(function (s) { s.classList.remove('is-speaking'); });
    var seg = tldr[k], sec = seg && document.getElementById(seg.section);
    if (sec) { sec.classList.add('is-speaking'); sec.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' }); }
    $('[data-pos]', player).textContent = 'part ' + (k + 1) + ' of ' + tldr.length;
    $('.lx-tldr-cap', player).textContent = seg ? seg.text : '';
    $$('[data-go]', player).forEach(function (b, j) { b.classList.toggle('is-on', j === k); b.classList.toggle('is-done', j < k); });
  }
  function go(k) {
    clearTimeout(timer); if (synth) synth.cancel();
    if (k < 0) k = 0;
    if (k >= tldr.length) { finish(); return; }
    idx = k; playing = true; player.classList.add('is-playing'); $('[data-play]', player).textContent = '❚❚'; $('[data-play]', player).setAttribute('aria-label', 'Pause');
    light(k);
    var seg = tldr[k], captions = function () { timer = setTimeout(function () { if (playing && idx === k) go(k + 1); }, Math.max(3500, words(seg.text) * 380 / rate)); };
    if (!synth) return captions();
    // a browser can expose speech and never speak (no voices installed): if nothing starts in 1.5 s, run this part as captions
    var started = false, u = utter(seg.say || seg.text, function () { if (playing && idx === k) timer = setTimeout(function () { go(k + 1); }, 350); });
    u.onstart = function () { started = true; };
    synth.speak(u);
    setTimeout(function () { if (!started && playing && idx === k) { synth.cancel(); captions(); } }, 1500);
  }
  function pause() { playing = false; player.classList.remove('is-playing'); clearTimeout(timer); if (synth) synth.pause(); $('[data-play]', player).textContent = '▶'; $('[data-play]', player).setAttribute('aria-label', 'Play'); }
  function resume() { if (synth && synth.paused && synth.speaking) { synth.resume(); playing = true; player.classList.add('is-playing'); $('[data-play]', player).textContent = '❚❚'; } else go(idx); }
  function finish() { playing = false; player.classList.remove('is-playing'); $$('.is-speaking').forEach(function (s) { s.classList.remove('is-speaking'); }); $('.lx-tldr-cap', player).textContent = 'That was the TLDR. The full lesson is right here, and the knowledge check is at the end.'; $('[data-play]', player).textContent = '↻'; idx = 0; }
  function stop() { clearTimeout(timer); if (synth) synth.cancel(); playing = false; $$('.is-speaking').forEach(function (s) { s.classList.remove('is-speaking'); }); if (player) { player.remove(); player = null; } }
  addEventListener('beforeunload', function () { if (synth) synth.cancel(); });

  /* ================================ the toolbar ================================ */
  $$('[data-tool]').forEach(function (b) {
    var k = b.getAttribute('data-tool');
    if (k === 'listen' && !tldr.length) { b.hidden = true; return; }
    if (k === 'flash' && !terms.length) { b.hidden = true; return; }
    b.addEventListener('click', function () {
      if (k === 'listen') { if (!player) buildPlayer(); go(0); }
      if (k === 'notebook') openNb();
      if (k === 'flash') openFlash();
    });
  });
  paintCount();
  window.AiVRICLearn = { addNote: addNote, openNotebook: openNb };
})();
