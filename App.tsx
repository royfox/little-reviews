import { useState, useEffect } from 'react';
import { MediaType, MediaReview } from './types';
import { ReviewForm } from './components/ReviewForm';
import { AuthForm } from './components/AuthForm';
import { ReviewCard } from './components/ReviewCard';
import { ReviewDetail } from './components/ReviewDetail';
import * as contentService from './services/content';
import { Plus, Search, Film, Music, Tv, BookOpen, SlidersHorizontal, ArrowUp, ArrowDown, ChevronDown, Check, LogIn, LogOut } from 'lucide-react';

type SortOption = 'reviewDate' | 'releaseYear' | 'rating';
type SortDirection = 'asc' | 'desc';
type ViewState = 'list' | 'form' | 'detail' | 'auth';

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
  const [isSaving, setIsSaving] = useState(false);
  const [authConfigured, setAuthConfigured] = useState(true);
  const [username, setUsername] = useState<string | null>(null);
  const isAuthenticated = username !== null;


  // 1. Load reviews on mount
  useEffect(() => {
    const fetchReviews = async () => {
      setIsLoading(true);
      try {
        const [data, auth] = await Promise.all([
          contentService.loadReviews(),
          contentService.getAuthStatus(),
        ]);
        setReviews(data);
        setAuthConfigured(auth.configured);
        setUsername(auth.authenticated ? auth.username : null);
      } catch (error) {
        alert(error instanceof Error ? error.message : 'The app could not be loaded.');
      } finally {
        setIsLoading(false);
      }
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
    if (!isAuthenticated || isSaving) return;
    setIsSaving(true);
    try {
      if (activeReviewId) {
        const updated = await contentService.updateReview(activeReviewId, reviewData);
        setReviews(current => current.map(review => review.id === updated.id ? updated : review));
        setView('detail');
      } else {
        const created = await contentService.createReview(reviewData);
        setReviews(current => [created, ...current]);
        setActiveReviewId(created.id);
        updateUrl(created.id);
        setView('detail');
      }
    } catch (error) {
      const apiError = error as Error & { status?: number };
      if (apiError.status === 401) {
        setUsername(null);
        setView('auth');
      }
      alert(apiError.message || 'The review could not be saved.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteReview = async (id: string) => {
    const review = reviews.find(item => item.id === id);
    if (!review || !confirm(`Delete “${review.title}”? This cannot be undone.`)) return;
    try {
      await contentService.deleteReview(id);
      setReviews(current => current.filter(item => item.id !== id));
      handleBack();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'The review could not be deleted.');
    }
  };

  const handleEditReview = (id: string) => {
    if (!isAuthenticated) {
      setView('auth');
      return;
    }
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

  const handleAuth = async (loginUsername: string, password: string) => {
    const result = authConfigured
      ? await contentService.login(loginUsername, password)
      : await contentService.setupAccount(loginUsername, password);
    setUsername(result.username);
    setAuthConfigured(true);
    setView('list');
  };

  const handleLogout = async () => {
    try {
      await contentService.logout();
      setUsername(null);
      if (view === 'form') setView('list');
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Sign out failed.');
    }
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
    switch (option) {
      case 'reviewDate': return 'Review Date';
      case 'rating': return 'Rating';
      case 'releaseYear': return 'Release Year';
    }
  };

  const processedReviews = getProcessedReviews();
  const activeReview = activeReviewId ? reviews.find(r => r.id === activeReviewId) : undefined;


  return (
    <div className="min-h-screen bg-white text-body font-sans">

      {/* Fixed Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-border h-12 shadow-sm transition-colors duration-300">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 h-full">
          <div className="flex justify-between items-center h-full">
            <button
              onClick={() => {
                handleBack();
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="flex items-center gap-1 group transition-opacity hover:opacity-90"
            >
              <h1 className="text-xl font-bold tracking-tight text-slate-400 font-sans">
                The Recall
              </h1>
            </button>

            <div className="flex items-center gap-3">

              {isAuthenticated && view !== 'form' && view !== 'auth' && (
                <button
                  onClick={() => {
                    setActiveReviewId(null);
                    setView('form');
                    updateUrl(null);
                  }}
                  className="text-muted hover:text-body hover:bg-surface p-1.5 rounded-full transition-all active:scale-95"
                  title="Add review"
                >
                  <Plus size={20} />
                </button>
              )}
              {isAuthenticated ? (
                <button onClick={handleLogout} className="text-muted hover:text-body p-1.5 rounded-full" title={`Sign out ${username}`}>
                  <LogOut size={19} />
                </button>
              ) : (
                <button onClick={() => setView('auth')} className="text-muted hover:text-body p-1.5 rounded-full" title="Editor sign-in">
                  <LogIn size={19} />
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pt-16 bg-white min-h-screen">

        {isLoading && (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        )}

        {!isLoading && (
          <>
            {view === 'auth' && (
              <AuthForm
                mode={authConfigured ? 'login' : 'setup'}
                onSubmit={handleAuth}
                onCancel={() => setView('list')}
              />
            )}

            {view === 'form' && isAuthenticated && (
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
                canEdit={isAuthenticated}
              />
            )}

            {view === 'detail' && !activeReview && (
              <div className="text-center py-12">
                <p className="text-muted mb-4">Review not found.</p>
                <button onClick={handleBack} className="text-primary hover:underline">Go Home</button>
              </div>
            )}

            {view === 'list' && (
              <div>

                {/* Controls Bar */}
                <div className="flex flex-col gap-2 mb-4 border-b border-border pb-4">

                  <div className="flex flex-col md:flex-row gap-3">
                    <div className="relative flex-grow group">
                      <div className="absolute inset-y-0 left-0 pl-1 flex items-center pointer-events-none">
                        <Search size={16} className="text-muted group-focus-within:text-primary transition-colors" />
                      </div>
                      <input
                        type="text"
                        placeholder="Search titles or authors..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="block w-full pl-7 pr-3 py-1.5 border-b border-transparent bg-transparent text-body placeholder-muted focus:outline-none focus:border-primary sm:text-sm transition-all"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted whitespace-nowrap hidden lg:inline">Sort by:</span>

                      <div className="relative">
                        <button
                          onClick={() => setIsSortMenuOpen(!isSortMenuOpen)}
                          className="flex items-center justify-between gap-2 bg-input border border-border text-body text-xs rounded-xl px-4 py-2 hover:border-primary transition-all min-w-[140px]"
                        >
                          <span>{getSortLabel(sortBy)}</span>
                          <ChevronDown size={16} className={`transition-transform duration-200 ${isSortMenuOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {isSortMenuOpen && (
                          <>
                            <div className="fixed inset-0 z-10" onClick={() => setIsSortMenuOpen(false)} />
                            <div className="absolute top-full right-0 mt-2 w-48 bg-surface border border-border rounded-xl shadow-xl z-20 overflow-hidden">
                              {(['reviewDate', 'rating', 'releaseYear'] as SortOption[]).map((option) => (
                                <button
                                  key={option}
                                  onClick={() => {
                                    setSortBy(option);
                                    setIsSortMenuOpen(false);
                                  }}
                                  className={`w-full text-left px-4 py-2 text-xs flex items-center justify-between hover:bg-background transition-colors ${sortBy === option ? 'text-primary font-medium bg-background' : 'text-muted'
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
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-1">
                    <div className="flex overflow-x-auto gap-1.5 pb-1 md:pb-0 no-scrollbar w-full md:w-auto">
                      <button
                        onClick={() => setFilterType('All')}
                        className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${filterType === 'All' ? 'bg-body text-background' : 'text-muted hover:text-body hover:bg-input'
                          }`}
                      >
                        All
                      </button>
                      {Object.values(MediaType).map((type) => (
                        <button
                          key={type}
                          onClick={() => setFilterType(type)}
                          className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all flex items-center gap-2 ${filterType === type ? 'bg-body text-background' : 'text-muted hover:text-body hover:bg-input'
                            }`}
                        >
                          {type === MediaType.Movie && <Film size={14} />}
                          {type === MediaType.TV && <Tv size={14} />}
                          {type === MediaType.Book && <BookOpen size={14} />}
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
                        : isAuthenticated ? "Use the button above to add your first review." : "No reviews have been added yet."}
                    </p>
                    {!reviews.length && isAuthenticated && (
                      <button
                        onClick={() => {
                          setActiveReviewId(null);
                          setView('form');
                          updateUrl(null);
                        }}
                        className="mt-6 text-primary hover:underline font-medium"
                      >
                        Create your first review &rarr;
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {processedReviews.map((review) => (
                      <ReviewCard
                        key={review.id}
                        review={review}
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
