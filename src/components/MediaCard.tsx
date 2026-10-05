import React, { useState } from 'react';
import { Play, Star, Layers, Film, Tv } from 'lucide-react';
import { MediaItem, ConsolidatedSeries } from '../types/media';
import { getCategoryLabel } from '../utils/mediaGrouping';

interface MediaCardProps {
  item: MediaItem | ConsolidatedSeries;
  onClick: () => void;
}

export const MediaCard: React.FC<MediaCardProps> = ({ item, onClick }) => {
  const [imageError, setImageError] = useState(false);

  // Determine if consolidated multi-season series
  const isConsolidated = 'seasons' in item;
  const isMovie = item.type === 'movie';
  const seasonsCount = isConsolidated ? item.seasons.length : 1;
  const episodesCount = isConsolidated
    ? item.totalEpisodesCount
    : item.episodes?.length || 0;

  return (
    <div
      onClick={onClick}
      className="group relative flex flex-col cursor-pointer transition-all duration-300"
    >
      {/* Poster Image Container */}
      <div className="relative aspect-[2/3] w-full overflow-hidden rounded-xl bg-slate-900 border border-slate-800/80 group-hover:border-amber-400/60 shadow-lg group-hover:shadow-[0_8px_30px_rgba(250,204,21,0.15)] transition-all duration-300">
        {!imageError && item.posterUrl ? (
          <img
            src={item.posterUrl}
            alt={item.title}
            onError={() => setImageError(true)}
            referrerPolicy="no-referrer"
            loading="lazy"
            className="w-full h-full object-cover object-center transition-transform duration-500 ease-out group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-gradient-to-br from-slate-900 to-slate-950 text-slate-500">
            {isMovie ? (
              <Film className="w-10 h-10 text-amber-400/40 mb-2" />
            ) : (
              <Tv className="w-10 h-10 text-amber-400/40 mb-2" />
            )}
            <span className="text-xs text-center font-bold text-slate-400 line-clamp-2">
              {item.title}
            </span>
          </div>
        )}

        {/* Hover Dark Overlay & Play Button */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#070b14]/90 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center p-4">
          <div className="w-12 h-12 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center shadow-lg transform translate-y-3 group-hover:translate-y-0 transition-transform duration-300">
            <Play className="w-5 h-5 fill-current ml-0.5" />
          </div>
        </div>

        {/* Subtle Quality & Format Badge in Corner (Single-line, quiet) */}
        <div className="absolute top-2.5 right-2.5 bg-slate-950/85 backdrop-blur-sm text-[11px] font-bold text-amber-300 px-2 py-0.5 rounded border border-amber-400/30">
          {item.quality || (isMovie ? 'فيلم' : 'مسلسل')}
        </div>

        {/* Multi-season indicator on poster corner if series */}
        {isConsolidated && seasonsCount > 1 && (
          <div className="absolute bottom-2.5 right-2.5 bg-slate-950/90 text-[11px] font-bold text-slate-200 px-2 py-0.5 rounded flex items-center gap-1 border border-slate-700">
            <Layers className="w-3 h-3 text-amber-400" />
            <span>{seasonsCount} أجزاء</span>
          </div>
        )}
      </div>

      {/* Text Info (Anti-slop zero-pill discipline) */}
      <div className="mt-2.5 space-y-1">
        <h3 className="text-sm font-bold text-slate-100 group-hover:text-amber-400 transition-colors line-clamp-1">
          {item.title}
        </h3>

        {/* Unboxed metadata separated by typographic dots */}
        <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
          {item.rating && (
            <span className="flex items-center gap-0.5 text-amber-400 font-bold tabular-nums">
              <Star className="w-3 h-3 fill-amber-400 inline" />
              {item.rating}
            </span>
          )}
          {item.rating && <span aria-hidden="true" className="text-slate-600">·</span>}
          <span>{getCategoryLabel(item.category)}</span>
          {item.year && (
            <>
              <span aria-hidden="true" className="text-slate-600">·</span>
              <span className="tabular-nums">{item.year}</span>
            </>
          )}
          {!isMovie && episodesCount > 0 && (
            <>
              <span aria-hidden="true" className="text-slate-600">·</span>
              <span className="tabular-nums">{episodesCount} حلقة</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
