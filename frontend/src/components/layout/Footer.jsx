import { Link } from "react-router-dom";
import "./Footer.css";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="footer__container">
        <div className="footer__grid">
          {/* О компании */}
          <div className="footer__column">
            <h4 className="footer__title">О компании</h4>
            <ul className="footer__list">
              <li>
                <Link to="/about" className="footer__link">О нас</Link>
              </li>
              <li>
                <Link to="/contacts" className="footer__link">Контакты</Link>
              </li>
              <li>
                <Link to="/vacancies" className="footer__link">Вакансии</Link>
              </li>
            </ul>
          </div>

          {/* Покупателям */}
          <div className="footer__column">
            <h4 className="footer__title">Покупателям</h4>
            <ul className="footer__list">
              <li>
                <Link to="/delivery" className="footer__link">Доставка</Link>
              </li>
              <li>
                <Link to="/payment" className="footer__link">Оплата</Link>
              </li>
              <li>
                <Link to="/return" className="footer__link">Возврат</Link>
              </li>
              <li>
                <Link to="/faq" className="footer__link">FAQ</Link>
              </li>
            </ul>
          </div>

          {/* Контакты */}
          <div className="footer__column">
            <h4 className="footer__title">Контакты</h4>
            <ul className="footer__list footer__contacts">
              <li>
                <a href="tel:+78001234567" className="footer__link">
                  8 (800) 123-45-67
                </a>
              </li>
              <li>
                <a href="mailto:info@opticplace.ru" className="footer__link">
                  info@opticplace.ru
                </a>
              </li>
              <li className="footer__address">
                г. Москва, ул. Примерная, д. 1
              </li>
            </ul>
          </div>

          {/* Социальные сети */}
          <div className="footer__column">
            <h4 className="footer__title">Мы в соцсетях</h4>
            <div className="footer__socials">
              <a
                href="https://vk.com"
                target="_blank"
                rel="noopener noreferrer"
                className="footer__social"
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
                className="footer__social"
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
        <div className="footer__bottom">
          <p className="footer__copyright">
            © {currentYear} OpticPlace. Все права защищены.
          </p>
          <div className="footer__legal">
            <Link to="/privacy" className="footer__legal-link">
              Политика конфиденциальности
            </Link>
            <Link to="/terms" className="footer__legal-link">
              Пользовательское соглашение
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
