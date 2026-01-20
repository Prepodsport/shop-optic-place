import { createContext, useContext, useState, useEffect, useCallback } from "react";

const CartContext = createContext(null);

const CART_STORAGE_KEY = "optic_cart";

function makeKey(productId, variantId) {
  return variantId ? `${productId}:${variantId}` : `${productId}`;
}

export function CartProvider({ children }) {
  const [items, setItems] = useState([]);

  useEffect(() => {
    const saved = localStorage.getItem(CART_STORAGE_KEY);
    if (saved) {
      try {
        setItems(JSON.parse(saved));
      } catch (e) {
        console.error("Ошибка загрузки корзины:", e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === CART_STORAGE_KEY && e.newValue) {
        try {
          setItems(JSON.parse(e.newValue));
        } catch (err) {
          console.error("Ошибка синхронизации корзины:", err);
        }
      }
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const addToCart = useCallback((product, quantity = 1) => {
    const productId = product.id;
    const variantId = product.variantId || null;
    const key = makeKey(productId, variantId);

    setItems((prev) => {
      const existing = prev.find((item) => item.key === key);
      if (existing) {
        return prev.map((item) =>
          item.key === key ? { ...item, quantity: item.quantity + quantity } : item
        );
      }

      return [
        ...prev,
        {
          key,
          productId,
          variantId,
          variantLabel: product.variantLabel || null,
          slug: product.slug,
          name: product.name,
          price: parseFloat(product.price),
          oldPrice: product.old_price ? parseFloat(product.old_price) : null,
          quantity,
          image: product.image || product.main_image_url || null,
        },
      ];
    });
  }, []);

  const removeFromCart = useCallback((itemKeyOrProductId) => {
    setItems((prev) => prev.filter((item) => item.key !== itemKeyOrProductId && item.productId !== itemKeyOrProductId));
  }, []);

  const updateQuantity = useCallback((itemKeyOrProductId, quantity) => {
    if (quantity <= 0) {
      removeFromCart(itemKeyOrProductId);
      return;
    }
    setItems((prev) =>
      prev.map((item) =>
        item.key === itemKeyOrProductId || item.productId === itemKeyOrProductId
          ? { ...item, quantity }
          : item
      )
    );
  }, [removeFromCart]);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const isInCart = useCallback(
    (productId, variantId = null) => {
      if (variantId === null || variantId === undefined) {
        // простой товар
        return items.some((i) => i.productId === productId && (i.variantId === null || i.variantId === undefined));
      }
      // вариация
      return items.some((i) => i.productId === productId && i.variantId === variantId);
    },
    [items]
  );

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        totalItems,
        totalPrice,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        isInCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart должен использоваться внутри CartProvider");
  return context;
}
