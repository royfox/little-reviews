import React from 'react';
import { Star, StarHalf } from 'lucide-react';

interface StarRatingProps {
  rating: number;
  maxRating?: number;
  onRatingChange?: (rating: number) => void;
  readOnly?: boolean;
  size?: number;
}

export const StarRating: React.FC<StarRatingProps> = ({
  rating,
  maxRating = 5,
  onRatingChange,
  readOnly = false,
  size = 20,
}) => {
  const [hoverRating, setHoverRating] = React.useState<number>(0);

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>, index: number) => {
    if (readOnly) return;
    const { left, width } = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - left) / width;
    setHoverRating(percent < 0.5 ? index - 0.5 : index);
  };

  const handleMouseLeave = () => {
    if (!readOnly) setHoverRating(0);
  };

  const handleClick = () => {
    if (!readOnly && onRatingChange) {
      onRatingChange(hoverRating);
    }
  };

  const displayRating = hoverRating || rating;

  return (
    <div className="flex items-center space-x-1" onMouseLeave={handleMouseLeave}>
      {Array.from({ length: maxRating }, (_, i) => i + 1).map((starIndex) => {
        const isFull = displayRating >= starIndex;
        const isHalf = displayRating >= starIndex - 0.5 && !isFull;

        return (
          <button
            key={starIndex}
            type="button"
            className={`${readOnly ? 'cursor-default' : 'cursor-pointer'} transition-transform duration-100 focus:outline-none hover:scale-110`}
            onClick={handleClick}
            onMouseMove={(e) => handleMouseMove(e, starIndex)}
            disabled={readOnly}
          >
            <div className="relative">
              {/* Background Star (Empty) */}
              <Star
                size={size}
                className="text-border fill-border"
              />

              {/* Foreground Star (Filled or Half) */}
              <div className="absolute top-0 left-0 overflow-hidden text-yellow-400">
                {isFull && <Star size={size} className="fill-yellow-400" />}
                {isHalf && <StarHalf size={size} className="fill-yellow-400" />}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
};