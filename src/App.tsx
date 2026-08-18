import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useParams, useLocation, Link } from 'react-router-dom';
import Navbar from './components/Navbar';
import MovieCard from './components/MovieCard';
import WatchModal from './components/WatchModal';

import SecurityGuard from './components/SecurityGuard';
import VersionGuard from './components/VersionGuard';
import AdZone from './components/AdZone';
import CookieConsent from './components/CookieConsent';
import SeoHead from './components/SeoHead';
import DiscoveryPanel, { DiscoveryFilters } from './components/DiscoveryPanel';
import AdminPortal from './components/AdminPortal';
import { MediaItem, WatchHistoryItem } from './types';
import { getTrendingMedia, searchMedia, getAnimeList, getYangoPlayMedia, getBackdropUrl, getPosterUrl, getMediaByGenre, detectUserCountry, getTop10ByCountry, getMovieDetails, getTVShowDetails } from './lib/tmdb';
import { rankMediaItems, getWatchHistory, clearWatchHistory, getFavoriteItems } from './lib/algorithm';
import { 
  Play, Sparkles, AlertCircle, Star, Flame, Film, Tv, Clock, 
  Trash2, HelpCircle, ChevronRight, Globe, Search, Heart, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getTranslations } from './translations';
import { slugify } from './lib/slugify';
import { fetchWithTimeout, getApiUrl } from './lib/api';
import { getDaily50 } from './lib/dailySeededSelection';
import { recordSearchQueryInCookie, getUserCookiePreferences, getCookieConsent, clearUserTrackingData, COOKIE_POLICY_VERSION } from './lib/cookieManager';

function getOrCreateUserId(): string {
  let uid = localStorage.getItem('flexjo_user_id');
  if (!uid) {
    uid = 'usr_' + Date.now() + '_' + Math.random().toString(36).substring(2, 10);
    localStorage.setItem('flexjo_user_id', uid);
  }
  return uid;
}

function getBrowserInfo(): string {
  const ua = navigator.userAgent;
  let tem;
  let M = ua.match(/(opera|chrome|safari|firefox|msie|trident(?=\/))\/?\s*(\d+)/i) || [];
  if (/trident/i.test(M[1])) {
    tem = /\brv[ :]+(\d+)/g.exec(ua) || [];
    return 'IE ' + (tem[1] || '');
  }
  if (M[1] === 'Chrome') {
    tem = ua.match(/\b(OPR|Edge)\/(\d+)/);
    if (tem != null) return tem.slice(1).join(' ').replace('OPR', 'Opera');
  }
  M = M[2] ? [M[1], M[2]] : [navigator.appName, navigator.appVersion, '-?'];
  if ((tem = ua.match(/version\/(\d+)/i)) != null) M.splice(1, 1, tem[1]);
  return M.join(' ');
}

/**
 * Reads only coarse acquisition information after consent. Search engines often
 * remove the exact keyword from document.referrer, so googleQuery is optional.
 */
function getAcquisitionContext() {
  const referrer = document.referrer || '';
  let referrerHost = '';
  let source = 'direct';
  let googleQuery = '';

  try {
    const url = referrer ? new URL(referrer) : null;
    referrerHost = url?.hostname || '';
    const host = referrerHost.toLowerCase();
    if (host.includes('google.')) {
      source = 'google';
      googleQuery = url?.searchParams.get('q') || url?.searchParams.get('query') || '';
    } else if (host.includes('bing.com')) {
      source = 'bing';
    } else if (host.includes('yahoo.')) {
      source = 'yahoo';
    } else if (host.includes('youtube.com') || host.includes('youtu.be')) {
      source = 'youtube';
    } else if (host.includes('facebook.com') || host.includes('instagram.com')) {
      source = 'social';
    } else if (referrer) {
      source = 'referral';
    }
  } catch {
    source = referrer ? 'referral' : 'direct';
  }

  return {
    source,
    referrerHost,
    googleQuery,
    landingPage: `${window.location.pathname}${window.location.search}`
  };
}

