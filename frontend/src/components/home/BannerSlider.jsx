import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api';

export default function BannerSlider() {
  const [banners, setBanners] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    api.get('/content/banners/')
      .then(res => {
        setBanners(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Ошибка загрузки баннеров:', err);
        setLoading(false);
      });
  }, []);

  const goToNext = useCallback(() => {
    if (banners.length === 0) return;
    setCurrentIndex(prev => (prev + 1) % banners.length);
  }, [banners.length]);

  const goToPrev = useCallback(() => {
    if (banners.length === 0) return;
    setCurrentIndex(prev => (prev - 1 + banners.length) % banners.length);
  }, [banners.length]);

  const goToSlide = (index) => {
    setCurrentIndex(index);
  };

  // Автопереключение слайдов
  useEffect(() => {
    if (banners.length <= 1 || isPaused) return;

    const interval = setInterval(goToNext, 5000);
    return () => clearInterval(interval);
  }, [banners.length, isPaused, goToNext]);

  if (loading) {
    return (
      <div className="relative w-full max-w-[1280px] mx-auto rounded-2xl md:rounded-xl overflow-hidden" style={{ background: 'var(--card)' }}>
        <div
          className="w-full aspect-[21/9] lg:aspect-video md:aspect-[4/3] sm:aspect-square animate-shimmer"
          style={{
            background: 'linear-gradient(90deg, var(--card) 25%, var(--border) 50%, var(--card) 75%)',
            backgroundSize: '200% 100%',
          }}
        />
      </div>
    );
  }

  if (banners.length === 0) {
    return null;
  }

  const currentBanner = banners[currentIndex];

  return (
    <div
      className="relative w-full max-w-[1280px] mx-auto rounded-2xl md:rounded-xl overflow-hidden group"
      style={{ background: 'var(--card)' }}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="relative w-full aspect-[21/9] lg:aspect-video md:aspect-[4/3] sm:aspect-square">
        {banners.map((banner, index) => (
          <div
            key={banner.id}
            className={`absolute inset-0 transition-all duration-500 ${
              index === currentIndex ? "opacity-100 visible" : "opacity-0 invisible"
            }`}
          >
            <picture>
              <source
                media="(max-width: 768px)"
                srcSet={banner.image_mobile_url || banner.image_url}
              />
              <img
                src={banner.image_url}
                alt={banner.title}
                className="w-full h-full object-cover"
              />
            </picture>

            <div className="absolute bottom-0 left-0 right-0 p-10 lg:p-[30px] md:p-5 text-white bg-gradient-to-t from-black/70 to-transparent">
              <h2 className="m-0 mb-3 md:mb-2 text-[32px] lg:text-[26px] md:text-[22px] sm:text-lg font-bold leading-tight [text-shadow:0_2px_4px_rgba(0,0,0,0.3)]">
                {banner.title}
              </h2>
              {banner.subtitle && (
                <p className="m-0 mb-5 md:mb-4 text-lg lg:text-base md:text-sm sm:text-[13px] opacity-90 max-w-[600px] [text-shadow:0_1px_2px_rgba(0,0,0,0.3)] sm:line-clamp-2">
                  {banner.subtitle}
                </p>
              )}
              {banner.link && (
                <Link
                  to={banner.link}
                  className="inline-block py-3.5 md:py-3 px-7 md:px-5 bg-[var(--primary)] text-white no-underline rounded-[10px] font-semibold text-[15px] md:text-sm transition-all duration-200 hover:bg-blue-700 hover:-translate-y-0.5 hover:no-underline"
                >
                  {banner.button_text || 'Подробнее'}
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Навигационные стрелки */}
      {banners.length > 1 && (
        <>
          <button
            className="absolute top-1/2 left-4 md:left-2.5 -translate-y-1/2 w-12 md:w-10 h-12 md:h-10 bg-white/90 border-none rounded-full cursor-pointer flex items-center justify-center text-gray-900 transition-all duration-200 opacity-0 group-hover:opacity-100 hover:bg-white hover:scale-110 z-10 shadow-lg sm:hidden"
            onClick={goToPrev}
            aria-label="Предыдущий слайд"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <button
            className="absolute top-1/2 right-4 md:right-2.5 -translate-y-1/2 w-12 md:w-10 h-12 md:h-10 bg-white/90 border-none rounded-full cursor-pointer flex items-center justify-center text-gray-900 transition-all duration-200 opacity-0 group-hover:opacity-100 hover:bg-white hover:scale-110 z-10 shadow-lg sm:hidden"
            onClick={goToNext}
            aria-label="Следующий слайд"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </>
      )}

      {/* Индикаторы */}
      {banners.length > 1 && (
        <div className="absolute bottom-5 md:bottom-3 left-1/2 -translate-x-1/2 flex gap-2.5 z-10">
          {banners.map((_, index) => (
            <button
              key={index}
              className={`w-2.5 md:w-2 h-2.5 md:h-2 rounded-full border-none cursor-pointer transition-all duration-200 ${
                index === currentIndex
                  ? "bg-white scale-[1.2]"
                  : "bg-white/50 hover:bg-white/80"
              }`}
              onClick={() => goToSlide(index)}
              aria-label={`Слайд ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
