import React, { useEffect } from 'react';
import { AlertTriangle, Download, ShieldCheck, Smartphone, Tv } from 'lucide-react';
import { BrandLogo } from './BrandLogo';

const downloadUrl = 'https://www.mediafire.com/file/0gmoe3hn7f7jh35/FLEXJO+(1).apk/file';

export const AppDownloadPage: React.FC = () => {
  useEffect(() => {
    document.title = 'تحميل تطبيق FLEXJO';

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
  }, []);

  return (
    <div className="flexjo-app-page min-h-screen bg-[#070b14] text-slate-100" dir="rtl">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-5 py-6 sm:px-8 lg:px-12">
        <header className="flex items-center justify-center">
          <BrandLogo size="md" clickable onClick={() => { window.location.href = '/'; }} />
        </header>

        <main className="flex flex-1 items-center justify-center py-16">
          <section className="relative w-full max-w-2xl overflow-hidden rounded-[2rem] border border-slate-700/70 bg-slate-900/70 p-7 text-center shadow-2xl shadow-black/30 backdrop-blur-xl sm:p-12">
            <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-blue-500/15 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-28 -left-20 h-64 w-64 rounded-full bg-amber-400/10 blur-3xl" />

            <div className="relative mx-auto mb-7 flex h-20 w-20 items-center justify-center rounded-3xl border border-amber-300/30 bg-gradient-to-br from-blue-500/30 to-amber-300/20 text-amber-300 shadow-lg shadow-blue-950/40">
              <Smartphone className="h-10 w-10" strokeWidth={1.7} />
            </div>

            <p className="relative mb-3 text-sm font-bold uppercase tracking-[0.28em] text-amber-300">FLEXJO MOBILE</p>
            <h1 className="relative text-3xl font-black leading-tight text-white sm:text-5xl">تطبيق FLEXJO بين يديك</h1>
            <p className="relative mx-auto mt-5 max-w-xl text-base leading-8 text-slate-300 sm:text-lg">
              حمّل تطبيق FLEXJO واستمتع بتجربة مشاهدة أسرع وأسهل على الهاتف أو شاشة التلفزيون.
            </p>

            <div className="relative mt-8 rounded-2xl border-2 border-amber-300/80 bg-amber-300/10 px-5 py-5 text-amber-50 shadow-lg shadow-amber-950/20 sm:px-7 sm:py-6">
              <div className="flex items-center justify-center gap-2 text-sm font-black text-amber-300 sm:text-base">
                <AlertTriangle className="h-5 w-5 shrink-0" />
                تنبيه مهم قبل فتح التطبيق
              </div>
              <p className="mt-2 text-sm leading-7 text-amber-50/85 sm:text-base">
                بعد تثبيت التطبيق، أدخل رمز الفتح التالي عندما يطلبه التطبيق:
              </p>
              <div className="mt-3 select-all text-4xl font-black tracking-[0.35em] text-white sm:text-5xl" dir="ltr">
                8080
              </div>
              <p className="mt-2 text-xs font-semibold text-amber-200/75">رمز التطبيق: 8080</p>
            </div>

            <div className="relative mt-7 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <a
                href={downloadUrl}
                rel="nofollow noopener"
                className="inline-flex min-h-14 items-center justify-center gap-3 rounded-2xl bg-amber-300 px-5 py-4 text-sm font-black text-slate-950 shadow-xl shadow-amber-400/10 transition hover:-translate-y-1 hover:bg-amber-200 focus:outline-none focus:ring-4 focus:ring-amber-300/30 sm:text-base"
              >
                <Smartphone className="h-5 w-5" />
                تحميل للهاتف Android
              </a>
              <a
                href={downloadUrl}
                rel="nofollow noopener"
                className="inline-flex min-h-14 items-center justify-center gap-3 rounded-2xl border border-blue-400/60 bg-blue-500/15 px-5 py-4 text-sm font-black text-blue-100 transition hover:-translate-y-1 hover:border-blue-300 hover:bg-blue-500/25 focus:outline-none focus:ring-4 focus:ring-blue-400/30 sm:text-base"
              >
                <Tv className="h-5 w-5" />
                تحميل لـ Android TV
              </a>
            </div>

            <div className="relative mt-6 flex items-center justify-center gap-2 text-xs text-slate-400">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              رابط التحميل الرسمي يفتح من MediaFire
            </div>
          </section>
        </main>

        <footer className="pb-2 text-center text-xs text-slate-500">
          FLEXJO VIP · صفحة تحميل التطبيق
        </footer>
      </div>
    </div>
  );
};
