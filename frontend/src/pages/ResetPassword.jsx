import { useState, useEffect } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { api, getErrorMessage } from "../api.js";

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
      <div className="py-10 md:py-8 px-4 pb-15 md:pb-10">
        <div className="max-w-[1280px] mx-auto">
          <div className="text-center py-8 px-6">
            <svg className="text-red-500 mb-4" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <h2 className="text-2xl font-bold m-0 mb-3" style={{ color: 'var(--text)' }}>Ссылка недействительна</h2>
            <p className="text-[15px] leading-relaxed m-0" style={{ color: 'var(--muted)' }}>
              Отсутствует токен для сброса пароля.
            </p>
            <Link
              to="/forgot-password"
              className="inline-block mt-6 py-3.5 px-4.5 bg-[var(--primary)] border border-[var(--primary)] rounded-xl text-white text-[15px] font-bold no-underline transition-all duration-200 hover:bg-blue-700 hover:border-blue-700 hover:no-underline max-w-70 mx-auto"
            >
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
      <div className="py-10 md:py-8 px-4 pb-15 md:pb-10">
        <div className="max-w-[1280px] mx-auto">
          <div className="text-center py-12 px-6">
            <div
              className="w-10 h-10 border-3 rounded-full mx-auto animate-spin"
              style={{ borderColor: 'var(--border)', borderTopColor: 'var(--primary)' }}
            />
            <p className="text-[15px] mt-4 m-0" style={{ color: 'var(--muted)' }}>Проверка ссылки...</p>
          </div>
        </div>
      </div>
    );
  }

  // Токен недействителен
  if (!tokenValid) {
    return (
      <div className="py-10 md:py-8 px-4 pb-15 md:pb-10">
        <div className="max-w-[1280px] mx-auto">
          <div className="text-center py-8 px-6">
            <svg className="text-red-500 mb-4" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="15" y1="9" x2="9" y2="15"></line>
              <line x1="9" y1="9" x2="15" y2="15"></line>
            </svg>
            <h2 className="text-2xl font-bold m-0 mb-3" style={{ color: 'var(--text)' }}>Ссылка недействительна</h2>
            <p className="text-[15px] leading-relaxed m-0" style={{ color: 'var(--muted)' }}>
              Возможно, ссылка истекла или уже была использована.
            </p>
            <Link
              to="/forgot-password"
              className="inline-block mt-6 py-3.5 px-4.5 bg-[var(--primary)] border border-[var(--primary)] rounded-xl text-white text-[15px] font-bold no-underline transition-all duration-200 hover:bg-blue-700 hover:border-blue-700 hover:no-underline max-w-70 mx-auto"
            >
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
      <div className="py-10 md:py-8 px-4 pb-15 md:pb-10">
        <div className="max-w-[1280px] mx-auto">
          <div className="text-center py-8 px-6">
            <svg className="text-green-500 mb-4" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
            <h2 className="text-2xl font-bold m-0 mb-3" style={{ color: 'var(--text)' }}>Пароль изменён</h2>
            <p className="text-[15px] leading-relaxed m-0" style={{ color: 'var(--muted)' }}>
              Ваш пароль успешно обновлён. Теперь вы можете войти с новым паролем.
            </p>
            <Link
              to="/login"
              className="inline-block mt-6 py-3.5 px-4.5 bg-[var(--primary)] border border-[var(--primary)] rounded-xl text-white text-[15px] font-bold no-underline transition-all duration-200 hover:bg-blue-700 hover:border-blue-700 hover:no-underline max-w-70 mx-auto"
            >
              Войти в аккаунт
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Форма сброса
  return (
    <div className="py-10 md:py-8 px-4 pb-15 md:pb-10">
      <div className="max-w-[1280px] mx-auto">
        <h1
          className="text-[32px] md:text-[26px] font-bold max-w-[640px] mx-auto mb-8 m-0"
          style={{ color: 'var(--text)' }}
        >
          Новый пароль
        </h1>
        <p
          className="max-w-[640px] mx-auto -mt-6 mb-6 text-[15px] leading-relaxed"
          style={{ color: 'var(--muted)' }}
        >
          Установка нового пароля для <strong>{email}</strong>
        </p>

        {error && (
          <div
            className="max-w-[640px] mx-auto mb-4 py-3 px-3.5 rounded-xl border text-sm leading-relaxed"
            style={{
              background: 'rgba(239, 68, 68, 0.08)',
              borderColor: 'rgba(239, 68, 68, 0.35)',
              color: '#dc2626',
            }}
          >
            {error}
          </div>
        )}

        <form
          className="max-w-[640px] mx-auto rounded-2xl p-6 md:p-5 border"
          style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
          onSubmit={handleSubmit}
        >
          <div className="flex flex-col gap-2 mb-4">
            <label className="text-[13px] font-semibold" style={{ color: 'var(--muted)' }}>Новый пароль</label>
            <input
              type="password"
              name="new_password"
              className="w-full py-3 px-3.5 rounded-xl border text-[15px] transition-all duration-200 focus:outline-none focus:border-[var(--primary)] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.12)]"
              style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }}
              value={formData.new_password}
              onChange={handleChange}
              placeholder="Минимум 8 символов"
              minLength={8}
              required
              autoFocus
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[13px] font-semibold" style={{ color: 'var(--muted)' }}>Подтверждение пароля</label>
            <input
              type="password"
              name="new_password_confirm"
              className="w-full py-3 px-3.5 rounded-xl border text-[15px] transition-all duration-200 focus:outline-none focus:border-[var(--primary)] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.12)]"
              style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }}
              value={formData.new_password_confirm}
              onChange={handleChange}
              placeholder="Повторите пароль"
              minLength={8}
              required
            />
          </div>

          <button
            type="submit"
            className="w-full mt-3.5 py-3.5 px-4.5 bg-[var(--primary)] border border-[var(--primary)] rounded-xl text-white text-[15px] font-bold cursor-pointer transition-all duration-200 hover:bg-blue-700 hover:border-blue-700 disabled:opacity-70 disabled:cursor-not-allowed"
            disabled={loading}
          >
            {loading ? "Сохранение..." : "Сохранить пароль"}
          </button>
        </form>
      </div>
    </div>
  );
}
