export interface MediaItem {
  id: number;
  title?: string; // Movies have title
  name?: string;  // TV shows have name
  original_title?: string;
  original_name?: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date?: string;
  first_air_date?: string;
  vote_average: number;
  media_type: 'movie' | 'tv';
  genre_ids: number[];
  popularity: number;
  imdb_id?: string;
  original_language?: string;
  logo_path?: string | null;
  genres?: { id: number; name: string }[];
  recommendations?: { results: MediaItem[] };
}

export interface Genre {
  id: number;
  name: string;
}

export interface TVSeason {
  id: number;
  name: string;
  season_number: number;
  episode_count: number;
  poster_path: string | null;
}

export interface TVEpisode {
  id: number;
  name: string;
  overview: string;
  episode_number: number;
  season_number: number;
  air_date: string | null;
  still_path: string | null;
}

export interface UserAlgorithmState {
  genreScores: Record<number, number>; // genreId -> score weight
  searchedGenres: Record<number, number>; // genreId -> count
  watchedIds: number[]; // mediaIds watched
  likedIds: number[]; // mediaIds liked
  dislikedIds: number[]; // mediaIds disliked
  searchKeywords: string[];
  animeBoost: number; // custom weight multiplier for Animation/Anime content
  dislikedGenresCount?: Record<number, number>; // genreId -> count of dislikes
  shortWatchCount?: Record<number, number>; // genreId -> count of quick exits
  completedIds?: number[]; // list of fully completed media items
}

export interface StreamingServer {
  id: string;
  name: string;
  url: string;
  icon: string;
  description: string;
  badge?: string;
}

export interface WatchHistoryItem {
  id: number;
  title: string;
  poster_path: string | null;
  media_type: 'movie' | 'tv';
  watchedAt: string;
  season?: number;
  episode?: number;
  progress_seconds?: number;
  duration_seconds?: number;
  watch_percentage?: number;
  status?: 'watching' | 'completed' | 'abandoned';
}
