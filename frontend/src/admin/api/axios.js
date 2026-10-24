import axios from 'axios';
import { API_BASE_URL } from '../../config';

const api = axios.create({ baseURL: `${API_BASE_URL}/admin`, timeout: 20000 });
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
api.interceptors.response.use(response => response, error => {
  if ([401, 403].includes(error.response?.status)) {
    window.dispatchEvent(new CustomEvent('mrguide:admin-access-denied'));
  }
  return Promise.reject(error);
});
export default api;
