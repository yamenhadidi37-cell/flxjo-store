import { MediaItem, UserAlgorithmState, WatchHistoryItem } from '../types';
import { getGenreName } from './tmdb';

// Local storage key constants
const PROFILES_KEY = 'flxjo_profiles_table';
const WATCH_HISTORY_KEY = 'flxjo_watch_history_table';
const USER_INTERACTIONS_KEY = 'flxjo_user_interactions_table';

/**
 * 1. COLD START STRATEGY: Time-Based Context Detection
 * Detects whether it is weekend (Friday/Saturday/Sunday) or weekday evening (6 PM - 4 AM)
 * to return custom genre score offsets for first-time visitors.
 */
export interface TimeContext {
  isWeekend: boolean;
  isWeekdayEvening: boolean;
  boostedGenres: Record<number, number>;
  descriptionEn: string;
  descriptionAr: string;
}

export function getTimeBasedContext(): TimeContext {
  const now = new Date();
  const day = now.getDay(); // 0: Sunday, 1: Monday, ..., 5: Friday, 6: Saturday
  const hour = now.getHours();

  // Weekend check: Friday, Saturday, Sunday
  const isWeekend = day === 5 || day === 6 || day === 0;
  // Weekday Evening check: Mon-Thu between 6 PM (18:00) and 4 AM (04:00)
  const isWeekdayEvening = !isWeekend && (hour >= 18 || hour < 4);

  const boostedGenres: Record<number, number> = {};

  let descriptionEn = "Normal hours baseline recommendations active.";
  let descriptionAr = "ترشيحات الأوقات العادية نشطة حالياً.";

  if (isWeekend) {
    // Weekends: Boost blockbusters, high-energy, action, sci-fi, comedy, adventure, fantasy
    boostedGenres[28] = 15;    // Action
    boostedGenres[12] = 12;    // Adventure
    boostedGenres[35] = 10;    // Comedy
    boostedGenres[878] = 15;   // Sci-Fi
    boostedGenres[14] = 10;    // Fantasy
    boostedGenres[27] = 10;    // Horror
    descriptionEn = "Weekend High-Energy Mode active! Prioritizing Action, Sci-Fi, and Blockbuster comedies 🍿⚡";
    descriptionAr = "نمط عطلة نهاية الأسبوع منشط! نوصي بأفلام الحركة، الخيال العلمي، والكوميديا 🍿⚡";
  } else if (isWeekdayEvening) {
    // Weekday Evening: Boost lighter, dramatic, documentaries, documentaries, crime, thriller
    boostedGenres[18] = 15;    // Drama
    boostedGenres[99] = 15;    // Documentary
    boostedGenres[80] = 12;    // Crime
    boostedGenres[53] = 10;    // Thriller
    descriptionEn = "Weekday Evening Mode active! Prioritizing Drama, Crime, and fascinating Documentaries 🌙🎬";
    descriptionAr = "نمط أمسيات وسط الأسبوع منشط! نوصي بالدراما، الجريمة، والوثائقيات الشيقة 🌙🎬";
  }

  return {
    isWeekend,
    isWeekdayEvening,
    boostedGenres,
    descriptionEn,
    descriptionAr,
  };
}

/**
 * Default preferences baseline
 */
const DEFAULT_GENRE_SCORES: Record<number, number> = {
  28: 10,    // Action (أكشن)
  12: 10,    // Adventure (مغامرة)
  16: 6,     // Animation / Anime (أنمي)
  35: 10,    // Comedy (كوميدي)
  80: 10,    // Crime (جريمة)
  99: 5,     // Documentary (وثائقي)
  18: 10,    // Drama (دراما)
  10751: 5,  // Family (عائلي)
  14: 10,    // Fantasy (خيالي)
  27: 10,    // Horror (رعب)
  878: 10,   // Sci-Fi (خيال علمي)
  53: 10,    // Thriller (إثارة)
};

/**
 * Structure of our simulated User Interactions Table matching database schema
 */
export interface UserInteractionsTable {
  userId: string;
  genreScores: Record<number, number>; // Maps to genre_preferences in DB
  watchTimeWeights: Record<number, number>; // Maps to watch_time_weights in DB
  searchHistory: string[]; // Maps to search_history in DB
  hoverHistory: Record<number, number>; // media_id -> count of hover interactions
  impressions: Record<number, number>; // media_id -> view impressions
  clicks: Record<number, number>;      // media_id -> click count
  lastInteractionTime: Record<number, string>; // media_id -> ISO timestamp for recency decay
  lastWatchedId?: number;
  animeBoost: number;
}

