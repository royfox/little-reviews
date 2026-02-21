import React, { useState } from 'react';
import { MediaType, MediaReview } from '../types';
import { StarRating } from './StarRating';
import { Download, X } from 'lucide-react';

interface ReviewFormProps {
  initialData?: MediaReview;
  onSave: (review: Omit<MediaReview, 'id' | 'reviewDate' | 'updatedDate'>) => void;
  onCancel: () => void;
}

export const ReviewForm: React.FC<ReviewFormProps> = ({ initialData, onSave, onCancel }) => {
  const [title, setTitle] = useState(initialData?.title || '');
  const [type, setType] = useState<MediaType>(initialData?.type || MediaType.Movie);
  const [author, setAuthor] = useState(initialData?.author || '');
  const [year, setYear] = useState<number>(initialData?.releaseYear || new Date().getFullYear());
  const [rating, setRating] = useState(initialData?.rating || 0);
  const [text, setText] = useState(initialData?.text || '');

  const needsAuthor = type === MediaType.Book || type === MediaType.Music;
  const isEditing = !!initialData;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      title,
      type,
      author: needsAuthor ? author : undefined,
      releaseYear: year,
      rating: rating || 0,
      text,
    });
  };

  return (
    <div className="bg-surface border border-border rounded-2xl p-6 md:p-8 max-w-3xl mx-auto shadow-xl relative overflow-hidden mb-12">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-secondary"></div>

      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-body">{isEditing ? 'Update & Download YAML' : 'Create Review YAML'}</h2>
        <button onClick={onCancel} className="text-muted hover:text-body transition-colors">
          <X size={24} />
        </button>
      </div>

      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mb-6 text-sm text-blue-600 dark:text-blue-300">
        <p><strong>Static Mode:</strong> Saving this form will download a <code>.yaml</code> file. Move this file to your <code>content/reviews/</code> folder and rebuild the site to see changes.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Type Selection */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {Object.values(MediaType).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={`py-2 px-3 rounded-lg text-sm font-medium transition-all ${type === t
                  ? 'bg-primary text-white shadow-lg shadow-primary/25'
                  : 'bg-input text-muted hover:bg-border'
                }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Title */}
        <div className="space-y-1">
          <label className="block text-xs font-medium text-muted uppercase tracking-wide">Title</label>
          <input
            required
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter media title..."
            className="w-full bg-input border border-border rounded-lg px-4 py-3 text-body focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent placeholder-muted/70"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Author/Artist - Conditional */}
          {needsAuthor && (
            <div className="space-y-1">
              <label className="block text-xs font-medium text-muted uppercase tracking-wide">
                {type === MediaType.Book ? 'Author' : 'Artist'}
              </label>
              <input
                type="text"
                required={needsAuthor}
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder={type === MediaType.Book ? 'J.K. Rowling' : 'The Beatles'}
                className="w-full bg-input border border-border rounded-lg px-4 py-3 text-body focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent placeholder-muted/70"
              />
            </div>
          )}

          {/* Release Year */}
          <div className="space-y-1">
            <label className="block text-xs font-medium text-muted uppercase tracking-wide">Release Year</label>
            <input
              type="number"
              required
              min="1800"
              max={new Date().getFullYear() + 5}
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value))}
              className="w-full bg-input border border-border rounded-lg px-4 py-3 text-body focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent placeholder-muted/70"
            />
          </div>
        </div>

        {/* Rating */}
        <div className="space-y-2">
          <label className="block text-xs font-medium text-muted uppercase tracking-wide">Rating</label>
          <div className="bg-input border border-border rounded-lg p-4 flex justify-center">
            <StarRating rating={rating} onRatingChange={setRating} size={32} />
          </div>
        </div>

        {/* Review Text */}
        <div className="space-y-1">
          <label className="block text-xs font-medium text-muted uppercase tracking-wide">Review</label>
          <textarea
            required
            rows={6}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="What did you think?"
            className="w-full bg-input border border-border rounded-lg px-4 py-3 text-body focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent placeholder-muted/70 resize-none"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-3 px-4 bg-transparent border border-muted/30 text-muted hover:text-body rounded-xl hover:bg-input transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="flex-1 py-3 px-4 bg-primary text-white rounded-xl hover:bg-indigo-500 transition-colors font-bold shadow-lg shadow-primary/25 flex justify-center items-center gap-2"
          >
            <Download size={18} />
            {isEditing ? 'Download Updated YAML' : 'Download YAML'}
          </button>
        </div>
      </form>
    </div>
  );
};