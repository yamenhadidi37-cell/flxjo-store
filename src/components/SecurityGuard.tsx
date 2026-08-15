import React, { useState, useEffect } from 'react';
import { ShieldAlert, ExternalLink } from 'lucide-react';

interface SecurityGuardProps {
  children: React.ReactNode;
  lang: 'ar' | 'en';
}

export default function SecurityGuard({ children, lang }: SecurityGuardProps) {
  const [isUnauthorizedFrame, setIsUnauthorizedFrame] = useState(false);

  useEffect(() => {
    try {
      // 1. Check if we are inside an iframe
      const isFramed = window.self !== window.top;
      if (!isFramed) {
        return;
      }

      // 2. Check document.referrer (the parent page URL)
      const referrerUrl = document.referrer;
      if (referrerUrl) {
        try {
          const referrer = new URL(referrerUrl);
          const hostname = referrer.hostname.toLowerCase();
          
          // List of trusted hostnames/domains
          const isTrusted = 
            hostname === 'localhost' ||
            hostname === '127.0.0.1' ||
            hostname.endsWith('.google.com') ||
            hostname.endsWith('.googleusercontent.com') ||
            hostname.endsWith('.run.app') ||
            hostname.endsWith('.netlify.app') ||
            hostname.endsWith('.vercel.app') ||
            hostname.endsWith('.github.io') ||
            hostname === 'flxjo.com' ||
            hostname.endsWith('.flxjo.com') ||
            hostname === window.location.hostname; // Framed by itself (same domain)

          if (!isTrusted) {
            setIsUnauthorizedFrame(true);
          }
        } catch (e) {
          // If URL parsing fails, fall back to same-origin checks
          checkFallbackFraming();
        }
      } else {
        checkFallbackFraming();
      }
    } catch (err) {
      console.error('Frame Guard Error:', err);
    }

    function checkFallbackFraming() {
      // If framed but referrer is empty, it could be a hidden/spoofed referer on an unauthorized site
      // Let's check if we can access the parent window's location. If we CAN, it means we are same-origin.
      // If we CANNOT, it throws an error (cross-origin), meaning we are framed by a third party.
      try {
        const parentHost = window.parent.location.hostname;
        if (parentHost !== window.location.hostname) {
          setIsUnauthorizedFrame(true);
        }
      } catch (e) {
        // Access blocked by browser policy (meaning it is cross-origin framing!)
        setIsUnauthorizedFrame(true);
      }
    }
  }, []);

  const handleBreakout = () => {
    // Attempt top-level breakout
    try {
      if (window.top) {
        window.top.location.href = window.location.href;
      }
    } catch (e) {
      // Fallback: Open in new tab
      window.open(window.location.href, '_blank', 'noopener,noreferrer');
    }
  };

  if (isUnauthorizedFrame) {
    return (
      <div className="fixed inset-0 z-[999999] bg-[#020202] flex items-center justify-center p-6 text-white text-center select-none" dir={lang === 'en' ? 'ltr' : 'rtl'}>
        <div className="max-w-md w-full bg-zinc-900 border border-red-500/30 p-8 rounded-[2rem] shadow-2xl space-y-6">
          <div className="flex justify-center">
            <div className="p-4 bg-red-600/10 text-red-500 rounded-full border border-red-500/20 animate-bounce">
              <ShieldAlert className="w-12 h-12" />
            </div>
          </div>

          <div className="space-y-3">
            <h1 className="text-xl font-black text-red-500">
              {lang === 'en' ? 'Playback Blocked: Unauthorized Embedding' : 'تنبيه أمان: تم حظر التشغيل غير المصرح به'}
            </h1>
            <p className="text-xs text-zinc-300 leading-relaxed">
              {lang === 'en' 
                ? 'This website is illegally embedding FLXJO players and stealing streaming services without permission.' 
                : 'هذا الموقع يقوم بسرقة مشغل وتصميم موقع فلكس جو وعرضه بشكل غير قانوني.'}
            </p>
            <p className="text-xs text-zinc-400 leading-relaxed">
              {lang === 'en'
                ? 'To enjoy high-speed, ad-free streaming and premium multi-servers, please visit our official website.'
                : 'للاستمتاع بمشاهدة سريعة ومستقرة وبدون إعلانات منبثقة مزعجة، يرجى الانتقال إلى موقعنا الرسمي مباشرة.'}
            </p>
          </div>

          <div className="pt-2">
            <button
              onClick={handleBreakout}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-xl text-xs transition cursor-pointer shadow-lg shadow-red-950/30 flex items-center justify-center gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              <span>{lang === 'en' ? 'Go to Official Website' : 'الانتقال إلى الموقع الرسمي (فلكس جو)'}</span>
            </button>
          </div>

          <div className="text-[10px] text-zinc-500 font-mono">
            FLXJO SECURE SHIELD v2.4
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
