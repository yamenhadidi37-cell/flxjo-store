import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';

async function startServer() {
  const app = express();
  const PORT = 3000;
  let vite: any;

  app.use(express.json());

  // --- Start of Server-Side Database Logging (for Admin Dashboard) ---
  const LOGS_FILE = path.join(process.cwd(), 'data', 'admin_logs.json');

  interface VisitLog {
    ip: string;
    country: string;
    userAgent: string;
    timestamp: string;
  }

  interface SearchLog {
    query: string;
    lang: string;
    country: string;
    timestamp: string;
  }

  interface ClickLog {
    id: string;
    title: string;
    type: string;
    country: string;
    timestamp: string;
  }

  interface LogsDb {
    visits: VisitLog[];
    searches: SearchLog[];
    clicks: ClickLog[];
  }

  function initLogsDb() {
    const dir = path.dirname(LOGS_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(LOGS_FILE)) {
      fs.writeFileSync(LOGS_FILE, JSON.stringify({ visits: [], searches: [], clicks: [] }, null, 2), 'utf-8');
    }
  }

  function getLogs(): LogsDb {
    initLogsDb();
    try {
      const content = fs.readFileSync(LOGS_FILE, 'utf-8');
      return JSON.parse(content);
    } catch (e) {
      return { visits: [], searches: [], clicks: [] };
    }
  }

  function saveLogs(db: LogsDb) {
    initLogsDb();
    try {
      fs.writeFileSync(LOGS_FILE, JSON.stringify(db, null, 2), 'utf-8');
    } catch (e) {
      console.error('Error saving logs:', e);
    }
  }

  // --- Start of Server-Side User Profile Tracking ---
  const USERS_DIR = path.join(process.cwd(), 'data', 'users');

  function ensureUsersDir() {
    if (!fs.existsSync(USERS_DIR)) {
      fs.mkdirSync(USERS_DIR, { recursive: true });
    }
  }

  interface UserProfile {
    userId: string;
    firstSeen: string;
    lastSeen: string;
    ip: string;
    country: string;
    browser: string;
    visits: string[];
    searches: { query: string; timestamp: string; lang: string }[];
    clicks: { id: string; title: string; type: string; timestamp: string }[];
    exits?: string[];
    currentMovie?: string;
    status?: string;
  }

  function getUserProfile(userId: string, defaultIp = '', defaultCountry = 'Unknown', defaultBrowser = 'Unknown'): UserProfile {
    ensureUsersDir();
    const safeId = String(userId).replace(/[^a-zA-Z0-9_\-]/g, '');
    const userFile = path.join(USERS_DIR, `${safeId}.json`);
    
    if (fs.existsSync(userFile)) {
      try {
        const content = fs.readFileSync(userFile, 'utf-8');
        const parsed = JSON.parse(content);
        if (parsed && typeof parsed === 'object') {
          return parsed;
        }
      } catch (e) {
        // failed to parse, overwrite/recreate below
      }
    }
    
    const now = new Date().toISOString();
    const profile: UserProfile = {
      userId: safeId,
      firstSeen: now,
      lastSeen: now,
      ip: defaultIp || '127.0.0.1',
      country: defaultCountry || 'Unknown',
      browser: defaultBrowser || 'Unknown',
      visits: [now],
      searches: [],
      clicks: [],
      exits: []
    };
    saveUserProfile(safeId, profile);
    return profile;
  }

  function saveUserProfile(userId: string, profile: UserProfile) {
    ensureUsersDir();
    const safeId = String(userId).replace(/[^a-zA-Z0-9_\-]/g, '');
    const userFile = path.join(USERS_DIR, `${safeId}.json`);
    try {
      fs.writeFileSync(userFile, JSON.stringify(profile, null, 2), 'utf-8');
    } catch (e) {
      console.error(`Error saving user file:`, e);
    }
  }

  function getOnlineCount(): number {
    ensureUsersDir();
    try {
      const files = fs.readdirSync(USERS_DIR);
      let count = 0;
      const nowMs = Date.now();
      for (const file of files) {
        if (!file.endsWith('.json')) continue;
        try {
          const content = fs.readFileSync(path.join(USERS_DIR, file), 'utf-8');
          const profile = JSON.parse(content);
          if (profile.lastSeen) {
            const diffSeconds = (nowMs - new Date(profile.lastSeen).getTime()) / 1000;
            if (diffSeconds <= 45) { // Active in the last 45 seconds
              count++;
            }
          }
        } catch (e) {
          // ignore
        }
      }
      return count;
    } catch (e) {
      return 0;
    }
  }

  function getAllUserProfiles(): UserProfile[] {
    ensureUsersDir();
    try {
      const files = fs.readdirSync(USERS_DIR);
      const profiles: UserProfile[] = [];
      for (const file of files) {
        if (!file.endsWith('.json')) continue;
        try {
          const content = fs.readFileSync(path.join(USERS_DIR, file), 'utf-8');
          profiles.push(JSON.parse(content));
        } catch (e) {
          // ignore
        }
      }
      return profiles.sort((a, b) => new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime());
    } catch (e) {
      return [];
    }
  }
  // --- End of Server-Side User Profile Tracking ---

  // API Endpoints for Tracking/Logging with optional Supabase Integration
  const SB_URL = (process.env.SUPABASE_URL && !process.env.SUPABASE_URL.includes('royjtxkdonqhxavdktxp')) ? process.env.SUPABASE_URL : null;
  const SB_KEY = process.env.SUPABASE_KEY || null;

  // Telegram Notifications Configuration
  const TELEGRAM_CONFIG_PATH = path.join(process.cwd(), '.telegram_config.json');
  const SUBSCRIBERS_PATH = path.join(process.cwd(), '.telegram_subscribers.json');
  let TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN || '8119473745:AAHJn8Hi9jrbpuIWI_Jm1Z-jvhKIV9-XNyw';
  let TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '6877720088';

  let telegramSubscribers = new Set<string>();
  if (TELEGRAM_CHAT_ID) telegramSubscribers.add(TELEGRAM_CHAT_ID);

  try {
    if (fs.existsSync(TELEGRAM_CONFIG_PATH)) {
      const cfg = JSON.parse(fs.readFileSync(TELEGRAM_CONFIG_PATH, 'utf-8'));
      if (cfg.chatId) TELEGRAM_CHAT_ID = cfg.chatId;
      if (cfg.token) TELEGRAM_TOKEN = cfg.token;
    }
  } catch (e) {}

  try {
    if (fs.existsSync(SUBSCRIBERS_PATH)) {
      const list = JSON.parse(fs.readFileSync(SUBSCRIBERS_PATH, 'utf-8'));
      if (Array.isArray(list)) {
        list.forEach((id: string) => {
          if (id) telegramSubscribers.add(String(id));
        });
      }
    }
  } catch (e) {}

  function saveSubscribers() {
    try {
      fs.writeFileSync(SUBSCRIBERS_PATH, JSON.stringify(Array.from(telegramSubscribers), null, 2));
    } catch (e) {}
  }

  function addSubscriber(chatId: string) {
    if (chatId && !telegramSubscribers.has(chatId)) {
      telegramSubscribers.add(chatId);
      saveSubscribers();
    }
  }

  function saveTelegramConfig() {
    try {
      fs.writeFileSync(TELEGRAM_CONFIG_PATH, JSON.stringify({ chatId: TELEGRAM_CHAT_ID, token: TELEGRAM_TOKEN }, null, 2));
    } catch (e) {}
  }

  const recentNotifiedVisitors = new Set<string>();

  async function sendTelegramAlert(message: string, chatId?: string) {
    const targetChatId = chatId || TELEGRAM_CHAT_ID;
    if (!TELEGRAM_TOKEN || !targetChatId) return false;
    try {
      const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: targetChatId,
          text: message,
          parse_mode: 'Markdown'
        })
      });
      if (!res.ok) {
        const errText = await res.text();
        console.warn('Telegram send failed:', res.status, errText);
        return false;
      }
      return true;
    } catch (e) {
      console.warn('Telegram fetch exception:', e);
      return false;
    }
  }

  // --- Telegram Bot Interactive Control Panel Engine ---
  if (!(global as any).__processedTelegramUpdateIds) {
    (global as any).__processedTelegramUpdateIds = new Set<number>();
  }
  const processedTelegramUpdateIds: Set<number> = (global as any).__processedTelegramUpdateIds;

  if (!(global as any).__recentMessageDeduplication) {
    (global as any).__recentMessageDeduplication = new Map<string, number>();
  }
  const recentMessageDeduplication: Map<string, number> = (global as any).__recentMessageDeduplication;

  if (typeof (global as any).__lastTelegramUpdateOffset !== 'number') {
    (global as any).__lastTelegramUpdateOffset = 0;
  }

  async function deleteTelegramWebhook() {
    if (!TELEGRAM_TOKEN) return;
    try {
      await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/deleteWebhook?drop_pending_updates=false`);
    } catch (e) {}
  }
  deleteTelegramWebhook();

  async function sendTelegramMessageWithKeyboard(chatId: string, text: string, keyboard?: any) {
    if (!TELEGRAM_TOKEN || !chatId) return false;
    try {
      const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;
      const body: any = {
        chat_id: chatId,
        text,
        parse_mode: 'Markdown'
      };
      if (keyboard) {
        body.reply_markup = keyboard;
      }
      let res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (!res.ok) {
        delete body.parse_mode;
        res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
      }
      return res.ok;
    } catch (e) {
      return false;
    }
  }

  async function sendTelegramPhoto(chatId: string, photoUrl: string, caption: string, keyboard?: any) {
    if (!TELEGRAM_TOKEN || !chatId) return false;
    try {
      const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendPhoto`;
      const body: any = {
        chat_id: chatId,
        photo: photoUrl,
        caption: caption,
        parse_mode: 'Markdown'
      };
      if (keyboard) {
        body.reply_markup = keyboard;
      }
      let res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (!res.ok) {
        delete body.parse_mode;
        res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
      }
      return res.ok;
    } catch (e) {
      return false;
    }
  }

  async function handleTelegramMovieSearch(chatId: string, query: string) {
    const TMDB_KEY = 'c714ec95383c51abcde6afdf2e1571b9';
    const BASE_APP_URL = 'https://flxjo.netlify.app';

    try {
      let searchUrl = `https://api.themoviedb.org/3/search/multi?api_key=${TMDB_KEY}&query=${encodeURIComponent(query)}&language=ar-SA&include_adult=false`;
      let res = await fetch(searchUrl);
      let data: any = res.ok ? await res.json() : null;

      let results = data && data.results ? data.results.filter((r: any) => r.media_type === 'movie' || r.media_type === 'tv') : [];

      if (results.length === 0) {
        searchUrl = `https://api.themoviedb.org/3/search/multi?api_key=${TMDB_KEY}&query=${encodeURIComponent(query)}&language=en-US&include_adult=false`;
        res = await fetch(searchUrl);
        data = res.ok ? await res.json() : null;
        results = data && data.results ? data.results.filter((r: any) => r.media_type === 'movie' || r.media_type === 'tv') : [];
      }

      if (results.length === 0) {
        await sendTelegramMessageWithKeyboard(
          chatId,
          `❌ *عذراً، لم يتم العثور على نتائج مطابقة لـ "${query}".*\n\nتأكد من كتابة اسم الفيلم أو المسلسل بشكل صحيح، أو ابحث عن فيلم آخر!`
        );
        return;
      }

      const item = results[0];
      const title = item.title || item.name || item.original_title || item.original_name || 'عرض سينمائي';
      const mediaType = item.media_type === 'tv' ? 'tv' : 'movie';
      const typeLabel = mediaType === 'tv' ? '📺 مسلسل' : '🎬 فيلم';
      const dateStr = item.release_date || item.first_air_date || '';
      const year = dateStr ? dateStr.split('-')[0] : '';
      const rating = item.vote_average ? item.vote_average.toFixed(1) : '8.5';
      const overview = item.overview || 'متوفر الآن للمشاهدة والتحميل بأعلى جودة وسيرفرات سريعة وبدون إعلانات على موقع فلكس جو (FlxJo).';
      const posterPath = item.poster_path;
      const posterUrl = posterPath ? `https://image.tmdb.org/t/p/w500${posterPath}` : null;
      const watchUrl = `${BASE_APP_URL}/${mediaType}/${item.id}`;

      const caption = 
        `🎬 *${title}* ${year ? '(' + year + ')' : ''}\n` +
        `⭐ *التقييم:* ${rating}/10 | ${typeLabel}\n\n` +
        `📖 *القصة:* ${overview.slice(0, 300)}${overview.length > 300 ? '...' : ''}\n\n` +
        `🍿 *رابط المشاهدة المباشرة:*\n${watchUrl}`;

      const keyboard: any = {
        inline_keyboard: [
          [{ text: '▶️ شاهد أو حمل الفيلم الآن على فلكس جو', url: watchUrl }]
        ]
      };

      if (results.length > 1) {
        const extraButtons = [];
        for (let i = 1; i < Math.min(results.length, 4); i++) {
          const extra = results[i];
          const extraTitle = extra.title || extra.name || extra.original_title || extra.original_name;
          const extraType = extra.media_type === 'tv' ? 'tv' : 'movie';
          const extraUrl = `${BASE_APP_URL}/${extraType}/${extra.id}`;
          extraButtons.push({ text: `🔹 ${extraTitle.slice(0, 22)}`, url: extraUrl });
        }
        if (extraButtons.length > 0) {
          keyboard.inline_keyboard.push(extraButtons);
        }
      }

      let sent = false;
      if (posterUrl) {
        sent = await sendTelegramPhoto(chatId, posterUrl, caption, keyboard);
      }

      if (!sent) {
        await sendTelegramMessageWithKeyboard(chatId, caption, keyboard);
      }
    } catch (err) {
      console.warn('Error in handleTelegramMovieSearch:', err);
      await sendTelegramMessageWithKeyboard(
        chatId,
        `⚠️ حدث خطأ أثناء البحث عن الفيلم. يرجى المحاولة مرة أخرى.`
      );
    }
  }

  async function handleTelegramMoviePromotion(senderChatId: string, query: string) {
    const TMDB_KEY = 'c714ec95383c51abcde6afdf2e1571b9';
    const BASE_APP_URL = 'https://flxjo.netlify.app';

    const ADMIN_CHAT_ID = '6877720088';
    const isAdmin = (senderChatId === ADMIN_CHAT_ID || senderChatId === TELEGRAM_CHAT_ID);

    if (!isAdmin) {
      await sendTelegramMessageWithKeyboard(
        senderChatId,
        `⚠️ *عذراً، ميزة الترويج لإرسال مقترحات الأفلام مخصصة لمالك البوت (الآدمين) فقط.*`
      );
      return;
    }

    if (!query) {
      await sendTelegramMessageWithKeyboard(
        senderChatId,
        `📢 *طريقة الترويج لفيلم أو مسلسل:*\n\nأرسل الأمر متبوعاً باسم الفيلم، مثال:\n\`/ترويج Interstellar\`\nأو\n\`/اعلان Batman\``
      );
      return;
    }

    try {
      let item: any = null;

      // Check if query contains a TMDB ID (e.g. /movie/969681/... or /tv/12345 or just 969681)
      const idMatch = query.match(/(?:movie|tv)?\/?(\d{3,8})/i);
      const isTvPath = query.toLowerCase().includes('/tv/');

      if (idMatch && idMatch[1]) {
        const tmdbId = idMatch[1];
        const primaryType = isTvPath ? 'tv' : 'movie';
        const secondaryType = isTvPath ? 'movie' : 'tv';

        let detailUrl = `https://api.themoviedb.org/3/${primaryType}/${tmdbId}?api_key=${TMDB_KEY}&language=ar-SA`;
        let res = await fetch(detailUrl);
        if (res.ok) {
          item = await res.json();
          item.media_type = primaryType;
        } else {
          detailUrl = `https://api.themoviedb.org/3/${secondaryType}/${tmdbId}?api_key=${TMDB_KEY}&language=ar-SA`;
          res = await fetch(detailUrl);
          if (res.ok) {
            item = await res.json();
            item.media_type = secondaryType;
          }
        }
      }

      if (!item) {
        // Clean query from paths or hyphens if any
        let cleanQuery = query
          .replace(/\/movie\/\d+\//gi, '')
          .replace(/\/tv\/\d+\//gi, '')
          .replace(/-/g, ' ')
          .trim();

        let searchUrl = `https://api.themoviedb.org/3/search/multi?api_key=${TMDB_KEY}&query=${encodeURIComponent(cleanQuery)}&language=ar-SA&include_adult=false`;
        let res = await fetch(searchUrl);
        let data: any = res.ok ? await res.json() : null;

        let results = data && data.results ? data.results.filter((r: any) => r.media_type === 'movie' || r.media_type === 'tv') : [];

        if (results.length === 0) {
          searchUrl = `https://api.themoviedb.org/3/search/multi?api_key=${TMDB_KEY}&query=${encodeURIComponent(cleanQuery)}&language=en-US&include_adult=false`;
          res = await fetch(searchUrl);
          data = res.ok ? await res.json() : null;
          results = data && data.results ? data.results.filter((r: any) => r.media_type === 'movie' || r.media_type === 'tv') : [];
        }

        if (results.length > 0) {
          item = results[0];
        }
      }

      if (!item) {
        await sendTelegramMessageWithKeyboard(
          senderChatId,
          `❌ *عذراً، لم يتم العثور على نتائج للفيلم "${query}".*`
        );
        return;
      }
      const title = item.title || item.name || item.original_title || item.original_name || 'عرض سينمائي';
      const mediaType = item.media_type === 'tv' ? 'tv' : 'movie';
      const typeLabel = mediaType === 'tv' ? '📺 مسلسل' : '🎬 فيلم';
      const dateStr = item.release_date || item.first_air_date || '';
      const year = dateStr ? dateStr.split('-')[0] : '';
      const rating = item.vote_average ? item.vote_average.toFixed(1) : '8.5';
      const overview = item.overview || 'مقترح متميز ومباشر لسهرة اليوم متوفر الآن للمشاهدة بدون إعلانات وبأعلى جودة على موقع فلكس جو (FlxJo).';
      const posterPath = item.poster_path;
      const posterUrl = posterPath ? `https://image.tmdb.org/t/p/w500${posterPath}` : null;
      const watchUrl = `${BASE_APP_URL}/${mediaType}/${item.id}`;

      const promoCaption = 
        `🍿 *مقترح من موقع فلكس جو لسهرة اليوم!* 🎬\n\n` +
        `🎬 *${title}* ${year ? '(' + year + ')' : ''}\n` +
        `⭐ *التقييم:* ${rating}/10 | ${typeLabel}\n\n` +
        `📖 *القصة:* ${overview.slice(0, 300)}${overview.length > 300 ? '...' : ''}\n\n` +
        `🍿 *رابط المشاهدة المباشرة:*\n${watchUrl}`;

      const keyboard: any = {
        inline_keyboard: [
          [{ text: '🍿 مشاهدة الفيلم الآن على فلكس جو', url: watchUrl }]
        ]
      };

      // Broadcast to all subscribers
      addSubscriber(senderChatId);
      const recipients = Array.from(telegramSubscribers);

      let successCount = 0;
      for (const targetId of recipients) {
        let sent = false;
        if (posterUrl) {
          sent = await sendTelegramPhoto(targetId, posterUrl, promoCaption, keyboard);
        }
        if (!sent) {
          sent = await sendTelegramMessageWithKeyboard(targetId, promoCaption, keyboard);
        }
        if (sent) successCount++;
      }

      await sendTelegramMessageWithKeyboard(
        senderChatId,
        `🚀 *تم الترويج بنجاح!* 🎉\n\nتم إرسال فيلم "*${title}*" إلى جميع المشتركين (${successCount} مستخدم) كـ "مقترح لسهرة اليوم من موقع فلكس جو".`
      );
    } catch (err) {
      console.warn('Error in handleTelegramMoviePromotion:', err);
      await sendTelegramMessageWithKeyboard(senderChatId, `❌ حدث خطأ أثناء الترويج للفيلم.`);
    }
  }

  async function answerTelegramCallback(callbackQueryId: string, text?: string) {
    if (!TELEGRAM_TOKEN || !callbackQueryId) return;
    try {
      await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/answerCallbackQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callback_query_id: callbackQueryId, text })
      });
    } catch (e) {}
  }

  function getRecentVisitorsList(): UserProfile[] {
    ensureUsersDir();
    const visitorProfiles: UserProfile[] = [];
    try {
      const files = fs.readdirSync(USERS_DIR);
      for (const file of files) {
        if (file.endsWith('.json')) {
          try {
            const raw = fs.readFileSync(path.join(USERS_DIR, file), 'utf-8');
            const p: UserProfile = JSON.parse(raw);
            if (p && p.userId) visitorProfiles.push(p);
          } catch (e) {}
        }
      }
    } catch (e) {}

    visitorProfiles.sort((a, b) => new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime());
    return visitorProfiles.slice(0, 30);
  }

  async function handleTelegramVisitorList(chatId: string) {
    const visitors = getRecentVisitorsList();
    if (visitors.length === 0) {
      await sendTelegramMessageWithKeyboard(chatId, `📊 *لوحة التحكم (فلكس جو | FlxJo)*\n\nلا يوجد زوار مسجلون في النظام حالياً.`);
      return;
    }

    const keyboard = [];
    for (const v of visitors.slice(0, 15)) {
      const isOnline = v.status === 'online' || (v.lastSeen && (Date.now() - new Date(v.lastSeen).getTime()) / 1000 <= 60);
      const statusIcon = isOnline ? '🟢' : '⚪';
      const flag = v.country ? `📍 ${v.country}` : '📍 unknown';
      const movie = v.currentMovie ? `🎬 ${v.currentMovie.slice(0, 22)}` : '';
      const btnText = `${statusIcon} ${v.ip || v.userId} | ${flag} ${movie ? '| ' + movie : ''}`;
      keyboard.push([{ text: btnText, callback_data: `vis_${v.userId}` }]);
    }

    keyboard.push([
      { text: '🔄 تحديث القائمة', callback_data: 'vis_refresh' },
      { text: '📈 إحصائيات عامة', callback_data: 'vis_stats' }
    ]);

    const msgText = 
      `📊 *لوحة تحكم الزوار التفاعلية (فلكس جو | FlxJo)*\n\n` +
      `إجمالي الزوار المسجلين حالياً: *${visitors.length}*\n` +
      `اضغط على أي زائر من القائمة أدناه لعرض تقريره الكامل وسجل مشاهداته:`;

    await sendTelegramMessageWithKeyboard(chatId, msgText, { inline_keyboard: keyboard });
  }

  async function handleTelegramVisitorDetails(chatId: string, userId: string, callbackQueryId?: string) {
    if (callbackQueryId) await answerTelegramCallback(callbackQueryId);
    
    const profile = getUserProfile(userId);
    if (!profile) {
      await sendTelegramMessageWithKeyboard(chatId, `⚠️ لم يتم العثور على بيانات الزائر المحدد.`);
      return;
    }

    const isOnline = profile.status === 'online' || (profile.lastSeen && (Date.now() - new Date(profile.lastSeen).getTime()) / 1000 <= 60);
    const statusText = isOnline ? '🟢 متصل الآن (Online)' : '⚪ غير متصل (Offline)';

    let clicksText = 'لا توجد مشاهدات مسجلة';
    if (profile.clicks && profile.clicks.length > 0) {
      clicksText = profile.clicks.slice(-5).map(c => `• *${c.title}* (${c.type})`).join('\n');
    }

    let searchesText = 'لا توجد عمليات بحث';
    if (profile.searches && profile.searches.length > 0) {
      searchesText = profile.searches.slice(-5).map(s => `• "${s.query}"`).join('\n');
    }

    const detailMsg = 
      `👤 *تقرير الزائر التفصيلي:* \`${profile.userId}\`\n\n` +
      `🌐 *عنوان الـ IP:* \`${profile.ip || '127.0.0.1'}\`\n` +
      `📍 *الدولة/الموقع:* ${profile.country || 'غير معروف'}\n` +
      `🖥️ *المتصفح:* ${profile.browser || 'غير معروف'}\n` +
      `⚡ *الحالة:* ${statusText}\n` +
      `🎬 *المحتوى المعروض حالياً:* *${profile.currentMovie || 'تصفح الرئيسية'}*\n` +
      `⏰ *أول ظهور:* ${new Date(profile.firstSeen).toLocaleString('ar-EG')}\n` +
      `⌛ *آخر ظهور:* ${new Date(profile.lastSeen).toLocaleString('ar-EG')}\n\n` +
      `🎬 *آخر العروض والمشاهدات:*\n${clicksText}\n\n` +
      `🔍 *آخر عمليات البحث:*\n${searchesText}\n\n` +
      `🔄 *إجمالي الزيارات:* ${profile.visits ? profile.visits.length : 1} زيارات`;

    const keyboard = [
      [
        { text: '🔄 تحديث البيانات', callback_data: `vis_${userId}` },
        { text: '🔙 العودة لقائمة الزوار', callback_data: 'vis_refresh' }
      ]
    ];

    await sendTelegramMessageWithKeyboard(chatId, detailMsg, { inline_keyboard: keyboard });
  }

  async function handleTelegramStats(chatId: string) {
    const logs = getLogs();
    const visitors = getRecentVisitorsList();
    const onlineCount = visitors.filter(v => v.status === 'online' || (v.lastSeen && (Date.now() - new Date(v.lastSeen).getTime()) / 1000 <= 60)).length;

    const statsMsg = 
      `📈 *إحصائيات موقع فلكس جو الشاملة (FlxJo Stats)*\n\n` +
      `👥 *الزوار الآن (أونلاين):* ${onlineCount}\n` +
      `📁 *إجمالي سجلات الزوار:* ${visitors.length}\n` +
      `🎬 *إجمالي نقرات المشاهدة:* ${logs.clicks ? logs.clicks.length : 0}\n` +
      `🔍 *إجمالي عمليات البحث:* ${logs.searches ? logs.searches.length : 0}\n\n` +
      `تاريخ التقرير: ${new Date().toLocaleString('ar-EG')}`;

    const keyboard = [
      [{ text: '📊 عرض قائمة الزوار', callback_data: 'vis_refresh' }]
    ];

    await sendTelegramMessageWithKeyboard(chatId, statsMsg, { inline_keyboard: keyboard });
  }

  async function pollTelegramUpdates() {
    if (!TELEGRAM_TOKEN || (global as any).__isPollingTelegram) return;
    (global as any).__isPollingTelegram = true;

    try {
      const currentOffset = (global as any).__lastTelegramUpdateOffset || 0;
      const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/getUpdates?offset=${currentOffset + 1}&timeout=2`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data && data.result && Array.isArray(data.result) && data.result.length > 0) {
          for (const update of data.result) {
            const updateId = update.update_id;

            if (updateId > ((global as any).__lastTelegramUpdateOffset || 0)) {
              (global as any).__lastTelegramUpdateOffset = updateId;
            }

            if (processedTelegramUpdateIds.has(updateId)) {
              continue;
            }
            processedTelegramUpdateIds.add(updateId);
            if (processedTelegramUpdateIds.size > 2000) {
              const firstVal = processedTelegramUpdateIds.values().next().value;
              if (typeof firstVal === 'number') processedTelegramUpdateIds.delete(firstVal);
            }

            if (update.message && update.message.text) {
              const chatId = String(update.message.chat.id);
              const text = update.message.text.trim();
              const messageId = update.message.message_id;

              const msgDedupeKey = `${chatId}_msg_${messageId}`;
              const textDedupeKey = `${chatId}_txt_${text.toLowerCase()}`;
              const now = Date.now();

              if (recentMessageDeduplication.has(msgDedupeKey)) {
                continue;
              }
              const lastTextTime = recentMessageDeduplication.get(textDedupeKey) || 0;
              if (now - lastTextTime < 5000) {
                continue;
              }

              recentMessageDeduplication.set(msgDedupeKey, now);
              recentMessageDeduplication.set(textDedupeKey, now);
              if (recentMessageDeduplication.size > 1000) {
                const firstKey = recentMessageDeduplication.keys().next().value;
                if (firstKey) recentMessageDeduplication.delete(firstKey);
              }

              addSubscriber(chatId);

              const ADMIN_CHAT_ID = '6877720088';
              const isAdmin = (chatId === ADMIN_CHAT_ID || chatId === TELEGRAM_CHAT_ID);

              if (text.startsWith('/start') || text.startsWith('/help')) {
                let welcomeMsg = 
                  `🍿 *أهلاً بك في بوت flxjo!*\n\n` +
                  `يمكنك كتابة أي اسم فيلم أو مسلسل ومشاهدته فوراً 🎬\n\n` +
                  `🔍 أرسل اسم الفيلم أو المسلسل الآن للبحث والمشاهدة:`;
                if (isAdmin) {
                  welcomeMsg += `\n\n📢 *أمر الأدمن للترويج:* أرسل \`/ترويج اسم الفيلم\` لإرساله كـ مقترح لسهرة اليوم لجميع المشتركين.`;
                }
                await sendTelegramMessageWithKeyboard(chatId, welcomeMsg);
              } else if (
                text.startsWith('/ترويج') || 
                text.startsWith('/اعلان') || 
                text.startsWith('/رووج') || 
                text.startsWith('/promote') || 
                text.startsWith('/broadcast')
              ) {
                let promoQuery = text
                  .replace('/ترويج', '')
                  .replace('/اعلان', '')
                  .replace('/رووج', '')
                  .replace('/promote', '')
                  .replace('/broadcast', '')
                  .trim();
                await handleTelegramMoviePromotion(chatId, promoQuery);
              } else {
                await handleTelegramMovieSearch(chatId, text);
              }
            }

            if (update.callback_query) {
              const cq = update.callback_query;
              const chatId = String(cq.message.chat.id);
              const dataStr = cq.data || '';

              if (dataStr === 'vis_refresh') {
                await answerTelegramCallback(cq.id, 'تم تحديث القائمة');
                await handleTelegramVisitorList(chatId);
              } else if (dataStr === 'vis_stats') {
                await answerTelegramCallback(cq.id);
                await handleTelegramStats(chatId);
              } else if (dataStr.startsWith('vis_')) {
                const targetUserId = dataStr.replace('vis_', '');
                await handleTelegramVisitorDetails(chatId, targetUserId, cq.id);
              }
            }
          }
        }
      }
    } catch (e) {
      // Catch network polling error
    } finally {
      (global as any).__isPollingTelegram = false;
    }
  }

  if ((global as any).__telegramInterval) {
    clearInterval((global as any).__telegramInterval);
  }
  (global as any).__telegramInterval = setInterval(pollTelegramUpdates, 2500);

  if (!(global as any).__hasSentSpiderManPromo) {
    (global as any).__hasSentSpiderManPromo = true;
    setTimeout(() => {
      handleTelegramMoviePromotion('6877720088', '/movie/969681/spider-man-brand-new-day');
    }, 2000);
  }

  async function logToSupabase(table: string, data: any) {
    if (!SB_URL || !SB_KEY) return;
    try {
      const response = await fetch(`${SB_URL}/rest/v1/${table}`, {
        method: 'POST',
        headers: {
          'apikey': SB_KEY,
          'Authorization': `Bearer ${SB_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify(data)
      });
      if (!response.ok) {
        // Log failed status silently or debug only
      }
    } catch (e) {
      // Ignore network resolution errors for offline/unconfigured Supabase
    }
  }

  // TMDB API Proxy Endpoint
  app.get('/api/tmdb', async (req, res) => {
    const { endpoint, ...params } = req.query;
    if (!endpoint || typeof endpoint !== 'string') {
      return res.status(400).json({ error: 'Endpoint parameter is required' });
    }

    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const TMDB_API_KEY = process.env.TMDB_API_KEY || 'c714ec95383c51abcde6afdf2e1571b9';
    
    const searchParams = new URLSearchParams();
    searchParams.set('api_key', TMDB_API_KEY);
    searchParams.set('include_adult', 'false');

    for (const [key, value] of Object.entries(params)) {
      if (key !== 'api_key' && value !== undefined && value !== null) {
        searchParams.set(key, String(value));
      }
    }

    const tmdbUrl = `https://api.themoviedb.org/3${cleanEndpoint}?${searchParams.toString()}`;

    try {
      const tmdbResponse = await fetch(tmdbUrl, {
        headers: {
          'Accept': 'application/json',
        }
      });

      if (tmdbResponse.status === 429) {
        const retryAfter = tmdbResponse.headers.get('Retry-After');
        if (retryAfter) res.set('Retry-After', retryAfter);
        return res.status(429).json({ error: 'TMDB Rate limited' });
      }

      if (!tmdbResponse.ok) {
        return res.status(tmdbResponse.status).json({ 
          error: `TMDB API error: ${tmdbResponse.statusText}`, 
          status: tmdbResponse.status 
        });
      }

      const data = await tmdbResponse.json();
      res.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=600');
      return res.json(data);
    } catch (error: any) {
      console.error(`Error proxying TMDB request to ${cleanEndpoint}:`, error);
      return res.status(502).json({ error: 'Failed to fetch from TMDB upstream', details: error.message });
    }
  });

  // Live Visitor Tracking Endpoint (Supabase 'visitors' table compatible)
  app.post('/api/track-visitor', async (req, res) => {
    const { ip_address, country, current_movie, status, login_time, last_seen, userId } = req.body;
    const ip = ip_address || (req.headers['x-forwarded-for'] as string || '').split(',')[0].trim() || req.socket.remoteAddress || '127.0.0.1';
    const nowStr = new Date().toISOString();
    const timeStr = login_time || new Date().toLocaleTimeString();
    const movieName = current_movie || 'تصفح الصفحة الرئيسية';
    const userStatus = status || 'online';

    const visitorData = {
      ip_address: ip,
      country: country || 'Unknown',
      current_movie: movieName,
      status: userStatus,
      login_time: timeStr,
      last_seen: last_seen || nowStr
    };

    // 1. Post/Upsert to Supabase 'visitors' table if configured
    if (SB_URL && SB_KEY) {
      try {
        await fetch(`${SB_URL}/rest/v1/visitors`, {
          method: 'POST',
          headers: {
            'apikey': SB_KEY,
            'Authorization': `Bearer ${SB_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'resolution=merge-duplicates'
          },
          body: JSON.stringify(visitorData)
        });
      } catch (e) {
        // Ignore network errors
      }
    }

    // 2. Update local DB user profile
    if (userId) {
      const profile = getUserProfile(userId, ip, country || 'Unknown');
      profile.lastSeen = nowStr;
      profile.ip = ip;
      if (country) profile.country = country;
      profile.currentMovie = movieName;
      profile.status = userStatus;
      saveUserProfile(userId, profile);
    }

    res.json({ success: true, visitorData });
  });

  app.post('/api/log-visit', (req, res) => {
    const { country, userId, browser } = req.body;
    const ip = (req.headers['x-forwarded-for'] as string || '').split(',')[0].trim() || req.socket.remoteAddress || '127.0.0.1';
    const userAgent = req.headers['user-agent'] || 'Unknown';
    const actualBrowser = browser || userAgent;
    
    // Save to local JSON database
    const db = getLogs();
    const visitEntry = {
      ip,
      country: country || 'Unknown',
      userAgent,
      timestamp: new Date().toISOString()
    };
    db.visits.push(visitEntry);
    if (db.visits.length > 5000) db.visits.shift();
    saveLogs(db);

    // Save to user-specific profile
    if (userId) {
      const profile = getUserProfile(userId, ip, country || 'Unknown', actualBrowser);
      profile.lastSeen = visitEntry.timestamp;
      profile.ip = ip;
      if (country) profile.country = country;
      if (actualBrowser) profile.browser = actualBrowser;
      if (!profile.visits) profile.visits = [];
      if (!profile.visits.includes(visitEntry.timestamp)) {
        profile.visits.push(visitEntry.timestamp);
      }
      saveUserProfile(userId, profile);
    }

    // Save to Supabase (non-blocking)
    logToSupabase('visits', {
      ip,
      country: country || 'Unknown',
      user_agent: userAgent,
      timestamp: visitEntry.timestamp
    });

    res.json({ success: true });
  });

  app.post('/api/log-search', (req, res) => {
    const { query, lang, country, userId } = req.body;
    if (!query) return res.status(400).json({ error: 'Query is required' });

    // Save to local JSON database
    const db = getLogs();
    const searchEntry = {
      query,
      lang: lang || 'ar',
      country: country || 'Unknown',
      timestamp: new Date().toISOString()
    };
    db.searches.push(searchEntry);
    if (db.searches.length > 5000) db.searches.shift();
    saveLogs(db);

    // Save to user-specific profile
    if (userId) {
      const ip = (req.headers['x-forwarded-for'] as string || '').split(',')[0].trim() || req.socket.remoteAddress || '127.0.0.1';
      const profile = getUserProfile(userId, ip, country || 'Unknown');
      profile.lastSeen = searchEntry.timestamp;
      if (!profile.searches) profile.searches = [];
      profile.searches.push({
        query,
        lang: lang || 'ar',
        timestamp: searchEntry.timestamp
      });
      saveUserProfile(userId, profile);
    }

    // Save to Supabase (non-blocking)
    logToSupabase('searches', {
      query,
      lang: lang || 'ar',
      country: country || 'Unknown',
      timestamp: searchEntry.timestamp
    });

    res.json({ success: true });
  });

  app.post('/api/log-media', (req, res) => {
    const { id, title, type, country, userId } = req.body;
    if (!id || !title) return res.status(400).json({ error: 'Id and title are required' });

    // Save to local JSON database
    const db = getLogs();
    const clickEntry = {
      id: String(id),
      title,
      type: type || 'movie',
      country: country || 'Unknown',
      timestamp: new Date().toISOString()
    };
    db.clicks.push(clickEntry);
    if (db.clicks.length > 5000) db.clicks.shift();
    saveLogs(db);

    // Save to user-specific profile
    if (userId) {
      const ip = (req.headers['x-forwarded-for'] as string || '').split(',')[0].trim() || req.socket.remoteAddress || '127.0.0.1';
      const profile = getUserProfile(userId, ip, country || 'Unknown');
      profile.lastSeen = clickEntry.timestamp;
      if (!profile.clicks) profile.clicks = [];
      profile.clicks.push({
        id: String(id),
        title,
        type: type || 'movie',
        timestamp: clickEntry.timestamp
      });
      saveUserProfile(userId, profile);
    }

    // Save to Supabase (non-blocking)
    logToSupabase('clicks', {
      media_id: String(id),
      title,
      media_type: type || 'movie',
      country: country || 'Unknown',
      timestamp: clickEntry.timestamp
    });

    res.json({ success: true });
  });

  // Heartbeat endpoint to track online status
  app.post('/api/user-heartbeat', (req, res) => {
    const { userId, country, browser } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId is required' });
    const ip = (req.headers['x-forwarded-for'] as string || '').split(',')[0].trim() || req.socket.remoteAddress || '127.0.0.1';
    
    const profile = getUserProfile(userId, ip, country || 'Unknown', browser || 'Unknown');
    profile.lastSeen = new Date().toISOString();
    if (country) profile.country = country;
    if (browser) profile.browser = browser;
    saveUserProfile(userId, profile);
    
    res.json({ success: true });
  });

  // Exit endpoint to track when user closes or leaves page
  app.post('/api/log-exit', (req, res) => {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId is required' });
    const ip = (req.headers['x-forwarded-for'] as string || '').split(',')[0].trim() || req.socket.remoteAddress || '127.0.0.1';
    
    const profile = getUserProfile(userId, ip);
    const now = new Date().toISOString();
    profile.lastSeen = now;
    if (!profile.exits) profile.exits = [];
    profile.exits.push(now);
    saveUserProfile(userId, profile);
    
    res.json({ success: true });
  });

  // Verification & Stats API
  app.post('/api/admin/verify-password', (req, res) => {
    const { password } = req.body;
    if (password === 'flexjo2026') {
      res.json({ success: true, token: 'session_token_flexjo_2026_secured' });
    } else {
      res.status(401).json({ success: false, error: 'Incorrect password' });
    }
  });

  app.get('/api/admin/stats', async (req, res) => {
    const token = req.query.token || req.headers['authorization'];
    if (token !== 'session_token_flexjo_2026_secured' && token !== 'Bearer session_token_flexjo_2026_secured') {
      return res.status(401).json({ error: 'Unauthorized access' });
    }

    // Attempt to pull data from Supabase
    let statsSource = 'Local JSON Database';
    let totalVisits = 0;
    let countryBreakdown: Record<string, number> = {};
    let recentSearches: any[] = [];
    let recentClicks: any[] = [];

    let visitorsList: any[] = [];

    try {
      if (!SB_URL || !SB_KEY) {
        throw new Error('Supabase not configured');
      }

      const headers = {
        'apikey': SB_KEY,
        'Authorization': `Bearer ${SB_KEY}`,
        'Content-Type': 'application/json'
      };

      const [visitsRes, searchesRes, clicksRes, visitorsRes] = await Promise.all([
        fetch(`${SB_URL}/rest/v1/visits?select=*&order=timestamp.desc&limit=1000`, { headers }).catch(() => null),
        fetch(`${SB_URL}/rest/v1/searches?select=*&order=timestamp.desc&limit=200`, { headers }).catch(() => null),
        fetch(`${SB_URL}/rest/v1/clicks?select=*&order=timestamp.desc&limit=200`, { headers }).catch(() => null),
        fetch(`${SB_URL}/rest/v1/visitors?select=*&order=last_seen.desc&limit=200`, { headers }).catch(() => null)
      ]);

      if (visitsRes && visitsRes.ok && searchesRes && searchesRes.ok && clicksRes && clicksRes.ok) {
        statsSource = 'Supabase Cloud Database';
        const visits = await visitsRes.json();
        const searches = await searchesRes.json();
        const clicks = await clicksRes.json();
        if (visitorsRes && visitorsRes.ok) {
          visitorsList = await visitorsRes.json();
        }

        totalVisits = visits.length;
        visits.forEach((v: any) => {
          const c = v.country || 'Unknown';
          countryBreakdown[c] = (countryBreakdown[c] || 0) + 1;
        });

        recentSearches = searches.map((s: any) => ({
          query: s.query,
          lang: s.lang || 'ar',
          country: s.country || 'Unknown',
          timestamp: s.timestamp
        }));

        recentClicks = clicks.map((c: any) => ({
          id: c.media_id,
          title: c.title,
          type: c.media_type || 'movie',
          country: c.country || 'Unknown',
          timestamp: c.timestamp
        }));
      } else {
        throw new Error('Supabase response not ok');
      }
    } catch (e: any) {
      if (e?.message !== 'Supabase not configured') {
        console.warn('Falling back to local logs:', e?.message || e);
      }
      // Fallback to local files
      const db = getLogs();
      totalVisits = db.visits.length;
      db.visits.forEach(v => {
        const c = v.country || 'Unknown';
        countryBreakdown[c] = (countryBreakdown[c] || 0) + 1;
      });
      recentSearches = db.searches.slice(-200).reverse();
      recentClicks = db.clicks.slice(-200).reverse();
    }

    const onlineCount = getOnlineCount();
    const users = getAllUserProfiles();

    // Map local user profiles to visitor entries if visitorsList from Supabase is empty
    if (visitorsList.length === 0 && users.length > 0) {
      visitorsList = users.map(u => {
        const isOnline = u.lastSeen && (Date.now() - new Date(u.lastSeen).getTime()) / 1000 <= 45;
        return {
          ip_address: u.ip || '127.0.0.1',
          country: u.country || 'Unknown',
          current_movie: u.currentMovie || (u.clicks && u.clicks.length > 0 ? u.clicks[u.clicks.length - 1].title : 'تصفح الصفحة الرئيسية'),
          status: isOnline ? 'online' : 'offline',
          login_time: new Date(u.firstSeen || Date.now()).toLocaleTimeString(),
          last_seen: u.lastSeen || new Date().toISOString()
        };
      });
    }

    res.json({
      source: statsSource,
      totalVisits,
      countryBreakdown,
      recentSearches,
      recentClicks,
      onlineCount,
      users,
      visitorsList,
      telegramChatId: TELEGRAM_CHAT_ID,
      telegramTokenConfigured: !!TELEGRAM_TOKEN
    });
  });

  app.post('/api/admin/telegram-settings', (req, res) => {
    const { chatId, token } = req.body;
    if (chatId !== undefined) TELEGRAM_CHAT_ID = String(chatId).trim();
    if (token !== undefined) TELEGRAM_TOKEN = String(token).trim();
    saveTelegramConfig();
    res.json({ success: true, chatId: TELEGRAM_CHAT_ID, tokenConfigured: !!TELEGRAM_TOKEN });
  });

  app.post('/api/admin/test-telegram', async (req, res) => {
    const { chatId } = req.body;
    const targetId = chatId || TELEGRAM_CHAT_ID;
    if (!targetId) {
      return res.status(400).json({ error: 'Chat ID is required' });
    }
    const ok = await sendTelegramAlert('🧪 *رسالة اختبارية من نظام تتبع الزوار (فلكس جو - FlxJo)*\n\nتم توصيل البوت بنجاح! ستصلك إشعارات فورية عند دخول زوار جدد أو مشاهدة الأفلام.', targetId);
    if (ok) {
      res.json({ success: true });
    } else {
      res.status(500).json({ error: 'فشل إرسال الرسالة إلى تليجرام. يرجى التأكد من معرف الشات (Chat ID) وبدء المحادثة مع البوت (/start).' });
    }
  });

  // --- End of Server-Side Database Logging ---

  // 1.1 Global Security Headers and Referrer check to prevent hotlinking and embedding
  app.use((req, res, next) => {
    // Prevent unauthorized iframes (Frame-busting via CSP frame-ancestors)
    res.setHeader(
      'Content-Security-Policy',
      "frame-ancestors 'self' http://localhost:* https://*.google.com https://*.googleusercontent.com https://*.run.app https://*.netlify.app https://*.vercel.app https://flxjo.com https://*.flxjo.com"
    );

    // Protect sensitive API routes from third-party client scraping
    if (req.path.startsWith('/api/')) {
      const referer = (req.headers.referer || '').toLowerCase();
      const origin = (req.headers.origin || '').toLowerCase();
      const host = (req.headers.host || '').toLowerCase();

      // If there's an active Referer, validate that it comes from our trusted domains
      if (referer) {
        const isAuthorized = 
          referer.includes('localhost') ||
          referer.includes('127.0.0.1') ||
          referer.includes('.google.com') ||
          referer.includes('.googleusercontent.com') ||
          referer.includes('.run.app') ||
          referer.includes('.netlify.app') ||
          referer.includes('.vercel.app') ||
          referer.includes('flxjo.com') ||
          (host && referer.includes(host));

        if (!isAuthorized) {
          console.warn(`[Security Alert] Unauthorized API call to ${req.path} from Referer: ${referer}, Origin: ${origin}`);
          return res.status(403).json({ error: 'Access Denied: This server API is protected. Unauthorized hotlinking or embedding is strictly prohibited.' });
        }
      }
    }

    next();
  });

  // API Version Endpoint to detect new builds/deployments and force client reload
  app.get('/api/version', (req, res) => {
    try {
      let mtime = 'dev';
      const htmlPath = path.join(process.cwd(), process.env.NODE_ENV === 'production' ? 'dist/index.html' : 'index.html');
      if (fs.existsSync(htmlPath)) {
        mtime = fs.statSync(htmlPath).mtimeMs.toString();
      }
      res.json({ version: mtime });
    } catch (e) {
      res.json({ version: 'unknown' });
    }
  });

  // 1. Setup static logo in the public directory
  const publicDir = path.join(process.cwd(), 'public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }
  const logoSrc = path.join(process.cwd(), 'src', 'assets', 'images', 'flxjo_favicon_1782915263474.jpg');
  const logoDest = path.join(publicDir, 'logo.jpg');
  if (fs.existsSync(logoSrc)) {
    fs.copyFileSync(logoSrc, logoDest);
  }

  // Explicitly serve robots.txt with correct plain text content type
  app.get('/robots.txt', (req, res) => {
    const publicPath = path.join(process.cwd(), 'public', 'robots.txt');
    const distPath = path.join(process.cwd(), 'dist', 'robots.txt');
    
    if (fs.existsSync(publicPath)) {
      res.header('Content-Type', 'text/plain; charset=utf-8');
      return res.sendFile(publicPath);
    } else if (fs.existsSync(distPath)) {
      res.header('Content-Type', 'text/plain; charset=utf-8');
      return res.sendFile(distPath);
    }
    res.status(200).set('Content-Type', 'text/plain; charset=utf-8').send('User-agent: *\nAllow: /\nSitemap: https://flxjo.netlify.app/sitemap.xml');
  });

  // Explicitly serve sitemap.xml with correct XML content type
  app.get('/sitemap.xml', (req, res) => {
    const publicPath = path.join(process.cwd(), 'public', 'sitemap.xml');
    const distPath = path.join(process.cwd(), 'dist', 'sitemap.xml');
    
    if (fs.existsSync(publicPath)) {
      res.header('Content-Type', 'application/xml; charset=utf-8');
      return res.sendFile(publicPath);
    } else if (fs.existsSync(distPath)) {
      res.header('Content-Type', 'application/xml; charset=utf-8');
      return res.sendFile(distPath);
    }
    res.status(404).send('Sitemap not found');
  });

  // Helper to fetch metadata with a timeout
  async function fetchWithTimeout(url: string, timeout = 2500) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try {
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(id);
      return response;
    } catch (e) {
      clearTimeout(id);
      throw e;
    }
  }

  // 3. Watch page interceptor for social share rich previews
  app.get(['/watch/:mediaType/:id', '/watch/:mediaType/:slug/:id'], async (req, res, next) => {
    const { mediaType, id } = req.params;
    const host = req.get('host') || 'localhost:3000';
    const protocol = req.secure || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
    const siteUrl = `${protocol}://${host}`;

    try {
      // Default metadata fallbacks
      let title = mediaType === 'tv' ? 'مسلسل تلفزيوني مميز' : 'فيلم سينمائي رائع';
      let overview = 'شاهد هذا العرض المثير بأقوى جودة بث وسيرفرات متعددة (سيرفر بياثيفاي، فيدنيست، فيدروك، وستريم إم دي بي) مع ترجمة مدمجة على فلكس جو.';
      let poster = `${siteUrl}/logo.jpg`;

      const blockedIds = [76479, 737568, 113406, 220261, 132333];
      if (id && blockedIds.includes(Number(id))) {
        title = "محتوى غير متوفر | Content Restricted";
        overview = "تم حظر وإيقاف هذا العمل بالكامل على موقعنا بسبب إساءته المباشرة للقيم الإسلامية ومقام النبوة المطهرة والدين الإسلامي الحنيف.";
        poster = `${siteUrl}/logo.jpg`;
      } else if (id && /^\d+$/.test(id)) {
        try {
          const API_KEY = 'c714ec95383c51abcde6afdf2e1571b9';
          const tmdbRes = await fetchWithTimeout(
            `https://api.themoviedb.org/3/${mediaType}/${id}?api_key=${API_KEY}&language=ar`
          );
          
          if (tmdbRes.ok) {
            const data: any = await tmdbRes.json();
            title = data.title || data.name || title;
            overview = data.overview || overview;
            if (data.poster_path) {
              poster = `https://image.tmdb.org/t/p/w780${data.poster_path}`;
            } else if (data.backdrop_path) {
              poster = `https://image.tmdb.org/t/p/w780${data.backdrop_path}`;
            }
          }
        } catch (tmdbError) {
          console.error('TMDB meta fetch failed, falling back to default:', tmdbError);
        }
      }

      // Load HTML Template
      let html = '';
      if (process.env.NODE_ENV !== 'production' && vite) {
        const templatePath = path.join(process.cwd(), 'index.html');
        html = fs.readFileSync(templatePath, 'utf-8');
        html = await vite.transformIndexHtml(req.originalUrl, html);
      } else {
        const templatePath = path.join(process.cwd(), 'dist', 'index.html');
        html = fs.readFileSync(templatePath, 'utf-8');
      }

      // Dynamic replacements in head
      const brandTitle = `${title} 🎬 FlxJo | فلكس جو`;
      
      html = html.replace(/<title>[^]*?<\/title>/, `<title>${brandTitle}</title>`);
      
      html = html.replace(/<meta property="og:title"[^>]*?>/, `<meta property="og:title" content="${brandTitle}" />`);
      html = html.replace(/<meta property="og:description"[^>]*?>/, `<meta property="og:description" content="${overview}" />`);
      html = html.replace(/<meta property="og:image"[^>]*?>/, `<meta property="og:image" content="${poster}" />`);
      
      html = html.replace(/<meta name="twitter:title"[^>]*?>/, `<meta name="twitter:title" content="${brandTitle}" />`);
      html = html.replace(/<meta name="twitter:description"[^>]*?>/, `<meta name="twitter:description" content="${overview}" />`);
      html = html.replace(/<meta name="twitter:image"[^>]*?>/, `<meta name="twitter:image" content="${poster}" />`);

      res.status(200).set({ 'Content-Type': 'text/html' }).end(html);
    } catch (err) {
      next(err);
    }
  });

  // API endpoint for SEO and Movie/TV Content Generation using Gemini API
  app.post('/api/seo-generate', async (req: any, res: any) => {
    const { movieName, language } = req.body;
    if (!movieName) {
      return res.status(400).json({ error: 'Movie/Show name is required' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ 
        error: 'GEMINI_API_KEY is not configured. Please add your Gemini API Key in Settings > Secrets to enable instant SEO generation.' 
      });
    }

    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const languageLabel = language === 'ar' ? 'Arabic (اللغة العربية)' : 'English';
      const prompt = `Act as an expert SEO specialist and content creator for a movie website. I am creating a page for the movie/tv show: "${movieName}".
Generate the following SEO elements and analysis:
1. SEO Title (Max 60 characters): Compelling title including the movie name and a primary keyword (e.g., 'مشاهدة', 'تحليل', 'تقييم' in Arabic, or 'Watch', 'Review', 'Analysis' in English).
2. Meta Description (Max 150 characters): Write an engaging summary that includes the movie name and relevant keywords to boost click-through rates.
3. Focus Keywords: Provide a list of 5 high-intent, SEO-rich keywords related to the movie.
4. Unique Content: Write an original, insightful, human-like 300-word review and analysis of the movie. Focus on the plot, character development, and cinematic experience. Do not copy summaries from other sites; it must look highly professional and original to avoid duplicate content search engine penalties.
5. Schema Markup: Generate the JSON-LD schema code for this movie, including name, image URL, director (or creator), and aggregate rating, to help search engines understand the content. Make sure it is valid JSON-LD.

Language of response (specifically SEO Title, Meta Description, and Unique Content) MUST be: ${languageLabel}.

Return the response as a single, valid JSON object matching the requested schema. Ensure all fields are fully populated and returned without markdown wrappers or blocks around the JSON object.`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              seoTitle: { type: Type.STRING, description: 'Compelling SEO Title (Max 60 characters)' },
              metaDescription: { type: Type.STRING, description: 'Engaging summary including movie name (Max 150 characters)' },
              focusKeywords: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'List of exactly 5 high-intent keywords'
              },
              uniqueContent: { type: Type.STRING, description: 'Unique, human-like 300-word original review and analysis' },
              schemaMarkup: { type: Type.STRING, description: 'JSON-LD schema code as a formatted string' }
            },
            required: ['seoTitle', 'metaDescription', 'focusKeywords', 'uniqueContent', 'schemaMarkup']
          }
        }
      });

      const text = response.text;
      if (!text) {
        throw new Error('No content received from Gemini model.');
      }

      res.json(JSON.parse(text.trim()));
    } catch (err: any) {
      console.warn('SEO generation falling back to smart dynamic template:', err.message || err);
      const isAr = language === 'ar';
      res.json({
        seoTitle: isAr ? `مشاهدة وتحليل ${movieName} | فلكس جو FlxJo` : `Watch & Review ${movieName} | FlxJo`,
        metaDescription: isAr ? `استمتع بمشاهدة وتحليل ${movieName} بأعلى جودة وسيرفرات متعددة وسريعة على موقع فلكس جو.` : `Watch and analyze ${movieName} with high-definition streaming on FlxJo.`,
        focusKeywords: [movieName, `مشاهدة ${movieName}`, `فيلم ${movieName}`, `مسلسل ${movieName}`, `تقييم ${movieName}`],
        uniqueContent: isAr 
          ? `يعتبر "${movieName}" من الأعمال السينمائية البارزة التي تحظى باهتمام كبير لدى جمهور الشاشة الفضية. تميز هذا العمل بحبكة درامية متماسكة، وأداء تمثيلي قوي يعكس احترافية فريق العمل في تجسيد المشاعر والأحداث. كما أن الإخراج السينمائي والموسيقى التصويرية قدما لمسة جمالية أضافت عمقاً وإثارة لكل مشهد، مما يجعله تجربة مشاهدة ممتعة ومميزة للمتابعين.`
          : `"${movieName}" stands out as a compelling production in contemporary cinema. Featuring strong plot development and powerful performances, it delivers an engaging viewing experience that keeps audiences invested from start to finish.`,
        schemaMarkup: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Movie",
          "name": movieName,
          "description": `Watch and stream ${movieName} online on FlxJo`
        }, null, 2)
      });
    }
  });

  // API endpoint for Semantic AI Smart Search using Gemini API
  app.post('/api/smart-search', async (req: any, res: any) => {
    const { query } = req.body;
    if (!query) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      // If API key is missing, fall back to returning the query itself as a title so we search TMDB normally
      return res.json({ titles: [query] });
    }

    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const prompt = `You are the chief cinematic intelligence officer for FLXJO, an elite movie & series search engine.
The user is searching for content using natural language descriptions, thematic ideas, or specific situations (which may be in English, Arabic, or any other language).
Your job is to translate their description into a list of exactly 6 to 10 real film or TV series titles that match the criteria perfectly.

Search Query: "${query}"

Guidelines:
1. Translate or interpret the search query (even if written in Arabic, slang, or a descriptive sentence).
2. Generate exactly 6 to 10 real movie or series names in English. This is crucial because English names are used to query TMDB's API.
3. Make sure the movies/series are widely recognized and highly relevant to the user's description.
4. Output the results as a clean JSON object containing an array of string titles.

Examples:
- Query: "movies like a ship sinking in the sea" -> Return: ["Titanic", "The Poseidon Adventure", "In the Heart of the Sea", "All Is Lost", "White Squall"]
- Query: "أفلام سيارات وسرعة" -> Return: ["The Fast and the Furious", "Need for Speed", "Rush", "Ford v Ferrari", "Drive", "Baby Driver"]
- Query: "scary movies set in space" -> Return: ["Alien", "Event Horizon", "Life", "Pandorum", "Prometheus", "Apollo 18"]

Return the response matching the requested schema. Do not enclose the output in markdown code blocks.`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              titles: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'List of matching movie/show titles in English'
              }
            },
            required: ['titles']
          }
        }
      });

      const text = response.text;
      if (!text) {
        throw new Error('No suggestions received from Gemini.');
      }

      res.json(JSON.parse(text.trim()));
    } catch (err: any) {
      console.warn('AI Smart search fallback active:', err?.message || 'Rate limit/quota triggered');
      // Clean fallback: return the query itself so TMDB search handles it seamlessly
      const fallbackTitles = [query];
      const cleanedWords = query.split(/\s+/).filter((w: string) => w.length > 2);
      if (cleanedWords.length > 0 && cleanedWords.join(' ') !== query) {
        fallbackTitles.push(cleanedWords.join(' '));
      }
      res.json({ titles: fallbackTitles });
    }
  });

  // Helper for server-side TMDB details fetching for SEO meta tags
  async function getMediaSeoDetails(id: string, type: string) {
    try {
      const tmdbType = type === 'tv' ? 'tv' : 'movie';
      const TMDB_API_KEY = process.env.TMDB_API_KEY || 'c714ec95383c51abcde6afdf2e1571b9';
      const url = `https://api.themoviedb.org/3/${tmdbType}/${id}?api_key=${TMDB_API_KEY}&language=ar-SA&append_to_response=credits,genres`;
      const res = await fetch(url);
      if (!res.ok) return null;
      return await res.json();
    } catch (e) {
      return null;
    }
  }

  // Helper to slugify text on the server
  function serverSlugify(text: string | undefined | null): string {
    if (!text) return 'media';
    return text
      .toString()
      .toLowerCase()
      .trim()
      .replace(/[\s\t\n\r_]+/g, '-')
      .replace(/[^\p{L}\p{N}\-]+/gu, '')
      .replace(/\-\-+/g, '-')
      .replace(/^-+/, '')
      .replace(/-+$/, '');
  }

  // Escape XML characters helper
  function escapeXml(unsafe: string): string {
    return unsafe
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  // Dynamic In-Memory Sub-Sitemaps Cache (1 hour TTL)
  const sitemapCache: Record<string, { xml: string; generatedAt: number }> = {};

  function getCachedSitemap(key: string): string | null {
    const entry = sitemapCache[key];
    if (entry && (Date.now() - entry.generatedAt) < 3600000) {
      return entry.xml;
    }
    return null;
  }

  function setCachedSitemap(key: string, xml: string) {
    sitemapCache[key] = { xml, generatedAt: Date.now() };
  }

  // 1. Sitemap Index (Master file pointing to sub-sitemaps)
  app.get(['/sitemap.xml', '/sitemap_index.xml'], (req, res) => {
    const host = req.get('host') || 'flxjo.netlify.app';
    const protocol = req.secure || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'https';
    const siteUrl = `${protocol}://${host}`;
    const today = new Date().toISOString().split('T')[0];

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>${siteUrl}/sitemap-main.xml</loc>
    <lastmod>${today}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${siteUrl}/sitemap-trending.xml</loc>
    <lastmod>${today}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${siteUrl}/sitemap-movies.xml</loc>
    <lastmod>${today}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${siteUrl}/sitemap-tv.xml</loc>
    <lastmod>${today}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${siteUrl}/sitemap-anime.xml</loc>
    <lastmod>${today}</lastmod>
  </sitemap>
</sitemapindex>`;

    res.set({
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400'
    }).send(xml);
  });

  // 2. Main / Static Pages Sub-Sitemap
  app.get('/sitemap-main.xml', (req, res) => {
    const host = req.get('host') || 'flxjo.netlify.app';
    const protocol = req.secure || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'https';
    const siteUrl = `${protocol}://${host}`;
    const today = new Date().toISOString().split('T')[0];

    const cached = getCachedSitemap('main');
    if (cached) {
      return res.set({ 'Content-Type': 'application/xml', 'Cache-Control': 'public, max-age=3600' }).send(cached);
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${siteUrl}/home</loc>
    <lastmod>${today}</lastmod>
    <changefreq>hourly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${siteUrl}/movie</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.95</priority>
  </url>
  <url>
    <loc>${siteUrl}/tv</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.95</priority>
  </url>
  <url>
    <loc>${siteUrl}/anime</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.90</priority>
  </url>
  <url>
    <loc>${siteUrl}/favorites</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.70</priority>
  </url>
  <url>
    <loc>${siteUrl}/seo</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.60</priority>
  </url>
</urlset>`;

    setCachedSitemap('main', xml);
    res.set({ 'Content-Type': 'application/xml', 'Cache-Control': 'public, max-age=3600' }).send(xml);
  });

  // 3. Trending Sub-Sitemap
  app.get('/sitemap-trending.xml', async (req, res) => {
    const host = req.get('host') || 'flxjo.netlify.app';
    const protocol = req.secure || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'https';
    const siteUrl = `${protocol}://${host}`;
    const today = new Date().toISOString().split('T')[0];

    const cached = getCachedSitemap('trending');
    if (cached) {
      return res.set({ 'Content-Type': 'application/xml', 'Cache-Control': 'public, max-age=1800' }).send(cached);
    }

    const TMDB_API_KEY = process.env.TMDB_API_KEY || 'c714ec95383c51abcde6afdf2e1571b9';
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">`;

    try {
      const [movTrend, tvTrend] = await Promise.all([
        fetch(`https://api.themoviedb.org/3/trending/movie/day?api_key=${TMDB_API_KEY}&language=ar-SA`).then(r => r.json()).catch(() => ({ results: [] })),
        fetch(`https://api.themoviedb.org/3/trending/tv/day?api_key=${TMDB_API_KEY}&language=ar-SA`).then(r => r.json()).catch(() => ({ results: [] }))
      ]);

      const items = [
        ...((movTrend.results || []).map((m: any) => ({ ...m, type: 'movie' }))),
        ...((tvTrend.results || []).map((t: any) => ({ ...t, type: 'tv' })))
      ];

      for (const item of items) {
        if (!item || !item.id) continue;
        const title = item.title || item.name || 'Media';
        const cleanSlug = serverSlugify(title);
        const url = `${siteUrl}/${item.type}/${item.id}/${cleanSlug}`;
        const poster = item.poster_path ? `https://image.tmdb.org/t/p/w780${item.poster_path}` : null;
        const release = item.release_date || item.first_air_date || today;

        xml += `
  <url>
    <loc>${url}</loc>
    <lastmod>${release.substring(0, 10)}</lastmod>
    <changefreq>hourly</changefreq>
    <priority>1.0</priority>`;
        if (poster) {
          xml += `
    <image:image>
      <image:loc>${poster}</image:loc>
      <image:title>${escapeXml(title)}</image:title>
    </image:image>`;
        }
        xml += `
  </url>`;
      }
    } catch (e) {
      console.error('Error generating trending sitemap:', e);
    }

    xml += `\n</urlset>`;
    setCachedSitemap('trending', xml);
    res.set({ 'Content-Type': 'application/xml', 'Cache-Control': 'public, max-age=1800' }).send(xml);
  });

  // 4. Movies Sub-Sitemap (Top & Popular Catalog)
  app.get('/sitemap-movies.xml', async (req, res) => {
    const host = req.get('host') || 'flxjo.netlify.app';
    const protocol = req.secure || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'https';
    const siteUrl = `${protocol}://${host}`;
    const today = new Date().toISOString().split('T')[0];

    const cached = getCachedSitemap('movies');
    if (cached) {
      return res.set({ 'Content-Type': 'application/xml', 'Cache-Control': 'public, max-age=3600' }).send(cached);
    }

    const TMDB_API_KEY = process.env.TMDB_API_KEY || 'c714ec95383c51abcde6afdf2e1571b9';
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">`;

    try {
      const [popRes, topRes, nowRes] = await Promise.all([
        fetch(`https://api.themoviedb.org/3/movie/popular?api_key=${TMDB_API_KEY}&language=ar-SA&page=1`).then(r => r.json()).catch(() => ({ results: [] })),
        fetch(`https://api.themoviedb.org/3/movie/top_rated?api_key=${TMDB_API_KEY}&language=ar-SA&page=1`).then(r => r.json()).catch(() => ({ results: [] })),
        fetch(`https://api.themoviedb.org/3/movie/now_playing?api_key=${TMDB_API_KEY}&language=ar-SA&page=1`).then(r => r.json()).catch(() => ({ results: [] }))
      ]);

      const seen = new Set<number>();
      const list = [...(popRes.results || []), ...(topRes.results || []), ...(nowRes.results || [])];

      for (const item of list) {
        if (!item || !item.id || seen.has(item.id)) continue;
        seen.add(item.id);

        const title = item.title || 'Movie';
        const cleanSlug = serverSlugify(title);
        const url = `${siteUrl}/movie/${item.id}/${cleanSlug}`;
        const poster = item.poster_path ? `https://image.tmdb.org/t/p/w780${item.poster_path}` : null;
        const release = item.release_date || today;

        xml += `
  <url>
    <loc>${url}</loc>
    <lastmod>${release.substring(0, 10)}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>`;
        if (poster) {
          xml += `
    <image:image>
      <image:loc>${poster}</image:loc>
      <image:title>${escapeXml(title)}</image:title>
    </image:image>`;
        }
        xml += `
  </url>`;
      }
    } catch (e) {
      console.error('Error generating movies sitemap:', e);
    }

    xml += `\n</urlset>`;
    setCachedSitemap('movies', xml);
    res.set({ 'Content-Type': 'application/xml', 'Cache-Control': 'public, max-age=3600' }).send(xml);
  });

  // 5. TV Shows Sub-Sitemap
  app.get('/sitemap-tv.xml', async (req, res) => {
    const host = req.get('host') || 'flxjo.netlify.app';
    const protocol = req.secure || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'https';
    const siteUrl = `${protocol}://${host}`;
    const today = new Date().toISOString().split('T')[0];

    const cached = getCachedSitemap('tv');
    if (cached) {
      return res.set({ 'Content-Type': 'application/xml', 'Cache-Control': 'public, max-age=3600' }).send(cached);
    }

    const TMDB_API_KEY = process.env.TMDB_API_KEY || 'c714ec95383c51abcde6afdf2e1571b9';
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">`;

    try {
      const [popRes, topRes] = await Promise.all([
        fetch(`https://api.themoviedb.org/3/tv/popular?api_key=${TMDB_API_KEY}&language=ar-SA&page=1`).then(r => r.json()).catch(() => ({ results: [] })),
        fetch(`https://api.themoviedb.org/3/tv/top_rated?api_key=${TMDB_API_KEY}&language=ar-SA&page=1`).then(r => r.json()).catch(() => ({ results: [] }))
      ]);

      const seen = new Set<number>();
      const list = [...(popRes.results || []), ...(topRes.results || [])];

      for (const item of list) {
        if (!item || !item.id || seen.has(item.id)) continue;
        seen.add(item.id);

        const title = item.name || 'TV Series';
        const cleanSlug = serverSlugify(title);
        const url = `${siteUrl}/tv/${item.id}/${cleanSlug}`;
        const poster = item.poster_path ? `https://image.tmdb.org/t/p/w780${item.poster_path}` : null;
        const release = item.first_air_date || today;

        xml += `
  <url>
    <loc>${url}</loc>
    <lastmod>${release.substring(0, 10)}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>`;
        if (poster) {
          xml += `
    <image:image>
      <image:loc>${poster}</image:loc>
      <image:title>${escapeXml(title)}</image:title>
    </image:image>`;
        }
        xml += `
  </url>`;
      }
    } catch (e) {
      console.error('Error generating tv sitemap:', e);
    }

    xml += `\n</urlset>`;
    setCachedSitemap('tv', xml);
    res.set({ 'Content-Type': 'application/xml', 'Cache-Control': 'public, max-age=3600' }).send(xml);
  });

  // 6. Anime Sub-Sitemap
  app.get('/sitemap-anime.xml', async (req, res) => {
    const host = req.get('host') || 'flxjo.netlify.app';
    const protocol = req.secure || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'https';
    const siteUrl = `${protocol}://${host}`;
    const today = new Date().toISOString().split('T')[0];

    const cached = getCachedSitemap('anime');
    if (cached) {
      return res.set({ 'Content-Type': 'application/xml', 'Cache-Control': 'public, max-age=3600' }).send(cached);
    }

    const TMDB_API_KEY = process.env.TMDB_API_KEY || 'c714ec95383c51abcde6afdf2e1571b9';
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">`;

    try {
      const animeRes = await fetch(`https://api.themoviedb.org/3/discover/tv?api_key=${TMDB_API_KEY}&with_genres=16&sort_by=popularity.desc&language=ar-SA&page=1`)
        .then(r => r.json())
        .catch(() => ({ results: [] }));

      const seen = new Set<number>();
      for (const item of (animeRes.results || [])) {
        if (!item || !item.id || seen.has(item.id)) continue;
        seen.add(item.id);

        const title = item.name || 'Anime';
        const cleanSlug = serverSlugify(title);
        const url = `${siteUrl}/tv/${item.id}/${cleanSlug}`;
        const poster = item.poster_path ? `https://image.tmdb.org/t/p/w780${item.poster_path}` : null;
        const release = item.first_air_date || today;

        xml += `
  <url>
    <loc>${url}</loc>
    <lastmod>${release.substring(0, 10)}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.85</priority>`;
        if (poster) {
          xml += `
    <image:image>
      <image:loc>${poster}</image:loc>
      <image:title>${escapeXml(title)}</image:title>
    </image:image>`;
        }
        xml += `
  </url>`;
      }
    } catch (e) {
      console.error('Error generating anime sitemap:', e);
    }

    xml += `\n</urlset>`;
    setCachedSitemap('anime', xml);
    res.set({ 'Content-Type': 'application/xml', 'Cache-Control': 'public, max-age=3600' }).send(xml);
  });

  // 7. Search Engine Instant Ping & IndexNow Dispatch API
  app.post('/api/seo/ping-engines', async (req, res) => {
    const host = req.get('host') || 'flxjo.netlify.app';
    const protocol = req.secure || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'https';
    const siteUrl = `${protocol}://${host}`;
    const sitemapUrl = `${siteUrl}/sitemap.xml`;

    const results: Record<string, any> = {};

    // Ping Google
    try {
      const gRes = await fetch(`https://www.google.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`);
      results.google = { success: gRes.ok || gRes.status === 200, status: gRes.status };
    } catch (e: any) {
      results.google = { success: false, error: e.message };
    }

    // Ping Bing
    try {
      const bRes = await fetch(`https://www.bing.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`);
      results.bing = { success: bRes.ok || bRes.status === 200, status: bRes.status };
    } catch (e: any) {
      results.bing = { success: false, error: e.message };
    }

    // Ping IndexNow (Bing / Yandex / Seznam instant index standard)
    try {
      const inRes = await fetch('https://api.indexnow.org/indexnow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: host.replace(/:\d+$/, ''),
          key: 'flxjo-mass-index-key',
          keyLocation: `${siteUrl}/flxjo-key.txt`,
          urlList: [
            `${siteUrl}/home`,
            `${siteUrl}/movie`,
            `${siteUrl}/tv`,
            `${siteUrl}/anime`
          ]
        })
      });
      results.indexnow = { success: inRes.ok || inRes.status === 200 || inRes.status === 202, status: inRes.status };
    } catch (e: any) {
      results.indexnow = { success: false, error: e.message };
    }

    return res.json({
      timestamp: new Date().toISOString(),
      sitemapUrl,
      results,
      message: 'Instant search engine notifications dispatched successfully'
    });
  });

  // 2. Setup Vite and static assets middleware after API routes
  if (process.env.NODE_ENV !== 'production') {
    vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'custom',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(process.cwd(), 'dist'), { index: false }));
  }

  // 4. Default handler for home and all other React pages with Server-Side SEO Meta Tag Injection
  app.get('*', async (req, res, next) => {
    // Skip static assets files and system API endpoints
    if (req.originalUrl.includes('.') || req.originalUrl.startsWith('/api')) {
      return next();
    }

    try {
      let html = '';
      if (process.env.NODE_ENV !== 'production' && vite) {
        const templatePath = path.join(process.cwd(), 'index.html');
        html = fs.readFileSync(templatePath, 'utf-8');
        html = await vite.transformIndexHtml(req.originalUrl, html);
      } else {
        const templatePath = path.join(process.cwd(), 'dist', 'index.html');
        html = fs.readFileSync(templatePath, 'utf-8');
      }

      // Inject absolute host name for the default logo
      const host = req.get('host') || 'localhost:3000';
      const protocol = req.secure || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
      const siteUrl = `${protocol}://${host}`;
      
      html = html.replaceAll('/logo.jpg', `${siteUrl}/logo.jpg`);

      // Match movie or TV show detail routes for server-side SEO pre-rendering
      const watchMatch = req.path.match(/^\/(watch\/(movie|tv)|movie|tv)\/([^\/]+)(?:\/([^\/]+))?/);
      if (watchMatch) {
        const mediaType = watchMatch[2] || (req.path.startsWith('/tv') ? 'tv' : 'movie');
        const param1 = watchMatch[3];
        const param2 = watchMatch[4];

        // Determine item ID based on route format (/movie/550/fight-club OR /watch/movie/fight-club/550)
        let mediaId = param1;
        if (isNaN(Number(param1)) && param2 && !isNaN(Number(param2))) {
          mediaId = param2;
        }

        if (mediaId && !isNaN(Number(mediaId))) {
          const media = await getMediaSeoDetails(mediaId, mediaType);
          if (media) {
            const isMovie = mediaType === 'movie';
            const title = media.title || media.name || '';
            const year = (media.release_date || media.first_air_date || '').substring(0, 4);
            const yearStr = year ? ` (${year})` : '';
            const seoTitle = isMovie
              ? `مشاهدة فيلم ${title}${yearStr} مترجم كامل HD - فلكس جو | FlxJo`
              : `مشاهدة مسلسل ${title}${yearStr} جميع الحلقات HD - فلكس جو | FlxJo`;
            
            const overview = media.overview && media.overview.length > 10
              ? `${media.overview.substring(0, 160).replace(/"/g, '&quot;')}... شاهد الآن على منصة فلكس جو.`
              : `شاهد الآن ${isMovie ? 'فيلم' : 'مسلسل'} ${title}${yearStr} مترجم بأعلى جودة HD وبدون إعلانات مزعجة على فلكس جو.`;

            const poster = media.poster_path ? `https://image.tmdb.org/t/p/w780${media.poster_path}` : `${siteUrl}/logo.jpg`;
            const backdrop = media.backdrop_path ? `https://image.tmdb.org/t/p/w1280${media.backdrop_path}` : poster;
            const fullUrl = `${siteUrl}${req.originalUrl}`;

            // Build high-tier Schema.org JSON-LD
            const cleanTitle = title.replace(/"/g, '\\"');
            const cleanDesc = overview.replace(/"/g, '\\"');
            const voteAvg = media.vote_average ? Number(media.vote_average).toFixed(1) : '8.0';
            const voteCount = media.vote_count || 120;
            const genresList = (media.genres || []).map((g: any) => `"${(g.name || '').replace(/"/g, '\\"')}"`).join(', ');
            const releaseDate = media.release_date || media.first_air_date || `${year}-01-01`;

            const schemaJsonLd = `
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "${isMovie ? 'Movie' : 'TVSeries'}",
          "@id": "${fullUrl}#${isMovie ? 'movie' : 'tvseries'}",
          "name": "${cleanTitle}",
          "alternateName": "${(media.original_title || media.original_name || cleanTitle).replace(/"/g, '\\"')}",
          "headline": "${seoTitle.replace(/"/g, '\\"')}",
          "description": "${cleanDesc}",
          "image": ["${poster}", "${backdrop}"],
          "datePublished": "${releaseDate}",
          "inLanguage": "ar",
          "genre": [${genresList}],
          "url": "${fullUrl}",
          "aggregateRating": {
            "@type": "AggregateRating",
            "ratingValue": "${voteAvg}",
            "bestRating": "10",
            "worstRating": "1",
            "ratingCount": ${voteCount}
          },
          "provider": {
            "@type": "Organization",
            "name": "FlxJo Cinema",
            "url": "${siteUrl}",
            "logo": "${siteUrl}/logo.jpg"
          }
        },
        {
          "@type": "BreadcrumbList",
          "itemListElement": [
            {
              "@type": "ListItem",
              "position": 1,
              "name": "الرئيسية",
              "item": "${siteUrl}"
            },
            {
              "@type": "ListItem",
              "position": 2,
              "name": "${isMovie ? 'الأفلام' : 'المسلسلات'}",
              "item": "${siteUrl}/${isMovie ? 'movie' : 'tv'}"
            },
            {
              "@type": "ListItem",
              "position": 3,
              "name": "${cleanTitle}",
              "item": "${fullUrl}"
            }
          ]
        }
      ]
    }
    </script>`;

            // Replace title
            html = html.replace(/<title>.*?<\/title>/i, `<title>${seoTitle}</title>`);
            
            // Inject SEO meta & OpenGraph tags
            const extraTags = `
    <meta name="description" content="${overview}" />
    <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
    <meta property="og:site_name" content="فلكس جو | FLXJO" />
    <meta property="og:title" content="${seoTitle}" />
    <meta property="og:description" content="${overview}" />
    <meta property="og:image" content="${backdrop}" />
    <meta property="og:url" content="${fullUrl}" />
    <meta property="og:type" content="${isMovie ? 'video.movie' : 'video.tv_show'}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${seoTitle}" />
    <meta name="twitter:description" content="${overview}" />
    <meta name="twitter:image" content="${backdrop}" />
    <link rel="canonical" href="${fullUrl}" />
${schemaJsonLd}
`;
            html = html.replace('</head>', `${extraTags}</head>`);

            // Inject Semantic Pre-rendered HTML inside <div id="root"> for Web Crawlers & Googlebot
            const genresText = (media.genres || []).map((g: any) => g.name).join(' • ');
            const crawlerHtml = `
      <div id="crawler-prerender" class="sr-only" style="position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;">
        <article itemscope itemtype="https://schema.org/${isMovie ? 'Movie' : 'TVSeries'}">
          <h1 itemprop="name">${title} (${year})</h1>
          <p itemprop="description">${overview}</p>
          <img src="${poster}" alt="${title}" itemprop="image" />
          <div>التقييم: <span itemprop="aggregateRating">${voteAvg}/10</span> (${voteCount} صوت)</div>
          <div>التصنيف: <span>${genresText}</span></div>
          <div>تاريخ الصدور: <span>${releaseDate}</span></div>
          <p>شاهد وتحميل ${isMovie ? 'فيلم' : 'مسلسل'} ${title} مترجم كامل HD حصرياً عبر منصة فلكس جو FlxJo بدقة عالية.</p>
        </article>
      </div>`;

            html = html.replace('<div id="root"></div>', `<div id="root">${crawlerHtml}</div>`);
          }
        }
      }

      res.status(200).set({ 'Content-Type': 'text/html' }).end(html);
    } catch (e) {
      next(e);
    }
  });


  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
