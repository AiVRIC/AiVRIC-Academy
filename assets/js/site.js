(function(){
  var root = document.documentElement;
  var toggle = document.querySelector('[data-theme-toggle]');
  var menuToggle = document.querySelector('[data-menu-toggle]');
  var navLinks = document.querySelector('.nav-links');

  function setTheme(mode){
    root.setAttribute('data-theme', mode);
    localStorage.setItem('aivric-theme', mode);
    if(toggle){ toggle.textContent = mode === 'dark' ? 'Light mode' : 'Dark mode'; }
  }

  var saved = localStorage.getItem('aivric-theme');
  if(saved){ setTheme(saved); }

  if(toggle){
    toggle.addEventListener('click', function(){
      var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      setTheme(next);
    });
  }

  if(menuToggle && navLinks){
    menuToggle.addEventListener('click', function(){
      navLinks.classList.toggle('open');
    });
  }

  var observer = new IntersectionObserver(function(entries){
    entries.forEach(function(entry){
      if(entry.isIntersecting){ entry.target.classList.add('visible'); }
    });
  }, { threshold: 0.2 });

  document.querySelectorAll('.reveal').forEach(function(el){ observer.observe(el); });

  window.aivricTrack = function(eventName, data){
    if(window.console && console.info){ console.info('[analytics]', eventName, data || {}); }
  };

  document.querySelectorAll('[data-analytics]').forEach(function(el){
    el.addEventListener('click', function(){
      var name = el.getAttribute('data-analytics');
      window.aivricTrack('cta_click', { label: name, href: el.getAttribute('href') });
    });
  });
})();
