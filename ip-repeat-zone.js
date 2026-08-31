(() => {
  'use strict';

  // Safety layer for the IP Repeat result table.
  // It guarantees the Zone column is present even when an older cached
  // ip-repeat-analyzer.js is still being served by GitHub Pages/CDN.
  function zoneFromName(name) {
    const value = String(name || '').trim();
    const match = value.match(/^GBE\.([A-Z])/i);
    return match ? `Line ${match[1].toUpperCase()}` : '-';
  }

  function ensureZoneColumn() {
    const table = document.querySelector('.repeat-table');
    const body = document.getElementById('resultsBody');
    if (!table || !body) return;

    const headerRow = table.querySelector('thead tr');
    if (!headerRow) return;

    const headers = Array.from(headerRow.children);
    let zoneIndex = headers.findIndex(cell => cell.textContent.trim().toLowerCase() === 'zona');

    if (zoneIndex === -1) {
      const header = document.createElement('th');
      header.textContent = 'Zona';
      headerRow.appendChild(header);
      zoneIndex = headerRow.children.length - 1;
    }

    Array.from(body.querySelectorAll('tr')).forEach(row => {
      const cells = Array.from(row.children);
      if (cells.length > zoneIndex) return;

      const nameCell = cells[3];
      const zoneCell = document.createElement('td');
      zoneCell.className = 'zone-cell';
      zoneCell.textContent = zoneFromName(nameCell?.textContent);
      row.appendChild(zoneCell);
    });
  }

  const observer = new MutationObserver(ensureZoneColumn);

  function init() {
    const body = document.getElementById('resultsBody');
    if (!body) return;
    observer.observe(body, { childList: true, subtree: true });
    ensureZoneColumn();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
