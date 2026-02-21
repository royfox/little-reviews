import React from 'react';
import { MediaReview, MediaType } from '../types';
import { StarRating } from './StarRating';
import { Film, Tv, BookOpen, Music } from 'lucide-react';

interface ReviewCardProps {
  review: MediaReview;
  onDelete: (id: string) => void;
  onEdit: (id: string) => void;
  onView: (id: string) => void;
}

const TypeIcon: React.FC<{ type: MediaType; size?: number }> = ({ type, size = 16 }) => {
  switch (type) {
    case MediaType.Movie: return <Film size={size} className="text-body" />;
    case MediaType.TV: return <Tv size={size} className="text-body" />;
    case MediaType.Book: return <BookOpen size={size} className="text-body" />;
    case MediaType.Music: return <Music size={size} className="text-body" />;
    default: return <Film size={size} className="text-body" />;
  }
};

export const ReviewCard: React.FC<ReviewCardProps> = ({ review, onView }) => {

  const formattedDate = new Date(review.reviewDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });


  return (
    <article className="group relative border-b border-border/50 pb-2 mb-2 last:border-0 last:mb-0 transition-all hover:bg-surface/50 -mx-4 px-4 rounded-lg py-1.5">

      {/* Main Row: Title, Author, and Rating */}
      <div className="flex items-baseline justify-between gap-4">
        <div
          onClick={() => onView(review.id)}
          className="cursor-pointer group/title flex items-baseline gap-1.5 overflow-hidden flex-grow"
        >
          <h2 className="text-xl font-bold text-body leading-snug hover:text-blue-600 transition-colors flex items-center flex-wrap gap-x-2 py-0.5 pb-1">
            <span className="inline-flex items-center shrink-0">
              <TypeIcon type={review.type} size={16} />
            </span>
            <span className="truncate max-w-[200px] sm:max-w-none">
              {review.title}
            </span>
            {(review.author || review.releaseYear) && (
              <span className="text-muted/80 font-medium text-base self-center translate-y-[0.5px] flex items-center gap-1.5">
                {review.author && <span className="truncate opacity-80 group-hover/title:text-blue-600 transition-colors">by {review.author}</span>}
                {review.releaseYear && <span>({review.releaseYear})</span>}
              </span>
            )}
          </h2>
        </div>

        <div className="flex-shrink-0 flex flex-col items-end pt-0.5">
          <div className="flex items-center gap-2">
            <StarRating rating={review.rating} readOnly size={16} />
            <span className="text-sm font-bold text-body/90 tabular-nums">{review.rating}<span className="text-muted/60 font-medium">/5</span></span>
          </div>
          <div className="text-[12px] text-muted/60 mt-0.5">
            Reviewed {formattedDate}
          </div>
        </div>
      </div>
    </article>
  );
};