import React, { useEffect, useRef, useState } from 'react';
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
  const [downloadCountdown, setDownloadCountdown] = useState<{ device: DeviceKey; seconds: number } | null>(null);
  const updatesRef = useRef(updates);

  useEffect(() => {
    updatesRef.current = updates;
  }, [updates]);

  useEffect(() => {
    if (!downloadCountdown) return;

    if (downloadCountdown.seconds === 0) {
      const url = updatesRef.current[downloadCountdown.device].downloadUrl;
      setDownloadCountdown(null);
      if (url) window.location.assign(url);
      return;
    }

    const timeout = window.setTimeout(() => {
      setDownloadCountdown((current) => current?.device === downloadCountdown.device
        ? { ...current, seconds: current.seconds - 1 }
        : current);
    }, 1000);

    return () => window.clearTimeout(timeout);
  }, [downloadCountdown]);

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

  const startDownload = (device: DeviceKey) => {
    if (statuses[device] !== 'ready' || !updatesRef.current[device].downloadUrl || downloadCountdown) return;
    setDownloadCountdown({ device, seconds: 5 });
  };

  const DeviceCard = ({ device }: { device: DeviceKey }) => {
    const isTv = device === 'tv';
    const status = statuses[device];
    const update = updates[device];
    const accent = isTv
      ? {
          icon: 'border-yellow-200/25 bg-yellow-200/10 text-yellow-100',
          glow: 'from-yellow-300/12',
          badge: 'border-yellow-200/20 bg-yellow-200/[0.07] text-yellow-100',
          button: 'bg-yellow-300 text-[#08152b] shadow-yellow-950/30 hover:bg-yellow-200',
          outline: 'border-yellow-200/20 bg-yellow-200/[0.06] text-yellow-100 hover:bg-yellow-200/10',
          dot: 'bg-yellow-200',
          label: 'ANDROID TV',
        }
      : {
          icon: 'border-yellow-400/25 bg-yellow-300/10 text-yellow-300',
          glow: 'from-yellow-400/12',
          badge: 'border-yellow-300/20 bg-yellow-300/[0.07] text-yellow-100',
          button: 'bg-yellow-400 text-[#08152b] shadow-yellow-950/30 hover:bg-yellow-300',
          outline: 'border-yellow-300/20 bg-yellow-300/[0.06] text-yellow-100 hover:bg-yellow-300/10',
          dot: 'bg-yellow-300',
          label: 'ANDROID MOBILE',
        };
    const DeviceIcon = isTv ? Tv : Smartphone;
    const isCountingDown = downloadCountdown?.device === device;
    const isAnyCountdown = downloadCountdown !== null;
    const isReady = status === 'ready' && Boolean(update.downloadUrl);
    const statusText = status === 'connecting'
      ? 'جاري تجهيز الرابط'
      : status === 'error'
        ? 'تعذر تجهيز الرابط، حاول لاحقاً'
        : status === 'ready'
          ? 'الرابط جاهز للتنزيل'
          : 'لا يوجد رابط لهذه النسخة حالياً';
    const downloadText = isCountingDown
      ? `جاري تجهيز الرابط · ${downloadCountdown.seconds}`
      : isAnyCountdown
        ? 'انتظر لحظة...'
        : status === 'connecting'
          ? 'جاري تجهيز الرابط'
      : status === 'error'
        ? 'تعذر الاتصال بالخادم'
        : status === 'ready'
          ? 'تحميل النسخة الآن'
          : 'التحميل غير متاح حالياً';
    const buttonClass = `inline-flex min-h-[58px] w-full items-center justify-center gap-3 rounded-2xl px-5 py-4 text-sm font-black transition duration-200 focus:outline-none focus:ring-4 focus:ring-white/10 sm:text-base ${
      isReady && !isAnyCountdown
        ? `${accent.button} shadow-xl hover:-translate-y-0.5`
        : 'cursor-not-allowed border border-white/[0.08] bg-white/[0.045] text-slate-400'
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
            <BadgeCheck className="h-4 w-4 text-yellow-300" />
            {update.version ? 'رقم الإصدار' : 'نسخة رسمية'}
          </div>
          <span className="text-sm font-black text-slate-100" dir="ltr">{update.version || 'FLEXJO'}</span>
        </div>

        <div className="mt-4 flex min-h-6 items-center gap-2 text-xs font-semibold text-slate-400" aria-live="polite">
          {status === 'connecting' ? <LoaderCircle className="h-4 w-4 animate-spin text-slate-300" /> : null}
          {status === 'ready' ? <Check className="h-4 w-4 text-yellow-300" /> : null}
          {status === 'error' || status === 'unavailable' ? <CircleAlert className="h-4 w-4 text-yellow-500" /> : null}
          <span>{statusText}</span>
        </div>

        <div className="mt-5">
          <button
            type="button"
            onClick={() => startDownload(device)}
            disabled={!isReady || isAnyCountdown}
            aria-disabled={!isReady || isAnyCountdown}
            aria-busy={status === 'connecting' || isCountingDown}
            className={buttonClass}
          >
            {status === 'connecting' || isCountingDown
              ? <LoaderCircle className="h-5 w-5 animate-spin" />
              : isReady
                ? <ArrowDownToLine className="h-5 w-5" />
                : <Download className="h-5 w-5" />}
            {downloadText}
          </button>
        </div>

        {isTv ? (
          <div className="mt-4 rounded-xl border border-yellow-200/10 bg-yellow-200/[0.045] px-4 py-3.5">
            <div className="flex items-center gap-2 text-xs font-bold text-yellow-100">
              <MonitorPlay className="h-4 w-4" />
              التثبيت عبر Downloader
            </div>
            <div className="mt-2 flex items-center justify-between gap-3">
              <span className="text-xs leading-6 text-slate-400">أدخل الكود في تطبيق Downloader</span>
              <span className="rounded-lg bg-black/25 px-3 py-1.5 font-mono text-lg font-black tracking-[0.18em] text-white" dir="ltr">{downloaderCode}</span>
            </div>
          </div>
        ) : (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-yellow-200/10 bg-yellow-200/[0.04] px-4 py-3.5 text-xs leading-6 text-slate-400">
            <Smartphone className="h-4 w-4 shrink-0 text-yellow-200" />
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
        <div className="absolute -left-40 top-[32rem] h-[28rem] w-[28rem] rounded-full bg-yellow-400/[0.08] blur-[110px]" />
        <div className="absolute inset-0 opacity-[0.12] [background-image:linear-gradient(rgba(255,255,255,.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.05)_1px,transparent_1px)] [background-size:64px_64px]" />
      </div>

      <div className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col px-5 pb-8 pt-5 sm:px-8 lg:px-12">
        <header className="flex items-center justify-between rounded-2xl border border-white/[0.07] bg-white/[0.025] px-4 py-3 backdrop-blur-xl sm:px-6">
          <BrandLogo size="md" clickable onClick={() => { window.location.href = '/'; }} />
          <div className="inline-flex items-center gap-2 rounded-full border border-yellow-300/15 bg-yellow-300/[0.055] px-3 py-2 text-[11px] font-bold text-yellow-100/90">
            <ShieldCheck className="h-4 w-4 text-yellow-300" />
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
                  راجع رقم الإصدار ثم ابدأ تحميل النسخة المناسبة لجهازك.
                </p>
              </div>
              <DeviceCard device={selectedDevice} />
            </section>
          ) : (
            <>
              <section className="relative mx-auto max-w-5xl pb-7 pt-12 text-center sm:pb-10 sm:pt-16 lg:pt-20">
                <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.045] px-4 py-2 text-xs font-bold text-slate-300 shadow-lg shadow-black/10">
                  <Sparkles className="h-4 w-4 text-yellow-300" />
                  عالمك الترفيهي — أينما كنت
                </div>
                <h1 className="mt-6 text-4xl font-black leading-[1.2] tracking-tight text-white sm:text-6xl lg:text-7xl">
                  اختر جهازك،<br className="sm:hidden" /> <span className="bg-gradient-to-l from-yellow-200 via-white to-yellow-400 bg-clip-text text-transparent">واستمتع بـ FLEXJO</span>
                </h1>
                <p className="mx-auto mt-5 max-w-2xl text-sm leading-8 text-slate-400 sm:text-lg">
                  نسختان مصممتان بعناية للهاتف والشاشة الكبيرة. اختر جهازك وحمّل الإصدار المناسب له مباشرة.
                </p>
              </section>

              <section className="mx-auto max-w-5xl pb-12" aria-label="اختر نسخة التطبيق">
                <div className="mb-5 flex items-end justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-black tracking-[0.2em] text-slate-500">اختر منصتك</p>
                    <h2 className="mt-1 text-xl font-black text-white sm:text-2xl">نسخة تناسب جهازك</h2>
                  </div>
                </div>
                <div className="grid gap-5 md:grid-cols-2 md:gap-6">
                  <DeviceCard device="mobile" />
                  <DeviceCard device="tv" />
                </div>
              </section>

            </>
          )}
        </main>

        <footer className="flex flex-col items-center justify-between gap-3 border-t border-white/[0.07] pt-5 text-center text-[11px] text-slate-600 sm:flex-row sm:text-right">
          <span>FLEXJO · صفحة تنزيل التطبيق الرسمية</span>
        </footer>
      </div>
    </div>
  );
};
