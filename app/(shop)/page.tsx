import type { Metadata } from 'next';
import { HomeScreen } from '@/components/screens/CustomerScreens';

/**
 * No `revalidate` here any more. HomeScreen is a client component that fetches `GET /home`
 * through React Query, so an ISR window on this server component would only have controlled how
 * often the static shell regenerated — implying a caching behaviour that no longer exists.
 * Freshness is now governed by the query's staleTime.
 */
export const metadata: Metadata = {
  title: 'Verified Organic Marketplace',
  description: 'Shop lab-verified organic products with transparent reports.',
};

export default function Page() {
  const organizationJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Truzov',
    url: 'https://truzov.com',
    logo: 'https://truzov.com/logo.png',
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
      />
      <HomeScreen />
    </>
  );
}
