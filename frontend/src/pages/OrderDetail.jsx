import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { api, getTokens, getErrorMessage } from "../api.js";

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
      <div className="py-10 md:py-8 px-4 pb-15 md:pb-10">
        <div className="max-w-[1200px] mx-auto">
          <div className="flex flex-col gap-6">
            <div
              className="h-[100px] rounded-2xl border relative overflow-hidden animate-shimmer"
              style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
            />
            <div
              className="h-[400px] rounded-2xl border relative overflow-hidden animate-shimmer"
              style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
            />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-10 md:py-8 px-4 pb-15 md:pb-10">
        <div className="max-w-[1200px] mx-auto">
          <div
            className="text-center py-15 px-5 rounded-2xl border"
            style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
          >
            <h2
              className="m-0 mb-3 text-[22px]"
              style={{ color: 'var(--text)' }}
            >
              Ошибка загрузки заказа
            </h2>
            <p className="m-0 mb-6" style={{ color: 'var(--muted)' }}>{error}</p>
            <Link
              to="/account"
              className="inline-flex items-center justify-center py-3.5 px-6 bg-[var(--primary)] border border-[var(--primary)] rounded-[10px] text-white text-[15px] font-semibold no-underline cursor-pointer transition-all duration-200 hover:bg-blue-700 hover:border-blue-700"
            >
              Вернуться в личный кабинет
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!order) return null;

  return (
    <div className="py-10 md:py-8 px-4 pb-15 md:pb-10">
      <div className="max-w-[1200px] mx-auto">
        <div className="mb-8">
          <Link
            to="/account"
            className="inline-flex items-center gap-2 text-[14px] no-underline mb-4 transition-colors duration-200 hover:text-[var(--primary)]"
            style={{ color: 'var(--muted)' }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
            Назад к заказам
          </Link>
          <div className="flex items-center gap-4 flex-wrap">
            <h1
              className="text-[32px] md:text-[26px] font-bold m-0"
              style={{ color: 'var(--text)' }}
            >
              Заказ #{order.id}
            </h1>
            <span
              className="py-1.5 px-3.5 rounded-[20px] text-[14px] font-semibold text-white"
              style={{ backgroundColor: getStatusColor(order.status) }}
            >
              {order.status_display}
            </span>
          </div>
          <div className="mt-2 text-[14px]" style={{ color: 'var(--muted)' }}>
            Оформлен {formatDate(order.created_at)}
          </div>
        </div>

        <div className="grid grid-cols-[1fr_380px] lg:grid-cols-1 gap-8 items-start">
          <div className="flex flex-col gap-6">
            {/* Товары */}
            <div
              className="rounded-2xl p-6 border"
              style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
            >
              <h2
                className="text-[18px] font-bold m-0 mb-5"
                style={{ color: 'var(--text)' }}
              >
                Товары
              </h2>
              <div className="flex flex-col gap-4">
                {order.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-4 pb-4 border-b last:pb-0 last:border-b-0 md:flex-wrap"
                    style={{ borderColor: 'var(--border)' }}
                  >
                    <div
                      className="w-[72px] h-[72px] flex-shrink-0 rounded-[10px] overflow-hidden"
                      style={{ background: 'var(--bg)' }}
                    >
                      {item.product?.main_image_url ? (
                        <img
                          src={item.product.main_image_url}
                          alt={item.product_name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[24px]">
                          📷
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0 md:flex-[1_1_100%] md:order-2 md:mt-2">
                      <div
                        className="text-[15px] font-semibold mb-1"
                        style={{ color: 'var(--text)' }}
                      >
                        {item.product_name || item.product?.name}
                      </div>
                      {item.variant_attributes && Object.keys(item.variant_attributes).length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-1">
                          {Object.entries(item.variant_attributes).map(([key, value]) => (
                            <span
                              key={key}
                              className="text-[12px] py-0.5 px-2 rounded"
                              style={{ color: 'var(--muted)', background: 'var(--bg)' }}
                            >
                              {key}: {value}
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="text-[12px]" style={{ color: 'var(--muted)' }}>
                        Артикул: {item.product_sku || "—"}
                      </div>
                    </div>
                    <div
                      className="text-[14px] whitespace-nowrap md:order-1"
                      style={{ color: 'var(--muted)' }}
                    >
                      {item.qty} шт.
                    </div>
                    <div
                      className="text-[15px] font-bold whitespace-nowrap md:order-1"
                      style={{ color: 'var(--text)' }}
                    >
                      {formatPrice(item.line_total)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Доставка */}
            {order.shipping_method && (
              <div
                className="rounded-2xl p-6 border"
                style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
              >
                <h2
                  className="text-[18px] font-bold m-0 mb-5"
                  style={{ color: 'var(--text)' }}
                >
                  Доставка
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-1 gap-4">
                  <div className="flex flex-col gap-1">
                    <span className="text-[12px]" style={{ color: 'var(--muted)' }}>Способ доставки</span>
                    <span className="text-[15px] font-medium" style={{ color: 'var(--text)' }}>{order.shipping_method}</span>
                  </div>
                  {order.shipping_name && (
                    <div className="flex flex-col gap-1">
                      <span className="text-[12px]" style={{ color: 'var(--muted)' }}>Получатель</span>
                      <span className="text-[15px] font-medium" style={{ color: 'var(--text)' }}>{order.shipping_name}</span>
                    </div>
                  )}
                  {order.shipping_address && (
                    <div className="flex flex-col gap-1 col-span-full">
                      <span className="text-[12px]" style={{ color: 'var(--muted)' }}>Адрес</span>
                      <span className="text-[15px] font-medium" style={{ color: 'var(--text)' }}>
                        {order.shipping_postal_code && `${order.shipping_postal_code}, `}
                        {order.shipping_city && `${order.shipping_city}, `}
                        {order.shipping_address}
                      </span>
                    </div>
                  )}
                  {order.tracking_number && (
                    <div className="flex flex-col gap-1">
                      <span className="text-[12px]" style={{ color: 'var(--muted)' }}>Трек-номер</span>
                      <span className="text-[15px] font-medium" style={{ color: 'var(--text)' }}>{order.tracking_number}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Контакты */}
            <div
              className="rounded-2xl p-6 border"
              style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
            >
              <h2
                className="text-[18px] font-bold m-0 mb-5"
                style={{ color: 'var(--text)' }}
              >
                Контактные данные
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-1 gap-4">
                <div className="flex flex-col gap-1">
                  <span className="text-[12px]" style={{ color: 'var(--muted)' }}>Email</span>
                  <span className="text-[15px] font-medium" style={{ color: 'var(--text)' }}>{order.email}</span>
                </div>
                {order.phone && (
                  <div className="flex flex-col gap-1">
                    <span className="text-[12px]" style={{ color: 'var(--muted)' }}>Телефон</span>
                    <span className="text-[15px] font-medium" style={{ color: 'var(--text)' }}>{order.phone}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Комментарий */}
            {order.customer_note && (
              <div
                className="rounded-2xl p-6 border"
                style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
              >
                <h2
                  className="text-[18px] font-bold m-0 mb-5"
                  style={{ color: 'var(--text)' }}
                >
                  Комментарий к заказу
                </h2>
                <p
                  className="text-[15px] leading-relaxed m-0"
                  style={{ color: 'var(--text)' }}
                >
                  {order.customer_note}
                </p>
              </div>
            )}
          </div>

          {/* Сайдбар */}
          <div className="sticky top-6 lg:static lg:order-[-1]">
            <div
              className="rounded-2xl p-6 border"
              style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
            >
              <h3
                className="text-[18px] font-bold m-0 mb-5"
                style={{ color: 'var(--text)' }}
              >
                Итого
              </h3>

              <div className="flex justify-between mb-3 text-[14px]" style={{ color: 'var(--muted)' }}>
                <span>Товары ({order.items.length})</span>
                <span className="font-medium" style={{ color: 'var(--text)' }}>{formatPrice(order.total)}</span>
              </div>

              {order.shipping_cost > 0 && (
                <div className="flex justify-between mb-3 text-[14px]" style={{ color: 'var(--muted)' }}>
                  <span>Доставка</span>
                  <span className="font-medium" style={{ color: 'var(--text)' }}>{formatPrice(order.shipping_cost)}</span>
                </div>
              )}

              {order.discount_total > 0 && (
                <div className="flex justify-between mb-3 text-[14px]" style={{ color: 'var(--muted)' }}>
                  <span>Скидка</span>
                  <span className="font-medium text-green-600">-{formatPrice(order.discount_total)}</span>
                </div>
              )}

              <div
                className="flex justify-between pt-4 mt-2 border-t text-[18px] font-bold"
                style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
              >
                <span>К оплате</span>
                <span>{formatPrice(order.grand_total)}</span>
              </div>

              {order.payment_method && (
                <div
                  className="mt-5 pt-5 border-t text-[14px]"
                  style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}
                >
                  Способ оплаты: {order.payment_method}
                  {order.paid_at && (
                    <div className="mt-1 text-[13px] text-green-600">
                      Оплачено {formatDate(order.paid_at)}
                    </div>
                  )}
                </div>
              )}

              {order.can_cancel && (
                <button
                  className="w-full mt-5 py-3.5 bg-transparent border border-red-200 rounded-[10px] text-red-600 text-[15px] font-semibold cursor-pointer transition-all duration-200 hover:bg-red-50 disabled:opacity-60 disabled:cursor-not-allowed"
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
