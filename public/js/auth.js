/**
 * sky IoT - Authentication & Session Manager
 */

const Auth = {
  TOKEN_KEY: 'sky_jwt_token',
  USER_KEY: 'sky_user_data',

  getToken() {
    return localStorage.getItem(this.TOKEN_KEY);
  },

  getUser() {
    try {
      const userStr = localStorage.getItem(this.USER_KEY);
      return userStr ? JSON.parse(userStr) : null;
    } catch {
      return null;
    }
  },

  isAuthenticated() {
    return !!this.getToken();
  },

  setSession(token, user) {
    localStorage.setItem(this.TOKEN_KEY, token);
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
  },

  clearSession() {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
  },

  async login(email, password) {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Login failed');
      }
      this.setSession(data.token, data.user);
      return data;
    } catch (err) {
      throw err;
    }
  },

  async register(name, email, password) {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Registration failed');
      }
      this.setSession(data.token, data.user);
      return data;
    } catch (err) {
      throw err;
    }
  },

  logout() {
    this.clearSession();
    window.location.reload();
  },

  // Helper for authenticated API requests
  async fetchAuth(url, options = {}) {
    const token = this.getToken();
    const headers = options.headers || {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return fetch(url, { ...options, headers });
  }
};
