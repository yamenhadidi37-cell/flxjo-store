export interface BlockedMedia {
  id: number;
  reasonAr: string;
  reasonEn: string;
  shortAr: string;
  shortEn: string;
}

export const BLOCKED_MEDIA_MAP: Record<number, BlockedMedia> = {
  76479: {
    id: 76479,
    reasonAr: "العمل الذي يهين الرسول محمد صلى الله عليه و سلم لا يستحق الحضور",
    reasonEn: "The work that insults the Prophet Muhammad (PBUH) is unworthy of viewing.",
    shortAr: "⚠️ الإساءة للرسول الكريم ﷺ",
    shortEn: "⚠️ Insults the Prophet ﷺ"
  },
  737568: {
    id: 737568,
    reasonAr: "تم منع وحظر هذا العمل كلياً من العرض والتشغيل والترويج له لكونه يثير الفتنة الطائفية ويسيء لرموز الإسلام الكرام وصحابة الرسول صلى الله عليه وسلم.",
    reasonEn: "This work has been completely restricted and banned from streaming because it incites sectarian division and insults revered Islamic symbols and companions of the Prophet (PBUH).",
    shortAr: "⚠️ الإساءة للصحابة والرموز الدينية",
    shortEn: "⚠️ Insults Companions & Islamic Symbols"
  },
  113406: {
    id: 113406,
    reasonAr: "بسبب الإساءة المباشرة والمتعمدة لمقام نبينا الكريم محمد صلى الله عليه وسلم واشتماله على أكاذيب وافتراءات باطلة، تم حظر هذا العمل بشكل كامل ولا يستحق المشاهدة.",
    reasonEn: "Due to direct and intentional offense to our Holy Prophet Muhammad (PBUH) and containing false claims and fabrications, this work has been completely banned.",
    shortAr: "⚠️ الإساءة للرسول الكريم ﷺ",
    shortEn: "⚠️ Insults Prophet Muhammad ﷺ"
  },
  220261: {
    id: 220261,
    reasonAr: "تم حظر هذا العمل بالكامل على موقعنا بسبب إساءته المباشرة للقرآن الكريم والترويج لخطاب الكراهية والإسلاموفوبيا وتشويه الدين الإسلامي الحنيف.",
    reasonEn: "This work has been completely banned on our site due to its direct insult to the Holy Quran, promotion of hate speech, Islamophobia, and distortion of the Islamic faith.",
    shortAr: "⚠️ الإساءة للقرآن الكريم والمسلمين",
    shortEn: "⚠️ Insults the Quran & Muslims"
  },
  132333: {
    id: 132333,
    reasonAr: "تم حظر هذا العمل كلياً من العرض والتشغيل لمنعه تشويه تعاليم الإسلام الحنيف والإساءة لمقاصد الشريعة الإسلامية والقرآن الكريم.",
    reasonEn: "This work has been completely restricted from streaming to prevent distortion of the noble teachings of Islam and offending Islamic law and the Holy Quran.",
    shortAr: "⚠️ الإساءة لتعاليم الدين الإسلامي",
    shortEn: "⚠️ Insults Islamic Teachings"
  }
};

/**
 * Checks if a media item is blocked due to religious insult or offensive content.
 * Returns the BlockedMedia object if blocked, otherwise null.
 */
export function getBlockedMediaInfo(id: number | string | undefined, title?: string): BlockedMedia | null {
  if (!id) return null;
  const numId = Number(id);
  
  // 1. Direct map check
  if (BLOCKED_MEDIA_MAP[numId]) {
    return BLOCKED_MEDIA_MAP[numId];
  }

  // 2. Defensive title-based block for other known variants
  if (title) {
    const lowerTitle = title.toLowerCase();
    if (lowerTitle.includes('innocence of muslims')) {
      return {
        id: numId,
        reasonAr: "بسبب الإساءة المباشرة والمتعمدة لمقام نبينا الكريم محمد صلى الله عليه وسلم واشتماله على أكاذيب وافتراءات باطلة، تم حظر هذا العمل بشكل كامل.",
        reasonEn: "Due to direct and intentional offense to our Holy Prophet Muhammad (PBUH) and containing false claims and fabrications, this work has been completely banned.",
        shortAr: "⚠️ الإساءة للرسول الكريم ﷺ",
        shortEn: "⚠️ Insults Prophet Muhammad ﷺ"
      };
    }
    if (lowerTitle.includes('fitna film') || lowerTitle === 'fitna') {
      return {
        id: numId,
        reasonAr: "تم حظر هذا العمل بالكامل على موقعنا بسبب إساءته المباشرة للقرآن الكريم والترويج لخطاب الكراهية والإسلاموفوبيا وتشويه الدين الإسلامي الحنيف.",
        reasonEn: "This work has been completely banned on our site due to its direct insult to the Holy Quran, promotion of hate speech, Islamophobia, and distortion of the Islamic faith.",
        shortAr: "⚠️ الإساءة للقرآن الكريم والمسلمين",
        shortEn: "⚠️ Insults the Quran & Muslims"
      };
    }
  }

  return null;
}
