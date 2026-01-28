import { useState } from "react";
import { api, setTokens } from "../api.js";
import { Link, useNavigate } from "react-router-dom";

export default function Login() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      const resp = await api.post("/auth/token/", { email, password });
      setTokens(resp.data.access, resp.data.refresh);
      nav("/account");
    } catch {
      setErr("Не удалось войти. Проверьте email/пароль.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="py-10 md:py-8 px-4 pb-15 md:pb-10">
      <div className="max-w-[1280px] mx-auto">
        <h1
          className="text-[32px] md:text-[26px] font-bold max-w-[640px] mx-auto mb-8 m-0"
          style={{ color: 'var(--text)' }}
        >
          Вход
        </h1>

        <form
          className="max-w-[640px] mx-auto rounded-2xl p-6 md:p-5 border"
          style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
          onSubmit={submit}
        >
          <div className="grid grid-cols-2 md:grid-cols-1 gap-3.5">
            <label className="flex flex-col gap-2 col-span-full">
              <span className="text-[13px] font-semibold" style={{ color: 'var(--muted)' }}>Email</span>
              <input
                className="w-full py-3 px-3.5 rounded-xl border text-[15px] transition-all duration-200 focus:outline-none focus:border-[var(--primary)] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.12)]"
                style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }}
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </label>

            <label className="flex flex-col gap-2 col-span-full">
              <span className="text-[13px] font-semibold" style={{ color: 'var(--muted)' }}>Пароль</span>
              <input
                className="w-full py-3 px-3.5 rounded-xl border text-[15px] transition-all duration-200 focus:outline-none focus:border-[var(--primary)] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.12)]"
                style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }}
                type="password"
                placeholder="Введите пароль"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </label>

            <div className="-mt-1.5">
              <Link to="/forgot-password" className="text-[var(--primary)] font-bold text-sm no-underline hover:underline">
                Забыли пароль?
              </Link>
            </div>
          </div>

          {err && (
            <div
              className="mt-3 py-3 px-3.5 rounded-xl border text-sm leading-relaxed"
              style={{
                background: 'var(--bg)',
                borderColor: 'rgba(239, 68, 68, 0.35)',
                color: 'var(--text)',
              }}
            >
              {err}
            </div>
          )}

          <button
            className="w-full mt-3.5 py-3.5 px-4.5 bg-[var(--primary)] border border-[var(--primary)] rounded-xl text-white text-[15px] font-bold cursor-pointer transition-all duration-200 hover:bg-blue-700 hover:border-blue-700 disabled:opacity-70 disabled:cursor-not-allowed"
            type="submit"
            disabled={loading}
          >
            {loading ? "Входим..." : "Войти"}
          </button>

          <div className="mt-3.5 text-sm text-center" style={{ color: 'var(--muted)' }}>
            <span>Нет аккаунта?</span>{" "}
            <Link to="/register" className="text-[var(--primary)] font-bold no-underline hover:underline">
              Зарегистрироваться
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
