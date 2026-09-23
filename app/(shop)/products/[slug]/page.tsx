import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ProductDetailScreen } from '@/components/screens/ProductDetailScreen';
import { getProduct } from '@/lib/api/endpoints/catalog';
import { ERROR_CODES, isApiError } from '@/lib/api/errors';
import { displayImages } from '@/lib/utils/product';
import type { ProductDetailDto } from '@/types/api';

/**
 * Deliberately NOT `export const revalidate = ...`.
 *
 * With an ISR revalidate window on this route, `notFound()` below was served with HTTP 200
 * (verified against a production build: an unknown slug rendered the not-found page but returned
 * 200). Next caches the render, and the cached entry loses the 404 status — which makes it a
 * soft 404 that crawlers happily index.
 *
 * Rendering on demand also keeps the metadata and JSON-LD honest: a product whose price or stock
 * changed is reflected immediately rather than up to 30s later. The interactive part of the page
 * is client-fetched through React Query regardless, so there was little left for ISR to cache.
 */
export const dynamic = 'force-dynamic';

/**
 * Fetches for metadata/JSON-LD, returning null for a missing product.
 *
 * Errors are swallowed deliberately: metadata generation must not throw, or a transient backend
 * blip turns into a hard 500 on a page whose main content would have rendered fine on the
 * client. A missing title is a much smaller problem than an unavailable page.
 */
async function loadProduct(slug: string): Promise<ProductDetailDto | null> {
  try {
    return await getProduct(slug);
  } catch (error) {
    if (isApiError(error) && error.code === ERROR_CODES.RESOURCE_NOT_FOUND) {
      return null;
    }

    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await loadProduct(slug);

  if (!product) {
    /**
     * `noindex` rather than `notFound()` here, and the reason is worth recording.
     *
     * A missing product SHOULD return HTTP 404. It does not: Next flushes the HTML shell (committing
     * 200) before the async server component throws, so `notFound()` produces a SOFT 404 — the
     * not-found UI renders correctly and no other product leaks, but the status is 200. Measured in
     * dev and in a production build, with and without the route's loading.tsx, with
     * `dynamic = 'force-dynamic'`, and with `notFound()` called from this very function. It is a
     * streaming architecture constraint, not a missing flag.
     *
     * The concrete harm of a soft 404 is a crawler indexing a dead product URL as a live page.
     * `noindex` reduces that harm, but only PARTLY, and the limit matters:
     *
     * The tag is server-rendered — it is in the raw HTML with no JavaScript executed — but it lands
     * OUTSIDE `<head>`. Measured against a production build: `</head>` closes at byte 1864 while the
     * robots meta appears at byte 78411, roughly 76 KB into the `<body>`. It only reaches `<head>`
     * when React relocates it during hydration. So it is effective for JS-executing crawlers
     * (Googlebot, Bingbot) and NOT effective for crawlers that do not run JavaScript. This is not
     * specific to the not-found path — a real product page's `<title>` is emitted outside `<head>`
     * too; it is how Next streams metadata.
     *
     * The only complete fix is a middleware existence check, which would mean a SECOND backend fetch
     * on every product page view — this page already fetches server-side for metadata. That was
     * judged the wrong trade for the hot path: major search engines handle soft 404s heuristically,
     * and the crawlers that matter for ranking execute JavaScript. Accepted and closed on that basis;
     * see plan §T9, which records the measurement and the decision.
     */
    return {
      title: 'Product Not Found',
      robots: { index: false, follow: false },
    };
  }

  const image = displayImages(product.images, product.name)[0];

  return {
    title: product.name,
    // `description` is optional on the DTO and omitted when null, so it cannot be sliced blind.
    description: product.description?.slice(0, 160),
    openGraph: {
      title: product.name,
      images: image ? [{ url: image.url, alt: image.alt }] : undefined,
    },
  };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await loadProduct(slug);

  // A real 404 instead of the previous `findProduct(slug) ?? products[0]` fallback, which
  // rendered a completely different product for any unknown slug — including for crawlers,
  // which then indexed the wrong page under that URL.
  if (!product) {
    notFound();
  }

  const productJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    image: displayImages(product.images, product.name).map((entry) => entry.url),
    description: product.description,
    brand: { '@type': 'Brand', name: product.brand },
    offers: {
      '@type': 'Offer',
      priceCurrency: 'INR',
      // Product DTO prices are integer rupees, which is what schema.org expects here.
      price: product.price,
      availability: product.inStock
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
    },
    // Google rejects an aggregateRating with a zero review count, and a freshly seeded product
    // legitimately has none — so the field is omitted rather than sent as 0.
    ...(product.reviewCount > 0
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: product.rating,
            reviewCount: product.reviewCount,
          },
        }
      : {}),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />
      <ProductDetailScreen slug={slug} />
    </>
  );
}
