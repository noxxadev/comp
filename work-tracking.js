(() => {
  'use strict';

  const STORAGE_KEY = 'comp.workItems.v1';
  const STATUSES = ['Belum Dikerjakan', 'In Progress', 'Selesai', 'Problem', 'Skipped'];

  function loadWorkItems() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (error) {
      console.warn('Gagal membaca work items lokal:', error);
      return {};
    }
  }

  function saveWorkItems(items) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }

  function buildWorkItems(rows, engineerId) {
    const now = new Date().toISOString();
    const items = loadWorkItems();

    rows.forEach(row => {
      const existing = items[row.ip];
      items[row.ip] = {
        ip: row.ip,
        name: row.name,
        zone: row.zone,
        repeat: row.repeat,
        engineerId,
        status: existing?.status || 'Belum Dikerjakan',
        timestamp: existing?.timestamp || now,
        note: existing?.note || ''
      };
    });

    return items;
  }

  window.CompWorkTracking = {
    STORAGE_KEY,
    STATUSES,
    loadWorkItems,
    saveWorkItems,
    buildWorkItems
  };
})();
