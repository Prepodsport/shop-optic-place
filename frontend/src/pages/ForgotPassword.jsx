import { useState } from "react";
import { Link } from "react-router-dom";
import { api, getErrorMessage } from "../api.js";

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
      <div className="py-10 md:py-8 px-4 pb-15 md:pb-10">
        <div className="max-w-[1600px] mx-auto">
          <div className="flex flex-col items-center py-8 px-6">
            <svg className="text-green-500 mb-4" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
            </svg>
            <h2 className="text-2xl font-bold m-0 mb-3" style={{ color: 'var(--text)' }}>Проверьте почту</h2>
            <p className="text-[15px] leading-relaxed m-0 mb-2" style={{ color: 'var(--muted)' }}>
              Если email <strong>{email}</strong> зарегистрирован в системе,
              мы отправили на него письмо с инструкциями по сбросу пароля.
            </p>
            <p className="text-[13px] mt-3" style={{ color: 'var(--muted)' }}>
              Не получили письмо? Проверьте папку «Спам» или попробуйте снова через несколько минут.
            </p>
            <Link
              to="/login"
              className="inline-block mt-6 py-3.5 px-4.5 bg-[var(--primary)] border border-[var(--primary)] rounded-xl text-white text-[15px] font-bold no-underline transition-all duration-200 hover:bg-blue-700 hover:border-blue-700 hover:no-underline max-w-70 mx-auto"
            >
              Вернуться ко входу
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-10 md:py-8 px-4 pb-15 md:pb-10">
      <div className="max-w-[1600px] mx-auto">
        <h1
          className="text-[32px] md:text-[26px] font-bold max-w-[640px] mx-auto mb-8 m-0"
          style={{ color: 'var(--text)' }}
        >
          Восстановление пароля
        </h1>
        <p
          className="max-w-[640px] mx-auto -mt-6 mb-6 text-[15px] leading-relaxed"
          style={{ color: 'var(--muted)' }}
        >
          Введите email, указанный при регистрации. Мы отправим ссылку для сброса пароля.
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
          <div className="flex flex-col gap-2">
            <label className="text-[13px] font-semibold" style={{ color: 'var(--muted)' }}>Email</label>
            <input
              type="email"
              className="w-full py-3 px-3.5 rounded-xl border text-[15px] transition-all duration-200 focus:outline-none focus:border-[var(--primary)] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.12)]"
              style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@mail.ru"
              required
              autoFocus
            />
          </div>

          <button
            type="submit"
            className="w-full mt-3.5 py-3.5 px-4.5 bg-[var(--primary)] border border-[var(--primary)] rounded-xl text-white text-[15px] font-bold cursor-pointer transition-all duration-200 hover:bg-blue-700 hover:border-blue-700 disabled:opacity-70 disabled:cursor-not-allowed"
            disabled={loading}
          >
            {loading ? "Отправка..." : "Отправить ссылку"}
          </button>
        </form>

        <div className="mt-3.5 text-sm text-center">
          <Link to="/login" className="text-[var(--primary)] no-underline hover:underline">
            Вернуться ко входу
          </Link>
        </div>
      </div>
    </div>
  );
}