/**
 * Retrieves the current personalization interactions table from localStorage
 */
export function getAlgorithmState(): UserAlgorithmState {
  const interactions = getUserInteractions();
  return {
    genreScores: interactions.genreScores,
    searchedGenres: {},
    watchedIds: getWatchHistory().map(h => h.id),
    likedIds: JSON.parse(localStorage.getItem('flxjo_liked_ids') || '[]'),
    dislikedIds: JSON.parse(localStorage.getItem('flxjo_disliked_ids') || '[]'),
    searchKeywords: interactions.searchHistory,
    animeBoost: interactions.animeBoost,
    completedIds: getWatchHistory().filter(h => h.status === 'completed').map(h => h.id),
  };
}

/**
 * Saves state back to keep compatibility with older files
 */
export function saveAlgorithmState(state: UserAlgorithmState) {
  const interactions = getUserInteractions();
  interactions.genreScores = state.genreScores;
  interactions.searchHistory = state.searchKeywords;
  interactions.animeBoost = state.animeBoost;
  saveUserInteractions(interactions);
  localStorage.setItem('flxjo_liked_ids', JSON.stringify(state.likedIds));
  localStorage.setItem('flxjo_disliked_ids', JSON.stringify(state.dislikedIds));
}

/**
 * Resets entire taste state
 */
export function resetAlgorithmState(): UserAlgorithmState {
  localStorage.removeItem(USER_INTERACTIONS_KEY);
  localStorage.removeItem(WATCH_HISTORY_KEY);
  localStorage.removeItem('flxjo_liked_ids');
  localStorage.removeItem('flxjo_disliked_ids');
  
  // Set up fresh profile
  const userId = getOrCreateUserId();
  const interactions: UserInteractionsTable = {
    userId,
    genreScores: { ...DEFAULT_GENRE_SCORES },
    watchTimeWeights: {},
    searchHistory: [],
    hoverHistory: {},
    impressions: {},
    clicks: {},
    lastInteractionTime: {},
    animeBoost: 0.5,
  };
  saveUserInteractions(interactions);
  return getAlgorithmState();
}

/**
 * Gets or creates a unique simulated user ID in the profiles table
 */
export function getOrCreateUserId(): string {
  try {
    let profiles = localStorage.getItem(PROFILES_KEY);
    let parsedProfiles = profiles ? JSON.parse(profiles) : [];
    
    // Find active profile or create a default one
    let activeProfile = parsedProfiles.find((p: any) => p.isActive === true);
    if (!activeProfile) {
      activeProfile = {
        id: 'user-' + Math.random().toString(36).substring(2, 11),
        username: 'Cinephile' + Math.floor(100 + Math.random() * 900),
        email: 'hadidiyamen2@gmail.com',
        countryCode: 'JO',
        countryName: 'Jordan',
        isActive: true,
        createdAt: new Date().toISOString()
      };
      parsedProfiles.push(activeProfile);
      localStorage.setItem(PROFILES_KEY, JSON.stringify(parsedProfiles));
    }
    return activeProfile.id;
  } catch (e) {
    return 'user-default-123';
  }
}

/**
 * Gets User Profile Details
 */
export function getUserProfile() {
  try {
    const profiles = JSON.parse(localStorage.getItem(PROFILES_KEY) || '[]');
    return profiles.find((p: any) => p.isActive === true) || {
      username: 'Guest Cinephile',
      countryCode: 'JO',
      countryName: 'Jordan'
    };
  } catch (e) {
    return { username: 'Guest Cinephile', countryCode: 'JO', countryName: 'Jordan' };
  }
}

/**
 * Loads user interactions table or bootstraps it
 */
