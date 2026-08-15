import { MediaItem, Genre, TVEpisode, TVSeason } from '../types';
import { getBlockedMediaInfo } from './blocklist';
import { normalizeQuery, calculateMatchScore, parseDirectQuery } from './searchNormalization';

export const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p';

/**
 * Checks if a media item contains adult or explicit sexual content.
 */
export function isAdultContent(item: any): boolean {
  if (!item) return false;
  
  // Fulfill user request to never completely hide blocked/restricted Islamic-themed or censored media (so they display with custom warnings instead of silent omission)
  if (getBlockedMediaInfo(item.id, item.title || item.name)) return false;
  
  // 1. Native TMDB adult classification
  if (item.adult === true) return true;
  
  // 2. Extra rating / certification checks if available
  const certification = String(item.certification || item.content_rating || '').toUpperCase();
  if (
    certification.includes('R') || 
    certification.includes('NC-17') || 
    certification.includes('TV-MA') || 
    certification.includes('18+') || 
    certification.includes('18') || 
    certification === 'X' || 
    certification === 'XXX'
  ) {
    return true;
  }
  
  // 3. Extra keyword matching for absolute safety
  const adultKeywords = [
    'porn', 'xxx', 'erotic', 'sex', 'sensual', 'nudity', 'nude', 'nsfw', 'adult movie',
    'erotica', 'lust', 'seduction', 'sexy', 'striptease', 'playboy', 'kamasutra', 'provocative', 
    'orgasm', 'naked', 'unrated', 'uncut', '18+', 'r-rated', 'half-naked', 'scantily', 'boudoir',
    'جنسي', 'جنس', 'اباحي', 'إباحي', 'إباحية', 'بورن', 'سكس', 'مثيرة للشهوة', 'عاري', 'عري', 'إغراء', 
    'للكبار فقط', '+18', '18+', 'شاذ', 'شذوذ', 'عاهرة', 'دعارة', 'عارية', 'عاريات', 'فاحش', 'إباحية'
  ];
  
  const title = (item.title || item.name || '').toLowerCase();
  const overview = (item.overview || '').toLowerCase();
  
  for (const kw of adultKeywords) {
    if (title.includes(kw) || overview.includes(kw)) {
      // Precise boundaries to prevent false positives (e.g. "section", "essex", "sexuality" is usually okay, but "sex" is dangerous)
      if (kw === 'sex' && !(/\bsex\b/.test(title) || /\bsex\b/.test(overview))) continue;
      if (kw === 'nude' && !(/\bnude\b/.test(title) || /\bnude\b/.test(overview))) continue;
      return true;
    }
  }
  
  return false;
}

/**
 * Filters out all adult and explicit sexual content from an array of media items.
 */
export function filterAdultContent(items: MediaItem[]): MediaItem[] {
  if (!items) return [];
  return items.filter(item => !isAdultContent(item)).map(item => {
    if (getBlockedMediaInfo(item.id, item.title || item.name)) {
      return {
        ...item,
        vote_average: 0
      };
    }
    return item;
  });
}

// Pre-defined fallback names for genres in Arabic, just in case
export const MOVIE_GENRES_ARABIC: Record<number, string> = {
  28: 'أكشن',
  12: 'مغامرة',
  16: 'أنمي ورسوم متحركة',
  35: 'كوميدي',
  80: 'جريمة',
  99: 'وثائقي',
  18: 'دراما',
  10751: 'عائلي',
  14: 'خيالي',
  36: 'تاريخي',
  27: 'رعب',
  10402: 'موسيقى',
  9648: 'غموض',
  10749: 'رومانسية',
  878: 'خيال علمي',
  10770: 'تلفزيوني',
  53: 'إثارة',
  10752: 'حرب',
  37: 'غرب أمريكي',
  10759: 'أكشن ومغامرة (مسلسلات)',
  10762: 'أطفال',
  10763: 'أخبار',
  10764: 'واقعي',
  10765: 'خيال وعلمي (مسلسلات)',
  10766: 'دراما طويلة',
  10767: 'حواري',
  10768: 'حرب وسياسة'
};

