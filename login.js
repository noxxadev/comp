(() => {
  'use strict';

  document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('loginForm');
    const username = document.getElementById('username');
    const password = document.getElementById('password');
    const status = document.getElementById('loginStatus');
    const button = document.getElementById('loginButton');

    if (!form || !username || !password || !status || !button) return;

    form.addEventListener('submit', async event => {
      event.preventDefault();
      status.textContent = '';
      button.disabled = true;

      try {
        await window.CompAuth.login(username.value, password.value);
        window.location.replace('index.html');
      } catch (error) {
        status.textContent = error.message || 'Login gagal.';
        password.value = '';
      } finally {
        button.disabled = false;
      }
    });
  });
})();