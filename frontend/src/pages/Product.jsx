import { useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { useParams, Link } from "react-router-dom";
import { api } from "../api.js";
import { useCart } from "../context/CartContext.jsx";
import { normalizeRichText } from "../utils/normalizeRichText.js";
import ProductReviews from "../components/product/ProductReviews.jsx";

export default function Product() {
  const { slug } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);

  const [selectedImage, setSelectedImage] = useState(null);

  // selection
  const [selectedAttributes, setSelectedAttributes] = useState({});
  const [selectedVariant, setSelectedVariant] = useState(null);

  const { addToCart, isInCart } = useCart();

  useEffect(() => {
    let mounted = true;

    (async () => {
      setLoading(true);
      try {
        const resp = await api.get(`/catalog/products/${slug}/`);
        if (!mounted) return;

        setProduct(resp.data);
        setSelectedImage(resp.data.main_image_url || null);

        // не автоселектим атрибуты — пользователь выбирает сам
        setSelectedAttributes({});
        setSelectedVariant(null);
      } catch (error) {
        const message = error.response?.data?.detail || "Ошибка загрузки товара";
        toast.error(message);
        if (mounted) setProduct(null);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [slug]);

  // gallery
  const allImages = useMemo(() => {
    if (!product) return [];
    const imgs = [];
    if (product.main_image_url) imgs.push({ id: "main", url: product.main_image_url });
    if (Array.isArray(product.images)) {
      product.images.forEach((img) => imgs.push({ id: img.id, url: img.image_url }));
    }
    return imgs;
  }, [product]);

  // === Variations ============================================================
  const displayAttributes = product?.available_attributes || [];
  const attrOrder = useMemo(() => displayAttributes.map((a) => a.id), [displayAttributes]);

  const hasVariants = useMemo(() => {
    return (product?.variants?.length ?? 0) > 0 && attrOrder.length > 0;
  }, [product, attrOrder]);

  const inStockVariantMaps = useMemo(() => {
    if (!hasVariants) return [];
    const list = [];

    for (const v of product?.variants || []) {
      if ((v.stock ?? 0) <= 0) continue;

      const m = new Map();
      for (const av of v.attribute_values || []) {
        m.set(av.attribute_id, av.id);
      }

      list.push({ variant: v, map: m });
    }

    return list;
  }, [hasVariants, product]);

  const allowedValueIdsByAttr = useMemo(() => {
    const res = new Map();
    for (const attrId of attrOrder) res.set(attrId, new Set());

    if (!hasVariants) return res;

    for (const { map } of inStockVariantMaps) {
      for (const attrId of attrOrder) {
        let ok = true;
        for (const otherId of attrOrder) {
          if (otherId === attrId) continue;
          const sel = selectedAttributes[otherId];
          if (sel && map.get(otherId) !== sel) {
            ok = false;
            break;
          }
        }
        if (!ok) continue;

        const valId = map.get(attrId);
        if (valId) res.get(attrId).add(valId);
      }
    }

    return res;
  }, [hasVariants, inStockVariantMaps, attrOrder, selectedAttributes]);

  const hasSelection = useMemo(() => Object.keys(selectedAttributes).length > 0, [selectedAttributes]);

  const clearVariations = () => {
    setSelectedAttributes({});
    setSelectedVariant(null);
  };

  useEffect(() => {
    if (!hasVariants) return;

    setSelectedAttributes((prev) => {
      let changed = false;
      const next = { ...prev };

      for (const attrId of attrOrder) {
        const sel = next[attrId];
        if (!sel) continue;

        const allowed = allowedValueIdsByAttr.get(attrId);
        if (allowed && !allowed.has(sel)) {
          delete next[attrId];
          changed = true;
        }
      }

      return changed ? next : prev;
    });
  }, [hasVariants, allowedValueIdsByAttr, attrOrder]);

  const isSelectionComplete = useMemo(() => {
    if (!hasVariants) return true;
    return attrOrder.every((attrId) => Boolean(selectedAttributes[attrId]));
  }, [hasVariants, attrOrder, selectedAttributes]);

  useEffect(() => {
    if (!hasVariants) {
      setSelectedVariant(null);
      return;
    }

    if (!isSelectionComplete) {
      setSelectedVariant(null);
      return;
    }

    const found = inStockVariantMaps.find(({ map }) => {
      for (const attrId of attrOrder) {
        if (map.get(attrId) !== selectedAttributes[attrId]) return false;
      }
      return true;
    });

    setSelectedVariant(found ? found.variant : null);
  }, [hasVariants, isSelectionComplete, inStockVariantMaps, attrOrder, selectedAttributes]);

  const handleAttributeSelect = (attrId, rawValueId) => {
    const valueId = rawValueId ? Number(rawValueId) : null;

    setSelectedAttributes((prev) => {
      const next = { ...prev };

      if (!valueId || Number.isNaN(valueId)) {
        delete next[attrId];
      } else {
        next[attrId] = valueId;
      }

      return next;
    });
  };

  // price
  const currentPrice = useMemo(() => {
    if (selectedVariant?.price) return parseFloat(selectedVariant.price);
    return product ? parseFloat(product.price) : 0;
  }, [selectedVariant, product]);

  const currentOldPrice = useMemo(() => {
    if (selectedVariant?.old_price) return parseFloat(selectedVariant.old_price);
    return product?.old_price ? parseFloat(product.old_price) : null;
  }, [selectedVariant, product]);

  const handleAddToCart = () => {
    if (!product) return;

    if (hasVariants && !selectedVariant) return;

    const variantLabel = selectedVariant?.attribute_values?.length
      ? selectedVariant.attribute_values.map((av) => `${av.attribute_name}: ${av.value}`).join(", ")
      : null;

    const cartItem = {
      ...product,
      variantId: selectedVariant?.id || null,
      variantLabel,
      selectedAttributes,
      price: currentPrice,
      old_price: currentOldPrice,
      image: product.main_image_url || null,
    };

    addToCart(cartItem);
  };

  const productId = product?.id || null;

  const inCart = !productId
    ? false
    : hasVariants
      ? selectedVariant
        ? isInCart(productId, selectedVariant.id)
        : false
      : isInCart(productId);

  const canAddToCart = !hasVariants ? true : Boolean(selectedVariant) && (selectedVariant.stock ?? 0) > 0;

  if (loading) {
    return (
      <div className="max-w-[1280px] mx-auto px-4 py-10">
        <div className="text-center py-16 px-5">
          <div
            className="w-10 h-10 border-[3px] border-[var(--border)] border-t-[var(--primary)] rounded-full animate-spin mx-auto mb-5"
            style={{ borderTopColor: "var(--primary)" }}
          />
          <p style={{ color: "var(--muted)" }}>Загрузка товара...</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-[1280px] mx-auto px-4 py-10">
        <div className="text-center py-16 px-5">
          <h2 className="mb-4" style={{ color: "var(--text)" }}>
            Товар не найден
          </h2>
          <Link
            to="/catalog"
            className="inline-block py-3.5 px-6 bg-[var(--primary)] text-white no-underline rounded-[10px] font-semibold transition-colors duration-200 hover:bg-blue-700 hover:no-underline"
          >
            Перейти в каталог
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1280px] mx-auto px-4 py-6">
      {/* breadcrumbs */}
      <div className="flex items-center gap-2 py-4 text-sm flex-wrap" style={{ color: "var(--muted)" }}>
        <Link to="/" className="text-[var(--primary)] no-underline hover:underline">
          Главная
        </Link>
        <span>/</span>
        <Link to="/catalog" className="text-[var(--primary)] no-underline hover:underline">
          Каталог
        </Link>
        <span>/</span>
        {product.category && (
          <>
            <Link
              to={`/catalog?category=${product.category.slug}`}
              className="text-[var(--primary)] no-underline hover:underline"
            >
              {product.category.name}
            </Link>
            <span>/</span>
          </>
        )}
        <span style={{ color: "var(--text)" }}>{product.name}</span>
      </div>

      {/* main layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10 mt-5">
        {/* left: images */}
        <div className="md:sticky md:top-5 self-start">
          <div
            className="w-full rounded-2xl overflow-hidden border flex items-center justify-center"
            style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}
          >
            {selectedImage ? (
              <img
                src={selectedImage}
                alt={product.name}
                className="w-full h-[420px] sm:h-[520px] object-contain"
              />
            ) : (
              <div className="h-[420px] sm:h-[520px] flex items-center justify-center text-base" style={{ color: "var(--muted)" }}>
                Нет изображения
              </div>
            )}
          </div>

          {allImages.length > 1 && (
            <div className="mt-4 grid grid-cols-5 sm:grid-cols-6 gap-2">
              {allImages.map((img) => {
                const active = selectedImage === img.url;
                return (
                  <button
                    key={img.id}
                    className="aspect-square rounded-xl overflow-hidden border transition-all duration-200 hover:border-[var(--primary)]"
                    style={{
                      background: "var(--bg)",
                      borderColor: active ? "var(--primary)" : "var(--border)",
                    }}
                    onClick={() => setSelectedImage(img.url)}
                    type="button"
                    aria-label="Выбрать изображение"
                  >
                    <img src={img.url} alt="" className="w-full h-full object-cover" />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* right: info */}
        <div
          className="rounded-2xl border p-4 sm:p-6 flex flex-col gap-5"
          style={{ background: "var(--card)", borderColor: "var(--border)" }}
        >
          <div>
            <h1 className="m-0 mb-2 text-[26px] sm:text-[30px] leading-tight font-bold" style={{ color: "var(--text)" }}>
              {product.name}
            </h1>

            <div className="flex gap-2.5 flex-wrap">
              {product.category && (
                <Link
                  to={`/catalog?category=${product.category.slug}`}
                  className="text-sm text-[var(--primary)] no-underline py-1.5 px-3 rounded-[999px] transition-colors duration-200 hover:bg-[var(--primary)] hover:text-white"
                  style={{ background: "var(--bg-secondary)" }}
                >
                  {product.category.name}
                </Link>
              )}

              {product.brand && (
                <Link
                  to={`/catalog?brand=${product.brand.slug}`}
                  className="text-sm text-[var(--primary)] no-underline py-1.5 px-3 rounded-[999px] transition-colors duration-200 hover:bg-[var(--primary)] hover:text-white"
                  style={{ background: "var(--bg-secondary)" }}
                >
                  {product.brand.name}
                </Link>
              )}
            </div>
          </div>

          {/* short description */}
          {product.short_description ? (
            <div
              className="text-[15px] leading-relaxed p-4 rounded-2xl border [&_p]:m-0 [&_p]:mb-2.5 [&_ul]:my-2 [&_ul]:pl-5 [&_li]:mb-1"
              style={{ background: "var(--bg-secondary)", color: "var(--text)", borderColor: "var(--border)" }}
              dangerouslySetInnerHTML={{ __html: normalizeRichText(product.short_description) }}
            />
          ) : null}

          {/* price */}
          <div className="flex items-end gap-4 flex-wrap">
            <div className="text-[32px] font-bold leading-none" style={{ color: "var(--text)" }}>
              {currentPrice.toLocaleString("ru-RU")} ₽
            </div>
            {currentOldPrice ? (
              <div className="text-xl line-through" style={{ color: "var(--muted)" }}>
                {currentOldPrice.toLocaleString("ru-RU")} ₽
              </div>
            ) : null}
          </div>

          {/* variations */}
          {hasVariants ? (
            <div
              className="rounded-2xl border p-4 sm:p-5 flex flex-col gap-4"
              style={{ background: "var(--bg)", borderColor: "var(--border)" }}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-semibold" style={{ color: "var(--text)" }}>
                  Параметры
                </div>

                <button
                  className="py-2 px-3 text-[13px] bg-transparent border rounded-lg cursor-pointer transition-all duration-200 hover:bg-[var(--bg-secondary)] disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ color: "var(--muted)", borderColor: "var(--border)" }}
                  type="button"
                  onClick={clearVariations}
                  disabled={!hasSelection}
                  title="Сбросить выбранные параметры"
                >
                  Сбросить
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {displayAttributes.map((attr) => {
                  const allowed = allowedValueIdsByAttr.get(attr.id) || new Set();
                  const value = selectedAttributes[attr.id] ? String(selectedAttributes[attr.id]) : "";

                  if (!allowed.size) return null;

                  return (
                    <div key={attr.id} className="flex flex-col gap-1.5">
                      <label className="font-semibold text-[13px]" style={{ color: "var(--text)" }} htmlFor={`attr-${attr.id}`}>
                        {attr.name}
                      </label>

                      <select
                        id={`attr-${attr.id}`}
                        className="w-full py-2.5 px-3 border-2 rounded-xl text-sm cursor-pointer transition-colors duration-200 focus:outline-none focus:border-[var(--primary)]"
                        style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }}
                        value={value}
                        onChange={(e) => handleAttributeSelect(attr.id, e.target.value)}
                      >
                        <option value="">Выберите…</option>

                        {attr.values
                          .filter((v) => allowed.has(v.id))
                          .map((v) => (
                            <option key={v.id} value={String(v.id)}>
                              {v.value}
                            </option>
                          ))}
                      </select>
                    </div>
                  );
                })}
              </div>

              <div className="text-sm">
                {selectedVariant ? (
                  <span className="text-green-500 font-medium before:content-[''] before:inline-block before:w-2 before:h-2 before:bg-green-500 before:rounded-full before:mr-2">
                    В наличии
                  </span>
                ) : (
                  <span style={{ color: "var(--muted)" }}>Выберите параметры</span>
                )}
              </div>
            </div>
          ) : (
            <div className="text-sm">
              <span className="text-green-500 font-medium before:content-[''] before:inline-block before:w-2 before:h-2 before:bg-green-500 before:rounded-full before:mr-2">
                В наличии
              </span>
            </div>
          )}

          {/* add to cart */}
          <div className="flex gap-4">
            <button
              className={`flex-1 py-3.5 px-6 text-base font-semibold rounded-[12px] border-2 cursor-pointer transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed ${
                inCart
                  ? "bg-[var(--bg-secondary)] text-[var(--muted)] border-[var(--border)]"
                  : "bg-[var(--primary)] text-white border-[var(--primary)] hover:bg-blue-700 hover:border-blue-700"
              }`}
              onClick={handleAddToCart}
              disabled={inCart || !canAddToCart}
              type="button"
            >
              {inCart ? "В корзине" : hasVariants && !selectedVariant ? "Выберите параметры" : "Добавить в корзину"}
            </button>
          </div>

          {/* SKU */}
          {(selectedVariant?.sku || product.sku) && (
            <div className="text-[13px]" style={{ color: "var(--muted)" }}>
              Артикул: <span style={{ color: "var(--text)" }}>{selectedVariant?.sku || product.sku}</span>
            </div>
          )}
        </div>
      </div>

      {/* description */}
      {product.description ? (
        <div className="mt-12 pt-8 border-t" style={{ borderColor: "var(--border)" }}>
          <h2 className="m-0 mb-5 text-[22px] font-bold" style={{ color: "var(--text)" }}>
            Описание
          </h2>
          <div
            className="leading-[1.7] [&_h5]:text-lg [&_h5]:my-5 [&_h5]:mb-2.5 [&_p]:m-0 [&_p]:mb-4 [&_ul]:my-4 [&_ul]:pl-5 [&_li]:mb-2.5 [&_strong]:text-[var(--text)]"
            style={{ color: "var(--text)" }}
            dangerouslySetInnerHTML={{ __html: normalizeRichText(product.description) }}
          />
        </div>
      ) : null}

      {/* attributes table */}
      {Array.isArray(product.attributes) && product.attributes.length > 0 ? (
        <div className="mt-10 pt-8 border-t" style={{ borderColor: "var(--border)" }}>
          <h2 className="m-0 mb-5 text-[22px] font-bold" style={{ color: "var(--text)" }}>
            Характеристики
          </h2>
          <div className="flex flex-col">
            {product.attributes.map((attr, idx) => (
              <div
                key={idx}
                className={`grid grid-cols-2 gap-4 py-3 ${idx !== product.attributes.length - 1 ? "border-b" : ""}`}
                style={{ borderColor: "var(--border)" }}
              >
                <div className="text-sm" style={{ color: "var(--muted)" }}>
                  {attr.attribute_name}
                </div>
                <div className="text-sm" style={{ color: "var(--text)" }}>
                  {attr.value}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* Reviews */}
      <ProductReviews productId={product.id} productSlug={product.slug} />
    </div>
  );
}