export function getUserInteractions(): UserInteractionsTable {
  try {
    const saved = localStorage.getItem(USER_INTERACTIONS_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      // Validate schema
      return {
        userId: parsed.userId || getOrCreateUserId(),
        genreScores: parsed.genreScores || { ...DEFAULT_GENRE_SCORES },
        watchTimeWeights: parsed.watchTimeWeights || {},
        searchHistory: parsed.searchHistory || [],
        hoverHistory: parsed.hoverHistory || {},
        impressions: parsed.impressions || {},
        clicks: parsed.clicks || {},
        lastInteractionTime: parsed.lastInteractionTime || {},
        lastWatchedId: parsed.lastWatchedId,
        animeBoost: parsed.animeBoost !== undefined ? parsed.animeBoost : 0.5,
      };
    }
  } catch (e) {}

  const defaultInteractions: UserInteractionsTable = {
    userId: getOrCreateUserId(),
    genreScores: { ...DEFAULT_GENRE_SCORES },
    watchTimeWeights: {},
    searchHistory: [],
    hoverHistory: {},
    impressions: {},
    clicks: {},
    lastInteractionTime: {},
    animeBoost: 0.5,
  };
  saveUserInteractions(defaultInteractions);
  return defaultInteractions;
}

export function saveUserInteractions(table: UserInteractionsTable) {
  try {
    localStorage.setItem(USER_INTERACTIONS_KEY, JSON.stringify(table));
  } catch (e) {
    console.error('Failed to save interactions table:', e);
  }
}

/**
 * Checks if a genre is completely filtered out (disabled completely per user request)
 */
export function isGenreHidden(genreId: number, state?: UserAlgorithmState): boolean {
  return false;
}

/**
 * Adjust genre scores helper
 */
function adjustGenreScores(genres: number[], diff: number, interactions: UserInteractionsTable) {
  genres.forEach(id => {
    const score = interactions.genreScores[id] !== undefined ? interactions.genreScores[id] : 10;
    interactions.genreScores[id] = Math.max(-50, Math.min(200, score + diff));
  });
}

/**
 * 2. REAL-TIME EVENT: Track Card Impression
 */
export function trackImpression(mediaId: number) {
  const interactions = getUserInteractions();
  interactions.impressions[mediaId] = (interactions.impressions[mediaId] || 0) + 1;
  saveUserInteractions(interactions);
}

/**
 * 2. REAL-TIME EVENT: Track Card Click CTR
 */
export function trackClick(mediaId: number) {
  const interactions = getUserInteractions();
  interactions.clicks[mediaId] = (interactions.clicks[mediaId] || 0) + 1;
  interactions.lastInteractionTime[mediaId] = new Date().toISOString();
  saveUserInteractions(interactions);
}

/**
 * 2. REAL-TIME EVENT: Hover Tracking (Micro-Interest)
 * Triggered on cursor hover > 3 seconds. Adds subtle genre boosts.
 */
export function trackHover(item: MediaItem) {
  const interactions = getUserInteractions();
  interactions.hoverHistory[item.id] = (interactions.hoverHistory[item.id] || 0) + 1;
  interactions.lastInteractionTime[item.id] = new Date().toISOString();
  
  // Micro-interest boost: add +3 to genres
  adjustGenreScores(item.genre_ids || [], 3, interactions);
  saveUserInteractions(interactions);
}

/**
 * 2. REAL-TIME EVENT: Interactive Watch Time Percentage Progress Tracking
 * Penalizes accidental quick bounces (< 2 mins) and rewards long sessions (> 10%, > 70%).
 */
export interface WatchProgressResult {
  watchPercentage: number;
  messageEn: string;
  messageAr: string;
  scoreChange: number;
}

