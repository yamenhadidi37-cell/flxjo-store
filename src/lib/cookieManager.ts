/**
 * Cookie-free privacy manager.
 * Analytics and non-essential browser cookies are disabled by default.
 * Local preferences used by the UI are kept separate from tracking.
 */

export interface CookiePreferences {
  userId: string;
  lastSearch: string;
  searchHistory: string[];
  favoriteGenres: number[];
  consentGiven: boolean;
  theme: 'dark' | 'light';
}

export const COOKIE_POLICY_VERSION = '2026-09-29-cookie-free';
export type CookieConsent = 'accepted' | 'declined' | 'unset';

// No analytics consent is collected because the site no longer uses tracking cookies.
export function getCookieConsent(): CookieConsent {
  return 'declined';
}

export function setCookieConsent(_consent: Exclude<CookieConsent, 'unset'>) {
  // Intentionally empty: do not create cookies or tracking identifiers.
}

export function resetCookieConsent() {
  clearUserTrackingData();
}

export function clearUserTrackingData() {
  try {
    for (const key of [
      'flxjo_cookie_consent',
      'flxjo_cookie_consent_version',
      'flxjo_user_session',
      'flexjo_user_id',
      'flxjo_liked_ids',
      'flxjo_disliked_ids',
      'flxjo_personal_reviews',
    ]) {
      localStorage.removeItem(key);
    }
  } catch {
    // Storage may be unavailable; the site remains usable.
  }
}

export function saveUserCookiePreferences(_prefs: Partial<CookiePreferences>) {
  // Intentionally empty: no cookie or tracking profile is stored.
}

export function getUserCookiePreferences(): CookiePreferences {
  return {
    userId: '',
    lastSearch: '',
    searchHistory: [],
    favoriteGenres: [28, 12, 35, 878, 18],
    consentGiven: false,
    theme: 'dark',
  };
}

export function recordSearchQueryInCookie(_query: string) {
  // Intentionally empty: search queries are not stored in cookies or local profiles.
}
