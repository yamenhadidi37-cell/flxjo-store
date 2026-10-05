export type MediaType = 'movie' | 'tv' | 'anime';

export interface Episode {
  title: string;
  videoUrl: string;
  hidden?: boolean;
  duration?: string;
  thumbnail?: string;
  episodeNumber?: number;
  overview?: string;
}

export interface MediaItem {
  id: string;
  title: string;
  type: MediaType;
  posterUrl: string;
  backdropUrl?: string;
  category: string; // e.g. egyptian, turkish, syrian, foreign, anime, action, drama, comedy, etc.
  
  // Magic fields for series linking:
  parentSeries?: string;
  seasonName?: string;
  hidden?: boolean;
  
  videoUrl?: string;
  episodes?: Episode[];
  folderId?: string;
  
  // Editorial and SEO fields:
  year?: number | string;
  rating?: number | string;
  story?: string;
  cast?: string[];
  duration?: string;
  quality?: string;
  views?: number;
  createdAt?: string;
}

export interface ConsolidatedSeries {
  id: string;
  title: string;
  type: MediaType;
  posterUrl: string;
  backdropUrl?: string;
  category: string;
  year?: number | string;
  rating?: number | string;
  story?: string;
  folderId?: string;
  totalEpisodesCount: number;
  quality?: string;
  views?: number;
  cast?: string[];
  videoUrl?: string;
  seasonName?: string;
  episodes?: Episode[];
  seasons: {
    seasonName: string;
    mediaId: string;
    episodes: Episode[];
    posterUrl?: string;
  }[];
}

export interface LiveChannel {
  id: string;
  name: string;
  logoUrl: string;
  streamUrl: string;
  category: string; // sports, news, entertainment, movies, kids
  quality?: string;
  currentProgram?: string;
}

export interface FolderItem {
  id: string;
  name: string;
  icon?: string;
  description?: string;
  coverUrl?: string;
  itemCount?: number;
}

export interface WatchHistoryItem {
  mediaId: string;
  episodeIndex?: number;
  seasonIndex?: number;
  title: string;
  subtitle: string;
  posterUrl: string;
  timestamp: number;
  progressPercent: number; // 0 - 100
}
