import { useState } from "react";
import { api, setTokens } from "../api.js";
import { Link, useNavigate } from "react-router-dom";

export default function Register() {
  const nav = useNavigate();
  const [form, setForm] = useState({
    email: "",
    password: "",
    first_name: "",
    last_name: "",
    phone: "",
  });
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  function setField(name, value) {
    setForm((f) => ({ ...f, [name]: value }));
  }

  async function submit(e) {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      await api.post("/auth/register/", form);
      const resp = await api.post("/auth/token/", {
        email: form.email,
        password: form.password,
      });
      setTokens(resp.data.access, resp.data.refresh);
      nav("/account");
    } catch {
      setErr("Не удалось зарегистрироваться. Проверьте данные (email уникален, пароль минимум 6).");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="py-10 md:py-8 px-4 pb-15 md:pb-10">
      <div className="max-w-[1600px] mx-auto">
        <h1
          className="text-[32px] md:text-[26px] font-bold max-w-[640px] mx-auto mb-8 m-0"
          style={{ color: 'var(--text)' }}
        >
          Регистрация
        </h1>

        <form
          className="max-w-[640px] mx-auto rounded-2xl p-6 md:p-5 border"
          style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
          onSubmit={submit}
        >
          <div className="grid grid-cols-2 md:grid-cols-1 gap-3.5">
            <label className="flex flex-col gap-2">
              <span className="text-[13px] font-semibold" style={{ color: 'var(--muted)' }}>Имя</span>
              <input
                className="w-full py-3 px-3.5 rounded-xl border text-[15px] transition-all duration-200 focus:outline-none focus:border-[var(--primary)] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.12)]"
                style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }}
                placeholder="Иван"
                value={form.first_name}
                onChange={(e) => setField("first_name", e.target.value)}
                autoComplete="given-name"
                required
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-[13px] font-semibold" style={{ color: 'var(--muted)' }}>Фамилия</span>
              <input
                className="w-full py-3 px-3.5 rounded-xl border text-[15px] transition-all duration-200 focus:outline-none focus:border-[var(--primary)] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.12)]"
                style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }}
                placeholder="Иванов"
                value={form.last_name}
                onChange={(e) => setField("last_name", e.target.value)}
                autoComplete="family-name"
                required
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-[13px] font-semibold" style={{ color: 'var(--muted)' }}>Телефон</span>
              <input
                className="w-full py-3 px-3.5 rounded-xl border text-[15px] transition-all duration-200 focus:outline-none focus:border-[var(--primary)] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.12)]"
                style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }}
                placeholder="+7 (999) 000-00-00"
                value={form.phone}
                onChange={(e) => setField("phone", e.target.value)}
                autoComplete="tel"
                required
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-[13px] font-semibold" style={{ color: 'var(--muted)' }}>Email</span>
              <input
                className="w-full py-3 px-3.5 rounded-xl border text-[15px] transition-all duration-200 focus:outline-none focus:border-[var(--primary)] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.12)]"
                style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }}
                type="email"
                placeholder="name@example.com"
                value={form.email}
                onChange={(e) => setField("email", e.target.value)}
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
                placeholder="Минимум 6 символов"
                value={form.password}
                onChange={(e) => setField("password", e.target.value)}
                autoComplete="new-password"
                required
                minLength={6}
              />
            </label>
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
            {loading ? "Создаём аккаунт..." : "Создать аккаунт"}
          </button>

          <div className="mt-3.5 text-sm text-center" style={{ color: 'var(--muted)' }}>
            <span>Уже есть аккаунт?</span>{" "}
            <Link to="/login" className="text-[var(--primary)] font-bold no-underline hover:underline">
              Войти
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
