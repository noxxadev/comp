(() => {
  'use strict';

  const state = {
    rows: [],
    loaded: false
  };

  function getConfig() {
    return window.CompGoogleSheetsConfig || { webAppUrl: '', requestKey: '' };
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function formatDate(value) {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleString('id-ID', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  function normalize(value) {
    return String(value ?? '').trim().toLowerCase();
  }

  function selectedFilters() {
    return {
      serial: normalize(document.getElementById('historySerialFilter')?.value),
      ip: normalize(document.getElementById('historyIpFilter')?.value),
      location: normalize(document.getElementById('historyLocationFilter')?.value),
      engineer: normalize(document.getElementById('historyEngineerFilter')?.value),
      status: normalize(document.getElementById('historyStatusFilter')?.value),
      from: String(document.getElementById('historyFromFilter')?.value || '').trim(),
      to: String(document.getElementById('historyToFilter')?.value || '').trim()
    };
  }

  function rowMatches(row, filters) {
    const timestamp = new Date(row.timestamp);
    const queryFields = {
      serial: normalize(row.serialNumber),
      ip: normalize(row.ip),
      location: `${normalize(row.locationId)} ${normalize(row.name)}`,
      engineer: normalize(row.engineerId),
      status: normalize(row.status)
    };

    if (filters.serial && !queryFields.serial.includes(filters.serial)) return false;
    if (filters.ip && !queryFields.ip.includes(filters.ip)) return false;
    if (filters.location && !queryFields.location.includes(filters.location)) return false;
    if (filters.engineer && !queryFields.engineer.includes(filters.engineer)) return false;
    if (filters.status && queryFields.status !== filters.status) return false;

    if (filters.from) {
      const from = new Date(`${filters.from}T00:00:00`);
      if (Number.isNaN(timestamp.getTime()) || timestamp < from) return false;
    }

    if (filters.to) {
      const to = new Date(`${filters.to}T23:59:59.999`);
      if (Number.isNaN(timestamp.getTime()) || timestamp > to) return false;
    }

    return true;
  }

  function setMessage(message, type = '') {
    const element = document.getElementById('historyMessage');
    if (!element) return;
    element.className = `history-message ${type}`.trim();
    element.textContent = message;
  }

  function updateSummary(filteredRows) {
    const summary = document.getElementById('historySummary');
    if (!summary) return;
    summary.textContent = `${filteredRows.length} event tampil dari ${state.rows.length} event yang dimuat.`;
  }

  function populateEngineerFilter() {
    const select = document.getElementById('historyEngineerFilter');
    if (!select) return;

    const current = select.value;
    const values = [...new Set(state.rows.map(row => String(row.engineerId || '').trim()).filter(Boolean))].sort();
    select.innerHTML = '<option value="">Semua Engineer</option>' + values
      .map(value => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`)
      .join('');

    if (values.includes(current)) select.value = current;
  }

  function render() {
    const body = document.getElementById('historyBody');
    const empty = document.getElementById('historyEmpty');
    if (!body || !empty) return;

    const filters = selectedFilters();
    const filtered = state.rows.filter(row => rowMatches(row, filters));
    updateSummary(filtered);

    if (!filtered.length) {
      body.innerHTML = '';
      empty.hidden = false;
      return;
    }

    empty.hidden = true;
    body.innerHTML = filtered.map((row, index) => {
      const resolution = normalize(row.resolutionStatus);
      const resolutionLabel = resolution || '—';
      const resolutionClass = resolution === 'resolved' ? 'history-badge history-badge-ok' : 'history-badge history-badge-warn';

      return `<tr>
        <td>${index + 1}</td>
        <td><strong>${escapeHtml(row.serialNumber || '—')}</strong></td>
        <td>${escapeHtml(row.ip || '—')}</td>
        <td>${escapeHtml(row.locationId || row.name || '—')}</td>
        <td>${escapeHtml(row.name || '—')}</td>
        <td>${escapeHtml(row.engineerId || '—')}</td>
        <td>${escapeHtml(row.status || '—')}</td>
        <td>${escapeHtml(row.note || '—')}</td>
        <td>${escapeHtml(formatDate(row.timestamp))}</td>
        <td><span class="${resolutionClass}">${escapeHtml(resolutionLabel)}</span></td>
        <td title="${escapeHtml(row.resolutionMessage || '')}">${escapeHtml(row.resolutionMessage || '—')}</td>
      </tr>`;
    }).join('');
  }

  async function loadHistory() {
    const config = getConfig();
    const url = String(config.webAppUrl || '').trim();

    if (!url) {
      setMessage('Google Sheets belum dikonfigurasi.', 'error');
      return;
    }

    const button = document.getElementById('historyLoadBtn');
    if (button) button.disabled = true;
    setMessage('Memuat Work History...', 'loading');

    try {
      const params = new URLSearchParams({
        action: 'getWorkHistory',
        limit: '2000'
      });
      if (String(config.requestKey || '')) params.set('requestKey', String(config.requestKey));

      const response = await fetch(`${url}?${params.toString()}`, { method: 'GET', cache: 'no-store' });
      const text = await response.text();
      let result;

      try {
        result = JSON.parse(text);
      } catch (error) {
        throw new Error(`Response Google Apps Script tidak valid (HTTP ${response.status}).`);
      }

      if (!response.ok || !result?.ok) {
        throw new Error(result?.error || `Gagal mengambil Work History (HTTP ${response.status}).`);
      }

      state.rows = Array.isArray(result.rows) ? result.rows : [];
      state.loaded = true;
      populateEngineerFilter();
      render();
      setMessage(`Work History berhasil dimuat: ${state.rows.length} event.`, 'success');
    } catch (error) {
      setMessage(error.message || 'Gagal memuat Work History.', 'error');
    } finally {
      if (button) button.disabled = false;
    }
  }

  function resetFilters() {
    ['historySerialFilter', 'historyIpFilter', 'historyLocationFilter', 'historyFromFilter', 'historyToFilter']
      .forEach(id => {
        const element = document.getElementById(id);
        if (element) element.value = '';
      });

    const engineer = document.getElementById('historyEngineerFilter');
    if (engineer) engineer.value = '';

    const status = document.getElementById('historyStatusFilter');
    if (status) status.value = '';

    render();
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('historyLoadBtn')?.addEventListener('click', loadHistory);
    document.getElementById('historyResetBtn')?.addEventListener('click', resetFilters);

    ['historySerialFilter', 'historyIpFilter', 'historyLocationFilter', 'historyEngineerFilter', 'historyStatusFilter', 'historyFromFilter', 'historyToFilter']
      .forEach(id => document.getElementById(id)?.addEventListener('input', render));

    loadHistory();
  });

  window.CompHistoryViewer = {
    loadHistory,
    render,
    getRows: () => [...state.rows]
  };
})();
