import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { getApiUrl } from '../lib/api';

interface AdminPortalProps {
  lang: 'ar' | 'en';
}

export default function AdminPortal({ lang }: AdminPortalProps) {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authToken, setAuthToken] = useState('');
  const [stats, setStats] = useState<any | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);

  // Telegram Notifications State
  const [telegramChatId, setTelegramChatId] = useState('');
  const [telegramTestStatus, setTelegramTestStatus] = useState<string | null>(null);
  const [testingTelegram, setTestingTelegram] = useState(false);

  // Movie Promotion state
  const [promoQuery, setPromoQuery] = useState('');
  const [promoStatus, setPromoStatus] = useState<string | null>(null);
  const [sendingPromo, setSendingPromo] = useState(false);

  useEffect(() => {
    const storedToken = sessionStorage.getItem('flexjo_admin_token');
    if (storedToken) {
      setIsAuthenticated(true);
      setAuthToken(storedToken);
      loadAdminStats(storedToken);
    }
  }, []);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    try {
      const res = await fetch(getApiUrl('/api/admin/verify-password'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setIsAuthenticated(true);
        setAuthToken(data.token);
        sessionStorage.setItem('flexjo_admin_token', data.token);
        loadAdminStats(data.token);
      } else {
        setPasswordError(data.error || (lang === 'en' ? 'Incorrect Password!' : 'كلمة المرور خاطئة!'));
      }
    } catch (err) {
      setPasswordError(lang === 'en' ? 'Server connection error' : 'خطأ في الاتصال بالخادم');
    }
  };

  const loadAdminStats = async (token: string) => {
    setLoadingStats(true);
    try {
      const res = await fetch(getApiUrl(`/api/admin/stats?token=${encodeURIComponent(token)}`), {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
        if (data.telegramChatId) {
          setTelegramChatId(data.telegramChatId);
        }
      } else if (res.status === 401) {
        sessionStorage.removeItem('flexjo_admin_token');
        setIsAuthenticated(false);
        setPasswordError(lang === 'en' ? 'Session expired. Please login again.' : 'انتهت الجلسة. يرجى تسجيل الدخول مجدداً.');
      }
    } catch (err) {
      console.error('Failed to load admin stats:', err);
    } finally {
      setLoadingStats(false);
    }
  };

  const handleSaveTelegram = async () => {
    try {
      const res = await fetch(getApiUrl('/api/admin/telegram-settings'), {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ chatId: telegramChatId, token: authToken })
      });
      if (res.ok) {
        setTelegramTestStatus(lang === 'en' ? 'Telegram Chat ID saved successfully!' : 'تم حفظ معرف الشات (Chat ID) بنجاح!');
      } else {
        setTelegramTestStatus(lang === 'en' ? 'Failed to save settings' : 'فشل حفظ الإعدادات');
      }
    } catch (e) {
      setTelegramTestStatus(lang === 'en' ? 'Failed to save settings' : 'فشل حفظ الإعدادات');
    }
  };

  const handleTestTelegram = async () => {
    setTestingTelegram(true);
    setTelegramTestStatus(null);
    try {
      const res = await fetch(getApiUrl('/api/admin/test-telegram'), {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ chatId: telegramChatId, token: authToken })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTelegramTestStatus(lang === 'en' ? 'Test message sent successfully to Telegram! 🚀' : 'تم إرسال رسالة الاختبار بنجاح إلى حسابك في تليجرام! 🚀');
      } else {
        setTelegramTestStatus(data.error || (lang === 'en' ? 'Failed to send test message' : 'فشل إرسال رسالة الاختبار'));
      }
    } catch (e) {
      setTelegramTestStatus(lang === 'en' ? 'Server error' : 'خطأ في الاتصال بالخادم');
    } finally {
      setTestingTelegram(false);
    }
  };

  const handleSendPromotion = async () => {
    if (!promoQuery.trim()) return;
    setSendingPromo(true);
    setPromoStatus(null);
    try {
      const res = await fetch(getApiUrl('/api/admin/promote'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ query: promoQuery.trim(), token: authToken })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setPromoStatus(lang === 'en' ? `Promotion broadcast sent to ${data.recipientCount || 'all'} subscribers! 📢` : `تم إرسال الإعلان الترويجي لـ ${data.recipientCount || 'جميع'} المشتركين بنجاح! 📢`);
        setPromoQuery('');
      } else {
        setPromoStatus(data.error || (lang === 'en' ? 'Failed to broadcast promotion' : 'فشل إرسال الإعلان الترويجي'));
      }
    } catch (e) {
      setPromoStatus(lang === 'en' ? 'Error broadcasting promotion' : 'حدث خطأ أثناء إرسال الترويج');
    } finally {
      setSendingPromo(false);
    }
  };

  return (
    <div className="min-h-[85vh] py-12 px-4 md:px-8 lg:px-16 flex flex-col items-center justify-center text-white" dir={lang === 'en' ? 'ltr' : 'rtl'}>
      {!isAuthenticated ? (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-zinc-950/80 border border-zinc-900 rounded-[2.5rem] p-8 sm:p-10 shadow-2xl space-y-8 backdrop-blur-xl"
        >
          <div className="text-center space-y-3">
            <div className="mx-auto w-14 h-14 bg-red-600/10 border border-red-500/20 text-red-500 rounded-full flex items-center justify-center text-2xl">
              🔒
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight">
              {lang === 'en' ? 'FLEX JO Admin Gate' : 'لوحة تحكم المسؤول - FLEX JO'}
            </h2>
            <p className="text-xs text-zinc-400">
              {lang === 'en' 
                ? 'Access restricted to website administrators. Please enter the master password.' 
                : 'منطقة مخصصة لإدارة الموقع والمشرفين. يرجى إدخال كلمة المرور للمتابعة.'}
            </p>
          </div>

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-400">
                {lang === 'en' ? 'Admin Access Password' : 'كلمة مرور المشرف'}
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-zinc-900/50 border border-zinc-800 focus:border-red-600 rounded-2xl px-4 py-3 text-sm text-white placeholder-zinc-600 outline-none transition"
                required
                autoFocus
              />
              {passwordError && (
                <p className="text-[11px] text-red-500 font-semibold">{passwordError}</p>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => navigate('/home')}
                className="flex-1 py-3 bg-zinc-900 hover:bg-zinc-850 text-zinc-300 hover:text-white rounded-2xl border border-zinc-800 text-xs font-bold transition cursor-pointer"
              >
                {lang === 'en' ? 'Back Home' : 'الرئيسية'}
              </button>
              <button
                type="submit"
                className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-2xl text-xs font-bold transition cursor-pointer shadow-lg shadow-red-600/30"
              >
                {lang === 'en' ? 'Unlock Gate' : 'دخول المشرف'}
              </button>
            </div>
          </form>
        </motion.div>
      ) : (
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-6xl bg-zinc-950/50 border border-zinc-900/80 rounded-[3rem] p-6 sm:p-10 shadow-2xl space-y-10 backdrop-blur-xl"
        >
          {/* Header section */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-zinc-900 pb-6">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping" />
                  <span className="text-[10px] uppercase tracking-wider font-mono font-bold text-red-500">
                    {lang === 'en' ? 'Live Admin Hub' : 'نظام الإحصائيات الفوري للمشرفين'}
                  </span>
                </div>
                {stats?.source && (
                  <span className="text-[10px] bg-red-600/10 border border-red-500/20 text-red-400 font-mono px-2.5 py-0.5 rounded-full font-bold">
                    Data Engine: {stats.source}
                  </span>
                )}
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-zinc-100">
                {lang === 'en' ? 'FLEX JO Executive Dashboard' : 'لوحة تحكم المسؤولين - FLEX JO'}
              </h1>
              <p className="text-xs text-zinc-400">
                {lang === 'en' 
                  ? 'Real-time user engagement, regional entry metrics, searches, and stream analytics.' 
                  : 'إحصائيات فورية لزوار الموقع، التوزيع الجغرافي للبلدان، الكلمات المبحوثة، والأعمال المعروضة.'}
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => loadAdminStats(authToken)}
                disabled={loadingStats}
                className="px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 hover:text-white rounded-xl border border-zinc-800 text-xs font-bold transition cursor-pointer flex items-center gap-2"
              >
                <span>🔄</span>
                <span>{lang === 'en' ? 'Refresh Logs' : 'تحديث البيانات'}</span>
              </button>
              <button
                onClick={() => {
                  sessionStorage.removeItem('flexjo_admin_token');
                  setIsAuthenticated(false);
                  setStats(null);
                }}
                className="px-4 py-2.5 bg-red-950/20 hover:bg-red-950/50 border border-red-900/40 text-red-400 hover:text-red-300 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                {lang === 'en' ? 'Lock Console' : 'خروج وقفل'}
              </button>
            </div>
          </div>

          {loadingStats && !stats ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3">
              <div className="w-8 h-8 border-3 border-red-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-zinc-500">{lang === 'en' ? 'Syncing system logs...' : 'جاري مزامنة وسحب سجلات النظام...'}</p>
            </div>
          ) : (
            <div className="space-y-8 animate-fade-in">
              {/* Stats cards grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Total Visitors Card */}
                <div className="bg-zinc-900/30 border border-zinc-900/80 p-6 rounded-3xl flex items-center gap-5 shadow-lg">
                  <div className="w-14 h-14 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-center text-2xl shadow-inner text-red-500">
                    👥
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-zinc-400">
                      {lang === 'en' ? 'Total Logged Visits' : 'إجمالي عدد الزوار'}
                    </p>
                    <h3 className="text-2xl sm:text-3xl font-black text-white font-mono">
                      {stats?.totalVisits || 0}
                    </h3>
                  </div>
                </div>

                {/* Online Right Now Card */}
                <div className="bg-zinc-900/30 border border-zinc-900/80 p-6 rounded-3xl flex items-center gap-5 shadow-lg relative overflow-hidden">
                  <div className="w-14 h-14 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-center text-2xl shadow-inner text-green-500 relative">
                    <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-ping absolute top-1.5 right-1.5" />
                    🟢
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-zinc-400">
                      {lang === 'en' ? 'Online Right Now' : 'نشط الآن بالموقع'}
                    </p>
                    <h3 className="text-2xl sm:text-3xl font-black text-white font-mono flex items-center gap-2">
                      {stats?.onlineCount || 0}
                      <span className="text-[10px] text-green-500 font-bold uppercase animate-pulse">Live</span>
                    </h3>
                  </div>
                </div>

                {/* Active Searches Card */}
                <div className="bg-zinc-900/30 border border-zinc-900/80 p-6 rounded-3xl flex items-center gap-5 shadow-lg">
                  <div className="w-14 h-14 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-center text-2xl shadow-inner text-yellow-500">
                    🔍
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-zinc-400">
                      {lang === 'en' ? 'Searches Logged' : 'عمليات البحث'}
                    </p>
                    <h3 className="text-2xl sm:text-3xl font-black text-white font-mono">
                      {stats?.recentSearches?.length || 0}
                    </h3>
                  </div>
                </div>

                {/* Streams Played Card */}
                <div className="bg-zinc-900/30 border border-zinc-900/80 p-6 rounded-3xl flex items-center gap-5 shadow-lg">
                  <div className="w-14 h-14 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-center text-2xl shadow-inner text-emerald-500">
                    🎬
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-zinc-400">
                      {lang === 'en' ? 'Streams Opened' : 'أفلام ومسلسلات معروضة'}
                    </p>
                    <h3 className="text-2xl sm:text-3xl font-black text-white font-mono">
                      {stats?.recentClicks?.length || 0}
                    </h3>
                  </div>
                </div>
              </div>

              {/* Main Stats Panel splits */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Country Breakdown */}
                <div className="bg-zinc-900/30 border border-zinc-900/80 p-6 rounded-3xl space-y-4">
                  <h3 className="text-base font-black border-b border-zinc-900 pb-2">
                    {lang === 'en' ? 'Visits by Country' : 'الزوار حسب البلد'}
                  </h3>
                  
                  <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1">
                    {stats && Object.keys(stats.countryBreakdown || {}).length > 0 ? (
                      Object.entries(stats.countryBreakdown).sort((a: any, b: any) => b[1] - a[1]).map(([country, count]: any) => {
                        const maxCount = Math.max(...(Object.values(stats.countryBreakdown) as number[]));
                        const pct = maxCount > 0 ? (count / maxCount) * 100 : 0;
                        return (
                          <div key={country} className="space-y-1.5">
                            <div className="flex justify-between items-center text-xs">
                              <span className="font-bold flex items-center gap-2">
                                <span>📍</span>
                                <span className="font-mono text-zinc-300">{country}</span>
                              </span>
                              <span className="font-mono text-zinc-400 font-bold bg-zinc-900 px-2.5 py-0.5 rounded-md">
                                {count} {lang === 'en' ? 'visits' : 'زيارة'}
                              </span>
                            </div>
                            <div className="w-full bg-zinc-900 h-2 rounded-full overflow-hidden">
                              <div className="bg-red-600 h-full rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-zinc-500 text-xs py-10 text-center">
                        {lang === 'en' ? 'No country data available.' : 'لا تتوفر بيانات بلدان حالياً.'}
                      </p>
                    )}
                  </div>
                </div>

                {/* Right Column: Searches & Views splits */}
                <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Searches */}
                  <div className="bg-zinc-900/30 border border-zinc-900/80 p-6 rounded-3xl space-y-4">
                    <h3 className="text-base font-black border-b border-zinc-900 pb-2">
                      {lang === 'en' ? 'Recent Searches' : 'آخر ما تم البحث عنه'}
                    </h3>

                    <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                      {stats && stats.recentSearches?.length > 0 ? (
                        stats.recentSearches.map((search: any, idx: number) => (
                          <div key={idx} className="bg-zinc-950/60 border border-zinc-900/50 p-3 rounded-2xl flex flex-col gap-1 text-xs">
                            <div className="flex justify-between items-center">
                              <span className="font-black text-red-500 select-all truncate max-w-[120px]">
                                {search.query}
                              </span>
                              <span className="text-[10px] text-zinc-500 font-mono">
                                {new Date(search.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <div className="flex justify-between items-center text-[10px] text-zinc-500">
                              <span>{lang === 'en' ? 'Lang:' : 'لغة:'} <span className="uppercase font-mono font-bold">{search.lang}</span></span>
                              <span>{lang === 'en' ? 'Country:' : 'بلد:'} <span className="font-mono font-bold text-zinc-400">{search.country}</span></span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-zinc-500 text-xs py-10 text-center">
                          {lang === 'en' ? 'No search queries recorded yet.' : 'لم يتم تسجيل أي عمليات بحث بعد.'}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Opened titles */}
                  <div className="bg-zinc-900/30 border border-zinc-900/80 p-6 rounded-3xl space-y-4">
                    <h3 className="text-base font-black border-b border-zinc-900 pb-2">
                      {lang === 'en' ? 'Recent Shows Opened' : 'آخر الأفلام والمسلسلات المفتوحة'}
                    </h3>

                    <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                      {stats && stats.recentClicks?.length > 0 ? (
                        stats.recentClicks.map((click: any, idx: number) => (
                          <div key={idx} className="bg-zinc-950/60 border border-zinc-900/50 p-3 rounded-2xl flex flex-col gap-1 text-xs">
                            <div className="flex justify-between items-center">
                              <span className="font-black text-zinc-200 select-all truncate max-w-[130px]">
                                {click.title}
                              </span>
                              <span className="text-[10px] text-zinc-500 font-mono">
                                {new Date(click.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <div className="flex justify-between items-center text-[10px] text-zinc-500">
                              <span className="bg-zinc-900 text-zinc-400 px-1.5 py-0.5 rounded uppercase text-[8px] font-mono">
                                {click.type === 'tv' ? (lang === 'en' ? 'TV' : 'مسلسل') : (lang === 'en' ? 'Movie' : 'فيلم')}
                              </span>
                              <span>{lang === 'en' ? 'Country:' : 'بلد:'} <span className="font-mono font-bold text-zinc-400">{click.country}</span></span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-zinc-500 text-xs py-10 text-center">
                          {lang === 'en' ? 'No streams opened yet.' : 'لم يتم تشغيل أي عروض بعد.'}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Detailed Users Directory (Folder DB) */}
              <div className="bg-zinc-900/30 border border-zinc-900/80 p-6 sm:p-8 rounded-3xl space-y-6 mt-8">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-900 pb-4">
                  <div className="space-y-1">
                    <h3 className="text-lg font-black text-zinc-100 flex items-center gap-2">
                      <span>📁</span>
                      <span>{lang === 'en' ? 'Live User Session Profiles (Folder DB)' : 'ملفات وسجلات زوار الموقع الفردية (Folder DB)'}</span>
                    </h3>
                    <p className="text-xs text-zinc-500">
                      {lang === 'en' 
                        ? 'Each active browser generates a unique file storing search inputs, clicked media, entry logs, and real-time status.' 
                        : 'كل متصفح نشط ينشئ ملفاً فريداً يحفظ عمليات البحث، العروض التي شاهدها، سجلات الدخول والحالة الفورية.'}
                    </p>
                  </div>
                  <span className="text-xs font-mono font-bold bg-zinc-900 px-3 py-1 border border-zinc-800 rounded-full text-red-500">
                    {stats?.users?.length || 0} {lang === 'en' ? 'Active Profiles' : 'ملف مستخدم نشط'}
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-4 max-h-[500px] overflow-y-auto pr-2">
                  {stats?.users && stats.users.length > 0 ? (
                    stats.users.map((u: any) => {
                      const isUserOnline = stats?.onlineCount && u.lastSeen && (Date.now() - new Date(u.lastSeen).getTime()) / 1000 <= 45;
                      const isExpanded = expandedUser === u.userId;
                      
                      return (
                        <div 
                          key={u.userId}
                          className={`bg-zinc-950/60 border ${isExpanded ? 'border-red-600/30 ring-1 ring-red-600/10' : 'border-zinc-900/50 hover:border-zinc-800'} p-4 rounded-2xl transition-all duration-300 space-y-3`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex flex-wrap items-center gap-2.5">
                              <span className="text-xs font-mono bg-zinc-900 text-zinc-300 px-2.5 py-1 rounded-lg border border-zinc-800 font-bold">
                                🆔 {u.userId}
                              </span>
                              <span className={`text-[10px] font-mono font-black px-2 py-0.5 rounded-full flex items-center gap-1.5 ${isUserOnline ? 'bg-green-600/10 text-green-400 border border-green-500/20' : 'bg-zinc-900 text-zinc-500 border border-zinc-800'}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${isUserOnline ? 'bg-green-500 animate-pulse' : 'bg-zinc-600'}`} />
                                {isUserOnline ? (lang === 'en' ? 'ACTIVE NOW' : 'نشط الآن') : (lang === 'en' ? 'OFFLINE' : 'غير متصل')}
                              </span>
                              <span className="text-xs bg-red-600/10 border border-red-500/20 text-red-400 px-2.5 py-0.5 rounded-full font-bold">
                                📍 {u.country || 'Unknown'}
                              </span>
                            </div>

                            <div className="flex items-center gap-3 self-end sm:self-auto text-[11px] text-zinc-400 font-mono">
                              <span className="text-zinc-500">💻 {u.browser || 'Unknown'}</span>
                              <button 
                                onClick={() => setExpandedUser(isExpanded ? null : u.userId)}
                                className="px-3 py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white rounded-lg transition-all font-bold cursor-pointer"
                              >
                                {isExpanded ? (lang === 'en' ? 'Hide Details ▲' : 'إخفاء التفاصيل ▲') : (lang === 'en' ? 'Show Details ▼' : 'عرض التفاصيل ▼')}
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-zinc-500 font-mono border-t border-zinc-900/40 pt-2.5">
                            <div>
                              {lang === 'en' ? 'First Joined:' : 'تاريخ أول دخول:'} <span className="text-zinc-400">{new Date(u.firstSeen).toLocaleString()}</span>
                            </div>
                            <div className="sm:text-right">
                              {lang === 'en' ? 'Last Activity:' : 'آخر ظهور/نشاط:'} <span className="text-zinc-300 font-bold">{new Date(u.lastSeen).toLocaleString()}</span>
                            </div>
                          </div>

                          {/* Expanded Details section */}
                          {isExpanded && (
                            <motion.div 
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              className="border-t border-zinc-900/80 pt-3 mt-3 grid grid-cols-1 md:grid-cols-2 gap-6"
                            >
                              {/* User Searches */}
                              <div className="space-y-2">
                                <h4 className="text-xs font-black text-zinc-400 flex items-center gap-1.5 uppercase tracking-wider">
                                  <span>🔍</span>
                                  <span>{lang === 'en' ? 'Searches Performed' : 'عمليات البحث المنفذة'} ({u.searches?.length || 0})</span>
                                </h4>
                                <div className="bg-zinc-950/40 rounded-xl p-3 border border-zinc-900 max-h-[160px] overflow-y-auto space-y-1.5 pr-1">
                                  {u.searches && u.searches.length > 0 ? (
                                    u.searches.map((s: any, sIdx: number) => (
                                      <div key={sIdx} className="flex justify-between items-center text-[11px] py-1 border-b border-zinc-900/30 last:border-0">
                                        <span className="text-red-500 font-bold bg-red-600/5 px-2 py-0.5 rounded-md border border-red-500/10">{s.query}</span>
                                        <span className="text-[9px] text-zinc-500 font-mono">{new Date(s.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                      </div>
                                    ))
                                  ) : (
                                    <p className="text-zinc-600 text-[10px] py-4 text-center">
                                      {lang === 'en' ? 'No search inputs logged.' : 'لم يقم بأي عمليات بحث.'}
                                    </p>
                                  )}
                                </div>
                              </div>

                              {/* User Clicks / Views */}
                              <div className="space-y-2">
                                <h4 className="text-xs font-black text-zinc-400 flex items-center gap-1.5 uppercase tracking-wider">
                                  <span>🎬</span>
                                  <span>{lang === 'en' ? 'Shows Opened' : 'العروض التي شاهدها'} ({u.clicks?.length || 0})</span>
                                </h4>
                                <div className="bg-zinc-950/40 rounded-xl p-3 border border-zinc-900 max-h-[160px] overflow-y-auto space-y-1.5 pr-1">
                                  {u.clicks && u.clicks.length > 0 ? (
                                    u.clicks.map((c: any, cIdx: number) => (
                                      <div key={cIdx} className="flex justify-between items-center text-[11px] py-1 border-b border-zinc-900/30 last:border-0">
                                        <span className="text-zinc-300 font-bold truncate max-w-[150px]">{c.title}</span>
                                        <span className="bg-zinc-900 text-zinc-500 text-[8px] uppercase px-1.5 rounded font-mono">{c.type === 'tv' ? 'TV' : 'Movie'}</span>
                                      </div>
                                    ))
                                  ) : (
                                    <p className="text-zinc-600 text-[10px] py-4 text-center">
                                      {lang === 'en' ? 'No streams opened yet.' : 'لم يقم بتشغيل أي عروض.'}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-zinc-500 text-xs py-12 text-center">
                      {lang === 'en' ? 'No folder profiles loaded yet.' : 'لم يتم تسجيل أي ملفات مستخدمين بعد.'}
                    </p>
                  )}
                </div>
              </div>

              {/* Supabase Visitors Table Live Monitor */}
              <div className="bg-zinc-900/30 border border-zinc-900/80 p-6 sm:p-8 rounded-3xl space-y-6 mt-8">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-900 pb-4">
                  <div className="space-y-1">
                    <h3 className="text-lg font-black text-zinc-100 flex items-center gap-2">
                      <span>📊</span>
                      <span>{lang === 'en' ? 'Live Visitors Directory (Supabase / visitors Table)' : 'جدول تتبع الزوار المباشر (Supabase - visitors Table)'}</span>
                    </h3>
                    <p className="text-xs text-zinc-500">
                      {lang === 'en'
                        ? 'Real-time database records storing IP addresses, country, currently watched movie, online status, and login activity.'
                        : 'بيانات فورية مسجلة في جدول (visitors) تحتوي الـ IP، الدولة، اسم الفيلم المعروض حالياً، حالة الاتصال ووقت الدخول.'}
                    </p>
                  </div>
                  <span className="text-xs font-mono font-bold bg-green-600/10 border border-green-500/20 text-green-400 px-3 py-1 rounded-full">
                    {stats?.visitorsList?.length || 0} {lang === 'en' ? 'Tracked Visitors' : 'زائر مسجل'}
                  </span>
                </div>

                <div className="overflow-x-auto border border-zinc-900/80 rounded-2xl bg-zinc-950/80">
                  <table className="w-full text-right text-xs text-zinc-300">
                    <thead className="bg-zinc-900/60 text-zinc-400 uppercase text-[10px] font-mono border-b border-zinc-900">
                      <tr>
                        <th className="p-3 text-right">الـ IP (ip_address)</th>
                        <th className="p-3 text-right">الدولة (country)</th>
                        <th className="p-3 text-right">الفيلم المعروض (current_movie)</th>
                        <th className="p-3 text-center">الحالة (status)</th>
                        <th className="p-3 text-right">وقت الدخول (login_time)</th>
                        <th className="p-3 text-right">آخر ظهور (last_seen)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-900/50 font-mono text-[11px]">
                      {stats?.visitorsList && stats.visitorsList.length > 0 ? (
                        stats.visitorsList.map((vis: any, vIdx: number) => {
                          const isOnline = vis.status === 'online' || (vis.last_seen && (Date.now() - new Date(vis.last_seen).getTime()) / 1000 <= 45);
                          return (
                            <tr key={vIdx} className="hover:bg-zinc-900/30 transition-colors">
                              <td className="p-3 font-bold text-zinc-200 select-all">{vis.ip_address || vis.ip || '127.0.0.1'}</td>
                              <td className="p-3">
                                <span className="bg-red-600/10 border border-red-500/20 text-red-400 px-2 py-0.5 rounded font-bold">
                                  📍 {vis.country || 'Unknown'}
                                </span>
                              </td>
                              <td className="p-3 text-zinc-100 font-sans font-bold max-w-[200px] truncate">{vis.current_movie || 'تصفح الصفحة الرئيسية'}</td>
                              <td className="p-3 text-center">
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black flex items-center justify-center gap-1.5 w-fit mx-auto ${isOnline ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-zinc-900 text-zinc-500 border border-zinc-800'}`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-zinc-600'}`} />
                                  {isOnline ? 'online' : 'offline'}
                                </span>
                              </td>
                              <td className="p-3 text-zinc-400">{vis.login_time || '12:00:00 AM'}</td>
                              <td className="p-3 text-zinc-500">{vis.last_seen ? new Date(vis.last_seen).toLocaleTimeString() : 'الآن'}</td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-zinc-500 font-sans">
                            {lang === 'en' ? 'No visitors recorded yet.' : 'لا توجد سجلات زوار مسجلة حالياً.'}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Advanced Savage Admin Controls (Featured Hero Pinned Movie & Visitor Alert Banner) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                {/* 1. Pinned Featured Hero Movie Control */}
                <div className="bg-zinc-900/30 border border-zinc-900/80 p-6 rounded-3xl space-y-4">
                  <h3 className="text-base font-black border-b border-zinc-900 pb-2 flex items-center gap-2">
                    <span>🎬</span>
                    <span>{lang === 'en' ? 'Pin Featured Hero Movie (تثبيت فيلم الواجهة)' : 'تثبيت فيلم الواجهة الرئيسي (Featured Hero)'}</span>
                  </h3>
                  <p className="text-xs text-zinc-400">
                    {lang === 'en' 
                      ? 'Enter any TMDB Movie ID or title to instantly pin it as the massive top banner for all site visitors.' 
                      : 'أدخل معرف فيلم (TMDB ID) أو اسم الفيلم لتثبيته فوراً كعرض رئيسي في أعلى الواجهة لجميع الزوار.'}
                  </p>
                  <div className="space-y-3">
                    <input
                      type="text"
                      placeholder="e.g. 969681 or Spider-Man"
                      id="admin-pinned-movie-input"
                      className="w-full bg-zinc-950/60 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-zinc-600 outline-none focus:border-red-600"
                    />
                    <button
                      onClick={async () => {
                        const inputEl = document.getElementById('admin-pinned-movie-input') as HTMLInputElement;
                        if (!inputEl || !inputEl.value.trim()) return;
                        try {
                          const res = await fetch(getApiUrl('/api/admin/pin-movie'), {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
                            body: JSON.stringify({ query: inputEl.value.trim(), token: authToken })
                          });
                          const data = await res.json();
                          if (res.ok && data.success) {
                            alert(lang === 'en' ? 'Featured hero movie pinned successfully!' : 'تم تثبيت الفيلم في الواجهة بنجاح لجميع الزوار! 🔥');
                            inputEl.value = '';
                          } else {
                            alert(data.error || 'Failed to pin movie');
                          }
                        } catch (e) {
                          alert('Error connecting to server');
                        }
                      }}
                      className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs transition cursor-pointer shadow-lg shadow-red-600/20"
                    >
                      {lang === 'en' ? 'Pin Movie to Homepage Now' : 'تثبيت الفيلم على الواجهة فوراً 🚀'}
                    </button>
                  </div>
                </div>

                {/* 2. Global Visitor Popup Notification Announcement */}
                <div className="bg-zinc-900/30 border border-zinc-900/80 p-6 rounded-3xl space-y-4">
                  <h3 className="text-base font-black border-b border-zinc-900 pb-2 flex items-center gap-2">
                    <span>⚡</span>
                    <span>{lang === 'en' ? 'Global Visitor Alert Banner (إرسال تنبيه عاجل)' : 'إرسال تنبيه عاجل لجميع زوار الموقع ⚡'}</span>
                  </h3>
                  <p className="text-xs text-zinc-400">
                    {lang === 'en' 
                      ? 'Broadcast a live floating notification message instantly to every user currently browsing the store.' 
                      : 'بث رسالة تنبيه عائمة تظهر فوراً لكل مستخدم يتصفح المتجر حالياً.'}
                  </p>
                  <div className="space-y-3">
                    <input
                      type="text"
                      placeholder="e.g. حفل توزيع أوسكار 2026 مباشر الآن!"
                      id="admin-alert-msg-input"
                      className="w-full bg-zinc-950/60 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-zinc-600 outline-none focus:border-red-600"
                    />
                    <button
                      onClick={async () => {
                        const inputEl = document.getElementById('admin-alert-msg-input') as HTMLInputElement;
                        if (!inputEl || !inputEl.value.trim()) return;
                        try {
                          const res = await fetch(getApiUrl('/api/admin/broadcast-alert'), {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
                            body: JSON.stringify({ message: inputEl.value.trim(), token: authToken })
                          });
                          const data = await res.json();
                          if (res.ok && data.success) {
                            alert(lang === 'en' ? 'Alert broadcast sent to all online visitors!' : 'تم إرسال التنبيه العاجل بنجاح إلى جميع الشاشات المتصلة! ⚡');
                            inputEl.value = '';
                          } else {
                            alert(data.error || 'Failed to send alert');
                          }
                        } catch (e) {
                          alert('Error connecting to server');
                        }
                      }}
                      className="w-full py-2.5 bg-yellow-600 hover:bg-yellow-700 text-white font-bold rounded-xl text-xs transition cursor-pointer shadow-lg shadow-yellow-600/20"
                    >
                      {lang === 'en' ? 'Broadcast Alert to All Users' : 'إرسال التنبيه الفوري للجميع 📢'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Movie Promotion Broadcast Panel */}
              <div className="bg-zinc-900/30 border border-zinc-900/80 p-6 sm:p-8 rounded-3xl space-y-4 mt-8">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-900 pb-4">
                  <div className="space-y-1">
                    <h3 className="text-lg font-black text-zinc-100 flex items-center gap-2">
                      <span>📢</span>
                      <span>{lang === 'en' ? 'Telegram Movie Promotion Broadcast' : 'بث وترويج فيلم للمشتركين في البوت (Telegram Promotion)'}</span>
                    </h3>
                    <p className="text-xs text-zinc-500">
                      {lang === 'en'
                        ? 'Broadcast a movie recommendation or TMDB link to all Telegram subscribers at once.'
                        : 'إرسال رسالة ترويجية لفيلم محدد أو رابط TMDB لجميع المشتركين في بوت تليجرام دفعة واحدة.'}
                    </p>
                  </div>
                  <span className="text-xs font-mono font-bold bg-amber-600/10 border border-amber-500/20 text-amber-400 px-3 py-1 rounded-full">
                    Admin Broadcast Tool
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end pt-2">
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-xs font-bold text-zinc-300 block">
                      {lang === 'en' ? 'Movie Name or TMDB Link/Path:' : 'اسم الفيلم أو رابط/مسار TMDB (مثال: /movie/969681/spider-man-brand-new-day أو Spider-Man):'}
                    </label>
                    <input
                      type="text"
                      value={promoQuery}
                      onChange={(e) => setPromoQuery(e.target.value)}
                      placeholder="/movie/969681/spider-man-brand-new-day أو Spider-Man"
                      className="w-full bg-zinc-950 border border-zinc-800 focus:border-red-600 px-4 py-2.5 rounded-xl text-xs font-mono text-white outline-none"
                    />
                  </div>

                  <button
                    onClick={handleSendPromotion}
                    disabled={sendingPromo || !promoQuery.trim()}
                    className="w-full bg-red-600 hover:bg-red-700 disabled:bg-zinc-800 disabled:text-zinc-500 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-red-600/20"
                  >
                    {sendingPromo ? (
                      <span>{lang === 'en' ? 'Broadcasting...' : 'جاري إرسال الترويج...'}</span>
                    ) : (
                      <>
                        <span>📢</span>
                        <span>{lang === 'en' ? 'Send Promo to Subscribers' : 'إرسال الترويج للمشتركين'}</span>
                      </>
                    )}
                  </button>
                </div>

                {promoStatus && (
                  <div className={`p-3 rounded-xl border text-xs font-bold text-center mt-3 ${promoStatus.includes('📢') || promoStatus.includes('بنجاح') ? 'bg-green-600/10 border-green-500/20 text-green-400' : 'bg-red-600/10 border-red-500/20 text-red-400'}`}>
                    {promoStatus}
                  </div>
                )}
              </div>

              {/* Telegram Bot Alert Configuration Panel */}
              <div className="bg-zinc-900/30 border border-zinc-900/80 p-6 sm:p-8 rounded-3xl space-y-4 mt-8">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-900 pb-4">
                  <div className="space-y-1">
                    <h3 className="text-lg font-black text-zinc-100 flex items-center gap-2">
                      <span>🤖</span>
                      <span>{lang === 'en' ? 'Telegram Alert Bot Configuration' : 'إشعارات بوت تليجرام الفورية (Telegram Alerts)'}</span>
                    </h3>
                    <p className="text-xs text-zinc-500">
                      {lang === 'en'
                        ? 'Get instant alerts on Telegram whenever a new visitor joins your site or plays a movie.'
                        : 'استقبل إشعارات فورية على حسابك في تليجرام بمجرد دخول أي زائر جديد للموقع أو مشاهدته لفيلم.'}
                    </p>
                  </div>
                  <span className="text-xs font-mono font-bold bg-blue-600/10 border border-blue-500/20 text-blue-400 px-3 py-1 rounded-full">
                    Alert System Connected
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end pt-2">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-300 block">
                      {lang === 'en' ? 'Telegram Admin Chat ID (معرف الشات):' : 'معرف حسابك في تليجرام (Chat ID / Admin ID):'}
                    </label>
                    <input
                      type="text"
                      value={telegramChatId}
                      onChange={(e) => setTelegramChatId(e.target.value)}
                      placeholder="e.g. 6877720088"
                      className="w-full bg-zinc-950 border border-zinc-800 focus:border-red-600 px-4 py-2.5 rounded-xl text-xs font-mono text-white outline-none"
                    />
                    <p className="text-[10px] text-zinc-500">
                      {lang === 'en'
                        ? 'Send /start to your bot on Telegram first to enable notifications.'
                        : 'افتح البوت في تليجرام واضغط /start أولاً لتتمكن من استقبال الرسائل.'}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleSaveTelegram}
                      className="flex-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-colors cursor-pointer"
                    >
                      {lang === 'en' ? 'Save Chat ID' : 'حفظ معرف الشات'}
                    </button>
                    <button
                      onClick={handleTestTelegram}
                      disabled={testingTelegram}
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-colors cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-red-600/20"
                    >
                      {testingTelegram ? (
                        <span>{lang === 'en' ? 'Sending...' : 'جاري الإرسال...'}</span>
                      ) : (
                        <>
                          <span>🚀</span>
                          <span>{lang === 'en' ? 'Test Alert' : 'اختبار الإشعار'}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {telegramTestStatus && (
                  <div className={`p-3 rounded-xl border text-xs font-bold text-center mt-3 ${telegramTestStatus.includes('🚀') || telegramTestStatus.includes('بنجاح') ? 'bg-green-600/10 border-green-500/20 text-green-400' : 'bg-red-600/10 border-red-500/20 text-red-400'}`}>
                    {telegramTestStatus}
                  </div>
                )}
              </div>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
