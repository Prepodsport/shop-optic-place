/**
 * Компонент для отображения рейтинга звездами
 * @param {number} rating - Средний рейтинг (от 0 до 5)
 * @param {number} count - Количество отзывов
 * @param {string} size - Размер звезд ('small', 'medium', 'large')
 * @param {boolean} showCount - Показывать ли количество отзывов
 */
export default function StarRating({ rating = 0, count = 0, size = 'small', showCount = true }) {
  const stars = [];
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;

  const sizes = {
    small: 14,
    medium: 18,
    large: 24,
  };
  const starSize = sizes[size] || sizes.small;

  const countSizes = {
    small: 'text-xs',
    medium: 'text-sm',
    large: 'text-base',
  };

  for (let i = 0; i < 5; i++) {
    if (i < fullStars) {
      stars.push(
        <svg
          key={i}
          width={starSize}
          height={starSize}
          viewBox="0 0 24 24"
          fill="#fbbf24"
          stroke="#fbbf24"
          strokeWidth="1"
        >
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      );
    } else if (i === fullStars && hasHalfStar) {
      stars.push(
        <svg
          key={i}
          width={starSize}
          height={starSize}
          viewBox="0 0 24 24"
          fill="none"
          stroke="#fbbf24"
          strokeWidth="1"
        >
          <defs>
            <linearGradient id={`half-${i}`}>
              <stop offset="50%" stopColor="#fbbf24" />
              <stop offset="50%" stopColor="transparent" />
            </linearGradient>
          </defs>
          <path
            d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
            fill={`url(#half-${i})`}
          />
        </svg>
      );
    } else {
      stars.push(
        <svg
          key={i}
          width={starSize}
          height={starSize}
          viewBox="0 0 24 24"
          fill="none"
          stroke="#d1d5db"
          strokeWidth="1"
        >
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      );
    }
  }

  return (
    <div className="flex items-center gap-1.5">
      <div className="flex items-center gap-0.5">{stars}</div>
      {showCount && count > 0 && (
        <span className={`${countSizes[size]} font-normal`} style={{ color: 'var(--muted)' }}>
          ({count})
        </span>
      )}
    </div>
  );
}
