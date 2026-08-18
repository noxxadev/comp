(() => {
  const STORAGE_KEY = 'comp-theme';
  const DARK = 'dark';
  const LIGHT = 'light';

  function getStoredTheme() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved === DARK ? DARK : LIGHT;
    } catch (_) {
      return LIGHT;
    }
  }

  function applyTheme(theme) {
    const activeTheme = theme === DARK ? DARK : LIGHT;
    document.documentElement.dataset.theme = activeTheme;

    document.querySelectorAll('[data-theme-choice]').forEach((button) => {
      const isActive = button.dataset.themeChoice === activeTheme;
      button.classList.toggle('active', isActive);
      button.setAttribute('aria-pressed', String(isActive));
    });
  }

  function persistTheme(theme) {
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch (_) {
      // Keep theme working even when storage is unavailable.
    }
  }

  function createToggle() {
    const sidebar = document.querySelector('.hub-sidebar');
    if (!sidebar || sidebar.querySelector('.theme-toggle-wrap')) return;

    const wrapper = document.createElement('div');
    wrapper.className = 'theme-toggle-wrap';
    wrapper.innerHTML = `
      <div class="theme-toggle-label">
        <span>Theme</span>
      </div>
      <div class="theme-toggle" role="group" aria-label="Theme selection">
        <button type="button" data-theme-choice="light" aria-label="Use light theme">
          <i class="fas fa-sun"></i><span>Light</span>
        </button>
        <button type="button" data-theme-choice="dark" aria-label="Use dark theme">
          <i class="fas fa-moon"></i><span>Dark</span>
        </button>
      </div>
    `;

    const meta = sidebar.querySelector('.hub-meta');
    if (meta) {
      sidebar.insertBefore(wrapper, meta);
    } else {
      sidebar.appendChild(wrapper);
    }

    wrapper.querySelectorAll('[data-theme-choice]').forEach((button) => {
      button.addEventListener('click', () => {
        const theme = button.dataset.themeChoice === DARK ? DARK : LIGHT;
        persistTheme(theme);
        applyTheme(theme);
      });
    });
  }

  document.documentElement.dataset.theme = getStoredTheme();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      createToggle();
      applyTheme(getStoredTheme());
    }, { once: true });
  } else {
    createToggle();
    applyTheme(getStoredTheme());
  }
})();