export const MOVIE_GENRES_ENGLISH: Record<number, string> = {
  28: 'Action',
  12: 'Adventure',
  16: 'Animation & Anime',
  35: 'Comedy',
  80: 'Crime',
  99: 'Documentary',
  18: 'Drama',
  10751: 'Family',
  14: 'Fantasy',
  36: 'History',
  27: 'Horror',
  10402: 'Music',
  9648: 'Mystery',
  10749: 'Romance',
  878: 'Science Fiction',
  10770: 'TV Movie',
  53: 'Thriller',
  10752: 'War',
  37: 'Western',
  10759: 'Action & Adventure',
  10762: 'Kids',
  10763: 'News',
  10764: 'Reality',
  10765: 'Sci-Fi & Fantasy',
  10766: 'Soap',
  10767: 'Talk',
  10768: 'War & Politics'
};

export function getTMDBLanguage(): 'ar-SA' | 'en-US' {
  if (typeof window === 'undefined') return 'ar-SA';
  const code = localStorage.getItem('flxjo_lang_code');
  return code === 'en' ? 'en-US' : 'ar-SA';
}

/**
 * Fetch helper to centralize requests and API Key injection
 */
// In-memory cache for TMDB API responses to prevent hammering and 429 errors
const tmdbCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 15 * 60 * 1000; // Cache valid for 15 minutes

// In-flight request tracker to deduplicate simultaneous duplicate requests
const inFlightRequests = new Map<string, Promise<any>>();

/**
 * Fetch helper to centralize requests and API Key injection
 */
async function fetchFromTMDB(endpoint: string, params: Record<string, string> = {}): Promise<any> {
  let currentLanguage = getTMDBLanguage();

  // Enforce English (en-US) for list/popular/discover/trending queries to guarantee 100% unified global blockbuster items list
  const isListEndpoint = 
    endpoint.includes('/popular') || 
    endpoint.includes('/trending') || 
    endpoint.includes('/discover/');
    
  if (isListEndpoint && !params.language) {
    currentLanguage = 'en-US';
  }

  const queryParams = new URLSearchParams({
    endpoint,
    language: currentLanguage,
    ...params,
  });

  const cacheKey = `${endpoint}?${queryParams.toString()}`;

  // 1. Check in-memory cache first
  const cached = tmdbCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  // 2. Check if there's already an active identical request
  if (inFlightRequests.has(cacheKey)) {
    return inFlightRequests.get(cacheKey);
  }

  // 3. Define the actual fetch operation with retries & exponential backoff via backend proxy
  const fetchWithRetry = async (): Promise<any> => {
    let attempt = 0;
    const maxAttempts = 4;
    let currentDelay = 800;

    while (attempt < maxAttempts) {
      try {
        let response = await fetch(`/api/tmdb?${queryParams.toString()}`);

        if (response.status === 404) {
          // If proxy is not available or in static SPA deployment, fallback directly to TMDB API
          const directParams = new URLSearchParams({
            api_key: 'c714ec95383c51abcde6afdf2e1571b9',
            language: currentLanguage,
            include_adult: 'false',
            ...params,
          });
          response = await fetch(`https://api.themoviedb.org/3${endpoint}?${directParams.toString()}`);
        }

        if (response.status === 429) {
          attempt++;
          const retryAfterHeader = response.headers.get('Retry-After');
          let delayMs = retryAfterHeader ? parseInt(retryAfterHeader, 10) * 1000 : currentDelay;
          if (isNaN(delayMs) || delayMs <= 0) {
            delayMs = currentDelay;
          }
          delayMs += Math.random() * 300;
          await new Promise((resolve) => setTimeout(resolve, delayMs));
          currentDelay *= 2;
          continue;
        }

        if (!response.ok) {
          // Fallback to English if Arabic localized info is not available
          if (currentLanguage === 'ar-SA' && !params.language) {
            const fallbackParams = { ...params, language: 'en-US' };
            return fetchFromTMDB(endpoint, fallbackParams);
          }
          throw new Error(`TMDB Proxy Error: ${response.status}`);
        }

        const data = await response.json();
        tmdbCache.set(cacheKey, { data, timestamp: Date.now() });
        return data;
      } catch (error) {
        attempt++;
        if (attempt >= maxAttempts) {
          console.error(`Error fetching from TMDB endpoint ${endpoint}:`, error);
          return null;
        }
        await new Promise((resolve) => setTimeout(resolve, currentDelay));
        currentDelay *= 1.5;
      }
    }
    return null;
  };

  const promise = fetchWithRetry().finally(() => {
    inFlightRequests.delete(cacheKey);
  });

  inFlightRequests.set(cacheKey, promise);
  return promise;
}

