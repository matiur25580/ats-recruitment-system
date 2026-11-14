/*
 * LEARNING NOTE: Shared Axios client. A request interceptor attaches the JWT to authenticated API calls.
 * Interview tip: explain the responsibility of this file and how data flows through it.
 */
import axios from 'axios';

const api = axios.create({
  // Use a configurable API origin in production and Vite's /api proxy in development.
  baseURL: import.meta.env.VITE_API_URL || '/api',
});

// Request interceptor: attach the Bearer token centrally instead of repeating it in every API call.
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default api;
