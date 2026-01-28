import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { api, getTokens, getErrorMessage } from "../api.js";

const SHIPPING_METHODS = [
  { id: "pickup", name: "Самовывоз", description: "Бесплатно. Адрес: г. Москва, ул. Примерная, 1", price: 0 },
  { id: "courier", name: "Курьерская доставка", description: "По Москве и МО", price: 350 },
  { id: "cdek", name: "СДЭК", description: "Доставка по России", price: 450 },
  { id: "post", name: "Почта России", description: "Доставка по России", price: 300 },
];

const PAYMENT_METHODS = [
  { id: "card", name: "Банковская карта", description: "Visa, MasterCard, МИР" },
  { id: "cash", name: "Наличными при получении", description: "Только для самовывоза и курьера" },
  { id: "sbp", name: "СБП", description: "Система быстрых платежей" },
];

export default function Checkout() {
  const navigate = useNavigate();
  const { items, totalItems, totalPrice, clearCart } = useCart();
  const isAuthenticated = Boolean(getTokens().access);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState(1);
  const [orderComplete, setOrderComplete] = useState(null);

  const [formData, setFormData] = useState({
    email: "",
    phone: "",
    shipping_name: "",
    shipping_address: "",
    shipping_city: "",
    shipping_postal_code: "",
    shipping_method: "pickup",
    payment_method: "card",
    customer_note: "",
    coupon_code: "",
  });

  const [couponApplied, setCouponApplied] = useState(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState("");

  useEffect(() => {
    if (isAuthenticated) {
      api.get("/auth/me/").then((resp) => {
        const user = resp.data;
        setFormData((prev) => ({
          ...prev,
          email: user.email || "",
          phone: user.phone || "",
          shipping_name: [user.first_name, user.last_name].filter(Boolean).join(" ") || "",
        }));
      }).catch(() => {});
    }
  }, [isAuthenticated]);

  const isEmpty = items.length === 0;

  if (isEmpty && !orderComplete) {
    return (
      <div className="py-10 md:py-8 px-4 pb-15 md:pb-10">
        <div className="max-w-[1200px] mx-auto">
          <div
            className="text-center py-20 px-5 rounded-2xl border"
            style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
          >
            <svg
              className="mb-5"
              width="64"
              height="64"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              style={{ color: 'var(--muted)' }}
            >
              <circle cx="9" cy="21" r="1"></circle>
              <circle cx="20" cy="21" r="1"></circle>
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
            </svg>
            <h3 className="m-0 mb-3 text-[22px]" style={{ color: 'var(--text)' }}>
              Корзина пуста
            </h3>
            <p className="m-0 mb-6 text-base" style={{ color: 'var(--muted)' }}>
              Добавьте товары из каталога для оформления заказа
            </p>
            <Link
              to="/catalog"
              className="inline-flex items-center justify-center py-3.5 px-6 bg-[var(--primary)] border border-[var(--primary)] rounded-[10px] text-white text-[15px] font-semibold no-underline cursor-pointer transition-all duration-200 hover:bg-blue-700 hover:border-blue-700 hover:no-underline"
            >
              Перейти в каталог
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (orderComplete) {
    return (
      <div className="py-10 md:py-8 px-4 pb-15 md:pb-10">
        <div className="max-w-[1200px] mx-auto">
          <div
            className="text-center py-15 px-5 rounded-2xl border"
            style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
          >
            <div className="mb-6">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-green-500">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
            </div>
            <h2 className="m-0 mb-4 text-[28px]" style={{ color: 'var(--text)' }}>
              Заказ успешно оформлен!
            </h2>
            <p className="text-lg m-0 mb-3" style={{ color: 'var(--text)' }}>
              Номер заказа: <strong>#{orderComplete.id}</strong>
            </p>
            <p className="text-[15px] m-0 mb-5 max-w-[400px] mx-auto" style={{ color: 'var(--muted)' }}>
              Мы отправили подтверждение на <strong>{orderComplete.email}</strong>.
              {formData.payment_method === "card" && " Ожидайте перенаправление на страницу оплаты."}
            </p>
            <div className="text-xl mb-8" style={{ color: 'var(--text)' }}>
              Сумма к оплате: <strong>{orderComplete.grand_total?.toLocaleString("ru-RU")} ₽</strong>
            </div>
            <div className="flex gap-3 justify-center flex-wrap sm:flex-col">
              {isAuthenticated && (
                <Link
                  to="/account"
                  className="inline-flex items-center justify-center py-3.5 px-6 bg-transparent border border-[var(--border)] rounded-[10px] text-[15px] font-semibold no-underline cursor-pointer transition-all duration-200 hover:bg-[var(--bg)] hover:no-underline"
                  style={{ color: 'var(--text)' }}
                >
                  Мои заказы
                </Link>
              )}
              <Link
                to="/catalog"
                className="inline-flex items-center justify-center py-3.5 px-6 bg-[var(--primary)] border border-[var(--primary)] rounded-[10px] text-white text-[15px] font-semibold no-underline cursor-pointer transition-all duration-200 hover:bg-blue-700 hover:border-blue-700 hover:no-underline"
              >
                Продолжить покупки
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const selectedShipping = SHIPPING_METHODS.find((m) => m.id === formData.shipping_method);
  const shippingCost = selectedShipping?.price || 0;
  const discount = couponApplied?.discount || 0;
  const grandTotal = totalPrice + shippingCost - discount;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleApplyCoupon = async () => {
    if (!formData.coupon_code.trim()) return;

    setCouponLoading(true);
    setCouponError("");

    try {
      const resp = await api.post("/orders/coupon/validate/", {
        code: formData.coupon_code,
        total: totalPrice,
      });

      if (resp.data.valid) {
        setCouponApplied(resp.data);
      } else {
        setCouponError(resp.data.message);
        setCouponApplied(null);
      }
    } catch (err) {
      setCouponError(getErrorMessage(err));
      setCouponApplied(null);
    } finally {
      setCouponLoading(false);
    }
  };

  const removeCoupon = () => {
    setCouponApplied(null);
    setFormData((prev) => ({ ...prev, coupon_code: "" }));
    setCouponError("");
  };

  const validateStep = (stepNum) => {
    if (stepNum === 1) {
      if (!formData.email.trim()) return "Укажите email";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) return "Некорректный email";
      if (!formData.phone.trim()) return "Укажите телефон";
      if (!formData.shipping_name.trim()) return "Укажите ФИО получателя";
    }
    if (stepNum === 2) {
      if (formData.shipping_method !== "pickup") {
        if (!formData.shipping_city.trim()) return "Укажите город";
        if (!formData.shipping_address.trim()) return "Укажите адрес доставки";
      }
    }
    return null;
  };

  const nextStep = () => {
    const validationError = validateStep(step);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError("");
    setStep((s) => Math.min(s + 1, 3));
  };

  const prevStep = () => {
    setError("");
    setStep((s) => Math.max(s - 1, 1));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validationError = validateStep(step);
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const checkoutData = {
        email: formData.email,
        phone: formData.phone,
        shipping_name: formData.shipping_name,
        shipping_address: formData.shipping_address,
        shipping_city: formData.shipping_city,
        shipping_postal_code: formData.shipping_postal_code,
        shipping_method: formData.shipping_method,
        payment_method: formData.payment_method,
        customer_note: formData.customer_note,
        coupon_code: couponApplied ? formData.coupon_code : "",
        items: items.map((item) => ({
          product_id: item.productId,
          variant_id: item.variantId || null,
          qty: item.quantity,
        })),
      };

      const resp = await api.post("/orders/checkout/", checkoutData);
      setOrderComplete(resp.data);
      clearCart();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="py-10 md:py-8 px-4 pb-15 md:pb-10">
      <div className="max-w-[1200px] mx-auto">
        <div className="mb-6">
          <Link
            to="/cart"
            className="inline-flex items-center gap-2 text-sm no-underline mb-4 transition-colors duration-200 hover:text-[var(--primary)]"
            style={{ color: 'var(--muted)' }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
            Вернуться в корзину
          </Link>
          <h1 className="text-[32px] md:text-[26px] font-bold m-0" style={{ color: 'var(--text)' }}>
            Оформление заказа
          </h1>
        </div>

        {/* Степпер */}
        <div
          className="flex items-center justify-center mb-8 p-5 md:p-4 md:overflow-x-auto rounded-xl border"
          style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
        >
          <div className={`flex items-center gap-2.5 transition-opacity duration-200 ${step >= 1 ? 'opacity-100' : 'opacity-50'}`}>
            <span
              className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-semibold border-2 transition-all duration-200 ${
                step > 1
                  ? 'bg-green-500 border-green-500 text-white'
                  : step >= 1
                  ? 'bg-[var(--primary)] border-[var(--primary)] text-white'
                  : 'bg-[var(--bg)] border-[var(--border)]'
              }`}
              style={step < 1 ? { color: 'var(--muted)' } : {}}
            >
              1
            </span>
            <span className="text-sm font-medium md:hidden" style={{ color: 'var(--text)' }}>Контакты</span>
          </div>
          <div className="w-15 md:w-10 h-0.5 mx-4 md:mx-2" style={{ background: 'var(--border)' }}></div>
          <div className={`flex items-center gap-2.5 transition-opacity duration-200 ${step >= 2 ? 'opacity-100' : 'opacity-50'}`}>
            <span
              className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-semibold border-2 transition-all duration-200 ${
                step > 2
                  ? 'bg-green-500 border-green-500 text-white'
                  : step >= 2
                  ? 'bg-[var(--primary)] border-[var(--primary)] text-white'
                  : 'bg-[var(--bg)] border-[var(--border)]'
              }`}
              style={step < 2 ? { color: 'var(--muted)' } : {}}
            >
              2
            </span>
            <span className="text-sm font-medium md:hidden" style={{ color: 'var(--text)' }}>Доставка</span>
          </div>
          <div className="w-15 md:w-10 h-0.5 mx-4 md:mx-2" style={{ background: 'var(--border)' }}></div>
          <div className={`flex items-center gap-2.5 transition-opacity duration-200 ${step >= 3 ? 'opacity-100' : 'opacity-50'}`}>
            <span
              className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-semibold border-2 transition-all duration-200 ${
                step >= 3
                  ? 'bg-[var(--primary)] border-[var(--primary)] text-white'
                  : 'bg-[var(--bg)] border-[var(--border)]'
              }`}
              style={step < 3 ? { color: 'var(--muted)' } : {}}
            >
              3
            </span>
            <span className="text-sm font-medium md:hidden" style={{ color: 'var(--text)' }}>Оплата</span>
          </div>
        </div>

        {error && (
          <div className="py-3.5 px-4.5 mb-6 bg-red-50 border border-red-200 rounded-[10px] text-red-600 text-sm">
            {error}
          </div>
        )}

        <form className="grid grid-cols-[1fr_380px] lg:grid-cols-2 gap-8 items-start" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-6 lg:order-2">
            {/* Шаг 1: Контактные данные */}
            {step === 1 && (
              <div
                className="rounded-2xl p-6 sm:p-5 border"
                style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
              >
                <h2 className="text-xl font-bold m-0 mb-5" style={{ color: 'var(--text)' }}>
                  Контактные данные
                </h2>

                <div className="mb-4">
                  <label className="block text-[13px] font-medium mb-1.5" style={{ color: 'var(--text)' }}>
                    Email *
                  </label>
                  <input
                    type="email"
                    name="email"
                    className="w-full py-3 px-3.5 text-[15px] rounded-[10px] border transition-all duration-200 focus:outline-none focus:border-[var(--primary)] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.1)]"
                    style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }}
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="user@mail.ru"
                    required
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-[13px] font-medium mb-1.5" style={{ color: 'var(--text)' }}>
                    Телефон *
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    className="w-full py-3 px-3.5 text-[15px] rounded-[10px] border transition-all duration-200 focus:outline-none focus:border-[var(--primary)] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.1)]"
                    style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }}
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="+7 (999) 123-45-67"
                    required
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-[13px] font-medium mb-1.5" style={{ color: 'var(--text)' }}>
                    ФИО получателя *
                  </label>
                  <input
                    type="text"
                    name="shipping_name"
                    className="w-full py-3 px-3.5 text-[15px] rounded-[10px] border transition-all duration-200 focus:outline-none focus:border-[var(--primary)] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.1)]"
                    style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }}
                    value={formData.shipping_name}
                    onChange={handleChange}
                    placeholder="Иванов Иван Иванович"
                    required
                  />
                </div>

                {!isAuthenticated && (
                  <div className="mt-4 py-3 px-4 bg-sky-50 border border-sky-200 rounded-[10px] text-sm text-sky-700">
                    <Link to="/login" className="text-[var(--primary)] font-medium">Войдите</Link> или <Link to="/register" className="text-[var(--primary)] font-medium">зарегистрируйтесь</Link>,
                    чтобы отслеживать заказы в личном кабинете
                  </div>
                )}
              </div>
            )}

            {/* Шаг 2: Доставка */}
            {step === 2 && (
              <div
                className="rounded-2xl p-6 sm:p-5 border"
                style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
              >
                <h2 className="text-xl font-bold m-0 mb-5" style={{ color: 'var(--text)' }}>
                  Способ доставки
                </h2>

                <div className="flex flex-col gap-3">
                  {SHIPPING_METHODS.map((method) => (
                    <label
                      key={method.id}
                      className={`flex items-center gap-3.5 p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 hover:border-[var(--primary)] ${
                        formData.shipping_method === method.id
                          ? 'border-[var(--primary)] bg-blue-500/5'
                          : ''
                      }`}
                      style={{
                        background: formData.shipping_method === method.id ? 'rgba(37, 99, 235, 0.05)' : 'var(--bg)',
                        borderColor: formData.shipping_method === method.id ? 'var(--primary)' : 'var(--border)',
                      }}
                    >
                      <input
                        type="radio"
                        name="shipping_method"
                        value={method.id}
                        checked={formData.shipping_method === method.id}
                        onChange={handleChange}
                        className="w-5 h-5 accent-[var(--primary)]"
                      />
                      <div className="flex-1">
                        <div className="text-[15px] font-semibold mb-1" style={{ color: 'var(--text)' }}>
                          {method.name}
                        </div>
                        <div className="text-[13px]" style={{ color: 'var(--muted)' }}>
                          {method.description}
                        </div>
                      </div>
                      <div className="text-[15px] font-semibold" style={{ color: 'var(--text)' }}>
                        {method.price === 0 ? "Бесплатно" : `${method.price} ₽`}
                      </div>
                    </label>
                  ))}
                </div>

                {formData.shipping_method !== "pickup" && (
                  <div className="mt-6 pt-6 border-t" style={{ borderColor: 'var(--border)' }}>
                    <h3 className="text-base font-semibold m-0 mb-4" style={{ color: 'var(--text)' }}>
                      Адрес доставки
                    </h3>

                    <div className="grid grid-cols-2 md:grid-cols-1 gap-4 mb-4">
                      <div>
                        <label className="block text-[13px] font-medium mb-1.5" style={{ color: 'var(--text)' }}>
                          Город *
                        </label>
                        <input
                          type="text"
                          name="shipping_city"
                          className="w-full py-3 px-3.5 text-[15px] rounded-[10px] border transition-all duration-200 focus:outline-none focus:border-[var(--primary)] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.1)]"
                          style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }}
                          value={formData.shipping_city}
                          onChange={handleChange}
                          placeholder="Москва"
                        />
                      </div>
                      <div>
                        <label className="block text-[13px] font-medium mb-1.5" style={{ color: 'var(--text)' }}>
                          Индекс
                        </label>
                        <input
                          type="text"
                          name="shipping_postal_code"
                          className="w-full py-3 px-3.5 text-[15px] rounded-[10px] border transition-all duration-200 focus:outline-none focus:border-[var(--primary)] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.1)]"
                          style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }}
                          value={formData.shipping_postal_code}
                          onChange={handleChange}
                          placeholder="123456"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[13px] font-medium mb-1.5" style={{ color: 'var(--text)' }}>
                        Адрес *
                      </label>
                      <input
                        type="text"
                        name="shipping_address"
                        className="w-full py-3 px-3.5 text-[15px] rounded-[10px] border transition-all duration-200 focus:outline-none focus:border-[var(--primary)] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.1)]"
                        style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }}
                        value={formData.shipping_address}
                        onChange={handleChange}
                        placeholder="ул. Примерная, д. 1, кв. 1"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Шаг 3: Оплата */}
            {step === 3 && (
              <div
                className="rounded-2xl p-6 sm:p-5 border"
                style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
              >
                <h2 className="text-xl font-bold m-0 mb-5" style={{ color: 'var(--text)' }}>
                  Способ оплаты
                </h2>

                <div className="flex flex-col gap-3">
                  {PAYMENT_METHODS.map((method) => {
                    const disabled = method.id === "cash" && !["pickup", "courier"].includes(formData.shipping_method);

                    return (
                      <label
                        key={method.id}
                        className={`flex items-center gap-3.5 p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                          disabled
                            ? 'opacity-50 cursor-not-allowed'
                            : 'hover:border-[var(--primary)]'
                        } ${
                          formData.payment_method === method.id && !disabled
                            ? 'border-[var(--primary)]'
                            : ''
                        }`}
                        style={{
                          background: formData.payment_method === method.id && !disabled ? 'rgba(37, 99, 235, 0.05)' : 'var(--bg)',
                          borderColor: formData.payment_method === method.id && !disabled ? 'var(--primary)' : 'var(--border)',
                        }}
                      >
                        <input
                          type="radio"
                          name="payment_method"
                          value={method.id}
                          checked={formData.payment_method === method.id}
                          onChange={handleChange}
                          disabled={disabled}
                          className="w-5 h-5 accent-[var(--primary)]"
                        />
                        <div className="flex-1">
                          <div className="text-[15px] font-semibold mb-1" style={{ color: 'var(--text)' }}>
                            {method.name}
                          </div>
                          <div className="text-[13px]" style={{ color: 'var(--muted)' }}>
                            {method.description}
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>

                <div className="mt-4">
                  <label className="block text-[13px] font-medium mb-1.5" style={{ color: 'var(--text)' }}>
                    Комментарий к заказу
                  </label>
                  <textarea
                    name="customer_note"
                    className="w-full py-3 px-3.5 text-[15px] rounded-[10px] border resize-y min-h-20 transition-all duration-200 focus:outline-none focus:border-[var(--primary)] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.1)]"
                    style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }}
                    value={formData.customer_note}
                    onChange={handleChange}
                    placeholder="Пожелания к заказу..."
                    rows="3"
                  />
                </div>
              </div>
            )}

            {/* Навигация */}
            <div className="flex gap-3 justify-end md:flex-col">
              {step > 1 && (
                <button
                  type="button"
                  className="inline-flex items-center justify-center py-3.5 px-6 bg-transparent border border-[var(--border)] rounded-[10px] text-[15px] font-semibold cursor-pointer transition-all duration-200 hover:bg-[var(--bg)] md:w-full"
                  style={{ color: 'var(--text)' }}
                  onClick={prevStep}
                >
                  Назад
                </button>
              )}
              {step < 3 ? (
                <button
                  type="button"
                  className="inline-flex items-center justify-center py-3.5 px-6 bg-[var(--primary)] border border-[var(--primary)] rounded-[10px] text-white text-[15px] font-semibold cursor-pointer transition-all duration-200 hover:bg-blue-700 hover:border-blue-700 md:w-full"
                  onClick={nextStep}
                >
                  Продолжить
                </button>
              ) : (
                <button
                  type="submit"
                  className="inline-flex items-center justify-center py-4 px-8 bg-[var(--primary)] border border-[var(--primary)] rounded-[10px] text-white text-base font-semibold cursor-pointer transition-all duration-200 hover:bg-blue-700 hover:border-blue-700 disabled:opacity-60 disabled:cursor-not-allowed md:w-full"
                  disabled={loading}
                >
                  {loading ? "Оформление..." : "Оформить заказ"}
                </button>
              )}
            </div>
          </div>

          {/* Сайдбар */}
          <div className="sticky top-6 lg:static lg:order-1">
            <div
              className="rounded-2xl p-6 sm:p-5 border"
              style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
            >
              <h3 className="text-lg font-bold m-0 mb-5" style={{ color: 'var(--text)' }}>
                Ваш заказ
              </h3>

              <div className="flex flex-col gap-3 max-h-70 lg:max-h-none overflow-y-auto mb-5 pb-5 border-b" style={{ borderColor: 'var(--border)' }}>
                {items.map((item) => (
                  <div key={item.key} className="flex items-center gap-3">
                    <div
                      className="relative w-14 h-14 flex-shrink-0 rounded-lg overflow-hidden"
                      style={{ background: 'var(--bg)' }}
                    >
                      {item.image ? (
                        <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xl">📷</div>
                      )}
                      <span className="absolute -top-1.5 -right-1.5 w-5 h-5 flex items-center justify-center bg-[var(--primary)] rounded-full text-[11px] font-semibold text-white">
                        {item.quantity}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>
                        {item.name}
                      </div>
                      {item.variantLabel && (
                        <div className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
                          {item.variantLabel}
                        </div>
                      )}
                    </div>
                    <div className="text-sm font-semibold whitespace-nowrap" style={{ color: 'var(--text)' }}>
                      {(item.price * item.quantity).toLocaleString("ru-RU")} ₽
                    </div>
                  </div>
                ))}
              </div>

              {/* Купон */}
              <div className="mb-5 pb-5 border-b" style={{ borderColor: 'var(--border)' }}>
                {couponApplied ? (
                  <div className="flex items-center justify-between py-3 px-3.5 bg-green-50 border border-green-200 rounded-[10px] text-sm text-green-600">
                    <span>Купон <strong>{couponApplied.code}</strong> применён</span>
                    <button
                      type="button"
                      className="py-1 px-2 bg-transparent border-none text-red-600 text-[13px] cursor-pointer hover:underline"
                      onClick={removeCoupon}
                    >
                      Удалить
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      name="coupon_code"
                      className="flex-1 py-2.5 px-3 text-sm rounded-[10px] border transition-all duration-200 focus:outline-none focus:border-[var(--primary)]"
                      style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }}
                      value={formData.coupon_code}
                      onChange={handleChange}
                      placeholder="Промокод"
                    />
                    <button
                      type="button"
                      className="py-2.5 px-4 bg-transparent border border-[var(--border)] rounded-[10px] text-[13px] font-semibold cursor-pointer transition-all duration-200 hover:bg-[var(--bg)] disabled:opacity-60"
                      style={{ color: 'var(--text)' }}
                      onClick={handleApplyCoupon}
                      disabled={couponLoading}
                    >
                      {couponLoading ? "..." : "Применить"}
                    </button>
                  </div>
                )}
                {couponError && (
                  <div className="mt-2 text-[13px] text-red-600">{couponError}</div>
                )}
              </div>

              {/* Итого */}
              <div className="flex flex-col gap-2.5">
                <div className="flex justify-between text-sm" style={{ color: 'var(--muted)' }}>
                  <span>Товары ({totalItems})</span>
                  <span className="font-medium" style={{ color: 'var(--text)' }}>
                    {totalPrice.toLocaleString("ru-RU")} ₽
                  </span>
                </div>
                <div className="flex justify-between text-sm" style={{ color: 'var(--muted)' }}>
                  <span>Доставка</span>
                  <span className="font-medium" style={{ color: 'var(--text)' }}>
                    {shippingCost === 0 ? "Бесплатно" : `${shippingCost} ₽`}
                  </span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-sm" style={{ color: 'var(--muted)' }}>
                    <span>Скидка</span>
                    <span className="font-medium text-green-600">
                      -{discount.toLocaleString("ru-RU")} ₽
                    </span>
                  </div>
                )}
                <div
                  className="flex justify-between pt-3 mt-1 border-t text-lg font-bold"
                  style={{ color: 'var(--text)', borderColor: 'var(--border)' }}
                >
                  <span>Итого</span>
                  <span>{grandTotal.toLocaleString("ru-RU")} ₽</span>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
