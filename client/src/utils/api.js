// src/utils/api.js
import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 10_000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  // Send a simple browser fingerprint
  config.headers['x-fingerprint'] = getFingerprint();
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

function getFingerprint() {
  let fp = sessionStorage.getItem('_fp');
  if (!fp) {
    fp = [
      navigator.userAgent,
      navigator.language,
      screen.width,
      screen.height,
      new Date().getTimezoneOffset(),
    ].join('|');
    fp = btoa(fp).slice(0, 64);
    sessionStorage.setItem('_fp', fp);
  }
  return fp;
}

export default api;
