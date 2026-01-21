import { useState } from "react";
import { Link } from "react-router-dom";
import { api, getErrorMessage } from "../api.js";
import "./Auth.css";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await api.post("/auth/password/reset/", { email });
      setSuccess(true);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="auth">
        <div className="auth__container">
          <div className="auth__success">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
            </svg>
            <h2>Проверьте почту</h2>
            <p>
              Если email <strong>{email}</strong> зарегистрирован в системе,
              мы отправили на него письмо с инструкциями по сбросу пароля.
            </p>
            <p className="auth__hint">
              Не получили письмо? Проверьте папку «Спам» или попробуйте снова через несколько минут.
            </p>
            <Link to="/login" className="auth__btn auth__btn--primary">
              Вернуться ко входу
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth">
      <div className="auth__container">
        <h1 className="auth__title">Восстановление пароля</h1>
        <p className="auth__subtitle">
          Введите email, указанный при регистрации. Мы отправим ссылку для сброса пароля.
        </p>

        {error && <div className="auth__error">{error}</div>}

        <form className="auth__form" onSubmit={handleSubmit}>
          <div className="auth__field">
            <label className="auth__label">Email</label>
            <input
              type="email"
              className="auth__input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@mail.ru"
              required
              autoFocus
            />
          </div>

          <button
            type="submit"
            className="auth__btn auth__btn--primary auth__btn--full"
            disabled={loading}
          >
            {loading ? "Отправка..." : "Отправить ссылку"}
          </button>
        </form>

        <div className="auth__footer">
          <Link to="/login">Вернуться ко входу</Link>
        </div>
      </div>
    </div>
  );
}
