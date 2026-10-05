import React, { useState } from 'react';
import { StreamPlayer } from './StreamPlayer';
import {
  ArrowRight,
  Maximize2,
  Minimize2,
  SkipForward,
  SkipBack,
  Layers,
  Sparkles,
  Share2,
  Check,
  Film,
} from 'lucide-react';
import { MediaItem, Episode, ConsolidatedSeries } from '../types/media';

interface VideoPlayerViewProps {
  media: MediaItem | ConsolidatedSeries;
  episodeIndex?: number;
  seasonIndex?: number;
  onClose: () => void;
  onSelectEpisode: (epIdx: number, seasonIdx?: number) => void;
  onUpdateWatchProgress: (percent: number) => void;
}

export const VideoPlayerView: React.FC<VideoPlayerViewProps> = ({
  media,
  episodeIndex = 0,
  seasonIndex = 0,
  onClose,
  onSelectEpisode,
  onUpdateWatchProgress,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [isTheaterMode, setIsTheaterMode] = useState(false);

  const isConsolidated = 'seasons' in media;
  const isMovie = media.type === 'movie';

  // Resolve current episode and season
  let currentEpisode: Episode | null = null;
  let currentSeasonName = '';
  let seasonEpisodes: Episode[] = [];

  if (isConsolidated) {
    const seasonObj = media.seasons[seasonIndex] || media.seasons[0];
    currentSeasonName = seasonObj?.seasonName || '';
    seasonEpisodes = seasonObj?.episodes || [];
    currentEpisode = seasonEpisodes[episodeIndex] || seasonEpisodes[0] || null;
  } else {
    seasonEpisodes = media.episodes || [];
    currentEpisode = seasonEpisodes[episodeIndex] || seasonEpisodes[0] || null;
  }

  // Active streaming URL
  const videoSource = isMovie
    ? media.videoUrl || ''
    : currentEpisode?.videoUrl || '';

  const handleShare = () => {
    const url = window.location.href;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const hasNextEpisode = episodeIndex < seasonEpisodes.length - 1;
  const hasPrevEpisode = episodeIndex > 0;

  return (
    <div className="min-h-screen bg-[#060a12] text-slate-100 pb-16">
      {/* Top Bar for Player Navigation */}
      <div className="bg-[#0a0f1d] border-b border-slate-800 px-4 sm:px-6 py-3 sticky top-0 z-40 flex items-center justify-between">
        <button
          onClick={onClose}
          className="flex items-center gap-2 text-sm font-bold text-slate-300 hover:text-amber-400 transition-colors cursor-pointer"
        >
          <ArrowRight className="w-5 h-5 ml-1" />
          <span>العودة لتفاصيل العمل</span>
        </button>

        <div className="text-center truncate px-4">
          <span className="text-sm font-bold text-white truncate inline-block max-w-xs sm:max-w-md">
            {media.title}
          </span>
          {!isMovie && currentEpisode && (
            <span className="text-xs text-amber-400 font-semibold mr-2">
              {currentSeasonName && `(${currentSeasonName}) - `}
              {currentEpisode.title}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-colors"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5 text-amber-400" />}
            <span className="hidden sm:inline">{copiedLink ? 'تم نسخ الرابط' : 'مشاركة'}</span>
          </button>
        </div>
      </div>

      {/* Main Video Viewport Container */}
      <div className={`mx-auto ${isTheaterMode ? 'max-w-full px-0' : 'max-w-6xl px-4 sm:px-6'} pt-4 sm:pt-6 transition-all duration-300`}>
        {/* StreamPlayer with strict sandbox and anti-popup engine */}
        <StreamPlayer
          url={videoSource}
          title={media.title}
          poster={media.posterUrl}
          onTimeUpdate={onUpdateWatchProgress}
        />

        {/* Video Controls & Next/Prev Controls */}
        <div className="mt-4 bg-[#0c1222] border border-slate-800/80 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
          {/* Episode Next / Prev Buttons if TV */}
          {!isMovie && (
            <div className="flex items-center gap-2">
              <button
                disabled={!hasPrevEpisode}
                onClick={() => onSelectEpisode(episodeIndex - 1, seasonIndex)}
                className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none text-xs font-semibold text-slate-200 flex items-center gap-1 cursor-pointer transition-colors"
              >
                <SkipForward className="w-3.5 h-3.5 ml-1" />
                <span>الحلقة السابقة</span>
              </button>

              <button
                disabled={!hasNextEpisode}
                onClick={() => onSelectEpisode(episodeIndex + 1, seasonIndex)}
                className="px-4 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 disabled:opacity-30 disabled:pointer-events-none text-xs font-bold text-slate-950 flex items-center gap-1 cursor-pointer transition-colors"
              >
                <span>الحلقة التالية</span>
                <SkipBack className="w-3.5 h-3.5 mr-1" />
              </button>
            </div>
          )}

          {/* Theater Mode Toggle */}
          <button
            onClick={() => setIsTheaterMode(!isTheaterMode)}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-xs font-semibold text-slate-300 hover:text-white transition-colors"
          >
            {isTheaterMode ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            <span>{isTheaterMode ? 'الوضع الطبيعي' : 'وضع المسرح'}</span>
          </button>
        </div>

        {/* Series Episodes Playlist Ribbon below player */}
        {!isMovie && seasonEpisodes.length > 0 && (
          <div className="mt-8 bg-[#0c1222] border border-slate-800/80 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-amber-400" />
                <h3 className="text-base font-bold text-white">
                  قائمة حلقات {currentSeasonName || 'المسلسل'}
                </h3>
                <span className="text-xs text-slate-400 font-medium tabular-nums">
                  ({seasonEpisodes.length} حلقة)
                </span>
              </div>

              {/* If multi-season, season tabs */}
              {isConsolidated && media.seasons.length > 1 && (
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                  {media.seasons.map((season, sIdx) => (
                    <button
                      key={sIdx}
                      onClick={() => onSelectEpisode(0, sIdx)}
                      className={`px-3 py-1 rounded-md text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                        seasonIndex === sIdx
                          ? 'bg-amber-400 text-slate-950'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {season.seasonName}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Episodes Grid (Compact Numbers Only) */}
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2.5 max-h-72 overflow-y-auto pr-1">
              {seasonEpisodes.map((_, idx) => {
                const isCurrent = idx === episodeIndex;
                return (
                  <button
                    key={idx}
                    onClick={() => onSelectEpisode(idx, seasonIndex)}
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
        )}
      </div>
    </div>
  );
};
