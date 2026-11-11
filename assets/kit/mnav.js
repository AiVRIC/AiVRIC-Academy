/* The provider page's nav. A click opens a menu (hover does nothing); it stays open until
   a click outside the bar or Escape. Clicking the open menu's own trigger closes it; clicking another
   swaps the sheet's contents in place, and the sheet's height eases to fit. On phones the burger opens a
   full-screen sheet; a menu slides in its panel, "‹ Menu" goes back. */
(function () {
  var nav = document.querySelector('[data-mnav]');
  if (!nav) return;
  var panel = nav.querySelector('.mnav-panel');
  var triggers = Array.prototype.slice.call(nav.querySelectorAll('[data-mnav-trigger]'));
  var views = Array.prototype.slice.call(nav.querySelectorAll('[data-mnav-view]'));
  var open = null;

  function fit() {
    if (!open) { panel.style.height = '0px'; return; }
    var v = views.filter(function (x) { return !x.hidden; })[0];
    panel.style.height = (v ? v.offsetHeight : 0) + 'px';
  }
  function setOpen(key) {
    open = key || null;
    triggers.forEach(function (t) { t.setAttribute('aria-expanded', String(t.getAttribute('data-mnav-trigger') === open)); });
    views.forEach(function (v) { v.hidden = v.getAttribute('data-mnav-view') !== open; });
    nav.classList.toggle('is-open', !!open);
    panel.setAttribute('aria-hidden', String(!open));
    fit();
  }
  triggers.forEach(function (t) {
    t.addEventListener('click', function () {
      var key = t.getAttribute('data-mnav-trigger');
      setOpen(open === key ? null : key);
    });
  });
  document.addEventListener('click', function (e) { if (open && !nav.contains(e.target)) setOpen(null); });
  addEventListener('resize', function () { if (innerWidth < 1024 && open) setOpen(null); else fit(); });

  // phones
  var sheet = document.getElementById('mnav-sheet');
  var burger = nav.querySelector('.mnav-burger');
  var back = sheet && sheet.querySelector('.mnav-back');
  var brand = sheet && sheet.querySelector('.mnav-sheet-brand');
  var list = sheet && sheet.querySelector('.mnav-sheet-list');
  var subs = sheet ? Array.prototype.slice.call(sheet.querySelectorAll('[data-mnav-subview]')) : [];
  var body = sheet && sheet.querySelector('.mnav-sheet-body');

  function showSub(key) {
    subs.forEach(function (s) { s.hidden = s.getAttribute('data-mnav-subview') !== key; });
    list.hidden = !!key;
    back.hidden = !key;
    brand.hidden = !!key;
    body.scrollTop = 0;
  }
  function setSheet(on) {
    if (!sheet) return;
    sheet.classList.toggle('is-open', on);
    sheet.setAttribute('aria-hidden', String(!on));
    burger.setAttribute('aria-expanded', String(on));
    document.body.classList.toggle('mnav-locked', on);
    if (on) { showSub(null); var c = sheet.querySelector('.mnav-close'); if (c) c.focus({ preventScroll: true }); }
    else burger.focus({ preventScroll: true });
  }
  if (sheet && burger) {
    burger.addEventListener('click', function () { setSheet(true); });
    sheet.querySelector('.mnav-close').addEventListener('click', function () { setSheet(false); });
    back.addEventListener('click', function () { showSub(null); });
    Array.prototype.forEach.call(sheet.querySelectorAll('[data-mnav-sub]'), function (b) {
      b.addEventListener('click', function () { showSub(b.getAttribute('data-mnav-sub')); });
    });
    addEventListener('resize', function () { if (innerWidth >= 1024 && sheet.classList.contains('is-open')) setSheet(false); });
  }

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (sheet && sheet.classList.contains('is-open')) { setSheet(false); return; }
    if (open) {
      var t = triggers.filter(function (x) { return x.getAttribute('data-mnav-trigger') === open; })[0];
      setOpen(null);
      if (t) t.focus();
    }
  });
})();
