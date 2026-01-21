import { useEffect, useState } from "react";
import { api, getTokens, logout as apiLogout, getErrorMessage } from "../api.js";
import { Link, useNavigate } from "react-router-dom";
import "./Account.css";

export default function Account() {
  const navigate = useNavigate();
  const [me, setMe] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    phone: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loggedIn = Boolean(getTokens().access);

  useEffect(() => {
    if (!loggedIn) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const [meResp, ordersResp] = await Promise.all([
          api.get("/auth/me/"),
          api.get("/orders/my/"),
        ]);
        setMe(meResp.data);
        setFormData({
          first_name: meResp.data.first_name || "",
          last_name: meResp.data.last_name || "",
          phone: meResp.data.phone || "",
        });
        setOrders(ordersResp.data);
      } catch (err) {
        console.error("Error fetching account data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [loggedIn]);

  const handleLogout = async () => {
    await apiLogout();
    navigate("/login");
  };

  const handleEdit = () => {
    setEditing(true);
    setError("");
    setSuccess("");
  };

  const handleCancel = () => {
    setEditing(false);
    setFormData({
      first_name: me?.first_name || "",
      last_name: me?.last_name || "",
      phone: me?.phone || "",
    });
    setError("");
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const resp = await api.patch("/auth/me/", formData);
      setMe(resp.data);
      setEditing(false);
      setSuccess("Профиль успешно обновлён");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat("ru-RU").format(price) + " ₽";
  };

  const getStatusColor = (status) => {
    const colors = {
      placed: "#f59e0b",
      confirmed: "#3b82f6",
      paid: "#10b981",
      processing: "#8b5cf6",
      shipped: "#06b6d4",
      delivered: "#22c55e",
      cancelled: "#ef4444",
      refunded: "#6b7280",
    };
    return colors[status] || "#6b7280";
  };

  return (
    <div className="account">
      <div className="account__container">
        <div className="account__header">
          <h1 className="account__title">Личный кабинет</h1>
          {loggedIn && (
            <button className="account__logout-btn" onClick={handleLogout}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16 17 21 12 16 7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
              Выйти
            </button>
          )}
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
            {/* Профиль */}
            <div className="account__card">
              <div className="account__card-header">
                <div className="account__card-title">Профиль</div>
                {!editing && (
                  <button className="account__edit-btn" onClick={handleEdit}>
                    Редактировать
                  </button>
                )}
              </div>

              {error && <div className="account__error">{error}</div>}
              {success && <div className="account__success">{success}</div>}

              {editing ? (
                <form onSubmit={handleSave} className="account__form">
                  <div className="account__field">
                    <label className="account__label">Имя</label>
                    <input
                      type="text"
                      className="account__input"
                      value={formData.first_name}
                      onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    />
                  </div>
                  <div className="account__field">
                    <label className="account__label">Фамилия</label>
                    <input
                      type="text"
                      className="account__input"
                      value={formData.last_name}
                      onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    />
                  </div>
                  <div className="account__field">
                    <label className="account__label">Телефон</label>
                    <input
                      type="tel"
                      className="account__input"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+7 (999) 123-45-67"
                    />
                  </div>
                  <div className="account__form-actions">
                    <button
                      type="button"
                      className="account__btn"
                      onClick={handleCancel}
                      disabled={saving}
                    >
                      Отмена
                    </button>
                    <button
                      type="submit"
                      className="account__btn account__btn--primary"
                      disabled={saving}
                    >
                      {saving ? "Сохранение..." : "Сохранить"}
                    </button>
                  </div>
                </form>
              ) : (
                <>
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

                  <div className="account__row">
                    <div className="account__label">Дата регистрации</div>
                    <div className="account__value">{formatDate(me.date_joined)}</div>
                  </div>
                </>
              )}
            </div>

            {/* Заказы */}
            <div className="account__card">
              <div className="account__card-title">История заказов</div>

              {orders.length === 0 ? (
                <div className="account__orders-empty">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
                    <line x1="3" y1="6" x2="21" y2="6"></line>
                    <path d="M16 10a4 4 0 0 1-8 0"></path>
                  </svg>
                  <p>У вас пока нет заказов</p>
                  <Link to="/catalog" className="account__btn account__btn--primary">
                    Перейти в каталог
                  </Link>
                </div>
              ) : (
                <div className="account__orders">
                  {orders.map((order) => (
                    <Link
                      key={order.id}
                      to={`/orders/${order.id}`}
                      className="account__order"
                    >
                      <div className="account__order-header">
                        <span className="account__order-number">
                          Заказ #{order.id}
                        </span>
                        <span
                          className="account__order-status"
                          style={{ backgroundColor: getStatusColor(order.status) }}
                        >
                          {order.status_display}
                        </span>
                      </div>
                      <div className="account__order-info">
                        <span className="account__order-date">
                          {formatDate(order.created_at)}
                        </span>
                        <span className="account__order-total">
                          {formatPrice(order.grand_total)}
                        </span>
                      </div>
                      <div className="account__order-items">
                        {order.items_count} {order.items_count === 1 ? "товар" : order.items_count < 5 ? "товара" : "товаров"}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Быстрые действия */}
            <div className="account__card account__card--actions">
              <div className="account__card-title">Быстрые действия</div>
              <div className="account__quick-actions">
                <Link to="/cart" className="account__quick-action">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="9" cy="21" r="1"></circle>
                    <circle cx="20" cy="21" r="1"></circle>
                    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                  </svg>
                  <span>Корзина</span>
                </Link>
                <Link to="/favorites" className="account__quick-action">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                  </svg>
                  <span>Избранное</span>
                </Link>
                <Link to="/prescriptions" className="account__quick-action">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                  <span>Мои рецепты</span>
                </Link>
                <Link to="/booking" className="account__quick-action">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                  </svg>
                  <span>Запись на приём</span>
                </Link>
                <Link to="/catalog" className="account__quick-action">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  </svg>
                  <span>Каталог</span>
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
