import { useState, useEffect, useCallback, useRef, forwardRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useCart } from "../../context/CartContext.jsx";
import { useFavorites } from "../../context/FavoritesContext.jsx";
import { useTheme } from "../../theme.jsx";
import { api, getTokens, clearTokens } from "../../api.js";
import { useTypingPlaceholder } from "../../hooks/useTypingPlaceholder.js";
import { searchPlaceholders } from "../../data/searchPlaceholders.js";

const Header = forwardRef(function Header(_, ref) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const searchRef = useRef(null);
  const userMenuRef = useRef(null);
  const { totalItems } = useCart();
  const { count: favoritesCount } = useFavorites();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const typingPlaceholder = useTypingPlaceholder(searchPlaceholders, 100, 50, 2000);
  const isLoggedIn = Boolean(getTokens().access);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowResults(false);
        setSearchQuery("");
        setIsFocused(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    setShowUserMenu(false);
  }, [location]);

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
        setSearchQuery("");
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
    <header
      ref={ref}
      className="sticky z-[100] py-3 border-b transition-[top] duration-300"
      style={{
        background: 'var(--bg)',
        borderColor: 'var(--border)',
        top: 'var(--top-offset, 0px)'
      }}
    >
      <div className="max-w-[1280px] mx-auto px-4 flex items-center justify-between gap-6 md:gap-3">
        {/* Логотип */}
        <Link
          to="/"
          className="flex items-center gap-2 no-underline hover:no-underline shrink-0"
          style={{ color: 'var(--text)' }}
        >
          <span className="text-[28px]">👓</span>
          <span className="text-xl font-bold tracking-tight hidden md:inline">OpticPlace</span>
        </Link>

        {/* Поиск */}
        <div className="flex-1 max-w-[500px] mx-auto relative md:max-w-none" ref={searchRef}>
          <form onSubmit={handleSearch} className="flex relative">
            <input
              type="text"
              className="w-full py-3 pl-4 pr-[50px] rounded-xl text-[15px] transition-all duration-200 focus:outline-none md:py-2.5 md:pl-3.5 md:pr-[45px] md:text-sm"
              style={{
                background: 'var(--card)',
                color: 'var(--text)',
                border: '1px solid var(--border)',
              }}
              placeholder={!isFocused && !searchQuery ? typingPlaceholder : ""}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => {
                setIsFocused(true);
                searchResults.length > 0 && setShowResults(true);
              }}
              onBlur={() => setTimeout(() => setIsFocused(false), 200)}
            />
            <button
              type="submit"
              className="absolute right-1 top-1/2 -translate-y-1/2 rounded-lg px-3 py-2 text-white flex items-center justify-center cursor-pointer transition-colors duration-200 hover:bg-[#1d4ed8]"
              style={{ background: 'var(--primary)' }}
              aria-label="Искать"
            >
              {isSearching ? (
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              )}
            </button>
          </form>

          {/* Результаты поиска */}
          {showResults && searchResults.length > 0 && (
            <div
              className="absolute top-[calc(100%+8px)] left-0 right-0 rounded-xl overflow-hidden z-[200] animate-fade-in shadow-[0_10px_40px_rgba(0,0,0,0.15)] sm:left-[-16px] sm:right-[-16px] sm:rounded-none"
              style={{
                background: 'var(--bg)',
                border: '1px solid var(--border)',
              }}
            >
              {searchResults.map((product) => (
                <button
                  key={product.id}
                  className="flex items-center gap-3 w-full p-3 px-4 border-none bg-transparent text-left cursor-pointer transition-colors duration-200 hover:bg-[var(--card)]"
                  onClick={() => handleResultClick(product.slug)}
                >
                  <div
                    className="w-12 h-12 rounded-lg overflow-hidden shrink-0"
                    style={{ background: 'var(--card)' }}
                  >
                    {product.main_image_url ? (
                      <img src={product.main_image_url} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xl text-muted">📷</div>
                    )}
                  </div>
                  <div className="flex flex-col gap-1 min-w-0">
                    <span
                      className="text-sm font-medium whitespace-nowrap overflow-hidden text-ellipsis"
                      style={{ color: 'var(--text)' }}
                    >
                      {product.name}
                    </span>
                    <span className="text-sm font-semibold" style={{ color: 'var(--primary)' }}>
                      {parseFloat(product.price).toLocaleString("ru-RU")} ₽
                    </span>
                  </div>
                </button>
              ))}
              <button
                className="block w-full py-3 px-4 border-none text-sm font-medium cursor-pointer transition-colors duration-200 hover:bg-[var(--border)]"
                style={{
                  background: 'var(--card)',
                  color: 'var(--primary)',
                  borderTop: '1px solid var(--border)',
                }}
                onClick={handleSearch}
              >
                Показать все результаты
              </button>
            </div>
          )}
        </div>

        {/* Иконки справа */}
        <div className="flex items-center gap-2 shrink-0 sm:gap-1">
          {/* Переключатель темы */}
          <button
            className="relative bg-transparent border-none p-2.5 rounded-[10px] cursor-pointer transition-colors duration-200 flex items-center justify-center hover:bg-[var(--card)] hover:text-[var(--primary)] md:p-2"
            style={{ color: 'var(--text)' }}
            onClick={toggle}
            title={theme === "light" ? "Тёмная тема" : "Светлая тема"}
          >
            {theme === "light" ? (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            ) : (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="5" />
                <line x1="12" y1="1" x2="12" y2="3" />
                <line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" />
                <line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
            )}
          </button>

          {/* Избранное */}
          <Link
            to="/favorites"
            className="relative bg-transparent border-none p-2.5 rounded-[10px] cursor-pointer transition-colors duration-200 flex items-center justify-center no-underline hover:no-underline hover:bg-[var(--card)] hover:text-[var(--primary)] md:p-2"
            style={{ color: 'var(--text)' }}
            title="Избранное"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
            {favoritesCount > 0 && (
              <span
                className="absolute top-0.5 right-0.5 text-white text-[11px] font-semibold min-w-[18px] h-[18px] rounded-full flex items-center justify-center px-1"
                style={{ background: 'var(--primary)' }}
              >
                {favoritesCount}
              </span>
            )}
          </Link>

          {/* Корзина */}
          <Link
            to="/cart"
            className="relative bg-transparent border-none p-2.5 rounded-[10px] cursor-pointer transition-colors duration-200 flex items-center justify-center no-underline hover:no-underline hover:bg-[var(--card)] hover:text-[var(--primary)] md:p-2"
            style={{ color: 'var(--text)' }}
            title="Корзина"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="9" cy="21" r="1" />
              <circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
            </svg>
            {totalItems > 0 && (
              <span
                className="absolute top-0.5 right-0.5 text-white text-[11px] font-semibold min-w-[18px] h-[18px] rounded-full flex items-center justify-center px-1"
                style={{ background: 'var(--primary)' }}
              >
                {totalItems}
              </span>
            )}
          </Link>

          {/* Пользователь */}
          <div className="relative" ref={userMenuRef}>
            <button
              className="relative bg-transparent border-none p-2.5 rounded-[10px] cursor-pointer transition-colors duration-200 flex items-center justify-center hover:bg-[var(--card)] hover:text-[var(--primary)] md:p-2"
              style={{ color: 'var(--text)' }}
              onClick={() => setShowUserMenu(!showUserMenu)}
              title="Аккаунт"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </button>

            {showUserMenu && (
              <div
                className="absolute top-[calc(100%+8px)] right-0 rounded-xl min-w-[180px] p-2 z-[200] animate-fade-in shadow-[0_10px_40px_rgba(0,0,0,0.15)]"
                style={{
                  background: 'var(--bg)',
                  border: '1px solid var(--border)',
                }}
              >
                {isLoggedIn ? (
                  <>
                    <Link
                      to="/account"
                      className="block w-full py-2.5 px-3.5 border-none bg-transparent text-sm text-left no-underline rounded-lg cursor-pointer transition-colors duration-200 hover:bg-[var(--card)] hover:no-underline"
                      style={{ color: 'var(--text)' }}
                      onClick={() => setShowUserMenu(false)}
                    >
                      Личный кабинет
                    </Link>
                    <button
                      className="block w-full py-2.5 px-3.5 border-none bg-transparent text-sm text-left rounded-lg cursor-pointer transition-colors duration-200 hover:bg-[var(--card)]"
                      style={{ color: 'var(--text)' }}
                      onClick={handleLogout}
                    >
                      Выйти
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      to="/login"
                      className="block w-full py-2.5 px-3.5 border-none bg-transparent text-sm text-left no-underline rounded-lg cursor-pointer transition-colors duration-200 hover:bg-[var(--card)] hover:no-underline"
                      style={{ color: 'var(--text)' }}
                      onClick={() => setShowUserMenu(false)}
                    >
                      Вход
                    </Link>
                    <Link
                      to="/register"
                      className="block w-full py-2.5 px-3.5 border-none bg-transparent text-sm text-left no-underline rounded-lg cursor-pointer transition-colors duration-200 hover:bg-[var(--card)] hover:no-underline"
                      style={{ color: 'var(--text)' }}
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
