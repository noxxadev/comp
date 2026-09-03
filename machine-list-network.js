(() => {
  'use strict';

  // Google Apps Script ContentService can intermittently return HTTP 404 on the
  // redirect from script.google.com to script.googleusercontent.com. The
  // Machine List reader is read-only, so retrying the GET is safe.
  const originalFetch = window.fetch.bind(window);
  const TARGET_ACTION = 'getMachineList';
  const MAX_RETRIES = 3;

  function isMachineListGet(input, init) {
    const method = String(init?.method || 'GET').toUpperCase();
    if (method !== 'GET') return false;

    try {
      const url = typeof input === 'string'
        ? input
        : input?.url || String(input);
      return new URL(url, window.location.href).searchParams.get('action') === TARGET_ACTION;
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
