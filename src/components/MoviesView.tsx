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

  const featuredMovie = filteredMovies[0] || movies[0];

  return (
    <div className="text-slate-100">
      {featuredMovie && (
        <section
          className="relative isolate overflow-hidden border-b border-slate-800 bg-slate-950 bg-cover bg-center"
          style={{ backgroundImage: `url(${featuredMovie.backdropUrl || featuredMovie.posterUrl})` }}
        >
          <div className="absolute inset-0 -z-10 bg-gradient-to-l from-[#070b14] via-[#070b14]/90 to-[#070b14]/75" />
          <div className="absolute inset-0 -z-10 bg-gradient-to-t from-[#070b14] via-transparent to-[#070b14]/45" />
          <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 sm:py-16">
            <div className="max-w-2xl">
              <div className="mb-3 flex items-center gap-2 text-xs font-bold text-amber-300">
                <Film className="h-4 w-4" />
                <span>الرئيسية</span><span className="text-slate-500">/</span><span>الأفلام</span>
              </div>
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.22em] text-slate-300">اختيار FLEXJO</p>
              <h1 className="text-3xl font-black leading-tight text-white sm:text-5xl">دليل الأفلام السينمائية</h1>
              <p className="mt-4 line-clamp-2 max-w-xl text-sm leading-7 text-slate-300 sm:text-base">
                {featuredMovie.story || 'اكتشف مجموعة من الأفلام العربية والعالمية المختارة للمشاهدة بجودة عالية.'}
              </p>
              <button onClick={() => onSelectMedia(featuredMovie.id)} className="mt-6 rounded-xl bg-amber-400 px-6 py-3 text-sm font-black text-slate-950 transition hover:bg-amber-300">
                مشاهدة {featuredMovie.title}
              </button>
            </div>
          </div>
        </section>
      )}

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-amber-400 mb-1">
            <Film className="w-4 h-4 text-amber-400" />
            <span>السينما العربية والعالمية · {filteredMovies.length} عمل</span>
          </div>
          <h2 className="text-xl font-black text-white sm:text-2xl">تصفح الأفلام</h2>
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
      </div>
  );
};
