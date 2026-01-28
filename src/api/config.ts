export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
export const API_KEY = import.meta.env.VITE_API_KEY || '';

if (!API_BASE_URL || !API_KEY) {
  console.warn('API configuration is missing.');
}