import { useState } from "react";
import { api, setTokens } from "../api.js";
import { Link, useNavigate } from "react-router-dom";
import "./Auth.css";

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
    <div className="auth">
      <div className="auth__container">
        <div className="auth__header">
          <h1 className="auth__title">Регистрация</h1>
        </div>

        <form className="auth__card" onSubmit={submit}>
          <div className="auth__grid">
            <label className="auth__field">
              <span className="auth__label">Имя</span>
              <input
                className="auth__input"
                placeholder="Иван"
                value={form.first_name}
                onChange={(e) => setField("first_name", e.target.value)}
                autoComplete="given-name"
                required
              />
            </label>

            <label className="auth__field">
              <span className="auth__label">Фамилия</span>
              <input
                className="auth__input"
                placeholder="Иванов"
                value={form.last_name}
                onChange={(e) => setField("last_name", e.target.value)}
                autoComplete="family-name"
                required
              />
            </label>

            <label className="auth__field">
              <span className="auth__label">Телефон</span>
              <input
                className="auth__input"
                placeholder="+7 (999) 000-00-00"
                value={form.phone}
                onChange={(e) => setField("phone", e.target.value)}
                autoComplete="tel"
                required
              />
            </label>

            <label className="auth__field">
              <span className="auth__label">Email</span>
              <input
                className="auth__input"
                type="email"
                placeholder="name@example.com"
                value={form.email}
                onChange={(e) => setField("email", e.target.value)}
                autoComplete="email"
                required
              />
            </label>

            <label className="auth__field auth__field--full">
              <span className="auth__label">Пароль</span>
              <input
                className="auth__input"
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

          {err ? <div className="auth__status auth__status--error">{err}</div> : null}

          <button className="auth__btn auth__btn--primary" type="submit" disabled={loading}>
            {loading ? "Создаём аккаунт..." : "Создать аккаунт"}
          </button>

          <div className="auth__footer">
            <span className="auth__muted">Уже есть аккаунт?</span>{" "}
            <Link to="/login" className="auth__link">
              Войти
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
