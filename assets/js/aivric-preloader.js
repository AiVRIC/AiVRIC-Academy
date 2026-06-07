(function () {
  'use strict';

  var wrap   = document.getElementById('apl-wrap');
  var fill   = document.getElementById('apl-fill');
  var pct    = document.getElementById('apl-pct');
  var status = document.getElementById('apl-status');

  if (!wrap) return;

  var progress  = 0;
  var loaded    = false;

  var phases = [
    'INITIALIZING SIGNAL ENGINE',
    'LOADING THREAT MODELS',
    'CALIBRATING RISK ALGORITHMS',
    'SYNCING COMPLIANCE FRAMEWORKS',
    'PLATFORM READY'
  ];
  var phaseIndex = 0;

  function setProgress(val) {
    progress = Math.min(val, 100);
    if (fill)   fill.style.width = progress + '%';
    if (pct)    pct.textContent  = Math.round(progress) + '%';
    var pi = Math.min(Math.floor(progress / 25), phases.length - 2);
    if (status && pi !== phaseIndex) {
      phaseIndex = pi;
      status.textContent = phases[phaseIndex];
    }
  }

  /* Fake progress 0 → 82% before real load */
  var ticker = setInterval(function () {
    if (loaded || progress >= 82) { clearInterval(ticker); return; }
    var step = Math.random() * 6 + 1.5;
    setProgress(progress + step);
  }, 140);

  function exitPreloader() {
    setProgress(100);
    if (status) status.textContent = phases[phases.length - 1];
    setTimeout(function () {
      wrap.classList.add('apl-exit');
      /* Remove from DOM after animation */
      setTimeout(function () {
        wrap.classList.add('apl-done');
      }, 900);
    }, 420);
  }

  window.addEventListener('load', function () {
    loaded = true;
    clearInterval(ticker);
    exitPreloader();
  });

  /* Hard safety cap — never block the site more than 5 s */
  setTimeout(function () {
    if (!wrap.classList.contains('apl-exit')) {
      loaded = true;
      clearInterval(ticker);
      exitPreloader();
    }
  }, 5000);
})();
