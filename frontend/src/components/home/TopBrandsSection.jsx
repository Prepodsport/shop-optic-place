import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import api from "../../api";

export default function TopBrandsSection() {
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  useEffect(() => {
    const fetchBrands = async () => {
      try {
        const response = await api.get("/catalog/brands/featured/");
        setBrands(response.data || []);
      } catch (error) {
        console.error("Ошибка загрузки брендов:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchBrands();
  }, []);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 1);
  }, []);

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (el) {
      el.addEventListener("scroll", checkScroll);
      window.addEventListener("resize", checkScroll);
    }
    return () => {
      if (el) el.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
    };
  }, [checkScroll, brands]);

  const scroll = (direction) => {
    const el = scrollRef.current;
    if (!el) return;
    const cardWidth = el.querySelector(".brand-card")?.offsetWidth || 160;
    const gap = 16;
    const scrollAmount = (cardWidth + gap) * 3;
    el.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  // Skeleton при загрузке
  if (loading) {
    return (
      <div className="px-4 md:px-3 sm:px-2">
        <div className="max-w-[1600px] mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="h-8 w-40 bg-[var(--bg-secondary)] rounded-lg animate-shimmer" />
            <div className="flex gap-2">
              <div className="w-10 h-10 bg-[var(--bg-secondary)] rounded-full animate-shimmer" />
              <div className="w-10 h-10 bg-[var(--bg-secondary)] rounded-full animate-shimmer" />
            </div>
          </div>
          <div className="flex gap-4 overflow-hidden">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="flex-shrink-0 w-[140px] h-[70px] bg-[var(--card)] rounded-xl border border-[var(--border)] animate-shimmer"
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!brands.length) return null;

  return (
    <div className="px-4 md:px-3 sm:px-2">
      <div className="max-w-[1600px] mx-auto">
        {/* Заголовок и навигация */}
        <div className="flex items-center justify-between mb-6 gap-4">
          <h2 className="text-2xl md:text-xl font-bold text-[var(--text)]">
            Топ-бренды
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => scroll("left")}
              disabled={!canScrollLeft}
              className={`w-10 h-10 rounded-full border border-[var(--border)] flex items-center justify-center transition-all
                ${
                  canScrollLeft
                    ? "bg-[var(--card)] hover:bg-[var(--bg-secondary)] hover:border-[var(--primary)] text-[var(--text)]"
                    : "bg-[var(--bg-secondary)] text-[var(--muted)] cursor-not-allowed"
                }`}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={() => scroll("right")}
              disabled={!canScrollRight}
              className={`w-10 h-10 rounded-full border border-[var(--border)] flex items-center justify-center transition-all
                ${
                  canScrollRight
                    ? "bg-[var(--card)] hover:bg-[var(--bg-secondary)] hover:border-[var(--primary)] text-[var(--text)]"
                    : "bg-[var(--bg-secondary)] text-[var(--muted)] cursor-not-allowed"
                }`}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Карусель брендов */}
        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto no-scrollbar scroll-smooth pb-2 -mb-2"
          style={{ scrollSnapType: "x mandatory" }}
        >
          {brands.map((brand) => (
            <Link
              key={brand.id}
              to={`/catalog?brand=${brand.slug}`}
              className="brand-card flex-shrink-0 w-[140px] sm:w-[120px] h-[70px] sm:h-[60px]
                bg-[var(--card)] rounded-xl border border-[var(--border)] p-3
                flex items-center justify-center
                transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:border-[var(--primary)]"
              style={{ scrollSnapAlign: "start" }}
            >
              {brand.logo_url ? (
                <img
                  src={brand.logo_url}
                  alt={brand.name}
                  className="max-w-full max-h-full object-contain opacity-70 hover:opacity-100 transition-opacity
                    dark:brightness-0 dark:invert dark:opacity-50 dark:hover:opacity-70"
                />
              ) : (
                <span className="text-sm font-semibold text-[var(--muted)] hover:text-[var(--primary)] transition-colors text-center">
                  {brand.name}
                </span>
              )}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
