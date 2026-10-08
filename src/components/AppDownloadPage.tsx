import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Download, ShieldCheck, Smartphone, Tv } from 'lucide-react';
import { BrandLogo } from './BrandLogo';

const downloadUrl = 'https://www.mediafire.com/file/0gmoe3hn7f7jh35/FLEXJO+(1).apk/file';
const appCode = '8080';
const downloaderCode = '5010497';

type AppMode = 'choose' | 'phone' | 'tv';

const modeFromPath = (): AppMode => {
  if (window.location.pathname === '/app/tv') return 'tv';
  if (window.location.pathname === '/app/mobile') return 'phone';
  return 'choose';
};

export const AppDownloadPage: React.FC = () => {
  const [mode, setMode] = useState<AppMode>(modeFromPath);

  useEffect(() => {
    document.title = mode === 'tv' ? 'تحميل FLEXJO للتلفاز' : mode === 'phone' ? 'تحميل FLEXJO للهاتف' : 'تحميل تطبيق FLEXJO';

    let robots = document.querySelector('meta[name="robots"]');
    if (!robots) {
      robots = document.createElement('meta');
      robots.setAttribute('name', 'robots');
      document.head.appendChild(robots);
    }
    robots.setAttribute('content', 'noindex, nofollow, noarchive, nosnippet');

    let googlebot = document.querySelector('meta[name="googlebot"]');
    if (!googlebot) {
      googlebot = document.createElement('meta');
      googlebot.setAttribute('name', 'googlebot');
      document.head.appendChild(googlebot);
    }
    googlebot.setAttribute('content', 'noindex, nofollow, noarchive, nosnippet');

    return () => {
      robots?.remove();
      googlebot?.remove();
      document.title = 'FLEXJO VIP – أفلام، مسلسلات وقنوات بث مباشر';
    };
  }, [mode]);

  const chooseMode = (nextMode: Exclude<AppMode, 'choose'>) => {
    setMode(nextMode);
    window.history.pushState({}, '', nextMode === 'tv' ? '/app/tv' : '/app/mobile');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const DownloadButton = ({ tv = false }: { tv?: boolean }) => (
    <a
      href={downloadUrl}
      rel="nofollow noopener"
      className={`inline-flex min-h-14 w-full items-center justify-center gap-3 rounded-2xl px-5 py-4 text-sm font-black transition hover:-translate-y-1 focus:outline-none focus:ring-4 sm:text-base ${
        tv
          ? 'border border-blue-400/60 bg-blue-500/15 text-blue-100 hover:border-blue-300 hover:bg-blue-500/25 focus:ring-blue-400/30'
          : 'bg-amber-300 text-slate-950 shadow-xl shadow-amber-400/10 hover:bg-amber-200 focus:ring-amber-300/30'
      }`}
    >
      <Download className="h-5 w-5" />
      تحميل تطبيق FLEXJO
    </a>
  );

  const CodeNotice = ({ tv = false }: { tv?: boolean }) => (
    <div className="relative mt-7 space-y-4">
      <div className="rounded-2xl border-2 border-amber-300/80 bg-amber-300/10 px-5 py-5 text-amber-50 shadow-lg shadow-amber-950/20 sm:px-7 sm:py-6">
        <div className="flex items-center justify-center gap-2 text-sm font-black text-amber-300 sm:text-base">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          تنبيه مهم قبل فتح التطبيق
        </div>
        <p className="mt-2 text-sm leading-7 text-amber-50/85 sm:text-base">
          بعد تثبيت التطبيق، أدخل رمز الفتح التالي عندما يطلبه التطبيق:
        </p>
        <div className="mt-3 select-all text-4xl font-black tracking-[0.35em] text-white sm:text-5xl" dir="ltr">{appCode}</div>
        <p className="mt-2 text-xs font-semibold text-amber-200/75">رمز التطبيق: {appCode}</p>
      </div>

      {tv && (
        <div className="rounded-2xl border border-blue-400/60 bg-blue-500/10 px-5 py-5 text-blue-50 sm:px-7 sm:py-6">
          <div className="flex items-center justify-center gap-2 text-sm font-black text-blue-200 sm:text-base">
            <Tv className="h-5 w-5 shrink-0" />
            كود Downloader للتلفاز
          </div>
          <p className="mt-2 text-sm leading-7 text-blue-100/80 sm:text-base">
            افتح تطبيق Downloader على Android TV وأدخل الكود التالي:
          </p>
          <div className="mt-3 select-all text-4xl font-black tracking-[0.2em] text-white sm:text-5xl" dir="ltr">{downloaderCode}</div>
          <p className="mt-2 text-xs font-semibold text-blue-200/75">Downloader Code: {downloaderCode}</p>
        </div>
      )}
    </div>
  );

  const content = mode === 'choose' ? (
    <>
      <div className="relative mx-auto mb-7 flex h-20 w-20 items-center justify-center rounded-3xl border border-amber-300/30 bg-gradient-to-br from-blue-500/30 to-amber-300/20 text-amber-300 shadow-lg shadow-blue-950/40">
        <Download className="h-10 w-10" strokeWidth={1.7} />
      </div>
      <p className="relative mb-3 text-sm font-bold uppercase tracking-[0.28em] text-amber-300">FLEXJO APP</p>
      <h1 className="relative text-3xl font-black leading-tight text-white sm:text-5xl">اختر جهازك للتحميل</h1>
      <p className="relative mx-auto mt-5 max-w-xl text-base leading-8 text-slate-300 sm:text-lg">
        اختر النسخة المناسبة لجهازك لعرض تعليمات التحميل والرموز الخاصة بها.
      </p>
      <div className="relative mt-9 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <button onClick={() => chooseMode('phone')} className="group inline-flex min-h-28 flex-col items-center justify-center gap-2 rounded-2xl bg-amber-300 px-5 py-5 text-slate-950 transition hover:-translate-y-1 hover:bg-amber-200 focus:outline-none focus:ring-4 focus:ring-amber-300/30">
          <Smartphone className="h-8 w-8" />
          <span className="text-base font-black">تطبيق الهاتف</span>
          <span className="text-xs font-semibold opacity-75">Android Mobile</span>
        </button>
        <button onClick={() => chooseMode('tv')} className="group inline-flex min-h-28 flex-col items-center justify-center gap-2 rounded-2xl border border-blue-400/60 bg-blue-500/15 px-5 py-5 text-blue-100 transition hover:-translate-y-1 hover:border-blue-300 hover:bg-blue-500/25 focus:outline-none focus:ring-4 focus:ring-blue-400/30">
          <Tv className="h-8 w-8" />
          <span className="text-base font-black">تطبيق التلفاز</span>
          <span className="text-xs font-semibold text-blue-200/75">Android TV + Downloader</span>
        </button>
      </div>
    </>
  ) : (
    <>
      <div className={`relative mx-auto mb-7 flex h-20 w-20 items-center justify-center rounded-3xl border shadow-lg shadow-blue-950/40 ${mode === 'tv' ? 'border-blue-300/40 bg-blue-500/20 text-blue-200' : 'border-amber-300/30 bg-amber-300/10 text-amber-300'}`}>
        {mode === 'tv' ? <Tv className="h-10 w-10" strokeWidth={1.7} /> : <Smartphone className="h-10 w-10" strokeWidth={1.7} />}
      </div>
      <p className="relative mb-3 text-sm font-bold uppercase tracking-[0.28em] text-amber-300">{mode === 'tv' ? 'FLEXJO TV' : 'FLEXJO MOBILE'}</p>
      <h1 className="relative text-3xl font-black leading-tight text-white sm:text-5xl">تحميل تطبيق FLEXJO</h1>
      <p className="relative mx-auto mt-5 max-w-xl text-base leading-8 text-slate-300 sm:text-lg">
        {mode === 'tv' ? 'نسخة FLEXJO المخصصة لشاشات Android TV.' : 'نسخة FLEXJO المخصصة لهواتف Android.'}
      </p>
      <div className="relative mt-8"><DownloadButton tv={mode === 'tv'} /></div>
      <CodeNotice tv={mode === 'tv'} />
      <button onClick={() => { setMode('choose'); window.history.pushState({}, '', '/app'); }} className="relative mt-6 text-sm font-bold text-slate-400 transition hover:text-amber-300">
        اختيار جهاز آخر
      </button>
    </>
  );

  return (
    <div className="flexjo-app-page min-h-screen bg-[#070b14] text-slate-100" dir="rtl">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-5 py-6 sm:px-8 lg:px-12">
        <header className="flex items-center justify-center"><BrandLogo size="md" clickable onClick={() => { window.location.href = '/'; }} /></header>
        <main className="flex flex-1 items-center justify-center py-12 sm:py-16">
          <section className="relative w-full max-w-2xl overflow-hidden rounded-[2rem] border border-slate-700/70 bg-slate-900/70 p-7 text-center shadow-2xl shadow-black/30 backdrop-blur-xl sm:p-12">
            <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-blue-500/15 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-28 -left-20 h-64 w-64 rounded-full bg-amber-400/10 blur-3xl" />
            {content}
            {mode !== 'choose' && <div className="relative mt-6 flex items-center justify-center gap-2 text-xs text-slate-400"><ShieldCheck className="h-4 w-4 text-emerald-400" />رابط التحميل الرسمي يفتح من MediaFire</div>}
          </section>
        </main>
        <footer className="pb-2 text-center text-xs text-slate-500">FLEXJO VIP · صفحة تحميل التطبيق</footer>
      </div>
    </div>
  );
};
