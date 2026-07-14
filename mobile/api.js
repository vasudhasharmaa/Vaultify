import axios from 'axios';
import { API_BASE_URLS } from './config';

export const post = async (path, data) => {
  let lastError = null;

  for (const baseUrl of API_BASE_URLS) {
    try {
      console.log(`Trying API URL: ${baseUrl}${path}`);
      const response = await axios.post(`${baseUrl}${path}`, data, {
        timeout: 10000,
      });
      return response;
    } catch (error) {
      console.warn(`Request failed for ${baseUrl}${path}:`, error.message);
      lastError = error;
    }
  }

  throw lastError;
};
