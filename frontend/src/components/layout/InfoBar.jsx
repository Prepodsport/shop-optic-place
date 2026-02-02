import { useState } from "react";
import { Link } from "react-router-dom";

export default function InfoBar() {
  const [showCallbackModal, setShowCallbackModal] = useState(false);

  const infoLinks = [
    { label: "Акции", to: "/sale" },
    { label: "Оплата", to: "/payment" },
    { label: "Доставка", to: "/delivery" },
    { label: "Услуги", to: "/services" },
    { label: "О нас", to: "/about" },
    { label: "Контакты", to: "/contacts" },
  ];

  const phone = "+7 (800) 123-45-67";

  return (
    <>
      <div
        className="border-b hidden md:block"
        style={{
          background: "var(--bg)",
          borderColor: "var(--border)",
        }}
      >
        <div className="max-w-[1600px] mx-auto px-4 py-2 flex items-center justify-between">
          {/* Левая часть - ссылки */}
          <nav className="flex items-center gap-5 lg:gap-4">
            {infoLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="text-sm text-[var(--muted)] hover:text-[var(--primary)] transition-colors no-underline"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Правая часть - телефон и заказать звонок */}
          <div className="flex items-center gap-4">
            <a
              href={`tel:${phone.replace(/\D/g, "")}`}
              className="text-sm font-semibold text-[var(--text)] hover:text-[var(--primary)] transition-colors no-underline flex items-center gap-1.5"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                />
              </svg>
              {phone}
            </a>
            <button
              onClick={() => setShowCallbackModal(true)}
              className="text-sm text-[var(--primary)] hover:text-[var(--primary-hover)] transition-colors bg-transparent border-none cursor-pointer underline underline-offset-2"
            >
              Заказать звонок
            </button>
          </div>
        </div>
      </div>

      {/* Модальное окно заказа звонка */}
      {showCallbackModal && (
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center p-4"
          onClick={() => setShowCallbackModal(false)}
        >
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowCallbackModal(false)}
          />
          <div
            className="relative bg-[var(--bg)] rounded-2xl p-6 max-w-md w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowCallbackModal(false)}
              className="absolute top-4 right-4 text-[var(--muted)] hover:text-[var(--text)] transition-colors bg-transparent border-none cursor-pointer"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <h3 className="text-xl font-bold text-[var(--text)] mb-4">
              Заказать звонок
            </h3>
            <p className="text-sm text-[var(--muted)] mb-4">
              Оставьте номер телефона и мы перезвоним вам в ближайшее время
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                alert("Заявка отправлена! Мы перезвоним вам в ближайшее время.");
                setShowCallbackModal(false);
              }}
            >
              <input
                type="tel"
                placeholder="+7 (___) ___-__-__"
                className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--card)] text-[var(--text)] mb-4 focus:outline-none focus:border-[var(--primary)]"
                required
              />
              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-[var(--primary)] text-white font-medium hover:bg-[var(--primary-hover)] transition-colors"
              >
                Перезвоните мне
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
