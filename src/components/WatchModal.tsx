import React, { useEffect, useState, useRef } from 'react';
import { MediaItem, StreamingServer, TVSeason, TVEpisode } from '../types';
import { getMovieDetails, getTVShowDetails, getTVSeasonDetails, getBackdropUrl, getGenreName, getPosterUrl } from '../lib/tmdb';
import { rankMediaItems, toggleFavorite, isFavorite } from '../lib/algorithm';
import AdZone from './AdZone';
import { 
  X, Tv, Film, Play, Star, Sparkles, Clock, AlertCircle, ChevronDown, ListVideo, 
  Moon, Layers, Eye, ChevronRight, ChevronLeft, Heart, Share2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getTranslations } from '../translations';
import { getBlockedMediaInfo } from '../lib/blocklist';

interface WatchModalProps {
  item: MediaItem;
  onClose: () => void;
  onPreferenceChange: () => void;
  onWatch?: (item: MediaItem) => void;
  lang: 'ar' | 'en';
}

const SERVERS: StreamingServer[] = [
  {
    id: 'server-1',
    name: 'السيرفر الأول 🚀',
    url: 'https://streamimdb.ru/embed/',
    icon: '🚀',
    description: 'يعتمد بشكل أساسي على المعرّف IMDB للأفلام والمسلسلات، وهو سيرفر كلاسيكي ومستقر جدًا للاتصالات المتوسطة.',
    badge: 'الافتراضي'
  },
  {
    id: 'server-2',
    name: 'السيرفر الثاني 🍑',
    url: 'https://peachify.top/embed/',
    icon: '🍑',
    description: 'سيرفر ذكي وحديث يدعم الترجمات التلقائية لتخصيص الواجهة وإخفاء الإضافات المزعجة لتمكين تجربة مشاهدة نقية.',
    badge: 'ذكي ومترجم'
  },
  {
    id: 'server-3',
    name: 'السيرفر الثالث ⚡',
    url: 'https://vidnest.fun/embed/',
    icon: '⚡',
    description: 'يتميز بسرعة تسجيل الدخول وسرعة بدء تشغيل الفيديو (Buffer Time شبه من عدم)، وخيار الاتصال الجيد متوافقاً مع جميع أنواع الشاشات والهواتف.',
    badge: 'سريع للغاية'
  },
  {
    id: 'server-4',
    name: 'السيرفر الرابع 💎',
    url: 'https://vidrock.net/embed/',
    icon: '💎',
    description: 'يعتمد دقة الوضوح البصري (Premium HD) مع دعم كامل للتشغيل التلقائي وتوافق معتمد مع شاشات التلفزيون الكبيرة.',
    badge: 'Premium HD'
  }
];

