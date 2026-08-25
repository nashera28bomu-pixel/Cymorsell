(function () {
  const api = window.cymorApi;
  const toast = window.cymorToast;
  let state = { user: null, business: null };

  const pages = document.querySelectorAll('.page');
  const navlinks = document.querySelectorAll('.navlink');

  function showPage(name) {
    pages.forEach((p) => p.classList.toggle('active', p.id === `page-${name}`));
    navlinks.forEach((n) => n.classList.toggle('active', n.dataset.page === name));
    if (name === 'products') loadProducts();
    if (name === 'orders') loadOrders();
    if (name === 'customers') loadCustomers();
    if (name === 'delivery') loadZones();
    if (name === 'payments') loadPaymentSettings();
    if (name === 'salesagent') loadSalesAgent();
    if (name === 'telegram') loadTelegramStatus();
    if (name === 'analytics') loadAnalytics();
    if (name === 'settings') loadSettingsForm();
    if (name === 'overview') loadOverview();
  }

  navlinks.forEach((btn) => {
    btn.addEventListener('click', () => {
      if (btn.dataset.page) showPage(btn.dataset.page);
    });
  });
  document.querySelectorAll('[data-page-link]').forEach((btn) => {
    btn.addEventListener('click', () => showPage(btn.dataset.pageLink));
  });

  document.getElementById('logout-btn').addEventListener('click', async () => {
    await api.post('/api/auth/logout').catch(() => {});
    localStorage.removeItem('cymor_token');
    window.location.href = '/';
  });

  function money(n) {
    return `KSh ${Number(n || 0).toLocaleString('en-KE')}`;
  }
  function statusBadgeClass(status) {
    if (status === 'PAID' || status === 'COMPLETED') return 'badge-green';
    if (status === 'PAYMENT_REJECTED' || status === 'CANCELLED') return 'badge-red';
    if (status === 'PAYMENT_VERIFICATION') return 'badge-amber';
    return 'badge-gray';
  }
  function emptyState(icon, text) {
    return `<div class="empty-state"><div class="icon">${icon}</div><div>${text}</div></div>`;
  }
  function skeletonRows(n = 3) {
    return Array.from({ length: n }).map(() => `<div class="skeleton" style="height:44px;margin-bottom:10px;"></div>`).join('');
  }

  // ---------------- BOOTSTRAP ----------------
  async function bootstrap() {
    try {
      const res = await api.get('/api/auth/me');
      state.user = res.user;
      state.business = res.business;
    } catch (err) {
      window.location.href = '/';
      return;
    }

    document.getElementById('avatar-btn').textContent = (state.user.name || '?').slice(0, 1).toUpperCase();

    if (!state.business) {
      startSetupWizard();
      return;
    }
    if (!state.business.isSetupComplete) {
      startSetupWizard();
      return;
    }

    document.getElementById('business-name-header').textContent = state.business.name;
    showPage('overview');
  }

  // ---------------- SETUP WIZARD ----------------
  const WIZARD_STEPS = ['Business Info', 'Products', 'Delivery', 'Payment', 'Branding', 'Sales Agent'];

  function renderWizardSteps(current) {
    const el = document.getElementById('wizard-steps');
    el.innerHTML = WIZARD_STEPS.map((label, i) => {
      const step = i + 1;
      const cls = step < current ? 'done' : step === current ? 'current' : '';
      return `<span class="${cls}">${step}. ${label}</span>`;
    }).join('');
  }

  function startSetupWizard() {
    document.querySelectorAll('.page').forEach((p) => p.classList.remove('active'));
    document.getElementById('page-setup').classList.add('active');
    document.getElementById('business-name-header').textContent = state.business ? state.business.name : 'Set up your business';
    const step = state.business ? state.business.setupStep || 1 : 1;
    renderWizardSteps(step);
    renderWizardStep(step);
  }

  function renderWizardStep(step) {
    const content = document.getElementById('wizard-content');
    if (step === 1 || !state.business) {
      content.innerHTML = `
        <h3 style="margin-bottom:16px;">Tell us about your business</h3>
        <form id="wizard-form-1">
          <div class="field"><label>Business Name</label><input name="name" required /></div>
          <div class="field"><label>Description</label><textarea name="description" rows="2"></textarea></div>
          <div class="field-row">
            <div class="field"><label>Phone</label><input name="phone" /></div>
            <div class="field"><label>Email</label><input name="email" /></div>
          </div>
          <div class="field-row">
            <div class="field"><label>Location</label><input name="location" /></div>
            <div class="field"><label>Opening Hours</label><input name="openingHours" placeholder="Mon-Sat 8am-6pm" /></div>
          </div>
          <div class="field"><label>Address</label><input name="address" /></div>
          <button class="btn btn-primary" type="submit">Continue →</button>
        </form>`;
      document.getElementById('wizard-form-1').addEventListener('submit', async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const payload = Object.fromEntries(fd.entries());
        try {
          if (!state.business) {
            const res = await api.post('/api/business', payload);
            state.business = res.business;
          } else {
            const res = await api.patch('/api/business/me', { ...payload, setupStep: 2 });
            state.business = res.business;
          }
          state.business.setupStep = 2;
          renderWizardSteps(2);
          renderWizardStep(2);
        } catch (err) {
          toast(err.message, 'error');
        }
      });
      return;
    }

    if (step === 2) {
      content.innerHTML = `
        <h3 style="margin-bottom:16px;">Add your first products</h3>
        <p class="muted" style="font-size:14px;margin-bottom:16px;">You can add more (and import via CSV) any time from the Products tab. Add at least one now, or skip.</p>
        <form id="wizard-form-2">
          <div class="field"><label>Product Name</label><input name="name" /></div>
          <div class="field-row">
            <div class="field"><label>Price (KSh)</label><input name="price" type="number" min="0" /></div>
            <div class="field"><label>Stock</label><input name="stock" type="number" min="0" value="10" /></div>
          </div>
          <div class="field"><label>Description</label><textarea name="description" rows="2"></textarea></div>
          <div style="display:flex;gap:10px;">
            <button class="btn btn-ghost" type="button" id="wizard-skip-2">Skip for now</button>
            <button class="btn btn-primary" type="submit">Add &amp; Continue →</button>
          </div>
        </form>`;
      document.getElementById('wizard-skip-2').addEventListener('click', () => goToStep(3));
      document.getElementById('wizard-form-2').addEventListener('submit', async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const name = fd.get('name');
        if (name) {
          try {
            await api.post('/api/products', {
              name, description: fd.get('description'),
              price: parseFloat(fd.get('price')) || 0,
              stock: parseInt(fd.get('stock'), 10) || 0,
            });
          } catch (err) { toast(err.message, 'error'); return; }
        }
        goToStep(3);
      });
      return;
    }

    if (step === 3) {
      content.innerHTML = `
        <h3 style="margin-bottom:16px;">Set up delivery</h3>
        <form id="wizard-form-3">
          <div class="field"><label>Zone Name</label><input name="name" placeholder="Nairobi" /></div>
          <div class="field"><label>Delivery Fee (KSh)</label><input name="fee" type="number" min="0" /></div>
          <div style="display:flex;gap:10px;">
            <button class="btn btn-ghost" type="button" id="wizard-skip-3">Skip for now</button>
            <button class="btn btn-primary" type="submit">Add &amp; Continue →</button>
          </div>
        </form>`;
      document.getElementById('wizard-skip-3').addEventListener('click', () => goToStep(4));
      document.getElementById('wizard-form-3').addEventListener('submit', async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const name = fd.get('name');
        if (name) {
          try {
            await api.post('/api/delivery', { name, fee: parseFloat(fd.get('fee')) || 0 });
            await api.post('/api/delivery', { name: 'Pickup', fee: 0, isPickup: true });
          } catch (err) { toast(err.message, 'error'); return; }
        }
        goToStep(4);
      });
      return;
    }

    if (step === 4) {
      content.innerHTML = `
        <h3 style="margin-bottom:16px;">Payment instructions</h3>
        <form id="wizard-form-4">
          <div class="field"><label>M-Pesa Number</label><input name="mpesaNumber" /></div>
          <div class="field"><label>M-Pesa Name</label><input name="mpesaName" /></div>
          <div class="field"><label>Other Instructions</label><textarea name="otherInstructions" rows="2"></textarea></div>
          <button class="btn btn-primary" type="submit">Continue →</button>
        </form>`;
      document.getElementById('wizard-form-4').addEventListener('submit', async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        try {
          await api.patch('/api/payments', Object.fromEntries(fd.entries()));
        } catch (err) { toast(err.message, 'error'); return; }
        goToStep(5);
      });
      return;
    }

    if (step === 5) {
      content.innerHTML = `
        <h3 style="margin-bottom:16px;">Invoice branding</h3>
        <form id="wizard-form-5">
          <div class="field"><label>Footer Message</label><input name="footerMessage" placeholder="Thank you for your business!" /></div>
          <div class="field"><label>Terms / Notes</label><textarea name="terms" rows="2"></textarea></div>
          <button class="btn btn-primary" type="submit">Continue →</button>
        </form>`;
      document.getElementById('wizard-form-5').addEventListener('submit', async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        try {
          await api.patch('/api/business/me', { invoiceBranding: Object.fromEntries(fd.entries()) });
        } catch (err) { toast(err.message, 'error'); return; }
        goToStep(6);
      });
      return;
    }

    if (step === 6) {
      content.innerHTML = `
        <h3 style="margin-bottom:16px;">Your sales agent</h3>
        <form id="wizard-form-6">
          <div class="field"><label>Greeting</label><input name="greeting" placeholder="Welcome! How can I help you today?" /></div>
          <div class="field"><label>Bot Description</label><textarea name="botDescription" rows="2"></textarea></div>
          <button class="btn btn-accent" type="submit">Finish setup 🎉</button>
        </form>`;
      document.getElementById('wizard-form-6').addEventListener('submit', async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        try {
          await api.patch('/api/business/me', {
            salesAgent: { greeting: fd.get('greeting'), botDescription: fd.get('botDescription') },
            isSetupComplete: true,
            setupStep: 7,
          });
          toast('Setup complete! Now connect your Telegram bot.', 'success');
          const res = await api.get('/api/business/me');
          state.business = res.business;
          document.getElementById('business-name-header').textContent = state.business.name;
          showPage('telegram');
        } catch (err) { toast(err.message, 'error'); }
      });
      return;
    }
  }

  async function goToStep(step) {
    try {
      const res = await api.patch('/api/business/me', { setupStep: step });
      state.business = res.business;
    } catch (err) {}
    renderWizardSteps(step);
    renderWizardStep(step);
  }

  // ---------------- OVERVIEW ----------------
  async function loadOverview() {
    document.getElementById('overview-stats').innerHTML = skeletonRows(1);
    document.getElementById('overview-recent-orders').innerHTML = skeletonRows(3);
    try {
      const analytics = await api.get('/api/analytics');
      document.getElementById('overview-stats').innerHTML = `
        <div class="card stat-card"><div class="stat-label">Orders</div><div class="stat-value">${analytics.totalOrders}</div></div>
        <div class="card stat-card"><div class="stat-label">Pending Payments</div><div class="stat-value">${analytics.pendingPayments}</div></div>
        <div class="card stat-card"><div class="stat-label">Revenue</div><div class="stat-value">${money(analytics.revenue)}</div></div>
        <div class="card stat-card"><div class="stat-label">Products</div><div class="stat-value">${analytics.productCount}</div></div>`;

      const orders = await api.get('/api/orders?limit=6');
      document.getElementById('overview-recent-orders').innerHTML = orders.items.length
        ? renderOrdersTable(orders.items)
        : emptyState('📦', 'No orders yet. Once your bot is connected, orders will show up here.');
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  // ---------------- PRODUCTS ----------------
  async function loadProducts(search) {
    const el = document.getElementById('products-list');
    el.innerHTML = skeletonRows(4);
    try {
      const q = search ? `?search=${encodeURIComponent(search)}` : '';
      const res = await api.get(`/api/products${q}`);
      if (!res.items.length) {
        el.innerHTML = emptyState('🛍', 'No products yet. Add your first one, or import a CSV.');
        return;
      }
      el.innerHTML = `<div style="display:flex;flex-direction:column;gap:10px;">` + res.items.map((p) => `
        <div class="product-card-admin">
          ${p.image?.url ? `<img src="${p.image.url}" />` : `<div style="width:56px;height:56px;border-radius:8px;background:var(--navy-100);"></div>`}
          <div class="grow">
            <b>${p.name}</b> <span class="badge ${p.stock > 0 ? 'badge-green' : 'badge-red'}">${p.stock > 0 ? p.stock + ' in stock' : 'out of stock'}</span>
            <div class="muted" style="font-size:13px;">${money(p.price)}${p.category ? ' · ' + p.category.name : ''}</div>
          </div>
          <button class="btn btn-ghost btn-sm" data-edit-product="${p._id}">Edit</button>
          <button class="btn btn-danger btn-sm" data-delete-product="${p._id}">Delete</button>
        </div>`).join('') + `</div>`;

      el.querySelectorAll('[data-delete-product]').forEach((btn) => {
        btn.addEventListener('click', async () => {
          if (!confirm('Delete this product?')) return;
          try {
            await api.delete(`/api/products/${btn.dataset.deleteProduct}`);
            loadProducts();
          } catch (err) { toast(err.message, 'error'); }
        });
      });
      el.querySelectorAll('[data-edit-product]').forEach((btn) => {
        btn.addEventListener('click', () => openProductModal(res.items.find((p) => p._id === btn.dataset.editProduct)));
      });
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  document.getElementById('product-search').addEventListener('input', (e) => {
    clearTimeout(window.__searchDebounce);
    window.__searchDebounce = setTimeout(() => loadProducts(e.target.value), 300);
  });

  function openModal(html) {
    const root = document.getElementById('modal-root');
    root.innerHTML = `<div class="modal-backdrop" id="modal-backdrop"><div class="modal">${html}</div></div>`;
    document.getElementById('modal-backdrop').addEventListener('click', (e) => {
      if (e.target.id === 'modal-backdrop') closeModal();
    });
  }
  function closeModal() {
    document.getElementById('modal-root').innerHTML = '';
  }

  function openProductModal(product) {
    const isEdit = !!product;
    openModal(`
      <h3 style="margin-bottom:16px;">${isEdit ? 'Edit Product' : 'Add Product'}</h3>
      <form id="product-form">
        <div class="field"><label>Name</label><input name="name" required value="${isEdit ? product.name : ''}" /></div>
        <div class="field-row">
          <div class="field"><label>Price (KSh)</label><input name="price" type="number" min="0" required value="${isEdit ? product.price : ''}" /></div>
          <div class="field"><label>Stock</label><input name="stock" type="number" min="0" value="${isEdit ? product.stock : 0}" /></div>
        </div>
        <div class="field"><label>SKU</label><input name="sku" value="${isEdit ? (product.sku || '') : ''}" /></div>
        <div class="field"><label>Description</label><textarea name="description" rows="2">${isEdit ? (product.description || '') : ''}</textarea></div>
        <div class="field"><label>Image</label><input type="file" id="product-image-input" accept="image/*" /></div>
        <div style="display:flex;gap:10px;">
          <button class="btn btn-ghost" type="button" id="modal-cancel">Cancel</button>
          <button class="btn btn-primary" type="submit">${isEdit ? 'Save Changes' : 'Add Product'}</button>
        </div>
      </form>
    `);
    document.getElementById('modal-cancel').addEventListener('click', closeModal);
    document.getElementById('product-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const payload = {
        name: fd.get('name'), sku: fd.get('sku'), description: fd.get('description'),
        price: parseFloat(fd.get('price')) || 0, stock: parseInt(fd.get('stock'), 10) || 0,
      };
      try {
        let id = product?._id;
        if (isEdit) {
          await api.patch(`/api/products/${id}`, payload);
        } else {
          const res = await api.post('/api/products', payload);
          id = res.product._id;
        }
        const imgInput = document.getElementById('product-image-input');
        if (imgInput.files[0]) {
          const form = new FormData();
          form.append('image', imgInput.files[0]);
          await api.postForm(`/api/products/${id}/image`, form);
        }
        toast('Product saved', 'success');
        closeModal();
        loadProducts();
      } catch (err) { toast(err.message, 'error'); }
    });
  }
  document.getElementById('btn-add-product').addEventListener('click', () => openProductModal(null));

  document.getElementById('btn-import-csv').addEventListener('click', () => {
    openModal(`
      <h3 style="margin-bottom:16px;">Import Products from CSV</h3>
      <p class="muted" style="font-size:13px;margin-bottom:12px;">Columns: name, description, category, price, stock, sku, image, size, color</p>
      <div class="drop-zone" id="csv-drop">Tap to choose a CSV file<input type="file" id="csv-input" accept=".csv" style="display:none;" /></div>
      <div id="csv-preview" style="margin-top:16px;"></div>
    `);
    const dz = document.getElementById('csv-drop');
    const input = document.getElementById('csv-input');
    dz.addEventListener('click', () => input.click());
    input.addEventListener('change', async () => {
      if (!input.files[0]) return;
      const form = new FormData();
      form.append('file', input.files[0]);
      try {
        const res = await api.postForm('/api/csv/preview', form);
        const preview = document.getElementById('csv-preview');
        preview.innerHTML = `
          <p>✓ ${res.validCount} valid products ${res.errorCount ? `· ⚠ ${res.errorCount} rows contain errors` : ''}</p>
          ${res.errors.slice(0, 8).map((e) => `<div class="csv-error-row">Row ${e.row}: ${e.errors.join(', ')}</div>`).join('')}
          <button class="btn btn-primary" style="margin-top:14px;" id="csv-confirm-import">Import ${res.validCount} products</button>
        `;
        document.getElementById('csv-confirm-import').addEventListener('click', async () => {
          try {
            const r = await api.post('/api/csv/commit', { importToken: res.importToken });
            toast(`Imported ${r.inserted} products`, 'success');
            closeModal();
            loadProducts();
          } catch (err) { toast(err.message, 'error'); }
        });
      } catch (err) { toast(err.message, 'error'); }
    });
  });

  // ---------------- ORDERS ----------------
  function renderOrdersTable(items) {
    return `<div class="table-wrap"><table><thead><tr><th>Order</th><th>Customer</th><th>Total</th><th>Status</th><th></th></tr></thead><tbody>
      ${items.map((o) => `
        <tr>
          <td>#${o.orderNumber}<br/><span class="muted" style="font-size:12px;">${new Date(o.createdAt).toLocaleDateString()}</span></td>
          <td>${o.customerSnapshot?.name || '—'}</td>
          <td>${money(o.total)}</td>
          <td><span class="badge ${statusBadgeClass(o.status)}">${o.status.replace(/_/g, ' ')}</span></td>
          <td><button class="btn btn-ghost btn-sm" data-view-order="${o._id}">View</button></td>
        </tr>`).join('')}
    </tbody></table></div>`;
  }

  async function loadOrders() {
    const el = document.getElementById('orders-table');
    el.innerHTML = skeletonRows(4);
    try {
      const status = document.getElementById('order-status-filter').value;
      const res = await api.get(`/api/orders${status ? `?status=${status}` : ''}`);
      el.innerHTML = res.items.length ? renderOrdersTable(res.items) : emptyState('📦', 'No orders match this filter.');
      el.querySelectorAll('[data-view-order]').forEach((btn) => {
        btn.addEventListener('click', () => openOrderModal(btn.dataset.viewOrder));
      });
    } catch (err) { toast(err.message, 'error'); }
  }
  document.getElementById('order-status-filter').addEventListener('change', loadOrders);

  async function openOrderModal(orderId) {
    try {
      const { order } = await api.get(`/api/orders/${orderId}`);
      openModal(`
        <h3>Order #${order.orderNumber}</h3>
        <p class="muted" style="font-size:13px;">${order.customerSnapshot?.name || ''} · ${order.customerSnapshot?.phone || order.customerSnapshot?.telegramUsername || ''}</p>
        <div class="hr"></div>
        ${order.items.map((i) => `<div style="display:flex;justify-content:space-between;font-size:14px;margin-bottom:6px;"><span>${i.name} × ${i.quantity}</span><span>${money(i.subtotal)}</span></div>`).join('')}
        <div class="hr"></div>
        <div style="display:flex;justify-content:space-between;font-size:14px;"><span>${order.deliveryMethod === 'pickup' ? 'Pickup' : order.deliveryZoneName}</span><span>${money(order.deliveryFee)}</span></div>
        <div style="display:flex;justify-content:space-between;font-weight:700;margin-top:8px;"><span>Total</span><span>${money(order.total)}</span></div>
        <div class="hr"></div>
        <div style="margin-bottom:12px;"><span class="badge ${statusBadgeClass(order.status)}">${order.status.replace(/_/g, ' ')}</span></div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;">
          ${order.status === 'PAYMENT_VERIFICATION' ? `<button class="btn btn-accent btn-sm" id="btn-confirm-payment">✓ Confirm Payment</button><button class="btn btn-danger btn-sm" id="btn-reject-payment">✕ Reject Payment</button>` : ''}
        </div>
        <div class="field">
          <label>Order Status</label>
          <select id="order-status-select">
            ${['AWAITING_PAYMENT','PAYMENT_VERIFICATION','PAID','PAYMENT_REJECTED','PROCESSING','OUT_FOR_DELIVERY','COMPLETED','CANCELLED'].map((s) => `<option ${s === order.status ? 'selected' : ''}>${s}</option>`).join('')}
          </select>
        </div>
        <button class="btn btn-primary btn-sm" id="btn-update-status">Update Status</button>
        <div class="hr"></div>
        <div style="display:flex;gap:8px;">
          ${order.invoice?.file?.url ? `<a class="btn btn-ghost btn-sm" href="${order.invoice.file.url}" target="_blank">Download Invoice</a>` : ''}
          ${order.receipt?.file?.url ? `<a class="btn btn-ghost btn-sm" href="${order.receipt.file.url}" target="_blank">Download Receipt</a>` : ''}
        </div>
      `);
      document.getElementById('btn-confirm-payment')?.addEventListener('click', async () => {
        try { await api.post(`/api/orders/${orderId}/confirm-payment`); toast('Payment confirmed', 'success'); closeModal(); loadOrders(); }
        catch (err) { toast(err.message, 'error'); }
      });
      document.getElementById('btn-reject-payment')?.addEventListener('click', async () => {
        const reason = prompt('Reason for rejecting this payment?') || '';
        try { await api.post(`/api/orders/${orderId}/reject-payment`, { reason }); toast('Payment rejected', 'success'); closeModal(); loadOrders(); }
        catch (err) { toast(err.message, 'error'); }
      });
      document.getElementById('btn-update-status').addEventListener('click', async () => {
        const status = document.getElementById('order-status-select').value;
        try { await api.patch(`/api/orders/${orderId}/status`, { status }); toast('Status updated', 'success'); closeModal(); loadOrders(); }
        catch (err) { toast(err.message, 'error'); }
      });
    } catch (err) { toast(err.message, 'error'); }
  }

  // ---------------- CUSTOMERS ----------------
  async function loadCustomers() {
    const el = document.getElementById('customers-table');
    el.innerHTML = skeletonRows(4);
    try {
      const res = await api.get('/api/customers');
      el.innerHTML = res.items.length ? `<table><thead><tr><th>Name</th><th>Phone</th><th>Orders</th><th>Total Spent</th></tr></thead><tbody>
        ${res.items.map((c) => `<tr><td>${c.name || c.telegramUsername || 'Customer'}</td><td>${c.phone || '—'}</td><td>${c.ordersCount}</td><td>${money(c.totalSpent)}</td></tr>`).join('')}
      </tbody></table>` : emptyState('👥', 'No customers yet.');
    } catch (err) { toast(err.message, 'error'); }
  }

  // ---------------- DELIVERY ----------------
  async function loadZones() {
    const el = document.getElementById('zones-list');
    el.innerHTML = skeletonRows(2);
    try {
      const res = await api.get('/api/delivery');
      el.innerHTML = res.zones.length ? `<div style="display:flex;flex-direction:column;gap:10px;">` + res.zones.map((z) => `
        <div class="card" style="display:flex;justify-content:space-between;align-items:center;">
          <div><b>${z.name}</b> ${z.isPickup ? '<span class="badge badge-gray">Pickup</span>' : ''}<div class="muted" style="font-size:13px;">${money(z.fee)} ${z.estimatedTime ? '· ' + z.estimatedTime : ''}</div></div>
          <button class="btn btn-danger btn-sm" data-delete-zone="${z._id}">Delete</button>
        </div>`).join('') + `</div>` : emptyState('🚚', 'No delivery zones yet.');
      el.querySelectorAll('[data-delete-zone]').forEach((btn) => btn.addEventListener('click', async () => {
        try { await api.delete(`/api/delivery/${btn.dataset.deleteZone}`); loadZones(); } catch (err) { toast(err.message, 'error'); }
      }));
    } catch (err) { toast(err.message, 'error'); }
  }
  document.getElementById('btn-add-zone').addEventListener('click', () => {
    openModal(`
      <h3 style="margin-bottom:16px;">Add Delivery Zone</h3>
      <form id="zone-form">
        <div class="field"><label>Zone Name</label><input name="name" required /></div>
        <div class="field"><label>Fee (KSh)</label><input name="fee" type="number" min="0" required /></div>
        <div class="field"><label>Estimated Time</label><input name="estimatedTime" placeholder="Same day" /></div>
        <div style="display:flex;gap:10px;"><button class="btn btn-ghost" type="button" id="modal-cancel">Cancel</button><button class="btn btn-primary" type="submit">Add Zone</button></div>
      </form>
    `);
    document.getElementById('modal-cancel').addEventListener('click', closeModal);
    document.getElementById('zone-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      try {
        await api.post('/api/delivery', { name: fd.get('name'), fee: parseFloat(fd.get('fee')) || 0, estimatedTime: fd.get('estimatedTime') });
        closeModal();
        loadZones();
      } catch (err) { toast(err.message, 'error'); }
    });
  });

  // ---------------- PAYMENTS ----------------
  async function loadPaymentSettings() {
    try {
      const res = await api.get('/api/payments');
      const form = document.getElementById('payments-form');
      for (const [k, v] of Object.entries(res.settings || {})) {
        if (form.elements[k]) form.elements[k].value = v || '';
      }
    } catch (err) { toast(err.message, 'error'); }
  }
  document.getElementById('payments-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      await api.patch('/api/payments', Object.fromEntries(fd.entries()));
      toast('Payment settings saved', 'success');
    } catch (err) { toast(err.message, 'error'); }
  });

  // ---------------- SALES AGENT ----------------
  let faqList = [];
  function renderFaqRows() {
    const el = document.getElementById('faq-rows');
    el.innerHTML = faqList.map((f, i) => `
      <div class="faq-row">
        <input placeholder="Question" value="${f.question || ''}" data-faq-q="${i}" />
        <input placeholder="Answer" value="${f.answer || ''}" data-faq-a="${i}" />
        <button type="button" class="btn btn-danger btn-sm" data-faq-remove="${i}">✕</button>
      </div>`).join('');
    el.querySelectorAll('[data-faq-q]').forEach((inp) => inp.addEventListener('input', (e) => { faqList[+inp.dataset.faqQ].question = e.target.value; }));
    el.querySelectorAll('[data-faq-a]').forEach((inp) => inp.addEventListener('input', (e) => { faqList[+inp.dataset.faqA].answer = e.target.value; }));
    el.querySelectorAll('[data-faq-remove]').forEach((btn) => btn.addEventListener('click', () => { faqList.splice(+btn.dataset.faqRemove, 1); renderFaqRows(); }));
  }
  document.getElementById('btn-add-faq').addEventListener('click', () => { faqList.push({ question: '', answer: '' }); renderFaqRows(); });

  async function loadSalesAgent() {
    try {
      const res = await api.get('/api/business/me');
      const sa = res.business.salesAgent || {};
      const form = document.getElementById('salesagent-form');
      form.elements.greeting.value = sa.greeting || '';
      form.elements.welcomeMessage.value = sa.welcomeMessage || '';
      form.elements.botDescription.value = sa.botDescription || '';
      form.elements.policies.value = sa.policies || '';
      form.elements.tone.value = sa.tone || 'friendly';
      faqList = sa.faq || [];
      renderFaqRows();
    } catch (err) { toast(err.message, 'error'); }
  }
  document.getElementById('salesagent-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      await api.patch('/api/business/me', {
        salesAgent: {
          greeting: fd.get('greeting'), welcomeMessage: fd.get('welcomeMessage'),
          botDescription: fd.get('botDescription'), policies: fd.get('policies'),
          tone: fd.get('tone'), faq: faqList,
        },
      });
      toast('Sales agent updated', 'success');
    } catch (err) { toast(err.message, 'error'); }
  });

  // ---------------- TELEGRAM ----------------
  async function loadTelegramStatus() {
    const el = document.getElementById('bot-status');
    try {
      const res = await api.get('/api/telegram/status');
      if (res.bot) {
        el.innerHTML = `<div class="badge ${res.bot.webhookSet ? 'badge-green' : 'badge-amber'}">${res.bot.webhookSet ? 'Connected' : 'Connected (webhook pending)'}</div>
          <p style="margin-top:10px;">@${res.bot.botUsername}</p>
          <div style="display:flex;gap:8px;margin-top:10px;">
            <a class="btn btn-ghost btn-sm" href="https://t.me/${res.bot.botUsername}" target="_blank">Open Bot</a>
            <button class="btn btn-ghost btn-sm" id="btn-copy-link">Copy Link</button>
          </div>`;
        document.getElementById('btn-copy-link')?.addEventListener('click', () => {
          navigator.clipboard.writeText(`https://t.me/${res.bot.botUsername}`);
          toast('Link copied', 'success');
        });
      } else {
        el.innerHTML = `<div class="badge badge-gray">Not connected</div>`;
      }
    } catch (err) { toast(err.message, 'error'); }
  }
  document.getElementById('telegram-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      await api.post('/api/telegram/connect', { token: fd.get('token') });
      toast('Bot connected!', 'success');
      e.target.reset();
      loadTelegramStatus();
    } catch (err) { toast(err.message, 'error'); }
  });

  // ---------------- ANALYTICS ----------------
  async function loadAnalytics() {
    document.getElementById('analytics-stats').innerHTML = skeletonRows(1);
    try {
      const a = await api.get('/api/analytics');
      document.getElementById('analytics-stats').innerHTML = `
        <div class="card stat-card"><div class="stat-label">Today</div><div class="stat-value">${a.ordersToday}</div></div>
        <div class="card stat-card"><div class="stat-label">This Week</div><div class="stat-value">${a.ordersWeek}</div></div>
        <div class="card stat-card"><div class="stat-label">This Month</div><div class="stat-value">${a.ordersMonth}</div></div>
        <div class="card stat-card"><div class="stat-label">Revenue</div><div class="stat-value">${money(a.revenue)}</div></div>`;
      document.getElementById('best-sellers').innerHTML = a.bestSellers?.length
        ? a.bestSellers.map((p) => `<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);"><span>${p._id}</span><span>${p.qty} sold</span></div>`).join('')
        : emptyState('📈', 'Not enough order data yet.');
    } catch (err) { toast(err.message, 'error'); }
  }

  // ---------------- SETTINGS ----------------
  async function loadSettingsForm() {
    try {
      const res = await api.get('/api/business/me');
      const b = res.business;
      const form = document.getElementById('settings-form');
      ['name', 'description', 'phone', 'email', 'location', 'openingHours', 'address'].forEach((k) => {
        if (form.elements[k]) form.elements[k].value = b[k] || '';
      });
    } catch (err) { toast(err.message, 'error'); }
  }
  document.getElementById('settings-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      const res = await api.patch('/api/business/me', Object.fromEntries(fd.entries()));
      state.business = res.business;
      document.getElementById('business-name-header').textContent = state.business.name;

      const logoInput = document.getElementById('logo-input');
      if (logoInput.files[0]) {
        const form = new FormData();
        form.append('logo', logoInput.files[0]);
        await api.postForm('/api/business/me/logo', form);
      }
      toast('Settings saved', 'success');
    } catch (err) { toast(err.message, 'error'); }
  });

  bootstrap();
})();
