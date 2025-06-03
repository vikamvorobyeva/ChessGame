import axios from 'axios';

const api = axios.create({
  baseURL: 'http://127.0.0.1:8000', 
});

let anonId = localStorage.getItem("anon_id");
if (!anonId) {
  anonId = `anon_${Math.random().toString(36).substring(2, 10)}`;
  localStorage.setItem("anon_id", anonId);
}

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`; // JWT
  }

  config.headers["x-anon-id"] = anonId;

  return config;
});

export default api;
