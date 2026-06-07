/* AiVRIC Visual Enhancement — asset reveal v5
 * Brand imgs start at opacity:0 in CSS; revealed here when they load.
 * Videos start at opacity:0 in CSS; revealed here when they play.
 * CSS handles all placeholder aesthetics until assets land.
 */
(function () {
  function init() {
    /* Reveal brand PNG images when they successfully load */
    [].forEach.call(
      document.querySelectorAll('.ve-vid-frame img:not([data-ve-bg])'),
      function (img) {
        if (img.complete && img.naturalWidth > 0) {
          img.style.opacity = '1';
        } else {
          img.addEventListener('load', function () { img.style.opacity = '1'; });
        }
      }
    );

    /* Fade in videos when they begin playing */
    [].forEach.call(
      document.querySelectorAll('.ve-vid-frame video, .ve-threat-bg video, .ve-ba-vid-bg video'),
      function (vid) {
        vid.addEventListener('playing', function () {
          vid.style.opacity = '1';
        });
      }
    );
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
