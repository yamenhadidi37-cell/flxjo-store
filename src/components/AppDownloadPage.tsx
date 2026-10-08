import React, { useEffect } from 'react';
import { ArrowRight, Download, ShieldCheck, Smartphone } from 'lucide-react';
import { BrandLogo } from './BrandLogo';

const downloadUrl = 'https://www.mediafire.com/file/pd4t0sxuk3w3gvu/FLEXJO+(6)+(1).apk/file';

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
        <header className="flex items-center justify-between">
          <BrandLogo size="md" clickable onClick={() => { window.location.href = '/'; }} />
          <a
            href="/"
            className="group inline-flex items-center gap-2 rounded-full border border-slate-700/80 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:border-amber-400/60 hover:text-amber-300"
          >
            العودة للموقع
            <ArrowRight className="h-4 w-4 transition group-hover:-translate-x-1" />
          </a>
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
              حمّل تطبيق FLEXJO لأندرويد واستمتع بتجربة مشاهدة أسرع وأسهل من هاتفك.
            </p>

            <a
              href={downloadUrl}
              rel="nofollow noopener"
              className="relative mx-auto mt-9 inline-flex min-h-14 w-full max-w-sm items-center justify-center gap-3 rounded-2xl bg-amber-300 px-7 py-4 text-base font-black text-slate-950 shadow-xl shadow-amber-400/10 transition hover:-translate-y-1 hover:bg-amber-200 focus:outline-none focus:ring-4 focus:ring-amber-300/30"
            >
              <Download className="h-5 w-5" />
              تحميل التطبيق
            </a>

            <div className="relative mt-7 flex items-center justify-center gap-2 text-xs text-slate-400">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              رابط التحميل يفتح من MediaFire
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
