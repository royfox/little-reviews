import React from 'react';
import { MediaReview, MediaType } from '../types';
import { StarRating } from './StarRating';
import { Film, Tv, Book, Music, Edit2, ExternalLink } from 'lucide-react';

interface ReviewCardProps {
  review: MediaReview;
  onDelete: (id: string) => void;
  onEdit: (id: string) => void;
  onView: (id: string) => void;
}

const TypeIcon: React.FC<{ type: MediaType }> = ({ type }) => {
  switch (type) {
    case MediaType.Movie: return <Film size={16} className="text-blue-500" />;
    case MediaType.TV: return <Tv size={16} className="text-purple-500" />;
    case MediaType.Book: return <Book size={16} className="text-green-500" />;
    case MediaType.Music: return <Music size={16} className="text-pink-500" />;
    default: return <Film size={16} />;
  }
};

export const ReviewCard: React.FC<ReviewCardProps> = ({ review, onEdit, onView }) => {
  
  const formattedDate = new Date(review.reviewDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  const words = review.text.split(/\s+/);
  const isLongReview = words.length > 80;
  const displayedText = !isLongReview 
    ? review.text 
    : words.slice(0, 80).join(' ') + '...';

  return (
    <article className="group relative border-b border-border pb-10 mb-8 last:border-0 last:mb-0 transition-all hover:bg-surface/50 -mx-4 px-4 rounded-xl py-4">
      
      {/* Meta Header */}
      <div className="flex items-center justify-between mb-3">
         <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-full transition-colors">
                <TypeIcon type={review.type} />
                {review.type}
            </span>
            <span className="text-xs text-muted font-mono">
                {formattedDate}
            </span>
         </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-3">
        <div className="flex-grow">
           <h2 
             onClick={() => onView(review.id)}
             className="text-2xl font-bold text-body leading-tight mb-1 cursor-pointer hover:text-primary transition-colors inline-flex items-center gap-2 group/title"
           >
             {review.title}
             <ExternalLink size={16} className="opacity-0 group-hover/title:opacity-100 transition-opacity text-muted" />
           </h2>
           <div className="flex items-center gap-2 text-sm text-muted">
             {(review.type === MediaType.Book || review.type === MediaType.Music) && review.author && (
                <>
                  <span className="font-medium text-body/80">{review.author}</span>
                  <span className="text-muted/50">•</span>
                </>
             )}
             <span>{review.releaseYear}</span>
           </div>
        </div>
        
        <div className="flex-shrink-0">
           <StarRating rating={review.rating} readOnly size={20} />
        </div>
      </div>

      {/* Review Body */}
      <div className="prose prose-sm max-w-none text-body/80 leading-relaxed mb-4">
        <p className="whitespace-pre-line">{displayedText}</p>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-2">
        <button 
           onClick={() => onView(review.id)}
           className="text-primary hover:opacity-80 text-sm font-medium hover:underline"
        >
           {isLongReview ? "Read full review" : "View details"}
        </button>

        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
             <button 
                onClick={() => onEdit(review.id)}
                className="p-2 text-muted hover:text-body hover:bg-input rounded-lg transition-colors flex items-center gap-2"
                title="Edit / Generate YAML"
            >
                <Edit2 size={16} />
            </button>
        </div>
      </div>
    </article>
  );
};