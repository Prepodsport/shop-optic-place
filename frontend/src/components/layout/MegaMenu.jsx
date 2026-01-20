import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api.js";
import "./MegaMenu.css";

export default function MegaMenu() {
  const [categories, setCategories] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  // Закрытие при клике вне меню
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchCategories = async () => {
    try {
      const resp = await api.get("/catalog/categories/");
      setCategories(resp.data);
    } catch (error) {
      console.error("Ошибка загрузки категорий:", error);
    }
  };

  // Группируем категории: родительские и их дети
  const parentCategories = categories.filter((cat) => !cat.parent);
  const getChildren = (parentId) =>
    categories.filter((cat) => cat.parent === parentId);

  return (
    <nav className="mega-menu" ref={menuRef}>
      <div className="mega-menu__container">
        {/* Кнопка каталога */}
        <div
          className="mega-menu__catalog"
          onMouseEnter={() => setIsOpen(true)}
          onMouseLeave={() => setIsOpen(false)}
        >
          <button className="mega-menu__catalog-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
            <span>Каталог</span>
            <svg
              className={`mega-menu__arrow ${isOpen ? "mega-menu__arrow--open" : ""}`}
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </button>

          {/* Выпадающая панель */}
          {isOpen && (
            <div className="mega-menu__dropdown">
              <div className="mega-menu__grid">
                {parentCategories.map((parent) => (
                  <div key={parent.id} className="mega-menu__column">
                    <Link
                      to={`/catalog?category=${parent.slug}`}
                      className="mega-menu__parent"
                      onClick={() => setIsOpen(false)}
                    >
                      {parent.name}
                    </Link>
                    <ul className="mega-menu__children">
                      {getChildren(parent.id).map((child) => (
                        <li key={child.id}>
                          <Link
                            to={`/catalog?category=${child.slug}`}
                            className="mega-menu__child"
                            onClick={() => setIsOpen(false)}
                          >
                            {child.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
              <div className="mega-menu__footer">
                <Link
                  to="/catalog"
                  className="mega-menu__all-link"
                  onClick={() => setIsOpen(false)}
                >
                  Смотреть все товары →
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Остальные пункты меню */}
        <div className="mega-menu__links">
          <Link to="/catalog" className="mega-menu__link">
            Все товары
          </Link>
          <Link to="/sale" className="mega-menu__link mega-menu__link--sale">
            Распродажа
          </Link>
          <Link to="/booking" className="mega-menu__link">
            Запись к врачу
          </Link>
          <Link to="/about" className="mega-menu__link">
            О нас
          </Link>
          <Link to="/contacts" className="mega-menu__link">
            Контакты
          </Link>
          <Link to="/delivery" className="mega-menu__link">
            Доставка
          </Link>
        </div>
      </div>
    </nav>
  );
}
