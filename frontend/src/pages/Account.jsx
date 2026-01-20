import { useEffect, useState } from "react";
import { api, getTokens } from "../api.js";
import { Link } from "react-router-dom";
import "./Account.css";

export default function Account() {
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(false);
  const loggedIn = Boolean(getTokens().access);

  useEffect(() => {
    (async () => {
      if (!loggedIn) return;
      setLoading(true);
      try {
        const resp = await api.get("/auth/me/");
        setMe(resp.data);
      } finally {
        setLoading(false);
      }
    })();
  }, [loggedIn]);

  return (
    <div className="account">
      <div className="account__container">
        <div className="account__header">
          <h1 className="account__title">Личный кабинет</h1>
        </div>

        {!loggedIn ? (
          <div className="account__empty">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>

            <h3>Вы не авторизованы</h3>
            <p>Войдите в аккаунт, чтобы видеть заказы и управлять профилем</p>

            <div className="account__actions">
              <Link className="account__btn account__btn--primary" to="/login">
                Войти
              </Link>
              <Link className="account__btn" to="/register">
                Регистрация
              </Link>
            </div>
          </div>
        ) : loading || !me ? (
          <div className="account__skeleton">
            <div className="account__card account__card--skeleton" />
            <div className="account__card account__card--skeleton" />
          </div>
        ) : (
          <div className="account__grid">
            <div className="account__card">
              <div className="account__card-title">Профиль</div>

              <div className="account__row">
                <div className="account__label">Email</div>
                <div className="account__value">{me.email || "—"}</div>
              </div>

              <div className="account__row">
                <div className="account__label">Имя</div>
                <div className="account__value">
                  {[me.first_name, me.last_name].filter(Boolean).join(" ") || "—"}
                </div>
              </div>

              <div className="account__row">
                <div className="account__label">Телефон</div>
                <div className="account__value">{me.phone || "—"}</div>
              </div>

              <div className="account__hint">
                Редактирование профиля добавим следующим шагом.
              </div>
            </div>

            <div className="account__card">
              <div className="account__card-title">Заказы</div>
              <p className="account__muted">
                В этой версии заказы создаются через endpoint{" "}
                <code className="account__code">/api/orders/checkout/</code>.
                Чуть позже добавим UI оформления заказа и список заказов в личном кабинете.
              </p>

              <div className="account__actions">
                <Link className="account__btn" to="/catalog">
                  Перейти в каталог
                </Link>
                <Link className="account__btn account__btn--primary" to="/cart">
                  Перейти в корзину
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
