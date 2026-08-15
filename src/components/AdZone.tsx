import React, { useEffect, useRef, useState } from 'react';

interface AdZoneProps {
  slot?: string; // Optional custom AdSense slot ID
  type?: 'banner' | 'rectangle' | 'inline'; // Layout style
  className?: string; // Additional classes
  lang?: 'ar' | 'en'; // Active language
}

export default function AdZone({ 
  slot = '8829152634', // Default placeholder slot ID
  type = 'banner', 
  className = '', 
  lang = 'ar' 
}: AdZoneProps) {
  const adRef = useRef<HTMLModElement>(null);
  const [adBlockedOrFailed, setAdBlockedOrFailed] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Prevent rendering in headless or test environments if adsbygoogle is not loaded
    let timer: NodeJS.Timeout;
    try {
      if (typeof window !== 'undefined') {
        // Initialize AdSense unit
        ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
        setIsLoaded(true);
      }
    } catch (err) {
      console.warn('Google AdSense block or load deferral detected:', err);
      setAdBlockedOrFailed(true);
    }

    // Double check if ad elements were collapsed or blocked by extensions
    timer = setTimeout(() => {
      if (adRef.current && adRef.current.offsetHeight === 0) {
        setAdBlockedOrFailed(true);
      }
    }, 1500);

    return () => {
      clearTimeout(timer);
    };
  }, [slot]);

  // Styling based on ad types
  const getAdContainerStyles = () => {
    switch (type) {
      case 'rectangle':
        return 'w-full max-w-md min-h-[250px] sm:min-h-[280px] rounded-3xl';
      case 'inline':
        return 'w-full max-w-4xl min-h-[90px] sm:min-h-[110px] rounded-2xl';
      case 'banner':
      default:
        return 'w-full max-w-6xl min-h-[90px] sm:min-h-[120px] rounded-3xl';
    }
  };

  const isAr = lang === 'ar';

  return (
    <div className={`mx-auto w-full flex flex-col items-center justify-center transition-all duration-300 ${className}`}>
      {/* Real Google AdSense Unit */}
      <div className={`w-full overflow-hidden flex items-center justify-center relative bg-zinc-950 border border-zinc-900/65 shadow-inner p-1 ${getAdContainerStyles()}`}>
        {/* AdSense HTML Element */}
        <ins
          ref={adRef}
          className="adsbygoogle"
          style={{ display: 'block', width: '100%', height: '100%', minWidth: '250px' }}
          data-ad-client="ca-pub-5959089517203412"
          data-ad-slot={slot}
          data-ad-format="auto"
          data-full-width-responsive="true"
        />

        {/* Cinematic Branded Fallback / Placeholder when ad is blocked, in dev, or loading */}
        {(!isLoaded || adBlockedOrFailed) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-zinc-900/40 via-zinc-950 to-zinc-900/30 p-4 text-center select-none">
            <div className="absolute top-2.5 start-3 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />
              <span className="text-[9px] font-mono tracking-wider text-zinc-500 uppercase">
                {isAr ? 'مساحة إعلانية' : 'ADVERTISEMENT'}
              </span>
            </div>
            
            <div className="absolute bottom-2.5 end-3 text-[8px] font-mono font-bold bg-zinc-900/60 border border-zinc-800 text-zinc-500 px-2 py-0.5 rounded-md">
              ca-pub-5959089517203412
            </div>

            <div className="space-y-1.5 max-w-md">
              <div className="flex justify-center text-zinc-600 text-xl mb-1.5">
                🎬
              </div>
              <p className="text-[11px] sm:text-xs font-black text-zinc-400">
                {isAr ? 'مكان إعلان متوافق مع جوجل أدسنس' : 'Non-Intrusive Google AdSense Spot'}
              </p>
              <p className="text-[9px] sm:text-[10px] text-zinc-500 leading-relaxed">
                {isAr 
                  ? 'هذا الإعلان مُنسق ومحمي تلقائياً. سيظهر الإعلان الحقيقي هنا عند تنشيط حساب أدسنس بالكامل.' 
                  : 'This slot is connected to your publisher ID. Live banners will serve here automatically once verified.'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
