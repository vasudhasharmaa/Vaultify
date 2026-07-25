import axios from 'axios';
import { API_BASE_URLS } from './config';

// Helper to construct headers with optional JWT authorization token
const getHeaders = (token) => {
  const headers = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

// Execute network requests, looping through configured base URLs (for local fallback / Render service wakeup)
const request = async (method, path, data = null, token = null) => {
  let lastError = null;

  for (const baseUrl of API_BASE_URLS) {
    try {
      console.log(`API Request: [${method.toUpperCase()}] ${baseUrl}${path}`);
      const config = {
        method,
        url: `${baseUrl}${path}`,
        headers: getHeaders(token),
        timeout: 60000,
      };
      if (data) {
        config.data = data;
      }
      const response = await axios(config);
      return response;
    } catch (error) {
      console.warn(`Request failed for ${baseUrl}${path}:`, error.message);
      lastError = error;
    }
  }

  throw lastError;
};

export const get = async (path, token = null) => {
  return request('get', path, null, token);
};

export const post = async (path, data, token = null) => {
  return request('post', path, data, token);
};

export const put = async (path, data, token = null) => {
  return request('put', path, data, token);
};

export const del = async (path, token = null) => {
  return request('delete', path, null, token);
};
