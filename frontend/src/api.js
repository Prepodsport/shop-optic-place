import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api";

export const api = axios.create({
  baseURL: API_URL,
});

export function getTokens() {
  return {
    access: localStorage.getItem("access") || "",
    refresh: localStorage.getItem("refresh") || "",
  };
}

export function setTokens(access, refresh) {
  if (access) localStorage.setItem("access", access);
  if (refresh) localStorage.setItem("refresh", refresh);
}

export function clearTokens() {
  localStorage.removeItem("access");
  localStorage.removeItem("refresh");
}

// Request interceptor - добавляем токен если есть
api.interceptors.request.use((config) => {
  const { access } = getTokens();
  if (access) {
    config.headers.Authorization = `Bearer ${access}`;
  }
  return config;
});

// Response interceptor - обрабатываем 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Если 401 и не пытались рефрешить
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const { refresh } = getTokens();

      // Если есть refresh токен - пробуем обновить
      if (refresh) {
        try {
          const res = await axios.post(`${API_URL}/auth/token/refresh/`, {
            refresh,
          });
          const newAccess = res.data.access;
          setTokens(newAccess, refresh);
          originalRequest.headers.Authorization = `Bearer ${newAccess}`;
          return api(originalRequest);
        } catch (refreshError) {
          // Refresh не сработал - очищаем токены
          clearTokens();
        }
      } else {
        // Нет refresh токена - очищаем всё
        clearTokens();
      }

      // Повторяем запрос без токена (для публичных эндпоинтов)
      delete originalRequest.headers.Authorization;
      return api(originalRequest);
    }

    return Promise.reject(error);
  }
);
