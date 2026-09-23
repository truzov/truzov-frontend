import type { ProductImageDto, ProductSummaryDto, ProductVariantDto } from '@/types/api';

/**
 * Presentation helpers for product DTOs. This is the adapter boundary the DTO types refuse to
 * be: `types/api.ts` mirrors the wire format, and anything the UI wants shaped differently is
 * derived here.
 */

export interface DisplayImage {
  url: string;
  alt: string;
}

/**
 * Normalises the `images` field into something a component can render directly.
 *
 * Two problems this solves. First, the API reference lists `images` on both product DTOs
 * without specifying the element shape (see the VERIFY note in types/api.ts), so this tolerates
 * both a bare URL string and an object — a wrong guess degrades to a missing image rather than
 * a render crash on `images[0].url` of a string.
 *
 * Second, `alt` is optional, and alt text is an accessibility requirement that must not depend
 * on an optional field being populated. The product name is a genuinely useful fallback, so it
 * is used rather than an empty string.
 */
export function displayImages(
  images: Array<ProductImageDto | string> | undefined,
  productName: string
): DisplayImage[] {
  if (!images?.length) {
    return [];
  }

  return images
    .map((image) => (typeof image === 'string' ? { url: image } : image))
    .filter((image): image is ProductImageDto => Boolean(image?.url))
    .map((image) => ({
      url: image.url,
      alt: image.alt?.trim() || productName,
    }));
}

/**
 * First image, or null when a product has none.
 *
 * Returning null rather than a placeholder URL is deliberate: the caller decides what an
 * imageless product looks like, and a hardcoded placeholder here would be another remote host
 * to allow-list in next.config.ts.
 */
export function primaryImage(product: ProductSummaryDto): DisplayImage | null {
  return displayImages(product.images, product.name)[0] ?? null;
}

/**
 * Turns a category slug into something readable, for the cases where the category list has not
 * loaded (or the slug is not in it) and the alternative is showing `cold-pressed-oils` to a
 * user. Prefer the real `CategoryDto.name` whenever it is available.
 */
export function humaniseSlug(slug: string): string {
  return slug
    .split('-')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * The variant a product should start with: the first one in the backend-returned order that is
 * not explicitly out of stock. `undefined` when there is nothing selectable.
 *
 * The test is `inStock !== false`, not `inStock === true`. `inStock` is optional on the wire, so
 * an absent flag means available — otherwise a listing response that omits it would disable
 * every pill on the card.
 */
export function defaultVariantId(variants: ProductVariantDto[] | undefined): string | undefined {
  return variants?.find((variant) => variant.inStock !== false)?.id;
}
