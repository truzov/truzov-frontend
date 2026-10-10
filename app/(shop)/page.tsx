import type { Metadata } from 'next';
import { HomeScreen } from '@/components/screens/CustomerScreens';

/**
 * No `revalidate` here any more. HomeScreen is a client component that fetches `GET /home`
 * through React Query, so an ISR window on this server component would only have controlled how
 * often the static shell regenerated — implying a caching behaviour that no longer exists.
 * Freshness is now governed by the query's staleTime.
 */
export const metadata: Metadata = {
  title: 'truzov | Every label, verified',
  description: 'Explore products checked before they reach the shelf. Shop personal care, food and more on truzov.',
};

export default function Page() {
  const organizationJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'truzov',
    url: 'https://truzov.com',
    logo: 'https://truzov.com/truzov-logo-final.png',
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
