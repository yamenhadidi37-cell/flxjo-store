import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  MediaItem,
  ConsolidatedSeries,
  LiveChannel,
  FolderItem,
  WatchHistoryItem,
} from './types/media';
import { fetchAllMediaData, FetchResult } from './services/firebase';
import { groupMediaCatalog } from './utils/mediaGrouping';
import { Navbar } from './components/Navbar';
import { HomeView } from './components/HomeView';
import { MoviesView } from './components/MoviesView';
import { SeriesView } from './components/SeriesView';
import { LiveChannelsView } from './components/LiveChannelsView';
import { FoldersView } from './components/FoldersView';
import { MediaDetailsView } from './components/MediaDetailsView';
import { VideoPlayerView } from './components/VideoPlayerView';
import { EpisodePageView } from './components/EpisodePageView';
import { WatchlistView } from './components/WatchlistView';
import { FirebaseModal } from './components/FirebaseModal';
import { Footer } from './components/Footer';

export default function App() {
  // Navigation & Routing State
  const [currentTab, setCurrentTab] = useState<string>('home');
  const [selectedMediaId, setSelectedMediaId] = useState<string | null>(null);
  const [selectedEpisodeIndex, setSelectedEpisodeIndex] = useState<number | null>(null);
  const [selectedSeasonIndex, setSelectedSeasonIndex] = useState<number>(0);
  const [selectedLiveChannelId, setSelectedLiveChannelId] = useState<string | undefined>();
  const [selectedFolderId, setSelectedFolderId] = useState<string | undefined>();
  const [isPlayingDirect, setIsPlayingDirect] = useState<boolean>(false);

  // Search
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Firebase Data & Status State (with Instant LocalStorage Cache for Zero-Flicker Page Refresh)
  const [rawMedia, setRawMedia] = useState<MediaItem[]>(() => {
    try {
      const cached = localStorage.getItem('flexjo_cache_raw_media');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [liveChannels, setLiveChannels] = useState<LiveChannel[]>(() => {
    try {
      const cached = localStorage.getItem('flexjo_cache_channels');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [folders, setFolders] = useState<FolderItem[]>(() => {
    try {
      const cached = localStorage.getItem('flexjo_cache_folders');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [firebaseStatus, setFirebaseStatus] = useState<{
    source: 'firestore' | 'seed';
    error: string | null;
    mediaCount: number;
    channelsCount: number;
    foldersCount: number;
  }>({
    source: 'seed',
    error: null,
    mediaCount: 0,
    channelsCount: 0,
    foldersCount: 0,
  });

  const [isFirebaseModalOpen, setIsFirebaseModalOpen] = useState<boolean>(false);

  // User Watchlist & History (persisted in localStorage)
  const [watchlistIds, setWatchlistIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('flexjo_watchlist');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [watchHistory, setWatchHistory] = useState<WatchHistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem('flexjo_history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Fetch initial data (strictly read-only from Firestore with smart fallback)
  const loadData = useCallback(async () => {
    setIsLoading(true);
    const result: FetchResult = await fetchAllMediaData();
    setRawMedia(result.media);
    setLiveChannels(result.channels);
    setFolders(result.folders);

    // Save to instant cache
    try {
      if (result.media.length > 0) {
        localStorage.setItem('flexjo_cache_raw_media', JSON.stringify(result.media));
      }
      if (result.channels.length > 0) {
        localStorage.setItem('flexjo_cache_channels', JSON.stringify(result.channels));
      }
      if (result.folders.length > 0) {
        localStorage.setItem('flexjo_cache_folders', JSON.stringify(result.folders));
      }
    } catch {
      // quota or private browsing
    }

    setFirebaseStatus({
      source: result.source,
      error: result.error,
      mediaCount: result.media.length,
      channelsCount: result.channels.length,
      foldersCount: result.folders.length,
    });
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Grouping multi-season series and movies according to user schema
  const { consolidatedSeries, movies, standaloneSeries, displayItems } = useMemo(() => {
    return groupMediaCatalog(rawMedia);
  }, [rawMedia]);

  const allDisplaySeries = useMemo(() => {
    return [...consolidatedSeries, ...standaloneSeries];
  }, [consolidatedSeries, standaloneSeries]);

  // Handle URL parsing and Browser Back/Forward buttons
  const syncFromPath = useCallback(() => {
    const path = window.location.pathname;
    const urlParams = new URLSearchParams(window.location.search);

    if (path.startsWith('/media/')) {
      const id = decodeURIComponent(path.replace('/media/', ''));
      setSelectedMediaId(id);
      setSelectedEpisodeIndex(null);
      setIsPlayingDirect(false);
    } else if (path.startsWith('/watch/')) {
      const match = path.match(/\/watch\/([^/]+)\/episode\/(\d+)/);
      if (match) {
        const id = decodeURIComponent(match[1]);
        const ep = parseInt(match[2], 10) - 1;
        setSelectedMediaId(id);
        setSelectedEpisodeIndex(Math.max(0, ep));
        setIsPlayingDirect(false);
      }
    } else if (path === '/movies') {
      setCurrentTab('movies');
      setSelectedMediaId(null);
    } else if (path === '/series') {
      setCurrentTab('series');
      setSelectedMediaId(null);
    } else if (path === '/live') {
      setCurrentTab('live');
      setSelectedMediaId(null);
      const ch = urlParams.get('channel');
      if (ch) setSelectedLiveChannelId(ch);
    } else if (path === '/folders') {
      setCurrentTab('folders');
      setSelectedMediaId(null);
    } else if (path === '/watchlist') {
      setCurrentTab('watchlist');
      setSelectedMediaId(null);
    } else {
      setCurrentTab('home');
      setSelectedMediaId(null);
    }
  }, []);

  useEffect(() => {
    syncFromPath();
    const handlePopState = () => syncFromPath();
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [syncFromPath]);

  // Save watchlist to localStorage
  useEffect(() => {
    localStorage.setItem('flexjo_watchlist', JSON.stringify(watchlistIds));
  }, [watchlistIds]);

  // Save watch history to localStorage
  useEffect(() => {
    localStorage.setItem('flexjo_history', JSON.stringify(watchHistory));
  }, [watchHistory]);

  // Navigation handlers with clean URL history updates
  const navigateTo = (tab: string) => {
    setCurrentTab(tab);
    setSelectedMediaId(null);
    setSelectedEpisodeIndex(null);
    setIsPlayingDirect(false);
    setSearchQuery('');
    window.scrollTo({ top: 0, behavior: 'smooth' });

    const newPath = tab === 'home' ? '/home' : `/${tab}`;
    if (window.location.pathname !== newPath) {
      window.history.pushState({}, '', newPath);
    }
  };

  const openMediaDetails = (id: string) => {
    setSelectedMediaId(id);
    setSelectedEpisodeIndex(null);
    setIsPlayingDirect(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    window.history.pushState({}, '', `/media/${encodeURIComponent(id)}`);
  };

  const openEpisodePage = (id: string, epIndex: number, seasonIdx: number = 0) => {
    setSelectedMediaId(id);
    setSelectedEpisodeIndex(epIndex);
    setSelectedSeasonIndex(seasonIdx);
    setIsPlayingDirect(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    window.history.pushState(
      {},
      '',
      `/watch/${encodeURIComponent(id)}/episode/${epIndex + 1}`
    );
  };

  const playMovieDirect = (id: string) => {
    setSelectedMediaId(id);
    setSelectedEpisodeIndex(null);
    setIsPlayingDirect(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Find currently active item
  const currentActiveMedia = useMemo(() => {
    if (!selectedMediaId) return null;
    return (
      displayItems.find((m) => m.id === selectedMediaId) ||
      rawMedia.find((m) => m.id === selectedMediaId) ||
      null
    );
  }, [selectedMediaId, displayItems, rawMedia]);

  // Watchlist Toggle
  const isBookmarked = (id: string) => watchlistIds.includes(id);

  const toggleBookmark = (item: MediaItem | ConsolidatedSeries) => {
    setWatchlistIds((prev) =>
      prev.includes(item.id) ? prev.filter((id) => id !== item.id) : [...prev, item.id]
    );
  };

  // Watch History updater
  const updateWatchProgress = (progressPercent: number) => {
    if (!currentActiveMedia) return;
    const isMovie = currentActiveMedia.type === 'movie';
    const isConsolidated = 'seasons' in currentActiveMedia;
    const seasonName = isConsolidated
      ? currentActiveMedia.seasons[selectedSeasonIndex]?.seasonName || 'الموسم الأول'
      : currentActiveMedia.seasonName || '';

    const subtitle = isMovie
      ? 'فيلم سينمائي'
      : `${seasonName} - الحلقة ${(selectedEpisodeIndex ?? 0) + 1}`;

    const newRecord: WatchHistoryItem = {
      mediaId: currentActiveMedia.id,
      episodeIndex: selectedEpisodeIndex ?? undefined,
      seasonIndex: selectedSeasonIndex,
      title: currentActiveMedia.title,
      subtitle,
      posterUrl: currentActiveMedia.posterUrl,
      timestamp: Date.now(),
      progressPercent,
    };

    setWatchHistory((prev) => {
      const filtered = prev.filter((h) => h.mediaId !== currentActiveMedia.id);
      return [newRecord, ...filtered].slice(0, 12);
    });
  };

  const bookmarkedItems = useMemo(() => {
    return displayItems.filter((item) => watchlistIds.includes(item.id));
  }, [displayItems, watchlistIds]);

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col font-sans selection:bg-amber-400 selection:text-black">
      {/* Top Navigation Bar with BrandLogo & Contract */}
      <Navbar
        currentTab={currentTab}
        onNavigate={navigateTo}
        watchlistCount={watchlistIds.length}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      {/* Main App Content Router */}
      <main className="flex-1">
        {/* State 1: Active Video Player View (Full screen / cinema) */}
        {isPlayingDirect && currentActiveMedia ? (
          <VideoPlayerView
            media={currentActiveMedia}
            episodeIndex={selectedEpisodeIndex || 0}
            seasonIndex={selectedSeasonIndex}
            onClose={() => setIsPlayingDirect(false)}
            onSelectEpisode={(epIdx, sIdx) => {
              setSelectedEpisodeIndex(epIdx);
              if (sIdx !== undefined) setSelectedSeasonIndex(sIdx);
            }}
            onUpdateWatchProgress={updateWatchProgress}
          />
        ) : selectedEpisodeIndex !== null && currentActiveMedia ? (
          /* State 2: Dedicated Episode Page (Each episode has dedicated page for SEO indexing!) */
          <EpisodePageView
            media={currentActiveMedia}
            episodeIndex={selectedEpisodeIndex}
            seasonIndex={selectedSeasonIndex}
            onNavigateEpisode={(newEpIndex, sIdx) => {
              if (sIdx !== undefined) setSelectedSeasonIndex(sIdx);
              openEpisodePage(currentActiveMedia.id, newEpIndex, sIdx ?? selectedSeasonIndex);
            }}
            onBackToMedia={() => openMediaDetails(currentActiveMedia.id)}
            onBackToHome={() => navigateTo('home')}
          />
        ) : selectedMediaId && currentActiveMedia ? (
          /* State 3: Dedicated Movie or TV Series Page with Seasons */
          <MediaDetailsView
            media={currentActiveMedia}
            onBack={() => navigateTo('home')}
            onPlayMovie={() => playMovieDirect(currentActiveMedia.id)}
            onPlayEpisode={(epIdx, sIdx) => openEpisodePage(currentActiveMedia.id, epIdx, sIdx)}
            isBookmarked={isBookmarked(currentActiveMedia.id)}
            onToggleBookmark={() => toggleBookmark(currentActiveMedia)}
            onSelectRelated={(relId) => openMediaDetails(relId)}
            allMedia={displayItems}
          />
        ) : (
          /* State 4: Primary Tab Views */
          <>
            {currentTab === 'home' && (
              <HomeView
                displayItems={displayItems}
                movies={movies}
                series={allDisplaySeries}
                channels={liveChannels}
                folders={folders}
                historyItems={watchHistory}
                onSelectMedia={openMediaDetails}
                onPlayMedia={(id) => {
                  const item = displayItems.find((m) => m.id === id);
                  if (item?.type === 'movie') {
                    playMovieDirect(id);
                  } else {
                    openEpisodePage(id, 0, 0);
                  }
                }}
                onSelectLiveChannel={(chId) => {
                  setSelectedLiveChannelId(chId);
                  navigateTo('live');
                }}
                onSelectFolder={(fId) => {
                  setSelectedFolderId(fId);
                  navigateTo('folders');
                }}
                onNavigateTab={navigateTo}
                isBookmarked={isBookmarked}
                onToggleBookmark={toggleBookmark}
                searchQuery={searchQuery}
                isLoading={isLoading}
              />
            )}

            {currentTab === 'movies' && (
              <MoviesView
                movies={movies}
                onSelectMedia={openMediaDetails}
                searchQuery={searchQuery}
              />
            )}

            {currentTab === 'series' && (
              <SeriesView
                series={allDisplaySeries}
                onSelectMedia={openMediaDetails}
                searchQuery={searchQuery}
              />
            )}

            {currentTab === 'live' && (
              <LiveChannelsView
                channels={liveChannels}
                initialChannelId={selectedLiveChannelId}
              />
            )}

            {currentTab === 'folders' && (
              <FoldersView
                folders={folders}
                allMedia={displayItems}
                onSelectMedia={openMediaDetails}
              />
            )}

            {currentTab === 'watchlist' && (
              <WatchlistView
                watchlistItems={bookmarkedItems}
                historyItems={watchHistory}
                onSelectMedia={openMediaDetails}
                onClearHistory={() => setWatchHistory([])}
                onRemoveBookmark={(id) => {
                  setWatchlistIds((prev) => prev.filter((i) => i !== id));
                }}
              />
            )}
          </>
        )}
      </main>

      {/* Firebase Database Connection Modal (Read-Only Guarantee) */}
      <FirebaseModal
        isOpen={isFirebaseModalOpen}
        onClose={() => setIsFirebaseModalOpen(false)}
        status={firebaseStatus}
        onRefresh={loadData}
      />

      {/* Global Footer with Sitemap & Branding */}
      <Footer
        onNavigate={navigateTo}
        mediaCount={rawMedia.length}
      />
    </div>
  );
}
