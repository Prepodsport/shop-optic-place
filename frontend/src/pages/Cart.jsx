import { Link, useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";

export default function Cart() {
  const navigate = useNavigate();
  const { items, totalItems, totalPrice, updateQuantity, removeFromCart, clearCart } = useCart();

  const isEmpty = items.length === 0;

  const handleCheckout = () => {
    navigate("/checkout");
  };

  return (
    <div className="py-10 md:py-8 px-4 pb-15 md:pb-10">
      <div className="max-w-[1280px] mx-auto">
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <h1 className="text-[32px] md:text-[26px] font-bold m-0" style={{ color: 'var(--text)' }}>
            Корзина
          </h1>

          {!isEmpty ? (
            <button
              className="py-2.5 px-5 bg-transparent border border-[var(--border)] rounded-[10px] text-sm cursor-pointer transition-all duration-200 hover:bg-red-50 hover:border-red-200 hover:text-red-500"
              style={{ color: 'var(--muted)' }}
              onClick={clearCart}
            >
              Очистить всё
            </button>
          ) : null}
        </div>

        {isEmpty ? (
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
            <p className="m-0 mb-6" style={{ color: 'var(--muted)' }}>
              Добавьте товары из каталога
            </p>
            <Link
              to="/catalog"
              className="inline-block py-3.5 px-7 bg-[var(--primary)] text-white no-underline rounded-[10px] font-medium transition-colors duration-200 hover:bg-blue-700 hover:no-underline"
            >
              Перейти в каталог
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-8">
              <span className="text-base" style={{ color: 'var(--muted)' }}>
                {totalItems} товаров
              </span>
            </div>

            <div className="grid grid-cols-[1fr_360px] lg:grid-cols-2 gap-8 items-start">
              {/* Блок товаров */}
              <div
                className="rounded-2xl p-5 border"
                style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
              >
                <h2 className="m-0 mb-5 pb-4 border-b text-xl font-semibold" style={{ color: 'var(--text)', borderColor: 'var(--border)' }}>
                  Товары в корзине
                </h2>
                <div className="flex flex-col gap-4">
                  {items.map((item) => (
                    <div
                      key={item.key}
                      className="relative grid grid-cols-[100px_1fr_auto_auto_auto] md:grid-cols-[80px_1fr] gap-5 md:gap-3 items-center p-4 rounded-xl"
                      style={{ background: 'var(--bg)' }}
                    >
                    <div
                      className="w-[100px] md:w-20 h-[100px] md:h-20 rounded-lg overflow-hidden"
                      style={{ background: 'var(--bg)' }}
                    >
                      {item.image ? (
                        <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                        <div
                          className="w-full h-full flex items-center justify-center text-2xl"
                          style={{ color: 'var(--muted)' }}
                        >
                          📷
                        </div>
                      )}
                    </div>

                    <div className="min-w-0">
                      <Link
                        to={`/product/${item.slug}`}
                        className="block text-base font-medium no-underline mb-2 hover:text-[var(--primary)]"
                        style={{ color: 'var(--text)' }}
                      >
                        {item.name}
                      </Link>
                      {item.variantLabel && (
                        <div className="text-[13px] mb-1.5" style={{ color: 'var(--muted)' }}>
                          {item.variantLabel}
                        </div>
                      )}
                      <div className="text-base font-semibold" style={{ color: 'var(--text)' }}>
                        {item.price.toLocaleString("ru-RU")} ₽
                        {item.oldPrice && (
                          <span className="ml-2 text-sm font-normal line-through" style={{ color: 'var(--muted)' }}>
                            {item.oldPrice.toLocaleString("ru-RU")} ₽
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 md:col-span-full md:justify-start">
                      <button
                        onClick={() => updateQuantity(item.key, item.quantity - 1)}
                        className="w-9 h-9 border rounded-lg text-lg cursor-pointer transition-all duration-200 hover:bg-[var(--primary)] hover:border-[var(--primary)] hover:text-white"
                        style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }}
                        aria-label="Уменьшить количество"
                      >
                        −
                      </button>
                      <span className="min-w-10 text-center text-base font-medium">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.key, item.quantity + 1)}
                        className="w-9 h-9 border rounded-lg text-lg cursor-pointer transition-all duration-200 hover:bg-[var(--primary)] hover:border-[var(--primary)] hover:text-white"
                        style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }}
                        aria-label="Увеличить количество"
                      >
                        +
                      </button>
                    </div>

                    <div
                      className="text-lg font-semibold min-w-[100px] text-right md:col-span-full md:text-left"
                      style={{ color: 'var(--text)' }}
                    >
                      {(item.price * item.quantity).toLocaleString("ru-RU")} ₽
                    </div>

                    <button
                      className="bg-transparent border-none cursor-pointer p-2 rounded-lg transition-all duration-200 hover:text-red-500 hover:bg-red-50 md:absolute md:top-3 md:right-3"
                      style={{ color: 'var(--muted)' }}
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
              </div>

              {/* Блок итогов */}
              <div className="sticky top-[100px] lg:static">
                <div
                  className="rounded-2xl p-6 border"
                  style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
                >
                  <h3 className="m-0 mb-5 text-xl font-semibold" style={{ color: 'var(--text)' }}>
                    Итого
                  </h3>
                  <div className="flex justify-between mb-3 text-[15px]" style={{ color: 'var(--text)' }}>
                    <span>Товары ({totalItems})</span>
                    <span>{totalPrice.toLocaleString("ru-RU")} ₽</span>
                  </div>
                  <div className="flex justify-between mb-3 text-[15px]" style={{ color: 'var(--text)' }}>
                    <span>Доставка</span>
                    <span className="text-green-500 font-medium">Бесплатно</span>
                  </div>
                  <div
                    className="flex justify-between pt-4 mt-4 border-t text-lg font-semibold"
                    style={{ color: 'var(--text)', borderColor: 'var(--border)' }}
                  >
                    <span>К оплате</span>
                    <span>{totalPrice.toLocaleString("ru-RU")} ₽</span>
                  </div>

                  <button
                    className="w-full py-4 mt-6 bg-[var(--primary)] text-white border-none rounded-xl text-base font-semibold cursor-pointer transition-colors duration-200 hover:bg-blue-700"
                    onClick={handleCheckout}
                  >
                    Оформить заказ
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