/**
 * Gets poster image URL with width configuration
 */
export function getPosterUrl(path: string | null, size: 'w92' | 'w342' | 'w500' | 'original' = 'w500'): string {
  if (!path) {
    // Beautiful SVG placeholder styled with Arabic "لا يوجد بوستر"
    return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="500" height="750" viewBox="0 0 500 750" style="background:%23111; font-family:sans-serif;"><rect width="100%" height="100%" fill="%231a1a1a"/><text x="50%" y="45%" dominant-baseline="middle" text-anchor="middle" fill="%23666" font-size="24" font-weight="bold">فلكس جو - FLXJO</text><text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" fill="%23444" font-size="18">لا تتوفر صورة غلاف</text></svg>`;
  }
  return `${IMAGE_BASE_URL}/${size}${path}`;
}

/**
 * Gets backdrop image URL
 */
export function getBackdropUrl(path: string | null, size: 'w780' | 'original' = 'original'): string {
  if (!path) {
    return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720" style="background:%23050505;"><rect width="100%" height="100%" fill="%23050505"/><line x1="0" y1="0" x2="1280" y2="720" stroke="%23111" stroke-width="2"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%23E50914" font-size="36" font-weight="bold">FLXJO</text></svg>`;
  }
  return `${IMAGE_BASE_URL}/${size}${path}`;
}

/**
 * Fetch Popular Movies and TV Shows merged together to make an attractive trending dashboard
 */
export async function getTrendingMedia(page = 1): Promise<MediaItem[]> {
  const [moviesRes, tvRes] = await Promise.all([
    fetchFromTMDB('/movie/popular', { page: String(page) }),
    fetchFromTMDB('/tv/popular', { page: String(page) }),
  ]);

  const movies: MediaItem[] = (moviesRes?.results || []).map((item: any) => ({
    ...item,
    media_type: 'movie',
  }));

  const tvShows: MediaItem[] = (tvRes?.results || []).map((item: any) => ({
    ...item,
    media_type: 'tv',
  }));

  // Interleave movies and tv shows to create a diverse feed, sorted by popularity, and filter adult/explicit content
  const merged = [...movies, ...tvShows];
  return filterAdultContent(merged).sort((a, b) => b.popularity - a.popularity);
}

/**
 * Multi search across Movies and TV series with Arabic normalization and fuzzy scoring
 */
export async function searchMedia(query: string, page = 1): Promise<MediaItem[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  // Check if user pasted direct URL or numeric ID
  const direct = parseDirectQuery(trimmed);
  if (direct.isDirect && direct.id) {
    try {
      if (direct.type === 'tv') {
        const tvItem = await getTVShowDetails(direct.id);
        if (tvItem) return [tvItem];
      } else {
        const movieItem = await getMovieDetails(direct.id);
        if (movieItem) return [movieItem];
      }
    } catch (e) {
      // Fall back to standard search
    }
  }

  // Primary search with current user language
  const primaryPromise = fetchFromTMDB('/search/multi', { query: trimmed, page: String(page) });
  
  // Secondary English search if primary search is Arabic
  const isArabicQuery = /[\u0600-\u06FF]/.test(trimmed);
  const normalizedQuery = normalizeQuery(trimmed);

  const [primaryRes, fallbackRes] = await Promise.all([
    primaryPromise,
    (isArabicQuery && normalizedQuery !== trimmed)
      ? fetchFromTMDB('/search/multi', { query: normalizedQuery, page: String(page) })
      : Promise.resolve(null)
  ]);

  const rawResults = [
    ...(primaryRes?.results || []),
    ...(fallbackRes?.results || [])
  ];

  // Deduplicate by ID
  const seenIds = new Set<number>();
  const uniqueItems: any[] = [];
  for (const item of rawResults) {
    if (item && item.id && !seenIds.has(item.id)) {
      seenIds.add(item.id);
      uniqueItems.push(item);
    }
  }

  const parsed = uniqueItems
    .filter((item: any) => item.media_type === 'movie' || item.media_type === 'tv')
    .map((item: any) => ({
      ...item,
      title: item.title || item.name,
    }));

  const filtered = filterAdultContent(parsed);

  // Score and sort by relevance match score first, then popularity
  return filtered.sort((a, b) => {
    const scoreA = calculateMatchScore(a.title || a.name || '', a.original_title || a.original_name, a.overview, trimmed);
    const scoreB = calculateMatchScore(b.title || b.name || '', b.original_title || b.original_name, b.overview, trimmed);
    
    if (Math.abs(scoreA - scoreB) > 10) {
      return scoreB - scoreA;
    }
    return (b.popularity || 0) - (a.popularity || 0);
  });
}

/**
 * Fast suggestions helper for the live instant search bar (returns top 6 matches instantly)
 */
export async function getFastSuggestions(query: string, limit = 6): Promise<MediaItem[]> {
  const trimmed = query.trim();
  if (!trimmed || trimmed.length < 2) return [];

  try {
    const results = await searchMedia(trimmed, 1);
    return results.slice(0, limit);
  } catch (e) {
    console.error('Error fetching search suggestions:', e);
    return [];
  }
}

/**
 * Fetch media by specific genre ID
 */
export async function getMediaByGenre(genreId: number, type: 'movie' | 'tv' = 'movie', page = 1): Promise<MediaItem[]> {
  const response = await fetchFromTMDB(`/discover/${type}`, {
    with_genres: String(genreId),
    sort_by: 'popularity.desc',
    page: String(page),
  });

  if (!response || !response.results) return [];

  const parsed = response.results.map((item: any) => ({
    ...item,
    media_type: type,
  }));

  return filterAdultContent(parsed);
}

/**
 * Helper to get best transparent logo path from TMDB response
 */
function getBestLogoPath(response: any): string | null {
  if (!response?.images?.logos || response.images.logos.length === 0) {
    return null;
  }
  // Try to find Arabic logo first, then English, then any
  const arLogo = response.images.logos.find((l: any) => l.iso_639_1 === 'ar');
  if (arLogo) return arLogo.file_path;
  
  const enLogo = response.images.logos.find((l: any) => l.iso_639_1 === 'en');
  if (enLogo) return enLogo.file_path;
  
  return response.images.logos[0].file_path;
}

/**
 * Fetch specific details for a movie (with IMDB ID external lookup)
 */
export async function getMovieDetails(id: number): Promise<MediaItem | null> {
  const response = await fetchFromTMDB(`/movie/${id}`, {
    append_to_response: 'external_ids,recommendations,images',
    include_image_language: 'ar,en,null', // fetch logos for these languages
  });

  if (!response || isAdultContent(response)) return null;

  const result: MediaItem = {
    ...response,
    media_type: 'movie',
    imdb_id: response.external_ids?.imdb_id || response.imdb_id,
    logo_path: getBestLogoPath(response),
  };

  if (result.recommendations?.results) {
    result.recommendations.results = filterAdultContent(result.recommendations.results);
  }

  return result;
}

/**
 * Fetch specific details for a TV show (includes seasons and external IDs)
 */
export async function getTVShowDetails(id: number): Promise<any | null> {
  const response = await fetchFromTMDB(`/tv/${id}`, {
    append_to_response: 'external_ids,recommendations,images',
    include_image_language: 'ar,en,null', // fetch logos for these languages
  });

  if (!response || isAdultContent(response)) return null;

  const result = {
    ...response,
    media_type: 'tv',
    imdb_id: response.external_ids?.imdb_id,
    logo_path: getBestLogoPath(response),
    vote_average: Number(id) === 76479 ? 0 : response.vote_average,
  };

  if (result.recommendations?.results) {
    result.recommendations.results = filterAdultContent(result.recommendations.results);
  }

  return result;
}

/**
 * Fetch details of a specific season (including episodes)
 */
export async function getTVSeasonDetails(tvId: number, seasonNumber: number): Promise<TVEpisode[]> {
  const response = await fetchFromTMDB(`/tv/${tvId}/season/${seasonNumber}`);
  if (!response || !response.episodes) return [];
  
  return response.episodes.map((ep: any) => ({
    id: ep.id,
    name: ep.name,
    overview: ep.overview || 'لا يوجد وصف متاح لهذه الحلقة حالياً.',
    episode_number: ep.episode_number,
    season_number: ep.season_number,
    air_date: ep.air_date,
    still_path: ep.still_path,
  }));
}

/**
 * Special anime filter: Animation category (16) with Japanese origins or specific keyword tags
 */
export async function getAnimeList(page = 1): Promise<MediaItem[]> {
  // Let's discover movies and shows with genre 16 (Animation) and country of origin JP (Japan)
  const [moviesRes, tvRes] = await Promise.all([
    fetchFromTMDB('/discover/movie', {
      with_genres: '16',
      with_original_language: 'ja',
      sort_by: 'popularity.desc',
      page: String(page),
    }),
    fetchFromTMDB('/discover/tv', {
      with_genres: '16',
      with_original_language: 'ja',
      sort_by: 'popularity.desc',
      page: String(page),
    })
  ]);

  const animeMovies: MediaItem[] = (moviesRes?.results || []).map((item: any) => ({
    ...item,
    media_type: 'movie',
  }));

  const animeSeries: MediaItem[] = (tvRes?.results || []).map((item: any) => ({
    ...item,
    media_type: 'tv',
  }));

  return filterAdultContent([...animeMovies, ...animeSeries]).sort((a, b) => b.popularity - a.popularity);
}

/**
 * All possible Movie & TV Genres in one dictionary
 */
export function getGenreName(id: number): string {
  const isEn = getTMDBLanguage() === 'en-US';
  if (isEn) {
    return MOVIE_GENRES_ENGLISH[id] || 'Genre';
  }
  return MOVIE_GENRES_ARABIC[id] || 'منوعات';
}

/**
 * Automatically detects the user's country using IP lookup, falling back to Timezone analysis
 */
export async function detectUserCountry(): Promise<{ code: string; name: string }> {
  try {
    // Try reliable JSON IP country service
    const res = await fetch('https://ipwho.is/');
    if (res.ok) {
      const data = await res.json();
      if (data && data.success && data.country_code) {
        return {
          code: data.country_code,
          name: data.country || getCountryArabicName(data.country_code)
        };
      }
    }
  } catch (e) {
    console.warn("Primary IP lookup failed, trying backup...", e);
  }

  try {
    const res2 = await fetch('https://ipapi.co/json/');
    if (res2.ok) {
      const data2 = await res2.json();
      if (data2 && data2.country_code) {
        return {
          code: data2.country_code,
          name: data2.country_name || getCountryArabicName(data2.country_code)
        };
      }
    }
  } catch (e) {
    console.warn("All IP lookups failed, falling back to timezone:", e);
  }

  // Fallback to timezone-based detection
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const tzMap: Record<string, { code: string; name: string }> = {
      'Asia/Riyadh': { code: 'SA', name: 'المملكة العربية السعودية' },
      'Asia/Amman': { code: 'JO', name: 'الأردن' },
      'Africa/Cairo': { code: 'EG', name: 'مصر' },
      'Asia/Dubai': { code: 'AE', name: 'الإمارات العربية المتحدة' },
      'Asia/Beirut': { code: 'LB', name: 'لبنان' },
      'Asia/Damascus': { code: 'SY', name: 'سوريا' },
      'Asia/Baghdad': { code: 'IQ', name: 'العراق' },
      'Asia/Kuwait': { code: 'KW', name: 'الكويت' },
      'Asia/Qatar': { code: 'QA', name: 'قطر' },
      'Asia/Bahrain': { code: 'BH', name: 'البحرين' },
      'Africa/Casablanca': { code: 'MA', name: 'المغرب' },
      'Africa/Tunis': { code: 'TN', name: 'تونس' },
      'Africa/Algiers': { code: 'DZ', name: 'الجزائر' },
      'Africa/Tripoli': { code: 'LY', name: 'ليبيا' },
      'Africa/Khartoum': { code: 'SD', name: 'السودان' },
      'Asia/Muscat': { code: 'OM', name: 'عُمان' },
      'Asia/Gaza': { code: 'PS', name: 'فلسطين' },
      'Asia/Hebron': { code: 'PS', name: 'فلسطين' },
      'Europe/Paris': { code: 'FR', name: 'فرنسا' },
      'Europe/London': { code: 'GB', name: 'المملكة المتحدة' },
      'America/New_York': { code: 'US', name: 'الولايات المتحدة' },
      'America/Chicago': { code: 'US', name: 'الولايات المتحدة' },
      'America/Denver': { code: 'US', name: 'الولايات المتحدة' },
      'America/Los_Angeles': { code: 'US', name: 'الولايات المتحدة' },
    };

    if (tz && tzMap[tz]) {
      return tzMap[tz];
    }
  } catch (e) {
    console.error("Timezone detection failed:", e);
  }

  // Final default fallback
  return { code: 'SA', name: 'المملكة العربية السعودية' };
}

/**
 * Returns country name in Arabic
 */
export function getCountryArabicName(code: string): string {
  const names: Record<string, string> = {
    'SA': 'المملكة العربية السعودية',
    'JO': 'الأردن',
    'EG': 'مصر',
    'AE': 'الإمارات العربية المتحدة',
    'LB': 'لبنان',
    'SY': 'سوريا',
    'IQ': 'العراق',
    'KW': 'الكويت',
    'QA': 'قطر',
    'BH': 'البحرين',
    'MA': 'المغرب',
    'TN': 'تونس',
    'DZ': 'الجزائر',
    'LY': 'ليبيا',
    'SD': 'السودان',
    'OM': 'عُمان',
    'PS': 'فلسطين',
    'YE': 'اليمن',
    'US': 'الولايات المتحدة',
    'GB': 'المملكة المتحدة',
    'FR': 'فرنسا',
    'DE': 'ألمانيا',
    'CA': 'كندا',
    'TR': 'تركيا',
  };
  return names[code.toUpperCase()] || code;
}

/**
 * Fetches the Top 10 popular/trending movies and TV shows for a specific country region
 */
export async function getTop10ByCountry(countryCode: string): Promise<MediaItem[]> {
  try {
    const [trendMovies, trendTv, popMovies, popTv] = await Promise.all([
      fetchFromTMDB('/trending/movie/week', { page: '1' }),
      fetchFromTMDB('/trending/tv/week', { page: '1' }),
      fetchFromTMDB('/movie/popular', { page: '1' }),
      fetchFromTMDB('/tv/popular', { page: '1' }),
    ]);

    const m1: MediaItem[] = (trendMovies?.results || []).map((item: any) => ({ ...item, media_type: 'movie' }));
    const t1: MediaItem[] = (trendTv?.results || []).map((item: any) => ({ ...item, media_type: 'tv' }));
    const m2: MediaItem[] = (popMovies?.results || []).map((item: any) => ({ ...item, media_type: 'movie' }));
    const t2: MediaItem[] = (popTv?.results || []).map((item: any) => ({ ...item, media_type: 'tv' }));

    // Merge everything to get the absolute highest-profile blockbusters currently watched
    const merged = [...m1, ...t1, ...m2, ...t2];
    
    // Remove duplicates by ID
    const uniqueMap = new Map<number, MediaItem>();
    merged.forEach(item => {
      uniqueMap.set(item.id, item);
    });

    const uniqueList = filterAdultContent(Array.from(uniqueMap.values()));

    // Sort by popularity to prioritize actual worldwide blockbusters (like Netflix hits)
    return uniqueList
      .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
      .slice(0, 10);
  } catch (error) {
    console.error('Error fetching Top 10 by Country:', error);
    return [];
  }
}

