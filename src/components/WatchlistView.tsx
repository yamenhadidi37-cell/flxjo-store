import React from 'react';
import { Bookmark, Clock, Trash2, Play } from 'lucide-react';
import { MediaItem, ConsolidatedSeries, WatchHistoryItem } from '../types/media';
import { MediaCard } from './MediaCard';

interface WatchlistViewProps {
  watchlistItems: (MediaItem | ConsolidatedSeries)[];
  historyItems: WatchHistoryItem[];
  onSelectMedia: (id: string) => void;
  onClearHistory: () => void;
  onRemoveBookmark: (id: string) => void;
}

export const WatchlistView: React.FC<WatchlistViewProps> = ({
  watchlistItems,
  historyItems,
  onSelectMedia,
  onClearHistory,
  onRemoveBookmark,
}) => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 text-slate-100 space-y-12">
      {/* Continue Watching Section */}
      {historyItems.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-400" />
              <span>متابعة المشاهدة (Continue Watching)</span>
            </h2>
            <button
              onClick={onClearHistory}
              className="text-xs text-slate-400 hover:text-red-400 flex items-center gap-1 cursor-pointer transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>مسح السجل</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {historyItems.map((item, idx) => (
              <div
                key={idx}
                onClick={() => onSelectMedia(item.mediaId)}
                className="group bg-[#0b1021] border border-slate-800 hover:border-amber-400/50 rounded-xl p-3 flex gap-3 cursor-pointer transition-all"
              >
                <div className="relative w-20 aspect-[2/3] rounded-lg overflow-hidden bg-slate-900 shrink-0">
                  <img
                    src={item.posterUrl}
                    alt={item.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                  {/* Progress bar overlay at bottom */}
                  <div className="absolute bottom-0 inset-x-0 h-1 bg-slate-800">
                    <div
                      className="h-full bg-amber-400"
                      style={{ width: `${item.progressPercent}%` }}
                    />
                  </div>
                </div>

                <div className="flex flex-col justify-between min-w-0 py-1 flex-1">
                  <div>
                    <h3 className="text-sm font-bold text-white truncate group-hover:text-amber-400 transition-colors">
                      {item.title}
                    </h3>
                    <p className="text-xs text-slate-400 truncate mt-0.5">
                      {item.subtitle}
                    </p>
                  </div>

                  <div className="flex items-center justify-between text-xs text-amber-400 font-semibold pt-2">
                    <span className="tabular-nums">اكتمل {item.progressPercent}%</span>
                    <Play className="w-3.5 h-3.5 fill-current" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Bookmarked Favorites Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Bookmark className="w-5 h-5 text-amber-400" />
            <span>قائمتي المفضلة (Watchlist)</span>
            <span className="text-xs text-slate-400 font-semibold tabular-nums mr-2">
              ({watchlistItems.length} عمل محفوظ)
            </span>
          </h2>
        </div>

        {watchlistItems.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {watchlistItems.map((item) => (
              <div key={item.id} className="relative group">
                <MediaCard
                  item={item}
                  onClick={() => onSelectMedia(item.id)}
                />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveBookmark(item.id);
                  }}
                  title="إزالة من المفضلة"
                  className="absolute top-2 left-2 p-1.5 rounded-lg bg-black/80 hover:bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity z-20"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-16 text-center bg-[#0b1021] rounded-2xl border border-slate-800 text-slate-400 space-y-2">
            <Bookmark className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="text-sm font-semibold">لم تقم بإضافة أي أعمال إلى قائمتك بعد.</p>
            <p className="text-xs text-slate-500">
              تصفح الأفلام والمسلسلات واضغط على أيقونة الإضافة لحفظ ما تود مشاهدته لاحقاً.
            </p>
          </div>
        )}
      </section>
    </div>
  );
};
