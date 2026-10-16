import axios from 'axios';

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api' });

// UI language sent to the API so its messages and PDFs match; set by LanguageProvider.
let apiLanguage = 'en';
export function setApiLanguage(lang) {
  apiLanguage = lang;
}

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  config.headers['Accept-Language'] = apiLanguage;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && !err.config.url.includes('/auth/login')) {
      localStorage.removeItem('token');
      window.dispatchEvent(new Event('auth:logout'));
    }
    return Promise.reject(err);
  }
);

const FALLBACK_ERROR = { en: 'Something went wrong', so: 'Wax khalad ah ayaa dhacay' };
export const errorMessage = (err) => err?.response?.data?.message || FALLBACK_ERROR[apiLanguage] || FALLBACK_ERROR.en;

// Download a file from an authenticated endpoint.
export async function download(url, filename) {
  const res = await api.get(url, { responseType: 'blob' });
  const href = URL.createObjectURL(res.data);
  const a = document.createElement('a');
  a.href = href;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(href);
}

export const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;

export default api;
