import React, { useState, useMemo } from 'react';
import { Film, Filter, SlidersHorizontal, Sparkles } from 'lucide-react';
import { MediaItem } from '../types/media';
import { MediaCard } from './MediaCard';
import { getCategoryLabel } from '../utils/mediaGrouping';

interface MoviesViewProps {
  movies: MediaItem[];
  onSelectMedia: (id: string) => void;
  searchQuery: string;
}

export const MoviesView: React.FC<MoviesViewProps> = ({
  movies,
  onSelectMedia,
  searchQuery,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'rating' | 'year' | 'views'>('rating');

  const categories = useMemo(() => {
    const set = new Set<string>();
    movies.forEach((m) => {
      if (m.category) set.add(m.category);
    });
    return Array.from(set);
  }, [movies]);

  const filteredMovies = useMemo(() => {
    return movies
      .filter((m) => {
        if (selectedCategory !== 'all' && m.category !== selectedCategory) {
          return false;
        }
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          return (
            m.title.toLowerCase().includes(q) ||
            (m.story && m.story.toLowerCase().includes(q)) ||
            (m.cast && m.cast.some((c) => c.toLowerCase().includes(q)))
          );
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'rating') return (Number(b.rating) || 0) - (Number(a.rating) || 0);
        if (sortBy === 'year') return (Number(b.year) || 0) - (Number(a.year) || 0);
        if (sortBy === 'views') return (b.views || 0) - (a.views || 0);
        return 0;
      });
  }, [movies, selectedCategory, sortBy, searchQuery]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 text-slate-100">
      {/* Title */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-amber-400 mb-1">
            <Film className="w-4 h-4 text-amber-400" />
            <span>السينما العربية والعالمية</span>
          </div>
          <h1 className="text-3xl font-black text-white">دليل الأفلام السينمائية</h1>
        </div>

        {/* Sort selector */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400 font-medium">الترتيب حسب:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-slate-900 border border-slate-800 text-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-amber-400 cursor-pointer"
          >
            <option value="rating">الأعلى تقييماً</option>
            <option value="year">الأحدث سنة</option>
            <option value="views">الأكثر مشاهدة</option>
          </select>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-3 mb-8">
        <button
          onClick={() => setSelectedCategory('all')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            selectedCategory === 'all'
              ? 'bg-amber-400 text-slate-950 shadow-md'
              : 'bg-slate-900 border border-slate-800 text-slate-300 hover:border-slate-700'
          }`}
        >
          جميع الأفلام ({movies.length})
        </button>

        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              selectedCategory === cat
                ? 'bg-amber-400 text-slate-950 shadow-md'
                : 'bg-slate-900 border border-slate-800 text-slate-300 hover:border-slate-700'
            }`}
          >
            {getCategoryLabel(cat)}
          </button>
        ))}
      </div>

      {/* Movies Grid */}
      {filteredMovies.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {filteredMovies.map((movie) => (
            <MediaCard
              key={movie.id}
              item={movie}
              onClick={() => onSelectMedia(movie.id)}
            />
          ))}
        </div>
      ) : (
        <div className="p-16 text-center bg-[#0b1021] rounded-2xl border border-slate-800 text-slate-400">
          لا توجد أفلام تطابق معايير البحث المحددة.
        </div>
      )}
    </div>
  );
};
