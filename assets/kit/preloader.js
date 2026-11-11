/* The site pre-loader: the AiVRIC mark rises bar by bar, the wordmark follows, and the spine (Signal, Decide, Show,
   Validate, Act) lights word by word over a thin progress line, then the page is revealed.
   One tag, first thing in <body>: <script src="…/assets/site/v1/preloader.js"></script>. It carries its own styles and
   the stacked reversed logo (assets/brand logo pack, direction C1c), so it needs nothing else and works at any depth.
   It shows once per tab session (sessionStorage aivric.pl), never with reduced motion, and never for longer than the
   page takes to load: at least 1 s so the mark reads, at most 2.6 s whatever is still loading. Decorative: hidden
   from assistive technology, and without script there is nothing to show. */
(function () {
  'use strict';
  var KEY = 'aivric.pl', MIN = 1000, MAX = 2600;
  try {
    if (sessionStorage.getItem(KEY)) return;
    sessionStorage.setItem(KEY, '1');
  } catch (e) { /* storage blocked: show it, it still leaves on load */ }
  if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (document.readyState === 'complete' || !document.body) return;

  var css =
    '#aivric-pl{position:fixed;inset:0;z-index:2147483000;display:grid;place-items:center;background:#050c18;color:#ededf3;' +
      'transition:opacity .42s cubic-bezier(.4,0,.2,1),visibility 0s linear .42s;font-family:Inter,system-ui,sans-serif}' +
    '#aivric-pl::before{content:"";position:absolute;inset:0;pointer-events:none;' +
      'background:radial-gradient(circle,rgba(56,182,255,.075) 1px,transparent 1.2px) 0 0/32px 32px;' +
      '-webkit-mask:radial-gradient(ellipse 60% 55% at 50% 50%,#000 30%,transparent 80%);mask:radial-gradient(ellipse 60% 55% at 50% 50%,#000 30%,transparent 80%)}' +
    '#aivric-pl::after{content:"";position:absolute;left:50%;top:50%;width:min(720px,120vw);aspect-ratio:1;transform:translate(-50%,-56%);pointer-events:none;' +
      'background:radial-gradient(circle,rgba(56,182,255,.13) 0%,rgba(56,182,255,.04) 38%,transparent 66%);animation:apl-glow 2.4s ease-in-out infinite alternate}' +
    '#aivric-pl .apl-in{position:relative;z-index:1;display:flex;flex-direction:column;align-items:center;transition:transform .42s cubic-bezier(.4,0,.2,1)}' +
    '#aivric-pl svg{display:block;width:clamp(132px,15vw,176px);height:auto;overflow:visible}' +
    '#aivric-pl .b{transform-box:fill-box;transform-origin:50% 100%;transform:scaleY(0);animation:apl-bar .5s cubic-bezier(.2,.9,.25,1.12) forwards}' +
    '#aivric-pl .b2{animation-delay:.08s}#aivric-pl .b3{animation-delay:.16s}' +
    '#aivric-pl .b3{filter:drop-shadow(0 0 0 rgba(56,182,255,0));animation:apl-bar .5s cubic-bezier(.2,.9,.25,1.12) .16s forwards,apl-beam 1.4s ease-in-out .7s infinite alternate}' +
    '#aivric-pl .w{clip-path:inset(0 100% 0 0);animation:apl-wipe .45s cubic-bezier(.65,0,.35,1) .3s forwards}' +
    '#aivric-pl .apl-spine{display:flex;flex-wrap:wrap;justify-content:center;gap:0 .9em;margin:26px 0 0;padding:0 16px;font-size:10.5px;font-weight:600;' +
      'letter-spacing:.24em;text-transform:uppercase;color:rgba(237,237,243,.34)}' +
    '#aivric-pl .apl-spine span{animation:apl-word .5s ease forwards;animation-play-state:paused}' +
    '#aivric-pl.is-run .apl-spine span{animation-play-state:running}' +
    '#aivric-pl .apl-spine i{font-style:normal;color:rgba(237,237,243,.18)}' +
    '#aivric-pl .apl-line{position:relative;width:min(188px,60vw);height:1px;margin-top:16px;background:rgba(175,178,206,.16);overflow:hidden}' +
    '#aivric-pl .apl-line b{position:absolute;inset:0;transform-origin:0 50%;transform:scaleX(0);transition:transform .35s cubic-bezier(.4,0,.2,1);' +
      'background:linear-gradient(90deg,#38b6ff,#00d1ff);box-shadow:0 0 10px rgba(0,209,255,.7)}' +
    '#aivric-pl.is-out{opacity:0;visibility:hidden}#aivric-pl.is-out .apl-in{transform:translateY(-10px) scale(.985)}' +
    '@keyframes apl-bar{to{transform:scaleY(1)}}' +
    '@keyframes apl-wipe{to{clip-path:inset(0 0 0 0)}}' +
    '@keyframes apl-beam{from{filter:drop-shadow(0 0 0 rgba(56,182,255,0))}to{filter:drop-shadow(0 0 9px rgba(56,182,255,.75))}}' +
    '@keyframes apl-glow{from{opacity:.7}to{opacity:1}}' +
    '@keyframes apl-word{0%{color:rgba(237,237,243,.34)}40%{color:#38b6ff;text-shadow:0 0 14px rgba(56,182,255,.55)}100%{color:rgba(237,237,243,.82)}}';

  var bars = [
    'M103.552 98.242C89.904 88.812 80.529 74.931 78.517 57.525C79.934 52.046 84.911 48 90.832 48C97.857 48 103.552 53.695 103.552 60.72L103.552 98.242Z',
    'M136.432 102.725C132.437 104.815 128.177 106.579 123.712 108C119.247 106.579 114.987 104.815 110.992 102.725L110.992 36.72C110.992 29.695 116.687 24 123.712 24C130.737 24 136.432 29.695 136.432 36.72L136.432 102.725Z',
    'M169.312 50.4C169.312 71.162 159.333 87.559 143.872 98.242L143.872 12.72C143.872 5.695 149.567 0 156.592 0C163.617 0 169.312 5.695 169.312 12.72L169.312 50.4Z'
  ];
  var ai = 'M0 177.904 17.28 133.872H33.984L51.264 177.904H35.84L33.792 171.76H16.896L14.848 177.904ZM20.288 161.648H30.464L28.096 154.544Q27.904 153.84 27.584 152.816Q27.264 151.792 26.912 150.608Q26.56 149.424 26.24 148.24Q25.92 147.056 25.664 146.16H25.152Q24.832 147.312 24.416 148.784Q24 150.256 23.52 151.76Q23.04 153.264 22.656 154.544ZM55.04 140.144V131.504H68.16V140.144ZM55.04 177.904V144.112H68.16V177.904Z';
  var vric = 'M89.344 177.904 72.32 133.872H88L94.528 153.776Q94.848 154.672 95.36 156.304Q95.872 157.936 96.48 159.792Q97.088 161.648 97.472 163.184H97.984Q98.432 161.776 98.976 160.016Q99.52 158.256 100.064 156.56Q100.608 154.864 100.928 153.776L107.584 133.872H122.624L105.664 177.904ZM127.68 177.904V133.872H157.824Q162.752 133.872 166.048 135.856Q169.344 137.84 171.008 141.072Q172.672 144.304 172.672 148.08Q172.672 152.368 170.688 155.696Q168.704 159.024 165.184 161.008L173.888 177.904H157.504L150.784 163.376H142.208V177.904ZM142.208 153.328H153.792Q155.456 153.328 156.64 152.048Q157.824 150.768 157.824 148.656Q157.824 147.312 157.28 146.288Q156.736 145.264 155.84 144.688Q154.944 144.112 153.792 144.112H142.208ZM179.392 177.904V133.872H193.92V177.904ZM225.024 178.672Q217.088 178.672 211.712 176.112Q206.336 173.552 203.616 168.464Q200.896 163.376 200.896 155.888Q200.896 144.688 207.04 138.896Q213.184 133.104 225.088 133.104Q231.808 133.104 236.832 135.312Q241.856 137.52 244.64 141.744Q247.424 145.968 247.424 151.984H233.472Q233.472 149.488 232.448 147.632Q231.424 145.776 229.568 144.752Q227.712 143.728 224.96 143.728Q221.696 143.728 219.68 145.072Q217.664 146.416 216.736 148.752Q215.808 151.088 215.808 154.16V157.616Q215.808 160.624 216.768 162.992Q217.728 165.36 219.68 166.704Q221.632 168.048 224.768 168.048Q227.84 168.048 229.824 167.088Q231.808 166.128 232.864 164.304Q233.92 162.48 233.92 160.048H247.424Q247.424 165.936 244.768 170.096Q242.112 174.256 237.12 176.464Q232.128 178.672 225.024 178.672Z';
  var words = ['Signal', 'Decide', 'Show', 'Validate', 'Act'];

  var style = document.createElement('style');
  style.textContent = css;
  var el = document.createElement('div');
  el.id = 'aivric-pl';
  el.setAttribute('aria-hidden', 'true');
  el.innerHTML =
    '<div class="apl-in">' +
      '<svg viewBox="0 -2 247.42 182" xmlns="http://www.w3.org/2000/svg" focusable="false">' +
        '<path class="b b1" fill="#fff" d="' + bars[0] + '"/><path class="b b2" fill="#fff" d="' + bars[1] + '"/>' +
        '<path class="b b3" fill="#38B6FF" d="' + bars[2] + '"/>' +
        '<g class="w"><path fill="#38B6FF" d="' + ai + '"/><path fill="#fff" d="' + vric + '"/></g>' +
      '</svg>' +
      '<p class="apl-spine">' + words.map(function (w, i) {
        return (i ? '<i>·</i>' : '') + '<span style="animation-delay:' + (0.5 + i * 0.12).toFixed(2) + 's">' + w + '</span>';
      }).join('') + '</p>' +
      '<div class="apl-line"><b></b></div>' +
    '</div>';
  document.head.appendChild(style);
  document.body.insertBefore(el, document.body.firstChild);

  var line = el.querySelector('.apl-line b'), t0 = Date.now(), done = false, p = 0;
  function bar(v) { p = Math.max(p, v); line.style.transform = 'scaleX(' + p.toFixed(3) + ')'; }
  requestAnimationFrame(function () { el.classList.add('is-run'); bar(0.18); });
  // the line follows the page: parsed, then each stylesheet, image and script that lands, up to 0.9 before the load event
  var tick = setInterval(function () { bar(Math.min(0.9, p + (document.readyState === 'loading' ? 0.04 : 0.09))); }, 160);
  function leave() {
    if (done) return;
    done = true;
    clearInterval(tick);
    bar(1);
    setTimeout(function () {
      el.classList.add('is-out');
      setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); if (style.parentNode) style.parentNode.removeChild(style); }, 480);
    }, Math.max(160, MIN - (Date.now() - t0)));
  }
  window.addEventListener('load', leave);
  setTimeout(leave, MAX);
})();
