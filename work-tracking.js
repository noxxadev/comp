(() => {
  'use strict';

  const STATUSES = ['Belum Dikerjakan', 'In Progress', 'Selesai', 'Problem', 'Skipped'];

  function getConfig() {
    return window.CompGoogleSheetsConfig || { webAppUrl: '', requestKey: '' };
  }

  function loadWorkItems() {
    return {};
  }

  async function postToGoogleSheets(payload) {
    const config = getConfig();
    const url = String(config.webAppUrl || '').trim();

    if (!url) {
      throw new Error('Google Sheets belum dikonfigurasi. Isi webAppUrl pada google-sheets-config.js.');
    }

    let response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
        body: JSON.stringify({
          ...payload,
          requestKey: String(config.requestKey || '')
        })
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

    return result;
  }

  async function saveWorkItems(items) {
    const result = await postToGoogleSheets({
      action: 'upsertWorkItems',
      items
    });

    let historyResult = {
      ok: true,
      saved: 0,
      attempted: 0,
      unresolved: 0
    };

    try {
      const events = await buildWorkHistoryEvents(items);
      historyResult.attempted = events.length;

      if (events.length) {
        const historyResponse = await postToGoogleSheets({
          action: 'appendWorkHistory',
          events
        });

        historyResult = {
          ...historyResult,
          ok: true,
          saved: Number(historyResponse.saved || 0),
          unresolved: events.filter(event => event.resolutionStatus !== 'resolved').length
        };

        if (historyResult.saved !== historyResult.attempted) {
          console.warn(
            `Work History menyimpan ${historyResult.saved} dari ${historyResult.attempted} event.`,
            historyResponse
          );
        }
      }
    } catch (error) {
      historyResult = {
        ...historyResult,
        ok: false,
        error: error.message || 'Gagal menyimpan Work History.'
      };
      console.error('Work History gagal disimpan. Work Items tetap berhasil disimpan.', error);
    }

    return {
      ok: true,
      saved: Number(result.saved || 0),
      updatedAt: result.updatedAt || null,
      history: historyResult
    };
  }

  function createEventId() {
    if (window.crypto?.randomUUID) return window.crypto.randomUUID();
    return `evt-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }

  function normalizeLocation(value) {
    return String(value ?? '').replace(/\s+/g, ' ').trim().toUpperCase();
  }

  function resolveCurrentMachine(locationId, records = []) {
    const target = normalizeLocation(locationId);
    if (!target || !Array.isArray(records)) return null;

    const matches = records.filter(record => normalizeLocation(record?.locationId) === target);
    if (matches.length !== 1) return null;

    const serialNumber = String(matches[0]?.serialNumber || '').trim();
    return serialNumber ? { serialNumber } : null;
  }

  async function buildWorkHistoryEvents(items) {
    const resolver = window.CompMachineResolver;
    const rows = Object.values(items || {});
    const fallbackTimestamp = new Date().toISOString();

    // Use the same current Machine List source that powers the Serial Number
    // shown in IP Repeat Analyzer. This prevents a stale/empty localStorage
    // snapshot from causing Work History to lose the Serial Number.
    let currentRecords = [];
    try {
      if (resolver?.loadCurrentRecords) {
        currentRecords = await resolver.loadCurrentRecords();
      }
    } catch (error) {
      console.warn('Machine List Current gagal dimuat saat menyimpan Work History:', error);
    }

    return rows.map(item => {
      const timestamp = String(item?.timestamp || fallbackTimestamp).trim() || fallbackTimestamp;
      const locationId = String(item?.locationId || item?.name || '').trim();
      let resolution = null;

      if (resolver?.resolve) {
        if (locationId === 'Bukan IP DC') {
          resolution = {
            status: 'missing-location',
            serialNumber: '',
            message: 'Location ID tidak tersedia karena IP tidak memiliki mapping Nama DC.'
          };
        } else {
          resolution = resolver.resolve(locationId, timestamp);

          // Prefer the current Machine List when resolving a new work event.
          // This is also the fallback when the historical resolver cannot
          // resolve because installation dates are unavailable.
          const currentMachine = resolveCurrentMachine(locationId, currentRecords);
          if (currentMachine) {
            resolution = {
              status: 'resolved',
              serialNumber: currentMachine.serialNumber,
              message: 'Serial Number ditemukan dari Machine List Current.'
            };
          }
        }
      } else {
        resolution = {
          status: 'unresolved',
          serialNumber: '',
          message: 'Machine Resolver tidak tersedia pada halaman ini.'
        };
      }

      return {
        eventId: createEventId(),
        timestamp,
        ip: String(item?.ip || '').trim(),
        serialNumber: String(resolution?.serialNumber || '').trim(),
        locationId,
        name: String(item?.name || '').trim(),
        zone: String(item?.zone || '-').trim() || '-',
        repeat: Number(item?.repeat || 0),
        engineerId: String(item?.engineerId || '').trim(),
        engineerName: String(item?.engineerName || '').trim(),
        status: String(item?.status || '').trim(),
        note: String(item?.note || '').trim(),
        resolutionStatus: String(resolution?.status || 'unresolved').trim(),
        resolutionMessage: String(resolution?.message || '').trim()
      };
    });
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
    buildWorkItems,
    buildWorkHistoryEvents
  };
})();
