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

    // Machine List normally uses: YYYY-MM-DD HH:mm:ss
    const normalized = text.replace(' ', 'T');
    const parsed = new Date(normalized);
    if (!Number.isNaN(parsed.getTime())) return parsed;

    // Safe fallback for common slash-formatted dates.
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

      // A record must have a valid installation boundary. Unparseable dates are
      // not treated as open-ended because guessing machine identity is forbidden.
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

  window.CompMachineResolver = {
    resolve,
    parseDate,
    normalizeLocationId,
    loadStoredRecords,
    getStorageKey: () => STORAGE_KEY
  };
})();
