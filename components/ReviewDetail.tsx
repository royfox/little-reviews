import React from 'react';
import { MediaReview, MediaType } from '../types';
import { StarRating } from './StarRating';
import { Film, Tv, Book, Music, ArrowLeft, Calendar, Edit2 } from 'lucide-react';

interface ReviewDetailProps {
  review: MediaReview;
  onBack: () => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

const TypeIcon: React.FC<{ type: MediaType }> = ({ type }) => {
  switch (type) {
    case MediaType.Movie: return <Film size={18} className="text-blue-500" />;
    case MediaType.TV: return <Tv size={18} className="text-purple-500" />;
    case MediaType.Book: return <Book size={18} className="text-green-500" />;
    case MediaType.Music: return <Music size={18} className="text-pink-500" />;
    default: return <Film size={18} />;
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
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <button 
        onClick={onBack}
        className="mb-6 flex items-center gap-2 text-muted hover:text-body transition-colors group"
      >
        <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
        Back to list
      </button>

      <article className="bg-surface rounded-2xl p-8 border border-border shadow-sm relative overflow-hidden">
        
        {/* Header Section */}
        <header className="mb-8 relative z-10">
          <div className="flex flex-wrap items-center gap-4 mb-4">
             <span className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 transition-colors">
                <TypeIcon type={review.type} />
                {review.type}
             </span>
             <span className="text-muted font-mono text-sm bg-input px-3 py-1.5 rounded-full border border-border">
               {review.releaseYear}
             </span>
          </div>

          <h1 className="text-4xl md:text-5xl font-bold text-body leading-tight mb-4">
            {review.title}
          </h1>

          {(review.type === MediaType.Book || review.type === MediaType.Music) && review.author && (
            <div className="text-xl text-muted font-medium mb-6">
              by <span className="text-body">{review.author}</span>
            </div>
          )}

          <div className="flex items-center gap-4 border-y border-border py-4">
             <StarRating rating={review.rating} readOnly size={28} />
             <span className="text-2xl font-bold text-yellow-500">{review.rating}</span>
             <span className="text-muted text-sm uppercase tracking-wide">/ 5</span>
          </div>
        </header>

        {/* Body */}
        <div className="prose prose-lg max-w-none text-body leading-relaxed whitespace-pre-line mb-8">
          {review.text}
        </div>

        {/* Footer */}
        <footer className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4 pt-6 border-t border-border">
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
                className="flex items-center gap-2 bg-input hover:bg-border text-body px-4 py-2 rounded-lg transition-colors border border-border"
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