(function(){
  var root = document.documentElement;
  var toggles = document.querySelectorAll('[data-theme-toggle]');

  function setTheme(mode){
    root.setAttribute('data-theme', mode);
    try { localStorage.setItem('aivric-theme', mode); } catch (e) {}
    toggles.forEach(function(btn){
      btn.textContent = mode === 'dark' ? 'Light mode' : 'Dark mode';
    });
    updateLogos(mode);
  }

  function updateLogos(mode){
    var darkLogo = '/aivric-enterprise/assets/images/logo/Aivric-logo-footer-1.avif';
    var logos = document.querySelectorAll('header.main-header .logo img, .sticky-header .logo img, .nav-logo img');
    logos.forEach(function(img){
      if (!img.dataset.logoLight) {
        img.dataset.logoLight = img.getAttribute('src');
      }
      img.setAttribute('src', mode === 'dark' ? darkLogo : img.dataset.logoLight);
    });
  }

  var saved = null;
  try { saved = localStorage.getItem('aivric-theme'); } catch (e) {}
  setTheme(saved || 'light');

  toggles.forEach(function(btn){
    btn.addEventListener('click', function(){
      var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      setTheme(next);
    });
  });
})();
