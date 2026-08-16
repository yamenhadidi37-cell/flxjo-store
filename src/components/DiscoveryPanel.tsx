import React from 'react';
import { Filter, SlidersHorizontal, Star, Sparkles } from 'lucide-react';

export type DiscoveryFilters = {
  type: 'all' | 'movie' | 'tv';
  year: string;
  minRating: number;
  sort: 'relevance' | 'rating' | 'latest' | 'popularity';
};

interface DiscoveryPanelProps {
  filters: DiscoveryFilters;
  onChange: (filters: DiscoveryFilters) => void;
  lang: 'ar' | 'en';
  resultCount?: number;
}

export default function DiscoveryPanel({ filters, onChange, lang, resultCount }: DiscoveryPanelProps) {
  const isEn = lang === 'en';
  const update = (patch: Partial<DiscoveryFilters>) => onChange({ ...filters, ...patch });

  return (
    <section className="flxjo-surface rounded-[1.6rem] p-4 sm:p-5 space-y-4" aria-label={isEn ? 'Discovery filters' : 'فلاتر الاستكشاف'}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-red-600/10 text-red-500"><SlidersHorizontal className="w-4 h-4" /></div>
          <div>
            <h3 className="font-black text-sm">{isEn ? 'Discovery controls' : 'أدوات الاستكشاف'}</h3>
            <p className="text-[11px] text-zinc-500">{isEn ? 'Tune the catalog to your mood in one click.' : 'زبط النتائج على مزاجك بكبسة وحدة.'}</p>
          </div>
        </div>
        {typeof resultCount === 'number' && (
          <span className="text-[10px] font-mono text-zinc-500 bg-zinc-950/50 border border-zinc-800 rounded-lg px-2.5 py-1.5">
            {isEn ? `${resultCount} results` : `${resultCount} نتيجة`}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
        <label className="text-[10px] text-zinc-500 space-y-1.5">
          <span className="flex items-center gap-1"><Filter className="w-3 h-3" />{isEn ? 'Type' : 'النوع'}</span>
          <select value={filters.type} onChange={(e) => update({ type: e.target.value as DiscoveryFilters['type'] })} className="w-full bg-zinc-950/70 border border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-red-600">
            <option value="all">{isEn ? 'All titles' : 'الكل'}</option>
            <option value="movie">{isEn ? 'Movies' : 'أفلام'}</option>
            <option value="tv">{isEn ? 'Series' : 'مسلسلات'}</option>
          </select>
        </label>

        <label className="text-[10px] text-zinc-500 space-y-1.5">
          <span>{isEn ? 'Release year' : 'سنة الإصدار'}</span>
          <select value={filters.year} onChange={(e) => update({ year: e.target.value })} className="w-full bg-zinc-950/70 border border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-red-600">
            <option value="all">{isEn ? 'Any year' : 'أي سنة'}</option>
            {[2026, 2025, 2024, 2023, 2022, 2021, 2020, 2010].map((year) => <option key={year} value={year}>{year}{year === 2010 ? '+' : ''}</option>)}
          </select>
        </label>

        <label className="text-[10px] text-zinc-500 space-y-1.5">
          <span className="flex items-center gap-1"><Star className="w-3 h-3" />{isEn ? 'Minimum rating' : 'أقل تقييم'}</span>
          <select value={filters.minRating} onChange={(e) => update({ minRating: Number(e.target.value) })} className="w-full bg-zinc-950/70 border border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-red-600">
            {[0, 6, 7, 8, 9].map((rating) => <option key={rating} value={rating}>{rating === 0 ? (isEn ? 'Any rating' : 'أي تقييم') : `${rating}.0+`}</option>)}
          </select>
        </label>

        <label className="text-[10px] text-zinc-500 space-y-1.5">
          <span>{isEn ? 'Sort by' : 'ترتيب حسب'}</span>
          <select value={filters.sort} onChange={(e) => update({ sort: e.target.value as DiscoveryFilters['sort'] })} className="w-full bg-zinc-950/70 border border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-red-600">
            <option value="relevance">{isEn ? 'Relevance' : 'الصلة'}</option>
            <option value="rating">{isEn ? 'Top rated' : 'الأعلى تقييماً'}</option>
            <option value="latest">{isEn ? 'Latest first' : 'الأحدث أولاً'}</option>
            <option value="popularity">{isEn ? 'Most popular' : 'الأكثر شعبية'}</option>
          </select>
        </label>
      </div>

      <div className="flex items-center gap-2 text-[10px] text-zinc-500">
        <Sparkles className="w-3.5 h-3.5 text-red-500" />
        <span>{isEn ? 'Filters run instantly in your browser, so browsing stays fast.' : 'الفلاتر بتشتغل فورياً عندك، عشان يظل التصفح سريع.'}</span>
      </div>
    </section>
  );
}
