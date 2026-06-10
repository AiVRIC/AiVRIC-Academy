/**
 * AiVRIC Academy — Theme manager
 * Applies immediately (before DOM) to prevent flash of wrong theme.
 * Exposes window.AcademyTheme.toggle() and window.AcademyTheme.get().
 */
(function () {
  var STORAGE_KEY = 'academy-theme';

  function preferred() {
    var saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(STORAGE_KEY, theme);
    syncButtons(theme);
    document.dispatchEvent(new CustomEvent('academy:theme', { detail: { theme: theme } }));
  }

  function syncButtons(theme) {
    document.querySelectorAll('.acad-theme-toggle').forEach(function (btn) {
      var icon = btn.querySelector('i');
      if (icon) {
        icon.className = theme === 'light' ? 'fas fa-moon' : 'fas fa-sun';
      }
      var label = theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode';
      btn.setAttribute('aria-label', label);
      btn.setAttribute('title', label);
    });
  }

  function toggleTheme() {
    var current = document.documentElement.getAttribute('data-theme') || preferred();
    applyTheme(current === 'light' ? 'dark' : 'light');
  }

  /* Apply theme immediately — runs before DOMContentLoaded */
  applyTheme(preferred());

  /* Wire button clicks once DOM is ready */
  document.addEventListener('DOMContentLoaded', function () {
    syncButtons(document.documentElement.getAttribute('data-theme') || preferred());
    document.querySelectorAll('.acad-theme-toggle').forEach(function (btn) {
      btn.addEventListener('click', toggleTheme);
    });
  });

  window.AcademyTheme = { toggle: toggleTheme, get: function () { return document.documentElement.getAttribute('data-theme'); } };
})();
