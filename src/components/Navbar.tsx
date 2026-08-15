import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Search, Film, Tv, Sparkles, Clock, Compass, 
  Globe, Heart, Star, X, Loader2, TrendingUp, ArrowRight, CornerDownLeft 
} from 'lucide-react';
import { getAlgorithmState } from '../lib/algorithm';
import { getTranslations } from '../translations';
import { getFastSuggestions, getPosterUrl } from '../lib/tmdb';
import { slugify } from '../lib/slugify';
import { MediaItem } from '../types';

interface NavbarProps {
  onSearch: (query: string) => void;
  searchQuery?: string;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenAlgo: () => void;
  preferenceTrigger: number;
  lang: 'ar' | 'en';
  onLanguageChange: (lang: 'ar' | 'en') => void;
}

export default function Navbar({ 
  onSearch, 
  searchQuery = '',
  activeTab, 
  setActiveTab, 
  preferenceTrigger,
  lang,
  onLanguageChange
}: NavbarProps) {
  const navigate = useNavigate();
  const [searchVal, setSearchVal] = useState(searchQuery);
  const [suggestions, setSuggestions] = useState<MediaItem[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const [, setLikesCount] = useState(0);

  const searchContainerRef = useRef<HTMLDivElement>(null);
  const mobileSearchRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const t = getTranslations(lang);

  const trendingTags = lang === 'ar' 
    ? ['سبايدرمان', 'ون بيس', 'هجوم العمالقة', 'افلام 2026', 'Stranger Things', 'بريكنج باد']
    : ['Spider-Man', 'One Piece', 'Attack on Titan', 'Movies 2026', 'Stranger Things', 'Breaking Bad'];

  useEffect(() => {
    setSearchVal(searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    const state = getAlgorithmState();
    setLikesCount(state.likedIds.length + state.dislikedIds.length + state.watchedIds.length);
  }, [preferenceTrigger]);

  // Click outside to dismiss dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchContainerRef.current && 
        !searchContainerRef.current.contains(event.target as Node) &&
        mobileSearchRef.current &&
        !mobileSearchRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Fetch fast suggestions when typing
  const fetchSuggestions = useCallback((query: string) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      setLoadingSuggestions(false);
      return;
    }

    setLoadingSuggestions(true);
    debounceTimerRef.current = setTimeout(async () => {
      try {
        const results = await getFastSuggestions(trimmed, 6);
        setSuggestions(results);
        setSelectedIndex(-1);
      } catch (err) {
        setSuggestions([]);
      } finally {
        setLoadingSuggestions(false);
      }
    }, 220);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchVal(val);
    setShowDropdown(true);
    fetchSuggestions(val);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedIndex >= 0 && suggestions[selectedIndex]) {
      handleSelectMedia(suggestions[selectedIndex]);
      return;
    }
    setShowDropdown(false);
    onSearch(searchVal);
  };

  const handleSelectMedia = (item: MediaItem) => {
    setShowDropdown(false);
    setSearchVal('');
    onSearch('');
    const mediaType = item.media_type === 'tv' ? 'tv' : 'movie';
    const slug = slugify(item.title || item.name);
    navigate(`/${mediaType}/${item.id}/${slug}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
    }
  };

  const handleClear = () => {
    setSearchVal('');
    setSuggestions([]);
    setShowDropdown(false);
    onSearch('');
  };

  return (
    <header className="sticky top-0 z-40 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-900 w-full" dir={lang === 'en' ? 'ltr' : 'rtl'}>
      <div className="max-w-none px-4 md:px-12 lg:px-16 h-16 sm:h-20 flex items-center justify-between gap-4">
        
        {/* Brand Logo & Title */}
        <div className="flex items-center gap-8 shrink-0">
          <Link 
            to="/home"
            onClick={() => {
              setSearchVal('');
              onSearch('');
              setActiveTab('home');
              setShowDropdown(false);
            }}
            className="flex items-center gap-2 cursor-pointer group"
          >
            {/* Elegant Red & Black icon */}
            <div className="w-9 h-9 sm:w-10 sm:h-10 bg-gradient-to-br from-red-600 to-black rounded-xl flex items-center justify-center border border-red-500/30 group-hover:rotate-6 transition-all duration-300">
              <span className="text-white font-black text-lg sm:text-xl tracking-tight select-none">F</span>
            </div>
            
            <div className="flex flex-col">
              <span className="text-base sm:text-xl font-black tracking-tight text-white group-hover:text-red-500 transition-colors">{t.logoText}</span>
              <span className="text-[9px] sm:text-[10px] font-mono font-extrabold text-red-600 tracking-wider">FLXJO</span>
            </div>
          </Link>
          
          {/* Desktop Navigation Menu */}
          <nav className="hidden lg:flex items-center gap-1.5 text-sm">
            {[
              { id: 'home', path: '/home', label: t.tabHome, icon: Compass },
              { id: 'movie', path: '/movie', label: t.tabMovies, icon: Film },
              { id: 'tv', path: '/tv', label: t.tabTv, icon: Tv },
              { id: 'anime', path: '/anime', label: t.tabAnime, icon: Sparkles },
              { id: 'favorites', path: '/favorites', label: t.tabFavorites || (lang === 'en' ? 'Favorites' : 'المفضلة'), icon: Heart },
              { id: 'history', path: '/history', label: t.tabHistory, icon: Clock },
          
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <Link
                  key={tab.id}
                  to={tab.path}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setSearchVal('');
                    onSearch('');
                    setShowDropdown(false);
                  }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all font-medium text-xs ${
                    isActive
                      ? 'bg-red-600/10 text-red-500 border border-red-600/20 shadow-md shadow-red-950/20'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-900/60'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Smart Search Input Box (Desktop) with Live Suggestions Dropdown */}
        <div ref={searchContainerRef} className="flex-grow max-w-md hidden sm:block relative">
          <form onSubmit={handleFormSubmit} className="relative group">
            <input
              type="text"
              value={searchVal}
              onChange={handleInputChange}
              onFocus={() => setShowDropdown(true)}
              onKeyDown={handleKeyDown}
              placeholder={t.searchPlaceholder}
              className={`w-full bg-zinc-900/90 hover:bg-zinc-900 border border-zinc-800 focus:border-red-600 focus:ring-2 focus:ring-red-600/20 text-white rounded-2xl py-2.5 text-xs focus:outline-none transition-all placeholder-zinc-500 shadow-inner ${
                lang === 'en' ? 'pl-11 pr-10' : 'pr-11 pl-10'
              }`}
            />
            <Search className={`w-4 h-4 transition-colors duration-300 absolute top-3.5 pointer-events-none ${
              lang === 'en' ? 'left-4' : 'right-4'
            } text-zinc-500 group-focus-within:text-red-500`} />

            {/* Clear button or loading indicator */}
            <div className={`absolute top-2.5 ${lang === 'en' ? 'right-3' : 'left-3'} flex items-center gap-1.5`}>
              {loadingSuggestions && (
                <Loader2 className="w-4 h-4 text-red-500 animate-spin" />
              )}
              {searchVal && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="p-1 hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-white transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </form>

          {/* Instant Search Suggestions Popover */}
          {showDropdown && (
            <div className="absolute top-full mt-2 left-0 right-0 bg-zinc-950/95 backdrop-blur-xl border border-zinc-800/90 rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
              
              {/* If query has suggestions */}
              {suggestions.length > 0 ? (
                <div className="p-2 space-y-1">
                  <div className="px-3 py-1.5 flex items-center justify-between text-[11px] font-bold text-zinc-400 border-b border-zinc-900/80">
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3 text-red-500" />
                      <span>{lang === 'en' ? 'Top Instant Matches' : 'أفضل النتائج الفورية'}</span>
                    </span>
                    <span className="text-[10px] text-zinc-500 font-mono">
                      {lang === 'en' ? 'Press ↵ to open' : 'اضغط ↵ للفتح'}
                    </span>
                  </div>

                  {suggestions.map((item, idx) => {
                    const isSelected = selectedIndex === idx;
                    const isMovie = item.media_type === 'movie' || (!item.media_type && item.title);
                    const title = item.title || item.name || '';
                    const year = (item.release_date || item.first_air_date || '').substring(0, 4);
                    const poster = item.poster_path ? getPosterUrl(item.poster_path, 'w92') : null;

                    return (
                      <div
                        key={`${item.id}-${idx}`}
                        onClick={() => handleSelectMedia(item)}
                        className={`flex items-center gap-3 p-2 rounded-xl cursor-pointer transition-all ${
                          isSelected ? 'bg-red-600/20 border border-red-600/30 text-white' : 'hover:bg-zinc-900/80 text-zinc-200'
                        }`}
                      >
                        {/* Poster thumbnail */}
                        <div className="w-9 h-13 rounded-lg overflow-hidden bg-zinc-900 shrink-0 border border-zinc-800 flex items-center justify-center">
                          {poster ? (
                            <img src={poster} alt={title} className="w-full h-full object-cover" />
                          ) : (
                            <Film className="w-4 h-4 text-zinc-600" />
                          )}
                        </div>

                        {/* Title & Metadata */}
                        <div className="flex-grow min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs truncate">{title}</span>
                            <span className="text-[9px] px-1.5 py-0.5 rounded font-mono font-extrabold shrink-0 bg-zinc-800 text-zinc-300">
                              {isMovie ? (lang === 'en' ? 'MOVIE' : 'فيلم') : (lang === 'en' ? 'TV' : 'مسلسل')}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-2 text-[11px] text-zinc-400 mt-0.5">
                            {year && <span>{year}</span>}
                            {item.vote_average ? (
                              <span className="flex items-center gap-0.5 text-amber-400 font-bold">
                                <Star className="w-3 h-3 fill-amber-400" />
                                <span>{item.vote_average.toFixed(1)}</span>
                              </span>
                            ) : null}
                            {item.original_title && item.original_title !== title && (
                              <span className="truncate text-zinc-500 text-[10px]">({item.original_title})</span>
                            )}
                          </div>
                        </div>

                        <CornerDownLeft className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
                      </div>
                    );
                  })}

                  {/* View All Search Results Action */}
                  <button
                    type="button"
                    onClick={() => {
                      setShowDropdown(false);
                      onSearch(searchVal);
                    }}
                    className="w-full mt-1.5 py-2 px-3 bg-zinc-900/90 hover:bg-red-600/20 hover:text-red-400 rounded-xl text-xs font-bold text-zinc-300 flex items-center justify-center gap-2 transition-all border border-zinc-800"
                  >
                    <span>{lang === 'en' ? `View all results for "${searchVal}"` : `عرض كافة النتائج لـ "${searchVal}"`}</span>
                    <ArrowRight className={`w-3.5 h-3.5 ${lang === 'ar' ? 'rotate-180' : ''}`} />
                  </button>
                </div>
              ) : searchVal.trim().length >= 2 ? (
                /* No suggestions found */
                <div className="p-4 text-center space-y-2">
                  <p className="text-xs text-zinc-400">
                    {lang === 'en' ? `No instant matches for "${searchVal}"` : `لا توجد نتائج فورية لـ "${searchVal}"`}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setShowDropdown(false);
                      onSearch(searchVal);
                    }}
                    className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition-all"
                  >
                    {lang === 'en' ? 'Search Full TMDB Catalog' : 'البحث في كامل مكتبة الأفلام'}
                  </button>
                </div>
              ) : (
                /* Empty state with trending tags */
                <div className="p-4 space-y-2.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-400">
                    <TrendingUp className="w-3.5 h-3.5 text-red-500" />
                    <span>{lang === 'en' ? 'Trending Searches' : 'أكثر عمليات البحث رواجاً'}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {trendingTags.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => {
                          setSearchVal(tag);
                          setShowDropdown(false);
                          onSearch(tag);
                        }}
                        className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 hover:text-red-400 border border-zinc-800 rounded-lg text-[11px] text-zinc-300 font-medium transition-all"
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}
        </div>

        {/* Right side controls (Language switch) */}
        <div className="flex items-center gap-2 md:gap-3">
          <button
            onClick={() => onLanguageChange(lang === 'ar' ? 'en' : 'ar')}
            className="flex items-center gap-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 hover:border-zinc-700 px-2.5 sm:px-3 py-2 sm:py-2.5 rounded-2xl transition duration-300 text-xs font-bold"
          >
            <Globe className="w-3.5 h-3.5 text-zinc-400" />
            <span className="font-mono tracking-wide">{lang === 'ar' ? 'EN' : 'عربي'}</span>
          </button>
        </div>

      </div>

      {/* Mobile Sticky Bottom Navigation Bar (High-end native phone experience) */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-zinc-950/95 backdrop-blur-md border-t border-zinc-900 flex items-center justify-around h-16 shadow-[0_-10px_30px_rgba(0,0,0,0.9)] pb-safe px-2">
        {[
          { id: 'home', path: '/home', label: t.tabHome, icon: Compass },
          { id: 'movie', path: '/movie', label: lang === 'en' ? 'Movies' : 'أفلام', icon: Film },
          { id: 'tv', path: '/tv', label: lang === 'en' ? 'TV' : 'مسلسلات', icon: Tv },
          { id: 'favorites', path: '/favorites', label: t.tabFavorites || (lang === 'en' ? 'Favorites' : 'المفضلة'), icon: Heart },
          { id: 'search', path: '/search', label: lang === 'en' ? 'Search' : 'البحث', icon: Search },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <Link
              key={tab.id}
              to={tab.path}
              onClick={() => {
                setActiveTab(tab.id);
                if (tab.id !== 'search') {
                  setSearchVal('');
                  onSearch('');
                }
              }}
              className={`flex flex-col items-center justify-center gap-1 w-full h-full transition-all ${
                isActive ? 'text-red-500 font-bold scale-105' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <Icon className="w-4.5 h-4.5" />
              <span className="text-[9px] tracking-wide mt-0.5">{tab.label}</span>
            </Link>
          );
        })}
      </div>

      {/* Mobile search input with suggestions */}
      <div ref={mobileSearchRef} className="sm:hidden px-4 py-2 border-t border-zinc-900 bg-zinc-950 relative">
        <form onSubmit={handleFormSubmit} className="relative group">
          <input
            type="text"
            value={searchVal}
            onChange={handleInputChange}
            onFocus={() => setShowDropdown(true)}
            placeholder={t.searchPlaceholder}
            className={`w-full bg-zinc-900 border border-zinc-800 focus:border-red-600 focus:ring-2 focus:ring-red-600/20 text-white rounded-xl py-2.5 text-[11px] focus:outline-none transition-all placeholder-zinc-500 shadow-inner ${
              lang === 'en' ? 'pl-9 pr-9' : 'pr-9 pl-9'
            }`}
          />
          <Search className={`w-3.5 h-3.5 transition-colors duration-300 absolute top-3.5 pointer-events-none ${
            lang === 'en' ? 'left-3' : 'right-3'
          } text-zinc-500 group-focus-within:text-red-500`} />

          {searchVal && (
            <button
              type="button"
              onClick={handleClear}
              className={`absolute top-2.5 ${lang === 'en' ? 'right-3' : 'left-3'} p-1 text-zinc-400`}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </form>

        {showDropdown && suggestions.length > 0 && (
          <div className="absolute top-full left-4 right-4 mt-1 bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl p-2 z-50 max-h-72 overflow-y-auto space-y-1">
            {suggestions.map((item, idx) => (
              <div
                key={`mob-${item.id}-${idx}`}
                onClick={() => handleSelectMedia(item)}
                className="flex items-center gap-2.5 p-1.5 rounded-lg hover:bg-zinc-900 cursor-pointer"
              >
                <div className="w-7 h-10 rounded bg-zinc-900 shrink-0 overflow-hidden border border-zinc-800">
                  {item.poster_path ? (
                    <img src={getPosterUrl(item.poster_path, 'w92')} alt={item.title || item.name} className="w-full h-full object-cover" />
                  ) : (
                    <Film className="w-3 h-3 text-zinc-600 m-auto mt-3.5" />
                  )}
                </div>
                <div className="flex-grow min-w-0 text-left" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
                  <div className="text-[11px] font-bold text-white truncate">{item.title || item.name}</div>
                  <div className="text-[9px] text-zinc-400 flex items-center gap-1.5">
                    <span>{(item.release_date || item.first_air_date || '').substring(0, 4)}</span>
                    {item.vote_average ? <span className="text-amber-400 font-bold">★ {item.vote_average.toFixed(1)}</span> : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </header>
  );
}


