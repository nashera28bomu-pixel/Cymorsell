// Central API client. Reads the backend URL from a global injected by
// env-config.js (see index.html) so no build step is required —
// this stays plain static JS per the project's hosting convention.
const API_BASE = window.CYMOR_ENV?.API_URL || 'http://localhost:5000';

async function apiRequest(path, { method = 'GET', body, isForm = false } = {}) {
  const opts = {
    method,
    credentials: 'include',
    headers: {},
  };
  if (body !== undefined) {
    if (isForm) {
      opts.body = body;
    } else {
      opts.headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(body);
    }
  }
  const res = await fetch(`${API_BASE}${path}`, opts);
  let data = null;
  try {
    data = await res.json();
  } catch (e) {
    // no body
  }
  if (!res.ok) {
    const message = data?.error || `Request failed (${res.status})`;
    throw new Error(message);
  }
  return data;
}

const api = {
  get: (path) => apiRequest(path),
  post: (path, body, opts) => apiRequest(path, { method: 'POST', body, ...opts }),
  patch: (path, body) => apiRequest(path, { method: 'PATCH', body }),
  delete: (path) => apiRequest(path, { method: 'DELETE' }),
  postForm: (path, formData) => apiRequest(path, { method: 'POST', body: formData, isForm: true }),
};

window.cymorApi = api;
