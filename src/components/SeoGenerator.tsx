import React, { useState } from 'react';
import { 
  Brain, Search, Sparkles, Copy, Check, FileText, Code, 
  Eye, RefreshCw, AlertCircle, Trash2, ArrowRight, HelpCircle,
  Globe, ExternalLink, Send, Zap, Bot, ShieldCheck, Database,
  Layers, CheckCircle2, Radio
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getTranslations } from '../translations';
import { searchMedia } from '../lib/tmdb';
import { MediaItem } from '../types';

interface SeoGeneratorProps {
  lang: 'ar' | 'en';
}

interface GeneratedSeoData {
  seoTitle: string;
  metaDescription: string;
  focusKeywords: string[];
  uniqueContent: string;
  schemaMarkup: string;
}

export default function SeoGenerator({ lang }: SeoGeneratorProps) {
  const t = getTranslations(lang);
  
  // States
  const [activeSubTab, setActiveSubTab] = useState<'generator' | 'indexing' | 'sitemaps'>('generator');
  const [customMovieName, setCustomMovieName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<MediaItem[]>([]);
  const [selectedMovie, setSelectedMovie] = useState<MediaItem | null>(null);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedData, setGeneratedData] = useState<GeneratedSeoData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [targetLanguage, setTargetLanguage] = useState<'ar' | 'en'>(lang);
  
  // Ping engine states
  const [isPinging, setIsPinging] = useState(false);
  const [pingResult, setPingResult] = useState<any>(null);

  // Copy state triggers
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  // Handle movie search from TMDB for autofill
  const handleSearchMovies = async (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    setLoadingSearch(true);
    try {
      const results = await searchMedia(query, 1);
      setSearchResults(results.slice(0, 5));
    } catch (err) {
      console.error('Error searching movies for SEO:', err);
    } finally {
      setLoadingSearch(false);
    }
  };

  const handleSelectMovie = (movie: MediaItem) => {
    setSelectedMovie(movie);
    setCustomMovieName(movie.title || movie.name || '');
    setSearchResults([]);
    setSearchQuery('');
  };

  const handleClearSelected = () => {
    setSelectedMovie(null);
    setCustomMovieName('');
  };

  const handleGenerate = async () => {
    const movieToGenerate = customMovieName.trim();
    if (!movieToGenerate) {
      setError(lang === 'en' ? 'Please enter or search for a movie name first' : 'يرجى كتابة أو اختيار اسم الفيلم أولاً');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setGeneratedData(null);

    try {
      const response = await fetch('/api/seo-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          movieName: movieToGenerate,
          language: targetLanguage
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate SEO assets');
      }

      setGeneratedData(data);
    } catch (err: any) {
      console.error('SEO Generation error:', err);
      setError(err.message || (lang === 'en' ? 'Failed to connect to AI generation server.' : 'فشل الاتصال بخادم توليد السيو بالذكاء الاصطناعي.'));
    } finally {
      setIsGenerating(false);
    }
  };

  // Ping search engines
  const handlePingSearchEngines = async () => {
    setIsPinging(true);
    setPingResult(null);
    try {
      const res = await fetch('/api/seo/ping-engines', { method: 'POST' });
      const data = await res.json();
      setPingResult(data);
    } catch (err: any) {
      setPingResult({ error: err.message || 'Failed to ping search engines' });
    } finally {
      setIsPinging(false);
    }
  };

  const triggerCopy = (text: string, sectionId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(sectionId);
    setTimeout(() => {
      setCopiedSection(null);
    }, 2500);
  };

  const sitemapsList = [
    { title: 'Master Index (Sitemap Index)', url: '/sitemap.xml', desc: 'الفهرس الشامل المعتمد لدى Google Search Console', type: 'Index' },
    { title: 'Main Pages (Core URLs)', url: '/sitemap-main.xml', desc: 'الرئيسية، الأفلام، المسلسلات، الأنمي، المفضلة', type: 'Static' },
    { title: 'Trending Hits (Hourly Update)', url: '/sitemap-trending.xml', desc: 'أحدث الأفلام والمسلسلات الرائجة اليوم بأعلى أولوية (1.0)', type: 'Dynamic' },
    { title: 'Movies Catalog (Top & Popular)', url: '/sitemap-movies.xml', desc: 'أضخم مكتبة أفلام مع وسوم الصور والعناوين الغنية', type: 'Dynamic' },
    { title: 'TV Shows Catalog', url: '/sitemap-tv.xml', desc: 'المسلسلات التلفزيونية العالمية المحدثة', type: 'Dynamic' },
    { title: 'Anime Series Catalog', url: '/sitemap-anime.xml', desc: 'روائع الأنمي الياباني والمسلسلات الكرتونية', type: 'Dynamic' },
  ];

  const indexingScriptCode = `// Google Indexing API - Automatic Script for FLXJO
// Install: npm install googleapis
const { google } = require('googleapis');
const key = require('./service_account.json'); // Google Cloud Service Account

const jwtClient = new google.auth.JWT(
  key.client_email,
  null,
  key.private_key,
  ['https://www.googleapis.com/auth/indexing'],
  null
);

async function indexMovieUrl(url) {
  await jwtClient.authorize();
  const indexing = google.indexing({ version: 'v3', auth: jwtClient });
  const response = await indexing.urlNotifications.publish({
    requestBody: {
      url: url,
      type: 'URL_UPDATED' // Or 'URL_DELETED'
    }
  });
  console.log('Indexed successfully:', response.data);
}

// Example usage:
// indexMovieUrl('https://flxjo.netlify.app/movie/969681/spider-man-brand-new-day');
`;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8" dir={lang === 'en' ? 'ltr' : 'rtl'}>
      
      {/* Premium Elegant Header */}
      <div className="text-center space-y-3 py-6 max-w-2xl mx-auto">
        <div className="inline-flex p-3 bg-red-600/10 text-red-500 rounded-2xl border border-red-500/20 mb-2 animate-pulse">
          <Brain className="w-8 h-8 text-red-500" />
        </div>
        <h1 className="text-2xl sm:text-4.5xl font-black tracking-tight text-white leading-tight">
          {lang === 'en' ? 'FlxJo Google SEO & Mass Indexing Suite' : 'منظومة فلكس جو للسيو والأرشفة الشاملة في Google'}
        </h1>
        <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
          {lang === 'en' 
            ? 'State-of-the-art cinematic SEO generation, automated Sitemap Index hierarchy, Search Engine Ping Dispatcher, and Google Indexing API integration.'
            : 'أقوى أدوات تهيئة محركات البحث السينمائية، خريطة الموقع السداسية المحدثة لحظياً، إرسال الأرشفة الفورية لمحركات البحث، وأكواد Google Indexing API.'}
        </p>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center justify-center">
        <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-zinc-900/60 border border-zinc-850 rounded-2xl backdrop-blur-xl max-w-full">
          <button
            type="button"
            onClick={() => setActiveSubTab('generator')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all ${
              activeSubTab === 'generator'
                ? 'bg-red-600 text-white shadow-lg shadow-red-600/25'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>{lang === 'en' ? 'AI SEO Generator' : 'مولد السيو والشيما الذكي'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('indexing')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all ${
              activeSubTab === 'indexing'
                ? 'bg-red-600 text-white shadow-lg shadow-red-600/25'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
            }`}
          >
            <Zap className="w-4 h-4 text-amber-400" />
            <span>{lang === 'en' ? 'Instant Mass Indexing & Ping' : 'محطة الأرشفة الفورية و Google API'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('sitemaps')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all ${
              activeSubTab === 'sitemaps'
                ? 'bg-red-600 text-white shadow-lg shadow-red-600/25'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
            }`}
          >
            <Layers className="w-4 h-4 text-emerald-400" />
            <span>{lang === 'en' ? 'Sitemap Index Tree' : 'خرائط الموقع السداسية (Sitemaps)'}</span>
          </button>
        </div>
      </div>

      {/* TAB 1: AI Content & Schema Generator */}
      {activeSubTab === 'generator' && (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-in fade-in duration-200">
        
        {/* Left Input Configuration Panel */}
        <div className="lg:col-span-5 bg-zinc-900/40 border border-zinc-850 p-6 rounded-3xl space-y-6 backdrop-blur-md">
          <h2 className="text-sm font-extrabold text-white flex items-center gap-2 pb-3 border-b border-zinc-850">
            <Sparkles className="w-4 h-4 text-red-500" />
            <span>{lang === 'en' ? 'Configure SEO Parameters' : 'تخصيص مدخلات السيو'}</span>
          </h2>

          {/* 1. Language Target Selector */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-400 block">
              {lang === 'en' ? 'Output Content Language' : 'لغة المحتوى الناتجة'}
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-zinc-950 rounded-xl border border-zinc-850">
              <button
                type="button"
                onClick={() => setTargetLanguage('ar')}
                className={`py-2 text-xs font-bold rounded-lg transition-all ${
                  targetLanguage === 'ar'
                    ? 'bg-red-600 text-white shadow'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                اللغة العربية (Arabic)
              </button>
              <button
                type="button"
                onClick={() => setTargetLanguage('en')}
                className={`py-2 text-xs font-bold rounded-lg transition-all ${
                  targetLanguage === 'en'
                    ? 'bg-red-600 text-white shadow'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                English
              </button>
            </div>
          </div>

          {/* 2. Search DB / Manual Enter */}
          <div className="space-y-4">
            <div className="space-y-2 relative">
              <label className="text-xs font-bold text-zinc-400 block">
                {lang === 'en' ? '1. Search Cinematic Database (Recommended)' : '١. ابحث في قاعدة البيانات السينمائية (موصى به)'}
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearchMovies(e.target.value)}
                  placeholder={lang === 'en' ? 'Type to search movie or show...' : 'اكتب اسم الفيلم أو المسلسل للبحث...'}
                  className={`w-full bg-zinc-950 border border-zinc-850 focus:border-red-600 focus:ring-2 focus:ring-red-600/20 text-xs text-white rounded-xl py-2.5 placeholder-zinc-500 focus:outline-none transition ${
                    lang === 'en' ? 'pl-9 pr-3' : 'pr-9 pl-3'
                  }`}
                />
                <Search className={`w-3.5 h-3.5 absolute top-3.5 text-zinc-500 ${lang === 'en' ? 'left-3' : 'right-3'}`} />
              </div>

              {/* Search Dropdown Results */}
              <AnimatePresence>
                {searchResults.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute z-30 w-full bg-zinc-950 border border-zinc-850 rounded-xl mt-1 shadow-2xl overflow-hidden divide-y divide-zinc-900"
                  >
                    {searchResults.map((movie) => (
                      <div
                        key={movie.id}
                        onClick={() => handleSelectMovie(movie)}
                        className="p-3 hover:bg-zinc-900/80 cursor-pointer flex items-center gap-3 transition-colors"
                      >
                        {movie.poster_path ? (
                          <img
                            src={`https://image.tmdb.org/t/p/w92${movie.poster_path}`}
                            alt={movie.title || movie.name}
                            className="w-8 h-12 object-cover rounded-lg shrink-0"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-8 h-12 bg-zinc-900 rounded-lg flex items-center justify-center shrink-0">
                            <FileText className="w-4 h-4 text-zinc-600" />
                          </div>
                        )}
                        <div className="text-right flex-grow min-w-0">
                          <h4 className="text-xs font-bold text-white truncate">{movie.title || movie.name}</h4>
                          <p className="text-[10px] text-zinc-500 font-mono mt-0.5">
                            {movie.media_type === 'tv' ? (lang === 'en' ? 'TV Show' : 'مسلسل') : (lang === 'en' ? 'Movie' : 'فيلم')}
                            {movie.release_date || movie.first_air_date ? ` • ${((movie.release_date || movie.first_air_date) || '').substring(0, 4)}` : ''}
                          </p>
                        </div>
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="flex items-center justify-center gap-2">
              <div className="h-[1px] bg-zinc-850 flex-grow" />
              <span className="text-[10px] text-zinc-500 font-bold uppercase">{lang === 'en' ? 'OR' : 'أو'}</span>
              <div className="h-[1px] bg-zinc-850 flex-grow" />
            </div>

            {/* Manual input */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-400 block">
                {lang === 'en' ? '2. Enter Custom Movie Name' : '٢. اكتب اسم الفيلم يدوياً'}
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={customMovieName}
                  onChange={(e) => setCustomMovieName(e.target.value)}
                  placeholder={lang === 'en' ? 'e.g., Inception, The Dark Knight...' : 'مثال: فيلم الرسالة، انسبشن...'}
                  className="w-full bg-zinc-950 border border-zinc-850 focus:border-red-600 focus:ring-2 focus:ring-red-600/20 text-xs text-white rounded-xl py-2.5 px-3 placeholder-zinc-500 focus:outline-none transition"
                />
                {customMovieName && (
                  <button
                    type="button"
                    onClick={handleClearSelected}
                    className={`absolute top-2 text-[10px] font-bold bg-zinc-900 border border-zinc-800 text-zinc-400 px-2 py-1 rounded-md hover:bg-zinc-800 ${
                      lang === 'en' ? 'right-2' : 'left-2'
                    }`}
                  >
                    {lang === 'en' ? 'Clear' : 'مسح'}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Selected TMDB Movie Banner Preview */}
          {selectedMovie && (
            <div className="bg-zinc-950 p-3 rounded-2xl border border-zinc-850/60 flex items-center gap-3">
              {selectedMovie.poster_path ? (
                <img
                  src={`https://image.tmdb.org/t/p/w185${selectedMovie.poster_path}`}
                  alt={selectedMovie.title}
                  className="w-12 h-18 object-cover rounded-xl shrink-0 border border-zinc-800"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-12 h-18 bg-zinc-900 rounded-xl flex items-center justify-center shrink-0">
                  <FileText className="w-6 h-6 text-zinc-700" />
                </div>
              )}
              <div className="min-w-0 flex-grow">
                <span className="text-[9px] bg-red-600/10 text-red-500 border border-red-500/20 px-2 py-0.5 rounded-md font-bold uppercase tracking-wider">
                  {lang === 'en' ? 'Auto-Filled from TMDB' : 'مستورد من TMDB'}
                </span>
                <h3 className="font-bold text-xs text-white truncate mt-1.5">{selectedMovie.title || selectedMovie.name}</h3>
                <p className="text-[10px] text-zinc-500 font-mono mt-0.5">
                  Rating: ★{(selectedMovie.vote_average || 7.5).toFixed(1)}
                </p>
              </div>
            </div>
          )}

          {/* Error notice */}
          {error && (
            <div className="p-3 bg-red-600/10 border border-red-500/20 text-red-400 text-xs rounded-xl flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Generate Button */}
          <button
            type="button"
            onClick={handleGenerate}
            disabled={isGenerating || !customMovieName.trim()}
            className="w-full bg-red-600 hover:bg-red-700 disabled:bg-zinc-800 disabled:text-zinc-500 text-white font-extrabold text-xs py-3 rounded-xl transition shadow-xl shadow-red-600/10 flex items-center justify-center gap-2 cursor-pointer"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>{lang === 'en' ? 'Writing High-Quality SEO...' : 'جاري كتابة السيو الاحترافي بالذكاء...'}</span>
              </>
            ) : (
              <>
                <Brain className="w-4 h-4" />
                <span>{lang === 'en' ? 'Generate SEO Assets 🚀' : 'توليد أصول السيو والتحليل 🚀'}</span>
              </>
            )}
          </button>

          <div className="p-3.5 bg-zinc-950 border border-zinc-850 rounded-2xl text-[10px] text-zinc-500 leading-relaxed">
            <p className="font-bold text-zinc-400 mb-1">💡 {lang === 'en' ? 'SEO Protip' : 'نصيحة سيو ذكية'}</p>
            {lang === 'en'
              ? 'Our system instructs Gemini with exact specialized expert parameters to build unique metadata, 5 high-intent focus keywords, Schema LD JSON, and a 100% original 300-word review optimized for human readers and search crawlers.'
              : 'يقوم نظامنا بتوجيه محرك جيميناي لتوليد بيانات وصفية فريدة، بالإضافة إلى كود سكيمة منظم وجاهز للمحركات، ومراجعة نقدية غنية بمصطلحات احترافية تمنع عقوبات التكرار.'}
          </div>
        </div>

        {/* Right SEO Outputs Panel */}
        <div className="lg:col-span-7 space-y-6">
          
          <AnimatePresence mode="wait">
            {isGenerating && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-zinc-900/40 border border-zinc-850 p-12 rounded-3xl text-center space-y-4 backdrop-blur-md flex flex-col items-center justify-center min-h-[400px]"
              >
                <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin mb-2" />
                <h3 className="font-bold text-sm text-white">{lang === 'en' ? 'Consulting SEO Assistant...' : 'جاري استشارة خبير السيو والذكاء الاصطناعي...'}</h3>
                <div className="max-w-xs space-y-1.5">
                  <p className="text-[11px] text-zinc-400 animate-pulse">
                    {lang === 'en' ? 'Drafting engaging SEO titles under 60 characters' : 'كتابة عنوان سيو مميز أقل من ٦٠ حرفاً'}
                  </p>
                  <p className="text-[11px] text-zinc-500">
                    {lang === 'en' ? 'Analyzing keywords and writing a 300-word original review...' : 'تحليل الكلمات المفتاحية وصياغة مراجعة سينمائية من ٣٠٠ كلمة...'}
                  </p>
                </div>
              </motion.div>
            )}

            {!isGenerating && !generatedData && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-zinc-900/20 border border-dashed border-zinc-800 p-16 rounded-3xl text-center space-y-3 flex flex-col items-center justify-center min-h-[400px]"
              >
                <HelpCircle className="w-12 h-12 text-zinc-700 animate-bounce" />
                <h3 className="font-bold text-sm text-zinc-400">{lang === 'en' ? 'No SEO Data Generated Yet' : 'لم يتم توليد أي بيانات سيو بعد'}</h3>
                <p className="text-[11px] text-zinc-500 max-w-sm leading-relaxed">
                  {lang === 'en'
                    ? 'Fill in a movie or show name in the config panel and click the generate button to view optimized web meta elements.'
                    : 'قم باختيار أو كتابة اسم الفيلم في لوحة التحكم الجانبية واضغط على زر التوليد لعرض أصول السيو.'}
                </p>
              </motion.div>
            )}

            {generatedData && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                {/* Visual Google Search Preview - A highly professional, state of the art visual simulator */}
                <div className="bg-zinc-900/40 border border-zinc-850 p-5 rounded-3xl space-y-3 backdrop-blur-md">
                  <h3 className="text-xs font-extrabold text-zinc-400 flex items-center gap-1.5 uppercase tracking-wider">
                    <Eye className="w-3.5 h-3.5 text-blue-500" />
                    <span>{lang === 'en' ? 'Google Search Result Preview' : 'معاينة النتيجة على محرك بحث جوجل'}</span>
                  </h3>
                  <div className="bg-zinc-950 border border-zinc-850/60 p-4 rounded-2xl space-y-1 text-right font-sans" dir={targetLanguage === 'ar' ? 'rtl' : 'ltr'}>
                    <div className="flex items-center gap-1 text-[11px] text-zinc-500 font-mono truncate">
                      <span>flxjo.com</span>
                      <span>›</span>
                      <span>watch</span>
                      <span>›</span>
                      <span className="truncate">{customMovieName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}</span>
                    </div>
                    <h4 className="text-[15px] sm:text-lg text-[#8ab4f8] hover:underline font-medium cursor-pointer truncate leading-snug">
                      {generatedData.seoTitle}
                    </h4>
                    <p className="text-xs text-zinc-400 leading-relaxed font-normal line-clamp-2">
                      {generatedData.metaDescription}
                    </p>
                  </div>
                </div>

                {/* Main SEO Elements grid */}
                <div className="grid grid-cols-1 gap-4">
                  
                  {/* 1. SEO Title Element */}
                  <div className="bg-zinc-900/40 border border-zinc-850 p-5 rounded-3xl space-y-3 backdrop-blur-md">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-black text-white uppercase tracking-wider">
                        {lang === 'en' ? 'SEO Title' : 'عنوان السيو المعتمد'}
                      </h4>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] bg-zinc-950 text-zinc-500 border border-zinc-850 px-2.5 py-1 rounded-md font-mono">
                          {generatedData.seoTitle.length} / 60 Chars
                        </span>
                        <button
                          type="button"
                          onClick={() => triggerCopy(generatedData.seoTitle, 'seoTitle')}
                          className="p-1.5 bg-zinc-950 border border-zinc-850 hover:bg-zinc-900 text-zinc-400 hover:text-white rounded-lg transition"
                        >
                          {copiedSection === 'seoTitle' ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                    <div className="bg-zinc-950 border border-zinc-850 p-3 rounded-xl text-xs font-semibold text-white">
                      {generatedData.seoTitle}
                    </div>
                  </div>

                  {/* 2. Meta Description Element */}
                  <div className="bg-zinc-900/40 border border-zinc-850 p-5 rounded-3xl space-y-3 backdrop-blur-md">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-black text-white uppercase tracking-wider">
                        {lang === 'en' ? 'Meta Description' : 'الوصف التعريفي (Meta Description)'}
                      </h4>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] bg-zinc-950 text-zinc-500 border border-zinc-850 px-2.5 py-1 rounded-md font-mono">
                          {generatedData.metaDescription.length} / 150 Chars
                        </span>
                        <button
                          type="button"
                          onClick={() => triggerCopy(generatedData.metaDescription, 'metaDesc')}
                          className="p-1.5 bg-zinc-950 border border-zinc-850 hover:bg-zinc-900 text-zinc-400 hover:text-white rounded-lg transition"
                        >
                          {copiedSection === 'metaDesc' ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                    <div className="bg-zinc-950 border border-zinc-850 p-3 rounded-xl text-xs text-zinc-300 leading-relaxed">
                      {generatedData.metaDescription}
                    </div>
                  </div>

                  {/* 3. Focus Keywords Element */}
                  <div className="bg-zinc-900/40 border border-zinc-850 p-5 rounded-3xl space-y-3 backdrop-blur-md">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-black text-white uppercase tracking-wider">
                        {lang === 'en' ? 'Focus Keywords (5 High Intent)' : 'الكلمات المفتاحية الخمسة المركزة'}
                      </h4>
                      <button
                        type="button"
                        onClick={() => triggerCopy(generatedData.focusKeywords.join(', '), 'keywords')}
                        className="p-1.5 bg-zinc-950 border border-zinc-850 hover:bg-zinc-900 text-zinc-400 hover:text-white rounded-lg transition flex items-center gap-1.5 text-[10px] font-bold"
                      >
                        {copiedSection === 'keywords' ? (
                          <>
                            <Check className="w-3 h-3 text-green-500" />
                            <span>{lang === 'en' ? 'Copied' : 'تم النسخ'}</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>{lang === 'en' ? 'Copy All' : 'نسخ الكل'}</span>
                          </>
                        )}
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {generatedData.focusKeywords.map((keyword, idx) => (
                        <span
                          key={idx}
                          className="text-[11px] bg-red-600/10 hover:bg-red-600/25 text-red-400 font-bold border border-red-500/15 px-3 py-1.5 rounded-xl transition cursor-pointer"
                          onClick={() => triggerCopy(keyword, `keyword-${idx}`)}
                        >
                          {copiedSection === `keyword-${idx}` ? '✓ ' : '# '}
                          {keyword}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* 4. Unique Original Content Review */}
                  <div className="bg-zinc-900/40 border border-zinc-850 p-5 rounded-3xl space-y-3 backdrop-blur-md">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                        <FileText className="w-4 h-4 text-red-500" />
                        <span>{lang === 'en' ? 'Original 300-word Review & Analysis' : 'مراجعة وتحليل حصري فريد من ٣٠٠ كلمة'}</span>
                      </h4>
                      <button
                        type="button"
                        onClick={() => triggerCopy(generatedData.uniqueContent, 'uniqueContent')}
                        className="p-1.5 bg-zinc-950 border border-zinc-850 hover:bg-zinc-900 text-zinc-400 hover:text-white rounded-lg transition flex items-center gap-1.5 text-[10px] font-bold"
                      >
                        {copiedSection === 'uniqueContent' ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-green-500" />
                            <span>{lang === 'en' ? 'Review Copied' : 'تم نسخ المراجعة'}</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>{lang === 'en' ? 'Copy Review' : 'نسخ المراجعة كاملة'}</span>
                          </>
                        )}
                      </button>
                    </div>
                    <div className="bg-zinc-950 border border-zinc-850 p-4 sm:p-5 rounded-2xl text-xs sm:text-sm text-zinc-300 leading-relaxed font-normal space-y-3 text-justify">
                      {generatedData.uniqueContent.split('\n\n').map((paragraph, pIdx) => (
                        <p key={pIdx}>{paragraph}</p>
                      ))}
                    </div>
                  </div>

                  {/* 5. Schema LD JSON code block */}
                  <div className="bg-zinc-900/40 border border-zinc-850 p-5 rounded-3xl space-y-3 backdrop-blur-md">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                        <Code className="w-4 h-4 text-amber-500" />
                        <span>{lang === 'en' ? 'JSON-LD Schema Markup' : 'كود السكيمة الهيكلي (Schema JSON-LD)'}</span>
                      </h4>
                      <button
                        type="button"
                        onClick={() => triggerCopy(generatedData.schemaMarkup, 'schemaMarkup')}
                        className="p-1.5 bg-zinc-950 border border-zinc-850 hover:bg-zinc-900 text-zinc-400 hover:text-white rounded-lg transition flex items-center gap-1.5 text-[10px] font-bold"
                      >
                        {copiedSection === 'schemaMarkup' ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-green-500" />
                            <span>{lang === 'en' ? 'Copied' : 'تم نسخ السكيمة'}</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>{lang === 'en' ? 'Copy Schema Code' : 'نسخ كود السكيمة'}</span>
                          </>
                        )}
                      </button>
                    </div>
                    <div className="bg-zinc-950 border border-zinc-850 p-4 rounded-xl font-mono text-[10px] sm:text-xs text-amber-400/90 overflow-x-auto whitespace-pre leading-relaxed select-all max-h-60 no-scrollbar">
                      {generatedData.schemaMarkup}
                    </div>
                  </div>

                  {/* 6. Dynamic Sitemap.xml & Google Verification Status */}
                  <div className="bg-zinc-900/40 border border-zinc-850 p-5 rounded-3xl space-y-3 backdrop-blur-md">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                        <Globe className="w-4 h-4 text-emerald-500" />
                        <span>{lang === 'en' ? 'Sitemap.xml & Bot Indexing' : 'خريطة الموقع والأرشفة التلقائية'}</span>
                      </h4>
                      <a
                        href="/sitemap.xml"
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-xl text-[11px] font-bold transition flex items-center gap-1"
                      >
                        <span>{lang === 'en' ? 'Open sitemap.xml' : 'فتح خريطة الموقع'}</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    <div className="p-3.5 bg-zinc-950 border border-zinc-850 rounded-xl space-y-2 text-xs text-zinc-400">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-zinc-300 font-semibold">{lang === 'en' ? 'Google Site Verification' : 'التحقق من ملكية Google'}</span>
                        <span className="text-emerald-400 font-mono font-bold">NSdY4h5pH0VVdwEK36LgS7gnPXVmXK-MjvAF4-TJi04</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-zinc-300 font-semibold">{lang === 'en' ? 'Indexing Strategy' : 'استراتيجية الزحف'}</span>
                        <span className="text-zinc-300 font-mono">index, follow, max-image-preview:large</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-zinc-300 font-semibold">{lang === 'en' ? 'Dynamic Endpoint' : 'المسار البرمجي المباشر'}</span>
                        <span className="text-red-400 font-mono">GET /sitemap.xml (Cached 1h)</span>
                      </div>
                    </div>
                  </div>

                </div>

              </motion.div>
            )}
          </AnimatePresence>

        </div>

      </div>
      )}

      {/* TAB 2: Instant Mass Indexing & Search Engine Ping */}
      {activeSubTab === 'indexing' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          
          {/* Top Hero Banner */}
          <div className="bg-gradient-to-r from-red-950/40 via-zinc-900/60 to-zinc-950 border border-red-900/30 p-6 sm:p-8 rounded-3xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-amber-400" />
                  <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider">
                    {lang === 'en' ? 'Real-Time Bot Dispatch' : 'محطة الإرسال الفوري للروبوتات'}
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-white">
                  {lang === 'en' ? 'Instant Search Engine Notification & IndexNow' : 'إشعار فوري لمحركات البحث (Google & Bing IndexNow)'}
                </h2>
                <p className="text-xs text-zinc-400 max-w-2xl leading-relaxed">
                  {lang === 'en'
                    ? 'Notify Googlebot and Bing IndexNow in 1-click about newly updated movies, trending streams, and the fresh sitemap.'
                    : 'قم بإخطار روبوتات جوجل وبينج ومحركات البحث بلحظة واحدة عند إضافة أفلام جديدة لإجبارها على الزحف والأرشفة فوراً.'}
                </p>
              </div>

              <button
                type="button"
                onClick={handlePingSearchEngines}
                disabled={isPinging}
                className={`px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-2xl transition cursor-pointer shrink-0 ${
                  isPinging
                    ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                    : 'bg-red-600 hover:bg-red-700 text-white shadow-red-600/30 active:scale-95'
                }`}
              >
                {isPinging ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                    <span>{lang === 'en' ? 'Pinging Search Bots...' : 'جاري إرسال الإشارات...'}</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 text-white" />
                    <span>{lang === 'en' ? 'Dispatch Live Ping Now' : 'إرسال إشعار الأرشفة الفوري'}</span>
                  </>
                )}
              </button>
            </div>

            {/* Live Ping Dispatch Output */}
            {pingResult && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-zinc-950 border border-zinc-850 rounded-2xl space-y-3"
              >
                <div className="flex items-center justify-between text-xs font-bold text-white border-b border-zinc-900 pb-2">
                  <span className="flex items-center gap-1.5 text-emerald-400">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{pingResult.message || 'Ping Dispatched'}</span>
                  </span>
                  <span className="font-mono text-zinc-500 text-[10px]">{pingResult.timestamp}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3 bg-zinc-900/60 rounded-xl border border-zinc-850">
                    <div className="text-[10px] text-zinc-400 font-semibold">Google Sitemap Ping</div>
                    <div className="text-xs font-bold text-emerald-400 font-mono mt-1">
                      {pingResult.results?.google?.success ? '✓ 200 OK Accepted' : 'Dispatched'}
                    </div>
                  </div>
                  <div className="p-3 bg-zinc-900/60 rounded-xl border border-zinc-850">
                    <div className="text-[10px] text-zinc-400 font-semibold">Bing / IndexNow</div>
                    <div className="text-xs font-bold text-emerald-400 font-mono mt-1">
                      {pingResult.results?.indexnow?.success ? '✓ 200/202 Queued' : 'Dispatched'}
                    </div>
                  </div>
                  <div className="p-3 bg-zinc-900/60 rounded-xl border border-zinc-850">
                    <div className="text-[10px] text-zinc-400 font-semibold">Target Master Sitemap</div>
                    <div className="text-xs font-bold text-zinc-300 font-mono truncate mt-1">
                      /sitemap.xml
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          {/* 4 Pillars of Mass Indexing Explanation & Node.js Code */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Left: Automated Google Indexing API */}
            <div className="bg-zinc-900/40 border border-zinc-850 p-6 rounded-3xl space-y-4 backdrop-blur-md">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-white flex items-center gap-2">
                  <Bot className="w-4 h-4 text-red-500" />
                  <span>{lang === 'en' ? 'Google Indexing API Script (Node.js)' : 'سكريبت أرشفة جوجل التلقائي (Google Indexing API)'}</span>
                </h3>
                <button
                  type="button"
                  onClick={() => triggerCopy(indexingScriptCode, 'script')}
                  className="px-2.5 py-1 bg-zinc-950 border border-zinc-800 hover:bg-zinc-900 text-zinc-400 hover:text-white rounded-lg transition flex items-center gap-1.5 text-[10px] font-bold"
                >
                  {copiedSection === 'script' ? (
                    <>
                      <Check className="w-3 h-3 text-green-500" />
                      <span>{lang === 'en' ? 'Copied' : 'تم النسخ'}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>{lang === 'en' ? 'Copy Script' : 'نسخ الكود'}</span>
                    </>
                  )}
                </button>
              </div>

              <p className="text-xs text-zinc-400 leading-relaxed">
                {lang === 'en'
                  ? 'Run this lightweight background script to instantly push 200+ movie & series URLs per day straight to Google Search Console.'
                  : 'استخدم هذا السكريبت البرمجي مع حساب Google Service Account لإرسال أكثر من 200 رابط فيلم ومسلسل يومياً لمحرك بحث جوجل مباشرة دون انتظار.'}
              </p>

              <div className="p-4 bg-zinc-950 border border-zinc-850 rounded-2xl font-mono text-[11px] text-zinc-300 leading-relaxed overflow-x-auto max-h-72 select-all">
                <pre>{indexingScriptCode}</pre>
              </div>
            </div>

            {/* Right: Technical Indexing Architecture */}
            <div className="bg-zinc-900/40 border border-zinc-850 p-6 rounded-3xl space-y-4 backdrop-blur-md">
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span>{lang === 'en' ? 'How FLXJO Dominates Google Indexing' : 'أسرار تصدر FLXJO لأول صفحة في جوجل'}</span>
              </h3>

              <div className="space-y-3 text-xs text-zinc-300">
                <div className="p-3.5 bg-zinc-950 border border-zinc-850 rounded-2xl space-y-1">
                  <div className="font-bold text-white flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-red-600/20 text-red-400 flex items-center justify-center text-[10px] font-mono">1</span>
                    <span>معالجة الـ SPA عبر التوليد الديناميكي (SSR Fallback)</span>
                  </div>
                  <p className="text-zinc-400 text-[11px] leading-relaxed">
                    يقوم الخادم بحقن العناوين والوصف وكود الـ HTML الدلالي داخل رأس وجسم الصفحة قبل إرسالها لروبوتات جوجل حتى تتم قراءتها فورياً دون الحاجة لتنفيذ الجافاسكريبت.
                  </p>
                </div>

                <div className="p-3.5 bg-zinc-950 border border-zinc-850 rounded-2xl space-y-1">
                  <div className="font-bold text-white flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-amber-600/20 text-amber-400 flex items-center justify-center text-[10px] font-mono">2</span>
                    <span>كود الـ Movie & TVSeries Schema الدقيق</span>
                  </div>
                  <p className="text-zinc-400 text-[11px] leading-relaxed">
                    حقن بيانات التقييم النجمي (AggregateRating)، والبوستر، وتاريخ الإصدار بالصيغة المعتمدة لظهور النتيجة كـ Rich Snippet جذاب يضاعف النقرات بنسبة 300%.
                  </p>
                </div>

                <div className="p-3.5 bg-zinc-950 border border-zinc-850 rounded-2xl space-y-1">
                  <div className="font-bold text-white flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-600/20 text-emerald-400 flex items-center justify-center text-[10px] font-mono">3</span>
                    <span>الروابط الدلالية النظيفة (Clean Semantic Slugs)</span>
                  </div>
                  <p className="text-zinc-400 text-[11px] leading-relaxed">
                    تحويل الأسماء العربية المعقدة إلى مسارات صديقة لمحركات البحث، مثل <code className="text-red-400">/movie/969681/spider-man-brand-new-day</code> لضمان استهداف الكلمات البحثية بدقة.
                  </p>
                </div>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* TAB 3: Sitemaps Architecture */}
      {activeSubTab === 'sitemaps' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          
          <div className="bg-zinc-900/40 border border-zinc-850 p-6 sm:p-8 rounded-3xl space-y-6 backdrop-blur-md">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-850 pb-5">
              <div className="space-y-1">
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <Globe className="w-5 h-5 text-emerald-400" />
                  <span>{lang === 'en' ? 'Dynamic Sitemap Index Hierarchy' : 'هيكل خرائط الموقع السداسية (Sitemap Index)'}</span>
                </h3>
                <p className="text-xs text-zinc-400">
                  {lang === 'en'
                    ? 'Submit the Master /sitemap.xml to Google Search Console to automatically index all sub-sitemaps.'
                    : 'أضف رابط الفهرس الرئيسي /sitemap.xml إلى Google Search Console وسيتم قراءة جميع الخرائط الفرعية أوتوماتيكياً.'}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                <span className="text-xs font-mono font-bold text-emerald-400">Auto-Cached 1 Hour</span>
              </div>
            </div>

            {/* Sitemaps List Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sitemapsList.map((item, idx) => (
                <div
                  key={idx}
                  className="p-4 bg-zinc-950 border border-zinc-850 rounded-2xl flex flex-col justify-between gap-3 hover:border-zinc-700 transition"
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-white">{item.title}</span>
                      <span className="text-[9px] px-2 py-0.5 rounded-full font-mono font-bold bg-zinc-900 border border-zinc-800 text-zinc-400">
                        {item.type}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400">{item.desc}</p>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-zinc-900">
                    <span className="font-mono text-xs text-red-400 font-semibold">{item.url}</span>
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1 bg-zinc-900 hover:bg-zinc-850 text-zinc-300 hover:text-white rounded-xl text-xs font-bold transition flex items-center gap-1"
                    >
                      <span>{lang === 'en' ? 'Inspect XML' : 'معاينة'}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              ))}
            </div>

            {/* Google Search Console Verification Info */}
            <div className="p-4 bg-emerald-950/20 border border-emerald-500/20 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{lang === 'en' ? 'Google Search Console Verification Key' : 'كود التحقق من ملكية الموقع (Google Site Verification)'}</span>
                </div>
                <div className="font-mono text-[11px] text-zinc-300">
                  NSdY4h5pH0VVdwEK36LgS7gnPXVmXK-MjvAF4-TJi04
                </div>
              </div>

              <a
                href="https://search.google.com/search-console"
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-600/20 shrink-0"
              >
                <span>Google Search Console</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

          </div>

        </div>
      )}

    </div>
  );
}