export function trackWatchProgress(
  item: MediaItem, 
  elapsedSeconds: number, 
  durationSeconds: number, 
  season?: number, 
  episode?: number
): WatchProgressResult {
  const interactions = getUserInteractions();
  
  // Save to last watched ID to populate "Because you watched [Title]"
  interactions.lastWatchedId = item.id;

  const watchPercentage = Math.min(100, Math.round((elapsedSeconds / durationSeconds) * 100));
  let scoreChange = 0;
  let status: 'watching' | 'completed' | 'abandoned' = 'watching';
  let messageEn = "";
  let messageAr = "";

  // A. Bouncing Penalty: Accidental click / Disliked (< 2 minutes of play time)
  if (elapsedSeconds < 120 && elapsedSeconds > 0) {
    status = 'abandoned';
    scoreChange = -15; // drop weight
    adjustGenreScores(item.genre_ids || [], scoreChange, interactions);
    
    if (item.genre_ids?.includes(16)) {
      interactions.animeBoost = Math.max(0.1, interactions.animeBoost - 0.25);
    }

    messageEn = `Quick Exit detected (< 2 mins) for "${item.title || item.name}". Decreased weight for matching genres by -15. 🚫📉`;
    messageAr = `تم رصد خروج سريع من البث في أقل من دقيقتين لـ "${item.title || item.name}". تم خفض وزن التصنيف بـ -15 لتنقية واجهتك. 🚫📉`;
  }
  // B. Interested (Watch time percentage > 10% but < 70%)
  else if (watchPercentage >= 10 && watchPercentage < 70) {
    status = 'watching';
    scoreChange = 8; // low positive weight
    adjustGenreScores(item.genre_ids || [], scoreChange, interactions);
    
    if (item.genre_ids?.includes(16)) {
      interactions.animeBoost = Math.min(3.0, interactions.animeBoost + 0.15);
    }

    messageEn = `Active engagement detected (> 10%) on "${item.title || item.name}". Custom suggestion weights increased by +8. 📈✨`;
    messageAr = `تم رصد تفاعل إيجابي (> 10%) مع "${item.title || item.name}". تم رفع ترشيحات هذا التصنيف بمقدار +8. 📈✨`;
  }
  // C. Highly Liked / Completed (Watch time percentage >= 70%)
  else if (watchPercentage >= 70) {
    status = 'completed';
    scoreChange = 35; // Maximum boost
    adjustGenreScores(item.genre_ids || [], scoreChange, interactions);
    
    if (item.genre_ids?.includes(16)) {
      interactions.animeBoost = Math.min(3.0, interactions.animeBoost + 0.5);
    }

    messageEn = `Completion high-affinity detected (> 70%)! Boosted matching genres for "${item.title || item.name}" by maximum weight of +35. 🏆🚀`;
    messageAr = `اكتملت المشاهدة بنجاح (> 70%)! تفعيل مضاعف التفضيل الأقصى لتصنيف "${item.title || item.name}" بزيادة +35. 🏆🚀`;
  }

  saveUserInteractions(interactions);

  // Sync to Simulated Watch History Database Table
  saveToWatchHistoryTable(item, elapsedSeconds, durationSeconds, status, season, episode);

  return {
    watchPercentage,
    messageEn,
    messageAr,
    scoreChange
  };
}

/**
 * 3. HYBRID RECOMMENDATION ALGORITHM MATRIX
 * Ranks all global items applying:
 *  A. Content-Based Genre Weight overlap
 *  B. Collaborative Archetype matching (virtual profiles)
 *  C. Recency Time-decay penalty (older items get lowered priorities)
 */

export interface WatchHistoryTableItem {
  id: number;
  title: string;
  poster_path: string | null;
  media_type: 'movie' | 'tv';
  progress_seconds: number;
  duration_seconds: number;
  watch_percentage: number;
  status: 'watching' | 'completed' | 'abandoned';
  updated_at: string;
  season?: number;
  episode?: number;
}

