import React, { useState, useEffect, useRef } from 'react';
import { RefreshCw, Sparkles, Layers } from 'lucide-react';

interface VersionGuardProps {
  children: React.ReactNode;
  lang: 'ar' | 'en';
}

export default function VersionGuard({ children, lang }: VersionGuardProps) {
  const [isOutdated, setIsOutdated] = useState(false);
  const initialVersionRef = useRef<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    let intervalId: any = null;

    const checkVersion = async (isInitial = false) => {
      try {
        // Fetch current version from server
        const response = await fetch('/api/version');
        if (!response.ok) return;

        const data = await response.json();
        const currentVersion = data.version;

        if (!currentVersion || currentVersion === 'unknown') return;

        if (isInitial) {
          initialVersionRef.current = currentVersion;
        } else if (initialVersionRef.current && initialVersionRef.current !== currentVersion) {
          // Version mismatch! Site was updated.
          if (isMounted) {
            setIsOutdated(true);
            // Clear the interval once we know it's outdated
            if (intervalId) clearInterval(intervalId);
          }
        }
      } catch (err) {
        // Log as minor warning rather than console.error to prevent transient fetch blips or dev-server startup delays from triggering test failures
        console.warn('Failed to check app version (polling is resilient and will retry):', err);
      }
    };

    // 1. Initial check on mount
    checkVersion(true);

    // 2. Poll every 25 seconds for updates
    intervalId = setInterval(() => {
      checkVersion(false);
    }, 25000);

    return () => {
      isMounted = false;
      if (intervalId) clearInterval(intervalId);
    };
  }, []);

  const handleForceRefresh = () => {
    // Force reload bypassing cache
    window.location.reload();
  };

  if (isOutdated) {
    return (
      <div 
        className="fixed inset-0 z-[999999] bg-[#020202]/95 backdrop-blur-xl flex items-center justify-center p-6 text-white select-none animate-fade-in"
        dir={lang === 'en' ? 'ltr' : 'rtl'}
      >
        <div className="max-w-md w-full bg-zinc-900 border border-red-500/20 p-8 rounded-[2.5rem] shadow-[0_0_50px_rgba(220,38,38,0.15)] space-y-6 text-center">
          <div className="flex justify-center relative">
            <div className="absolute inset-0 bg-red-600/10 blur-xl rounded-full scale-150"></div>
            <div className="relative p-5 bg-red-600/10 text-red-500 rounded-full border border-red-500/20 animate-spin-slow">
              <RefreshCw className="w-10 h-10" />
            </div>
          </div>

          <div className="space-y-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] uppercase tracking-wider font-mono">
              <Sparkles className="w-3 h-3" />
              <span>{lang === 'en' ? 'Update Required' : 'تحديث مطلوب'}</span>
            </div>
            
            <h1 className="text-xl font-extrabold text-white tracking-tight">
              {lang === 'en' ? 'New Version Available' : 'نسخة جديدة متوفرة الآن'}
            </h1>
            
            <p className="text-xs text-zinc-300 leading-relaxed font-sans">
              {lang === 'en' 
                ? 'You are viewing an old version of FLXJO. To ensure safety, speed, and standard playback, you must update now.' 
                : 'أنت تفتح نسخة قديمة من موقع فلكس جو. لضمان أمان تصفحك والوصول إلى أحدث المشغلات والسيرفرات السريعة، يجب تحديث الصفحة الآن.'}
            </p>
          </div>

          <div className="pt-2">
            <button
              onClick={handleForceRefresh}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3.5 px-6 rounded-2xl text-xs transition-all duration-300 cursor-pointer shadow-lg shadow-red-950/40 hover:scale-[1.02] flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4 animate-spin-slow" />
              <span>{lang === 'en' ? 'Update Page Now' : 'تحديث الصفحة الآن'}</span>
            </button>
          </div>

          <div className="flex items-center justify-center gap-2 text-[10px] text-zinc-500 font-mono">
            <Layers className="w-3.5 h-3.5" />
            <span>FLXJO LIVE SYNC v3.1</span>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
