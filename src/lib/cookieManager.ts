/**
 * FlxJo Cookie and Session Preference Manager
 * Fulfills user requirements for cookie-based tracking, search history, and personalized recommendations.
 */

export interface CookiePreferences {
  userId: string;
  lastSearch: string;
  searchHistory: string[];
  favoriteGenres: number[];
  consentGiven: boolean;
  theme: 'dark' | 'light';
}

const COOKIE_CONSENT_KEY = 'flxjo_cookie_consent';
const COOKIE_CONSENT_VERSION_KEY = 'flxjo_cookie_consent_version';
const COOKIE_PREFS_NAME = 'flxjo_user_session';
export const COOKIE_POLICY_VERSION = '2026-08-16-analytics-v2';

export type CookieConsent = 'accepted' | 'declined' | 'unset';

export function getCookieConsent(): CookieConsent {
  try {
    const value = getCookie(COOKIE_CONSENT_KEY) || localStorage.getItem(COOKIE_CONSENT_KEY);
    const version = getCookie(COOKIE_CONSENT_VERSION_KEY) || localStorage.getItem(COOKIE_CONSENT_VERSION_KEY);
    // A consent decision from an older policy must be reviewed again.
    if (version !== COOKIE_POLICY_VERSION) return 'unset';
    if (value === 'accepted' || value === 'declined') return value;
  } catch (e) {
    // Treat unavailable storage as no consent.
  }
  return 'unset';
}

export function setCookieConsent(consent: Exclude<CookieConsent, 'unset'>) {
  setCookie(COOKIE_CONSENT_KEY, consent, 365);
  setCookie(COOKIE_CONSENT_VERSION_KEY, COOKIE_POLICY_VERSION, 365);
  try {
    localStorage.setItem(COOKIE_CONSENT_KEY, consent);
    localStorage.setItem(COOKIE_CONSENT_VERSION_KEY, COOKIE_POLICY_VERSION);
  } catch (e) {
    // Ignore storage failures.
  }
}

export function resetCookieConsent() {
  setCookie(COOKIE_CONSENT_KEY, '', -1);
  setCookie(COOKIE_CONSENT_VERSION_KEY, '', -1);
  try {
    localStorage.removeItem(COOKIE_CONSENT_KEY);
    localStorage.removeItem(COOKIE_CONSENT_VERSION_KEY);
  } catch (e) {
    // Ignore storage failures.
  }
}

export function clearUserTrackingData() {
  try {
    localStorage.removeItem(COOKIE_PREFS_NAME);
    localStorage.removeItem('flexjo_user_id');
    localStorage.removeItem('flxjo_liked_ids');
    localStorage.removeItem('flxjo_disliked_ids');
  } catch (e) {
    // Ignore storage failures.
  }
  setCookie(COOKIE_PREFS_NAME, '', -1);
}

export function setCookie(name: string, value: string, days = 365) {
  if (typeof document === 'undefined') return;
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

export function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : null;
}

export function saveUserCookiePreferences(prefs: Partial<CookiePreferences>) {
  try {
    const existing = getUserCookiePreferences();
    const updated: CookiePreferences = {
      ...existing,
      ...prefs,
    };
    const jsonStr = JSON.stringify(updated);
    setCookie(COOKIE_PREFS_NAME, jsonStr, 365);
    // Also mirror to localStorage for robust cross-session resilience
    localStorage.setItem(COOKIE_PREFS_NAME, jsonStr);
  } catch (e) {
    console.error('Error saving cookie preferences:', e);
  }
}

export function getUserCookiePreferences(): CookiePreferences {
  const defaultPrefs: CookiePreferences = {
    userId: (() => {
      try {
        return localStorage.getItem('flexjo_user_id') || 'user-' + Math.random().toString(36).substring(2, 11);
      } catch (e) {
        return 'user-' + Math.random().toString(36).substring(2, 11);
      }
    })(),
    lastSearch: '',
    searchHistory: [],
    favoriteGenres: [28, 12, 35, 878, 18],
    consentGiven: getCookieConsent() === 'accepted',
    theme: 'dark',
  };

  try {
    let raw = getCookie(COOKIE_PREFS_NAME);
    if (!raw) {
      raw = localStorage.getItem(COOKIE_PREFS_NAME);
    }
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...defaultPrefs, ...parsed };
    }
  } catch (e) {
    // Fallback
  }

  // Do not write a non-essential cookie before the visitor makes a choice.
  return defaultPrefs;
}

export function recordSearchQueryInCookie(query: string) {
  if (getCookieConsent() !== 'accepted') return;
  const trimmed = query.trim();
  if (!trimmed) return;
  const prefs = getUserCookiePreferences();
  const history = [trimmed, ...(prefs.searchHistory || []).filter(q => q !== trimmed)].slice(0, 20);
  saveUserCookiePreferences({
    lastSearch: trimmed,
    searchHistory: history,
  });
}
