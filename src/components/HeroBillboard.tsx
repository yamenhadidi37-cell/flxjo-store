import React, { useState, useEffect } from 'react';
import { Play, Info, Bookmark, Check, Star, ChevronRight, ChevronLeft } from 'lucide-react';
import { MediaItem, ConsolidatedSeries } from '../types/media';
import { getCategoryLabel } from '../utils/mediaGrouping';

interface HeroBillboardProps {
  featuredItems: (MediaItem | ConsolidatedSeries)[];
  onSelectMedia: (id: string) => void;
  onPlayMedia: (id: string) => void;
  isBookmarked: (id: string) => boolean;
  onToggleBookmark: (item: MediaItem | ConsolidatedSeries) => void;
}

export const HeroBillboard: React.FC<HeroBillboardProps> = ({
  featuredItems,
  onSelectMedia,
  onPlayMedia,
  isBookmarked,
  onToggleBookmark,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (featuredItems.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % featuredItems.length);
    }, 7000);
    return () => clearInterval(interval);
  }, [featuredItems.length]);

  if (!featuredItems || featuredItems.length === 0) return null;

  const currentItem = featuredItems[currentIndex] || featuredItems[0];
  const isConsolidated = 'seasons' in currentItem;
  const isSaved = isBookmarked(currentItem.id);

  return (
    <div className="relative w-full h-[480px] sm:h-[550px] lg:h-[620px] overflow-hidden bg-[#070b14] border-b border-slate-800">
      {/* Backdrop Image with gradient overlay */}
      <div className="absolute inset-0">
        <img
          src={currentItem.backdropUrl || currentItem.posterUrl}
          alt={currentItem.title}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover object-center filter brightness-[0.7] transition-all duration-700 ease-out scale-100"
        />
        {/* Cinematic gradient scrims */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#070b14] via-[#070b14]/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#070b14] via-[#070b14]/70 to-transparent" />
      </div>

      {/* Hero Content Overlay */}
      <div className="relative max-w-7xl mx-auto h-full px-4 sm:px-6 lg:px-8 flex flex-col justify-end pb-12 sm:pb-16 z-10">
        <div className="max-w-2xl space-y-4">
          {/* Tagline / Badges */}
          <div className="flex items-center gap-2.5 text-xs text-amber-300 font-bold">
            <span className="bg-amber-400 text-slate-950 px-2 py-0.5 rounded text-[11px] font-black uppercase tracking-wider">
              {currentItem.type === 'movie' ? 'فيلم حصري' : 'عمل حصري VIP'}
            </span>
            <span aria-hidden="true" className="text-slate-600">·</span>
            <span>{getCategoryLabel(currentItem.category)}</span>
            {currentItem.year && (
              <>
                <span aria-hidden="true" className="text-slate-600">·</span>
                <span className="tabular-nums text-slate-300">{currentItem.year}</span>
              </>
            )}
            {currentItem.rating && (
              <>
                <span aria-hidden="true" className="text-slate-600">·</span>
                <span className="flex items-center gap-1 text-amber-400 font-bold tabular-nums">
                  <Star className="w-3.5 h-3.5 fill-amber-400" />
                  {currentItem.rating}
                </span>
              </>
            )}
          </div>

          {/* Title */}
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight drop-shadow-md">
            {currentItem.title}
          </h1>

          {/* Synopsis */}
          <p className="text-sm sm:text-base text-slate-300 line-clamp-3 leading-relaxed max-w-xl font-normal drop-shadow">
            {currentItem.story ||
              'شاهد أقوى الأعمال الدرامية والسينمائية بجودة فائقة السرعة على منصة FLEXJO VIP مع تجربة مشاهدة استثنائية وسلسة.'}
          </p>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={() => onPlayMedia(currentItem.id)}
              className="px-6 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-sm flex items-center gap-2 shadow-[0_4px_20px_rgba(250,204,21,0.35)] transition-all cursor-pointer whitespace-nowrap active:scale-95"
            >
              <Play className="w-5 h-5 fill-current ml-0.5" />
              <span>مشاهدة الآن</span>
            </button>

            <button
              onClick={() => onSelectMedia(currentItem.id)}
              className="px-5 py-3 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-200 border border-slate-700/80 font-semibold text-sm flex items-center gap-2 backdrop-blur-sm transition-all cursor-pointer whitespace-nowrap active:scale-95"
            >
              <Info className="w-4 h-4 text-amber-400" />
              <span>تفاصيل أكثر</span>
              {isConsolidated && currentItem.seasons.length > 1 && (
                <span className="text-xs text-amber-300 font-medium">({currentItem.seasons.length} أجزاء)</span>
              )}
            </button>

            <button
              onClick={() => onToggleBookmark(currentItem)}
              title={isSaved ? 'إزالة من قائمتي' : 'إضافة إلى قائمتي'}
              className={`p-3 rounded-xl border transition-all cursor-pointer ${
                isSaved
                  ? 'bg-amber-400/20 border-amber-400 text-amber-300'
                  : 'bg-slate-900/80 border-slate-700/80 text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              {isSaved ? <Check className="w-5 h-5" /> : <Bookmark className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Carousel Slide Indicators & Controls */}
        <div className="absolute bottom-6 left-6 sm:left-8 flex items-center gap-3 z-20" dir="ltr">
          <button
            onClick={() =>
              setCurrentIndex((prev) => (prev - 1 + featuredItems.length) % featuredItems.length)
            }
            className="w-8 h-8 rounded-full bg-slate-900/80 border border-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-1.5">
            {featuredItems.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  currentIndex === idx ? 'w-6 bg-amber-400' : 'w-2 bg-slate-600 hover:bg-slate-400'
                }`}
              />
            ))}
          </div>

          <button
            onClick={() => setCurrentIndex((prev) => (prev + 1) % featuredItems.length)}
            className="w-8 h-8 rounded-full bg-slate-900/80 border border-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
