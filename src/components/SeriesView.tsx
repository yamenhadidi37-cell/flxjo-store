import React, { useState, useMemo } from 'react';
import { Tv, Layers } from 'lucide-react';
import { ConsolidatedSeries, MediaItem } from '../types/media';
import { MediaCard } from './MediaCard';
import { getCategoryLabel } from '../utils/mediaGrouping';

interface SeriesViewProps {
  series: (ConsolidatedSeries | MediaItem)[];
  onSelectMedia: (id: string) => void;
  searchQuery: string;
}

export const SeriesView: React.FC<SeriesViewProps> = ({
  series,
  onSelectMedia,
  searchQuery,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'rating' | 'year' | 'episodes'>('rating');

  const categories = useMemo(() => {
    const set = new Set<string>();
    series.forEach((s) => {
      if (s.category) set.add(s.category);
    });
    return Array.from(set);
  }, [series]);

  const filteredSeries = useMemo(() => {
    return series
      .filter((s) => {
        if (selectedCategory !== 'all' && s.category !== selectedCategory) {
          return false;
        }
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          return (
            s.title.toLowerCase().includes(q) ||
            (s.story && s.story.toLowerCase().includes(q))
          );
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'rating') return (Number(b.rating) || 0) - (Number(a.rating) || 0);
        if (sortBy === 'year') return (Number(b.year) || 0) - (Number(a.year) || 0);
        if (sortBy === 'episodes') {
          const epA = 'totalEpisodesCount' in a ? a.totalEpisodesCount : a.episodes?.length || 0;
          const epB = 'totalEpisodesCount' in b ? b.totalEpisodesCount : b.episodes?.length || 0;
          return epB - epA;
        }
        return 0;
      });
  }, [series, selectedCategory, sortBy, searchQuery]);

  const featuredSeries = filteredSeries[0] || series[0];

  return (
    <div className="text-slate-100">
      {featuredSeries && (
        <section
          className="relative isolate overflow-hidden border-b border-slate-800 bg-slate-950 bg-cover bg-center"
          style={{ backgroundImage: `url(${featuredSeries.backdropUrl || featuredSeries.posterUrl})` }}
        >
          <div className="absolute inset-0 -z-10 bg-gradient-to-l from-[#070b14] via-[#070b14]/90 to-[#070b14]/75" />
          <div className="absolute inset-0 -z-10 bg-gradient-to-t from-[#070b14] via-transparent to-[#070b14]/45" />
          <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 sm:py-16">
            <div className="max-w-2xl">
              <div className="mb-3 flex items-center gap-2 text-xs font-bold text-amber-300">
                <Tv className="h-4 w-4" />
                <span>الرئيسية</span><span className="text-slate-500">/</span><span>المسلسلات</span>
              </div>
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.22em] text-slate-300">اختيار FLEXJO</p>
              <h1 className="text-3xl font-black leading-tight text-white sm:text-5xl">دليل المسلسلات ومواسم العرض</h1>
              <p className="mt-4 line-clamp-2 max-w-xl text-sm leading-7 text-slate-300 sm:text-base">
                {featuredSeries.story || 'تابع أحدث المسلسلات والمواسم والحلقات في واجهة مشاهدة مرتبة وسهلة.'}
              </p>
              <button onClick={() => onSelectMedia(featuredSeries.id)} className="mt-6 rounded-xl bg-amber-400 px-6 py-3 text-sm font-black text-slate-950 transition hover:bg-amber-300">
                مشاهدة {featuredSeries.title}
              </button>
            </div>
          </div>
        </section>
      )}

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-amber-400 mb-1">
            <Tv className="w-4 h-4 text-amber-400" />
            <span>الدراما التلفزيونية والأنمي · {filteredSeries.length} عمل</span>
          </div>
          <h2 className="text-xl font-black text-white sm:text-2xl">تصفح المسلسلات</h2>
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
            <option value="episodes">الأكثر حلقات</option>
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
          جميع المسلسلات ({series.length})
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

      {/* Series Grid */}
      {filteredSeries.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {filteredSeries.map((s) => (
            <MediaCard
              key={s.id}
              item={s}
              onClick={() => onSelectMedia(s.id)}
            />
          ))}
        </div>
      ) : (
        <div className="p-16 text-center bg-[#0b1021] rounded-2xl border border-slate-800 text-slate-400">
          لا توجد مسلسلات تطابق معايير البحث المحددة.
        </div>
      )}
      </div>
      </div>
  );
};
