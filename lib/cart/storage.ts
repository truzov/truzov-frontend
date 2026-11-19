import { z } from 'zod';
import { imageHosts } from '@/lib/config/image-hosts';

export const savedCartSnapshot = z.object({
  productId: z.string().min(1),
  variantId: z.string().min(1).nullish().transform((value) => value ?? undefined),
  variantLabel: z.string().optional().catch(undefined),
  name: z.string(),
  slug: z.string().min(1).refine((slug) => slug !== '.' && slug !== '..' && !/[/\\?#\x00-\x1f\x7f]/.test(slug)),
  imageUrl: z.string().refine((value) => {
    if (/[\\\x00-\x1f\x7f]/.test(value)) return false;
    if (value.startsWith('/')) return !value.startsWith('//');
    try {
      const url = new URL(value);
      return url.protocol === 'https:' && !url.username && !url.password && imageHosts.includes(url.hostname);
    } catch {
      return false;
    }
  }).optional().catch(undefined),
  unitPrice: z.number().nonnegative(),
  quantity: z.number().int().positive(),
});

export function readCartStorage(key: string): unknown {
  try {
    const raw = window.localStorage.getItem(key);
    return raw === null ? undefined : JSON.parse(raw);
  } catch {
    return undefined;
  }
}

export function writeCartStorage(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // A blocked or full storage area still leaves the current visit usable.
  }
}
