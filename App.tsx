import { useState, useEffect } from 'react';
import { MediaType, MediaReview } from './types';
import { ReviewForm } from './components/ReviewForm';
import { ReviewCard } from './components/ReviewCard';
import { ReviewDetail } from './components/ReviewDetail';
import * as contentService from './services/content';
import { Plus, Search, Film, Music, Tv, Book, SlidersHorizontal, Feather, ArrowUp, ArrowDown, ChevronDown, Check, Sun, Moon, Monitor } from 'lucide-react';

type SortOption = 'reviewDate' | 'releaseYear' | 'rating';
type SortDirection = 'asc' | 'desc';
type ViewState = 'list' | 'form' | 'detail';
type Theme = 'light' | 'dark' | 'system';

function App() {
  const [reviews, setReviews] = useState<MediaReview[]>([]);
  const [view, setView] = useState<ViewState>('list');
  const [activeReviewId, setActiveReviewId] = useState<string | null>(null);
  
  const [filterType, setFilterType] = useState<MediaType | 'All'>('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('reviewDate');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Theme State
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('theme')) {
      return localStorage.getItem('theme') as Theme;
    }
    return 'system';
  });

  // Theme Effect
  useEffect(() => {
    const root = window.document.documentElement;
    const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    if (theme === 'system') {
      localStorage.removeItem('theme');
    } else {
      localStorage.setItem('theme', theme);
    }
  }, [theme]);

  // 1. Load reviews on mount
  useEffect(() => {
    const fetchReviews = async () => {
      setIsLoading(true);
      const data = await contentService.loadReviews();
      setReviews(data);
      setIsLoading(false);
    };
    fetchReviews();
  }, []);

  // 2. Handle URL parsing on mount and browser back/forward
  useEffect(() => {
    const handleUrlChange = () => {
      const params = new URLSearchParams(window.location.search);
      const reviewId = params.get('review');
      
      if (reviewId) {
        setActiveReviewId(reviewId);
        setView('detail');
      } else {
        setActiveReviewId(null);
        setView('list');
      }
    };

    // Check on initial load
    handleUrlChange();

    // Listen for back/forward button clicks
    window.addEventListener('popstate', handleUrlChange);
    return () => window.removeEventListener('popstate', handleUrlChange);
  }, []);

  const updateUrl = (id: string | null) => {
    const url = new URL(window.location.href);
    if (id) {
      url.searchParams.set('review', id);
    } else {
      url.searchParams.delete('review');
    }
    window.history.pushState({}, '', url);
  };

  const handleSaveReview = async (reviewData: Omit<MediaReview, 'id' | 'reviewDate' | 'updatedDate'>) => {
    let newOrUpdatedReview: MediaReview;

    if (activeReviewId && view === 'form') {
      // Edit mode: Use existing ID (which is the filename slug)
      const existing = reviews.find(r => r.id === activeReviewId);
      if (existing) {
        newOrUpdatedReview = {
          ...existing,
          ...reviewData,
          updatedDate: new Date().toISOString()
        };
      } else {
        return; 
      }
    } else {
      // New mode: Generate temporary ID (UUID)
      newOrUpdatedReview = {
        ...reviewData,
        id: crypto.randomUUID(),
        reviewDate: new Date().toISOString(),
      };
    }

    contentService.downloadReviewYaml(newOrUpdatedReview);
    alert("Review YAML downloaded! Please move this file to 'content/reviews/' and run the build script.");
    
    updateUrl(null);
    setView('list');
    setActiveReviewId(null);
  };

  const handleDeleteReview = (_id: string) => {
    alert("To delete a review, please remove the corresponding YAML file from 'content/reviews/' and rebuild the site.");
  };

  const handleEditReview = (id: string) => {
    setActiveReviewId(id);
    setView('form');
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  const handleViewReview = (id: string) => {
    setActiveReviewId(id);
    setView('detail');
    updateUrl(id);
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  const handleBack = () => {
    setView('list');
    setActiveReviewId(null);
    updateUrl(null);
  };

  const getProcessedReviews = () => {
    let result = reviews.filter((review) => {
      const matchesType = filterType === 'All' || review.type === filterType;
      const matchesSearch = review.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            (review.author || '').toLowerCase().includes(searchTerm.toLowerCase());
      return matchesType && matchesSearch;
    });

    return result.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'rating':
          comparison = a.rating - b.rating;
          break;
        case 'releaseYear':
          comparison = a.releaseYear - b.releaseYear;
          break;
        case 'reviewDate':
        default:
          comparison = new Date(a.reviewDate).getTime() - new Date(b.reviewDate).getTime();
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  };

  const getSortLabel = (option: SortOption) => {
    switch(option) {
      case 'reviewDate': return 'Review Date';
      case 'rating': return 'Rating';
      case 'releaseYear': return 'Release Year';
    }
  };

  const processedReviews = getProcessedReviews();
  const activeReview = activeReviewId ? reviews.find(r => r.id === activeReviewId) : undefined;

  const toggleTheme = () => {
    setTheme(prev => {
      if (prev === 'light') return 'dark';
      if (prev === 'dark') return 'system';
      return 'light';
    });
  };

  const getThemeIcon = () => {
    switch (theme) {
      case 'light': return <Sun size={18} />;
      case 'dark': return <Moon size={18} />;
      case 'system': return <Monitor size={18} />;
    }
  };

  return (
    <div className="min-h-screen bg-background text-body font-sans transition-colors duration-300">
      
      {/* Fixed Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border h-16 shadow-sm transition-colors duration-300">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 h-full">
          <div className="flex justify-between items-center h-full">
            <button 
              onClick={() => {
                handleBack();
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="flex items-center gap-2 group transition-opacity hover:opacity-90"
            >
              <Feather className="text-muted group-hover:text-primary transition-colors" size={18} />
              <h1 className="text-lg font-semibold tracking-tight text-body">
                Little Reviews
              </h1>
            </button>
            
            <div className="flex items-center gap-3">
              <button
                onClick={toggleTheme}
                className="text-muted hover:text-body p-2 rounded-full transition-colors hover:bg-surface"
                title={`Theme: ${theme}`}
              >
                {getThemeIcon()}
              </button>

              {view !== 'form' && (
                <button
                  onClick={() => {
                    setActiveReviewId(null);
                    setView('form');
                    updateUrl(null);
                  }}
                  className="text-muted hover:text-body hover:bg-surface p-1.5 rounded-full transition-all active:scale-95"
                  title="New Review File"
                >
                  <Plus size={20} />
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24">
        
        {isLoading && (
           <div className="flex justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
           </div>
        )}

        {!isLoading && (
          <>
            {view === 'form' && (
              <ReviewForm 
                initialData={activeReview}
                onSave={handleSaveReview} 
                onCancel={() => {
                  if (activeReviewId && !activeReview) {
                      setView('list');
                  } else if (activeReviewId) {
                      setView('detail');
                  } else {
                      setView('list');
                  }
                }} 
              />
            )}

            {view === 'detail' && activeReview && (
              <ReviewDetail 
                review={activeReview}
                onBack={handleBack}
                onEdit={handleEditReview}
                onDelete={handleDeleteReview}
              />
            )}

            {view === 'detail' && !activeReview && (
               <div className="text-center py-12">
                  <p className="text-muted mb-4">Review not found.</p>
                  <button onClick={handleBack} className="text-primary hover:underline">Go Home</button>
               </div>
            )}

            {view === 'list' && (
              <div className="animate-in fade-in duration-500">
                
                {/* Controls Bar */}
                <div className="flex flex-col gap-4 mb-10 bg-surface/50 p-4 rounded-2xl border border-border shadow-sm">
                  
                  <div className="flex flex-col md:flex-row gap-4">
                      <div className="relative flex-grow">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Search size={18} className="text-muted" />
                        </div>
                        <input
                          type="text"
                          placeholder="Search titles or authors..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="block w-full pl-10 pr-3 py-2 border border-border rounded-xl leading-5 bg-input text-body placeholder-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary sm:text-sm transition-colors"
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted whitespace-nowrap hidden lg:inline">Sort by:</span>
                        
                        <div className="relative">
                            <button
                              onClick={() => setIsSortMenuOpen(!isSortMenuOpen)}
                              className="flex items-center justify-between gap-2 bg-input border border-border text-body text-sm rounded-xl px-4 py-2.5 hover:border-primary transition-all min-w-[150px]"
                            >
                              <span>{getSortLabel(sortBy)}</span>
                              <ChevronDown size={16} className={`transition-transform duration-200 ${isSortMenuOpen ? 'rotate-180' : ''}`} />
                            </button>
                            
                            {isSortMenuOpen && (
                              <>
                                <div className="fixed inset-0 z-10" onClick={() => setIsSortMenuOpen(false)} />
                                <div className="absolute top-full right-0 mt-2 w-48 bg-surface border border-border rounded-xl shadow-xl z-20 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                  {(['reviewDate', 'rating', 'releaseYear'] as SortOption[]).map((option) => (
                                    <button
                                      key={option}
                                      onClick={() => {
                                        setSortBy(option);
                                        setIsSortMenuOpen(false);
                                      }}
                                      className={`w-full text-left px-4 py-3 text-sm flex items-center justify-between hover:bg-background transition-colors ${
                                        sortBy === option ? 'text-primary font-medium bg-background' : 'text-muted'
                                      }`}
                                    >
                                      {getSortLabel(option)}
                                      {sortBy === option && <Check size={14} className="text-primary" />}
                                    </button>
                                  ))}
                                </div>
                              </>
                            )}
                        </div>

                        <button
                            onClick={() => setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')}
                            className="p-2.5 bg-input border border-border rounded-xl text-muted hover:text-body hover:border-primary transition-colors active:scale-95"
                            title={sortDirection === 'asc' ? "Sort Ascending" : "Sort Descending"}
                        >
                            {sortDirection === 'asc' ? <ArrowUp size={18} /> : <ArrowDown size={18} />}
                        </button>
                      </div>
                  </div>

                  {/* Filter Tabs & Count Row */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-t border-border pt-4 mt-2">
                    <div className="flex overflow-x-auto gap-2 pb-2 md:pb-0 no-scrollbar w-full md:w-auto">
                        <button
                            onClick={() => setFilterType('All')}
                            className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                                filterType === 'All' ? 'bg-body text-background' : 'text-muted hover:text-body hover:bg-input'
                            }`}
                        >
                            All
                        </button>
                        {Object.values(MediaType).map((type) => (
                            <button
                                key={type}
                                onClick={() => setFilterType(type)}
                                className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all flex items-center gap-2 ${
                                    filterType === type ? 'bg-body text-background' : 'text-muted hover:text-body hover:bg-input'
                                }`}
                            >
                                {type === MediaType.Movie && <Film size={14} />}
                                {type === MediaType.TV && <Tv size={14} />}
                                {type === MediaType.Book && <Book size={14} />}
                                {type === MediaType.Music && <Music size={14} />}
                                {type}
                            </button>
                        ))}
                    </div>

                    <div className="text-sm text-muted font-medium whitespace-nowrap px-1">
                        {processedReviews.length} {processedReviews.length === 1 ? 'Review' : 'Reviews'}
                    </div>
                  </div>
                </div>

                {/* Review List */}
                {processedReviews.length === 0 ? (
                  <div className="text-center py-20 bg-surface/30 rounded-3xl border border-dashed border-border">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-input mb-4 text-muted">
                        <SlidersHorizontal size={32} />
                    </div>
                    <h3 className="text-xl font-medium text-body mb-2">No reviews found</h3>
                    <p className="text-muted max-w-md mx-auto">
                      {searchTerm || filterType !== 'All' 
                        ? "Try adjusting your filters or search term." 
                        : "Use the button above to generate your first review file!"}
                    </p>
                    {!reviews.length && (
                        <button
                            onClick={() => {
                              setActiveReviewId(null);
                              setView('form');
                              updateUrl(null);
                            }}
                            className="mt-6 text-primary hover:underline font-medium"
                        >
                            Create your first review YAML &rarr;
                        </button>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {processedReviews.map((review) => (
                      <ReviewCard 
                        key={review.id}
                        review={review} 
                        onDelete={handleDeleteReview}
                        onEdit={handleEditReview}
                        onView={handleViewReview}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

export default App;