function WatchPage({ onPreferenceChange, lang }: { onPreferenceChange: () => void; lang: 'ar' | 'en' }) {
  const params = useParams<{ mediaType?: string; slug?: string; id?: string }>();
  const location = useLocation();
  const navigate = useNavigate();

  let resolvedMediaType = params.mediaType;
  let resolvedId = params.id;

  if (!resolvedMediaType) {
    if (location.pathname.startsWith('/tv')) {
      resolvedMediaType = 'tv';
    } else {
      resolvedMediaType = 'movie';
    }
  }

  const [item, setItem] = useState<MediaItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!resolvedId) return;

    setLoading(true);
    async function loadItem() {
      try {
        let data: any = null;
        if (resolvedMediaType === 'movie') {
          data = await getMovieDetails(Number(resolvedId));
        } else {
          data = await getTVShowDetails(Number(resolvedId));
        }
        if (data) {
          setItem(data);
          
          // Log media view only after explicit analytics consent.
          if (getCookieConsent() === 'accepted') {
            try {
              const countryCode = localStorage.getItem('user_country_code') || 'JO';
              fetch(getApiUrl('/api/log-media'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  id: data.id,
                  title: data.title || data.name,
                  type: resolvedMediaType,
                  country: countryCode,
                  userId: getOrCreateUserId(),
                  consentStatus: 'accepted',
                  consentVersion: COOKIE_POLICY_VERSION
                })
              });
            } catch (e) {
              // ignore
            }
          }
        }
      } catch (error) {
        console.error('Error fetching watch page media:', error);
      } finally {
        setLoading(false);
      }
    }
    loadItem();
  }, [resolvedId, resolvedMediaType]);

  const handleClose = () => {
    navigate('/home');
  };

  const handleWatchNext = (nextItem: MediaItem) => {
    const slug = slugify(nextItem.title || nextItem.name);
    navigate(`/watch/${nextItem.media_type || 'movie'}/${slug}/${nextItem.id}`);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-40 gap-3 min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-zinc-500">{lang === 'en' ? 'Preparing stream...' : 'جاري تحضير خيارات البث والترجمة...'}</p>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="flex flex-col items-center justify-center py-40 text-center gap-2 text-zinc-500 max-w-sm mx-auto">
        <AlertCircle className="w-12 h-12 text-zinc-600" />
        <h3 className="font-bold text-sm text-zinc-400">{lang === 'en' ? 'Stream not found' : 'هذا العرض غير متوفر'}</h3>
        <p className="text-[11px] text-zinc-500 leading-relaxed">
          {lang === 'en' ? 'The requested movie or show could not be loaded.' : 'تعذر تحميل بيانات البث الخاصة بالعرض المطلوب.'}
        </p>
        <button
          onClick={() => navigate('/home')}
          className="mt-4 text-xs bg-red-600 text-white font-bold px-4 py-2 rounded-xl hover:bg-red-700 transition cursor-pointer"
        >
          {lang === 'en' ? 'Go Home' : 'الرجوع للرئيسية'}
        </button>
      </div>
    );
  }

  return (
    <>
      <SeoHead item={item} lang={lang} />
      <WatchModal
        item={item}
        onClose={handleClose}
        onPreferenceChange={onPreferenceChange}
        onWatch={handleWatchNext}
        lang={lang}
      />
    </>
  );
}

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();

  // Automatic legacy hash URL migration (e.g. /#/movie -> /movie)
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hash && window.location.hash.startsWith('#/')) {
      const hashPath = window.location.hash.substring(1);
      if (hashPath) {
        navigate(hashPath, { replace: true });
      }
    }
  }, [navigate]);

  // Determine active tab from URL path
  const activeTab = (() => {
    const path = location.pathname;
    if (path === '/' || path === '/home') return 'home';
    if (path.startsWith('/search')) return 'search';
    if (path.startsWith('/movie')) return 'movie';
    if (path.startsWith('/tv')) return 'tv';
    if (path.startsWith('/anime')) return 'anime';
    if (path.startsWith('/favorites')) return 'favorites';
    if (path.startsWith('/history')) return 'history';

    return 'home';
  })();


  const setActiveTab = (tab: string) => {
    if (tab === 'search') {
      navigate('/search');
    } else {
      navigate(`/${tab === 'home' ? 'home' : tab}`);
    }
  };

  const handleWatchMedia = (item: MediaItem) => {
    const slug = slugify(item.title || item.name);
    navigate(`/watch/${item.media_type || 'movie'}/${slug}/${item.id}`);
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<MediaItem[]>([]);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [searchFilters, setSearchFilters] = useState<DiscoveryFilters>({
    type: 'all',
    year: 'all',
    minRating: 0,
    sort: 'relevance'
  });

  // Catalog states
  const [trendingMedia, setTrendingMedia] = useState<MediaItem[]>([]);
  const [animeMedia, setAnimeMedia] = useState<MediaItem[]>([]);
  const [yangoMedia, setYangoMedia] = useState<MediaItem[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(true);

  // Regional Top 10 states
  const [userCountry, setUserCountry] = useState<{ code: string; name: string } | null>(null);
  const [top10Media, setTop10Media] = useState<MediaItem[]>([]);
  const [loadingTop10, setLoadingTop10] = useState(false);

  const [heroMedia, setHeroMedia] = useState<MediaItem | null>(null);
  const [heroLogoPath, setHeroLogoPath] = useState<string | null>(null);
  const [featuredHeroes, setFeaturedHeroes] = useState<MediaItem[]>([]);
  const [featuredLogos, setFeaturedLogos] = useState<Record<number, string | null>>({});
  const [activeHeroIndex, setActiveHeroIndex] = useState(0);

  // Fetch transparent logos for all featured release movies
  useEffect(() => {
    if (featuredHeroes.length === 0) return;
    async function fetchAllLogos() {
      const logoMap: Record<number, string | null> = {};
      await Promise.all(
        featuredHeroes.map(async (item) => {
          try {
            if (item.media_type === 'movie' || !item.media_type) {
              const data = await getMovieDetails(item.id);
              logoMap[item.id] = data?.logo_path || null;
            } else {
              const data = await getTVShowDetails(item.id);
              logoMap[item.id] = data?.logo_path || null;
            }
          } catch (e) {
            console.error('Error fetching logo for item:', item.id, e);
            logoMap[item.id] = null;
          }
        })
      );
      setFeaturedLogos(prev => ({ ...prev, ...logoMap }));
    }
    fetchAllLogos();
  }, [featuredHeroes]);

  // Language state
  const [lang, setLang] = useState<'ar' | 'en'>(() => {
    const stored = localStorage.getItem('flxjo_lang_code');
    return (stored === 'en' || stored === 'ar') ? stored : 'ar';
  });

  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const stored = localStorage.getItem('flxjo_theme');
    return stored === 'light' ? 'light' : 'dark';
  });

  const handleThemeChange = (nextTheme: 'dark' | 'light') => {
    setTheme(nextTheme);
    localStorage.setItem('flxjo_theme', nextTheme);
  };

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const handleLanguageChange = (newLang: 'ar' | 'en') => {
    setLang(newLang);
    localStorage.setItem('flxjo_lang_code', newLang);
    localStorage.setItem('user_language', newLang);
  };

  // Sync document title with current language
  useEffect(() => {
    document.title = lang === 'ar' 
      ? 'FlxJo | فلكس جو - مشاهدة الأفلام والمسلسلات والأنمي' 
      : 'FlxJo | Watch Movies, Series & Anime Online';
  }, [lang]);

  const [consentState, setConsentState] = useState(getCookieConsent());
  const [showCookieSettings, setShowCookieSettings] = useState(false);

  const syncConsentWithServer = async (nextConsent: 'accepted' | 'declined') => {
    const existingUid = localStorage.getItem('flexjo_user_id') || '';
    const uid = nextConsent === 'accepted' ? getOrCreateUserId() : existingUid;
    try {
          await fetch(getApiUrl('/api/user-consent'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: uid,
          consentStatus: nextConsent,
          consentVersion: COOKIE_POLICY_VERSION,
          consentAt: new Date().toISOString(),
          country: localStorage.getItem('user_country_code') || 'JO',
          browser: getBrowserInfo(),
          ...(nextConsent === 'accepted' ? getAcquisitionContext() : {})
        })
      });
    } catch (e) {
      // Consent remains local if the analytics endpoint is unavailable.
    }
    if (nextConsent === 'declined') {
      clearUserTrackingData();
    }
  };

  // Background live tracking & Supabase visitors heartbeat loop
  useEffect(() => {
    if (consentState !== 'accepted') return;
    const uid = getOrCreateUserId();
    const browser = getBrowserInfo();
    const countryCode = localStorage.getItem('user_country_code') || 'JO';
    let loginTime = sessionStorage.getItem('flxjo_login_time');
    if (!loginTime) {
      loginTime = new Date().toLocaleTimeString();
      sessionStorage.setItem('flxjo_login_time', loginTime);
    }

    const getCurrentMovieName = () => {
      const path = window.location.pathname;
      if (path.includes('/watch/') || path.startsWith('/movie/') || path.startsWith('/tv/')) {
        const docTitle = document.title;
        if (docTitle && !docTitle.startsWith('FlxJo |')) {
          return docTitle;
        }
        const parts = path.split('/');
        const slug = parts[3] || parts[2];
        if (slug) {
          return decodeURIComponent(slug).replace(/-/g, ' ');
        }
        return 'مشاهدة عرض سينمائي';
      }
      if (path.startsWith('/search')) return 'البحث في الكتالوج';
      if (path.startsWith('/favorites')) return 'قائمة المفضلة';
      if (path.startsWith('/history')) return 'سجل المشاهدة';
      return 'تصفح الصفحة الرئيسية';
    };

    const trackVisitor = (userStatus: 'online' | 'offline' = 'online') => {
      const movieName = getCurrentMovieName();
      fetch(getApiUrl('/api/track-visitor'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: uid,
          country: countryCode,
          current_movie: movieName,
          consentStatus: 'accepted',
          consentVersion: COOKIE_POLICY_VERSION,
          status: userStatus,
          login_time: loginTime,
          last_seen: new Date().toISOString()
        }),
        keepalive: userStatus === 'offline'
      }).catch(() => {});

      if (userStatus === 'online') {
        fetch(getApiUrl('/api/user-heartbeat'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: uid, country: countryCode, browser, consentStatus: 'accepted', consentVersion: COOKIE_POLICY_VERSION })
        }).catch(() => {});
      }
    };

    // Initial track
    trackVisitor('online');

    // Interval every 10 seconds
    const interval = setInterval(() => trackVisitor('online'), 10000);

    // Track page exits
    const handleUnload = () => {
      trackVisitor('offline');
      fetch(getApiUrl('/api/log-exit'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: uid, consentStatus: 'accepted', consentVersion: COOKIE_POLICY_VERSION }),
        keepalive: true
      }).catch(() => {});
    };

    window.addEventListener('beforeunload', handleUnload);

    return () => {
      clearInterval(interval);
      window.removeEventListener('beforeunload', handleUnload);
    };
  }, [location.pathname, consentState]);

  const t = getTranslations(lang);

  const handleCookieConsentChange = (nextConsent: 'accepted' | 'declined') => {
    setConsentState(nextConsent);
    setShowCookieSettings(false);
    void syncConsentWithServer(nextConsent);
  };

  // Simple static genre shelves (No personal profiling / No studying user tastes)
  interface GenreShelf {
    genreId: number;
    genreName: string;
    items: MediaItem[];
  }
  const [favoriteShelves, setFavoriteShelves] = useState<GenreShelf[]>([]);
  const [loadingShelves, setLoadingShelves] = useState(false);

  // Watch history
  const [watchHistory, setWatchHistory] = useState<WatchHistoryItem[]>([]);

  // User Favorites list state
  const [favoriteItems, setFavoriteItems] = useState<MediaItem[]>([]);

  // AI Semantic Smart Search Mode State
  const [smartSearchMode, setSmartSearchMode] = useState<boolean>(() => {
    return localStorage.getItem('flxjo_smart_search') === 'true';
  });

  // State trigger to force rerender and syncs
  const [preferenceTrigger, setPreferenceTrigger] = useState(0);

  // Success message toast for actions
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Savage Global Alert & Pinned Movie state
  const [globalAlert, setGlobalAlert] = useState<string>('');
  const [pinnedMovieData, setPinnedMovieData] = useState<MediaItem | null>(null);

  // 1. Initial catalog data loading
  useEffect(() => {
    // Fetch Global Alert
    fetchWithTimeout(getApiUrl('/api/global-alert'), {}, 5000)
      .then(res => res.json())
      .then(data => {
        if (data.alertMessage) setGlobalAlert(data.alertMessage);
      })
      .catch(() => {});

    async function loadCatalog() {
      setLoadingCatalog(true);
      setLoadingTop10(true);
      try {
        const [t1, a1, y1] = await Promise.all([
          getTrendingMedia(1),
          getAnimeList(1),
          getYangoPlayMedia(),
        ]);
        
        const trendingPool = [...(t1 || [])];
        const animePool = [...(a1 || [])];
        const yangoPool = [...(y1 || [])];

        // Fetch Pinned Movie from backend
        let pinned: MediaItem | null = null;
        try {
          const pinnedRes = await fetchWithTimeout(getApiUrl('/api/pinned-movie'), {}, 5000);
          const pinnedData = await pinnedRes.json();
          if (pinnedData.pinnedMovie) {
            const query = pinnedData.pinnedMovie;
            if (/^\d+$/.test(query)) {
              pinned = await getMovieDetails(Number(query));
            } else {
              const searchRes = await searchMedia(query, 1);
              if (searchRes && searchRes.length > 0) pinned = searchRes[0];
            }
          }
        } catch (e) {
          console.error('Error fetching pinned movie:', e);
        }

        // Select exactly 50 seeded by daily UTC time
        const trendingDaily = getDaily50(trendingPool, 'trending_hits');
        const animeDaily = getDaily50(animePool, 'japanese_anime_legendary');
        const yangoDaily = getDaily50(yangoPool, 'yango_play_streaming');
        
        setTrendingMedia(trendingDaily);
        setAnimeMedia(animeDaily);
        setYangoMedia(yangoDaily);

        if (trendingDaily.length > 0) {
          let subset = trendingDaily.filter(m => m.backdrop_path && m.poster_path).slice(0, 6);
          
          // Inject pinned movie if found
          if (pinned) {
            setPinnedMovieData(pinned);
            // Put pinned movie at the start
            subset = [pinned, ...subset.filter(m => m.id !== (pinned as any).id)].slice(0, 6);
          }
          
          setFeaturedHeroes(subset);
          setHeroMedia(subset[0] || trendingDaily[0]);
          setActiveHeroIndex(0);
        }

        // Detect country and load regional top 10
        const country = await detectUserCountry();
        setUserCountry(country);
        if (country?.code) {
          localStorage.setItem('user_country_code', country.code);
        }
        
        // Log a visit only after explicit consent; the heartbeat handles later activity.
        if (getCookieConsent() === 'accepted') {
          try {
            fetch(getApiUrl('/api/log-visit'), {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                country: country?.code || 'JO',
                userId: getOrCreateUserId(),
                browser: getBrowserInfo(),
                consentStatus: 'accepted',
                consentVersion: COOKIE_POLICY_VERSION,
                ...getAcquisitionContext()
              })
            });
          } catch (e) {
            // fail silently
          }
        }

        const top10 = await getTop10ByCountry(country.code);
        setTop10Media(top10);
      } catch (error) {
        console.error('Error fetching catalog data:', error);
      } finally {
        setLoadingCatalog(false);
        setLoadingTop10(false);
      }
    }
    loadCatalog();
  }, [lang]);

  // 2. Fetch/update watch history and favorites list
  useEffect(() => {
    setWatchHistory(getWatchHistory());
    setFavoriteItems(getFavoriteItems());
  }, [preferenceTrigger]);

  // 2.1 Fetch detailed hero item logo
  useEffect(() => {
    if (!heroMedia) {
      setHeroLogoPath(null);
      return;
    }
    async function fetchHeroDetails() {
      try {
        if (heroMedia.media_type === 'movie') {
          const data = await getMovieDetails(heroMedia.id);
          setHeroLogoPath(data?.logo_path || null);
        } else {
          const data = await getTVShowDetails(heroMedia.id);
          setHeroLogoPath(data?.logo_path || null);
        }
      } catch (error) {
        console.error('Error loading hero logo path:', error);
        setHeroLogoPath(null);
      }
    }
    fetchHeroDetails();
  }, [heroMedia?.id]);

  // 2.2 Auto-rotate hero movie every 10 seconds
  useEffect(() => {
    if (featuredHeroes.length <= 1) return;

    const timer = setInterval(() => {
      setActiveHeroIndex((prevIndex) => {
        const nextIndex = (prevIndex + 1) % featuredHeroes.length;
        setHeroMedia(featuredHeroes[nextIndex]);
        return nextIndex;
      });
    }, 10000); // 10 seconds rotation

    return () => clearInterval(timer);
  }, [featuredHeroes, activeHeroIndex]);

  // 2.5. Fetch static popular genre shelves (Same for all users, no bias, no profiling)
  useEffect(() => {
    async function loadGenreShelves() {
      setLoadingShelves(true);
      try {
        const coreGenres = [
          { id: 28, nameEn: 'Action & Adventure 💥', nameAr: 'أكشن ومغامرات 💥' },
          { id: 18, nameEn: 'Drama Masterpieces 🎬', nameAr: 'روائع الدراما 🎬' },
          { id: 35, nameEn: 'Comedy Hits 🎭', nameAr: 'أقوى الكوميديا 🎭' },
          { id: 878, nameEn: 'Science Fiction 🚀', nameAr: 'خيال علمي وإثارة 🚀' },
          { id: 27, nameEn: 'Horror & Suspense 👻', nameAr: 'رعب وتشويق 👻' }
        ];
        
        const shelves = await Promise.all(
          coreGenres.map(async (genre) => {
            const [moviesP1, moviesP2, moviesP3, moviesP4, tvP1, tvP2] = await Promise.all([
              getMediaByGenre(genre.id, 'movie', 1),
              getMediaByGenre(genre.id, 'movie', 2),
              getMediaByGenre(genre.id, 'movie', 3),
              getMediaByGenre(genre.id, 'movie', 4),
              getMediaByGenre(genre.id, 'tv', 1),
              getMediaByGenre(genre.id, 'tv', 2),
            ]);
            
            const mergedPool = [
              ...(moviesP1 || []), 
              ...(moviesP2 || []), 
              ...(moviesP3 || []), 
              ...(moviesP4 || []), 
              ...(tvP1 || []),
              ...(tvP2 || [])
            ];
            
            // Select exactly 50 seeded by daily UTC time and genre id
            const dailyGenre50 = getDaily50(mergedPool, `genre_shelf_${genre.id}`);
              
            return {
              genreId: genre.id,
              genreName: lang === 'en' ? genre.nameEn : genre.nameAr,
              items: dailyGenre50
            };
          })
        );
        
        setFavoriteShelves(shelves.filter(s => s.items.length > 0));
      } catch (error) {
        console.error('Error loading static genre shelves:', error);
      } finally {
        setLoadingShelves(false);
      }
    }
    
    if (trendingMedia.length > 0) {
      loadGenreShelves();
    }
  }, [trendingMedia, lang]);

  // 3. Search execution engine (with fallback)
  const executeSearch = async (query: string, isSmart: boolean) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    // Record search in cookie / local profile
    recordSearchQueryInCookie(query);

    // Send user-level search analytics only after explicit cookie consent.
    if (getCookieConsent() === 'accepted') {
      try {
        fetch(getApiUrl('/api/log-search'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query,
            lang,
            country: userCountry?.code || localStorage.getItem('user_country_code') || 'JO',
            userId: getOrCreateUserId(),
            consentStatus: 'accepted',
            consentVersion: COOKIE_POLICY_VERSION,
            ...getAcquisitionContext(),
            searchType: isSmart ? 'smart' : 'catalog'
          })
        });
      } catch (e) {
        // fail silently
      }
    }

    setLoadingSearch(true);
    try {
      if (isSmart) {
        // AI Semantic search using our server route
        const res = await fetch(getApiUrl('/api/smart-search'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query }),
        });
        
        if (!res.ok) {
          throw new Error('AI search request failed');
        }

        const data = await res.json();
        const titles: string[] = data.titles || [];

        if (titles.length === 0) {
          setSearchResults([]);
          return;
        }

        // Query TMDB for each suggested title
        const tmdbPromises = titles.map(async (title) => {
          try {
            const matches = await searchMedia(title, 1);
            return matches && matches.length > 0 ? matches[0] : null;
          } catch (e) {
            console.error(`Error searching individual title "${title}":`, e);
            return null;
          }
        });

        const rawResults = await Promise.all(tmdbPromises);
        // Filter out nulls and remove duplicate IDs
        const seenIds = new Set<number>();
        const uniqueItems: MediaItem[] = [];
        for (const item of rawResults) {
          if (item && !seenIds.has(item.id)) {
            seenIds.add(item.id);
            uniqueItems.push(item);
          }
        }
        setSearchResults(uniqueItems);
      } else {
        // Standard TMDB search
        const results = await searchMedia(query, 1);
        setSearchResults(results);
      }
    } catch (error) {
      console.error('Error searching media:', error);
      // Fallback to standard search if AI fails or key is missing
      try {
        const results = await searchMedia(query, 1);
        setSearchResults(results);
      } catch (innerErr) {
        console.error('Fallback search failed too:', innerErr);
      }
    } finally {
      setLoadingSearch(false);
    }
  };

  // Search action callback
  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      if (location.pathname === '/search') {
        navigate('/home');
      }
      return;
    }

    if (location.pathname !== '/search') {
      navigate(`/search?q=${encodeURIComponent(query)}`);
    } else {
      navigate(`/search?q=${encodeURIComponent(query)}`, { replace: true });
    }

    await executeSearch(query, smartSearchMode);
  };

  // Sync search state with URL query parameter on direct navigation / refreshes
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const q = params.get('q') || '';
    if (location.pathname === '/search') {
      if (q && q !== searchQuery) {
        setSearchQuery(q);
        executeSearch(q, smartSearchMode);
      }
    } else {
      if (searchQuery !== '') {
        setSearchQuery('');
        setSearchResults([]);
      }
    }
  }, [location.search, location.pathname]);

  const handlePreferenceChange = () => {
    setPreferenceTrigger((prev) => prev + 1);
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const handleClearHistory = () => {
    clearWatchHistory();
    setWatchHistory([]);
    setPreferenceTrigger(prev => prev + 1);
    showToast(lang === 'en' ? 'Watch history fully cleared 🕒 🗑️' : 'تم مسح سجل المشاهدة بالكامل 🕒 🗑️');
  };

  const getFilteredMedia = (type: 'movie' | 'tv') => {
    const raw = trendingMedia.filter((item) => item.media_type === type);
    return rankMediaItems(raw);
  };

  const filteredSearchResults = [...searchResults]
    .filter((item) => {
      if (searchFilters.type !== 'all' && item.media_type !== searchFilters.type) return false;
      if (searchFilters.minRating > 0 && Number(item.vote_average || 0) < searchFilters.minRating) return false;
      if (searchFilters.year !== 'all') {
        const rawYear = item.release_date || item.first_air_date || '';
        const year = Number(rawYear.slice(0, 4));
        if (searchFilters.year === '2010' ? year < 2010 : year !== Number(searchFilters.year)) return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (searchFilters.sort === 'rating') return (b.vote_average || 0) - (a.vote_average || 0);
      if (searchFilters.sort === 'latest') return Number((b.release_date || b.first_air_date || '0').slice(0, 10).replaceAll('-', '')) - Number((a.release_date || a.first_air_date || '0').slice(0, 10).replaceAll('-', ''));
      if (searchFilters.sort === 'popularity') return (b.popularity || 0) - (a.popularity || 0);
      return 0;
    });

  const getTranslatedCountryName = () => {
    if (!userCountry) return '';
    if (lang === 'en') {
      const enMap: Record<string, string> = {
        'SA': 'Saudi Arabia',
        'JO': 'Jordan',
        'EG': 'Egypt',
        'AE': 'UAE',
        'LB': 'Lebanon',
        'SY': 'Syria',
        'IQ': 'Iraq',
        'KW': 'Kuwait',
        'QA': 'Qatar',
        'BH': 'Bahrain',
        'MA': 'Morocco',
        'TN': 'Tunisia',
        'DZ': 'Algeria',
        'LY': 'Libya',
        'SD': 'Sudan',
        'OM': 'Oman',
        'PS': 'Palestine',
        'YE': 'Yemen',
        'US': 'United States',
        'GB': 'United Kingdom',
        'FR': 'France',
        'DE': 'Germany',
        'CA': 'Canada',
        'TR': 'Turkey'
      };
      return enMap[userCountry.code.toUpperCase()] || userCountry.name;
    }
    return userCountry.name;
  };

  return (
    <SecurityGuard lang={lang}>
      <VersionGuard lang={lang}>
        <div className={`min-h-screen text-white selection:bg-red-600 selection:text-white transition-colors duration-300 ${theme === 'light' ? 'flxjo-light' : 'bg-zinc-950'}`} dir={lang === 'en' ? 'ltr' : 'rtl'}>
        <CookieConsent lang={lang} open={showCookieSettings} onChange={handleCookieConsentChange} />
      
      {/* Global Savage Alert Banner */}
      {globalAlert && (
        <div className="bg-red-600 text-white text-[10px] sm:text-xs font-black py-2 px-4 text-center flex items-center justify-center gap-2 animate-in slide-in-from-top duration-500 z-[60] relative shadow-lg">
          <Sparkles className="w-3.5 h-3.5 animate-pulse shrink-0" />
          <span className="truncate">{globalAlert}</span>
          <button 
            onClick={() => setGlobalAlert('')}
            className="ml-2 p-1 hover:bg-white/20 rounded-full transition-colors shrink-0"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Header / Navbar */}
      <Navbar
        onSearch={handleSearch}
        searchQuery={searchQuery}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenAlgo={() => {}}
        preferenceTrigger={preferenceTrigger}
        lang={lang}
        onLanguageChange={handleLanguageChange}
        theme={theme}
        onThemeChange={handleThemeChange}
      />

      {/* Main Page Body */}
      <main className="pb-28 sm:pb-20">
        <SeoHead lang={lang} />
        
        <Routes>
          <Route path="/" element={<Navigate to="/home" replace />} />
          
          {/* Standalone Search Results Page Route */}
          <Route path="/search" element={
            <div className="max-w-none px-4 md:px-12 lg:px-16 pt-8 space-y-6">
              {/* Prominent Search Input on Search Page (Highly visible and premium) */}
              <div className="w-full max-w-2xl mx-auto pb-4 space-y-4">
                <div className="relative group">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    placeholder={t.searchPlaceholder}
                    className={`w-full bg-zinc-900/90 border-2 border-zinc-800 focus:border-red-600 focus:ring-4 focus:ring-red-600/10 text-white rounded-2xl py-3.5 text-sm focus:outline-none transition-all placeholder-zinc-500 shadow-xl ${
                      lang === 'en' ? 'pl-12 pr-4' : 'pr-12 pl-4'
                    }`}
                  />
                  <Search className={`w-5 h-5 transition-colors duration-300 absolute top-1/2 -translate-y-1/2 pointer-events-none ${
                    lang === 'en' ? 'left-4' : 'right-4'
                  } text-zinc-500 group-focus-within:text-red-500`} />
                </div>

                {/* AI Semantic Smart Search Toggle Switch */}
                <div className="flex items-center justify-center">
                  <button
                    onClick={() => {
                      const nextMode = !smartSearchMode;
                      setSmartSearchMode(nextMode);
                      localStorage.setItem('flxjo_smart_search', String(nextMode));
                      if (searchQuery.trim()) {
                        executeSearch(searchQuery, nextMode);
                      }
                    }}
                    className={`flex items-center gap-2.5 px-5 py-2.5 rounded-full border text-xs font-semibold select-none cursor-pointer shadow-lg transition-all duration-300 ${
                      smartSearchMode
                        ? 'bg-red-600/15 border-red-500/40 text-red-400 shadow-red-950/20 scale-105'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700'
                    }`}
                  >
                    <Sparkles className={`w-4 h-4 ${smartSearchMode ? 'text-red-500 animate-pulse' : 'text-zinc-500'}`} />
                    <span>{lang === 'en' ? 'AI Semantic Search' : 'البحث الدلالي الذكي (الذكاء الاصطناعي)'}</span>
                    <span className={`w-2 h-2 rounded-full ${smartSearchMode ? 'bg-red-500 animate-ping' : 'bg-zinc-650'}`} />
                  </button>
                </div>
              </div>

              {/* Strategic AdSense banner spot on Search Page */}
              <AdZone type="banner" lang={lang} slot="3829152633" className="mb-4" />

              <DiscoveryPanel
                filters={searchFilters}
                onChange={setSearchFilters}
                lang={lang}
                resultCount={filteredSearchResults.length}
              />

              <div className="flex items-center justify-between border-b border-zinc-900 pb-4">
                <div className={lang === 'en' ? 'text-left' : 'text-right'}>
                  <h2 className="text-xl md:text-2xl font-black">
                    {lang === 'en' ? `Search Results for: "${searchQuery}"` : `نتائج البحث عن: "${searchQuery}"`}
                  </h2>
                  <p className="text-xs text-zinc-400 mt-1">
                    {lang === 'en' ? 'Search results matching your query across our cinematic database.' : 'نتائج البحث المطابقة لعبارة البحث في قاعدة بيانات الأفلام والمسلسلات.'}
                  </p>
                </div>
                <span className="text-xs bg-zinc-900 text-zinc-400 border border-zinc-800 px-3 py-1.5 rounded-xl font-mono">
                  {lang === 'en' ? `${filteredSearchResults.length} matching titles` : `${filteredSearchResults.length} عنوان متطابق`}
                </span>
              </div>

              {loadingSearch ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                  <div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs text-zinc-500">{lang === 'en' ? 'Searching global database...' : 'جاري البحث في قاعدة البيانات العالمية...'}</p>
                </div>
              ) : filteredSearchResults.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-center gap-2 text-zinc-500 max-w-sm mx-auto">
                  <HelpCircle className="w-12 h-12 text-zinc-600" />
                  <h3 className="font-bold text-sm text-zinc-400">{lang === 'en' ? 'No search results available' : 'لا تتوفر نتائج بحث'}</h3>
                  <p className="text-[11px] text-zinc-500 leading-relaxed">
                    {lang === 'en' 
                      ? 'Try searching using other keywords in English or Arabic. FLXJO supports access to Hollywood, Japanese Anime, Korean and global series.'
                      : 'جرب البحث بكلمات أخرى باللغة العربية أو الإنجليزية. فلكس جو يدعم الوصول لجميع أعمال هوليوود، الأنمي الياباني، والمسلسلات الكورية والعالمية.'}
                  </p>
                </div>
              ) : (
                <motion.div 
                  layout
                  className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 sm:gap-8"
                >
                  {filteredSearchResults.map((item) => (
                    <MovieCard
                      key={item.id}
                      item={item}
                      onWatch={handleWatchMedia}
                      onPreferenceChange={handlePreferenceChange}
                      lang={lang}
                    />
                  ))}
                </motion.div>
              )}
            </div>
          } />

          <Route path="/home" element={
              <div className="space-y-10">
                {/* 1. Stunning Dynamic Hero Banner */}
                {heroMedia ? (
                  <div className="relative min-h-[580px] md:h-[680px] w-full flex items-end bg-black overflow-hidden border-b border-zinc-900 pt-20">
                    {/* Backdrop cover with elegant dark cinematic gradients */}
                    <div className="absolute inset-0 z-0">
                      <AnimatePresence mode="popLayout">
                        <motion.img
                          key={heroMedia.id}
                          initial={{ opacity: 0, scale: 1.05 }}
                          animate={{ opacity: 0.35, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={{ duration: 1.2, ease: 'easeInOut' }}
                          src={getBackdropUrl(heroMedia.backdrop_path, 'original')}
                          alt={heroMedia.title || heroMedia.name}
                          className="absolute inset-0 w-full h-full object-cover filter"
                          referrerPolicy="no-referrer"
                        />
                      </AnimatePresence>
                      <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent" />
                      <div className={`absolute inset-y-0 w-full md:w-2/3 ${
                        lang === 'en' 
                          ? 'left-0 bg-gradient-to-r from-zinc-950 via-zinc-950/80 to-transparent' 
                          : 'right-0 bg-gradient-to-l from-zinc-950 via-zinc-950/80 to-transparent'
                      }`} />
                    </div>

                    {/* Hero Info elements */}
                    <div className={`max-w-none px-4 md:px-12 lg:px-16 pb-10 md:pb-16 relative z-10 w-full space-y-4 ${lang === 'en' ? 'text-left' : 'text-right'}`}>
                      {/* Badge indicator */}
                      <div className="flex items-center gap-2">
                        <span className="bg-red-600 text-white font-extrabold text-[10px] px-2.5 py-1 rounded-full border border-red-500/20 animate-pulse">
                          {pinnedMovieData && heroMedia.id === pinnedMovieData.id 
                            ? (lang === 'en' ? 'Admin Pick: Featured 👑' : 'اختيار الإدارة: مميز 👑')
                            : (lang === 'en' ? 'Featured Movie Today 🔥' : 'العرض المميز اليوم 🔥')}
                        </span>
                        
                        <span className="text-xs bg-zinc-900/80 backdrop-blur-md border border-zinc-800 text-zinc-300 px-2 py-0.5 rounded-lg font-mono flex items-center gap-1">
                          <Star className="w-3.5 h-3.5 text-yellow-500 fill-current" />
                          {(heroMedia.vote_average || 7.5).toFixed(1)}
                        </span>
                      </div>

                      {/* Display title/logo and description together with beautiful entry transitions */}
                      <div className="min-h-[160px] md:min-h-[200px] flex flex-col justify-end">
                        <AnimatePresence mode="wait">
                          <motion.div
                            key={heroMedia.id}
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -15 }}
                            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                            className="space-y-4"
                          >
                            {/* Display title or transparent logo */}
                            {heroLogoPath ? (
                              <div className="flex justify-start">
                                <img
                                  src={`https://image.tmdb.org/t/p/w500${heroLogoPath}`}
                                  alt={heroMedia.title || heroMedia.name}
                                  className="max-h-24 md:max-h-36 object-contain drop-shadow-[0_8px_16px_rgba(0,0,0,0.95)] select-none py-1"
                                  referrerPolicy="no-referrer"
                                />
                              </div>
                            ) : (
                              <h1 className="text-3xl md:text-5xl font-black tracking-tight text-white max-w-2xl leading-tight">
                                {heroMedia.title || heroMedia.name}
                              </h1>
                            )}

                            {/* Summary description */}
                            <p className="text-zinc-300 text-xs md:text-sm max-w-2xl leading-relaxed font-normal line-clamp-3 md:line-clamp-4">
                              {heroMedia.overview || (lang === 'en' ? 'Enjoy watching Hollywood masterpieces, top anime, and series. Subtitles and stream players are completely prepared.' : 'استمتع بمشاهدة أحدث إنتاجات هوليوود والأنمي والمسلسلات. جميع خيارات البث مجهزة لدمج الترجمة بالكامل.')}
                            </p>
                          </motion.div>
                        </AnimatePresence>
                      </div>

                      {/* Hero Actions */}
                      <div className="flex flex-wrap items-center gap-3 pt-2">
                        <button
                          onClick={() => handleWatchMedia(heroMedia)}
                          className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-extrabold px-6 py-3 rounded-xl transition text-xs shadow-xl shadow-red-600/25 cursor-pointer"
                        >
                          <Play className="w-4 h-4 fill-current" />
                          <span>{lang === 'en' ? 'Stream Now Free' : 'شاهد الآن مجاناً'}</span>
                        </button>
                      </div>

                      {/* Premium Story Circles Selector (Auto-cycles every 10 seconds) */}
                      {featuredHeroes.length > 0 && (
                        <div className="pt-4 space-y-2 border-t border-zinc-900/40">
                          <p className="text-[10px] text-zinc-500 uppercase font-black tracking-wider">
                            {lang === 'en' ? 'Featured Releases • Auto-rotation' : 'العروض المميزة الفاخرة • تقليب تلقائي'}
                          </p>
                          <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto no-scrollbar py-2">
                            {featuredHeroes.map((item, index) => {
                              const isActive = index === activeHeroIndex;
                              return (
                                <div
                                  key={item.id}
                                  onClick={() => {
                                    setActiveHeroIndex(index);
                                    setHeroMedia(item);
                                  }}
                                  className="w-24 sm:w-32 flex flex-col items-center justify-center cursor-pointer group select-none flex-shrink-0 relative pb-8 pt-1"
                                >
                                  <div className="relative flex flex-col items-center">
                                    {/* Double border glowing circle frame */}
                                    <div className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden transition-all duration-500 relative ${
                                      isActive 
                                        ? 'ring-4 ring-red-600 ring-offset-2 ring-offset-zinc-950 scale-105 shadow-xl shadow-red-600/30' 
                                        : 'border border-zinc-800 hover:border-zinc-500 scale-100'
                                    }`}>
                                      <img
                                        src={getBackdropUrl(item.backdrop_path, 'w780')}
                                        alt={item.title || item.name}
                                        className="w-full h-full object-cover select-none"
                                        referrerPolicy="no-referrer"
                                      />
                                      {/* Gentle overlay for inactive */}
                                      <div className={`absolute inset-0 transition-opacity duration-300 bg-black/30 ${
                                        isActive ? 'opacity-0' : 'group-hover:opacity-10'
                                      }`} />
                                    </div>

                                    {/* Overlapping movie logo image (half on the circle, half on the outside) */}
                                    <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 w-full z-20 flex justify-center pointer-events-none px-1">
                                      {featuredLogos[item.id] ? (
                                        <img
                                          src={`https://image.tmdb.org/t/p/w185${featuredLogos[item.id]}`}
                                          alt={item.title || item.name}
                                          className={`max-h-8 sm:max-h-10 w-full object-contain drop-shadow-[0_4px_8px_rgba(0,0,0,1)] transition-all duration-300 ${
                                            isActive 
                                              ? 'scale-110 filter brightness-110 contrast-125' 
                                              : 'scale-100 filter brightness-90 saturate-75 opacity-90'
                                          }`}
                                          referrerPolicy="no-referrer"
                                        />
                                      ) : (
                                        <span className={`block text-[8px] sm:text-[10px] font-black uppercase tracking-tighter text-white drop-shadow-[0_2px_4px_rgba(0,0,0,1)] line-clamp-1 transition-all duration-300 text-center w-full px-0.5 ${
                                          isActive ? 'scale-105 text-red-500' : 'text-zinc-100 group-hover:text-white'
                                        }`}>
                                          {item.title || item.name}
                                        </span>
                                      )}
                                    </div>

                                    {/* 10-second Autoplay Progress line bar */}
                                    {isActive && (
                                      <div className="absolute -bottom-7.5 left-1/2 -translate-x-1/2 w-8 bg-zinc-950/80 h-[3px] rounded-full overflow-hidden border border-zinc-900 z-30">
                                        <div 
                                          key={activeHeroIndex}
                                          className="bg-red-600 h-full rounded-full animate-progress-fill" 
                                        />
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  /* Hero loading stub */
                  <div className="h-[400px] w-full bg-zinc-950 flex items-center justify-center border-b border-zinc-900">
                    <div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
                  </div>
                )}

                {/* Strategic AdSense banner slot under Hero carousel */}
                <div className="max-w-none px-4 md:px-12 lg:px-16 pt-4">
                  <AdZone type="banner" lang={lang} slot="1829152631" />
                </div>

                {/* Row 1: Continue Watching (Durable Progress Tracker) */}
                {watchHistory.length > 0 && (
                  <div className="max-w-none px-4 md:px-12 lg:px-16 space-y-4">
                    <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 ${lang === 'en' ? 'text-left' : 'text-right'}`}>
                      <div className="flex items-center gap-2">
                        <div className="p-1 bg-red-600/10 text-red-500 rounded-lg">
                          <Clock className="w-5 h-5 text-red-500 animate-pulse" />
                        </div>
                        <h2 className="text-lg md:text-xl font-black">{lang === 'en' ? 'Continue Watching ⏳' : 'متابعة المشاهدة ⏳'}</h2>
                      </div>
                      <p className="text-[11px] text-zinc-400">
                        {lang === 'en' ? 'Pick up right where you left off from your last session' : 'استكمل عروضك المفضلة من نفس اللحظة التي توقفت عندها'}
                      </p>
                    </div>

                    <div className="flex gap-5 overflow-x-auto pb-4 pt-1 px-1 scroll-smooth">
                      {watchHistory.map((historyItem) => {
                        // Cast historyItem as any to access the simulated progress fields
                        const itemAny = historyItem as any;
                        const watchPct = itemAny.watch_percentage !== undefined ? itemAny.watch_percentage : 25;
                        const progressMinutes = Math.floor((itemAny.progress_seconds || 0) / 60);
                        const durationMinutes = Math.floor((itemAny.duration_seconds || 7200) / 60);

                        // Convert history item back to media item format for WatchModal triggers
                        const mediaFormat: MediaItem = {
                          id: historyItem.id,
                          title: historyItem.media_type === 'movie' ? historyItem.title : undefined,
                          name: historyItem.media_type === 'tv' ? historyItem.title : undefined,
                          media_type: historyItem.media_type,
                          poster_path: historyItem.poster_path,
                          backdrop_path: historyItem.poster_path, // fallback
                          overview: '',
                          genre_ids: [],
                          vote_average: 8.0,
                          popularity: 100
                        };

                        return (
                          <div 
                            key={historyItem.id} 
                            onClick={() => handleWatchMedia(mediaFormat)}
                            className="flex-none w-56 sm:w-64 bg-zinc-900/40 hover:bg-zinc-900 border border-zinc-850 hover:border-red-600/30 rounded-[1.8rem] overflow-hidden cursor-pointer group transition-all duration-300"
                          >
                            <div className="relative aspect-video w-full overflow-hidden">
                              <img
                                src={getBackdropUrl(historyItem.poster_path, 'w780')}
                                alt={historyItem.title}
                                className="w-full h-full object-cover opacity-70 group-hover:opacity-90 transition duration-500"
                                referrerPolicy="no-referrer"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent" />
                              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition duration-300">
                                <div className="p-3 bg-red-600 text-white rounded-full">
                                  <Play className="w-4 h-4 fill-current translate-x-0.5" />
                                </div>
                              </div>
                            </div>

                            <div className={`p-4 space-y-3 ${lang === 'en' ? 'text-left' : 'text-right'}`}>
                              <h3 className="font-bold text-xs line-clamp-1 group-hover:text-red-500 transition">
                                {historyItem.title}
                              </h3>
                              <div className="space-y-1.5">
                                <div className="flex justify-between items-center text-[10px] text-zinc-500 font-mono">
                                  <span>{lang === 'en' ? `${progressMinutes}m of ${durationMinutes}m` : `${progressMinutes} د من ${durationMinutes} د`}</span>
                                  <span>{watchPct}%</span>
                                </div>
                                <div className="w-full bg-zinc-850 h-1.5 rounded-full overflow-hidden">
                                  <div className="bg-red-600 h-full rounded-full transition-all" style={{ width: `${watchPct}%` }} />
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Personalized shelf: deterministic ranking from favorites, history and likes */}
                {trendingMedia.length > 0 && (
                  <div className="max-w-none px-4 md:px-12 lg:px-16 space-y-4">
                    <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 ${lang === 'en' ? 'text-left' : 'text-right'}`}>
                      <div className="flex items-center gap-2">
                        <div className="p-1 bg-red-600/10 text-red-500 rounded-lg"><Sparkles className="w-5 h-5 text-red-500" /></div>
                        <h2 className="text-lg md:text-xl font-black">{lang === 'en' ? 'Picked for You ✨' : 'مختارات إلك ✨'}</h2>
                      </div>
                      <p className="text-[11px] text-zinc-400">{lang === 'en' ? 'Fresh picks shaped by your favorites and viewing habits.' : 'اقتراحات جديدة مبنية على مفضلاتك وطريقة مشاهدتك.'}</p>
                    </div>
                    <div className="flex gap-6 overflow-x-auto pb-6 pt-1 px-1 scroll-smooth no-scrollbar">
                      {rankMediaItems(trendingMedia).slice(0, 12).map((item) => (
                        <div key={`for-you-${item.media_type}-${item.id}`} className="flex-none w-[160px] sm:w-[190px]">
                          <MovieCard item={item} onWatch={handleWatchMedia} onPreferenceChange={handlePreferenceChange} lang={lang} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Row 2: Worldwide Trending Row */}
                <div className="max-w-none px-4 md:px-12 lg:px-16 space-y-4">
                  <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 ${lang === 'en' ? 'text-left' : 'text-right'}`}>
                    <div className="flex items-center gap-2">
                      <div className="p-1 bg-red-600/10 text-red-500 rounded-lg">
                        <Flame className="w-5 h-5 text-red-500" />
                      </div>
                      <h2 className="text-lg md:text-xl font-black">{lang === 'en' ? 'Global Trending Hits 🌐' : 'العروض الرائجة عالمياً 🌐'}</h2>
                    </div>
                    <p className="text-[11px] text-zinc-400">
                      {lang === 'en' ? 'The most watched and popular cinematic pieces in the last 24 hours' : 'الأعمال السينمائية الأكثر مشاهدة ورواجاً على مستوى العالم خلال ٢٤ ساعة الماضية'}
                    </p>
                  </div>

                  <div className="flex gap-6 overflow-x-auto pb-6 pt-1 px-1 scroll-smooth no-scrollbar">
                    {rankMediaItems(trendingMedia).slice(0, 50).map((item) => (
                      <div key={item.id} className="flex-none w-[160px] sm:w-[190px]">
                        <MovieCard
                          item={item}
                          onWatch={handleWatchMedia}
                          onPreferenceChange={handlePreferenceChange}
                          lang={lang}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Row: Yango Play Exclusive & Verified Working Hits */}
                {yangoMedia.length > 0 && (
                  <div className="max-w-none px-4 md:px-12 lg:px-16 space-y-4">
                    <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 ${lang === 'en' ? 'text-left' : 'text-right'}`}>
                      <div className="flex items-center gap-2">
                        <div className="p-1 bg-red-600/10 text-red-500 rounded-lg">
                          <Tv className="w-5 h-5 text-red-500 animate-pulse" />
                        </div>
                        <h2 className="text-lg md:text-xl font-black">{lang === 'en' ? 'Currently on Yango Play 🎬' : 'الموجود حالياً على Yango Play 🎬'}</h2>
                      </div>
                      <div className="flex flex-col sm:items-end gap-1">
                        <p className="text-[11px] text-zinc-400">
                          {lang === 'en' ? 'Titles listed in Yango Play’s official public catalog. Availability can vary by country and subscription.' : 'أعمال ظاهرة في الكتالوج الرسمي العام ليانغو بلي؛ التوفر والتشغيل ممكن يختلف حسب البلد والاشتراك.'}
                        </p>
                        <a
                          href="https://play.yango.com/en/movies/selection/2507"
                          target="_blank"
                          rel="noreferrer"
                          className="text-[10px] font-bold text-red-400 hover:text-red-300 transition-colors"
                        >
                          {lang === 'en' ? 'Open official Yango catalog ↗' : 'فتح كتالوج يانغو الرسمي ↗'}
                        </a>
                      </div>
                    </div>

                    <div className="flex gap-6 overflow-x-auto pb-6 pt-1 px-1 scroll-smooth no-scrollbar">
                      {yangoMedia.map((item) => (
                        <div key={`yango-${item.id}`} className="flex-none w-[160px] sm:w-[190px]">
                          <MovieCard
                            item={item}
                            onWatch={handleWatchMedia}
                            onPreferenceChange={handlePreferenceChange}
                            lang={lang}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Row 3: Regional Top 10 (Dynamic IP and Region detection) */}
                {userCountry && top10Media.length > 0 && (
                  <div className="max-w-none px-4 md:px-12 lg:px-16 space-y-6 bg-gradient-to-b from-zinc-950 via-zinc-950/40 to-transparent py-6 border-y border-zinc-900/40">
                    <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${lang === 'en' ? 'text-left' : 'text-right'}`}>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Globe className="w-5 h-5 text-red-500 animate-pulse" />
                          <h2 className="text-lg md:text-xl font-black">
                            {lang === 'en' 
                              ? `Top 10 Hits in ${getTranslatedCountryName()} today 🏆` 
                              : `أقوى ١٠ عروض في ${getTranslatedCountryName()} اليوم 🏆`}
                          </h2>
                        </div>
                        <p className="text-[11px] text-zinc-400 leading-relaxed max-w-2xl">
                          {lang === 'en'
                            ? `These are the current top 10 streaming choices on FLXJO in ${getTranslatedCountryName()}, detected dynamically using your location.`
                            : `الأعمال الأكثر شعبية وتفضيلاً في ${getTranslatedCountryName()} اليوم. تم التعرف على منطقتك وتحديث القائمة تلقائياً وفق رغبات المستخدمين.`}
                        </p>
                      </div>
                      <span className="text-[10px] bg-red-600/10 text-red-500 border border-red-500/20 px-3 py-1.5 rounded-xl font-mono self-start sm:self-auto">
                        {lang === 'en' ? `Location: ${userCountry.code}` : `الموقع: ${userCountry.code}`}
                      </span>
                    </div>

                    {loadingTop10 ? (
                      <div className="flex items-center justify-center py-10">
                        <div className="w-8 h-8 border-3 border-red-600 border-t-transparent rounded-full animate-spin" />
                      </div>
                    ) : (
                      /* Big number stylized rank slider */
                      <div className="flex gap-10 sm:gap-14 overflow-x-auto pb-10 pt-6 px-4 scroll-smooth no-scrollbar select-none">
                        {rankMediaItems(top10Media).slice(0, 10).map((item, idx) => (
                          <div key={item.id} className="flex-none flex items-end w-[180px] sm:w-[240px] h-[240px] sm:h-[320px] group relative">
                            {/* Giant rank number background */}
                            <span className="text-[130px] sm:text-[210px] font-black text-transparent stroke-text select-none absolute start-[-20px] sm:start-[-40px] bottom-[-20px] sm:bottom-[-45px] z-0 leading-none opacity-85 group-hover:opacity-100 transition-all duration-500 group-hover:scale-105">
                              {idx + 1}
                            </span>
                            <div className="w-[125px] sm:w-[170px] relative z-10 ms-auto transition-transform duration-500 group-hover:translate-x-2 rtl:group-hover:-translate-x-2">
                              <MovieCard
                                item={item}
                                onWatch={handleWatchMedia}
                                onPreferenceChange={handlePreferenceChange}
                                lang={lang}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Row 4: Static Standard Genre Shelves (No tracking or profiling bias) */}
                {loadingShelves ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="w-8 h-8 border-3 border-red-600 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : (
                  favoriteShelves.map((shelf) => (
                    <div key={shelf.genreId} className="max-w-none px-4 md:px-12 lg:px-16 space-y-4">
                      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 ${lang === 'en' ? 'text-left' : 'text-right'}`}>
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping" />
                          <h2 className="text-lg md:text-xl font-black">{shelf.genreName}</h2>
                        </div>
                        <p className="text-[11px] text-zinc-400">
                          {lang === 'en' ? `Top ranking selections in ${shelf.genreName}` : `العروض الحائزة على أعلى تقييم ورواج في قسم ${shelf.genreName}`}
                        </p>
                      </div>

                      <div className="flex gap-6 overflow-x-auto pb-6 pt-1 px-1 scroll-smooth no-scrollbar">
                        {shelf.items.slice(0, 50).map((item) => (
                          <div key={item.id} className="flex-none w-[160px] sm:w-[190px]">
                            <MovieCard
                              item={item}
                              onWatch={handleWatchMedia}
                              onPreferenceChange={handlePreferenceChange}
                              lang={lang}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}

                {/* Secondary mid-page AdSense banner breaking up movie lists */}
                <div className="max-w-none px-4 md:px-12 lg:px-16 pt-4">
                  <AdZone type="banner" lang={lang} slot="2829152632" />
                </div>

                {/* Row 5: Beautiful Japanese Anime Shelf */}
                {animeMedia.length > 0 && (
                  <div className="max-w-none px-4 md:px-12 lg:px-16 space-y-4">
                    <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 ${lang === 'en' ? 'text-left' : 'text-right'}`}>
                      <div className="flex items-center gap-2">
                        <div className="p-1 bg-red-600/10 text-red-500 rounded-lg">
                          <Sparkles className="w-5 h-5 text-indigo-400 animate-bounce" />
                        </div>
                        <h2 className="text-lg md:text-xl font-black">{lang === 'en' ? 'Legendary Japanese Anime 🌸' : 'روائع الأنمي والكرتون الياباني 🌸'}</h2>
                      </div>
                      <p className="text-[11px] text-zinc-400">
                        {lang === 'en' ? 'Staggering handpicked masterworks from top Japanese animation houses' : 'أقوى إنتاجات استوديوهات الرسوم المتحركة اليابانية الشهيرة'}
                      </p>
                    </div>

                    {loadingCatalog ? (
                      <div className="flex items-center justify-center py-10">
                        <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                      </div>
                    ) : (
                      <div className="flex gap-6 overflow-x-auto pb-6 pt-1 px-1 scroll-smooth no-scrollbar">
                        {animeMedia.slice(0, 50).map((item) => (
                          <div key={item.id} className="flex-none w-[160px] sm:w-[190px]">
                            <MovieCard
                              item={item}
                              onWatch={handleWatchMedia}
                              onPreferenceChange={handlePreferenceChange}
                              lang={lang}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            } />

            <Route path="/movie" element={
              <div className="max-w-none px-4 md:px-12 lg:px-16 pt-8 space-y-6">
                <div className={lang === 'en' ? 'text-left' : 'text-right'}>
                  <h2 className="text-2xl font-black flex items-center gap-2">
                    <Film className="w-6 h-6 text-red-500" />
                    <span>{lang === 'en' ? 'Explore Global & Regional Movies' : 'جميع الأفلام العالمية والمحلية المتاحة'}</span>
                  </h2>
                  <p className="text-xs text-zinc-400 mt-1">
                    {lang === 'en' ? 'Explore our massive collection of premium movies.' : 'تصفح تشكيلتنا الكبيرة من الأفلام المميزة.'}
                  </p>
                </div>

                {/* Non-intrusive Ad Zone on Movies Page */}
                <AdZone type="banner" lang={lang} slot="4829152634" />

                {loadingCatalog ? (
                  <div className="flex items-center justify-center py-20">
                    <div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : (
                  <motion.div 
                    layout
                    className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 sm:gap-8"
                  >
                    {getFilteredMedia('movie').map((item) => (
                      <MovieCard
                        key={item.id}
                        item={item}
                        onWatch={handleWatchMedia}
                        onPreferenceChange={handlePreferenceChange}
                        lang={lang}
                      />
                    ))}
                  </motion.div>
                )}
              </div>
            } />

            <Route path="/tv" element={
              <div className="max-w-none px-4 md:px-12 lg:px-16 pt-8 space-y-6">
                <div className={lang === 'en' ? 'text-left' : 'text-right'}>
                  <h2 className="text-2xl font-black flex items-center gap-2">
                    <Tv className="w-6 h-6 text-red-500" />
                    <span>{lang === 'en' ? 'Explore Global TV Shows' : 'المسلسلات والعروض التلفزيونية العالمية'}</span>
                  </h2>
                  <p className="text-xs text-zinc-400 mt-1">
                    {lang === 'en' ? 'Explore global TV series and multi-season shows.' : 'تصفح المسلسلات العالمية والمواسم المتعددة المتوفرة.'}
                  </p>
                </div>

                {/* Non-intrusive Ad Zone on TV Page */}
                <AdZone type="banner" lang={lang} slot="5829152635" />

                {loadingCatalog ? (
                  <div className="flex items-center justify-center py-20">
                    <div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : (
                  <motion.div 
                    layout
                    className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 sm:gap-8"
                  >
                    {getFilteredMedia('tv').map((item) => (
                      <MovieCard
                        key={item.id}
                        item={item}
                        onWatch={handleWatchMedia}
                        onPreferenceChange={handlePreferenceChange}
                        lang={lang}
                      />
                    ))}
                  </motion.div>
                )}
              </div>
            } />

            <Route path="/anime" element={
              <div className="max-w-none px-4 md:px-12 lg:px-16 pt-8 space-y-6">
                <div className={lang === 'en' ? 'text-left' : 'text-right'}>
                  <h2 className="text-2xl font-black flex items-center gap-2">
                    <Sparkles className="w-6 h-6 text-indigo-500 animate-bounce" />
                    <span>{lang === 'en' ? 'Japanese Anime (Masterpieces)' : 'أعمال الأنمي والكرتون اليابانية (Japanese Anime)'}</span>
                  </h2>
                  <p className="text-xs text-zinc-400 mt-1">
                    {lang === 'en' ? 'FLXJO brings you the strongest legendary anime releases from top Japanese studios.' : 'فلكس جو يجمع لك أقوى عروض الأنمي الأسطورية من جميع الاستوديوهات اليابانية.'}
                  </p>
                </div>

                {/* Non-intrusive Ad Zone on Anime Page */}
                <AdZone type="banner" lang={lang} slot="6829152636" />

                {loadingCatalog ? (
                  <div className="flex items-center justify-center py-20">
                    <div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : animeMedia.length === 0 ? (
                  <div className="bg-zinc-900/40 border border-zinc-800/80 p-8 rounded-2xl text-center">
                    <p className="text-xs text-zinc-400">{lang === 'en' ? 'No anime titles available.' : 'لا توجد أعمال أنمي متاحة.'}</p>
                  </div>
                ) : (
                  <motion.div 
                    layout
                    className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 sm:gap-8"
                  >
                    {animeMedia.map((item) => (
                      <MovieCard
                        key={item.id}
                        item={item}
                        onWatch={handleWatchMedia}
                        onPreferenceChange={handlePreferenceChange}
                        lang={lang}
                      />
                    ))}
                  </motion.div>
                )}
              </div>
            } />

            <Route path="/history" element={
              <div className="max-w-none px-4 md:px-12 lg:px-16 pt-8 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-900 pb-4">
                  <div className={lang === 'en' ? 'text-left' : 'text-right'}>
                    <h2 className="text-2xl font-black flex items-center gap-2">
                      <Clock className="w-6 h-6 text-red-500" />
                      <span>{lang === 'en' ? 'My Stream Watch History' : 'سجل مشاهداتك الأخير على فلكس جو'}</span>
                    </h2>
                    <p className="text-xs text-zinc-400 mt-1">
                      {lang === 'en' ? 'This row helps you resume watching your shows and episodes exactly where you left off.' : 'تساعدك هذه القائمة في إكمال مشاهدة مسلسلاتك وحلقاتك من حيث توقفت.'}
                    </p>
                  </div>

                  {watchHistory.length > 0 && (
                    <button
                      onClick={handleClearHistory}
                      className="flex items-center gap-2 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded-xl border border-zinc-800 text-xs transition cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4 text-zinc-500" />
                      <span>{lang === 'en' ? 'Clear History' : 'مسح السجل بالكامل'}</span>
                    </button>
                  )}
                </div>

                {watchHistory.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-24 text-center gap-3 text-zinc-500 max-w-sm mx-auto">
                    <Clock className="w-12 h-12 text-zinc-600" />
                    <h3 className="font-bold text-sm text-zinc-400">{lang === 'en' ? 'Your history is completely empty' : 'سجلك فارغ تماماً'}</h3>
                    <p className="text-[11px] text-zinc-500 leading-relaxed">
                      {lang === 'en' 
                        ? 'You have not started streaming any content yet. Browse and pick a title, and FLXJO will automatically save your progress.'
                        : 'لم تقم ببدء مشاهدة أي عرض بعد. تصفح الموقع واختر أي فيلم أو مسلسل، وسيقوم فلكس جو تلقائياً بحفظ نقطة البث والتقدم لتسهيل رجوعك لاحقاً.'}
                    </p>
                    <button
                      onClick={() => setActiveTab('home')}
                      className="mt-2 text-xs bg-red-600 text-white font-bold px-4 py-2 rounded-xl hover:bg-red-700 transition cursor-pointer"
                    >
                      {lang === 'en' ? 'Browse Shows Now' : 'تصفح العروض الآن'}
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 sm:gap-8">
                    {watchHistory.map((historyItem) => {
                      // Convert history format to a lightweight media model for MovieCard
                      const fallbackMedia: MediaItem = {
                        id: historyItem.id,
                        title: historyItem.media_type === 'movie' ? historyItem.title : undefined,
                        name: historyItem.media_type === 'tv' ? historyItem.title : undefined,
                        overview: '',
                        poster_path: historyItem.poster_path,
                        backdrop_path: null,
                        vote_average: 8.0,
                        media_type: historyItem.media_type,
                        genre_ids: [],
                        popularity: 100
                      };
                      return (
                        <div key={historyItem.id} className="relative group">
                          <MovieCard
                            item={fallbackMedia}
                            onWatch={handleWatchMedia}
                            onPreferenceChange={handlePreferenceChange}
                            lang={lang}
                          />
                          {historyItem.season && historyItem.episode && (
                            <div className="absolute top-2 left-2 bg-indigo-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-md z-10 border border-indigo-500/20">
                              {lang === 'en' ? `S${historyItem.season} • E${historyItem.episode}` : `م${historyItem.season} - ح${historyItem.episode}`}
                            </div>
                          )}
                          <div className="absolute -bottom-1 left-0 right-0 h-1 bg-red-600 rounded-b-xl z-10" />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            } />

            <Route path="/favorites" element={
              <div className="max-w-none px-4 md:px-12 lg:px-16 pt-8 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-900 pb-4">
                  <div className={lang === 'en' ? 'text-left' : 'text-right'}>
                    <h2 className="text-2xl font-black flex items-center gap-2">
                      <Heart className="w-6 h-6 text-red-500 fill-current" />
                      <span>{lang === 'en' ? 'My Favorite Movies & Shows' : 'قائمتك المفضلة على فلكس جو'}</span>
                    </h2>
                    <p className="text-xs text-zinc-400 mt-1">
                      {lang === 'en' ? 'Your hand-picked collection of titles to stream anytime.' : 'مجموعتك المختارة والمميزة من الأفلام والمسلسلات لتشغيلها سريعاً في أي وقت.'}
                    </p>
                  </div>
                </div>

                {favoriteItems.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-24 text-center gap-3 text-zinc-500 max-w-sm mx-auto">
                    <Heart className="w-12 h-12 text-zinc-800" />
                    <h3 className="font-bold text-sm text-zinc-400">{lang === 'en' ? 'Your list is empty' : 'مفضلتك فارغة حالياً'}</h3>
                    <p className="text-[11px] text-zinc-500 leading-relaxed">
                      {lang === 'en' 
                        ? 'You have not added any titles to your favorites list yet. Open any movie or series and click the heart icon!'
                        : 'لم تقم بإضافة أي عروض إلى المفضلة بعد. تصفح الأعمال وافتح أي عرض سينمائي ثم اضغط على زر المفضلة لتعود إليه هنا.'}
                    </p>
                    <button
                      onClick={() => setActiveTab('home')}
                      className="mt-2 text-xs bg-red-600 text-white font-bold px-4 py-2 rounded-xl hover:bg-red-700 transition cursor-pointer"
                    >
                      {lang === 'en' ? 'Discover Masterpieces' : 'اكتشف الأعمال السينمائية'}
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 sm:gap-8">
                    {favoriteItems.map((item) => (
                      <MovieCard
                        key={item.id}
                        item={item}
                        onWatch={handleWatchMedia}
                        onPreferenceChange={handlePreferenceChange}
                        lang={lang}
                      />
                    ))}
                  </div>
                )}
              </div>
            } />



            <Route path="/admin" element={
              <AdminPortal lang={lang} />
            } />
            <Route path="/admin/login" element={
              <AdminPortal lang={lang} />
            } />

            <Route path="/movies" element={<Navigate to="/movie" replace />} />
            <Route path="/tv-shows" element={<Navigate to="/tv" replace />} />

            <Route path="/watch/:mediaType/:slug/:id" element={
              <WatchPage onPreferenceChange={handlePreferenceChange} lang={lang} />
            } />
            <Route path="/watch/:mediaType/:id" element={
              <WatchPage onPreferenceChange={handlePreferenceChange} lang={lang} />
            } />
            <Route path="/movie/:id/:slug" element={
              <WatchPage onPreferenceChange={handlePreferenceChange} lang={lang} />
            } />
            <Route path="/movie/:id" element={
              <WatchPage onPreferenceChange={handlePreferenceChange} lang={lang} />
            } />
            <Route path="/tv/:id/:slug" element={
              <WatchPage onPreferenceChange={handlePreferenceChange} lang={lang} />
            } />
            <Route path="/tv/:id" element={
              <WatchPage onPreferenceChange={handlePreferenceChange} lang={lang} />
            } />
          </Routes>
      </main>

      {/* Footer Branding credits */}
      <footer className="border-t border-zinc-900 bg-zinc-950 py-10 mt-10 text-center text-xs text-zinc-500 font-normal">
        <div className="max-w-none px-4 md:px-12 lg:px-16 space-y-3 leading-relaxed">
          <div className="flex items-center justify-center gap-2 text-zinc-400 font-bold text-sm">
            <span>{lang === 'en' ? 'FLEX JO Cinema Platform' : 'منصة فلكس جو السينمائية'}</span>
            <span className="w-1 h-1 bg-red-600 rounded-full" />
            <span className="font-mono text-red-500 font-black">FLEX JO</span>
          </div>
          <p className="max-w-md mx-auto">
            {lang === 'en' 
              ? 'Hollywood hits, Japanese anime, and premium series on-demand completely free with zero speed bottleneck. Stream your favorite movies and shows instantly.'
              : 'جميع عروض هوليوود، الأنمي، والمسلسلات في يديك مجاناً كلياً وبدون خوادم تبطئ البث. شاهد عروضك المفضلة فوراً وبمنتهى السهولة.'}
          </p>
          <div className="pt-2 flex items-center justify-center gap-4 text-[11px] text-zinc-600">
            <Link to="/admin" className="hover:text-red-500 transition-colors flex items-center gap-1">
              <span>⚙️</span>
              <span>{lang === 'en' ? 'Admin Portal' : 'بوابة الإدارة (Admin)'}</span>
            </Link>
            <span className="text-zinc-700">•</span>
            <button
              onClick={() => setShowCookieSettings(true)}
              className="hover:text-red-400 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <span>🍪</span>
              <span>{lang === 'en' ? 'Cookie settings' : 'إعدادات الكوكيز'}</span>
            </button>
          </div>
          <p className="text-[10px] text-zinc-600">
            {lang === 'en' 
              ? `© ${new Date().getFullYear()} FLEX JO. All rights reserved to TMDB and partner stream providers.`
              : `© ${new Date().getFullYear()} فلكس جو. جميع الحقوق محفوظة لـ TMDB والشركاء الموفرين للبث.`}
          </p>
        </div>
      </footer>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-zinc-900 border border-zinc-800 text-white text-xs px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 max-w-sm animate-fade-in">
          <div className="w-2 h-2 rounded-full bg-red-600 animate-ping" />
          <span>{toastMessage}</span>
        </div>
      )}

    </div>
      </VersionGuard>
    </SecurityGuard>
  );
}
