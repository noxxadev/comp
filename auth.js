(() => {
  'use strict';

  const SESSION_KEY = 'comp.auth.session';
  const USER_KEY = 'comp.auth.user';

  function getConfig() {
    return window.CompGoogleSheetsConfig || { webAppUrl: '', requestKey: '' };
  }

  function getSession() {
    return sessionStorage.getItem(SESSION_KEY) || '';
  }

  function getUser() {
    try { return JSON.parse(sessionStorage.getItem(USER_KEY) || 'null'); } catch (_) { return null; }
  }

  function setAuth(session, user) {
    sessionStorage.setItem(SESSION_KEY, session);
    sessionStorage.setItem(USER_KEY, JSON.stringify(user || null));
  }

  function clearAuth() {
    sessionStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(USER_KEY);
  }

  async function request(action, payload = {}) {
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

  async function validateSession() {
    const session = getSession();
    if (!session) return { ok: false, authenticated: false };
    try {
      const result = await request('validateSession', { session });
      if (!result?.authenticated) clearAuth();
      else if (result.user) sessionStorage.setItem(USER_KEY, JSON.stringify(result.user));
      return result;
    } catch (error) {
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