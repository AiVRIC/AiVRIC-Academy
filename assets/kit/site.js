/* The editorial pages (Solutions portal, Trust Center): reveals, the pointer light on cards, tabs, the spine fill,
   and the hero scenes on <canvas data-scene>: "orbit" (the two apps with the capabilities circling between them)
   and "chain" (linked, hashed evidence blocks drifting on a floor). Reduced motion gets one still frame. */
(function () {
  'use strict';
  var root = document.querySelector('.sx-page');
  if (!root) return;
  document.documentElement.classList.add('sx-js');
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- reveals ---------------------------------------------------------------------------- */
  var io = 'IntersectionObserver' in window ? new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 }) : null;
  [].slice.call(root.querySelectorAll('[data-reveal], .sx-spine')).forEach(function (el) {
    if (io && !reduce) io.observe(el); else el.classList.add('is-in');
  });

  /* ---- the pointer light on cards ------------------------------------------------------------ */
  root.addEventListener('pointermove', function (e) {
    var c = e.target.closest && e.target.closest('.sx-card');
    if (!c) return;
    var r = c.getBoundingClientRect();
    c.style.setProperty('--mx', (e.clientX - r.left) + 'px');
    c.style.setProperty('--my', (e.clientY - r.top) + 'px');
  });

  /* ---- tabs: [role=tablist] with an ink that slides under the selected tab --------------------------- */
  window.SX = window.SX || {};
  SX.tabs = function (list, onPick) {
    var tabs = [].slice.call(list.querySelectorAll('[role="tab"]'));
    var ink = document.createElement('span'); ink.className = 'sx-tab-ink'; ink.setAttribute('aria-hidden', 'true'); list.prepend(ink);
    function place(t) { ink.style.width = t.offsetWidth + 'px'; ink.style.transform = 'translate(' + (t.offsetLeft - 5) + 'px,' + (t.offsetTop - 5) + 'px)'; }
    function pick(t, focus) {
      tabs.forEach(function (x) { var on = x === t; x.setAttribute('aria-selected', String(on)); x.tabIndex = on ? 0 : -1; });
      place(t); if (focus) t.focus(); onPick(t.getAttribute('data-key'), t);
    }
    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { pick(t); });
      t.addEventListener('keydown', function (e) {
        var k = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
        if (k) { e.preventDefault(); pick(tabs[(i + k + tabs.length) % tabs.length], true); }
        if (e.key === 'Home') { e.preventDefault(); pick(tabs[0], true); }
        if (e.key === 'End') { e.preventDefault(); pick(tabs[tabs.length - 1], true); }
      });
    });
    var first = tabs.filter(function (t) { return t.getAttribute('aria-selected') === 'true'; })[0] || tabs[0];
    pick(first);
    addEventListener('resize', function () { place(tabs.filter(function (t) { return t.getAttribute('aria-selected') === 'true'; })[0]); });
    return { pick: function (key) { var t = tabs.filter(function (x) { return x.getAttribute('data-key') === key; })[0]; if (t) pick(t); } };
  };

  /* ---- a hash target (#cloudsignals) lights its card --------------------------------------------- */
  function target() {
    [].slice.call(root.querySelectorAll('.is-target')).forEach(function (x) { x.classList.remove('is-target'); });
    var id = location.hash.slice(1); if (!id) return;
    var el = document.getElementById(id);
    if (el && el.classList.contains('sx-cap')) el.classList.add('is-target');
  }
  addEventListener('hashchange', target); target();

  /* ---- hero scenes ------------------------------------------------------------------------------------ */
  [].slice.call(root.querySelectorAll('canvas[data-scene]')).forEach(function (cv) {
    var kind = cv.getAttribute('data-scene');
    var ctx = cv.getContext('2d'); if (!ctx) return;
    var W = 0, H = 0, dpr = 1, t0 = performance.now(), running = false, raf = 0;
    var px = 0, py = 0, tx = 0, ty = 0;     // pointer parallax, eased
    var scene = kind === 'orbit' ? orbit() : kind === 'rise' ? rise() : kind === 'hub' ? hub() : kind === 'flow' ? flow() : chain();
    function size() {
      var r = cv.getBoundingClientRect(); dpr = Math.min(2, window.devicePixelRatio || 1);
      W = Math.max(1, r.width); H = Math.max(1, r.height);
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (scene.resize) scene.resize();
      if (!running) frame(performance.now());
    }
    function frame(now) {
      px += (tx - px) * 0.05; py += (ty - py) * 0.05;
      ctx.clearRect(0, 0, W, H);
      scene.draw((now - t0) / 1000, px, py);
      if (running) raf = requestAnimationFrame(frame);
    }
    function start() { if (reduce || running) return; running = true; raf = requestAnimationFrame(frame); }
    function stop() { running = false; cancelAnimationFrame(raf); }
    var host = cv.parentElement;
    host.addEventListener('pointermove', function (e) { var r = host.getBoundingClientRect(); tx = (e.clientX - r.left) / r.width - 0.5; ty = (e.clientY - r.top) / r.height - 0.5; });
    host.addEventListener('pointerleave', function () { tx = 0; ty = 0; });
    if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { es[0].isIntersecting ? start() : stop(); }).observe(cv);
    else start();
    document.addEventListener('visibilitychange', function () { document.hidden ? stop() : start(); });
    if (window.ResizeObserver) new ResizeObserver(size).observe(cv); else addEventListener('resize', size);
    size();

    /* the two apps, the capabilities circling between them, data flowing along the links */
    function orbit() {
      var apps = [{ name: 'AiVRIC Enterprise Vision', sub: 'for your company', x: 0.2 }, { name: 'Client Vision', sub: 'for your clients', x: 0.8 }];
      var caps = JSON.parse(cv.getAttribute('data-caps') || '[]');   // [{name, now}]
      var stars = [], motes = [];
      for (var i = 0; i < 90; i++) stars.push({ x: Math.random(), y: Math.random(), r: Math.random() * 1.1 + 0.2, p: Math.random() * 6.28 });
      for (var j = 0; j < 26; j++) motes.push({ c: j % caps.length, a: j % 2, u: Math.random(), s: 0.08 + Math.random() * 0.1 });
      function geo() {
        var narrow = W < 760;
        var cy = H * 0.46, cx = W / 2;
        return { cx: cx, cy: cy, rx: Math.min(W * (narrow ? 0.24 : 0.27), 400), ry: Math.min(H * 0.17, 58), ax: narrow ? 0.15 : 0.16, narrow: narrow };
      }
      return {
        draw: function (s, px, py) {
          var g = geo(), ox = px * 26, oy = py * 14;
          stars.forEach(function (st) {
            ctx.globalAlpha = 0.25 + 0.35 * Math.sin(s * 0.8 + st.p) * 0.5 + 0.2;
            ctx.fillStyle = '#9fd8ff'; ctx.beginPath(); ctx.arc(st.x * W + ox * 0.4, st.y * H + oy * 0.4, st.r, 0, 6.29); ctx.fill();
          });
          ctx.globalAlpha = 1;
          var A = apps.map(function (a, k) { var x = (k ? 1 - g.ax : g.ax) * W + ox; return { x: x, y: g.cy + oy, a: a }; });
          // the orbit
          ctx.strokeStyle = 'rgba(0,209,255,0.18)'; ctx.lineWidth = 1; ctx.setLineDash([2, 7]);
          ctx.beginPath(); ctx.ellipse(g.cx + ox, g.cy + oy, g.rx, g.ry, 0, 0, 6.29); ctx.stroke(); ctx.setLineDash([]);
          // capability positions
          var C = caps.map(function (c, k) {
            var ang = s * 0.12 + (k / caps.length) * 6.283;
            return { x: g.cx + ox + Math.cos(ang) * g.rx, y: g.cy + oy + Math.sin(ang) * g.ry, depth: (Math.sin(ang) + 1) / 2, c: c };
          });
          // links
          C.forEach(function (c) {
            A.forEach(function (a) {
              var grd = ctx.createLinearGradient(c.x, c.y, a.x, a.y);
              grd.addColorStop(0, 'rgba(0,209,255,' + (0.05 + 0.18 * c.depth) + ')'); grd.addColorStop(1, 'rgba(46,229,157,0.04)');
              ctx.strokeStyle = grd; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(c.x, c.y);
              ctx.quadraticCurveTo((c.x + a.x) / 2, Math.min(c.y, a.y) - 40, a.x, a.y); ctx.stroke();
            });
          });
          // motes: data flowing from a capability into an app
          motes.forEach(function (m) {
            m.u += m.s / 60; if (m.u > 1) { m.u = 0; m.c = (m.c + 1) % C.length; m.a = 1 - m.a; }
            var c = C[m.c], a = A[m.a]; if (!c) return;
            var u = m.u, mx = (c.x + a.x) / 2, my = Math.min(c.y, a.y) - 40;
            var x = (1 - u) * (1 - u) * c.x + 2 * (1 - u) * u * mx + u * u * a.x, y = (1 - u) * (1 - u) * c.y + 2 * (1 - u) * u * my + u * u * a.y;
            ctx.fillStyle = 'rgba(124,232,255,' + (0.9 * Math.sin(u * 3.14)) + ')';
            ctx.beginPath(); ctx.arc(x, y, 1.8, 0, 6.29); ctx.fill();
          });
          // the apps
          A.forEach(function (a) {
            var R = g.narrow ? 28 : 50;
            var halo = ctx.createRadialGradient(a.x, a.y, 0, a.x, a.y, R * 3.2);
            halo.addColorStop(0, 'rgba(0,209,255,0.28)'); halo.addColorStop(1, 'rgba(0,209,255,0)');
            ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(a.x, a.y, R * 3.2, 0, 6.29); ctx.fill();
            var core = ctx.createRadialGradient(a.x - R * 0.3, a.y - R * 0.3, 2, a.x, a.y, R);
            core.addColorStop(0, '#16345e'); core.addColorStop(1, '#071327');
            ctx.fillStyle = core; ctx.beginPath(); ctx.arc(a.x, a.y, R, 0, 6.29); ctx.fill();
            ctx.strokeStyle = 'rgba(124,232,255,0.75)'; ctx.lineWidth = 1.2; ctx.stroke();
            ctx.strokeStyle = 'rgba(124,232,255,0.25)'; ctx.beginPath(); ctx.arc(a.x, a.y, R + 9 + Math.sin(s * 1.4) * 2, 0, 6.29); ctx.stroke();
            ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.font = '600 ' + (g.narrow ? 12 : 15) + 'px Jost, Inter, sans-serif';
            ctx.fillText(a.a.name, a.x, a.y + R + 28);
            ctx.fillStyle = '#7f8a9d'; ctx.font = '500 ' + (g.narrow ? 10.5 : 12) + 'px Inter, sans-serif';
            ctx.fillText(a.a.sub.toUpperCase(), a.x, a.y + R + 46);
          });
          // the capabilities, back to front
          C.slice().sort(function (p, q) { return p.depth - q.depth; }).forEach(function (c) {
            var r = 5 + c.depth * 4, col = c.c.now ? '46,229,157' : '255,196,107';
            var gl = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, r * 5);
            gl.addColorStop(0, 'rgba(' + col + ',0.45)'); gl.addColorStop(1, 'rgba(' + col + ',0)');
            ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(c.x, c.y, r * 5, 0, 6.29); ctx.fill();
            ctx.fillStyle = 'rgb(' + col + ')'; ctx.beginPath(); ctx.arc(c.x, c.y, r * 0.7, 0, 6.29); ctx.fill();
            ctx.globalAlpha = 0.45 + c.depth * 0.55; ctx.textAlign = 'center'; ctx.fillStyle = '#e6edf7';
            ctx.font = '600 ' + (g.narrow ? 11 : 13) + 'px Inter, sans-serif'; ctx.fillText(c.c.name, c.x, c.y - r - 12);
            ctx.globalAlpha = 1;
          });
        }
      };
    }

    /* the platform's jobs as columns (sense, decide, act, show): signed events move left to right between the apps,
       and decisions write back to the system of record along the arc above */
    function flow() {
      var stages = JSON.parse(cv.getAttribute('data-stages') || '[]');   // [{n: 'Signal', apps: [...]}, …]
      var pulses = [], back = [];
      for (var i = 0; i < 28; i++) pulses.push({ seg: i % Math.max(1, stages.length - 1), u: Math.random(), s: 0.16 + Math.random() * 0.1, k: i });
      for (var j = 0; j < 6; j++) back.push({ u: j / 6, s: 0.07 });
      return {
        draw: function (s, px, py) {
          var narrow = W < 760, n = stages.length, pad = W * (narrow ? 0.1 : 0.12);
          var cols = stages.map(function (st, k) {
            var x = pad + (W - 2 * pad) * (n === 1 ? 0.5 : k / (n - 1)) + px * 22, ys = [];
            var gap = narrow ? 30 : 40, top = H * 0.58 - (st.apps.length - 1) * gap / 2 + py * 10;
            st.apps.forEach(function (a, q) { ys.push(top + q * gap); });
            return { x: x, ys: ys, st: st };
          });
          // the write-back arc, from Show to Decide
          if (n >= 4) {
            var a = cols[n - 1], b = cols[1], ya = H * 0.2 + py * 6;
            ctx.strokeStyle = 'rgba(46,229,157,0.35)'; ctx.setLineDash([3, 6]); ctx.lineWidth = 1.2;
            ctx.beginPath(); ctx.moveTo(a.x, a.ys[0] - 22); ctx.bezierCurveTo(a.x, ya, b.x, ya, b.x, b.ys[0] - 22); ctx.stroke(); ctx.setLineDash([]);
            back.forEach(function (p) {
              p.u += p.s / 60; if (p.u > 1) p.u = 0; var u = p.u, v = 1 - u;
              var x = v * v * v * a.x + 3 * v * v * u * a.x + 3 * v * u * u * b.x + u * u * u * b.x;
              var y = v * v * v * (a.ys[0] - 22) + 3 * v * v * u * ya + 3 * v * u * u * ya + u * u * u * (b.ys[0] - 22);
              ctx.fillStyle = 'rgba(46,229,157,' + Math.sin(u * 3.14) + ')'; ctx.beginPath(); ctx.arc(x, y, 2, 0, 6.29); ctx.fill();
            });
            ctx.fillStyle = 'rgba(46,229,157,0.85)'; ctx.font = '600 ' + (narrow ? 9.5 : 11.5) + 'px Inter, sans-serif'; ctx.textAlign = 'center';
            ctx.fillText('decisions write back', (a.x + b.x) / 2, ya + (narrow ? 22 : 18));
          }
          // the links between neighbouring columns
          for (var k = 0; k < n - 1; k++) cols[k].ys.forEach(function (y1) { cols[k + 1].ys.forEach(function (y2) {
            var x1 = cols[k].x, x2 = cols[k + 1].x, g = ctx.createLinearGradient(x1, 0, x2, 0);
            g.addColorStop(0, 'rgba(0,209,255,0.15)'); g.addColorStop(0.5, 'rgba(0,209,255,0.45)'); g.addColorStop(1, 'rgba(0,209,255,0.15)');
            ctx.strokeStyle = g; ctx.lineWidth = 1.1; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.bezierCurveTo((x1 + x2) / 2, y1, (x1 + x2) / 2, y2, x2, y2); ctx.stroke();
          }); });
          pulses.forEach(function (p) {
            p.u += p.s / 60; if (p.u > 1) { p.u = 0; p.seg = (p.seg + 1) % Math.max(1, n - 1); }
            var A = cols[p.seg], B = cols[p.seg + 1]; if (!A || !B) return;
            var y1 = A.ys[p.k % A.ys.length], y2 = B.ys[p.k % B.ys.length], u = p.u, v = 1 - u, mx = (A.x + B.x) / 2;
            var x = v * v * v * A.x + 3 * v * v * u * mx + 3 * v * u * u * mx + u * u * u * B.x, y = v * v * v * y1 + 3 * v * v * u * y1 + 3 * v * u * u * y2 + u * u * u * y2;
            ctx.fillStyle = 'rgba(124,232,255,' + Math.sin(u * 3.14) + ')'; ctx.beginPath(); ctx.arc(x, y, 2, 0, 6.29); ctx.fill();
          });
          // the stage names and the app chips
          cols.forEach(function (c) {
            ctx.textAlign = 'center'; ctx.fillStyle = '#7ce8ff'; ctx.font = '700 ' + (narrow ? 10 : 12) + 'px Inter, sans-serif';
            ctx.fillText(c.st.n.toUpperCase(), c.x, H * 0.36 + py * 8);
            c.ys.forEach(function (y, q) {
              var label = c.st.apps[q]; ctx.font = '600 ' + (narrow ? 10 : 13.5) + 'px Inter, sans-serif';
              var w = ctx.measureText(label).width + (narrow ? 16 : 28), h = narrow ? 24 : 32, x = Math.max(4, Math.min(W - w - 4, c.x - w / 2));
              var gl = ctx.createRadialGradient(c.x, y, 0, c.x, y, w * 0.7); gl.addColorStop(0, 'rgba(0,209,255,0.18)'); gl.addColorStop(1, 'rgba(0,209,255,0)');
              ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(c.x, y, w * 0.7, 0, 6.29); ctx.fill();
              ctx.fillStyle = 'rgba(10,26,51,0.95)'; ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x, y - h / 2, w, h, h / 2); else ctx.rect(x, y - h / 2, w, h); ctx.fill();
              ctx.strokeStyle = 'rgba(124,232,255,0.6)'; ctx.lineWidth = 1; ctx.stroke();
              ctx.fillStyle = '#fff'; ctx.fillText(label, x + w / 2, y + (narrow ? 3.5 : 4.5));
            });
          });
        }
      };
    }

    /* the workspace at the centre; your tools on the left send signals in, the places work happens on the right take it out */
    function hub() {
      var ins = JSON.parse(cv.getAttribute('data-in') || '[]'), outs = JSON.parse(cv.getAttribute('data-out') || '[]');
      var pulses = [];
      for (var i = 0; i < 34; i++) pulses.push({ side: i % 2, k: i, u: Math.random(), s: 0.12 + Math.random() * 0.12 });
      function col(list, x, H0, H1) { return list.map(function (n, k) { return { n: n, x: x, y: H0 + (H1 - H0) * (list.length === 1 ? 0.5 : k / (list.length - 1)) }; }); }
      return {
        draw: function (s, px, py) {
          var narrow = W < 760, cx = W / 2 + px * 18, cy = H * 0.5 + py * 10;
          var L = col(ins, W * (narrow ? 0.3 : 0.17) + px * 30, H * 0.12, H * 0.88), R = col(outs, W * (narrow ? 0.7 : 0.83) + px * 30, H * 0.2, H * 0.8);
          function curve(a, b, alpha, color) {
            var g = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
            g.addColorStop(0, 'rgba(' + color + ',' + alpha * 0.3 + ')'); g.addColorStop(1, 'rgba(' + color + ',' + alpha + ')');
            ctx.strokeStyle = g; ctx.lineWidth = 1.1; ctx.beginPath(); ctx.moveTo(a.x, a.y);
            ctx.bezierCurveTo((a.x + b.x) / 2, a.y, (a.x + b.x) / 2, b.y, b.x, b.y); ctx.stroke();
          }
          function at(a, b, u) {   // a point along the same bezier
            var mx = (a.x + b.x) / 2, v = 1 - u;
            return { x: v * v * v * a.x + 3 * v * v * u * mx + 3 * v * u * u * mx + u * u * u * b.x, y: v * v * v * a.y + 3 * v * v * u * a.y + 3 * v * u * u * b.y + u * u * u * b.y };
          }
          var C = { x: cx, y: cy };
          L.forEach(function (n) { curve(n, C, 0.45, '0,209,255'); });
          R.forEach(function (n) { curve(C, n, 0.45, '46,229,157'); });
          pulses.forEach(function (p) {
            p.u += p.s / 60; if (p.u > 1) p.u = 0;
            var list = p.side ? R : L; if (!list.length) return;
            var n = list[p.k % list.length], pt = p.side ? at(C, n, p.u) : at(n, C, p.u);
            ctx.fillStyle = p.side ? 'rgba(46,229,157,' + Math.sin(p.u * 3.14) + ')' : 'rgba(124,232,255,' + Math.sin(p.u * 3.14) + ')';
            ctx.beginPath(); ctx.arc(pt.x, pt.y, 2, 0, 6.29); ctx.fill();
          });
          // the workspace
          var R0 = narrow ? 30 : 56;
          var halo = ctx.createRadialGradient(cx, cy, 0, cx, cy, R0 * 3);
          halo.addColorStop(0, 'rgba(0,209,255,0.3)'); halo.addColorStop(1, 'rgba(0,209,255,0)');
          ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(cx, cy, R0 * 3, 0, 6.29); ctx.fill();
          ctx.fillStyle = '#081a33'; ctx.beginPath(); ctx.arc(cx, cy, R0, 0, 6.29); ctx.fill();
          ctx.strokeStyle = 'rgba(124,232,255,0.8)'; ctx.lineWidth = 1.2; ctx.stroke();
          ctx.strokeStyle = 'rgba(124,232,255,0.22)'; ctx.setLineDash([2, 6]); ctx.beginPath(); ctx.arc(cx, cy, R0 + 12, s * 0.3, s * 0.3 + 6.29); ctx.stroke(); ctx.setLineDash([]);
          ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.font = '600 ' + (narrow ? 10 : 14) + 'px Jost, Inter, sans-serif'; if (narrow) { ctx.fillText('Your', cx, cy - 2); ctx.fillText('workspace', cx, cy + 10); } else ctx.fillText('Your workspace', cx, cy + 5);
          // the endpoints
          function chip(n, right) {
            ctx.font = '600 ' + (narrow ? 10 : 13) + 'px Inter, sans-serif';
            var w = ctx.measureText(n.n).width + (narrow ? 18 : 26), h = narrow ? 24 : 30, x = right ? n.x - 8 : n.x - w + 8, y = n.y - h / 2;
            x = Math.max(6, Math.min(W - w - 6, x));      // always inside the frame
            ctx.fillStyle = 'rgba(10,26,51,0.92)'; ctx.beginPath();
            if (ctx.roundRect) ctx.roundRect(x, y, w, h, h / 2); else ctx.rect(x, y, w, h);
            ctx.fill(); ctx.strokeStyle = right ? 'rgba(46,229,157,0.55)' : 'rgba(0,209,255,0.5)'; ctx.stroke();
            ctx.fillStyle = '#eaf2fb'; ctx.textAlign = 'center'; ctx.fillText(n.n, x + w / 2, n.y + 4.5);
          }
          L.forEach(function (n) { chip(n, false); }); R.forEach(function (n) { chip(n, true); });
        }
      };
    }

    /* the plan ladder: a column of light per tier, each taller than the last, with motes rising inside */
    function rise() {
      var tiers = JSON.parse(cv.getAttribute('data-tiers') || '[]');   // [name, …], lowest first
      var motes = [];
      for (var i = 0; i < 70; i++) motes.push({ c: i % Math.max(1, tiers.length), u: Math.random(), x: Math.random(), s: 0.05 + Math.random() * 0.08 });
      return {
        draw: function (s, px, py) {
          var n = tiers.length, narrow = W < 760, gap = W * (narrow ? 0.06 : 0.035), cw = Math.min(narrow ? 76 : 170, (W * 0.8 - gap * (n - 1)) / n);
          var total = cw * n + gap * (n - 1), x0 = (W - total) / 2 + px * 20, base = H - 6;
          // the floor line
          var fl = ctx.createLinearGradient(0, 0, W, 0);
          fl.addColorStop(0, 'rgba(0,209,255,0)'); fl.addColorStop(0.5, 'rgba(0,209,255,0.5)'); fl.addColorStop(1, 'rgba(0,209,255,0)');
          ctx.fillStyle = fl; ctx.fillRect(0, base, W, 1);
          tiers.forEach(function (t, k) {
            var h = H * (0.26 + 0.19 * k) + Math.sin(s * 0.9 + k) * 3, x = x0 + k * (cw + gap), y = base - h + py * 6 * (k + 1) / n;
            var g = ctx.createLinearGradient(0, y, 0, base);
            g.addColorStop(0, 'rgba(0,209,255,' + (0.26 + k * 0.06) + ')'); g.addColorStop(1, 'rgba(0,209,255,0.02)');
            ctx.fillStyle = g; ctx.fillRect(x, y, cw, base - y);
            ctx.strokeStyle = 'rgba(175,178,206,0.18)'; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y + 0.5, cw - 1, base - y);
            // the lit top edge
            var top = ctx.createLinearGradient(x, 0, x + cw, 0);
            top.addColorStop(0, 'rgba(124,232,255,0)'); top.addColorStop(0.5, k === n - 1 ? 'rgba(46,229,157,1)' : 'rgba(124,232,255,1)'); top.addColorStop(1, 'rgba(124,232,255,0)');
            ctx.fillStyle = top; ctx.fillRect(x, y - 1, cw, 2);
            ctx.shadowColor = 'rgba(0,209,255,0.9)'; ctx.shadowBlur = 18; ctx.fillRect(x + cw * 0.3, y - 1, cw * 0.4, 2); ctx.shadowBlur = 0;
            ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.font = '600 ' + (narrow ? 11 : 14) + 'px Jost, Inter, sans-serif';
            ctx.fillText(t, x + cw / 2, y - 14);
            motes.forEach(function (m) {
              if (m.c !== k) return;
              m.u += m.s / 60; if (m.u > 1) { m.u = 0; m.x = Math.random(); }
              var my = base - m.u * (base - y), mx = x + 6 + m.x * (cw - 12);
              ctx.fillStyle = 'rgba(124,232,255,' + (0.8 * Math.sin(m.u * 3.14)) + ')'; ctx.beginPath(); ctx.arc(mx, my, 1.6, 0, 6.29); ctx.fill();
            });
          });
        }
      };
    }

    /* linked, hashed evidence blocks drifting across a floor in three lanes; a light runs down each chain */
    function chain() {
      var labels = JSON.parse(cv.getAttribute('data-blocks') || '[]');
      var lanes = [{ z: 0.5, y: 0.08, v: 9 }, { z: 0.74, y: 0.33, v: 14 }, { z: 1, y: 0.62, v: 20 }];
      var hex = '0123456789abcdef';
      function hash(n) { var s = ''; for (var i = 0; i < 4; i++) s += hex[(n * 7 + i * 13 + 5) % 16]; s += '…'; for (var k = 0; k < 4; k++) s += hex[(n * 11 + k * 3 + 9) % 16]; return s; }
      return {
        draw: function (s, px, py) {
          // the floor
          var hor = -H * 0.15 + py * 10, vx = W / 2 + px * 60;
          ctx.strokeStyle = 'rgba(0,209,255,0.07)'; ctx.lineWidth = 1;
          for (var i = -12; i <= 12; i++) { ctx.beginPath(); ctx.moveTo(vx + i * 30, hor); ctx.lineTo(vx + i * W * 0.22, H * 1.05); ctx.stroke(); }
          for (var j = 1; j < 9; j++) { var y = hor + (H - hor) * Math.pow(j / 9, 1.8); ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
          lanes.forEach(function (L, li) {
            var bw = 190 * L.z * (W < 760 ? 0.72 : 1), bh = 58 * L.z * (W < 760 ? 0.8 : 1), gap = bw * 0.55, step = bw + gap;
            var y = H * L.y + py * 18 * L.z, shift = ((s * L.v * L.z) % step) + px * 40 * L.z;
            var n = Math.ceil(W / step) + 2, base = Math.floor(s * L.v * L.z / step);
            var pulse = (s * 0.35 + li * 0.33) % 1;      // where the light is along the visible lane
            var prev = null;
            for (var k = -1; k < n; k++) {
              var x = k * step + shift - step, id = base - k + li * 50;
              var lab = labels[((id % labels.length) + labels.length) % labels.length];
              var cx = x + bw / 2, pos = cx / W, lit = Math.max(0, 1 - Math.abs(pos - pulse) * 6);
              var edge = Math.min(1, Math.min(cx, W - cx) / (W * 0.18));
              ctx.globalAlpha = (0.35 + 0.65 * L.z) * edge;
              if (prev) {
                ctx.strokeStyle = 'rgba(0,209,255,' + (0.25 + lit * 0.6) + ')'; ctx.lineWidth = 1.2;
                ctx.beginPath(); ctx.moveTo(prev, y + bh / 2); ctx.lineTo(x, y + bh / 2); ctx.stroke();
                ctx.fillStyle = 'rgba(124,232,255,0.9)'; ctx.beginPath(); ctx.arc(x - gap / 2, y + bh / 2, 2.2 * L.z, 0, 6.29); ctx.fill();
              }
              ctx.fillStyle = 'rgba(10,26,51,' + (0.88) + ')';
              rr(x, y, bw, bh, 10 * L.z); ctx.fill();
              ctx.strokeStyle = lit > 0.05 ? 'rgba(124,232,255,' + (0.35 + lit * 0.65) + ')' : 'rgba(175,178,206,0.25)'; ctx.lineWidth = 1; ctx.stroke();
              if (lit > 0.05) { ctx.shadowColor = 'rgba(0,209,255,0.8)'; ctx.shadowBlur = 24 * lit; ctx.stroke(); ctx.shadowBlur = 0; }
              ctx.textAlign = 'left'; ctx.fillStyle = '#eaf2fb'; ctx.font = '600 ' + Math.round(13 * L.z * (W < 760 ? 0.85 : 1)) + 'px Inter, sans-serif';
              ctx.fillText(lab, x + 14 * L.z, y + bh * 0.44, bw - 26 * L.z);
              ctx.fillStyle = 'rgba(124,232,255,0.7)'; ctx.font = '500 ' + Math.round(10.5 * L.z * (W < 760 ? 0.85 : 1)) + 'px ui-monospace, Menlo, monospace';
              ctx.fillText('sha256 ' + hash(Math.abs(id)), x + 14 * L.z, y + bh * 0.76);
              prev = x + bw;
            }
            ctx.globalAlpha = 1;
          });
          function rr(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
        }
      };
    }
  });
})();
