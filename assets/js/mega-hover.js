(function(){
  var panels = document.querySelectorAll('.megamenu .mega-panel');
  if (!panels.length) return;

  panels.forEach(function(panel){
    var cards = panel.querySelectorAll('[data-mega-target]');
    if (!cards.length) return;

    function setActive(target){
      panel.setAttribute('data-mega-active', target);
      cards.forEach(function(card){
        card.classList.toggle('is-active', card.getAttribute('data-mega-target') === target);
      });
    }

    cards.forEach(function(card){
      var target = card.getAttribute('data-mega-target');
      // mouseenter handles desktop hover; click handles touch/keyboard activation
      card.addEventListener('mouseenter', function(){ setActive(target); });
      card.addEventListener('focus',      function(){ setActive(target); });
      card.addEventListener('click',      function(){ setActive(target); });
    });

    setActive(panel.getAttribute('data-mega-active') || cards[0].getAttribute('data-mega-target'));
  });
})();
