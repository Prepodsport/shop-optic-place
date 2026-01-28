import { createContext, useContext, useState, useEffect, useCallback } from "react";

const FavoritesContext = createContext(null);

const FAVORITES_STORAGE_KEY = "optic_favorites";

function normalizeId(id) {
  const n = typeof id === "string" ? Number(id) : id;
  return Number.isFinite(n) ? n : null;
}

function normalizeList(list) {
  if (!Array.isArray(list)) return [];
  const cleaned = list.map(normalizeId).filter((v) => v !== null);
  return Array.from(new Set(cleaned));
}

export function FavoritesProvider({ children }) {
  const [items, setItems] = useState([]);

  // Загрузка избранного из localStorage при монтировании
  useEffect(() => {
    const saved = localStorage.getItem(FAVORITES_STORAGE_KEY);
    if (saved) {
      try {
        setItems(normalizeList(JSON.parse(saved)));
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
      if (e.key !== FAVORITES_STORAGE_KEY) return;
      if (!e.newValue) {
        setItems([]);
        return;
      }

      try {
        setItems(normalizeList(JSON.parse(e.newValue)));
      } catch (err) {
        console.error("Ошибка синхронизации избранного:", err);
      }
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const addToFavorites = useCallback((productId) => {
    const id = normalizeId(productId);
    if (id === null) return;
    setItems((prev) => {
      if (prev.includes(id)) return prev;
      return [...prev, id];
    });
  }, []);

  const removeFromFavorites = useCallback((productId) => {
    const id = normalizeId(productId);
    if (id === null) return;
    setItems((prev) => prev.filter((x) => x !== id));
  }, []);

  const toggleFavorite = useCallback((productId) => {
    const id = normalizeId(productId);
    if (id === null) return;
    setItems((prev) => {
      if (prev.includes(id)) {
        return prev.filter((x) => x !== id);
      }
      return [...prev, id];
    });
  }, []);

  const isFavorite = useCallback(
    (productId) => {
      const id = normalizeId(productId);
      if (id === null) return false;
      return items.includes(id);
    },
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
