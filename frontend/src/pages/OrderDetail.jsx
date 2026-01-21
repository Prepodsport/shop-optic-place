import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { api, getTokens, getErrorMessage } from "../api.js";
import "./OrderDetail.css";

export default function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cancelling, setCancelling] = useState(false);

  const isAuthenticated = Boolean(getTokens().access);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }

    const fetchOrder = async () => {
      setLoading(true);
      try {
        const resp = await api.get(`/orders/my/${id}/`);
        setOrder(resp.data);
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [id, isAuthenticated, navigate]);

  const handleCancel = async () => {
    if (!window.confirm("Вы уверены, что хотите отменить заказ?")) return;

    setCancelling(true);
    try {
      const resp = await api.post(`/orders/my/${id}/cancel/`);
      setOrder(resp.data);
    } catch (err) {
      alert(getErrorMessage(err));
    } finally {
      setCancelling(false);
    }
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
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

  if (loading) {
    return (
      <div className="order-detail">
        <div className="order-detail__container">
          <div className="order-detail__skeleton">
            <div className="order-detail__skeleton-header" />
            <div className="order-detail__skeleton-content" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="order-detail">
        <div className="order-detail__container">
          <div className="order-detail__error">
            <h2>Ошибка загрузки заказа</h2>
            <p>{error}</p>
            <Link to="/account" className="order-detail__btn">
              Вернуться в личный кабинет
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!order) return null;

  return (
    <div className="order-detail">
      <div className="order-detail__container">
        <div className="order-detail__header">
          <Link to="/account" className="order-detail__back">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
            Назад к заказам
          </Link>
          <div className="order-detail__title-row">
            <h1 className="order-detail__title">Заказ #{order.id}</h1>
            <span
              className="order-detail__status"
              style={{ backgroundColor: getStatusColor(order.status) }}
            >
              {order.status_display}
            </span>
          </div>
          <div className="order-detail__date">
            Оформлен {formatDate(order.created_at)}
          </div>
        </div>

        <div className="order-detail__content">
          <div className="order-detail__main">
            {/* Товары */}
            <div className="order-detail__section">
              <h2 className="order-detail__section-title">Товары</h2>
              <div className="order-detail__items">
                {order.items.map((item) => (
                  <div key={item.id} className="order-detail__item">
                    <div className="order-detail__item-image">
                      {item.product?.main_image_url ? (
                        <img src={item.product.main_image_url} alt={item.product_name} />
                      ) : (
                        <div className="order-detail__item-noimage">📷</div>
                      )}
                    </div>
                    <div className="order-detail__item-info">
                      <div className="order-detail__item-name">
                        {item.product_name || item.product?.name}
                      </div>
                      {item.variant_attributes && Object.keys(item.variant_attributes).length > 0 && (
                        <div className="order-detail__item-attrs">
                          {Object.entries(item.variant_attributes).map(([key, value]) => (
                            <span key={key}>{key}: {value}</span>
                          ))}
                        </div>
                      )}
                      <div className="order-detail__item-sku">
                        Артикул: {item.product_sku || "—"}
                      </div>
                    </div>
                    <div className="order-detail__item-qty">
                      {item.qty} шт.
                    </div>
                    <div className="order-detail__item-price">
                      {formatPrice(item.line_total)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Доставка */}
            {order.shipping_method && (
              <div className="order-detail__section">
                <h2 className="order-detail__section-title">Доставка</h2>
                <div className="order-detail__info-grid">
                  <div className="order-detail__info-item">
                    <span className="order-detail__info-label">Способ доставки</span>
                    <span className="order-detail__info-value">{order.shipping_method}</span>
                  </div>
                  {order.shipping_name && (
                    <div className="order-detail__info-item">
                      <span className="order-detail__info-label">Получатель</span>
                      <span className="order-detail__info-value">{order.shipping_name}</span>
                    </div>
                  )}
                  {order.shipping_address && (
                    <div className="order-detail__info-item order-detail__info-item--full">
                      <span className="order-detail__info-label">Адрес</span>
                      <span className="order-detail__info-value">
                        {order.shipping_postal_code && `${order.shipping_postal_code}, `}
                        {order.shipping_city && `${order.shipping_city}, `}
                        {order.shipping_address}
                      </span>
                    </div>
                  )}
                  {order.tracking_number && (
                    <div className="order-detail__info-item">
                      <span className="order-detail__info-label">Трек-номер</span>
                      <span className="order-detail__info-value">{order.tracking_number}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Контакты */}
            <div className="order-detail__section">
              <h2 className="order-detail__section-title">Контактные данные</h2>
              <div className="order-detail__info-grid">
                <div className="order-detail__info-item">
                  <span className="order-detail__info-label">Email</span>
                  <span className="order-detail__info-value">{order.email}</span>
                </div>
                {order.phone && (
                  <div className="order-detail__info-item">
                    <span className="order-detail__info-label">Телефон</span>
                    <span className="order-detail__info-value">{order.phone}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Комментарий */}
            {order.customer_note && (
              <div className="order-detail__section">
                <h2 className="order-detail__section-title">Комментарий к заказу</h2>
                <p className="order-detail__note">{order.customer_note}</p>
              </div>
            )}
          </div>

          {/* Сайдбар */}
          <div className="order-detail__sidebar">
            <div className="order-detail__summary">
              <h3 className="order-detail__summary-title">Итого</h3>

              <div className="order-detail__summary-row">
                <span>Товары ({order.items.length})</span>
                <span>{formatPrice(order.total)}</span>
              </div>

              {order.shipping_cost > 0 && (
                <div className="order-detail__summary-row">
                  <span>Доставка</span>
                  <span>{formatPrice(order.shipping_cost)}</span>
                </div>
              )}

              {order.discount_total > 0 && (
                <div className="order-detail__summary-row order-detail__summary-row--discount">
                  <span>Скидка</span>
                  <span>-{formatPrice(order.discount_total)}</span>
                </div>
              )}

              <div className="order-detail__summary-total">
                <span>К оплате</span>
                <span>{formatPrice(order.grand_total)}</span>
              </div>

              {order.payment_method && (
                <div className="order-detail__payment">
                  Способ оплаты: {order.payment_method}
                  {order.paid_at && (
                    <div className="order-detail__paid">
                      Оплачено {formatDate(order.paid_at)}
                    </div>
                  )}
                </div>
              )}

              {order.can_cancel && (
                <button
                  className="order-detail__cancel-btn"
                  onClick={handleCancel}
                  disabled={cancelling}
                >
                  {cancelling ? "Отмена..." : "Отменить заказ"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
