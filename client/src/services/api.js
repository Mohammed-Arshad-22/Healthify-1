const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

class ApiClient {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
  }

  getHeaders(customHeaders = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...customHeaders,
    };
    const token = localStorage.getItem('healthify_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = options.isFormData
      ? { ...(options.headers || {}) }
      : this.getHeaders(options.headers);

    if (options.isFormData && localStorage.getItem('healthify_token')) {
      headers['Authorization'] = `Bearer ${localStorage.getItem('healthify_token')}`;
    }

    const config = {
      ...options,
      headers,
    };

    if (options.body && !options.isFormData && typeof options.body === 'object') {
      config.body = JSON.stringify(options.body);
    }

    try {
      const response = await fetch(url, config);
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('healthify_token');
          window.dispatchEvent(new Event('healthify_auth_change'));
        }
        const error = new Error(data.message || `Request failed with status ${response.status}`);
        error.status = response.status;
        error.details = data.details || null;
        throw error;
      }

      return data;
    } catch (err) {
      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        const netErr = new Error('Unable to connect to server. Please ensure the backend is running.');
        netErr.status = 503;
        throw netErr;
      }
      throw err;
    }
  }

  get(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'GET' });
  }

  post(endpoint, body, options = {}) {
    return this.request(endpoint, { ...options, method: 'POST', body });
  }

  put(endpoint, body, options = {}) {
    return this.request(endpoint, { ...options, method: 'PUT', body });
  }

  patch(endpoint, body, options = {}) {
    return this.request(endpoint, { ...options, method: 'PATCH', body });
  }

  delete(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'DELETE' });
  }

  upload(endpoint, formData, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'POST',
      body: formData,
      isFormData: true,
    });
  }

  uploadWithProgress(endpoint, formData, onProgress = () => {}, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open(options.method || 'POST', url);

      const token = localStorage.getItem('healthify_token');
      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }

      if (options.headers) {
        Object.entries(options.headers).forEach(([k, v]) => {
          xhr.setRequestHeader(k, v);
        });
      }

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded * 100) / event.total);
          onProgress(percent);
        }
      };

      xhr.onload = () => {
        let data = {};
        try {
          data = JSON.parse(xhr.responseText);
        } catch {
          data = {};
        }

        if (xhr.status >= 200 && xhr.status < 300) {
          onProgress(100);
          resolve(data);
        } else {
          if (xhr.status === 401) {
            localStorage.removeItem('healthify_token');
            window.dispatchEvent(new Event('healthify_auth_change'));
          }
          const error = new Error(data.message || `Upload failed with status ${xhr.status}`);
          error.status = xhr.status;
          error.details = data.details || null;
          reject(error);
        }
      };

      xhr.onerror = () => {
        reject(new Error('Network error during upload. Please check your connection.'));
      };

      xhr.send(formData);
    });
  }
}

export const api = new ApiClient(API_BASE_URL);
export default api;
