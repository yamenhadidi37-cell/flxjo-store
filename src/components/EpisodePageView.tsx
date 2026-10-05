import React, { useState, useEffect } from 'react';
import { StreamPlayer } from './StreamPlayer';
import {
  ArrowRight,
  Play,
  Share2,
  Check,
  SkipForward,
  SkipBack,
  Layers,
  Tv,
  Film,
  Download,
  Server,
  Star,
  Globe,
} from 'lucide-react';
import { MediaItem, ConsolidatedSeries, Episode } from '../types/media';
import { getCategoryLabel } from '../utils/mediaGrouping';

interface EpisodePageViewProps {
  media: MediaItem | ConsolidatedSeries;
  episodeIndex: number;
  seasonIndex?: number;
  onNavigateEpisode: (newEpIndex: number, seasonIdx?: number) => void;
  onBackToMedia: () => void;
  onBackToHome: () => void;
}

export const EpisodePageView: React.FC<EpisodePageViewProps> = ({
  media,
  episodeIndex,
  seasonIndex = 0,
  onNavigateEpisode,
  onBackToMedia,
  onBackToHome,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);

  const isConsolidated = 'seasons' in media;
  const activeSeason = isConsolidated ? media.seasons[seasonIndex] || media.seasons[0] : null;
  const seasonName = activeSeason ? activeSeason.seasonName : (media.seasonName || 'الموسم الأول');
  const episodes: Episode[] = activeSeason ? activeSeason.episodes : (media.episodes || []);
  const currentEp: Episode = episodes[episodeIndex] || {
    title: `الحلقة ${episodeIndex + 1}`,
    videoUrl: '',
  };

  const videoSource = currentEp.videoUrl || '';

  // SEO & Structured Data (JSON-LD) for Google Indexing of TVEpisode
  useEffect(() => {
    const episodeTitle = `${media.title} - ${seasonName} - ${currentEp.title}`;
    document.title = `${episodeTitle} | FLEXJO VIP`;

    const scriptId = 'schema-episode-jsonld';
    let script = document.getElementById(scriptId) as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.type = 'application/ld+json';
      document.head.appendChild(script);
    }

    const structuredData = {
      '@context': 'https://schema.org',
      '@type': 'TVEpisode',
      name: currentEp.title,
      partOfSeries: {
        '@type': 'TVSeries',
        name: media.title,
      },
      partOfSeason: {
        '@type': 'TVSeason',
        name: seasonName,
        seasonNumber: seasonIndex + 1,
      },
      episodeNumber: episodeIndex + 1,
      description: currentEp.overview || `مشاهدة وتحميل ${episodeTitle} بجودة عالية FHD.`,
      image: media.posterUrl,
      duration: 'PT45M',
    };

    script.textContent = JSON.stringify(structuredData);

    return () => {
      const el = document.getElementById(scriptId);
      if (el) el.remove();
      document.title = 'FLEXJO VIP – أفلام، مسلسلات وقنوات بث مباشر';
    };
  }, [media, currentEp, seasonName, seasonIndex, episodeIndex]);

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const hasNext = episodeIndex < episodes.length - 1;
  const hasPrev = episodeIndex > 0;

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 pb-20">
      {/* Top Breadcrumb & Actions Bar */}
      <div className="bg-[#0a0f1d] border-b border-slate-800 px-4 sm:px-8 py-3.5 flex flex-wrap items-center justify-between gap-3 sticky top-0 z-40 backdrop-blur-md">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <button
            onClick={onBackToHome}
            className="text-amber-400 hover:text-amber-300 font-bold cursor-pointer"
          >
            الرئيسية
          </button>
          <span>/</span>
          <button
            onClick={onBackToMedia}
            className="text-slate-300 hover:text-white font-medium cursor-pointer truncate max-w-xs"
          >
            {media.title}
          </button>
          <span>/</span>
          <span className="text-amber-300 font-medium">{seasonName}</span>
          <span>/</span>
          <span className="text-white font-bold">{currentEp.title}</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-colors"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5 text-amber-400" />}
            <span>{copiedLink ? 'تم نسخ الرابط' : 'مشاركة الحلقة'}</span>
          </button>

          <button
            onClick={onBackToMedia}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold transition-colors cursor-pointer"
          >
            <ArrowRight className="w-3.5 h-3.5" />
            <span>صفحة المسلسل</span>
          </button>
        </div>
      </div>

      {/* Main Episode Content Container */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6">
        {/* Title Header */}
        <div className="mb-4">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-400 mb-1">
            <span>{media.title}</span>
            <span>·</span>
            <span className="text-slate-300">{seasonName}</span>
            <span>·</span>
            <span>{getCategoryLabel(media.category)}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            {media.title} - {currentEp.title}
          </h1>
        </div>

        {/* StreamPlayer with strict sandbox and anti-popup engine */}
        <StreamPlayer
          url={videoSource}
          title={`${media.title} - ${currentEp.title}`}
          poster={media.posterUrl}
        />

        {/* Episode Navigation Controls */}
        <div className="mt-4 bg-[#0c1222] border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
          <span className="text-xs text-slate-400 font-medium">
            تصفح حلقات {seasonName}
          </span>

          {/* Prev / Next controls */}
          <div className="flex items-center gap-2">
            <button
              disabled={!hasPrev}
              onClick={() => onNavigateEpisode(episodeIndex - 1, seasonIndex)}
              className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none text-xs font-semibold text-slate-200 flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <SkipForward className="w-4 h-4 ml-1" />
              <span>الحلقة السابقة</span>
            </button>

            <button
              disabled={!hasNext}
              onClick={() => onNavigateEpisode(episodeIndex + 1, seasonIndex)}
              className="px-4 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 disabled:opacity-30 disabled:pointer-events-none text-xs font-bold text-slate-950 flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <span>الحلقة التالية</span>
              <SkipBack className="w-4 h-4 mr-1" />
            </button>
          </div>
        </div>

        {/* Episode Story & Details */}
        <div className="mt-6 bg-[#0b1021] border border-slate-800 rounded-xl p-5 space-y-3">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Tv className="w-4 h-4 text-amber-400" />
            <span>تفاصيل {currentEp.title}</span>
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed font-normal">
            {currentEp.overview ||
              `تشهد أحداث ${currentEp.title} من مسلسل ${media.title} تطورات مصيرية وصراعات مشتعلة تكشف مفاجآت كبرى للأبطال.`}
          </p>
          <div className="pt-2 flex flex-wrap items-center gap-4 text-xs text-slate-400 font-semibold border-t border-slate-800/80">
            <span>الجودة: <strong className="text-amber-400 font-bold">1080p FHD</strong></span>
            <span>·</span>
            <span>المدة: <strong className="text-slate-200">{currentEp.duration || '45 دقيقة'}</strong></span>
            <span>·</span>
            <span>الموسم: <strong className="text-slate-200">{seasonName}</strong></span>
          </div>
        </div>

        {/* All Episodes of this Season Grid */}
        <div className="mt-8 bg-[#0b1021] border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-amber-400" />
              <span>باقي حلقات {seasonName}</span>
            </h3>
            <span className="text-xs text-slate-400 tabular-nums">({episodes.length} حلقة)</span>
          </div>

          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2.5">
            {episodes.map((_, idx) => {
              const isCurrent = idx === episodeIndex;
              return (
                <button
                  key={idx}
                  onClick={() => onNavigateEpisode(idx, seasonIndex)}
                  className={`h-11 sm:h-12 rounded-xl text-center border transition-all cursor-pointer flex items-center justify-center font-black text-sm sm:text-base ${
                    isCurrent
                      ? 'bg-amber-400 text-slate-950 border-amber-400 shadow-md scale-105'
                      : 'bg-slate-900 border-slate-800 text-slate-200 hover:border-amber-400/50 hover:bg-slate-800 hover:text-white'
                  }`}
                  title={`الحلقة ${idx + 1}`}
                >
                  <span className="tabular-nums">{idx + 1}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
