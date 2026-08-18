import { useEffect, useState } from 'react';
import { getCookieConsent, setCookieConsent, saveUserCookiePreferences, CookieConsent as ConsentState } from '../lib/cookieManager';

interface CookieConsentProps {
  lang: 'ar' | 'en';
  open?: boolean;
  onChange?: (consent: Exclude<ConsentState, 'unset'>) => void;
}

export default function CookieConsent({ lang, open = false, onChange }: CookieConsentProps) {
  const [consent, setConsent] = useState<ConsentState>('unset');

  useEffect(() => {
    setConsent(open ? 'unset' : getCookieConsent());
  }, [open]);

  if (consent !== 'unset') return null;

  const choose = (value: Exclude<ConsentState, 'unset'>) => {
    setCookieConsent(value);
    if (value === 'accepted') {
      saveUserCookiePreferences({ consentGiven: true });
    }
    setConsent(value);
    onChange?.(value);
  };

  return (
    <div
      dir={lang === 'ar' ? 'rtl' : 'ltr'}
      className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:max-w-md z-[70] rounded-2xl border border-zinc-700 bg-zinc-950/95 p-5 text-white shadow-2xl backdrop-blur-xl"
      role="dialog"
      aria-labelledby="cookie-consent-title"
    >
      <h2 id="cookie-consent-title" className="text-sm font-black text-white">
        {lang === 'ar' ? 'الخصوصية وملفات تعريف الارتباط' : 'Privacy and cookies'}
      </h2>
      <p className="mt-2 text-xs leading-6 text-zinc-300">
        {lang === 'ar'
          ? 'نستخدم ملفات اختيارية لحفظ عمليات البحث داخل FlxJo وتخصيص الاقتراحات. بعد موافقتك فقط، بنسجل البحث داخل الموقع ومصدر الدخول مثل Google إذا كان المتصفح أرسله، وبنظهره في لوحة الإدارة المرتبط بمعرّف تقني عشوائي. ما بنقرأ سجل المتصفح العام، وكثير من محركات البحث لا ترسل كلمة Google نفسها. ما بنستخدم الكاميرا ولا بنجمع صور أو كلمات سر، وتقدر ترفض ويظل الموقع شغال طبيعي.'
          : 'We use optional storage to remember searches inside FlxJo and personalize recommendations. Only after you accept, we record on-site searches and the entry source, such as Google when the browser provides it, in the admin dashboard under a random technical ID. We do not read your general browser history, and search engines often hide the exact Google keyword. We never use the camera or collect photos or passwords, and you can decline while using the site normally.'}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => choose('accepted')}
          className="rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-red-500"
        >
          {lang === 'ar' ? 'موافقة' : 'Accept'}
        </button>
        <button
          type="button"
          onClick={() => choose('declined')}
          className="rounded-xl border border-zinc-700 px-4 py-2 text-xs font-bold text-zinc-200 transition hover:border-zinc-500"
        >
          {lang === 'ar' ? 'لا، شكراً' : 'Decline'}
        </button>
      </div>
    </div>
  );
}
