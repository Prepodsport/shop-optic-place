import { Link } from "react-router-dom";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer
      className="mt-auto pt-12 pb-6 border-t sm:pt-8 sm:pb-5"
      style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
    >
      <div className="max-w-[1600px] mx-auto px-4">
        <div className="grid grid-cols-4 gap-10 mb-10 lg:grid-cols-2 lg:gap-8 sm:grid-cols-1 sm:gap-6 sm:mb-6">
          {/* О компании */}
          <div>
            <h4 className="text-base font-semibold mb-4 m-0" style={{ color: 'var(--text)' }}>
              О компании
            </h4>
            <ul className="list-none m-0 p-0 space-y-2.5">
              <li>
                <Link to="/about" className="text-sm no-underline transition-colors duration-200 hover:text-[var(--primary)]" style={{ color: 'var(--muted)' }}>
                  О нас
                </Link>
              </li>
              <li>
                <Link to="/contacts" className="text-sm no-underline transition-colors duration-200 hover:text-[var(--primary)]" style={{ color: 'var(--muted)' }}>
                  Контакты
                </Link>
              </li>
              <li>
                <Link to="/vacancies" className="text-sm no-underline transition-colors duration-200 hover:text-[var(--primary)]" style={{ color: 'var(--muted)' }}>
                  Вакансии
                </Link>
              </li>
            </ul>
          </div>

          {/* Покупателям */}
          <div>
            <h4 className="text-base font-semibold mb-4 m-0" style={{ color: 'var(--text)' }}>
              Покупателям
            </h4>
            <ul className="list-none m-0 p-0 space-y-2.5">
              <li>
                <Link to="/delivery" className="text-sm no-underline transition-colors duration-200 hover:text-[var(--primary)]" style={{ color: 'var(--muted)' }}>
                  Доставка
                </Link>
              </li>
              <li>
                <Link to="/payment" className="text-sm no-underline transition-colors duration-200 hover:text-[var(--primary)]" style={{ color: 'var(--muted)' }}>
                  Оплата
                </Link>
              </li>
              <li>
                <Link to="/return" className="text-sm no-underline transition-colors duration-200 hover:text-[var(--primary)]" style={{ color: 'var(--muted)' }}>
                  Возврат
                </Link>
              </li>
              <li>
                <Link to="/faq" className="text-sm no-underline transition-colors duration-200 hover:text-[var(--primary)]" style={{ color: 'var(--muted)' }}>
                  FAQ
                </Link>
              </li>
            </ul>
          </div>

          {/* Сервисы */}
          <div>
            <h4 className="text-base font-semibold mb-4 m-0" style={{ color: 'var(--text)' }}>
              Сервисы
            </h4>
            <ul className="list-none m-0 p-0 space-y-2.5">
              <li>
                <Link to="/lens-calculator" className="text-sm no-underline transition-colors duration-200 hover:text-[var(--primary)]" style={{ color: 'var(--muted)' }}>
                  Калькулятор линз
                </Link>
              </li>
              <li>
                <Link to="/booking" className="text-sm no-underline transition-colors duration-200 hover:text-[var(--primary)]" style={{ color: 'var(--muted)' }}>
                  Проверка зрения
                </Link>
              </li>
              <li>
                <Link to="/prescriptions" className="text-sm no-underline transition-colors duration-200 hover:text-[var(--primary)]" style={{ color: 'var(--muted)' }}>
                  Мои рецепты
                </Link>
              </li>
              <li>
                <Link to="/lens-reminders" className="text-sm no-underline transition-colors duration-200 hover:text-[var(--primary)]" style={{ color: 'var(--muted)' }}>
                  Напоминания о замене
                </Link>
              </li>
            </ul>
          </div>

          {/* Контакты */}
          <div>
            <h4 className="text-base font-semibold mb-4 m-0" style={{ color: 'var(--text)' }}>
              Контакты
            </h4>
            <ul className="list-none m-0 p-0 space-y-2.5">
              <li>
                <a href="tel:+74954970497" className="text-sm no-underline transition-colors duration-200 hover:text-[var(--primary)]" style={{ color: 'var(--muted)' }}>
                  +7 495 497-0-497
                </a>
              </li>
              <li>
                <a href="mailto:info@shop.opticplace.ru" className="text-sm no-underline transition-colors duration-200 hover:text-[var(--primary)]" style={{ color: 'var(--muted)' }}>
                  info@shop.opticplace.ru
                </a>
              </li>
              <li className="text-sm" style={{ color: 'var(--muted)' }}>
                г. Москва, ул. Старая Басманная, 14/2 стр. 4
              </li>
            </ul>

            {/* Социальные сети */}
            <div className="flex gap-3 mt-4">
              <a
                href="https://vk.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center w-10 h-10 rounded-[10px] transition-colors duration-200 hover:bg-[var(--primary)] hover:text-white"
                style={{ background: 'var(--bg)', color: 'var(--muted)' }}
                aria-label="ВКонтакте"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12.785 16.241s.288-.032.436-.194c.136-.148.132-.427.132-.427s-.02-1.304.576-1.496c.588-.19 1.341 1.26 2.14 1.818.605.422 1.064.33 1.064.33l2.137-.03s1.117-.071.587-.964c-.043-.073-.308-.661-1.588-1.87-1.34-1.264-1.16-1.059.453-3.246.983-1.332 1.376-2.145 1.253-2.493-.117-.332-.84-.244-.84-.244l-2.406.015s-.178-.025-.31.056c-.13.079-.212.263-.212.263s-.382 1.03-.89 1.907c-1.07 1.85-1.499 1.948-1.674 1.832-.407-.267-.305-1.075-.305-1.648 0-1.793.267-2.54-.521-2.733-.262-.065-.454-.107-1.123-.114-.858-.009-1.585.003-1.996.208-.274.136-.485.44-.356.457.159.022.519.099.71.363.246.341.237 1.107.237 1.107s.142 2.11-.33 2.371c-.324.18-.769-.187-1.722-1.865-.489-.859-.858-1.81-.858-1.81s-.07-.177-.198-.272c-.154-.115-.37-.151-.37-.151l-2.286.015s-.343.01-.469.163c-.112.136-.009.418-.009.418s1.795 4.258 3.832 6.403c1.867 1.967 3.986 1.838 3.986 1.838h.96z"/>
                </svg>
              </a>
              <a
                href="https://t.me"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center w-10 h-10 rounded-[10px] transition-colors duration-200 hover:bg-[var(--primary)] hover:text-white"
                style={{ background: 'var(--bg)', color: 'var(--muted)' }}
                aria-label="Telegram"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.96 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                </svg>
              </a>
            </div>
          </div>
        </div>

        {/* Нижняя часть */}
        <div
          className="flex justify-between pt-6 border-t sm:flex-col sm:gap-4 sm:text-center"
          style={{ borderColor: 'var(--border)' }}
        >
          <p className="text-[13px] m-0" style={{ color: 'var(--muted)' }}>
            © {currentYear} OpticPlace. Все права защищены.
          </p>
          <div className="flex gap-6 sm:flex-col sm:gap-2">
            <Link to="/privacy" className="text-[13px] no-underline transition-colors duration-200 hover:text-[var(--primary)]" style={{ color: 'var(--muted)' }}>
              Политика конфиденциальности
            </Link>
            <Link to="/terms" className="text-[13px] no-underline transition-colors duration-200 hover:text-[var(--primary)]" style={{ color: 'var(--muted)' }}>
              Пользовательское соглашение
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
