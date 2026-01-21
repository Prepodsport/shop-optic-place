import { useState } from "react";
import { api, setTokens } from "../api.js";
import { Link, useNavigate } from "react-router-dom";
import "./Auth.css";

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
    <div className="auth">
      <div className="auth__container">
        <div className="auth__header">
          <h1 className="auth__title">Вход</h1>
        </div>

        <form className="auth__card" onSubmit={submit}>
          <div className="auth__grid">
            <label className="auth__field auth__field--full">
              <span className="auth__label">Email</span>
              <input
                className="auth__input"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </label>

            <label className="auth__field auth__field--full">
              <span className="auth__label">Пароль</span>
              <input
                className="auth__input"
                type="password"
                placeholder="Введите пароль"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </label>

            <div className="auth__forgot">
              <Link to="/forgot-password" className="auth__link">
                Забыли пароль?
              </Link>
            </div>
          </div>

          {err ? <div className="auth__status auth__status--error">{err}</div> : null}

          <button className="auth__btn auth__btn--primary" type="submit" disabled={loading}>
            {loading ? "Входим..." : "Войти"}
          </button>

          <div className="auth__footer">
            <span className="auth__muted">Нет аккаунта?</span>{" "}
            <Link to="/register" className="auth__link">
              Зарегистрироваться
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
