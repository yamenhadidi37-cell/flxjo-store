import React, { useEffect, useState } from 'react';
import {
  ArrowDownToLine,
  ArrowLeft,
  BadgeCheck,
  Check,
  CircleAlert,
  Download,
  LoaderCircle,
  MonitorPlay,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Tv,
  Wifi,
} from 'lucide-react';
import { BrandLogo } from './BrandLogo';
import { subscribeAppUpdateConfig } from '../services/firebase';
import type { PlatformUpdateConfig } from '../services/firebase';

const downloaderCode = '5010497';

type AppMode = 'choose' | 'phone' | 'tv';
type AppUpdateStatus = 'connecting' | 'ready' | 'unavailable' | 'error';
type DeviceKey = 'mobile' | 'tv';

const modeFromPath = (): AppMode => {
  if (window.location.pathname === '/app/tv') return 'tv';
  if (window.location.pathname === '/app/mobile') return 'phone';
  return 'choose';
};

const initialStatuses: Record<DeviceKey, AppUpdateStatus> = {
  mobile: 'connecting',
  tv: 'connecting',
};

export const AppDownloadPage: React.FC = () => {
  const [mode, setMode] = useState<AppMode>(modeFromPath);
  const [updates, setUpdates] = useState<Record<DeviceKey, PlatformUpdateConfig>>({
    mobile: { downloadUrl: '', version: '', serverSynced: false, error: false },
    tv: { downloadUrl: '', version: '', serverSynced: false, error: false },
  });
  const [statuses, setStatuses] = useState(initialStatuses);

  useEffect(() => subscribeAppUpdateConfig(
    ({ mobile, tv }) => {
      setUpdates((current) => ({
        mobile: mobile.serverSynced ? mobile : current.mobile,
        tv: tv.serverSynced ? tv : current.tv,
      }));
      setStatuses((current) => ({
        mobile: mobile.serverSynced
          ? mobile.error ? 'error' : mobile.downloadUrl ? 'ready' : 'unavailable'
          : current.mobile,
        tv: tv.serverSynced
          ? tv.error ? 'error' : tv.downloadUrl ? 'ready' : 'unavailable'
          : current.tv,
      }));
    },
    (error) => {
      console.warn('[App update config] Could not read Firestore settings:', error);
      setUpdates({
        mobile: { downloadUrl: '', version: '', serverSynced: true, error: true },
        tv: { downloadUrl: '', version: '', serverSynced: true, error: true },
      });
      setStatuses({ mobile: 'error', tv: 'error' });
    },
  ), []);

  useEffect(() => {
    const updateModeFromPath = () => setMode(modeFromPath());
    window.addEventListener('popstate', updateModeFromPath);

    document.title = mode === 'tv'
      ? 'تحميل FLEXJO للتلفاز'
      : mode === 'phone'
        ? 'تحميل FLEXJO للهاتف'
        : 'تحميل تطبيق FLEXJO';

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
      window.removeEventListener('popstate', updateModeFromPath);
      robots?.remove();
      googlebot?.remove();
      document.title = 'FLEXJO – أفلام، مسلسلات وقنوات بث مباشر';
    };
  }, [mode]);

  const navigate = (nextMode: AppMode) => {
    setMode(nextMode);
    window.history.pushState({}, '', nextMode === 'tv' ? '/app/tv' : nextMode === 'phone' ? '/app/mobile' : '/app');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const DeviceCard = ({ device }: { device: DeviceKey }) => {
    const isTv = device === 'tv';
    const status = statuses[device];
    const update = updates[device];
    const accent = isTv
      ? {
          icon: 'border-cyan-300/20 bg-cyan-300/10 text-cyan-200',
          glow: 'from-cyan-400/15',
          badge: 'border-cyan-200/15 bg-cyan-200/[0.07] text-cyan-100',
          button: 'bg-cyan-200 text-slate-950 shadow-cyan-950/30 hover:bg-cyan-100',
          outline: 'border-cyan-200/20 bg-cyan-200/[0.06] text-cyan-100 hover:bg-cyan-200/10',
          dot: 'bg-cyan-300',
          label: 'ANDROID TV',
        }
      : {
          icon: 'border-amber-200/20 bg-amber-200/10 text-amber-200',
          glow: 'from-amber-300/15',
          badge: 'border-amber-200/15 bg-amber-200/[0.07] text-amber-100',
          button: 'bg-amber-200 text-slate-950 shadow-amber-950/30 hover:bg-amber-100',
          outline: 'border-amber-200/20 bg-amber-200/[0.06] text-amber-100 hover:bg-amber-200/10',
          dot: 'bg-amber-200',
          label: 'ANDROID MOBILE',
        };
    const DeviceIcon = isTv ? Tv : Smartphone;
    const statusText = status === 'connecting'
      ? 'نتحقق من توفر النسخة...'
      : status === 'error'
        ? 'تعذر الاتصال بالخادم'
        : status === 'ready'
          ? 'الرابط جاهز من قاعدة البيانات'
          : 'لا يوجد رابط لهذه النسخة حالياً';
    const downloadText = status === 'connecting'
      ? 'جارٍ الاتصال بالخادم'
      : status === 'error'
        ? 'تعذر الاتصال بالخادم'
        : status === 'ready'
          ? 'تحميل النسخة الآن'
          : 'التحميل غير متاح حالياً';
    const buttonClass = `inline-flex min-h-[58px] w-full items-center justify-center gap-3 rounded-2xl px-5 py-4 text-sm font-black transition duration-200 focus:outline-none focus:ring-4 focus:ring-white/10 sm:text-base ${
      status === 'ready'
        ? `${accent.button} shadow-xl hover:-translate-y-0.5`
        : 'cursor-not-allowed border border-white/[0.08] bg-white/[0.045] text-slate-500'
    }`;

    return (
      <article className="group relative isolate flex h-full flex-col overflow-hidden rounded-[1.75rem] border border-white/[0.09] bg-[#111a2a]/90 p-6 text-right shadow-[0_22px_80px_-45px_rgba(0,0,0,0.9)] backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:border-white/[0.15] sm:p-8">
        <div className={`pointer-events-none absolute inset-x-0 top-0 -z-10 h-48 bg-gradient-to-b ${accent.glow} to-transparent opacity-80`} />
        <div className="flex items-start justify-between gap-4">
          <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border ${accent.icon}`}>
            <DeviceIcon className="h-7 w-7" strokeWidth={1.8} />
          </div>
          <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[10px] font-black tracking-[0.16em] ${accent.badge}`} dir="ltr">
            <span className={`h-1.5 w-1.5 rounded-full ${accent.dot}`} />
            {accent.label}
          </span>
        </div>

        <div className="mt-6">
          <h2 className="text-2xl font-black tracking-tight text-white sm:text-[1.7rem]">
            {isTv ? 'نسخة الشاشات' : 'نسخة الهواتف'}
          </h2>
          <p className="mt-2 min-h-12 text-sm leading-7 text-slate-400">
            {isTv
              ? 'واجهة محسّنة للتحكم عن بُعد وتجربة مشاهدة واضحة على Android TV.'
              : 'تجربة FLEXJO كاملة بواجهة مصممة لتناسب هاتفك وتصفحك اليومي.'}
          </p>
        </div>

        <div className="mt-5 flex items-center justify-between rounded-xl border border-white/[0.06] bg-black/15 px-4 py-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
            <BadgeCheck className="h-4 w-4 text-emerald-300" />
            {update.version ? 'رقم الإصدار' : 'نسخة رسمية'}
          </div>
          <span className="text-sm font-black text-slate-100" dir="ltr">{update.version || 'FLEXJO'}</span>
        </div>

        <div className="mt-4 flex min-h-6 items-center gap-2 text-xs font-semibold text-slate-400" aria-live="polite">
          {status === 'connecting' ? <LoaderCircle className="h-4 w-4 animate-spin text-slate-300" /> : null}
          {status === 'ready' ? <Check className="h-4 w-4 text-emerald-300" /> : null}
          {status === 'error' || status === 'unavailable' ? <CircleAlert className="h-4 w-4 text-amber-300" /> : null}
          <span>{statusText}</span>
        </div>

        <div className="mt-5">
          {status === 'ready' && update.downloadUrl ? (
            <a href={update.downloadUrl} rel="nofollow noopener" className={buttonClass}>
              <ArrowDownToLine className="h-5 w-5" />
              {downloadText}
            </a>
          ) : (
            <button type="button" disabled aria-disabled="true" aria-busy={status === 'connecting'} className={buttonClass}>
              {status === 'connecting' ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <Download className="h-5 w-5" />}
              {downloadText}
            </button>
          )}
        </div>

        {isTv ? (
          <div className="mt-4 rounded-xl border border-cyan-200/10 bg-cyan-200/[0.045] px-4 py-3.5">
            <div className="flex items-center gap-2 text-xs font-bold text-cyan-100">
              <MonitorPlay className="h-4 w-4" />
              التثبيت عبر Downloader
            </div>
            <div className="mt-2 flex items-center justify-between gap-3">
              <span className="text-xs leading-6 text-slate-400">أدخل الكود في تطبيق Downloader</span>
              <span className="rounded-lg bg-black/25 px-3 py-1.5 font-mono text-lg font-black tracking-[0.18em] text-white" dir="ltr">{downloaderCode}</span>
            </div>
          </div>
        ) : (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-amber-200/10 bg-amber-200/[0.04] px-4 py-3.5 text-xs leading-6 text-slate-400">
            <Smartphone className="h-4 w-4 shrink-0 text-amber-200" />
            رابط مباشر لملف تثبيت Android APK.
          </div>
        )}

        <button
          type="button"
          onClick={() => navigate(isTv ? 'tv' : 'phone')}
          className={`mt-5 inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-xs font-bold transition ${accent.outline}`}
        >
          تفاصيل النسخة
          <ArrowLeft className="h-4 w-4" />
        </button>
      </article>
    );
  };

  const selectedDevice = mode === 'phone' ? 'mobile' : mode === 'tv' ? 'tv' : null;

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#080d17] text-slate-100" dir="rtl">
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -right-48 -top-48 h-[34rem] w-[34rem] rounded-full bg-blue-500/[0.12] blur-[120px]" />
        <div className="absolute -left-40 top-[32rem] h-[28rem] w-[28rem] rounded-full bg-amber-400/[0.08] blur-[110px]" />
        <div className="absolute inset-0 opacity-[0.12] [background-image:linear-gradient(rgba(255,255,255,.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.05)_1px,transparent_1px)] [background-size:64px_64px]" />
      </div>

      <div className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col px-5 pb-8 pt-5 sm:px-8 lg:px-12">
        <header className="flex items-center justify-between rounded-2xl border border-white/[0.07] bg-white/[0.025] px-4 py-3 backdrop-blur-xl sm:px-6">
          <BrandLogo size="md" clickable onClick={() => { window.location.href = '/'; }} />
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/10 bg-emerald-300/[0.055] px-3 py-2 text-[11px] font-bold text-emerald-100/80">
            <ShieldCheck className="h-4 w-4 text-emerald-300" />
            تنزيل رسمي وآمن
          </div>
        </header>

        <main className="flex-1">
          {selectedDevice ? (
            <section className="mx-auto max-w-3xl py-8 sm:py-12">
              <button type="button" onClick={() => navigate('choose')} className="mb-7 inline-flex items-center gap-2 text-sm font-bold text-slate-400 transition hover:text-white">
                <ArrowLeft className="h-4 w-4" />
                كل نسخ التطبيق
              </button>
              <div className="mb-7 text-center">
                <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] text-white shadow-xl shadow-black/20">
                  {selectedDevice === 'tv' ? <Tv className="h-8 w-8" /> : <Smartphone className="h-8 w-8" />}
                </div>
                <p className="text-xs font-black tracking-[0.28em] text-slate-400" dir="ltr">FLEXJO {selectedDevice === 'tv' ? 'TV' : 'MOBILE'}</p>
                <h1 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-5xl">حمّل نسختك بكل سهولة</h1>
                <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-slate-400 sm:text-base">
                  رابط الإصدار ورقمه خاصان بهذه النسخة، ويتم تحديثهما مباشرة من قاعدة البيانات.
                </p>
              </div>
              <DeviceCard device={selectedDevice} />
            </section>
          ) : (
            <>
              <section className="relative mx-auto max-w-5xl pb-7 pt-12 text-center sm:pb-10 sm:pt-16 lg:pt-20">
                <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.045] px-4 py-2 text-xs font-bold text-slate-300 shadow-lg shadow-black/10">
                  <Sparkles className="h-4 w-4 text-amber-200" />
                  عالمك الترفيهي — أينما كنت
                </div>
                <h1 className="mt-6 text-4xl font-black leading-[1.2] tracking-tight text-white sm:text-6xl lg:text-7xl">
                  اختر جهازك،<br className="sm:hidden" /> <span className="bg-gradient-to-l from-amber-100 via-white to-cyan-100 bg-clip-text text-transparent">واستمتع بـ FLEXJO</span>
                </h1>
                <p className="mx-auto mt-5 max-w-2xl text-sm leading-8 text-slate-400 sm:text-lg">
                  نسختان مصممتان بعناية للهاتف والشاشة الكبيرة. اختر جهازك وحمّل الإصدار المناسب له مباشرة.
                </p>
                <div className="mt-7 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-xs font-semibold text-slate-400">
                  <span className="inline-flex items-center gap-2"><Wifi className="h-4 w-4 text-emerald-300" />تحديث مباشر من قاعدة البيانات</span>
                  <span className="inline-flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-emerald-300" />روابط مستقلة لكل جهاز</span>
                </div>
              </section>

              <section className="mx-auto max-w-5xl pb-12" aria-label="اختر نسخة التطبيق">
                <div className="mb-5 flex items-end justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-black tracking-[0.2em] text-slate-500">اختر منصتك</p>
                    <h2 className="mt-1 text-xl font-black text-white sm:text-2xl">نسخة تناسب جهازك</h2>
                  </div>
                  <span className="hidden text-xs font-semibold text-slate-500 sm:block">لكل نسخة رابط ورقم إصدار منفصل</span>
                </div>
                <div className="grid gap-5 md:grid-cols-2 md:gap-6">
                  <DeviceCard device="mobile" />
                  <DeviceCard device="tv" />
                </div>
              </section>

              <section className="mx-auto mb-8 grid max-w-5xl gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5 sm:grid-cols-3 sm:p-6">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-300/10 text-emerald-200"><Check className="h-4 w-4" /></div>
                  <div><h3 className="text-sm font-black text-slate-200">روابط منفصلة</h3><p className="mt-1 text-xs leading-6 text-slate-500">تحديث الهاتف لا يغيّر رابط التلفاز.</p></div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-300/10 text-blue-200"><Wifi className="h-4 w-4" /></div>
                  <div><h3 className="text-sm font-black text-slate-200">معلومات محدثة</h3><p className="mt-1 text-xs leading-6 text-slate-500">الرابط ورقم الإصدار من Firestore مباشرة.</p></div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-200/10 text-amber-100"><ShieldCheck className="h-4 w-4" /></div>
                  <div><h3 className="text-sm font-black text-slate-200">تحقق قبل التحميل</h3><p className="mt-1 text-xs leading-6 text-slate-500">يبقى الزر معطلاً حتى يتوفر رابط صالح.</p></div>
                </div>
              </section>
            </>
          )}
        </main>

        <footer className="flex flex-col items-center justify-between gap-3 border-t border-white/[0.07] pt-5 text-center text-[11px] text-slate-600 sm:flex-row sm:text-right">
          <span>FLEXJO · صفحة تنزيل التطبيق الرسمية</span>
          <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5" />يتم جلب روابط التنزيل من قاعدة البيانات مباشرة</span>
        </footer>
      </div>
    </div>
  );
};
