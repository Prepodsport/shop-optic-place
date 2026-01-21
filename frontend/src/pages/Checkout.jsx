import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { api, getTokens, getErrorMessage } from "../api.js";
import "./Checkout.css";

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
  const [step, setStep] = useState(1); // 1 - контакты, 2 - доставка, 3 - оплата
  const [orderComplete, setOrderComplete] = useState(null);

  // Данные формы
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

  // Загрузка данных пользователя
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
      <div className="checkout">
        <div className="checkout__container">
          <div className="checkout__empty">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="9" cy="21" r="1"></circle>
              <circle cx="20" cy="21" r="1"></circle>
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
            </svg>
            <h3>Корзина пуста</h3>
            <p>Добавьте товары из каталога для оформления заказа</p>
            <Link to="/catalog" className="checkout__btn checkout__btn--primary">
              Перейти в каталог
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (orderComplete) {
    return (
      <div className="checkout">
        <div className="checkout__container">
          <div className="checkout__success">
            <div className="checkout__success-icon">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
            </div>
            <h2>Заказ успешно оформлен!</h2>
            <p className="checkout__success-order">Номер заказа: <strong>#{orderComplete.id}</strong></p>
            <p className="checkout__success-text">
              Мы отправили подтверждение на <strong>{orderComplete.email}</strong>.
              {formData.payment_method === "card" && " Ожидайте перенаправление на страницу оплаты."}
            </p>
            <div className="checkout__success-total">
              Сумма к оплате: <strong>{orderComplete.grand_total?.toLocaleString("ru-RU")} ₽</strong>
            </div>
            <div className="checkout__success-actions">
              {isAuthenticated && (
                <Link to="/account" className="checkout__btn">
                  Мои заказы
                </Link>
              )}
              <Link to="/catalog" className="checkout__btn checkout__btn--primary">
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

      // Если оплата картой - здесь будет редирект на платёжную систему
      // if (formData.payment_method === "card") {
      //   window.location.href = resp.data.payment_url;
      // }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="checkout">
      <div className="checkout__container">
        <div className="checkout__header">
          <Link to="/cart" className="checkout__back">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
            Вернуться в корзину
          </Link>
          <h1 className="checkout__title">Оформление заказа</h1>
        </div>

        {/* Степпер */}
        <div className="checkout__steps">
          <div className={`checkout__step ${step >= 1 ? "checkout__step--active" : ""} ${step > 1 ? "checkout__step--completed" : ""}`}>
            <span className="checkout__step-num">1</span>
            <span className="checkout__step-label">Контакты</span>
          </div>
          <div className="checkout__step-line"></div>
          <div className={`checkout__step ${step >= 2 ? "checkout__step--active" : ""} ${step > 2 ? "checkout__step--completed" : ""}`}>
            <span className="checkout__step-num">2</span>
            <span className="checkout__step-label">Доставка</span>
          </div>
          <div className="checkout__step-line"></div>
          <div className={`checkout__step ${step >= 3 ? "checkout__step--active" : ""}`}>
            <span className="checkout__step-num">3</span>
            <span className="checkout__step-label">Оплата</span>
          </div>
        </div>

        {error && <div className="checkout__error">{error}</div>}

        <form className="checkout__content" onSubmit={handleSubmit}>
          <div className="checkout__main">
            {/* Шаг 1: Контактные данные */}
            {step === 1 && (
              <div className="checkout__section">
                <h2 className="checkout__section-title">Контактные данные</h2>

                <div className="checkout__field">
                  <label className="checkout__label">Email *</label>
                  <input
                    type="email"
                    name="email"
                    className="checkout__input"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="your@email.com"
                    required
                  />
                </div>

                <div className="checkout__field">
                  <label className="checkout__label">Телефон *</label>
                  <input
                    type="tel"
                    name="phone"
                    className="checkout__input"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="+7 (999) 123-45-67"
                    required
                  />
                </div>

                <div className="checkout__field">
                  <label className="checkout__label">ФИО получателя *</label>
                  <input
                    type="text"
                    name="shipping_name"
                    className="checkout__input"
                    value={formData.shipping_name}
                    onChange={handleChange}
                    placeholder="Иванов Иван Иванович"
                    required
                  />
                </div>

                {!isAuthenticated && (
                  <div className="checkout__auth-hint">
                    <Link to="/login">Войдите</Link> или <Link to="/register">зарегистрируйтесь</Link>,
                    чтобы отслеживать заказы в личном кабинете
                  </div>
                )}
              </div>
            )}

            {/* Шаг 2: Доставка */}
            {step === 2 && (
              <div className="checkout__section">
                <h2 className="checkout__section-title">Способ доставки</h2>

                <div className="checkout__options">
                  {SHIPPING_METHODS.map((method) => (
                    <label key={method.id} className={`checkout__option ${formData.shipping_method === method.id ? "checkout__option--selected" : ""}`}>
                      <input
                        type="radio"
                        name="shipping_method"
                        value={method.id}
                        checked={formData.shipping_method === method.id}
                        onChange={handleChange}
                      />
                      <div className="checkout__option-content">
                        <div className="checkout__option-name">{method.name}</div>
                        <div className="checkout__option-desc">{method.description}</div>
                      </div>
                      <div className="checkout__option-price">
                        {method.price === 0 ? "Бесплатно" : `${method.price} ₽`}
                      </div>
                    </label>
                  ))}
                </div>

                {formData.shipping_method !== "pickup" && (
                  <div className="checkout__address">
                    <h3 className="checkout__subtitle">Адрес доставки</h3>

                    <div className="checkout__field-row">
                      <div className="checkout__field">
                        <label className="checkout__label">Город *</label>
                        <input
                          type="text"
                          name="shipping_city"
                          className="checkout__input"
                          value={formData.shipping_city}
                          onChange={handleChange}
                          placeholder="Москва"
                        />
                      </div>
                      <div className="checkout__field">
                        <label className="checkout__label">Индекс</label>
                        <input
                          type="text"
                          name="shipping_postal_code"
                          className="checkout__input"
                          value={formData.shipping_postal_code}
                          onChange={handleChange}
                          placeholder="123456"
                        />
                      </div>
                    </div>

                    <div className="checkout__field">
                      <label className="checkout__label">Адрес *</label>
                      <input
                        type="text"
                        name="shipping_address"
                        className="checkout__input"
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
              <div className="checkout__section">
                <h2 className="checkout__section-title">Способ оплаты</h2>

                <div className="checkout__options">
                  {PAYMENT_METHODS.map((method) => {
                    // Наличные только для самовывоза и курьера
                    const disabled = method.id === "cash" && !["pickup", "courier"].includes(formData.shipping_method);

                    return (
                      <label
                        key={method.id}
                        className={`checkout__option ${formData.payment_method === method.id ? "checkout__option--selected" : ""} ${disabled ? "checkout__option--disabled" : ""}`}
                      >
                        <input
                          type="radio"
                          name="payment_method"
                          value={method.id}
                          checked={formData.payment_method === method.id}
                          onChange={handleChange}
                          disabled={disabled}
                        />
                        <div className="checkout__option-content">
                          <div className="checkout__option-name">{method.name}</div>
                          <div className="checkout__option-desc">{method.description}</div>
                        </div>
                      </label>
                    );
                  })}
                </div>

                <div className="checkout__field">
                  <label className="checkout__label">Комментарий к заказу</label>
                  <textarea
                    name="customer_note"
                    className="checkout__textarea"
                    value={formData.customer_note}
                    onChange={handleChange}
                    placeholder="Пожелания к заказу..."
                    rows="3"
                  />
                </div>
              </div>
            )}

            {/* Навигация */}
            <div className="checkout__nav">
              {step > 1 && (
                <button type="button" className="checkout__btn" onClick={prevStep}>
                  Назад
                </button>
              )}
              {step < 3 ? (
                <button type="button" className="checkout__btn checkout__btn--primary" onClick={nextStep}>
                  Продолжить
                </button>
              ) : (
                <button
                  type="submit"
                  className="checkout__btn checkout__btn--primary checkout__btn--submit"
                  disabled={loading}
                >
                  {loading ? "Оформление..." : "Оформить заказ"}
                </button>
              )}
            </div>
          </div>

          {/* Сайдбар */}
          <div className="checkout__sidebar">
            <div className="checkout__summary">
              <h3 className="checkout__summary-title">Ваш заказ</h3>

              <div className="checkout__items">
                {items.map((item) => (
                  <div key={item.key} className="checkout__item">
                    <div className="checkout__item-image">
                      {item.image ? (
                        <img src={item.image} alt={item.name} />
                      ) : (
                        <div className="checkout__item-noimage">📷</div>
                      )}
                      <span className="checkout__item-qty">{item.quantity}</span>
                    </div>
                    <div className="checkout__item-info">
                      <div className="checkout__item-name">{item.name}</div>
                      {item.variantLabel && (
                        <div className="checkout__item-variant">{item.variantLabel}</div>
                      )}
                    </div>
                    <div className="checkout__item-price">
                      {(item.price * item.quantity).toLocaleString("ru-RU")} ₽
                    </div>
                  </div>
                ))}
              </div>

              {/* Купон */}
              <div className="checkout__coupon">
                {couponApplied ? (
                  <div className="checkout__coupon-applied">
                    <span>Купон <strong>{couponApplied.code}</strong> применён</span>
                    <button type="button" className="checkout__coupon-remove" onClick={removeCoupon}>
                      Удалить
                    </button>
                  </div>
                ) : (
                  <div className="checkout__coupon-form">
                    <input
                      type="text"
                      name="coupon_code"
                      className="checkout__input checkout__coupon-input"
                      value={formData.coupon_code}
                      onChange={handleChange}
                      placeholder="Промокод"
                    />
                    <button
                      type="button"
                      className="checkout__btn checkout__coupon-btn"
                      onClick={handleApplyCoupon}
                      disabled={couponLoading}
                    >
                      {couponLoading ? "..." : "Применить"}
                    </button>
                  </div>
                )}
                {couponError && <div className="checkout__coupon-error">{couponError}</div>}
              </div>

              {/* Итого */}
              <div className="checkout__totals">
                <div className="checkout__totals-row">
                  <span>Товары ({totalItems})</span>
                  <span>{totalPrice.toLocaleString("ru-RU")} ₽</span>
                </div>
                <div className="checkout__totals-row">
                  <span>Доставка</span>
                  <span>{shippingCost === 0 ? "Бесплатно" : `${shippingCost} ₽`}</span>
                </div>
                {discount > 0 && (
                  <div className="checkout__totals-row checkout__totals-row--discount">
                    <span>Скидка</span>
                    <span>-{discount.toLocaleString("ru-RU")} ₽</span>
                  </div>
                )}
                <div className="checkout__totals-total">
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
