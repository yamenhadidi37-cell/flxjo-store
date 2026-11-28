import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ShieldAlert } from 'lucide-react';

interface PreRollAdInterstitialProps {
  adMediaUrls: string[];
  playbackKey: string;
  skipAfterSeconds: number;
  onSkip: () => void;
}

const shuffleSources = (sources: string[]): string[] => {
  const shuffled = [...sources];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
  }
  return shuffled;
};

const getSourceType = (url: string): string => (
  url.split('?')[0].toLowerCase().endsWith('.webm') ? 'video/webm' : 'video/mp4'
);

export const PreRollAdInterstitial: React.FC<PreRollAdInterstitialProps> = ({
  adMediaUrls,
  playbackKey,
  skipAfterSeconds,
  onSkip,
}) => {
  const [secondsLeft, setSecondsLeft] = useState(skipAfterSeconds);
  const [videoFailed, setVideoFailed] = useState(false);
  const skipButtonRef = useRef<HTMLButtonElement>(null);
  const sourceOrder = useMemo(
    () => shuffleSources(adMediaUrls),
    [adMediaUrls, playbackKey],
  );

  useEffect(() => {
    const endsAt = Date.now() + Math.max(0, skipAfterSeconds) * 1000;
    const updateRemaining = () => {
      setSecondsLeft(Math.max(0, Math.ceil((endsAt - Date.now()) / 1000)));
    };

    updateRemaining();
    const timer = window.setInterval(updateRemaining, 250);
    return () => window.clearInterval(timer);
  }, [playbackKey, skipAfterSeconds]);

  useEffect(() => {
    if (secondsLeft === 0) skipButtonRef.current?.focus();
  }, [secondsLeft]);

  return (
    <section
      dir="rtl"
      aria-label="إعلان فيديو قبل التشغيل"
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
        {sourceOrder.length > 0 && !videoFailed ? (
          <video
            key={`${playbackKey}:${sourceOrder.join('|')}`}
            autoPlay
            muted
            controls
            playsInline
            preload="auto"
            onError={() => setVideoFailed(true)}
            onEnded={onSkip}
            aria-label="إعلان فيديو"
            className="h-full w-full bg-black object-contain"
          >
            {sourceOrder.map((source) => (
              <source key={source} src={source} type={getSourceType(source)} />
            ))}
            <p>هذا المتصفح لا يدعم تشغيل فيديو الإعلان.</p>
          </video>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center text-slate-200">
            <ShieldAlert className="h-8 w-8 text-amber-400" />
            <p className="text-sm">
              {videoFailed ? 'تعذر تشغيل مصدر الإعلان. سيبقى زر التخطي متاحاً بعد انتهاء العدّاد.' : 'مصادر الإعلان غير متوفرة حالياً.'}
            </p>
          </div>
        )}
      </div>

      <div className="border-t border-slate-800 bg-[#0c1222] px-4 py-3">
        <p className="text-xs leading-relaxed text-slate-400">
          نختار مصدراً عشوائياً في كل مرة، ويجرّب المشغل بقية الصيغ إذا تعذر تشغيل المصدر المختار.
        </p>
      </div>
    </section>
  );
};
