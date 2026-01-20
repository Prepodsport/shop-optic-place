import { useState, useEffect, useCallback, useRef, forwardRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCart } from "../../context/CartContext.jsx";
import { useFavorites } from "../../context/FavoritesContext.jsx";
import { useTheme } from "../../theme.jsx";
import { api, getTokens, clearTokens } from "../../api.js";
import { useTypingPlaceholder } from "../../hooks/useTypingPlaceholder.js";
import { searchPlaceholders } from "../../data/searchPlaceholders.js";
import "./Header.css";

const Header = forwardRef(function Header(_, ref) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const searchRef = useRef(null);
  const { totalItems } = useCart();
  const { count: favoritesCount } = useFavorites();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();

  // Печатающийся placeholder (показываем только когда нет фокуса и нет текста)
  const typingPlaceholder = useTypingPlaceholder(searchPlaceholders, 100, 50, 2000);

  const isLoggedIn = Boolean(getTokens().access);

  // Закрытие поиска при клике вне + очистка строки
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowResults(false);
        setSearchQuery(""); // Очищаем строку поиска
        setIsFocused(false); // Снимаем фокус
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Живой поиск с debounce
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await api.get("/catalog/products/", {
          params: { search: searchQuery, page_size: 5 },
        });
        // API возвращает пагинированный ответ с полем results
        const products = res.data.results || res.data;
        setSearchResults(Array.isArray(products) ? products : []);
        setShowResults(true);
      } catch (err) {
        console.error("Ошибка поиска:", err);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSearch = useCallback(
    (e) => {
      e.preventDefault();
      if (searchQuery.trim()) {
        setShowResults(false);
        navigate(`/catalog?search=${encodeURIComponent(searchQuery.trim())}`);
        setSearchQuery(""); // Очищаем строку после перехода
      }
    },
    [searchQuery, navigate]
  );

  const handleResultClick = (slug) => {
    setShowResults(false);
    setSearchQuery("");
    navigate(`/product/${slug}`);
  };

  const handleLogout = () => {
    clearTokens();
    setShowUserMenu(false);
    navigate("/");
  };

  return (
    <header ref={ref} className="header">
      <div className="header__container">
        {/* Логотип - слева */}
        <Link to="/" className="header__logo">
          <span className="header__logo-icon">👓</span>
          <span className="header__logo-text">OpticPlace</span>
        </Link>

        {/* Поиск - по центру */}
        <div className="header__search" ref={searchRef}>
          <form onSubmit={handleSearch}>
            <input
              type="text"
              className="header__search-input"
              placeholder={!isFocused && !searchQuery ? typingPlaceholder : ""}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => {
                setIsFocused(true);
                searchResults.length > 0 && setShowResults(true);
              }}
              onBlur={() => {
                // Небольшая задержка чтобы обработать клик по результату
                setTimeout(() => setIsFocused(false), 200);
              }}
            />
            <button type="submit" className="header__search-btn" aria-label="Искать">
              {isSearching ? (
                <span className="header__search-spinner" />
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
              )}
            </button>
          </form>

          {/* Результаты поиска */}
          {showResults && searchResults.length > 0 && (
            <div className="header__search-results">
              {searchResults.map((product) => (
                <button
                  key={product.id}
                  className="header__search-result"
                  onClick={() => handleResultClick(product.slug)}
                >
                  <div className="header__search-result-image">
                    {product.main_image_url ? (
                      <img src={product.main_image_url} alt={product.name} />
                    ) : (
                      <div className="header__search-result-noimage">📷</div>
                    )}
                  </div>
                  <div className="header__search-result-info">
                    <span className="header__search-result-name">{product.name}</span>
                    <span className="header__search-result-price">
                      {parseFloat(product.price).toLocaleString("ru-RU")} ₽
                    </span>
                  </div>
                </button>
              ))}
              <button
                className="header__search-all"
                onClick={handleSearch}
              >
                Показать все результаты
              </button>
            </div>
          )}
        </div>

        {/* Иконки справа */}
        <div className="header__actions">
          {/* Переключатель темы */}
          <button
            className="header__action-btn"
            onClick={toggle}
            title={theme === "light" ? "Тёмная тема" : "Светлая тема"}
          >
            {theme === "light" ? (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
              </svg>
            ) : (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="5"></circle>
                <line x1="12" y1="1" x2="12" y2="3"></line>
                <line x1="12" y1="21" x2="12" y2="23"></line>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                <line x1="1" y1="12" x2="3" y2="12"></line>
                <line x1="21" y1="12" x2="23" y2="12"></line>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
              </svg>
            )}
          </button>

          {/* Избранное */}
          <Link to="/favorites" className="header__action-btn" title="Избранное">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
            </svg>
            {favoritesCount > 0 && (
              <span className="header__badge">{favoritesCount}</span>
            )}
          </Link>

          {/* Корзина */}
          <Link to="/cart" className="header__action-btn" title="Корзина">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="9" cy="21" r="1"></circle>
              <circle cx="20" cy="21" r="1"></circle>
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
            </svg>
            {totalItems > 0 && (
              <span className="header__badge">{totalItems}</span>
            )}
          </Link>

          {/* Пользователь */}
          <div className="header__user">
            <button
              className="header__action-btn"
              onClick={() => setShowUserMenu(!showUserMenu)}
              title="Аккаунт"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
            </button>

            {showUserMenu && (
              <div className="header__dropdown">
                {isLoggedIn ? (
                  <>
                    <Link
                      to="/account"
                      className="header__dropdown-item"
                      onClick={() => setShowUserMenu(false)}
                    >
                      Личный кабинет
                    </Link>
                    <button
                      className="header__dropdown-item"
                      onClick={handleLogout}
                    >
                      Выйти
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      to="/login"
                      className="header__dropdown-item"
                      onClick={() => setShowUserMenu(false)}
                    >
                      Вход
                    </Link>
                    <Link
                      to="/register"
                      className="header__dropdown-item"
                      onClick={() => setShowUserMenu(false)}
                    >
                      Регистрация
                    </Link>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
});

export default Header;