// Simulated watch history table fetch
export function getWatchHistory(): WatchHistoryTableItem[] {
  try {
    const saved = localStorage.getItem(WATCH_HISTORY_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch (e) {
    return [];
  }
}

function saveToWatchHistoryTable(
  item: MediaItem, 
  progress: number, 
  duration: number, 
  status: 'watching' | 'completed' | 'abandoned',
  season?: number,
  episode?: number
) {
  try {
    const history = getWatchHistory();
    const filtered = history.filter(h => h.id !== item.id);
    
    const watchPct = Math.min(100, Math.round((progress / duration) * 100));

    const newItem: WatchHistoryTableItem = {
      id: item.id,
      title: item.title || item.name || '',
      poster_path: item.poster_path,
      media_type: item.media_type,
      progress_seconds: progress,
      duration_seconds: duration,
      watch_percentage: watchPct,
      status,
      updated_at: new Date().toISOString(),
      season,
      episode
    };

    filtered.unshift(newItem);
    if (filtered.length > 30) filtered.pop();

    localStorage.setItem(WATCH_HISTORY_KEY, JSON.stringify(filtered));
  } catch (e) {
    console.error('Failed to sync watch history table:', e);
  }
}

export function clearWatchHistory() {
  localStorage.removeItem(WATCH_HISTORY_KEY);
}

/**
 * 3-B. COLLABORATIVE FILTERING ARCHETYPE INJECTION
 * Maps user preference score vector to 4 Virtual Archetypes, returning collaborative recommendations.
 */
interface Archetype {
  nameEn: string;
  nameAr: string;
  genreVector: Record<number, number>;
  recommendedKeyword: string;
}

const COLLABORATIVE_ARCHETYPES: Archetype[] = [
  {
    nameEn: "The Action & Sci-Fi Thrillseeker",
    nameAr: "محب أفلام الحركة والإثارة",
    genreVector: { 28: 40, 878: 40, 53: 35, 12: 30 },
    recommendedKeyword: "action sci-fi thriller blockbusters"
  },
  {
    nameEn: "The Otaku Anime Aficionado",
    nameAr: "محب الأنمي والكرتون الياباني",
    genreVector: { 16: 60, 14: 40, 12: 20 },
    recommendedKeyword: "anime animated masterpiece fantasy"
  },
  {
    nameEn: "The Cinephile & Drama Intellectual",
    nameAr: "عاشق الدراما والوثائقيات",
    genreVector: { 18: 50, 99: 45, 80: 30 },
    recommendedKeyword: "biography drama documentary award-winning"
  },
  {
    nameEn: "The Romance & Lighthearted Comedy Fan",
    nameAr: "محب الكوميديا والقصص الخفيفة",
    genreVector: { 35: 45, 10751: 40 },
    recommendedKeyword: "comedy romantic family-friendly drama"
  }
];

export function getClosestUserArchetype(): Archetype {
  const interactions = getUserInteractions();
  
  let bestArchetype = COLLABORATIVE_ARCHETYPES[0];
  let highestCosineScore = -1.0;

  // Compute Jaccard/Dot overlap with each archetype profile
  COLLABORATIVE_ARCHETYPES.forEach((arch) => {
    let dotProduct = 0;
    let userNorm = 0;
    let archNorm = 0;

    // Calculate alignment
    Object.keys(arch.genreVector).forEach((key) => {
      const gid = Number(key);
      const uVal = interactions.genreScores[gid] !== undefined ? interactions.genreScores[gid] : 10;
      const aVal = arch.genreVector[gid];

      dotProduct += uVal * aVal;
      userNorm += uVal * uVal;
      archNorm += aVal * aVal;
    });

    const cosineSim = userNorm && archNorm ? dotProduct / (Math.sqrt(userNorm) * Math.sqrt(archNorm)) : 0;
    if (cosineSim > highestCosineScore) {
      highestCosineScore = cosineSim;
      bestArchetype = arch;
    }
  });

  return bestArchetype;
}

/**
 * 3-C. RECENCY TIME DECAY VECTOR
 * Multiplies an item's score by an exponential decay formula based on the last click/interaction age.
 */
export function calculateTimeDecayFactor(mediaId: number, lastInterTime: Record<number, string>): number {
  const interactionISO = lastInterTime[mediaId];
  if (!interactionISO) return 1.0; // No interaction yet, standard priority

  const lastTime = new Date(interactionISO);
  const diffTimeMs = Math.abs(new Date().getTime() - lastTime.getTime());
  const diffDays = diffTimeMs / (1000 * 60 * 60 * 24);

  // Time decay factor formula: W_decay = e^(-0.1 * days)
  // Ensures content watched or clicked days ago naturally fades to let new suggestions surface
  return Math.max(0.2, Math.exp(-0.1 * diffDays));
}

/**
 * Rank All Media items using standard popularity (completely neutral and clean, no personal tracking bias)
 */
export function rankMediaItems(items: MediaItem[]): MediaItem[] {
  return [...items].sort((a, b) => b.popularity - a.popularity);
}

/**
 * Action handles kept for backward-compatibility
 */
export function handleLikeAction(item: MediaItem): UserAlgorithmState {
  const disliked = JSON.parse(localStorage.getItem('flxjo_disliked_ids') || '[]');
  const liked = JSON.parse(localStorage.getItem('flxjo_liked_ids') || '[]');

  const nextDisliked = disliked.filter((id: any) => id !== item.id);
  if (!liked.includes(item.id)) liked.push(item.id);

  localStorage.setItem('flxjo_disliked_ids', JSON.stringify(nextDisliked));
  localStorage.setItem('flxjo_liked_ids', JSON.stringify(liked));

  return getAlgorithmState();
}

export function handleDislikeAction(item: MediaItem): UserAlgorithmState {
  const disliked = JSON.parse(localStorage.getItem('flxjo_disliked_ids') || '[]');
  const liked = JSON.parse(localStorage.getItem('flxjo_liked_ids') || '[]');

  const nextLiked = liked.filter((id: any) => id !== item.id);
  if (!disliked.includes(item.id)) disliked.push(item.id);

  localStorage.setItem('flxjo_disliked_ids', JSON.stringify(disliked));
  localStorage.setItem('flxjo_liked_ids', JSON.stringify(nextLiked));

  return getAlgorithmState();
}

export function handleWatchAction(item: MediaItem, season?: number, episode?: number): UserAlgorithmState {
  // Sync to Simulated Watch History Database Table purely for resuming playback progress
  saveToWatchHistoryTable(item, 10, 3600, 'watching', season, episode);
  return getAlgorithmState();
}

export function handleShortWatchAction(item: MediaItem): UserAlgorithmState {
  return getAlgorithmState();
}

export function handleCompleteWatchAction(item: MediaItem): UserAlgorithmState {
  return getAlgorithmState();
}

export function handleSearchAction(query: string, results: MediaItem[]): UserAlgorithmState {
  return getAlgorithmState();
}

/**
 * 4. USER FAVORITES SYSTEM
 * Allows saving items to a custom list saved persistently in localStorage.
 */
export function getFavorites(): number[] {
  try {
    const saved = localStorage.getItem('flxjo_favorite_ids');
    return saved ? JSON.parse(saved) : [];
  } catch (e) {
    return [];
  }
}

export function getFavoriteItems(): MediaItem[] {
  try {
    const saved = localStorage.getItem('flxjo_favorite_items');
    return saved ? JSON.parse(saved) : [];
  } catch (e) {
    return [];
  }
}

export function toggleFavorite(item: MediaItem): boolean {
  try {
    const favs = getFavorites();
    const favItems = getFavoriteItems();
    
    const idx = favs.indexOf(item.id);
    let isFav = false;
    if (idx > -1) {
      favs.splice(idx, 1);
      const newItems = favItems.filter((i: MediaItem) => i.id !== item.id);
      localStorage.setItem('flxjo_favorite_items', JSON.stringify(newItems));
      isFav = false;
    } else {
      favs.push(item.id);
      // Double check it's not already in items
      if (!favItems.some((i: MediaItem) => i.id === item.id)) {
        favItems.push(item);
      }
      localStorage.setItem('flxjo_favorite_items', JSON.stringify(favItems));
      isFav = true;
    }
    localStorage.setItem('flxjo_favorite_ids', JSON.stringify(favs));
    return isFav;
  } catch (e) {
    return false;
  }
}

export function isFavorite(mediaId: number): boolean {
  return getFavorites().includes(mediaId);
}

/**
 * Genre breakdown stats calculator for our analytical panel
 */
export interface GenreBreakdown {
  id: number;
  name: string;
  score: number;
  percentage: number;
}

export function computeGenreBreakdown(): GenreBreakdown[] {
  const interactions = getUserInteractions();
  const genres = Object.keys(interactions.genreScores).map(Number);

  let min = 0;
  let max = 1;

  genres.forEach(g => {
    const val = interactions.genreScores[g];
    if (val < min) min = val;
    if (val > max) max = val;
  });

  const range = max - min || 1;

  const result = genres.map(g => {
    const raw = interactions.genreScores[g];
    const percentage = Math.round(((raw - min) / range) * 90) + 10;
    return {
      id: g,
      name: getGenreName(g),
      score: raw,
      percentage,
    };
  });

  return result.sort((a, b) => b.percentage - a.percentage);
}

/**
 * Returns user's top favorite genre IDs sorted by score descending
 */
export function getTopFavoriteGenres(): { id: number; name: string; score: number }[] {
  const interactions = getUserInteractions();
  const breakdown = computeGenreBreakdown();
  
  // Genres with score higher than baseline default of 10
  const boosted = breakdown.filter(b => (interactions.genreScores[b.id] || 10) > 11);
  return boosted.slice(0, 3);
}
