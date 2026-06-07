(function(){
  // Handle every .megamenu independently — the mobile menu is a cloned copy
  // of the desktop nav and needs its own tab-switching context.
  document.querySelectorAll('.megamenu').forEach(function(menu){
    var tabs   = menu.querySelectorAll('[data-mega-tab]');
    var panels = menu.querySelectorAll('[data-mega-tabpanel]');
    if (!tabs.length) return;

    function setTab(name){
      tabs.forEach(function(tab){
        var active = tab.getAttribute('data-mega-tab') === name;
        tab.classList.toggle('is-active', active);
        tab.setAttribute('aria-selected', active ? 'true' : 'false');
      });
      panels.forEach(function(panel){
        var active = panel.getAttribute('data-mega-tabpanel') === name;
        panel.hidden = !active;
      });
    }

    tabs.forEach(function(tab){
      var name = tab.getAttribute('data-mega-tab');
      tab.addEventListener('mouseenter', function(){ setTab(name); });
      tab.addEventListener('click',      function(){ setTab(name); });
    });

    setTab('solution');
  });
})();
