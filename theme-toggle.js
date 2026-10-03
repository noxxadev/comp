(() => {
  const STORAGE_KEY = 'comp-theme';
  const DARK = 'dark';
  const LIGHT = 'light';
  const NAV_GROUP_STORAGE_KEY = 'comp-sidebar-groups';

  const NAV_ITEMS = [
    { href: 'index.html', icon: 'fa-house', label: 'Tools Hub' },
    { href: 'excel-analyzer.html', icon: 'fa-file-excel', label: 'Sub Account' },
    { href: 'offline-analyzer.html', icon: 'fa-database', label: 'Offline' },
    { href: 'iplocationvalidator.html', icon: 'fa-location-dot', label: 'IP Validator' },
    {
      group: 'Pool Vs Dashboard',
      icon: 'fa-code-compare',
      items: [
        { href: 'data-matcher.html', icon: 'fa-link', label: 'Data Matcher' },
        { href: 'bulk-compare.html', icon: 'fa-scale-balanced', label: 'Bulk Compare' }
      ]
    },
    {
      group: 'IP Repeat',
      icon: 'fa-repeat',
      items: [
        { href: 'ip-repeat-analyzer.html', icon: 'fa-repeat', label: 'IP Repeat Analyzer' },
        { href: 'machine-list.html', icon: 'fa-server', label: 'Machine List' },
        { href: 'cleaning-history.html', icon: 'fa-clock-rotate-left', label: 'Cleaning History' }
      ]
    },
    { href: 'dc-hightemp.html', icon: 'fa-temperature-high', label: 'DC HighTemp' },
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

  function getStoredNavGroups() {
    try {
      const saved = JSON.parse(localStorage.getItem(NAV_GROUP_STORAGE_KEY) || '{}');
      return saved && typeof saved === 'object' ? saved : {};
    } catch (_) {
      return {};
    }
  }

  function persistNavGroups(groups) {
    try {
      localStorage.setItem(NAV_GROUP_STORAGE_KEY, JSON.stringify(groups));
    } catch (_) {
      // Keep sidebar grouping working even when storage is unavailable.
    }
  }

  function syncNavGroupState(nav) {
    const groups = getStoredNavGroups();
    nav.querySelectorAll('.hub-nav-group').forEach((group) => {
      const key = group.dataset.navGroup;
      if (!key) return;
      const title = group.querySelector('.hub-nav-group-title');
      const collapsed = groups[key] === true;
      group.classList.toggle('is-collapsed', collapsed);
      if (title) {
        title.setAttribute('role', 'button');
        title.setAttribute('tabindex', '0');
        title.setAttribute('aria-expanded', String(!collapsed));
        title.setAttribute('aria-controls', key + '-items');
      }
    });
  }

  function bindNavGroupToggles(nav) {
    nav.querySelectorAll('.hub-nav-group').forEach((group) => {
      const title = group.querySelector('.hub-nav-group-title');
      const items = group.querySelector('.hub-nav-group-items');
      const key = group.dataset.navGroup;
      if (!title || !items || !key) return;
      items.id = key + '-items';

      const toggle = () => {
        const groups = getStoredNavGroups();
        const collapsed = group.classList.toggle('is-collapsed');
        groups[key] = collapsed;
        persistNavGroups(groups);
        title.setAttribute('aria-expanded', String(!collapsed));
      };

      title.addEventListener('click', toggle);
      title.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          toggle();
        }
      });
    });
  }

  function getCurrentPage() {
    const file = window.location.pathname.split('/').pop();
    return file || 'index.html';
  }

  function syncSidebarNavigation() {
    document.querySelectorAll('.hub-nav').forEach((nav) => {
      const currentPage = getCurrentPage();
      nav.innerHTML = NAV_ITEMS.map((item) => {
        if (item.group) {
          const groupActive = item.items.some(child => child.href === currentPage);
          const links = item.items.map(child => {
            const active = child.href === currentPage;
            return `<a${active ? ' class="active"' : ''} href="${child.href}"><i class="fas ${child.icon}" aria-hidden="true"></i><span>${child.label}</span></a>`;
          }).join('');
          const groupKey = item.group.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
          return `<div class="hub-nav-group${groupActive ? ' is-active' : ''}" data-nav-group="${groupKey}">
            <div class="hub-nav-group-title"><i class="fas ${item.icon}" aria-hidden="true"></i><span>${item.group}</span><i class="fas fa-chevron-down hub-nav-group-chevron" aria-hidden="true"></i></div>
            <div class="hub-nav-group-items">${links}</div>
          </div>`;
        }
        const active = item.href === currentPage;
        return `<a${active ? ' class="active"' : ''} href="${item.href}"><i class="fas ${item.icon}" aria-hidden="true"></i><span>${item.label}</span></a>`;
      }).join('');
      syncNavGroupState(nav);
      bindNavGroupToggles(nav);
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
