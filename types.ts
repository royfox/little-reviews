export enum MediaType {
  Movie = 'Movie',
  TV = 'TV Show',
  Book = 'Book',
  Music = 'Music'
}

export interface MediaReview {
  id: string;
  title: string;
  author?: string; // Used for Artist (Music) or Author (Book)
  type: MediaType;
  rating: number; // 1-5
  text: string;
  releaseYear: number;
  reviewDate: string; // ISO String
  updatedDate?: string; // ISO String for last edit
}

export interface AutofillData {
  releaseYear?: number;
  author?: string;
  summary?: string;
}