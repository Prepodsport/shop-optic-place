import { useState, useEffect } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { api, getErrorMessage } from "../api.js";
import "./Auth.css";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    new_password: "",
    new_password_confirm: "",
  });

  // Проверяем токен при загрузке
  useEffect(() => {
    if (!token) {
      setValidating(false);
      setLoading(false);
      return;
    }

    const validateToken = async () => {
      try {
        const resp = await api.post("/auth/password/reset/validate/", { token });
        if (resp.data.valid) {
          setTokenValid(true);
          setEmail(resp.data.email);
        }
      } catch (err) {
        setTokenValid(false);
      } finally {
        setValidating(false);
        setLoading(false);
      }
    };

    validateToken();
  }, [token]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.new_password !== formData.new_password_confirm) {
      setError("Пароли не совпадают");
      return;
    }

    if (formData.new_password.length < 8) {
      setError("Пароль должен содержать минимум 8 символов");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await api.post("/auth/password/reset/confirm/", {
        token,
        new_password: formData.new_password,
        new_password_confirm: formData.new_password_confirm,
      });
      setSuccess(true);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  // Нет токена
  if (!token && !validating) {
    return (
      <div className="auth">
        <div className="auth__container">
          <div className="auth__error-state">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <h2>Ссылка недействительна</h2>
            <p>Отсутствует токен для сброса пароля.</p>
            <Link to="/forgot-password" className="auth__btn auth__btn--primary">
              Запросить новую ссылку
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Проверяем токен
  if (validating) {
    return (
      <div className="auth">
        <div className="auth__container">
          <div className="auth__loading">
            <div className="auth__spinner"></div>
            <p>Проверка ссылки...</p>
          </div>
        </div>
      </div>
    );
  }

  // Токен недействителен
  if (!tokenValid) {
    return (
      <div className="auth">
        <div className="auth__container">
          <div className="auth__error-state">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="15" y1="9" x2="9" y2="15"></line>
              <line x1="9" y1="9" x2="15" y2="15"></line>
            </svg>
            <h2>Ссылка недействительна</h2>
            <p>Возможно, ссылка истекла или уже была использована.</p>
            <Link to="/forgot-password" className="auth__btn auth__btn--primary">
              Запросить новую ссылку
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Успешно
  if (success) {
    return (
      <div className="auth">
        <div className="auth__container">
          <div className="auth__success">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
            <h2>Пароль изменён</h2>
            <p>Ваш пароль успешно обновлён. Теперь вы можете войти с новым паролем.</p>
            <Link to="/login" className="auth__btn auth__btn--primary">
              Войти в аккаунт
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Форма сброса
  return (
    <div className="auth">
      <div className="auth__container">
        <h1 className="auth__title">Новый пароль</h1>
        <p className="auth__subtitle">
          Установка нового пароля для <strong>{email}</strong>
        </p>

        {error && <div className="auth__error">{error}</div>}

        <form className="auth__form" onSubmit={handleSubmit}>
          <div className="auth__field">
            <label className="auth__label">Новый пароль</label>
            <input
              type="password"
              name="new_password"
              className="auth__input"
              value={formData.new_password}
              onChange={handleChange}
              placeholder="Минимум 8 символов"
              minLength={8}
              required
              autoFocus
            />
          </div>

          <div className="auth__field">
            <label className="auth__label">Подтверждение пароля</label>
            <input
              type="password"
              name="new_password_confirm"
              className="auth__input"
              value={formData.new_password_confirm}
              onChange={handleChange}
              placeholder="Повторите пароль"
              minLength={8}
              required
            />
          </div>

          <button
            type="submit"
            className="auth__btn auth__btn--primary auth__btn--full"
            disabled={loading}
          >
            {loading ? "Сохранение..." : "Сохранить пароль"}
          </button>
        </form>
      </div>
    </div>
  );
}
