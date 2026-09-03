(() => {
  'use strict';

  const STORAGE_KEY = 'comp.machineList.v1';

  function normalizeLocationId(value) {
    return String(value ?? '').replace(/\s+/g, ' ').trim().toUpperCase();
  }

  function parseDate(value) {
    if (value === null || value === undefined || value === '') return null;
    if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;

    const text = String(value).trim();
    if (!text) return null;

    const normalized = text.replace(' ', 'T');
    const parsed = new Date(normalized);
    if (!Number.isNaN(parsed.getTime())) return parsed;

    const fallback = new Date(text.replace(/\//g, '-'));
    return Number.isNaN(fallback.getTime()) ? null : fallback;
  }

  function loadStoredRecords() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const payload = JSON.parse(raw);
      return payload?.version === 1 && Array.isArray(payload.records) ? payload.records : [];
    } catch (error) {
      console.warn('Gagal membaca Machine List tersimpan:', error);
      return [];
    }
  }

  function resolve(locationId, eventTimestamp, records = loadStoredRecords()) {
    const targetLocation = normalizeLocationId(locationId);
    const eventDate = parseDate(eventTimestamp);

    if (!targetLocation) {
      return { status: 'missing-location', serialNumber: '', matches: [], message: 'Location ID kosong.' };
    }

    if (!eventDate) {
      return { status: 'invalid-time', serialNumber: '', matches: [], message: 'Timestamp event tidak valid.' };
    }

    const candidates = records.filter(record => {
      if (normalizeLocationId(record?.locationId) !== targetLocation) return false;

      const installed = parseDate(record?.installedDate);
      const uninstalled = parseDate(record?.uninstalledDate);

      if (!installed || eventDate < installed) return false;
      if (uninstalled && eventDate >= uninstalled) return false;
      if (!uninstalled && String(record?.uninstalledDate ?? '').trim()) return false;

      return true;
    });

    if (candidates.length === 1) {
      return {
        status: 'resolved',
        serialNumber: String(candidates[0].serialNumber ?? '').trim(),
        matches: candidates,
        message: 'Serial Number berhasil ditemukan berdasarkan periode lokasi.'
      };
    }

    if (candidates.length === 0) {
      return {
        status: 'unresolved',
        serialNumber: '',
        matches: [],
        message: 'Tidak ada mesin yang menempati Location ID tersebut pada waktu event.'
      };
    }

    return {
      status: 'ambiguous',
      serialNumber: '',
      matches: candidates,
      message: 'Lebih dari satu mesin cocok pada waktu event. Serial Number tidak ditebak.'
    };
  }

  async function loadCurrentRecords() {
    const config = window.CompGoogleSheetsConfig || { webAppUrl: '', requestKey: '' };
    const baseUrl = String(config.webAppUrl || '').trim();
    if (!baseUrl) throw new Error('Google Sheets belum dikonfigurasi.');

    const params = new URLSearchParams({ action: 'getMachineList' });
    if (config.requestKey) params.set('requestKey', String(config.requestKey));

    let lastError = null;
    for (let attempt = 0; attempt <= 3; attempt++) {
      try {
        const retry = attempt ? `&_comp_retry=${Date.now()}-${attempt}` : '';
        const separator = baseUrl.includes('?') ? '&' : '?';
        const response = await fetch(`${baseUrl}${separator}${params.toString()}${retry}`, {
          method: 'GET',
          cache: 'no-store',
          credentials: 'omit',
          redirect: 'follow'
        });
        const text = await response.text();
        const result = JSON.parse(text);
        if (response.ok && result?.ok && Array.isArray(result.records)) return result.records;
        lastError = new Error(result?.error || `Gagal membaca Machine List (HTTP ${response.status}).`);
        if (response.status !== 404) break;
      } catch (error) {
        lastError = error;
      }
      if (attempt < 3) await new Promise(resolve => setTimeout(resolve, (attempt + 1) * 700));
    }
    throw lastError || new Error('Gagal membaca Machine List.');
  }

  function buildLocationMap(records) {
    const locationMap = new Map();
    records.forEach(record => {
      const location = normalizeLocationId(record?.locationId);
      const serial = String(record?.serialNumber ?? '').trim();
      if (location && serial) locationMap.set(location, serial);
    });
    return locationMap;
  }

  function getLocationFromRow(row) {
    const ipCell = row.querySelector('.ip-cell');
    const ip = String(ipCell?.textContent ?? '').replace(/\s+/g, '').trim();

    // Do not parse or modify master-data.js. It remains the fixed source of
    // IP -> Location mapping used by the existing analyzer.
    if (ip && window.masterData && Object.prototype.hasOwnProperty.call(window.masterData, ip)) {
      return normalizeLocationId(window.masterData[ip]);
    }

    // Fallback only for the existing rendered Nama DC column.
    const cells = Array.from(row.children);
    return normalizeLocationId(cells[4]?.textContent);
  }

  function ensureHeader(table) {
    const headerRow = table.querySelector('thead tr');
    if (!headerRow) return;

    if (headerRow.querySelector('[data-machine-identity-header="true"]')) return;

    const th = document.createElement('th');
    th.scope = 'col';
    th.textContent = 'Serial Number';
    th.dataset.machineIdentityHeader = 'true';
    headerRow.appendChild(th);
  }

  function augmentIpRepeatTable(records) {
    const table = document.querySelector('.repeat-table');
    if (!table) return;

    ensureHeader(table);
    const locationMap = buildLocationMap(records);
    const body = table.querySelector('#resultsBody') || table.querySelector('tbody');
    if (!body) return;

    body.querySelectorAll('tr').forEach(row => {
      row.querySelector('[data-machine-identity-cell="true"]')?.remove();

      const location = getLocationFromRow(row);
      const serial = locationMap.get(location) || '';

      const td = document.createElement('td');
      td.dataset.machineIdentityCell = 'true';
      td.className = 'machine-identity-cell';
      td.textContent = serial || 'SN Tidak Ditemukan';
      if (!serial) td.classList.add('machine-identity-missing');
      row.appendChild(td);
    });

    const summary = document.getElementById('resultSummary');
    if (summary) {
      let status = document.getElementById('machineIdentityStatus');
      if (!status) {
        status = document.createElement('span');
        status.id = 'machineIdentityStatus';
        status.className = 'machine-identity-status';
        summary.appendChild(document.createTextNode(' '));
        summary.appendChild(status);
      }

      status.textContent = `• SN terhubung (${locationMap.size.toLocaleString('id-ID')} lokasi)`;
      status.classList.remove('error');
    }
  }

  async function initializeIpRepeatIdentity() {
    const table = document.querySelector('.repeat-table');
    if (!table) return;

    try {
      const records = await loadCurrentRecords();
      augmentIpRepeatTable(records);

      const body = table.querySelector('#resultsBody') || table.querySelector('tbody');
      if (body && !body.dataset.machineIdentityObserver) {
        const observer = new MutationObserver(() => augmentIpRepeatTable(records));
        observer.observe(body, { childList: true });
        body.dataset.machineIdentityObserver = 'true';
      }

      // The analyzer can render immediately after upload/filter actions.
      // Re-apply a few times so the identity column never depends on timing.
      [250, 750, 1500].forEach(delay => {
        setTimeout(() => augmentIpRepeatTable(records), delay);
      });
    } catch (error) {
      console.error('Gagal menghubungkan Serial Number ke IP Repeat:', error);
      const summary = document.getElementById('resultSummary');
      if (summary) {
        let status = document.getElementById('machineIdentityStatus');
        if (!status) {
          status = document.createElement('span');
          status.id = 'machineIdentityStatus';
          status.className = 'machine-identity-status';
          summary.appendChild(document.createTextNode(' '));
          summary.appendChild(status);
        }
        status.textContent = '• SN tidak tersedia';
        status.classList.add('error');
      }
    }
  }

  window.CompMachineResolver = {
    resolve,
    parseDate,
    normalizeLocationId,
    loadStoredRecords,
    loadCurrentRecords,
    getStorageKey: () => STORAGE_KEY
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeIpRepeatIdentity, { once: true });
  } else {
    initializeIpRepeatIdentity();
  }
})();
