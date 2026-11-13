'use strict';

const MAX_BODY_BYTES = 1024 * 1024;
const ALLOWED_ACTIONS = new Set([
  'validateAccess',
  'createPriorityRequest', 'retryPriorityRequest', 'listPriorityRequests',
  'acceptPriorityRequest', 'startPriorityRequest', 'rejectPriorityRequest',
  'reschedulePriorityRequest', 'cancelPriorityRequest', 'respondCancelPriorityRequest',
  'createDailyReport', 'listDailyReports', 'getDailyReport', 'reviewDailyReport',
  'markDailyReportPrinted', 'getHighTempSummary', 'getHistory', 'saveWork'
]);

async function readRequestBody(req) {
  if (typeof req.body === 'string') return req.body;
  if (req.body && typeof req.body === 'object') return JSON.stringify(req.body);
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) {
      const error = new Error('Ukuran request melebihi batas 1 MB.');
      error.statusCode = 413;
      throw error;
    }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf8');
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed.' });
  }

  const endpoint = process.env.CSI_WEB_APP_URL;
  if (!endpoint || !/^https:\/\/script\.google\.com\/(?:a\/macros\/[^/]+\/s|macros\/s)\/[^/]+\/exec(?:\?.*)?$/.test(endpoint)) {
    return res.status(503).json({ ok: false, error: 'Konfigurasi backend CSI di Vercel belum valid.' });
  }

  try {
    const raw = await readRequestBody(req);
    if (Buffer.byteLength(raw, 'utf8') > MAX_BODY_BYTES) {
      return res.status(413).json({ ok: false, error: 'Ukuran request melebihi batas 1 MB.' });
    }
    let payload;
    try { payload = JSON.parse(raw || '{}'); }
    catch (_) { return res.status(400).json({ ok: false, error: 'Format request CSI tidak valid.' }); }

    if (!payload || typeof payload !== 'object' || Array.isArray(payload) ||
        typeof payload.action !== 'string' || !ALLOWED_ACTIONS.has(payload.action)) {
      return res.status(400).json({ ok: false, error: 'Aksi CSI tidak diizinkan.' });
    }

    const upstream = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=UTF-8', 'Accept': 'application/json' },
      body: JSON.stringify(payload),
      redirect: 'follow',
      cache: 'no-store',
      signal: AbortSignal.timeout(25000)
    });

    const text = await upstream.text();
    let data;
    try { data = JSON.parse(text); }
    catch (_) {
      console.error('[CSI proxy] Upstream returned non-JSON response', {
        status: upstream.status,
        contentType: upstream.headers.get('content-type'),
        finalHost: (() => { try { return new URL(upstream.url).host; } catch (_) { return ''; } })()
      });
      return res.status(502).json({
        ok: false,
        error: 'Backend CSI tidak mengembalikan JSON. Periksa akses/deployment Google Apps Script.'
      });
    }

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.status(upstream.ok ? 200 : upstream.status).send(data);
  } catch (error) {
    const status = error.statusCode || (error.name === 'TimeoutError' ? 504 : 502);
    console.error('[CSI proxy] Request failed:', error.message);
    return res.status(status).json({
      ok: false,
      error: status === 504 ? 'Backend CSI tidak merespons dalam batas waktu.' : 'Gagal menghubungi backend CSI.'
    });
  }
};

module.exports.config = { maxDuration: 30 };
