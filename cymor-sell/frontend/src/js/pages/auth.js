(function () {
  const tabLogin = document.getElementById('tab-login');
  const tabRegister = document.getElementById('tab-register');
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');

  function showLogin() {
    tabLogin.classList.add('active');
    tabRegister.classList.remove('active');
    loginForm.classList.add('active');
    registerForm.classList.remove('active');
  }
  function showRegister() {
    tabRegister.classList.add('active');
    tabLogin.classList.remove('active');
    registerForm.classList.add('active');
    loginForm.classList.remove('active');
  }
  tabLogin?.addEventListener('click', showLogin);
  tabRegister?.addEventListener('click', showRegister);

  // If arriving from the Telegram management bot deep link, jump to register.
  const params = new URLSearchParams(window.location.search);
  if (params.get('telegram_id')) showRegister();

  loginForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(loginForm);
    try {
      const res = await window.cymorApi.post('/api/auth/login', {
        email: fd.get('email'),
        password: fd.get('password'),
      });
      localStorage.setItem('cymor_token', res.token);
      window.cymorToast('Welcome back!', 'success');
      window.location.href = res.business ? '/dashboard.html' : '/dashboard.html';
    } catch (err) {
      window.cymorToast(err.message, 'error');
    }
  });

  registerForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(registerForm);
    try {
      const res = await window.cymorApi.post('/api/auth/register', {
        name: fd.get('name'),
        email: fd.get('email'),
        password: fd.get('password'),
      });
      localStorage.setItem('cymor_token', res.token);
      window.cymorToast('Account created!', 'success');
      window.location.href = '/dashboard.html';
    } catch (err) {
      window.cymorToast(err.message, 'error');
    }
  });
})();
