import React, { useState, useMemo } from 'react';
import {
  Flame,
  Tv,
  Film,
  Radio,
  Folder,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Layers,
  Star,
} from 'lucide-react';
import {
  MediaItem,
  ConsolidatedSeries,
  LiveChannel,
  FolderItem,
  WatchHistoryItem,
} from '../types/media';
import { HeroBillboard } from './HeroBillboard';
import { MediaCard } from './MediaCard';
import { getCategoryLabel } from '../utils/mediaGrouping';

interface HomeViewProps {
  displayItems: (MediaItem | ConsolidatedSeries)[];
  movies: MediaItem[];
  series: (MediaItem | ConsolidatedSeries)[];
  channels: LiveChannel[];
  folders: FolderItem[];
  historyItems: WatchHistoryItem[];
  onSelectMedia: (id: string) => void;
  onPlayMedia: (id: string) => void;
  onSelectLiveChannel: (id: string) => void;
  onSelectFolder: (id: string) => void;
  onNavigateTab: (tab: string) => void;
  isBookmarked: (id: string) => boolean;
  onToggleBookmark: (item: MediaItem | ConsolidatedSeries) => void;
  searchQuery: string;
  isLoading?: boolean;
}

export const HomeView: React.FC<HomeViewProps> = ({
  displayItems,
  movies,
  series,
  channels,
  folders,
  historyItems,
  onSelectMedia,
  onPlayMedia,
  onSelectLiveChannel,
  onSelectFolder,
  onNavigateTab,
  isBookmarked,
  onToggleBookmark,
  searchQuery,
  isLoading = false,
}) => {
  const [activeCategory, setActiveCategory] = useState<string>('all');

  // Top featured carousel candidates
  const featuredCandidates = useMemo(() => {
    return displayItems.slice(0, 5);
  }, [displayItems]);

  // Categories
  const categoryChips = [
    { id: 'all', label: 'الكل' },
    { id: 'egyptian', label: 'دراما مصرية' },
    { id: 'turkish', label: 'مسلسلات تركية' },
    { id: 'syrian', label: 'دراما شامية' },
    { id: 'foreign', label: 'أفلام أجنبية' },
    { id: 'anime', label: 'أنمي ياباني' },
    { id: 'action', label: 'أكشن وإثارة' },
    { id: 'comedy', label: 'كوميدي' },
  ];

  // Filtered by search or category
  const filteredHomeItems = useMemo(() => {
    return displayItems.filter((item) => {
      if (activeCategory !== 'all' && item.category !== activeCategory) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          item.title.toLowerCase().includes(q) ||
          (item.story && item.story.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [displayItems, activeCategory, searchQuery]);

  return (
    <div className="text-slate-100 pb-20">
      {/* If there is a search query, show dedicated search results grid immediately */}
      {searchQuery.trim() ? (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="mb-6 flex items-center justify-between">
            <h1 className="text-2xl font-black text-white">
              نتائج البحث عن: <span className="text-amber-400">"{searchQuery}"</span>
            </h1>
            <span className="text-xs text-slate-400 tabular-nums">
              ({filteredHomeItems.length} نتيجة)
            </span>
          </div>

          {filteredHomeItems.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {filteredHomeItems.map((item) => (
                <MediaCard
                  key={item.id}
                  item={item}
                  onClick={() => onSelectMedia(item.id)}
                />
              ))}
            </div>
          ) : (
            <div className="p-16 text-center bg-[#0b1021] rounded-2xl border border-slate-800 text-slate-400">
              لم نعثر على أي نتائج تطابق بحثك. جرّب كلمات أخرى.
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Billboard Hero Carousel */}
          <HeroBillboard
            featuredItems={featuredCandidates}
            onSelectMedia={onSelectMedia}
            onPlayMedia={onPlayMedia}
            isBookmarked={isBookmarked}
            onToggleBookmark={onToggleBookmark}
          />

          {/* Quick Category Chips Strip */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2">
              {categoryChips.map((chip) => {
                const isActive = activeCategory === chip.id;
                return (
                  <button
                    key={chip.id}
                    onClick={() => setActiveCategory(chip.id)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                      isActive
                        ? 'bg-amber-400 text-slate-950 shadow-md font-black'
                        : 'bg-slate-900 border border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    {chip.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
            {/* If Category is filtered, show direct results */}
            {activeCategory !== 'all' ? (
              <section className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-amber-400" />
                    <span>{getCategoryLabel(activeCategory)}</span>
                    <span className="text-xs text-slate-400 tabular-nums">
                      ({filteredHomeItems.length} عمل)
                    </span>
                  </h2>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {filteredHomeItems.map((item) => (
                    <MediaCard
                      key={item.id}
                      item={item}
                      onClick={() => onSelectMedia(item.id)}
                    />
                  ))}
                </div>
              </section>
            ) : isLoading && displayItems.length === 0 ? (
              /* Sleek Skeleton Loading state when data is first fetching */
              <div className="space-y-10 py-6">
                {[1, 2].map((s) => (
                  <div key={s} className="space-y-4">
                    <div className="h-6 w-48 bg-slate-800/60 rounded-md animate-pulse" />
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                      {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div
                          key={i}
                          className="aspect-[2/3] bg-slate-900/80 rounded-xl border border-slate-800 animate-pulse"
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <>
                {/* Row 1: الأكثر مشاهدة ورواجاً */}
                {displayItems.length > 0 && (
                  <section className="space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                      <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Flame className="w-5 h-5 text-amber-400" />
                        <span>الأكثر رواجاً ومشاهدة (Trending Now)</span>
                      </h2>
                      <button
                        onClick={() => onNavigateTab('movies')}
                        className="text-xs text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <span>عرض الكل</span>
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                      {displayItems.slice(0, 6).map((item) => (
                        <MediaCard
                          key={item.id}
                          item={item}
                          onClick={() => onSelectMedia(item.id)}
                        />
                      ))}
                    </div>
                  </section>
                )}

                {/* Row 2: المسلسلات والمواسم المرتبطة */}
                {series.length > 0 && (
                  <section className="space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                      <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Tv className="w-5 h-5 text-amber-400" />
                        <span>المسلسلات الحصرية ومواسمها المتصلة</span>
                        <span className="text-xs text-amber-300 font-medium hidden sm:inline">
                          (مدمجة بالأجزاء السحرية)
                        </span>
                      </h2>
                      <button
                        onClick={() => onNavigateTab('series')}
                        className="text-xs text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <span>كل المسلسلات</span>
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                      {series.slice(0, 6).map((item) => (
                        <MediaCard
                          key={item.id}
                          item={item}
                          onClick={() => onSelectMedia(item.id)}
                        />
                      ))}
                    </div>
                  </section>
                )}

                {/* Row 3: القنوات التلفزيونية الحية (Live Channels Carousel) */}
                {channels.length > 0 && (
                  <section className="space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                      <div className="flex items-center gap-2">
                        <Radio className="w-5 h-5 text-red-500 animate-pulse" />
                        <h2 className="text-xl font-bold text-white">
                          بث مباشر: أهم القنوات الرياضية والسينمائية
                        </h2>
                      </div>
                      <button
                        onClick={() => onNavigateTab('live')}
                        className="text-xs text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <span>جميع القنوات</span>
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                      {channels.slice(0, 4).map((c) => (
                        <div
                          key={c.id}
                          onClick={() => onSelectLiveChannel(c.id)}
                          className="group bg-[#0b1021] border border-slate-800 hover:border-amber-400/60 rounded-xl p-3.5 flex items-center gap-3.5 cursor-pointer transition-all hover:shadow-[0_4px_20px_rgba(250,204,21,0.15)]"
                        >
                          <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-slate-900 border border-slate-800 shrink-0">
                            <img
                              src={c.logoUrl}
                              alt={c.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                          </div>

                          <div className="min-w-0 flex-1">
                            <h4 className="text-xs font-bold text-white group-hover:text-amber-400 truncate transition-colors">
                              {c.name}
                            </h4>
                            <span className="text-[11px] text-slate-400 truncate block mt-0.5">
                              {c.currentProgram || 'بث مباشر HD'}
                            </span>
                          </div>

                          <div className="w-2 h-2 rounded-full bg-red-500 animate-ping shrink-0" />
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* Row 4: أحدث الأفلام السينمائية */}
                {movies.length > 0 && (
                  <section className="space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                      <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Film className="w-5 h-5 text-amber-400" />
                        <span>جديد الأفلام السينمائية العربية والعالمية</span>
                      </h2>
                      <button
                        onClick={() => onNavigateTab('movies')}
                        className="text-xs text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <span>المزيد من الأفلام</span>
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                      {movies.slice(0, 6).map((movie) => (
                        <MediaCard
                          key={movie.id}
                          item={movie}
                          onClick={() => onSelectMedia(movie.id)}
                        />
                      ))}
                    </div>
                  </section>
                )}

                {/* Row 5: مجلدات وتنظيم المحتوى */}
                {folders.length > 0 && (
                  <section className="space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                      <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Folder className="w-5 h-5 text-amber-400" />
                        <span>أقسام ومجلدات المنصة (Folders)</span>
                      </h2>
                      <button
                        onClick={() => onNavigateTab('folders')}
                        className="text-xs text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <span>تصفح كل المجلدات</span>
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {folders.slice(0, 3).map((f) => (
                        <div
                          key={f.id}
                          onClick={() => onSelectFolder(f.id)}
                          className="group relative overflow-hidden rounded-xl border border-slate-800 bg-[#0b1021] p-5 cursor-pointer hover:border-amber-400/60 transition-all hover:shadow-lg"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <Folder className="w-5 h-5 text-amber-400" />
                            <span className="text-xs font-semibold text-slate-400">
                              {f.itemCount || 30}+ عمل
                            </span>
                          </div>
                          <h3 className="text-base font-bold text-white group-hover:text-amber-400 transition-colors mb-1">
                            {f.name}
                          </h3>
                          <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                            {f.description}
                          </p>
                        </div>
                      ))}
                    </div>
                  </section>
                )}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
};
