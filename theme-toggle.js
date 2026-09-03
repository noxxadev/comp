(() => {
  const STORAGE_KEY = 'comp-theme';
  const DARK = 'dark';
  const LIGHT = 'light';

  const NAV_ITEMS = [
    { href: 'index.html', icon: 'fa-house', label: 'Tools Hub' },
    { href: 'excel-analyzer.html', icon: 'fa-file-excel', label: 'Sub Account' },
    { href: 'offline-analyzer.html', icon: 'fa-database', label: 'Offline' },
    { href: 'iplocationvalidator.html', icon: 'fa-location-dot', label: 'IP Validator' },
    { href: 'data-matcher.html', icon: 'fa-link', label: 'Pool vs Dashboard' },
    { href: 'bulk-compare.html', icon: 'fa-scale-balanced', label: 'Bulk Compare' },
    { href: 'ip-repeat-analyzer.html', icon: 'fa-repeat', label: 'IP Repeat' },
    { href: 'machine-list.html', icon: 'fa-server', label: 'Machine List' },
    { href: 'cleaning-history.html', icon: 'fa-clock-rotate-left', label: 'Cleaning History' },
    { href: 'theme-preview.html', icon: 'fa-palette', label: 'Theme Preview' }
  ];

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

  function getCurrentPage() {
    const file = window.location.pathname.split('/').pop();
    return file || 'index.html';
  }

  function syncSidebarNavigation() {
    document.querySelectorAll('.hub-nav').forEach((nav) => {
      const currentPage = getCurrentPage();
      nav.innerHTML = NAV_ITEMS.map((item) => {
        const active = item.href === currentPage;
        return `<a${active ? ' class="active"' : ''} href="${item.href}"><i class="fas ${item.icon}" aria-hidden="true"></i><span>${item.label}</span></a>`;
      }).join('');
    });
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

  function initialize() {
    syncSidebarNavigation();
    createToggle();
    applyTheme(getStoredTheme());
  }

  document.documentElement.dataset.theme = getStoredTheme();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize, { once: true });
  } else {
    initialize();
  }
})();
