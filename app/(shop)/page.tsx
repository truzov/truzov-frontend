import type { Metadata } from 'next';
import { HomeScreen } from '@/components/screens/CustomerScreens';

export const revalidate = 60;

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
