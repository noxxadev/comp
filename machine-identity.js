(() => {
  'use strict';

  const MAX_RETRIES = 3;
  const HEADER_LABEL = 'Serial Number';

  function getConfig() {
    return window.CompGoogleSheetsConfig || { webAppUrl: '', requestKey: '' };
  }

  function normalizeLocationId(value) {
    return String(value ?? '').replace(/\s+/g, ' ').trim().toUpperCase();
  }

  async function fetchMachineList() {
    const config = getConfig();
    const baseUrl = String(config.webAppUrl || '').trim();
    if (!baseUrl) throw new Error('Google Sheets belum dikonfigurasi.');

    const params = new URLSearchParams({ action: 'getMachineList' });
    if (config.requestKey) params.set('requestKey', String(config.requestKey));

    let lastError = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      const url = `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}${params.toString()}${attempt ? `&_comp_retry=${Date.now()}-${attempt}` : ''}`;

      try {
        const response = await fetch(url, {
          method: 'GET',
          cache: 'no-store',
          credentials: 'omit',
          redirect: 'follow'
        });

        const text = await response.text();
        let result;
        try {
          result = JSON.parse(text);
        } catch (_) {
          throw new Error(`Response Machine List tidak valid (HTTP ${response.status}).`);
        }

        if (response.ok && result?.ok && Array.isArray(result.records)) {
          return result;
        }

        lastError = new Error(result?.error || `Gagal membaca Machine List (HTTP ${response.status}).`);
        if (response.status !== 404) break;
      } catch (error) {
        lastError = error;
        if (attempt === MAX_RETRIES) break;
      }

      await new Promise(resolve => setTimeout(resolve, (attempt + 1) * 700));
    }

    throw lastError || new Error('Gagal membaca Machine List.');
  }

  function buildLocationMap(records) {
    const map = new Map();
    records.forEach(record => {
      const locationId = normalizeLocationId(record?.locationId);
      const serialNumber = String(record?.serialNumber ?? '').trim();
      if (!locationId || !serialNumber) return;
      map.set(locationId, serialNumber);
    });
    return map;
  }

  function ensureHeader(table) {
    const headerRow = table.querySelector('thead tr');
    if (!headerRow) return;

    const headers = Array.from(headerRow.children);
    if (headers.some(th => th.dataset.machineIdentityHeader === 'true')) return;

    const th = document.createElement('th');
    th.scope = 'col';
    th.textContent = HEADER_LABEL;
    th.dataset.machineIdentityHeader = 'true';
    headerRow.appendChild(th);
  }

  function augmentRows(table, locationMap) {
    const body = table.querySelector('tbody');
    if (!body) return;

    body.querySelectorAll('tr').forEach(row => {
      const cells = Array.from(row.children);
      if (!cells.length) return;

      const existing = row.querySelector('[data-machine-identity-cell="true"]');
      if (existing) existing.remove();

      // Current table structure: Select, No, IP, Repeat Zero, Nama DC, Zona.
      const locationCell = cells[4];
      const locationId = normalizeLocationId(locationCell?.textContent);
      const serialNumber = locationMap.get(locationId);

      const td = document.createElement('td');
      td.dataset.machineIdentityCell = 'true';
      td.className = 'machine-identity-cell';
      td.textContent = serialNumber || 'SN Tidak Ditemukan';
      if (!serialNumber) td.classList.add('machine-identity-missing');
      row.appendChild(td);
    });
  }

  function updateSummaryStatus(message, isError = false) {
    const summary = document.getElementById('resultSummary');
    if (!summary) return;

    let status = document.getElementById('machineIdentityStatus');
    if (!status) {
      status = document.createElement('span');
      status.id = 'machineIdentityStatus';
      status.className = 'machine-identity-status';
      summary.appendChild(document.createTextNode(' '));
      summary.appendChild(status);
    }

    status.textContent = message;
    status.classList.toggle('error', isError);
  }

  async function initialize() {
    const table = document.querySelector('.repeat-table');
    if (!table) return;

    ensureHeader(table);
    updateSummaryStatus('Memuat Machine List...');

    try {
      const result = await fetchMachineList();
      const locationMap = buildLocationMap(result.records);

      augmentRows(table, locationMap);
      updateSummaryStatus(`SN terhubung • ${locationMap.size.toLocaleString('id-ID')} lokasi`);

      const body = table.querySelector('tbody');
      if (body) {
        const observer = new MutationObserver(() => augmentRows(table, locationMap));
        observer.observe(body, { childList: true });
      }
    } catch (error) {
      console.error('Machine Identity:', error);
      augmentRows(table, new Map());
      updateSummaryStatus('SN tidak tersedia', true);
    }
  }

  window.CompMachineIdentity = {
    load: initialize,
    fetchMachineList,
    normalizeLocationId
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize, { once: true });
  } else {
    initialize();
  }
})();
