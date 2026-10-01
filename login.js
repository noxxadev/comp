(() => {
  'use strict';

  document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('loginForm');
    const username = document.getElementById('username');
    const password = document.getElementById('password');
    const passwordToggle = document.getElementById('passwordToggle');
    const status = document.getElementById('loginStatus');
    const button = document.getElementById('loginButton');
    const buttonText = document.getElementById('loginButtonText');

    if (!form || !username || !password || !status || !button) return;

    if (passwordToggle) {
      passwordToggle.addEventListener('click', () => {
        const isVisible = password.type === 'text';
        password.type = isVisible ? 'password' : 'text';
        passwordToggle.setAttribute('aria-label', isVisible ? 'Tampilkan password' : 'Sembunyikan password');
        passwordToggle.setAttribute('aria-pressed', String(!isVisible));
        passwordToggle.setAttribute('title', isVisible ? 'Tampilkan password' : 'Sembunyikan password');

        const icon = passwordToggle.querySelector('i');
        if (icon) {
          icon.classList.toggle('fa-eye', isVisible);
          icon.classList.toggle('fa-eye-slash', !isVisible);
        }
      });
    }

    form.addEventListener('submit', async event => {
      event.preventDefault();
      status.textContent = '';
      button.disabled = true;
      button.setAttribute('aria-busy', 'true');
      if (buttonText) buttonText.textContent = 'Memproses login…';

      try {
        await window.CompAuth.login(username.value, password.value);
        window.location.replace('index.html');
      } catch (error) {
        status.textContent = error.message || 'Login gagal.';
        password.value = '';
      } finally {
        button.disabled = false;
        button.removeAttribute('aria-busy');
        if (buttonText) buttonText.textContent = 'Login';
      }
    });
  });
})();