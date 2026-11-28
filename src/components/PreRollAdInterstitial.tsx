import React, { useEffect, useRef, useState } from 'react';
import { ExternalLink, ShieldAlert } from 'lucide-react';

interface PreRollAdInterstitialProps {
  adUrl: string;
  skipAfterSeconds: number;
  onSkip: () => void;
}

export const PreRollAdInterstitial: React.FC<PreRollAdInterstitialProps> = ({
  adUrl,
  skipAfterSeconds,
  onSkip,
}) => {
  const [secondsLeft, setSecondsLeft] = useState(skipAfterSeconds);
  const skipButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const endsAt = Date.now() + Math.max(0, skipAfterSeconds) * 1000;
    const updateRemaining = () => {
      setSecondsLeft(Math.max(0, Math.ceil((endsAt - Date.now()) / 1000)));
    };

    updateRemaining();
    const timer = window.setInterval(updateRemaining, 250);
    return () => window.clearInterval(timer);
  }, [adUrl, skipAfterSeconds]);

  useEffect(() => {
    if (secondsLeft === 0) skipButtonRef.current?.focus();
  }, [secondsLeft]);

  return (
    <section
      dir="rtl"
      aria-label="إعلان قبل التشغيل"
      className="overflow-hidden rounded-2xl border border-amber-400/30 bg-[#070b14] shadow-2xl"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 bg-[#0c1222] px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="rounded-md bg-amber-400 px-2 py-1 text-[11px] font-black text-slate-950">إعلان</span>
          <p className="text-sm font-semibold text-slate-200" aria-live="polite">
            {secondsLeft > 0 ? `يمكنك تخطي الإعلان بعد ${secondsLeft} ثوانٍ` : 'أصبح بإمكانك تخطي الإعلان'}
          </p>
        </div>
        <button
          ref={skipButtonRef}
          type="button"
          disabled={secondsLeft > 0}
          onClick={onSkip}
          className="min-h-11 rounded-xl bg-amber-400 px-4 py-2 text-sm font-black text-slate-950 transition-colors hover:bg-amber-300 focus:outline-none focus:ring-2 focus:ring-white disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-300"
        >
          {secondsLeft > 0 ? `تخطي بعد ${secondsLeft}` : 'تخطي الإعلان وتشغيل المحتوى'}
        </button>
      </div>

      <div className="relative aspect-video w-full bg-black">
        {adUrl ? (
          <iframe
            src={adUrl}
            title="صفحة الإعلان"
            sandbox="allow-scripts allow-forms"
            loading="eager"
            tabIndex={-1}
            className="pointer-events-none h-full w-full border-0 bg-black"
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center text-slate-200">
            <ShieldAlert className="h-8 w-8 text-amber-400" />
            <p className="text-sm">رابط الإعلان غير متوفر حالياً.</p>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 bg-[#0c1222] px-4 py-3">
        <p className="max-w-2xl text-xs leading-relaxed text-slate-400">
          إذا لم تظهر صفحة الإعلان داخل الإطار، افتحها من الرابط التالي. لن يبدأ تشغيل المحتوى قبل تخطي الإعلان.
        </p>
        {adUrl && (
          <a
            href={adUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-700 px-4 py-2 text-sm font-bold text-slate-100 transition-colors hover:border-amber-400 hover:text-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-400"
          >
            <ExternalLink className="h-4 w-4" />
            فتح الإعلان في تبويب جديد
          </a>
        )}
      </div>
    </section>
  );
};
