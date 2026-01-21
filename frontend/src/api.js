import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api";

// Максимум попыток обновления токена
const MAX_REFRESH_ATTEMPTS = 3;

export const api = axios.create({
  baseURL: API_URL,
  timeout: 30000, // 30 секунд таймаут
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

export function isAuthenticated() {
  return Boolean(getTokens().access);
}

/**
 * Выход из системы
 */
export async function logout() {
  const { refresh } = getTokens();

  try {
    if (refresh) {
      await api.post("/auth/logout/", { refresh });
    }
  } catch (e) {
    // Игнорируем ошибки при logout
    console.warn("Logout error:", e);
  } finally {
    clearTokens();
  }
}

/**
 * Извлечение сообщения об ошибке из ответа API
 */
export function getErrorMessage(error) {
  if (!error.response) {
    if (error.code === "ECONNABORTED") {
      return "Превышено время ожидания. Проверьте соединение с интернетом.";
    }
    return "Ошибка сети. Проверьте соединение с интернетом.";
  }

  const { status, data } = error.response;

  // Обработка разных типов ошибок
  if (status === 400) {
    // Валидационные ошибки
    if (data.detail) return data.detail;
    if (data.errors && Array.isArray(data.errors)) return data.errors[0];

    // Ошибки полей формы
    const fieldErrors = [];
    for (const [field, errors] of Object.entries(data)) {
      if (Array.isArray(errors)) {
        fieldErrors.push(`${errors[0]}`);
      } else if (typeof errors === "string") {
        fieldErrors.push(errors);
      }
    }
    if (fieldErrors.length > 0) return fieldErrors[0];

    return "Некорректные данные";
  }

  if (status === 401) {
    return "Необходима авторизация";
  }

  if (status === 403) {
    return "Доступ запрещён";
  }

  if (status === 404) {
    return data.detail || "Не найдено";
  }

  if (status === 429) {
    return "Слишком много запросов. Подождите немного.";
  }

  if (status >= 500) {
    return "Ошибка сервера. Попробуйте позже.";
  }

  return data.detail || "Произошла ошибка";
}

// Счётчик попыток обновления токена
let refreshAttempts = 0;
let isRefreshing = false;
let refreshSubscribers = [];

function subscribeTokenRefresh(callback) {
  refreshSubscribers.push(callback);
}

function onTokenRefreshed(token) {
  refreshSubscribers.forEach((callback) => callback(token));
  refreshSubscribers = [];
}

function onRefreshFailed() {
  refreshSubscribers.forEach((callback) => callback(null));
  refreshSubscribers = [];
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
      // Если это запрос на refresh токен - не пытаемся снова
      if (originalRequest.url?.includes("/auth/token/refresh")) {
        clearTokens();
        refreshAttempts = 0;
        return Promise.reject(error);
      }

      // Проверяем лимит попыток
      if (refreshAttempts >= MAX_REFRESH_ATTEMPTS) {
        clearTokens();
        refreshAttempts = 0;
        window.dispatchEvent(new CustomEvent("auth:logout"));
        return Promise.reject(error);
      }

      originalRequest._retry = true;

      const { refresh } = getTokens();

      if (!refresh) {
        clearTokens();
        return Promise.reject(error);
      }

      // Если уже идёт обновление токена - ждём
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          subscribeTokenRefresh((token) => {
            if (token) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              resolve(api(originalRequest));
            } else {
              reject(error);
            }
          });
        });
      }

      isRefreshing = true;
      refreshAttempts++;

      try {
        const res = await axios.post(`${API_URL}/auth/token/refresh/`, {
          refresh,
        });

        const newAccess = res.data.access;
        const newRefresh = res.data.refresh || refresh;

        setTokens(newAccess, newRefresh);
        refreshAttempts = 0;
        isRefreshing = false;

        onTokenRefreshed(newAccess);

        originalRequest.headers.Authorization = `Bearer ${newAccess}`;
        return api(originalRequest);
      } catch (refreshError) {
        isRefreshing = false;
        onRefreshFailed();

        // Refresh не сработал - очищаем токены
        clearTokens();
        refreshAttempts = 0;

        window.dispatchEvent(new CustomEvent("auth:logout"));
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
