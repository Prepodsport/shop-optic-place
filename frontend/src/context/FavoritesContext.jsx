import { createContext, useContext, useState, useEffect, useCallback } from "react";

const FavoritesContext = createContext(null);

const FAVORITES_STORAGE_KEY = "optic_favorites";

export function FavoritesProvider({ children }) {
  const [items, setItems] = useState([]);

  // Загрузка избранного из localStorage при монтировании
  useEffect(() => {
    const saved = localStorage.getItem(FAVORITES_STORAGE_KEY);
    if (saved) {
      try {
        setItems(JSON.parse(saved));
      } catch (e) {
        console.error("Ошибка загрузки избранного:", e);
      }
    }
  }, []);

  // Сохранение избранного в localStorage при изменении
  useEffect(() => {
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  // Синхронизация между вкладками
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === FAVORITES_STORAGE_KEY && e.newValue) {
        try {
          setItems(JSON.parse(e.newValue));
        } catch (err) {
          console.error("Ошибка синхронизации избранного:", err);
        }
      }
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const addToFavorites = useCallback((productId) => {
    setItems((prev) => {
      if (prev.includes(productId)) return prev;
      return [...prev, productId];
    });
  }, []);

  const removeFromFavorites = useCallback((productId) => {
    setItems((prev) => prev.filter((id) => id !== productId));
  }, []);

  const toggleFavorite = useCallback((productId) => {
    setItems((prev) => {
      if (prev.includes(productId)) {
        return prev.filter((id) => id !== productId);
      }
      return [...prev, productId];
    });
  }, []);

  const isFavorite = useCallback(
    (productId) => items.includes(productId),
    [items]
  );

  const clearFavorites = useCallback(() => {
    setItems([]);
  }, []);

  return (
    <FavoritesContext.Provider
      value={{
        items,
        count: items.length,
        addToFavorites,
        removeFromFavorites,
        toggleFavorite,
        isFavorite,
        clearFavorites,
      }}
    >
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const context = useContext(FavoritesContext);
  if (!context) {
    throw new Error("useFavorites должен использоваться внутри FavoritesProvider");
  }
  return context;
}
