import { MediaItem } from '../types';

/**
 * Gets a seed string representing the current UTC date (e.g., "2026-07-01").
 * This ensures the seed changes exactly at midnight UTC, synchronized worldwide.
 */
export function getUTCSeedString(): string {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const date = String(now.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${date}`;
}

/**
 * Creates a deterministic, seeded pseudo-random number generator (PRNG).
 * Uses a basic Linear Congruential Generator (LCG) scheme for simplicity and speed.
 */
function createSeededRandom(seedStr: string): () => number {
  let h = 1779033703 ^ seedStr.length;
  for (let i = 0; i < seedStr.length; i++) {
    h = Math.imul(h ^ seedStr.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let seed = h >>> 0;
  return function () {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}

/**
 * Shuffles an array deterministically using a string seed.
 */
export function shuffleWithSeed<T>(array: T[], seedStr: string): T[] {
  const random = createSeededRandom(seedStr);
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    const temp = shuffled[i];
    shuffled[i] = shuffled[j];
    shuffled[j] = temp;
  }
  return shuffled;
}

/**
 * Selects 50 unique items from a pool, shuffled deterministically based on the current UTC date.
 * If the pool is smaller than 50, it returns the pool shuffled.
 */
export function getDaily50(pool: MediaItem[], seedOffset: string = ''): MediaItem[] {
  if (!pool || pool.length === 0) return [];

  // Deduplicate items by ID
  const uniqueMap = new Map<number, MediaItem>();
  pool.forEach((item) => {
    if (item && item.id) {
      uniqueMap.set(item.id, item);
    }
  });
  const uniquePool = Array.from(uniqueMap.values());

  // Use current UTC date + optional shelf-specific offset to ensure different shelves get different shuffles
  const baseSeed = getUTCSeedString();
  const finalSeed = `${baseSeed}_${seedOffset}`;

  const shuffled = shuffleWithSeed(uniquePool, finalSeed);
  return shuffled.slice(0, 50);
}
