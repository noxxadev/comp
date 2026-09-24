(() => {
  'use strict';

  const SESSION_KEY = 'comp.auth.session';
  const USER_KEY = 'comp.auth.user';
  const SESSION_VALIDATED_AT_KEY = 'comp.auth.sessionValidatedAt';
  const SESSION_VALIDATION_TTL_MS = 5 * 60 * 1000;
  const authStorage = window.localStorage;

  function getConfig() {
    return window.CompGoogleSheetsConfig || { webAppUrl: '', requestKey: '' };
  }

  function getSession() {
    return authStorage.getItem(SESSION_KEY) || '';
  }

  function getUser() {
    try { return JSON.parse(authStorage.getItem(USER_KEY) || 'null'); } catch (_) { return null; }
  }

  function setAuth(session, user) {
    authStorage.setItem(SESSION_KEY, session);
    authStorage.setItem(USER_KEY, JSON.stringify(user || null));
    authStorage.removeItem(SESSION_VALIDATED_AT_KEY);
  }

  function clearAuth() {
    authStorage.removeItem(SESSION_KEY);
    authStorage.removeItem(USER_KEY);
    authStorage.removeItem(SESSION_VALIDATED_AT_KEY);
  }

  async function request(action, payload = {}) {
    const perfStart = performance.now();
    const config = getConfig();
    const url = String(config.webAppUrl || '').trim();
    if (!url) throw new Error('Google Apps Script belum dikonfigurasi.');

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
      body: JSON.stringify({
        action,
        ...payload,
        requestKey: String(config.requestKey || '')
      }),
      cache: 'no-store',
      credentials: 'omit',
      redirect: 'follow'
    });

    const raw = await response.text();
    console.debug(`[COMP PERF] Apps Script ${action}: ${(performance.now() - perfStart).toFixed(0)} ms (HTTP ${response.status})`);
    let result;
    try { result = JSON.parse(raw); } catch (_) { throw new Error('Response authentication tidak valid.'); }
    if (!response.ok) throw new Error(result?.error || 'Authentication request gagal.');
    return result;
  }

  async function login(username, password) {
    const result = await request('login', { username, password });
    if (!result?.ok || !result.session) throw new Error(result?.error || 'Login gagal.');
    setAuth(result.session, result.user);
    return result;
  }

  function isSessionValidationFresh() {
    const value = Number(authStorage.getItem(SESSION_VALIDATED_AT_KEY) || 0);
    return Number.isFinite(value) && value > 0 && (Date.now() - value) < SESSION_VALIDATION_TTL_MS;
  }

  async function validateSession(options = {}) {
    const perfStart = performance.now();
    if (!options.force && isSessionValidationFresh()) {
      return { ok: true, authenticated: true, user: getUser(), cached: true };
    }
    const session = getSession();
    if (!session) return { ok: false, authenticated: false };
    try {
      const result = await request('validateSession', { session });
      if (!result?.authenticated) clearAuth();
      else {
        if (result.user) authStorage.setItem(USER_KEY, JSON.stringify(result.user));
        authStorage.setItem(SESSION_VALIDATED_AT_KEY, String(Date.now()));
      }
      console.debug(`[COMP PERF] validateSession total: ${(performance.now() - perfStart).toFixed(0)} ms (authenticated=${Boolean(result?.authenticated)})`);
      return result;
    } catch (error) {
      console.debug(`[COMP PERF] validateSession total: ${(performance.now() - perfStart).toFixed(0)} ms (error)`);
      return { ok: false, authenticated: false, error: error.message || 'Session tidak dapat diverifikasi.' };
    }
  }

  async function logout() {
    const session = getSession();
    try {
      if (session) await request('logout', { session });
    } finally {
      clearAuth();
    }
  }

  window.CompAuth = {
    login,
    validateSession,
    logout,
    getSession,
    getUser,
    clearAuth
  };
})();
