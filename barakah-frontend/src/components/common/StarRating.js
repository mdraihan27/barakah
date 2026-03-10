import { useState } from 'react';

export default function StarRating({
  rating = 0,
  total = 5,
  size = 'sm',
  interactive = false,
  onChange,
}) {
  const [hovered, setHovered] = useState(0);
  const sizeMap = { xs: 'w-3 h-3', sm: 'w-4 h-4', md: 'w-5 h-5', lg: 'w-7 h-7' };

  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: total }, (_, i) => {
        const starIndex = i + 1;
        const filled = starIndex <= (interactive && hovered ? hovered : Math.round(rating));
        return (
          <button
            key={i}
            type="button"
            disabled={!interactive}
            onClick={() => interactive && onChange?.(starIndex)}
            onMouseEnter={() => interactive && setHovered(starIndex)}
            onMouseLeave={() => interactive && setHovered(0)}
            className={`${interactive ? 'cursor-pointer focus:outline-none' : 'cursor-default'} transition-transform ${interactive ? 'hover:scale-125' : ''}`}
          >
            <svg
              className={`${sizeMap[size]} transition-colors ${filled
                  ? 'text-gold drop-shadow-[0_0_4px_rgba(212,175,55,0.5)]'
                  : interactive
                    ? 'text-stone-300 dark:text-white/20 hover:text-gold/50'
                    : 'text-stone-200 dark:text-white/10'
                }`}
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          </button>
        );
      })}
    </div>
  );
}