export default function WatchModal({ item, onClose, onPreferenceChange, onWatch, lang }: WatchModalProps) {
  const blockedInfo = getBlockedMediaInfo(item.id, item.title || item.name);
  const isBlockedShow = blockedInfo !== null;
  const [activeServer, setActiveServer] = useState<StreamingServer>(SERVERS[0]);
  const [detailedItem, setDetailedItem] = useState<any | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(true);
  const [isCinemaMode, setIsCinemaMode] = useState(false);
  const [sleepTimer, setSleepTimer] = useState<number | null>(null); // in minutes
  const [sleepTimeRemaining, setSleepTimeRemaining] = useState<number | null>(null); // in seconds
  
  // New State: Two-stage interface (Detail preview mode first, then playing mode)
  const [isPlaying, setIsPlaying] = useState(false);

  // TV specific states
  const [seasons, setSeasons] = useState<TVSeason[]>([]);
  const [selectedSeason, setSelectedSeason] = useState<number>(1);
  const [episodes, setEpisodes] = useState<TVEpisode[]>([]);
  const [selectedEpisode, setSelectedEpisode] = useState<number>(1);
  const [loadingEpisodes, setLoadingEpisodes] = useState(false);

  // Recommendations
  const [relatedMedia, setRelatedMedia] = useState<MediaItem[]>([]);

  // Favorites and sharing states
  const [favorited, setFavorited] = useState<boolean>(isFavorite(item.id));
  const [showShareModal, setShowShareModal] = useState<boolean>(false);

  useEffect(() => {
    setFavorited(isFavorite(item.id));
  }, [item.id]);

  const handleToggleFav = () => {
    const isNewFav = toggleFavorite(item);
    setFavorited(isNewFav);
    onPreferenceChange();
  };

  const sleepTimerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  const t = getTranslations(lang);

  const handleStopPlaying = () => {
    setIsPlaying(false);
  };

  const handleCloseEntirely = () => {
    onClose();
  };
  
  // 1. Fetch details (including external IDs for IMDB, seasons, and related recommendations)
  useEffect(() => {
    async function loadDetails() {
      setLoadingDetails(true);
      try {
        if (item.media_type === 'movie') {
          const data = await getMovieDetails(item.id);
          setDetailedItem(data);
          if (data && data.recommendations?.results) {
            const ranked = rankMediaItems(data.recommendations.results);
            setRelatedMedia(ranked.slice(0, 8));
          }
        } else {
          const data = await getTVShowDetails(item.id);
          setDetailedItem(data);
          
          if (data) {
            const tvSeasons = (data.seasons || []).filter((s: any) => s.season_number > 0);
            setSeasons(tvSeasons);
            if (tvSeasons.length > 0) {
              setSelectedSeason(tvSeasons[0].season_number);
            }

            if (data.recommendations?.results) {
              const ranked = rankMediaItems(data.recommendations.results);
              setRelatedMedia(ranked.slice(0, 8));
            }
          }
        }
      } catch (error) {
        console.error('Failed to load media details:', error);
      } finally {
        setLoadingDetails(false);
      }
    }

    loadDetails();
  }, [item.id]);

  // 2. Fetch episodes when selected season changes
  useEffect(() => {
    if (item.media_type === 'tv' && selectedSeason) {
      async function loadEpisodes() {
        setLoadingEpisodes(true);
        try {
          const eps = await getTVSeasonDetails(item.id, selectedSeason);
          setEpisodes(eps);
          if (eps.length > 0) {
            setSelectedEpisode(1); // Reset to episode 1 on season change
          }
        } catch (error) {
          console.error('Failed to load episodes:', error);
        } finally {
          setLoadingEpisodes(false);
        }
      }
      loadEpisodes();
    }
  }, [item.id, selectedSeason, item.media_type]);

  // 3. Sleep Timer countdown runner
  useEffect(() => {
    if (sleepTimer !== null) {
      setSleepTimeRemaining(sleepTimer * 60);
      
      if (sleepTimerRef.current) clearTimeout(sleepTimerRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);

      countdownRef.current = setInterval(() => {
        setSleepTimeRemaining((prev) => {
          if (prev !== null && prev <= 1) {
            clearInterval(countdownRef.current!);
            onClose(); // Close player when timer hits zero
            return 0;
          }
          return prev !== null ? prev - 1 : null;
        });
      }, 1000);

    } else {
      setSleepTimeRemaining(null);
      if (sleepTimerRef.current) clearTimeout(sleepTimerRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    }

    return () => {
      if (sleepTimerRef.current) clearTimeout(sleepTimerRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [sleepTimer]);

  // Record watch session anytime episode or season changes (for TV Shows)
  const handleEpisodeSelect = (episodeNum: number) => {
    setSelectedEpisode(episodeNum);
    setIsPlaying(true);
  };

  // 4. Construct Iframe Source URL depending on chosen server rules
  const getEmbedSource = (): string => {
    const id = detailedItem?.imdb_id || item.imdb_id || item.id;
    const isTV = item.media_type === 'tv';
    let base = activeServer.url;

    // Standardize slashes
    if (!base.endsWith('/')) base += '/';

    // Different streaming servers require specific paths
    if (!isTV) {
      if (base.includes('vidnest.fun') || base.includes('vidrock.net')) {
        return `${base}movie/${item.id}?autoplay=1&theater=1`;
      } else if (base.includes('vidsrc.xyz') || base.includes('peachify.top')) {
        // Classic prefers IMDB if available, otherwise fallback to TMDB ID
        const finalId = detailedItem?.imdb_id || item.id;
        return `${base}movie/${finalId}?autoplay=true`;
      }
      return `${base}movie/${item.id}`;
    } else {
      // TV Series path
      if (base.includes('vidnest.fun') || base.includes('vidrock.net')) {
        return `${base}tv/${item.id}/${selectedSeason}/${selectedEpisode}?autoplay=1&theater=1`;
      } else if (base.includes('vidsrc.xyz') || base.includes('peachify.top')) {
        const finalId = detailedItem?.imdb_id || item.id;
        return `${base}tv/${finalId}/${selectedSeason}/${selectedEpisode}?autoplay=true`;
      }
      return `${base}tv/${item.id}/${selectedSeason}/${selectedEpisode}`;
    }
  };

  const title = item.title || item.name || (lang === 'en' ? 'Show Details' : 'تفاصيل العرض');
  const rating = item.vote_average ? item.vote_average.toFixed(1) : (lang === 'en' ? 'New' : 'جديد');
  const rawYear = item.release_date || item.first_air_date || '';
  const year = rawYear ? rawYear.substring(0, 4) : '';

  // Sleep Timer values selector
  const TIMER_OPTIONS = lang === 'en' ? [
    { label: 'Cancel Timer', value: null },
    { label: '15 Minutes', value: 15 },
    { label: '30 Minutes', value: 30 },
    { label: '45 Minutes', value: 45 },
    { label: '60 Minutes', value: 60 }
  ] : [
    { label: 'إلغاء المؤقت', value: null },
    { label: '15 دقيقة', value: 15 },
    { label: '30 دقيقة', value: 30 },
    { label: '45 دقيقة', value: 45 },
    { label: '60 دقيقة', value: 60 }
  ];

  // Helper to format remaining sleep time (MM:SS)
  const formatTimeRemaining = (): string => {
    if (sleepTimeRemaining === null) return '';
    const m = Math.floor(sleepTimeRemaining / 60);
    const s = sleepTimeRemaining % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const getServerName = (id: string) => {
    if (lang === 'en') {
      if (id === 'server-1') return 'Server 1 🚀';
      if (id === 'server-2') return 'Server 2 🍑';
      if (id === 'server-3') return 'Server 3 ⚡';
      if (id === 'server-4') return 'Server 4 💎';
    }
    const srv = SERVERS.find(s => s.id === id);
    return srv ? srv.name : '';
  };

  const getServerDesc = (id: string) => {
    if (lang === 'en') {
      if (id === 'server-1') return 'Classic connection using straight IMDB IDs, highly stable for normal internet.';
      if (id === 'server-2') return 'Smart and clean player supporting auto multi-subtitles and custom layouts.';
      if (id === 'server-3') return 'Insanely fast connection and player load with near-zero buffering.';
      if (id === 'server-4') return 'Premium High Definition streaming quality with complete playback stability.';
    }
    const srv = SERVERS.find(s => s.id === id);
    return srv ? srv.description : '';
  };

  const getServerBadge = (id: string) => {
    if (lang === 'en') {
      if (id === 'server-1') return 'Default';
      if (id === 'server-2') return 'Smart & Sub';
      if (id === 'server-3') return 'Ultra Fast';
      if (id === 'server-4') return 'Premium HD';
    }
    const srv = SERVERS.find(s => s.id === id);
    return srv ? srv.badge : '';
  };

  const [copied, setCopied] = useState(false);
  const [personalRating, setPersonalRating] = useState<number>(0);
  const [personalNote, setPersonalNote] = useState('');
  const [reviewSaved, setReviewSaved] = useState(false);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('flxjo_personal_reviews') || '{}');
      const review = saved[String(item.id)] || {};
      setPersonalRating(Number(review.rating) || 0);
      setPersonalNote(typeof review.note === 'string' ? review.note : '');
      setReviewSaved(false);
    } catch {
      setPersonalRating(0);
      setPersonalNote('');
    }
  }, [item.id]);

  const savePersonalReview = () => {
    try {
      const reviews = JSON.parse(localStorage.getItem('flxjo_personal_reviews') || '{}');
      reviews[String(item.id)] = {
        rating: personalRating,
        note: personalNote.trim().slice(0, 500),
        updatedAt: new Date().toISOString(),
      };
      localStorage.setItem('flxjo_personal_reviews', JSON.stringify(reviews));
      setReviewSaved(true);
      window.setTimeout(() => setReviewSaved(false), 1800);
    } catch {
      setReviewSaved(false);
    }
  };

  const renderShareModal = () => {
    if (!showShareModal) return null;

    const shareUrl = `${window.location.protocol}//${window.location.host}/watch/${item.media_type || 'movie'}/${item.id}`;
    const shareText = lang === 'en'
      ? `🎬 I am watching "${title}" on FLXJO Cinema!\n🌟 Rating: ${rating}/10\n🔥 Synopsis: ${item.overview || 'Enjoy movies, TV series, and anime with auto Arabic & English subtitles totally free!'}\n📺 Stream Link: ${shareUrl}\n🖼️ Poster: ${getPosterUrl(item.poster_path, 'original')}`
      : `🎬 أشاهد الآن "${title}" على منصة فلكس جو السينمائية! 🍿\n🌟 التقييم: ${rating}/10\n📝 قصة العرض: ${item.overview || 'استمتع بأحدث مسلسلات هوليوود، الأنمي، والأعمال العالمية مع ترجمة مدمجة وسيرفرات فائقة السرعة مجاناً كلياً.'}\n🔗 رابط البث المباشر: ${shareUrl}\n🖼️ بوستر العرض: ${getPosterUrl(item.poster_path, 'original')}`;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in" dir={lang === 'en' ? 'ltr' : 'rtl'}>
        <div className="bg-zinc-950 border border-zinc-850 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-zinc-900">
            <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
              <Share2 className="w-4 h-4 text-red-500 animate-pulse" />
              <span>{lang === 'en' ? 'Share Movie & Poster' : 'مشاركة بوستر وتفاصيل العرض'}</span>
            </h3>
            <button 
              onClick={() => setShowShareModal(false)}
              className="p-1.5 bg-zinc-900 border border-zinc-850 hover:bg-zinc-850 rounded-xl transition text-zinc-400 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto space-y-4 flex flex-col items-center">
            {/* Poster Preview */}
            <div className="w-28 sm:w-36 aspect-[2/3] rounded-2xl overflow-hidden border-2 border-zinc-800 shadow-xl">
              <img 
                src={getPosterUrl(item.poster_path, 'w500')} 
                alt={title} 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>

            <div className="w-full space-y-2 text-center">
              <h4 className="font-black text-sm text-zinc-100">{title}</h4>
              <p className="text-[10px] text-zinc-400">
                {lang === 'en' 
                  ? 'Copy the pre-designed cinematic card below to share with your friends:' 
                  : 'انسخ كرت المشاركة والبوستر السينمائي المصمم لمشاركته مع أصدقائك عبر المنصات المختلفة:'}
              </p>
            </div>

            {/* Generated Card Container */}
            <div className="w-full bg-zinc-900/60 border border-zinc-850 rounded-2xl p-4 text-xs font-mono text-zinc-300 max-h-48 overflow-y-auto text-left select-all whitespace-pre-wrap leading-relaxed">
              {shareText}
            </div>
          </div>

          {/* Actions */}
          <div className="p-4 bg-zinc-900/40 border-t border-zinc-900 flex items-center gap-2">
            <button
              onClick={() => {
                navigator.clipboard.writeText(shareText);
                setCopied(true);
                setTimeout(() => {
                  setCopied(false);
                  setShowShareModal(false);
                }, 1500);
              }}
              className="flex-grow py-3 bg-red-600 hover:bg-red-700 text-white font-extrabold rounded-xl text-xs transition cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-red-600/25"
            >
              <Share2 className="w-4 h-4 fill-current" />
              <span>{copied ? (lang === 'en' ? 'Copied! 📋✨' : 'تم النسخ بنجاح! 📋✨') : (lang === 'en' ? 'Copy Share Card' : 'نسخ كرت المشاركة والبوستر')}</span>
            </button>
            <button
              onClick={() => setShowShareModal(false)}
              className="px-5 py-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white font-bold rounded-xl text-xs transition cursor-pointer"
            >
              {lang === 'en' ? 'Cancel' : 'إلغاء'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (!isPlaying) {
    // Stage 1: Gorgeously Redesigned Immersive Detail Preview Screen
    return (
      <div 
        className="fixed inset-0 z-50 bg-[#050505] overflow-y-auto text-white pb-24"
        dir={lang === 'en' ? 'ltr' : 'rtl'}
      >
        {/* Massive backdrop cinematic hero with beautiful smooth dark gradient vignette */}
        <div 
          className={`relative w-full h-[220px] sm:h-[360px] md:h-[540px] bg-cover bg-center overflow-hidden ${isBlockedShow ? 'grayscale contrast-125 brightness-[0.5]' : ''}`}
          style={{ backgroundImage: `url(${getBackdropUrl(item.backdrop_path, 'original')})` }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/70 to-transparent" />
          
          {/* Top toolbar close button */}
          <div className={`absolute top-4 z-50 ${lang === 'en' ? 'right-4' : 'left-4'}`}>
            <button 
              onClick={handleCloseEntirely}
              className="p-2.5 sm:p-3 bg-black/60 hover:bg-red-600 hover:text-white text-zinc-300 rounded-full border border-zinc-800/80 transition-all cursor-pointer shadow-lg backdrop-blur-md pointer-events-auto"
              title={lang === 'en' ? 'Close and go back' : 'إغلاق والتراجع للرئيسية'}
            >
              <X className="w-4 sm:w-5 h-4 sm:h-5" />
            </button>
          </div>

          {/* Overlaid details at the bottom of the backdrop (Desktop ONLY) */}
          <div className="absolute bottom-0 inset-x-0 max-w-none px-4 md:px-12 lg:px-16 pb-8 space-y-5 hidden md:block">
            <div className="flex flex-col md:flex-row items-end gap-6 md:gap-8">
              
              {/* Media Poster element */}
              <div className="w-36 sm:w-48 aspect-[2/3] shrink-0 bg-zinc-950 rounded-[2rem] overflow-hidden border-2 border-zinc-800/85 shadow-2xl hidden md:block transform transition-transform duration-300 hover:scale-[1.03]">
                <img 
                  src={getPosterUrl(item.poster_path, 'w500')} 
                  alt={title} 
                  className={`w-full h-full object-cover ${isBlockedShow ? 'grayscale contrast-125 brightness-[0.7]' : ''}`}
                  referrerPolicy="no-referrer"
                />
              </div>

              {/* Text metadata */}
              <div className={`flex-grow space-y-4 ${lang === 'en' ? 'text-left' : 'text-right'}`}>
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="bg-red-600 text-white font-black px-2.5 py-1 rounded-xl text-xs uppercase tracking-wide">
                    {item.media_type === 'tv' ? (lang === 'en' ? 'TV Series' : 'مسلسل تلفزيوني') : (lang === 'en' ? 'Movie' : 'فيلم سينمائي')}
                  </span>
                  
                  {item.genre_ids?.includes(16) && (
                    <span className="bg-indigo-600 text-indigo-100 font-bold px-2.5 py-1 rounded-xl text-xs flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
                      <span>{t.anime}</span>
                    </span>
                  )}

                  <span className="text-sm bg-yellow-600/20 text-yellow-400 border border-yellow-500/30 font-extrabold px-2.5 py-1 rounded-xl flex items-center gap-1">
                    <Star className="w-4 h-4 fill-current text-yellow-400" />
                    {rating}
                  </span>

                  {year && (
                    <span className="text-sm bg-zinc-900 border border-zinc-800 text-zinc-300 px-2.5 py-1 rounded-xl font-bold font-mono">
                      {year}
                    </span>
                  )}
                </div>

                {detailedItem?.logo_path ? (
                  <div className={`flex pt-1 pb-2 ${lang === 'en' ? 'justify-start' : 'justify-start'}`}>
                    <img 
                      src={`https://image.tmdb.org/t/p/w500${detailedItem.logo_path}`} 
                      alt={title} 
                      className="max-h-20 sm:max-h-28 md:max-h-36 object-contain drop-shadow-[0_8px_16px_rgba(0,0,0,0.95)] transition-all duration-300"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                ) : (
                  <h1 className="text-2xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-tight select-text">
                    {title}
                  </h1>
                )}

                {/* Genres */}
                <div className="flex flex-wrap gap-2">
                  {item.genre_ids?.map((gid) => (
                    <span key={gid} className="text-xs bg-zinc-900/90 border border-zinc-800/80 px-3.5 py-1.5 rounded-full text-zinc-300 font-semibold shadow-sm">
                      {getGenreName(gid)}
                    </span>
                  ))}
                </div>

                {/* Huge glows and CTAs */}
                <div className="flex flex-wrap items-center gap-4 pt-3">
                  {isBlockedShow ? (
                    <button
                      disabled
                      className="px-8 py-4 bg-zinc-900 border border-zinc-800 text-zinc-500 rounded-2xl text-sm font-black flex items-center gap-2.5 cursor-not-allowed opacity-70"
                    >
                      <X className="w-5 h-5 text-zinc-500" />
                      <span>{lang === 'en' ? 'Playback Blocked 🚫' : 'التشغيل محظور 🚫'}</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => setIsPlaying(true)}
                      className="px-8 py-4 bg-red-600 hover:bg-red-700 text-white rounded-2xl text-sm font-black transition-all flex items-center gap-2.5 cursor-pointer shadow-xl shadow-red-600/35 hover:shadow-red-600/50 hover:scale-[1.02] transform"
                    >
                      <Play className="w-5 h-5 fill-current text-white" />
                      <span>{lang === 'en' ? 'Stream Now 🎥' : 'تشغيل البث الآن 🎥'}</span>
                    </button>
                  )}

                  <button
                    onClick={handleToggleFav}
                    className={`px-5 py-4 rounded-2xl text-sm font-black transition-all flex items-center gap-2.5 cursor-pointer border ${
                      favorited 
                        ? 'bg-red-600/10 border-red-500/30 text-red-500 hover:bg-red-600/20' 
                        : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800/80'
                    }`}
                  >
                    <Heart className={`w-4 h-4 ${favorited ? 'fill-current text-red-500' : 'text-zinc-400'}`} />
                    <span>{favorited ? t.removeFromFavorites : t.addToFavorites}</span>
                  </button>

                  <button
                    onClick={() => setShowShareModal(true)}
                    className="px-5 py-4 bg-zinc-900 hover:bg-zinc-800/80 border border-zinc-850 text-zinc-300 rounded-2xl text-sm font-black transition-all flex items-center gap-2.5 cursor-pointer"
                  >
                    <Share2 className="w-4 h-4 text-zinc-400" />
                    <span>{t.shareBtn}</span>
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* Mobile Metadata Container (Mobile ONLY, placed neatly below backdrop) */}
        <div className="px-4 pt-5 pb-2 space-y-4 md:hidden block">
          <div className="flex flex-wrap items-center gap-2">
            <span className="bg-red-600 text-white font-black px-2 py-0.5 rounded-lg text-[10px] uppercase tracking-wide">
              {item.media_type === 'tv' ? (lang === 'en' ? 'TV' : 'مسلسل') : (lang === 'en' ? 'Movie' : 'فيلم')}
            </span>
            
            {item.genre_ids?.includes(16) && (
              <span className="bg-indigo-600 text-indigo-100 font-bold px-2 py-0.5 rounded-lg text-[10px] flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-yellow-300" />
                <span>{t.anime}</span>
              </span>
            )}

            <span className="text-[11px] bg-yellow-600/20 text-yellow-400 border border-yellow-500/30 font-extrabold px-2 py-0.5 rounded-lg flex items-center gap-0.5">
              <Star className="w-3 h-3 fill-current text-yellow-400" />
              {rating}
            </span>

            {year && (
              <span className="text-[11px] bg-zinc-900 border border-zinc-800 text-zinc-300 px-2 py-0.5 rounded-lg font-bold font-mono">
                {year}
              </span>
            )}
          </div>

          {detailedItem?.logo_path ? (
            <div className="flex py-1">
              <img 
                src={`https://image.tmdb.org/t/p/w500${detailedItem.logo_path}`} 
                alt={title} 
                className="max-h-16 object-contain drop-shadow-md"
                referrerPolicy="no-referrer"
              />
            </div>
          ) : (
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-tight select-text">
              {title}
            </h1>
          )}

          {/* Genres */}
          <div className="flex flex-wrap gap-1.5">
            {item.genre_ids?.map((gid) => (
              <span key={gid} className="text-[10px] bg-zinc-900 border border-zinc-800 px-2.5 py-1 rounded-full text-zinc-300 font-semibold shadow-sm">
                {getGenreName(gid)}
              </span>
            ))}
          </div>

          {/* Mobile Stream Now Button (Full width) */}
          <div className="pt-2 space-y-2">
            {isBlockedShow ? (
              <button
                disabled
                className="w-full py-3.5 bg-zinc-900 border border-zinc-800 text-zinc-500 rounded-xl text-xs font-black flex items-center justify-center gap-2 cursor-not-allowed opacity-70"
              >
                <X className="w-4 h-4 text-zinc-500" />
                <span>{lang === 'en' ? 'Playback Blocked 🚫' : 'التشغيل محظور 🚫'}</span>
              </button>
            ) : (
              <button
                onClick={() => setIsPlaying(true)}
                className="w-full py-3.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-red-600/20"
              >
                <Play className="w-4 h-4 fill-current text-white" />
                <span>{lang === 'en' ? 'Stream Now 🎥' : 'تشغيل البث الآن 🎥'}</span>
              </button>
            )}

            {/* Mobile Favorites and Share Buttons */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleToggleFav}
                className={`w-full py-2.5 rounded-xl text-[10px] font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer border ${
                  favorited 
                    ? 'bg-red-600/10 border-red-500/20 text-red-500' 
                    : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800'
                }`}
              >
                <Heart className={`w-3.5 h-3.5 ${favorited ? 'fill-current text-red-500' : 'text-zinc-400'}`} />
                <span>{favorited ? t.removeFromFavorites : t.addToFavorites}</span>
              </button>

              <button
                onClick={() => setShowShareModal(true)}
                className="w-full py-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 rounded-xl text-[10px] font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5 text-zinc-400" />
                <span>{t.shareBtn}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Content body split columns */}
        <div className="max-w-none px-4 md:px-12 lg:px-16 py-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Right column: Info & Story & Similar Recommendations */}
            <div className="lg:col-span-2 space-y-8">
              
              {/* Strategic Non-intrusive Ad Zone above Story details */}
              <AdZone type="banner" lang={lang} slot="8829152634" />

              {/* Private personal review: stored only in this browser */}
              <div className="bg-zinc-900/30 border border-zinc-900/80 p-5 rounded-3xl space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-sm text-zinc-100">
                      {lang === 'en' ? 'Your private take' : 'رأيك الشخصي'}
                    </h3>
                    <p className="text-[10px] text-zinc-500 mt-1">
                      {lang === 'en' ? 'Saved on this device only — never shared.' : 'ينحفظ على جهازك فقط — وما بننبعَث لأي حدا.'}
                    </p>
                  </div>
                  <Star className="w-5 h-5 text-yellow-400" />
                </div>
                <div className="flex items-center gap-1" dir="ltr" aria-label={lang === 'en' ? 'Your rating' : 'تقييمك'}>
                  {[1, 2, 3, 4, 5].map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setPersonalRating(value)}
                      className="p-1 rounded-lg hover:bg-yellow-500/10 transition-colors cursor-pointer"
                      aria-label={`${value}/5`}
                    >
                      <Star className={`w-5 h-5 ${value <= personalRating ? 'fill-yellow-400 text-yellow-400' : 'text-zinc-600'}`} />
                    </button>
                  ))}
                  <span className="text-xs text-zinc-500 ml-2">{personalRating ? `${personalRating}/5` : (lang === 'en' ? 'Not rated' : 'لسه ما قيّمت')}</span>
                </div>
                <textarea
                  value={personalNote}
                  onChange={(e) => setPersonalNote(e.target.value.slice(0, 500))}
                  placeholder={lang === 'en' ? 'Write a private note about this title…' : 'اكتب ملاحظة خاصة عن هذا العمل…'}
                  className="w-full min-h-20 resize-y rounded-2xl bg-zinc-950/70 border border-zinc-800 px-3 py-2.5 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-red-600/60"
                  maxLength={500}
                />
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[10px] text-zinc-600">{personalNote.length}/500</span>
                  <button
                    type="button"
                    onClick={savePersonalReview}
                    className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-black transition-colors cursor-pointer"
                  >
                    {reviewSaved ? (lang === 'en' ? 'Saved ✓' : 'انحفظت ✓') : (lang === 'en' ? 'Save my note' : 'احفظ ملاحظتي')}
                  </button>
                </div>
              </div>

              {/* Detailed Description Panel */}
              <div className="bg-zinc-900/30 border border-zinc-900/80 p-6 rounded-3xl space-y-4">
                {isBlockedShow && blockedInfo && (
                  <div className="bg-zinc-950/85 border border-red-950/40 p-6 rounded-3xl space-y-3 shadow-xl text-center grayscale contrast-110 mb-4 animate-pulse" dir="rtl">
                    <div className="flex justify-center mb-1">
                      <span className="p-3 bg-zinc-900 border border-zinc-800 text-red-500 rounded-full text-base">
                        ⚠️
                      </span>
                    </div>
                    <h3 className="text-base sm:text-lg font-black text-zinc-100 tracking-tight leading-snug">
                      {blockedInfo.reasonAr}
                    </h3>
                    <p className="text-[10px] text-zinc-500 font-mono">
                      {blockedInfo.reasonEn}
                    </p>
                  </div>
                )}

                <h3 className="font-bold text-lg text-white border-r-4 border-red-600 pr-3.5">
                  {t.story}
                </h3>
                
                <p className="text-zinc-300 text-sm md:text-base leading-relaxed font-normal select-text">
                  {isBlockedShow && blockedInfo
                    ? (lang === 'en' 
                      ? blockedInfo.reasonEn 
                      : blockedInfo.reasonAr) 
                    : (item.overview || (lang === 'en' ? 'No English summary available for this title at the moment.' : 'لا يوجد وصف عربي متوفر لهذا العمل حالياً. لمشاهدة المضمون والترجمة، السيرفرات تعمل بالكامل لتوفير الترجمة الفورية والخيارات في إعدادات الفيديو.'))
                  }
                </p>

                {/* Additional detailed items */}
                {detailedItem && (
                  <div className="grid grid-cols-2 gap-4 border-t border-zinc-900 pt-4 text-xs text-zinc-400 font-medium">
                    {detailedItem.runtime && (
                      <div>
                        <span className="text-zinc-500">{lang === 'en' ? 'Runtime:' : 'مدة العرض السينمائي:'}</span> {detailedItem.runtime} {lang === 'en' ? 'mins' : 'دقيقة'}
                      </div>
                    )}
                    {detailedItem.number_of_seasons && (
                      <div>
                        <span className="text-zinc-500">{lang === 'en' ? 'Seasons:' : 'عدد المواسم المتاحة:'}</span> {detailedItem.number_of_seasons} {lang === 'en' ? 'seasons' : 'مواسم'}
                      </div>
                    )}
                    {detailedItem.number_of_episodes && (
                      <div>
                        <span className="text-zinc-500">{lang === 'en' ? 'Total Episodes:' : 'إجمالي الحلقات:'}</span> {detailedItem.number_of_episodes} {lang === 'en' ? 'episodes' : 'حلقة'}
                      </div>
                    )}
                    {detailedItem.status && (
                      <div>
                        <span className="text-zinc-500">{lang === 'en' ? 'Status:' : 'حالة البث الحالية:'}</span> {detailedItem.status === 'Ended' ? (lang === 'en' ? 'Ended' : 'مكتمل') : (lang === 'en' ? 'Ongoing' : 'مستمر بالبث الأسبوعي')}
                      </div>
                    )}
                    {detailedItem.tagline && (
                      <div className="col-span-2 italic text-red-400/80 bg-red-600/5 border border-red-500/10 p-3 rounded-xl">
                        "{detailedItem.tagline}"
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Related/Similar recommendations matching user's taste */}
              {relatedMedia.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-red-500" />
                    <h3 className="font-bold text-md text-zinc-100">{lang === 'en' ? 'More Like This ✨' : 'اقتراحات مشابهة مخصصة لذوقك المفضل ✨'}</h3>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {relatedMedia.map((rel) => {
                      const relTitle = rel.title || rel.name || '';
                      const relYear = (rel.release_date || rel.first_air_date || '').substring(0, 4);
                      return (
                        <div 
                          key={rel.id} 
                          onClick={() => {
                            if (onWatch) {
                              onWatch(rel);
                            }
                          }}
                          className={`group relative flex flex-col h-full bg-zinc-950/20 cursor-pointer ${lang === 'en' ? 'text-left' : 'text-right'}`}
                        >
                          <div className="aspect-[2/3] w-full rounded-[1.8rem] overflow-hidden bg-zinc-950 border-2 border-zinc-900/60 group-hover:border-red-600/50 shadow-md group-hover:shadow-xl transition-all duration-300 relative">
                            <img 
                              src={getPosterUrl(rel.poster_path, 'w500')} 
                              alt={relTitle} 
                              className="w-full h-full object-cover transition duration-300 group-hover:scale-105"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                          <h4 className="font-bold text-[11px] text-zinc-200 mt-2 px-1 line-clamp-1 group-hover:text-red-500 transition-colors">{relTitle}</h4>
                          <span className="text-[10px] text-zinc-500 px-1">{relYear || (lang === 'en' ? 'Various' : 'منوعات')}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

            </div>

            {/* Left column: Episode selection lists OR Cinema Tips */}
            <div className="lg:col-span-1">
              {item.media_type === 'tv' ? (
                <div className="bg-zinc-900/30 border border-zinc-900 p-5 rounded-3xl space-y-4 flex flex-col h-[520px]">
                  
                  {/* Episodes List Header */}
                  <div className="flex items-center justify-between border-b border-zinc-800 pb-3 shrink-0">
                    <div className="flex items-center gap-2">
                      <ListVideo className="w-5 h-5 text-red-500" />
                      <h3 className="font-bold text-sm text-zinc-100">{lang === 'en' ? 'Episodes List' : 'قائمة الحلقات والمواسم'}</h3>
                    </div>

                    {/* Seasons dropdown */}
                    {seasons.length > 0 && (
                      <div className="relative inline-block">
                        <select
                          value={selectedSeason}
                          onChange={(e) => setSelectedSeason(Number(e.target.value))}
                          className="bg-zinc-900 text-zinc-100 border border-zinc-800 px-3 py-1.5 rounded-xl text-xs font-bold focus:outline-none focus:border-red-600 cursor-pointer appearance-none pl-6 pr-2"
                        >
                          {seasons.map((s) => (
                            <option key={s.season_number} value={s.season_number}>
                              {s.name || (lang === 'en' ? `Season ${s.season_number}` : `الموسم ${s.season_number}`)}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="w-3.5 h-3.5 text-zinc-400 absolute left-2 top-2.5 pointer-events-none" />
                      </div>
                    )}
                  </div>

                  {/* Episodes listing inside preview */}
                  <div className={`flex-grow overflow-y-auto pr-1 space-y-2 ${lang === 'en' ? 'text-left' : 'text-right'}`}>
                    {isBlockedShow ? (
                      <div className="flex flex-col items-center justify-center gap-2 h-full text-center p-4">
                        <AlertCircle className="w-8 h-8 text-zinc-600" />
                        <h4 className="font-bold text-xs text-zinc-400">{lang === 'en' ? 'Episodes Blocked' : 'الحلقات محجوبة بالكامل'}</h4>
                        <p className="text-[10px] text-zinc-500 leading-relaxed">
                          {lang === 'en' 
                            ? 'Banned work. No episodes are available for stream.' 
                            : 'هذا العمل محظور وموقوف عن العرض بشكل نهائي ولا تتوفر أي حلقات للتشغيل.'}
                        </p>
                      </div>
                    ) : loadingEpisodes ? (
                      <div className="flex flex-col items-center justify-center gap-2 h-full">
                        <div className="w-6 h-6 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                        <p className="text-xs text-zinc-500">{lang === 'en' ? 'Loading episodes...' : 'جاري تحميل حلقات الموسم...'}</p>
                      </div>
                    ) : episodes.length === 0 ? (
                      <div className="flex flex-col items-center justify-center gap-1.5 text-center h-full text-zinc-500 text-xs">
                        <AlertCircle className="w-6 h-6" />
                        <span>{lang === 'en' ? 'No episodes available yet.' : 'لا توجد حلقات متاحة لهذا الموسم حالياً.'}</span>
                      </div>
                    ) : (
                      episodes.map((ep) => {
                        return (
                          <button
                            key={ep.id}
                            onClick={() => handleEpisodeSelect(ep.episode_number)}
                            className="w-full text-right p-2.5 rounded-2xl border bg-zinc-950/40 border-zinc-900/80 hover:border-red-600/40 hover:bg-zinc-900/20 transition-all flex gap-3 cursor-pointer group"
                            dir={lang === 'en' ? 'ltr' : 'rtl'}
                          >
                            {/* Episode thumbnail */}
                            <div className="w-16 h-12 bg-zinc-900 rounded-xl overflow-hidden shrink-0 border border-zinc-800 relative flex items-center justify-center">
                              {ep.still_path ? (
                                <img 
                                  src={getBackdropUrl(ep.still_path, 'w780')} 
                                  alt={ep.name} 
                                  className="w-full h-full object-cover transition duration-300 group-hover:scale-105"
                                  referrerPolicy="no-referrer"
                               />
                              ) : (
                                <Tv className="w-4 h-4 text-zinc-500" />
                              )}
                              
                              <span className="absolute bottom-1 right-1 bg-black/80 text-[8px] font-bold px-1.5 rounded">
                                {lang === 'en' ? `E${ep.episode_number}` : `حـ ${ep.episode_number}`}
                              </span>
                            </div>

                            {/* Episode texts */}
                            <div className={`flex-grow space-y-0.5 overflow-hidden ${lang === 'en' ? 'text-left' : 'text-right'}`}>
                              <h4 className="font-bold text-xs truncate text-zinc-200 group-hover:text-red-500 transition-colors">
                                {lang === 'en' ? `Episode ${ep.episode_number}` : `الحلقة ${ep.episode_number}`}: {ep.name || 'mjehol'}
                              </h4>
                              <p className="text-[10px] text-zinc-400 line-clamp-2 leading-relaxed font-normal">
                                {ep.overview || (lang === 'en' ? 'No English overview available for this episode.' : 'لا يوجد ملخص متوفر لهذه الحلقة حالياً.')}
                              </p>
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              ) : (
                // Cinema Guidelines for Movies
                <div className="space-y-4">
                  <AdZone type="rectangle" lang={lang} slot="7729152635" />
                  <div className="bg-zinc-900/30 border border-zinc-900 p-5 rounded-3xl space-y-4">
                    <h3 className="font-bold text-sm text-zinc-100 pb-2 border-b border-zinc-800 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-500" />
                      <span>{lang === 'en' ? 'Viewing Tips' : 'تلميحات وإرشادات المشاهدة'}</span>
                    </h3>

                    <ul className={`space-y-4 text-xs text-zinc-400 font-normal leading-relaxed list-disc pr-4 ${lang === 'en' ? 'text-left pl-4 pr-0' : 'text-right pr-4'}`}>
                      {lang === 'en' ? (
                        <>
                          <li>
                            <strong className="text-zinc-200">Auto Subtitles:</strong> All streaming servers support auto arabic and english captions. Just click "CC" to toggle.
                          </li>
                          <li>
                            <strong className="text-zinc-200">High-speed:</strong> Select Default or Premium servers for the fastest streaming with zero buffering delay.
                          </li>
                          <li>
                            <strong className="text-zinc-200">Auto Quality:</strong> The player adapts automatically based on your current network speed.
                          </li>
                        </>
                      ) : (
                        <>
                          <li>
                            <strong className="text-zinc-200">الترجمة التلقائية:</strong> جميع سيرفرات البث لدينا تدعم إدراج الترجمة العربية الفورية. فقط انقر على رمز المشغل لتفعيلها.
                          </li>
                          <li>
                            <strong className="text-zinc-200">سرعة الاستجابة:</strong> للحصول على سرعة هائلة ودقة فائقة من البداية، قم باختيار السيرفر الافتراضي أو سيرفر بريميوم.
                          </li>
                          <li>
                            <strong className="text-zinc-200">دقة العرض:</strong> يتكيف النظام تلقائياً مع سرعة شبكتك ليوفر لك أعلى دقة بصرية ممكنة.
                          </li>
                        </>
                      )}
                    </ul>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>

        {renderShareModal()}
      </div>
    );
  }

  // Stage 2: Gorgeous Full-featured Video Streaming Player UI
  if (isBlockedShow && isPlaying && blockedInfo) {
    return (
      <div className="fixed inset-0 z-50 bg-[#020202] flex items-center justify-center p-6 text-white text-center select-none" dir="rtl">
        <div className="max-w-xl w-full bg-zinc-950 border border-zinc-800 p-10 rounded-[2.5rem] shadow-2xl space-y-8 grayscale contrast-110">
          <div className="flex justify-center">
            <div className="p-5 bg-zinc-900 text-red-500 rounded-full border border-zinc-800 animate-pulse text-xl">
              ⚠️
            </div>
          </div>

          <div className="space-y-4">
            <h1 className="text-xl sm:text-2xl font-black text-zinc-100 tracking-tight leading-snug">
              {blockedInfo.reasonAr}
            </h1>
            <p className="text-xs text-zinc-400 leading-relaxed max-w-md mx-auto">
              تم حظر تشغيل هذا العمل وبثه بالكامل على موقع فلكس جو للأسباب الموضحة أعلاه. نقدر تفهمكم وحرصكم الدائم على الحفاظ على قيمنا الإسلامية وهويتنا الدينية السامية ونصرة نبينا الكريم ومقدساتنا.
            </p>
            <div className="pt-2 border-t border-zinc-900 text-zinc-500 font-mono text-[10px] uppercase">
              {blockedInfo.reasonEn}
            </div>
          </div>

          <div className="pt-4 flex justify-center gap-3">
            <button
              onClick={handleStopPlaying}
              className="px-6 py-3 bg-zinc-900 border border-zinc-800 hover:bg-zinc-850 hover:text-white text-zinc-300 font-bold rounded-xl text-xs transition cursor-pointer"
            >
              {lang === 'en' ? 'Back to Details' : 'العودة للتفاصيل'}
            </button>
            <button
              onClick={handleCloseEntirely}
              className="px-6 py-3 bg-red-600/10 border border-red-500/20 hover:bg-red-600 hover:text-white text-red-500 font-bold rounded-xl text-xs transition cursor-pointer"
            >
              {lang === 'en' ? 'Exit Player' : 'الرجوع للرئيسية'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Stage 2: Gorgeous Full-featured Video Streaming Player UI
  return (
    <div 
      className={`fixed inset-0 z-50 bg-[#020202] overflow-y-auto text-white transition-all duration-300 pb-24 ${
        isCinemaMode ? 'bg-[#000000]/98' : 'bg-[#020202]'
      }`}
      dir={lang === 'en' ? 'ltr' : 'rtl'}
    >
      {/* Dynamic ambient blurring background */}
      <div 
        className="absolute top-0 inset-x-0 h-[380px] bg-cover bg-center opacity-10 filter blur-3xl pointer-events-none transition-all"
        style={{ backgroundImage: `url(${getBackdropUrl(item.backdrop_path)})` }}
      />

      {/* Main Container */}
      <div className="max-w-none px-4 md:px-12 lg:px-16 py-6 relative z-10 flex flex-col gap-6">
        
        {/* Navigation & Toolbar with dynamic buttons */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-4">
          <div className="flex flex-col gap-3 w-full sm:w-auto">
            <div className="flex items-center justify-between sm:justify-start gap-2 w-full">
              <button 
                onClick={handleStopPlaying}
                className="flex items-center gap-1.5 px-3 py-2 bg-zinc-900 border border-zinc-800 text-zinc-300 hover:bg-zinc-800 rounded-xl transition text-xs font-bold cursor-pointer"
                title={lang === 'en' ? 'Go back to details' : 'الرجوع لصفحة تفاصيل العرض'}
              >
                {lang === 'en' ? <ChevronLeft className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                <span>{lang === 'en' ? 'Back' : 'العودة'}</span>
              </button>

              <button 
                onClick={handleCloseEntirely}
                className="flex items-center gap-1.5 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl transition text-xs font-bold shadow-lg shadow-red-600/20 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>{lang === 'en' ? 'Close Player' : 'إغلاق المشغل'}</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span className="p-1 bg-red-600/15 text-red-500 rounded font-black font-mono text-[10px] animate-pulse">LIVE</span>
              <h1 className="text-sm sm:text-base font-black line-clamp-1 text-zinc-100">
                {title} {item.media_type === 'tv' && `• ${lang === 'en' ? `Ep ${selectedEpisode}` : `حـ ${selectedEpisode}`}`}
              </h1>
            </div>
          </div>

          {/* Player controls bar */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-start sm:justify-end">
            
            {/* Sleep Timer */}
            <div className="relative group flex-grow sm:flex-grow-0">
              <button 
                className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs border transition ${
                  sleepTimer 
                    ? 'bg-amber-600/20 border-amber-500 text-amber-400 font-bold' 
                    : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800'
                }`}
              >
                <Moon className="w-4 h-4" />
                <span>
                  {sleepTimer ? `${lang === 'en' ? 'Timer' : 'مؤقت النوم'}: ${formatTimeRemaining()}` : (lang === 'en' ? 'Sleep Timer' : 'مؤقت النوم')}
                </span>
                <ChevronDown className="w-3 h-3 text-zinc-400" />
              </button>

              <div className={`absolute mt-2 w-44 bg-zinc-900 border border-zinc-800 rounded-xl p-1.5 shadow-xl hidden group-hover:block z-50 ${lang === 'en' ? 'left-0 text-left' : 'right-0 text-right'}`}>
                {TIMER_OPTIONS.map((opt, i) => (
                  <button
                    key={i}
                    onClick={() => setSleepTimer(opt.value)}
                    className={`w-full px-3 py-2 text-xs rounded-lg hover:bg-zinc-800 transition ${lang === 'en' ? 'text-left' : 'text-right'} ${
                      sleepTimer === opt.value ? 'text-amber-400 bg-zinc-800/60 font-bold' : 'text-zinc-300'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Cinema Mode */}
            <button
              onClick={() => setIsCinemaMode(!isCinemaMode)}
              className={`flex-grow sm:flex-grow-0 flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs border transition ${
                isCinemaMode 
                  ? 'bg-red-600 border-red-500 text-white font-bold' 
                  : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800'
              }`}
            >
              <Eye className="w-4 h-4" />
              <span>{isCinemaMode ? (lang === 'en' ? 'Cinema: On' : 'وضع السينما: مفعّل') : (lang === 'en' ? 'Cinema Mode' : 'وضع السينما')}</span>
            </button>
          </div>
        </div>

        {/* Dynamic Video Streaming Stage */}
        <div className={`relative w-full aspect-video rounded-2xl overflow-hidden bg-black border border-zinc-800/80 shadow-2xl transition-all duration-300 ${
          isCinemaMode ? 'scale-[1.01] shadow-red-950/20 max-h-[75vh]' : 'max-h-[65vh]'
        }`}>
          {loadingDetails ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-zinc-950">
              <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-zinc-400">{lang === 'en' ? 'Connecting to global mirrors and buffering...' : 'جاري الاتصال بالسيرفرات المتاحة وتجهيز البث...'}</p>
            </div>
          ) : (
            <iframe
              src={getEmbedSource()}
              className="w-full h-full"
              allowFullScreen
              allow="autoplay; encrypted-media; picture-in-picture"
              scrolling="no"
              referrerPolicy="no-referrer"
              title="FlxJo Streaming Frame"
            />
          )}

          {isCinemaMode && (
            <div className="absolute bottom-4 left-4 z-20 pointer-events-none">
              <span className="bg-black/80 backdrop-blur-md border border-zinc-800/80 px-2.5 py-1 text-[10px] text-zinc-400 rounded-lg">
                {lang === 'en' ? 'Cinema Mode Active • Use top buttons to toggle back' : 'وضع السينما نشط • اضغط على زر العودة بالأعلى للتبديل'}
              </span>
            </div>
          )}
        </div>

        {/* Non-intrusive ad space during active viewing */}
        {!isCinemaMode && <AdZone type="banner" lang={lang} slot="9929152636" className="my-2" />}

        {/* 4 Multi-Server Tabs Switcher */}
        <div className="bg-zinc-900/40 border border-zinc-800 p-4 rounded-2xl flex flex-col gap-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 pb-3 border-b border-zinc-800/80">
            <div className={lang === 'en' ? 'text-left' : 'text-right'}>
              <h3 className="font-bold text-sm text-zinc-100 flex items-center gap-2">
                <Layers className="w-4 h-4 text-red-500" />
                <span>{lang === 'en' ? 'Mirror Streaming Servers (4 Global Nodes)' : 'تبديل سيرفرات البث (4 سيرفرات عالمية)'}</span>
              </h3>
              <p className="text-[11px] text-zinc-400 mt-1">{lang === 'en' ? 'If you experience slow buffer or connection issues on this node, switch mirrors with one click:' : 'إذا واجهت بطئاً أو تقطيعاً في السيرفر الحالي، قم بالتبديل فوراً لسيرفر آخر بنقرة واحدة:'}</p>
            </div>
            
            <div className="flex gap-2">
              <span className="text-[10px] bg-red-600/10 text-red-500 font-bold px-2 py-0.5 rounded border border-red-500/20 flex items-center">
                {lang === 'en' ? 'Ads Auto-Blocked 🚫' : 'إعلانات محجوبة تلقائياً 🚫'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
            {SERVERS.map((srv) => {
              const active = activeServer.id === srv.id;
              return (
                <button
                  key={srv.id}
                  onClick={() => setActiveServer(srv)}
                  className={`relative p-3 rounded-xl border transition-all flex flex-col gap-1 cursor-pointer ${lang === 'en' ? 'text-left' : 'text-right'} ${
                    active 
                      ? 'bg-red-600/15 border-red-600 text-red-500' 
                      : 'bg-zinc-900/80 border-zinc-800/80 text-zinc-300 hover:bg-zinc-800/60'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 w-full">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-base shrink-0">{srv.icon}</span>
                      <span className="font-bold text-[11px] truncate">{getServerName(srv.id)}</span>
                    </div>
                    {srv.badge && (
                      <span className="text-[8px] bg-zinc-800 text-zinc-300 px-1 py-0.5 rounded font-bold border border-zinc-700 shrink-0">
                        {getServerBadge(srv.id)}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-zinc-400 line-clamp-1">{getServerDesc(srv.id)}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Dynamic lower layout list for series or film tip guide inside active player */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className={`bg-zinc-900/20 border border-zinc-900 p-5 rounded-2xl flex gap-4 ${lang === 'en' ? 'text-left' : 'text-right'}`}>
              <div className="space-y-2">
                <h3 className="font-bold text-sm text-zinc-100">{lang === 'en' ? 'You are watching:' : 'أنت تشاهد الآن:'} {title}</h3>
                <p className="text-zinc-400 text-xs font-normal">
                  {item.overview || (lang === 'en' ? 'Enjoy the stream! Subtitles and streaming servers are optimized for direct experience without interruption.' : 'استمتع بمشاهدة العرض. تم دمج الترجمة وسيرفرات البث التلقائي بمتعة مشاهدة متواصلة دون مقاطعة.')}
                </p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-1">
            {item.media_type === 'tv' && seasons.length > 0 && (
              <div className="bg-zinc-900/30 border border-zinc-800 p-4 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-xs text-zinc-200">{lang === 'en' ? 'Quick Episode Switcher:' : 'تبديل حلقة البث سريعاً:'}</h3>
                  <span className="text-[10px] text-zinc-500">{lang === 'en' ? `Season ${selectedSeason}` : `الموسم ${selectedSeason}`}</span>
                </div>
                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {episodes.map((ep) => {
                    const active = selectedEpisode === ep.episode_number;
                    return (
                      <button
                        key={ep.id}
                        onClick={() => handleEpisodeSelect(ep.episode_number)}
                        className={`w-full text-right p-2 rounded-xl border transition-all flex gap-3 cursor-pointer group ${
                          active 
                            ? 'bg-red-600/10 border-red-600 text-white' 
                            : 'bg-zinc-950/60 border-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-900/40'
                        }`}
                        dir={lang === 'en' ? 'ltr' : 'rtl'}
                      >
                        {/* Thumbnail */}
                        <div className="w-16 h-11 bg-zinc-900 rounded-lg overflow-hidden shrink-0 border border-zinc-800 relative flex items-center justify-center">
                          {ep.still_path ? (
                            <img 
                              src={getBackdropUrl(ep.still_path, 'w780')} 
                              alt={ep.name} 
                              className="w-full h-full object-cover transition duration-300 group-hover:scale-105"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <Tv className="w-4 h-4 text-zinc-500" />
                          )}
                          <span className="absolute bottom-0.5 right-0.5 bg-black/80 text-[8px] font-bold px-1 rounded">
                            {lang === 'en' ? `E${ep.episode_number}` : `حـ ${ep.episode_number}`}
                          </span>
                        </div>

                        {/* Texts */}
                        <div className={`flex-grow space-y-0.5 overflow-hidden ${lang === 'en' ? 'text-left' : 'text-right'} self-center`}>
                          <h4 className={`font-bold text-[11px] truncate ${active ? 'text-red-500' : 'text-zinc-200 group-hover:text-red-500'}`}>
                            {lang === 'en' ? `Episode ${ep.episode_number}` : `الحلقة ${ep.episode_number}`}
                          </h4>
                          <span className="text-[10px] text-zinc-500 truncate block">
                            {ep.name || (lang === 'en' ? 'Episode Title' : 'عنوان الحلقة')}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {renderShareModal()}
      </div>
    </div>
  );
}
