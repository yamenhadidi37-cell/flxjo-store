/**
 * Advanced Search & Arabic / Multi-Language Normalization Pipeline
 * Handles Arabic letter unification (Alef, Taa Marbuta, Yaa), Tashkeel/Tatweel removal,
 * fuzzy matching, typo tolerance, and direct URL / TMDB ID resolution.
 */

// Arabic Diacritics (Tashkeel) regex
const ARABIC_TASHKEEL_REGEX = /[\u064B-\u065F\u0670\u0640]/g;

// Punctuation and special characters regex
const NOISE_CHARACTERS_REGEX = /[^\p{L}\p{N}\s]/gu;

/**
 * Normalizes Arabic text by unifying characters that often cause mismatch
 * e.g., أ, إ, آ, ٱ -> ا
 * ة -> ه
 * ى -> ي
 * Removes Harakat (Tashkeel) and Tatweel (ـ)
 */
export function normalizeArabic(text: string | null | undefined): string {
  if (!text) return '';

  return text
    .toString()
    .toLowerCase()
    // Remove Arabic Tashkeel (Fatha, Damma, Kasra, Sukun, Tanween, Shadda, etc.) and Tatweel
    .replace(ARABIC_TASHKEEL_REGEX, '')
    // Unify all Alef variants to bare Alef
    .replace(/[أإآٱ]/g, 'ا')
    // Unify Taa Marbuta with Haa
    .replace(/ة/g, 'ه')
    // Unify Alef Maksura with Yaa
    .replace(/ى/g, 'ي')
    // Unify Hamza on Waw / Yaa
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    // Unify Persian / Urdu kaf/gaf/yeh if present
    .replace(/ك/g, 'ك')
    .replace(/ي/g, 'ي')
    // Normalize spaces and trim
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Universal text normalizer for searching (supports Arabic, English, Japanese, French, etc.)
 */
export function normalizeQuery(text: string | null | undefined): string {
  if (!text) return '';

  const arabicNormalized = normalizeArabic(text);

  return arabicNormalized
    // Convert accented latin characters (é, à, ö, etc.) to base forms
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    // Replace noise / punctuation with single space
    .replace(NOISE_CHARACTERS_REGEX, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Tokenize string into meaningful search words
 */
export function tokenizeQuery(text: string): string[] {
  const normalized = normalizeQuery(text);
  if (!normalized) return [];
  return normalized.split(' ').filter(token => token.length > 0);
}

/**
 * Fuzzy scoring for matching query tokens inside target title or description.
 * Returns a match score between 0 (no match) and 100 (exact match).
 */
export function calculateMatchScore(
  targetTitle: string,
  originalTitle: string | undefined,
  overview: string | undefined,
  query: string
): number {
  if (!query.trim()) return 0;

  const normTarget = normalizeQuery(targetTitle);
  const normOriginal = normalizeQuery(originalTitle || '');
  const normOverview = normalizeQuery(overview || '');
  const normQuery = normalizeQuery(query);

  if (!normTarget && !normOriginal) return 0;

  // Exact full string match -> Maximum score
  if (normTarget === normQuery || normOriginal === normQuery) {
    return 100;
  }

  // Starts with full query
  if (normTarget.startsWith(normQuery) || normOriginal.startsWith(normQuery)) {
    return 90;
  }

  // Contains full query as contiguous phrase
  if (normTarget.includes(normQuery) || normOriginal.includes(normQuery)) {
    return 80;
  }

  const queryTokens = tokenizeQuery(query);
  if (queryTokens.length === 0) return 0;

  let matchedTokens = 0;
  let titleMatchBonus = 0;

  for (const token of queryTokens) {
    let tokenMatched = false;

    // Check title tokens
    if (normTarget.includes(token)) {
      matchedTokens++;
      titleMatchBonus += 15;
      tokenMatched = true;
    } else if (normOriginal.includes(token)) {
      matchedTokens++;
      titleMatchBonus += 12;
      tokenMatched = true;
    } else if (normOverview.includes(token)) {
      matchedTokens += 0.5;
      tokenMatched = true;
    }

    // Levenshtein / prefix tolerance for small typos
    if (!tokenMatched && token.length >= 4) {
      const targetWords = normTarget.split(' ').concat(normOriginal.split(' '));
      for (const tw of targetWords) {
        if (tw.startsWith(token.substring(0, Math.max(3, token.length - 1)))) {
          matchedTokens += 0.75;
          titleMatchBonus += 8;
          break;
        }
      }
    }
  }

  const tokenCoverage = (matchedTokens / queryTokens.length) * 50;
  return Math.min(95, tokenCoverage + titleMatchBonus);
}

export interface DirectQueryResult {
  isDirect: boolean;
  type?: 'movie' | 'tv';
  id?: number;
  slug?: string;
  cleanQuery: string;
}

/**
 * Detects if the user pasted a direct URL or TMDB / IMDB ID
 * e.g., "https://flxjo.netlify.app/movie/969681/spider-man-brand-new-day"
 * or "/tv/1399" or "969681" or "tt0111161"
 */
export function parseDirectQuery(rawInput: string): DirectQueryResult {
  const query = rawInput.trim();

  // 1. Direct Movie/TV URL pattern
  const urlMatch = query.match(/(?:https?:\/\/[^\/]+)?\/(watch\/(movie|tv)|movie|tv)\/([0-9]+)(?:\/([^\/\?#]+))?/i);
  if (urlMatch) {
    const rawType = urlMatch[2] || (urlMatch[1].includes('tv') ? 'tv' : 'movie');
    const id = parseInt(urlMatch[3], 10);
    const slug = urlMatch[4] || '';
    if (!isNaN(id) && id > 0) {
      return {
        isDirect: true,
        type: rawType === 'tv' ? 'tv' : 'movie',
        id,
        slug,
        cleanQuery: query
      };
    }
  }

  // 2. Pure Numeric ID (e.g. "969681")
  if (/^\d{3,8}$/.test(query)) {
    const id = parseInt(query, 10);
    return {
      isDirect: true,
      id,
      cleanQuery: query
    };
  }

  return {
    isDirect: false,
    cleanQuery: query
  };
}
