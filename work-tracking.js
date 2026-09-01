(() => {
  'use strict';

  const STATUSES = ['Belum Dikerjakan', 'In Progress', 'Selesai', 'Problem', 'Skipped'];

  function getConfig() {
    return window.CompGoogleSheetsConfig || { webAppUrl: '', requestKey: '' };
  }

  function loadWorkItems() {
    // The Google Sheet is the source of truth. The current Phase 5 UI only
    // needs an empty object so the existing save flow can build the payload.
    return {};
  }

  function saveWorkItems(items) {
    const config = getConfig();
    const url = String(config.webAppUrl || '').trim();

    if (!url) {
      throw new Error('Google Sheets belum dikonfigurasi. Isi webAppUrl pada google-sheets-config.js.');
    }

    const payload = {
      action: 'upsertWorkItems',
      requestKey: String(config.requestKey || ''),
      items
    };

    // sendBeacon avoids exposing Google credentials in the public GitHub page
    // and can POST cross-origin data without requiring the page to read the
    // response. The UI therefore reports that the request was queued, while
    // Google Sheets remains the source of truth.
    if (!navigator.sendBeacon) {
      throw new Error('Browser tidak mendukung pengiriman data ke Google Sheets.');
    }

    const body = new Blob([JSON.stringify(payload)], { type: 'text/plain;charset=UTF-8' });
    const queued = navigator.sendBeacon(url, body);

    if (!queued) {
      throw new Error('Data pekerjaan gagal dikirim ke Google Sheets.');
    }

    return true;
  }

  function buildWorkItems(rows, engineerId) {
    const now = new Date().toISOString();
    const items = {};

    rows.forEach(row => {
      items[row.ip] = {
        ip: row.ip,
        name: row.name,
        zone: row.zone,
        repeat: row.repeat,
        engineerId,
        status: 'Belum Dikerjakan',
        timestamp: now,
        note: ''
      };
    });

    return items;
  }

  window.CompWorkTracking = {
    STATUSES,
    loadWorkItems,
    saveWorkItems,
    buildWorkItems
  };
})();
