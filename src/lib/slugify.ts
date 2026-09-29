/**
 * Create a clean Latin URL slug for media pages.
 * Prefer an English/original title; never expose Arabic or other non-Latin text in routes.
 */
export function slugify(text: string | undefined | null): string {
  if (!text) return 'media';
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[\s\t\n\r_]+/g, '-')
    .replace(/[^a-z0-9\-]+/g, '')
    .replace(/-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '') || 'media';
}

function isLatinTitle(value: unknown): value is string {
  return typeof value === 'string' && /[a-z]/i.test(value);
}

export function getMediaSlug(item: {
  title?: string;
  name?: string;
  original_title?: string;
  original_name?: string;
  id?: number;
}): string {
  const candidates = [item.original_title, item.original_name, item.title, item.name];
  const latin = candidates.find(isLatinTitle);
  return latin ? slugify(latin) : (item.id ? String(item.id) : 'media');
}
