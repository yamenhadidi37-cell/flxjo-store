import React, { useState, useEffect } from 'react';
import {
  ArrowRight,
  Play,
  Star,
  Bookmark,
  Check,
  Calendar,
  Layers,
  Film,
  Tv,
  Share2,
  Sparkles,
  ChevronLeft,
} from 'lucide-react';
import { MediaItem, ConsolidatedSeries, Episode } from '../types/media';
import { getCategoryLabel } from '../utils/mediaGrouping';

interface MediaDetailsViewProps {
  media: MediaItem | ConsolidatedSeries;
  onBack: () => void;
  onPlayEpisode: (epIndex: number, seasonIndex: number) => void;
  onPlayMovie: () => void;
  isBookmarked: boolean;
  onToggleBookmark: () => void;
  onSelectRelated: (id: string) => void;
  allMedia: (MediaItem | ConsolidatedSeries)[];
}

export const MediaDetailsView: React.FC<MediaDetailsViewProps> = ({
  media,
  onBack,
  onPlayEpisode,
  onPlayMovie,
  isBookmarked,
  onToggleBookmark,
  onSelectRelated,
  allMedia,
}) => {
  const [selectedSeasonIndex, setSelectedSeasonIndex] = useState(0);
  const [copiedLink, setCopiedLink] = useState(false);

  const isConsolidated = 'seasons' in media;
  const isMovie = media.type === 'movie';

  // Inject Schema.org Structured Data (JSON-LD) for SEO
  useEffect(() => {
    const scriptId = 'schema-media-jsonld';
    let script = document.getElementById(scriptId) as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.type = 'application/ld+json';
      document.head.appendChild(script);
    }

    const structuredData = isMovie
      ? {
          '@context': 'https://schema.org',
          '@type': 'Movie',
          name: media.title,
          description: media.story,
          image: media.posterUrl,
          datePublished: media.year?.toString() || '2024',
          aggregateRating: media.rating
            ? {
                '@type': 'AggregateRating',
                ratingValue: media.rating,
                bestRating: '10',
                ratingCount: '150',
              }
            : undefined,
        }
      : {
          '@context': 'https://schema.org',
          '@type': 'TVSeries',
          name: media.title,
          description: media.story,
          image: media.posterUrl,
          numberOfSeasons: isConsolidated ? media.seasons.length : 1,
          numberOfEpisodes: isConsolidated
            ? media.totalEpisodesCount
            : media.episodes?.length || 0,
        };

    script.textContent = JSON.stringify(structuredData);

    return () => {
      const el = document.getElementById(scriptId);
      if (el) el.remove();
    };
  }, [media, isConsolidated, isMovie]);

  // Current active season episodes
  const currentSeason = isConsolidated
    ? media.seasons[selectedSeasonIndex] || media.seasons[0]
    : null;
  const currentEpisodes: Episode[] = isConsolidated
    ? currentSeason?.episodes || []
    : media.episodes || [];

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  // Find related works in same category
  const relatedItems = allMedia
    .filter((m) => m.id !== media.id && m.category === media.category)
    .slice(0, 6);

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 pb-20">
      {/* Top Breadcrumb Bar */}
      <div className="bg-[#0b1021]/80 backdrop-blur border-b border-slate-800 px-4 sm:px-8 py-3 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-amber-400 hover:text-amber-300 font-bold cursor-pointer"
          >
            <ArrowRight className="w-4 h-4 ml-1" />
            <span>الرئيسية</span>
          </button>
          <span className="text-slate-600">/</span>
          <span>{isMovie ? 'أفلام' : 'مسلسلات'}</span>
          <span className="text-slate-600">/</span>
          <span className="text-slate-200 font-medium truncate max-w-xs">{media.title}</span>
        </div>

        <button
          onClick={handleShare}
          className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-slate-800/80 hover:bg-slate-700 text-slate-200 font-semibold cursor-pointer transition-colors"
        >
          {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5 text-amber-400" />}
          <span>{copiedLink ? 'تم نسخ الرابط' : 'مشاركة العمل'}</span>
        </button>
      </div>

      {/* Hero Header with Backdrop */}
      <div className="relative w-full overflow-hidden bg-slate-950 border-b border-slate-800/80">
        <div className="absolute inset-0">
          <img
            src={media.backdropUrl || media.posterUrl}
            alt={media.title}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover object-top opacity-30 filter blur-xs"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#070b14] via-[#070b14]/80 to-transparent" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 flex flex-col md:flex-row gap-8 items-start">
          {/* Poster Box */}
          <div className="shrink-0 w-52 sm:w-64 aspect-[2/3] rounded-2xl overflow-hidden shadow-2xl border-2 border-slate-800/90 bg-slate-900 mx-auto md:mx-0">
            <img
              src={media.posterUrl}
              alt={media.title}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          </div>

          {/* Details & Information */}
          <div className="flex-1 space-y-4">
            {/* Badges & Meta */}
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-300">
              <span className="bg-amber-400 text-slate-950 px-2.5 py-0.5 rounded font-black text-[11px] tracking-wide">
                {isMovie ? 'فيلم سينمائي' : 'مسلسل حصري'}
              </span>
              <span aria-hidden="true" className="text-slate-600">·</span>
              <span className="text-amber-300">{getCategoryLabel(media.category)}</span>
              {media.year && (
                <>
                  <span aria-hidden="true" className="text-slate-600">·</span>
                  <span className="tabular-nums">{media.year}</span>
                </>
              )}
              {media.quality && (
                <>
                  <span aria-hidden="true" className="text-slate-600">·</span>
                  <span className="text-amber-400">{media.quality}</span>
                </>
              )}
              {isConsolidated && media.seasons.length > 1 && (
                <>
                  <span aria-hidden="true" className="text-slate-600">·</span>
                  <span className="text-slate-300 font-bold">{media.seasons.length} أجزاء</span>
                </>
              )}
            </div>

            {/* Main Title */}
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight">
              {media.title}
            </h1>

            {/* Rating & Stats */}
            <div className="flex items-center gap-4 text-sm font-semibold">
              {media.rating && (
                <div className="flex items-center gap-1.5 text-amber-400 font-black tabular-nums text-base">
                  <Star className="w-5 h-5 fill-amber-400" />
                  <span>{media.rating}</span>
                  <span className="text-xs text-slate-400 font-normal">/ 10</span>
                </div>
              )}
              {media.views && (
                <span className="text-xs text-slate-400 tabular-nums">
                  {media.views.toLocaleString()} مشاهدة
                </span>
              )}
            </div>

            {/* Story Synopsis */}
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed max-w-3xl font-normal pt-1">
              {media.story ||
                'تدور أحداث هذا العمل المتميز في قالب درامي وتشويقي مثير، يأخذ المشاهد في رحلة فريدة تجمع بين الإثارة والمشاعر الإنسانية العميقة.'}
            </p>

            {/* Cast if available */}
            {media.cast && media.cast.length > 0 && (
              <div className="pt-2">
                <span className="text-xs font-bold text-slate-400 block mb-1">طاقم العمل والبطولة:</span>
                <p className="text-xs text-slate-200 font-medium">
                  {media.cast.join(' · ')}
                </p>
              </div>
            )}

            {/* Call to Actions */}
            <div className="flex flex-wrap items-center gap-3 pt-4">
              {isMovie ? (
                <button
                  onClick={onPlayMovie}
                  className="px-7 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-sm flex items-center gap-2 shadow-[0_4px_20px_rgba(250,204,21,0.35)] transition-all cursor-pointer whitespace-nowrap active:scale-95"
                >
                  <Play className="w-5 h-5 fill-current ml-0.5" />
                  <span>مشاهدة الفيلم الآن</span>
                </button>
              ) : (
                <button
                  onClick={() => onPlayEpisode(0, selectedSeasonIndex)}
                  className="px-7 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-sm flex items-center gap-2 shadow-[0_4px_20px_rgba(250,204,21,0.35)] transition-all cursor-pointer whitespace-nowrap active:scale-95"
                >
                  <Play className="w-5 h-5 fill-current ml-0.5" />
                  <span>بدء مشاهدة الحلقة 1</span>
                </button>
              )}

              <button
                onClick={onToggleBookmark}
                className={`px-5 py-3 rounded-xl border text-sm font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                  isBookmarked
                    ? 'bg-amber-400/20 border-amber-400 text-amber-300'
                    : 'bg-slate-900 border-slate-700 text-slate-200 hover:bg-slate-800'
                }`}
              >
                {isBookmarked ? <Check className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
                <span>{isBookmarked ? 'في قائمتي المفضلة' : 'إضافة للقائمة'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area: Episodes Section if TV Show */}
      {!isMovie && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10">
          {/* Magic Season Linking Tabs */}
          {isConsolidated && media.seasons.length > 1 && (
            <div className="mb-6">
              <span className="text-xs font-bold text-slate-400 block mb-2">اختر الموسم أو الجزء:</span>
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2">
                {media.seasons.map((season, sIdx) => {
                  const isActive = selectedSeasonIndex === sIdx;
                  return (
                    <button
                      key={sIdx}
                      onClick={() => setSelectedSeasonIndex(sIdx)}
                      className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
                        isActive
                          ? 'bg-amber-400 text-slate-950 shadow-md'
                          : 'bg-slate-900 border border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <Layers className="w-4 h-4" />
                      <span>{season.seasonName}</span>
                      <span className={`text-xs ${isActive ? 'text-slate-950/70' : 'text-slate-500'}`}>
                        ({season.episodes.length} حلقة)
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Section Header */}
          <div className="flex items-center justify-between mb-5 pb-3 border-b border-slate-800">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Tv className="w-5 h-5 text-amber-400" />
              <span>
                حلقات {isConsolidated && currentSeason ? currentSeason.seasonName : 'المسلسل'}
              </span>
              <span className="text-xs text-slate-400 font-semibold tabular-nums mr-2">
                ({currentEpisodes.length} حلقة متوفرة)
              </span>
            </h2>
            <span className="text-xs text-amber-400 font-semibold">مفهرسة بالكامل بجودة FHD</span>
          </div>

          {/* Dedicated Episode Buttons Grid (Compact Numbers Only) */}
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2.5">
            {currentEpisodes.map((_, idx) => (
              <button
                key={idx}
                onClick={() => onPlayEpisode(idx, selectedSeasonIndex)}
                className="h-12 sm:h-14 rounded-xl text-center border border-slate-800 bg-[#0b1021] hover:bg-amber-400 hover:text-slate-950 hover:border-amber-400 text-slate-100 font-black text-base sm:text-lg transition-all cursor-pointer flex items-center justify-center active:scale-95 shadow-md group"
                title={`مشاهدة الحلقة ${idx + 1}`}
              >
                <span className="tabular-nums group-hover:scale-110 transition-transform">
                  {idx + 1}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Related Works Row */}
      {relatedItems.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <span>أعمال قد تنال إعجابك</span>
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {relatedItems.map((rel) => (
              <div
                key={rel.id}
                onClick={() => onSelectRelated(rel.id)}
                className="group cursor-pointer space-y-2"
              >
                <div className="aspect-[2/3] rounded-xl overflow-hidden bg-slate-900 border border-slate-800 group-hover:border-amber-400 transition-colors">
                  <img
                    src={rel.posterUrl}
                    alt={rel.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <h4 className="text-xs font-bold text-slate-200 group-hover:text-amber-400 transition-colors line-clamp-1">
                  {rel.title}
                </h4>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
