(() => {
  'use strict';

  const STATUSES = ['Belum Dikerjakan', 'In Progress', 'Selesai', 'Problem', 'Skipped'];

  function getConfig() {
    return window.CompGoogleSheetsConfig || { webAppUrl: '', requestKey: '' };
  }

  function loadWorkItems() {
    return {};
  }

  async function saveWorkItems(items) {
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

    let response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
        body: JSON.stringify(payload)
      });
    } catch (error) {
      throw new Error(`Gagal terhubung ke Google Sheets: ${error.message || 'network error'}`);
    }

    const text = await response.text();
    let result;
    try {
      result = JSON.parse(text);
    } catch (error) {
      throw new Error(`Google Apps Script mengembalikan response tidak valid (HTTP ${response.status}).`);
    }

    if (!response.ok) {
      throw new Error(result?.error || `Google Sheets gagal menerima data (HTTP ${response.status}).`);
    }

    if (!result?.ok) {
      throw new Error(result?.error || 'Google Apps Script menolak penyimpanan data.');
    }

    return {
      ok: true,
      saved: Number(result.saved || 0),
      updatedAt: result.updatedAt || null
    };
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
