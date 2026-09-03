window.CompGoogleSheetsConfig = {
  // Paste the deployed Google Apps Script Web App /exec URL here.
  // Example: https://script.google.com/macros/s/DEPLOYMENT_ID/exec
  webAppUrl: 'https://script.google.com/macros/s/AKfycbwSor7ZeiCmZ4QsFRXEZUbpS3rL0A_b28MRF9hm-U_zhGvOKUFMAH5OZZiOky4Xf2-paA/exec',

  // Optional request key. This must match REQUEST_KEY in Code.gs.
  // Leave both empty to disable the extra request-key check.
  requestKey: ''
};

// Google Apps Script ContentService responses are redirected to a temporary
// script.googleusercontent.com URL. Google documents that clients must follow
// this redirect, and there is also a known intermittent 404 issue in this
// redirect path. The Machine List GET is read-only, so safely retry it.
(() => {
  'use strict';

  const originalFetch = window.fetch.bind(window);
  const TARGET_ACTION = 'getMachineList';
  const MAX_RETRIES = 3;

  function isMachineListGet(input, init) {
    const method = String(init?.method || 'GET').toUpperCase();
    if (method !== 'GET') return false;

    try {
      const rawUrl = typeof input === 'string' ? input : input?.url || String(input);
      return new URL(rawUrl, window.location.href).searchParams.get('action') === TARGET_ACTION;
    } catch (_) {
      return false;
    }
  }

  function retryUrl(input, attempt) {
    const rawUrl = typeof input === 'string' ? input : input?.url || String(input);
    const url = new URL(rawUrl, window.location.href);
    url.searchParams.set('_comp_retry', `${Date.now()}-${attempt}`);
    return url.toString();
  }

  window.fetch = async function(input, init) {
    if (!isMachineListGet(input, init)) {
      return originalFetch(input, init);
    }

    let response = await originalFetch(input, {
      ...(init || {}),
      method: 'GET',
      cache: 'no-store',
      credentials: 'omit',
      redirect: 'follow'
    });

    for (let attempt = 1; attempt <= MAX_RETRIES && response.status === 404; attempt++) {
      await new Promise(resolve => setTimeout(resolve, attempt * 700));
      response = await originalFetch(retryUrl(input, attempt), {
        ...(init || {}),
        method: 'GET',
        cache: 'no-store',
        credentials: 'omit',
        redirect: 'follow'
      });
    }

    return response;
  };
})();
