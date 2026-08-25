(function () {
  const api = window.cymorApi;
  const toast = window.cymorToast;

  const loginView = document.getElementById('admin-login-view');
  const shell = document.getElementById('admin-shell');

  function showShell() {
    loginView.style.display = 'none';
    shell.classList.add('active');
    loadAnalytics();
  }

  document.getElementById('admin-login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      await api.post('/api/admin/login', { email: fd.get('email'), password: fd.get('password') });
      showShell();
    } catch (err) {
      toast(err.message, 'error');
    }
  });

  document.getElementById('admin-logout').addEventListener('click', async () => {
    await api.post('/api/admin/logout').catch(() => {});
    shell.classList.remove('active');
    loginView.style.display = 'flex';
  });

  document.querySelectorAll('[data-admin-page]').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.admin-page').forEach((p) => p.classList.toggle('active', p.id === `admin-page-${btn.dataset.adminPage}`));
      document.querySelectorAll('[data-admin-page]').forEach((b) => b.classList.toggle('active', b === btn));
      if (btn.dataset.adminPage === 'broadcast') loadBroadcasts();
      if (btn.dataset.adminPage === 'maintenance') loadMaintenance();
      if (btn.dataset.adminPage === 'logs') loadLogs();
    });
  });

  async function loadAnalytics() {
    try {
      const a = await api.get('/api/admin/analytics');
      document.getElementById('admin-stats').innerHTML = `
        <div class="card stat-card"><div class="stat-label">Businesses</div><div class="stat-value">${a.businesses}</div></div>
        <div class="card stat-card"><div class="stat-label">Active Businesses</div><div class="stat-value">${a.activeBusinesses}</div></div>
        <div class="card stat-card"><div class="stat-label">Telegram Users</div><div class="stat-value">${a.telegramUsers}</div></div>
        <div class="card stat-card"><div class="stat-label">Orders Today</div><div class="stat-value">${a.ordersToday}</div></div>
        <div class="card stat-card"><div class="stat-label">Orders This Month</div><div class="stat-value">${a.ordersMonth}</div></div>
        <div class="card stat-card"><div class="stat-label">PDFs Generated</div><div class="stat-value">${a.pdfsGenerated}</div></div>
        <div class="card stat-card"><div class="stat-label">AI Requests</div><div class="stat-value">${a.aiRequests}</div></div>
        <div class="card stat-card"><div class="stat-label">System Status</div><div class="stat-value">🟢 ${a.systemStatus}</div></div>`;
    } catch (err) {
      if (err.message.includes('Admin')) { shell.classList.remove('active'); loginView.style.display = 'flex'; }
      toast(err.message, 'error');
    }
  }

  document.getElementById('broadcast-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    if (!confirm('Send this broadcast now? This will message real users.')) return;
    try {
      await api.post('/api/admin/broadcasts', { message: fd.get('message'), target: fd.get('target') });
      toast('Broadcast sent', 'success');
      e.target.reset();
      loadBroadcasts();
    } catch (err) { toast(err.message, 'error'); }
  });

  async function loadBroadcasts() {
    const el = document.getElementById('broadcast-history');
    try {
      const res = await api.get('/api/admin/broadcasts');
      el.innerHTML = res.broadcasts.length ? `<table><thead><tr><th>Message</th><th>Target</th><th>Success</th><th>Failed</th><th>Status</th></tr></thead><tbody>
        ${res.broadcasts.map((b) => `<tr><td>${b.message.slice(0, 60)}</td><td>${b.target}</td><td>${b.successCount}</td><td>${b.failureCount}</td><td>${b.status}</td></tr>`).join('')}
      </tbody></table>` : `<div class="empty-state">No broadcasts sent yet.</div>`;
    } catch (err) { toast(err.message, 'error'); }
  }

  async function loadMaintenance() {
    try {
      const res = await api.get('/api/admin/maintenance');
      const form = document.getElementById('maintenance-form');
      form.elements.maintenanceMode.checked = res.maintenanceMode;
      form.elements.maintenanceMessage.value = res.maintenanceMessage;
    } catch (err) { toast(err.message, 'error'); }
  }
  document.getElementById('maintenance-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    try {
      await api.patch('/api/admin/maintenance', {
        maintenanceMode: form.elements.maintenanceMode.checked,
        maintenanceMessage: form.elements.maintenanceMessage.value,
      });
      toast('Maintenance settings saved', 'success');
    } catch (err) { toast(err.message, 'error'); }
  });

  async function loadLogs() {
    const el = document.getElementById('logs-table');
    try {
      const res = await api.get('/api/admin/activity-logs');
      el.innerHTML = res.items.length ? `<table><thead><tr><th>Action</th><th>Time</th></tr></thead><tbody>
        ${res.items.map((l) => `<tr><td>${l.action}</td><td>${new Date(l.createdAt).toLocaleString()}</td></tr>`).join('')}
      </tbody></table>` : `<div class="empty-state">No activity yet.</div>`;
    } catch (err) { toast(err.message, 'error'); }
  }

  // Try loading analytics immediately in case a valid admin cookie already exists.
  api.get('/api/admin/analytics').then(showShell).catch(() => {});
})();
