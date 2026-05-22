const API = {
  _token: null,

  init() {
    this._token = localStorage.getItem('auth_token');
    if (!this._token) {
      window.location.href = '/';
    }
  },

  headers() {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this._token}`,
    };
  },

  async get(path) {
    const r = await fetch(path, { headers: this.headers(), credentials: 'include' });
    if (r.status === 401) { localStorage.clear(); window.location.href = '/'; }
    if (!r.ok) { const d = await r.json(); throw new Error(d.detail || r.statusText); }
    return r.json();
  },

  async post(path, body) {
    const r = await fetch(path, {
      method: 'POST',
      headers: this.headers(),
      credentials: 'include',
      body: JSON.stringify(body),
    });
    if (r.status === 401) { localStorage.clear(); window.location.href = '/'; }
    if (!r.ok) { const d = await r.json(); throw new Error(d.detail || r.statusText); }
    return r.json();
  },
};
