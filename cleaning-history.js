(() => {
  'use strict';

  function getConfig() {
    return window.CompGoogleSheetsConfig || { webAppUrl: '', requestKey: '' };
  }

  async function loadHistory(limit = 2000) {
    const config = getConfig();
    const baseUrl = String(config.webAppUrl || '').trim();
    if (!baseUrl) throw new Error('Google Sheets belum dikonfigurasi.');

    const params = new URLSearchParams({ action: 'getWorkItems', limit: String(limit) });
    if (config.requestKey) params.set('requestKey', String(config.requestKey));

    const separator = baseUrl.includes('?') ? '&' : '?';
    const response = await fetch(`${baseUrl}${separator}${params.toString()}`, {
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
      throw new Error(`Response Work Items tidak valid (HTTP ${response.status}).`);
    }

    if (!response.ok || !result?.ok) {
      throw new Error(result?.error || `Gagal membaca Work Items (HTTP ${response.status}).`);
    }

    return result;
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function formatTimestamp(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value || '-');
    return date.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
  }

  function render(rows, total) {
    const body = document.getElementById('historyBody');
    const summary = document.getElementById('historySummary');
    const empty = document.getElementById('historyEmpty');
    if (!body || !summary || !empty) return;

    body.innerHTML = '';
    empty.hidden = rows.length > 0;

    rows.forEach(row => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${escapeHtml(row.ip || '-')}</td>
        <td>${escapeHtml(row.name || '-')}</td>
        <td>${escapeHtml(row.zone || '-')}</td>
        <td>${escapeHtml(String(row.repeat ?? '-'))}</td>
        <td><strong>${escapeHtml(row.serialNumber || '-')}</strong></td>
        <td><strong>${escapeHtml(String(row.cleaningCount ?? '-'))}</strong></td>
        <td>${escapeHtml(row.engineerId || '-')}</td>
        <td>${escapeHtml(row.status || '-')}</td>
        <td>${escapeHtml(formatTimestamp(row.timestamp))}</td>
        <td>${escapeHtml(row.note || '-')}</td>
      `;
      body.appendChild(tr);
    });

    summary.textContent = `Menampilkan ${rows.length.toLocaleString('id-ID')} Work Item dari ${Number(total || 0).toLocaleString('id-ID')} total item.`;
  }

  async function refresh() {
    const status = document.getElementById('historyStatus');
    const refreshButton = document.getElementById('refreshHistoryBtn');
    if (status) status.textContent = 'Memuat...';
    if (refreshButton) refreshButton.disabled = true;

    try {
      const result = await loadHistory();
      render(Array.isArray(result.rows) ? result.rows : [], result.total);
      if (status) status.textContent = 'Google Sheets — Work Items';
    } catch (error) {
      console.error('Cleaning History:', error);
      render([], 0);
      if (status) status.textContent = `Gagal: ${error.message || 'tidak tersedia'}`;
    } finally {
      if (refreshButton) refreshButton.disabled = false;
    }
  }

  window.CompCleaningHistory = { loadHistory, refresh };

  document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('refreshHistoryBtn')?.addEventListener('click', refresh);
    refresh();
  }, { once: true });
})();
