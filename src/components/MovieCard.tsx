import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MediaItem } from '../types';
import { getPosterUrl, getGenreName, getMovieDetails, getTVShowDetails } from '../lib/tmdb';
import { Play, Star, Sparkles, Film, Tv } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getTranslations } from '../translations';
import { getBlockedMediaInfo } from '../lib/blocklist';
import { slugify } from '../lib/slugify';
import { trackClick } from '../lib/algorithm';

interface MovieCardProps {
  key?: any;
  item: MediaItem;
  onWatch: (item: MediaItem) => void;
  onPreferenceChange: () => void;
  lang: 'ar' | 'en';
}

export default function MovieCard({ item, onWatch, onPreferenceChange, lang }: MovieCardProps) {
  const blockedInfo = getBlockedMediaInfo(item.id, item.title || item.name);
  const isBlockedShow = blockedInfo !== null;
  const [logoPath, setLogoPath] = useState<string | null>(null);
  const [translatedItem, setTranslatedItem] = useState<MediaItem | null>(null);
  const [isHovered, setIsHovered] = useState(false);

  const t = getTranslations(lang);

  const handleCardClick = (e: React.MouseEvent) => {
    // Click analytics is consent-gated inside trackClick.
    trackClick(item.id);
    // Keep custom watch history logger/event handler working while navigating
    onWatch(translatedItem || item);
  };

  // Lazily fetch logo path and translations for the correct active language
  useEffect(() => {
    let isMounted = true;
    async function loadDetails() {
      try {
        if (item.media_type === 'movie') {
          const details = await getMovieDetails(item.id);
          if (isMounted && details) {
            setTranslatedItem(details);
            if (details.logo_path) {
              setLogoPath(details.logo_path);
            }
          }
        } else if (item.media_type === 'tv') {
          const details = await getTVShowDetails(item.id);
          if (isMounted && details) {
            setTranslatedItem(details);
            if (details.logo_path) {
              setLogoPath(details.logo_path);
            }
          }
        }
      } catch (error) {
        // fail silently
      }
    }
    loadDetails();
    return () => {
      isMounted = false;
    };
  }, [item.id, item.media_type, lang]);

  const displayItem = translatedItem || item;
  const title = displayItem.title || displayItem.name || item.title || item.name || (lang === 'en' ? 'Unknown Title' : 'عمل غير معروف');
  const rawYear = displayItem.release_date || displayItem.first_air_date || item.release_date || item.first_air_date || '';
  const year = rawYear ? rawYear.substring(0, 4) : (lang === 'en' ? 'Ongoing' : 'مستمر');
  const rating = (displayItem.vote_average || item.vote_average) ? (displayItem.vote_average || item.vote_average).toFixed(1) : (lang === 'en' ? 'New' : 'جديد');
  
  // Detect if anime to show special badge
  const isAnime = item.genre_ids?.includes(16) || item.original_language === 'ja' || displayItem.genre_ids?.includes(16);

  const mediaTypeStr = item.media_type || 'movie';
  const itemSlug = slugify(title);
  const watchUrl = `/${mediaTypeStr}/${item.id}/${itemSlug}`;

  return (
    <div 
      className="relative flex flex-col h-full z-10"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.92 }}
        whileHover={{ y: -8, transition: { duration: 0.3, ease: "easeOut" } }}
        className="group relative flex flex-col h-full bg-zinc-950/20"
        dir={lang === 'en' ? 'ltr' : 'rtl'}
      >
        {/* Tall Vertical Poster Image Wrap with extreme rounded corners */}
        <Link 
          to={watchUrl}
          onClick={handleCardClick}
          className={`relative w-full aspect-[2/3] rounded-[2.2rem] overflow-hidden bg-zinc-950 cursor-pointer border-2 block ${isBlockedShow ? 'border-zinc-800/80 group-hover:border-zinc-700' : 'border-zinc-900/60 group-hover:border-red-600/50'} shadow-lg group-hover:shadow-2xl transition-all duration-300`}
        >
          <img
            src={getPosterUrl(displayItem.poster_path || item.poster_path, 'w500')}
            alt={title}
            loading="lazy"
            className={`w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105 ${isBlockedShow ? 'grayscale contrast-125 brightness-75' : ''}`}
            referrerPolicy="no-referrer"
          />

          {/* Cinematic dark linear & radial gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-black/35 opacity-90 transition-opacity duration-300 group-hover:opacity-95" />

          {/* Custom alert banner for Blocked Media */}
          {isBlockedShow && blockedInfo && (
            <div className="absolute inset-x-0 bottom-4 z-10 px-3">
              <div className="bg-black/90 backdrop-blur-md border border-red-500/30 text-red-500 font-extrabold px-2 py-1.5 rounded-xl text-[9px] text-center shadow-lg leading-snug animate-pulse">
                {lang === 'en' ? blockedInfo.shortEn : blockedInfo.shortAr}
              </div>
            </div>
          )}

          {/* Top-Right: Category Type Badge (Movie/TV) and Anime Badge */}
          <div className={`absolute top-3.5 z-10 flex flex-col gap-1.5 items-end ${lang === 'en' ? 'right-3.5' : 'right-3.5'}`}>
            <div className={`flex items-center gap-1 ${isBlockedShow ? 'bg-zinc-900/90 text-zinc-400 border-zinc-700' : 'bg-black/60 text-zinc-200 border-white/10'} backdrop-blur-md font-extrabold px-3 py-1.5 rounded-full text-[10px] border shadow-lg`}>
              {item.media_type === 'tv' ? (
                <>
                  <Tv className={`w-3 h-3 ${isBlockedShow ? 'text-zinc-500' : 'text-red-500'}`} />
                  <span>{t.tv}</span>
                </>
              ) : (
                <>
                  <Film className={`w-3 h-3 ${isBlockedShow ? 'text-zinc-500' : 'text-red-500'}`} />
                  <span>{t.movie}</span>
                </>
              )}
            </div>

            {isAnime && (
              <div className="flex items-center gap-1 bg-emerald-600/90 backdrop-blur-md text-white font-black px-2.5 py-1 rounded-full text-[9px] border border-emerald-500/30 shadow-lg">
                <Sparkles className="w-2.5 h-2.5 text-yellow-300" />
                <span>{t.anime}</span>
              </div>
            )}
          </div>

          {/* Floating play button overlay */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
            <div className={`w-14 h-14 ${Number(item.id) === 76479 ? 'bg-zinc-800' : 'bg-red-600'} rounded-full flex items-center justify-center text-white shadow-2xl transform scale-90 group-hover:scale-100 transition-all`}>
              <Play className="w-5 h-5 fill-current text-white translate-x-0.5" />
            </div>
          </div>
        </Link>

        {/* Info Body */}
        <div className={`mt-3.5 px-2 pb-2 flex flex-col justify-between gap-2.5 ${lang === 'en' ? 'text-left' : 'text-right'}`}>
          {/* Texts */}
          <Link 
            to={watchUrl}
            onClick={handleCardClick}
            className="space-y-1.5 cursor-pointer block group"
          >
            {logoPath ? (
              <div className="flex justify-start h-8 max-w-[80%] my-0.5">
                <img
                  src={`https://image.tmdb.org/t/p/w200${logoPath}`}
                  alt={title}
                  className="h-full object-contain filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]"
                  referrerPolicy="no-referrer"
                />
              </div>
            ) : (
              <h3 className="font-bold text-zinc-100 text-sm sm:text-base line-clamp-1 group-hover:text-red-500 transition-colors tracking-tight">
                {title}
              </h3>
            )}
            
            <div className="flex items-center gap-1.5 text-xs text-zinc-400 font-semibold">
              <span className="font-mono">{year}</span>
              <span className="text-zinc-600">•</span>
              <span className="truncate">
                {displayItem.genre_ids && displayItem.genre_ids.length > 0 
                  ? getGenreName(displayItem.genre_ids[0]) 
                  : (item.genre_ids && item.genre_ids.length > 0 ? getGenreName(item.genre_ids[0]) : (lang === 'en' ? 'Various' : 'أعمال منوعة'))}
              </span>
              <span className="text-zinc-600">•</span>
              <span className="text-yellow-500 font-mono font-bold flex items-center gap-0.5 shrink-0">
                <Star className="w-3 h-3 fill-current text-yellow-500" />
                {rating}
              </span>
            </div>
          </Link>
        </div>
      </motion.div>
    </div>
  );
}

