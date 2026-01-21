import { Link, useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import "./Cart.css";

export default function Cart() {
  const navigate = useNavigate();
  const { items, totalItems, totalPrice, updateQuantity, removeFromCart, clearCart } = useCart();

  const isEmpty = items.length === 0;

  const handleCheckout = () => {
    navigate("/checkout");
  };

  return (
    <div className="cart">
      <div className="cart__container">
        <div className="cart__header">
          <h1 className="cart__title">Корзина</h1>

          {/* Справа — как в избранном: action */}
          {!isEmpty ? (
            <button className="cart__clear" onClick={clearCart}>
              Очистить всё
            </button>
          ) : null}
        </div>

        {isEmpty ? (
          <div className="cart__empty">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="9" cy="21" r="1"></circle>
              <circle cx="20" cy="21" r="1"></circle>
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
            </svg>
            <h3>Корзина пуста</h3>
            <p>Добавьте товары из каталога</p>
            <Link to="/catalog" className="cart__link">
              Перейти в каталог
            </Link>
          </div>
        ) : (
          <>
            {/* Строка под заголовком — счётчик (как подзаголовок) */}
            <div className="cart__meta">
              <span className="cart__count">{totalItems} товаров</span>
            </div>

            <div className="cart__content">
              <div className="cart__items">
                {items.map((item) => (
                  <div key={item.key} className="cart-item">
                    <div className="cart-item__image">
                      {item.image ? (
                        <img src={item.image} alt={item.name} />
                      ) : (
                        <div className="cart-item__noimage">📷</div>
                      )}
                    </div>

                    <div className="cart-item__info">
                      <Link to={`/product/${item.slug}`} className="cart-item__name">
                        {item.name}
                      </Link>
                      {item.variantLabel && (
                        <div className="cart-item__variant">{item.variantLabel}</div>
                      )}
                      <div className="cart-item__price">
                        {item.price.toLocaleString("ru-RU")} ₽
                        {item.oldPrice && (
                          <span className="cart-item__old-price">
                            {item.oldPrice.toLocaleString("ru-RU")} ₽
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="cart-item__quantity">
                      <button
                        onClick={() => updateQuantity(item.key, item.quantity - 1)}
                        className="cart-item__qty-btn"
                        aria-label="Уменьшить количество"
                      >
                        −
                      </button>
                      <span className="cart-item__qty-value">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.key, item.quantity + 1)}
                        className="cart-item__qty-btn"
                        aria-label="Увеличить количество"
                      >
                        +
                      </button>
                    </div>

                    <div className="cart-item__total">
                      {(item.price * item.quantity).toLocaleString("ru-RU")} ₽
                    </div>

                    <button
                      className="cart-item__remove"
                      onClick={() => removeFromCart(item.key)}
                      title="Удалить"
                      aria-label="Удалить товар"
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                      </svg>
                    </button>
                  </div>
                ))}
              </div>

              <div className="cart__sidebar">
                <div className="cart__summary">
                  <h3>Итого</h3>
                  <div className="cart__summary-row">
                    <span>Товары ({totalItems})</span>
                    <span>{totalPrice.toLocaleString("ru-RU")} ₽</span>
                  </div>
                  <div className="cart__summary-row">
                    <span>Доставка</span>
                    <span className="cart__summary-free">Бесплатно</span>
                  </div>
                  <div className="cart__summary-total">
                    <span>К оплате</span>
                    <span>{totalPrice.toLocaleString("ru-RU")} ₽</span>
                  </div>

                  <button className="cart__checkout" onClick={handleCheckout}>Оформить заказ</button>

                  {/* Кнопку "Очистить корзину" в сайдбаре убрали,
                      т.к. action теперь в header как в Favorites */}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
