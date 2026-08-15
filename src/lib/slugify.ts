/**
 * Unicode-aware slugification for clean, readable URLs.
 * Supports English, Arabic, Japanese, and any other international characters.
 */
export function slugify(text: string | undefined | null): string {
  if (!text) return 'media';
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[\s\t\n\r_]+/g, '-')                 // Replace spaces or underscores with -
    .replace(/[^\p{L}\p{N}\-]+/gu, '')              // Remove everything except Unicode letters, numbers, and hyphens
    .replace(/\-\-+/g, '-')                         // Replace multiple hyphens with a single one
    .replace(/^-+/, '')                             // Trim hyphen from start
    .replace(/-+$/, '');                            // Trim hyphen from end
}
