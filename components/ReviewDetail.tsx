import React from 'react';
import { MediaReview, MediaType } from '../types';
import { StarRating } from './StarRating';
import { Film, Tv, BookOpen, Music, ArrowLeft, Calendar, Edit2 } from 'lucide-react';

interface ReviewDetailProps {
  review: MediaReview;
  onBack: () => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

const TypeIcon: React.FC<{ type: MediaType }> = ({ type }) => {
  switch (type) {
    case MediaType.Movie: return <Film size={18} className="text-body" />;
    case MediaType.TV: return <Tv size={18} className="text-body" />;
    case MediaType.Book: return <BookOpen size={18} className="text-body" />;
    case MediaType.Music: return <Music size={18} className="text-body" />;
    default: return <Film size={18} className="text-body" />;
  }
};

export const ReviewDetail: React.FC<ReviewDetailProps> = ({ review, onBack, onEdit }) => {
  const formattedDate = new Date(review.reviewDate).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const updatedDate = review.updatedDate
    ? new Date(review.updatedDate).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
    : null;

  return (
    <div className="max-w-[600px] mx-auto">
      <button
        onClick={onBack}
        className="mb-6 flex items-center gap-2 text-muted hover:text-body transition-colors group"
      >
        <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
        Back to list
      </button>

      <article className="relative overflow-hidden pt-4">

        {/* Header Section */}
        <header className="mb-8 relative z-10">
          <h1 className="text-xl md:text-2xl font-bold text-body leading-snug mb-2 flex items-center flex-wrap gap-x-3 pb-1">
            <span className="inline-flex items-center shrink-0">
              <TypeIcon type={review.type} />
            </span>
            <span>{review.title}</span>
            {(review.author || review.releaseYear) && (
              <span className="text-muted/60 font-normal text-lg md:text-xl flex items-center gap-1.5 self-center translate-y-[1px]">
                {review.author && <span>by {review.author}</span>}
                {review.releaseYear && <span>({review.releaseYear})</span>}
              </span>
            )}
          </h1>

          <div className="flex items-center gap-4 border-y border-border/50 py-3">
            <StarRating rating={review.rating} readOnly size={20} />
            <div>
              <span className="text-xl font-bold text-yellow-500 tabular-nums">{review.rating}</span>
              <span className="text-xl font-bold text-muted opacity-30">/5</span>
            </div>
          </div>
        </header>

        {/* Body */}
        <div className="prose prose-base max-w-none text-body leading-relaxed mb-8">
          <ul className="list-disc pl-5 space-y-4">
            {review.text.map((paragraph, index) => (
              <li key={index} className="whitespace-pre-line">{paragraph}</li>
            ))}
          </ul>
        </div>

        {/* Footer */}
        <footer className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4 pt-6 border-t border-border/50">
          <div className="text-muted text-sm">
            <div className="flex items-center gap-2 mb-1">
              <Calendar size={14} />
              Reviewed on {formattedDate}
            </div>
            {updatedDate && (
              <div className="text-xs italic opacity-75">
                Last updated: {updatedDate}
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => onEdit(review.id)}
              className="flex items-center gap-2 text-muted hover:text-body text-sm font-medium transition-colors"
            >
              <Edit2 size={16} />
              Edit / Get YAML
            </button>
          </div>
        </footer>
      </article>
    </div>
  );
};