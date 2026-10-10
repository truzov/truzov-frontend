'use client';

import { ArrowRight, Ban, Droplets, Utensils, ClipboardCheck, FlaskConical, Handshake, ScanSearch, ShieldCheck } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { ErrorState } from '@/components/ui/ErrorState';
import { HomeScreenSkeleton } from '@/components/ui/Skeleton';
import { useHome, useLabReports, useProductList } from '@/hooks/api/useCatalog';
import { formatCurrency } from '@/lib/utils/money';
import { displayImages } from '@/lib/utils/product';

const trust = [
  { icon: FlaskConical, title: 'lab tested', detail: 'testing before a product goes live' },
  { icon: ShieldCheck, title: 'verified sellers', detail: 'brands reviewed before listing' },
  { icon: Ban, title: 'no fillers', detail: 'clear ingredient information' },
  { icon: Handshake, title: 'transparent sourcing', detail: 'know the story behind the product' },
];
const verificationSteps = [
  { icon: ShieldCheck, title: 'seller review', detail: 'We review the brand before it joins the marketplace.' },
  { icon: ScanSearch, title: 'ingredient review', detail: 'We look closely at the product and its stated ingredients.' },
  { icon: FlaskConical, title: 'lab testing', detail: 'Samples go through testing before a verified listing.' },
  { icon: ClipboardCheck, title: 'listing decision', detail: 'Results inform whether the product is published.' },
];

export function HomeScreen() {
  const { data, isLoading, isError, error, refetch } = useHome();
  const { data: reportPage, isError: reportsError } = useLabReports();
  const { data: productPage } = useProductList({ sort: 'best_selling', limit: 4 });

  if (isLoading) return <HomeScreenSkeleton />;
  if (isError || !data) {
    return <div className="mx-auto max-w-3xl px-5 py-20"><ErrorState error={error} title="We could not load the homepage" onRetry={() => void refetch()} /></div>;
  }

  const categoryLink = (term: string) => {
    const category = data.categories.find((item) => item.isActive && `${item.name} ${item.slug}`.toLowerCase().includes(term));
    return category ? { href: `/category/${category.slug}`, available: true } : { href: '/products', available: false };
  };
  const personalCare = categoryLink('personal');
  const food = categoryLink('food');
  const passedProductIds = new Set(reportPage?.items.filter((report) => report.status === 'pass').map((report) => report.productId));
  const products = [...(productPage?.items ?? []), ...data.featured, ...data.bestSellers, ...data.newArrivals]
    .filter((product, index, all) => all.findIndex((item) => item.id === product.id) === index)
    .slice(0, 4);

  return (
    <div className="truzov-home">
      <section className="home-hero">
        <div className="home-hero-inner">
          <div className="home-hero-copy home-reveal">
            <span className="home-eyebrow">no greenwashing, ever</span>
            <h1>every label, verified.<br />every claim, tested.</h1>
            <p>truzov checks products before they reach the shelf, so you can shop with more confidence and less guesswork.</p>
            <div className="home-actions">
              <Link className="home-button home-button-coral" href="/products?labVerified=true">shop verified products <ArrowRight aria-hidden="true" size={18} /></Link>
              <Link className="home-text-link" href="/trust/how-it-works">how we verify <ArrowRight aria-hidden="true" size={16} /></Link>
            </div>
          </div>
          <div className="home-hero-image home-reveal">
            <Image src="/truzov-hero.webp" alt="Unbranded personal care bottles and natural ingredients arranged in warm light" fill priority sizes="(max-width: 767px) 100vw, 50vw" />
            <span className="home-photo-note"><FlaskConical aria-hidden="true" size={20} /> products checked before listing</span>
          </div>
        </div>
      </section>

      <section className="home-trust" aria-label="The truzov approach">
        <div className="home-container home-trust-grid">
          {trust.map(({ icon: Icon, title, detail }) => <div className="home-trust-item" key={title}><Icon aria-hidden="true" size={24} /><div><strong>{title}</strong><span>{detail}</span></div></div>)}
        </div>
      </section>

      <section className="home-container home-section" aria-labelledby="shop-category-title">
        <div className="home-section-heading"><div><span className="home-kicker">find your kind of clean</span><h2 id="shop-category-title">shop by category</h2></div></div>
        <div className="home-categories">
          <Link className="home-category home-category-care" href={personalCare.href}>
            <Image src="/truzov-personal-care.webp" alt="Unbranded skincare bottles on terracotta stone" fill sizes="(max-width: 767px) 100vw, 50vw" />
            <span className="home-category-shade" /><span className="home-category-content"><span className="home-category-icon"><Droplets aria-hidden="true" size={24} /></span><strong>personal care</strong><small>face wash · lotion · shampoo</small><span className="home-category-action">{personalCare.available ? 'shop personal care' : 'browse all products'} <ArrowRight size={17} /></span></span>
          </Link>
          <Link className="home-category home-category-food" href={food.href}>
            <Image src="/truzov-food.webp" alt="Ghee, oil and natural ingredients arranged on warm stone" fill sizes="(max-width: 767px) 100vw, 50vw" />
            <span className="home-category-shade" /><span className="home-category-content"><span className="home-category-icon"><Utensils aria-hidden="true" size={24} /></span><strong>food</strong><small>ghee · cold-pressed oils · pulses</small><span className="home-category-action">{food.available ? 'shop food' : 'browse all products'} <ArrowRight size={17} /></span></span>
          </Link>
        </div>
      </section>

      <section className="home-container home-section home-products" aria-labelledby="marketplace-title">
        <div className="home-section-heading"><div><span className="home-kicker">from the marketplace</span><h2 id="marketplace-title">explore the collection</h2><p>Browse the current catalogue and look for the lab-verified badge.</p></div><Link className="home-see-all" href="/products">shop all <ArrowRight size={17} /></Link></div>
        {products.length ? <div className="home-product-grid">{products.map((product) => {
          const image = displayImages(product.images, product.name)[0];
          return <Link className="home-product" href={`/products/${product.slug}`} key={product.id}>
            <div className="home-product-image">{image ? <Image src={image.url} alt={image.alt} fill sizes="(max-width: 640px) 68vw, (max-width: 1024px) 40vw, 22vw" /> : <span className="home-image-fallback">{product.name}</span>}{!reportsError && product.isLabVerified && passedProductIds.has(product.id) && <span className="home-verified"><FlaskConical aria-hidden="true" size={13} /> lab verified</span>}</div>
            <span className="home-product-brand">{product.brand}</span><strong>{product.name}</strong><span className="home-product-price">{formatCurrency(product.price)}</span>{!product.inStock && <span className="home-product-availability">currently unavailable</span>}
          </Link>;
        })}</div> : <div className="home-empty"><p>Products will appear here as they become available.</p><Link href="/products">browse all products <ArrowRight size={17} /></Link></div>}
      </section>

      <section className="home-process" aria-labelledby="process-title">
        <div className="home-container home-process-grid">
          <div className="home-process-copy"><span className="home-kicker">the work behind the shelf</span><h2 id="process-title">four checks before the cart</h2><p>Trust is a process. We review the seller, examine the product, test samples, and decide what belongs on truzov.</p>
            <ol className="home-process-steps">{verificationSteps.map(({ icon: Icon, title, detail }, index) => <li key={title}><span className="home-process-icon"><Icon aria-hidden="true" size={24} /></span><div><span className="home-step-number">0{index + 1}</span><strong>{title}</strong><small>{detail}</small></div></li>)}</ol>
            <Link className="home-see-all" href="/trust/how-it-works">explore the full process <ArrowRight size={17} /></Link>
          </div>
          <div className="home-process-image"><Image src="/truzov-process.webp" alt="A lab analyst examining an unbranded product bottle and a checklist" fill sizes="(max-width: 767px) 100vw, 45vw" /></div>
        </div>
      </section>

      <section className="home-editorial"><div className="home-container home-editorial-grid"><div><span className="home-quote-mark" aria-hidden="true">“</span><h2>“organic” and “natural” shouldn&apos;t be a guessing game.</h2></div><div><p>We look beyond the label and ask what is actually inside. Our process brings testing, product information and seller checks together before a product is listed.</p><Link href="/trust/how-it-works">see how verification works <ArrowRight size={17} /></Link></div></div></section>

      <section className="home-container home-gifts" aria-labelledby="gifts-title"><div className="home-gifts-image"><Image src="/truzov-gifts.webp" alt="A thoughtfully wrapped gift box with unbranded skincare and food products" fill sizes="(max-width: 767px) 100vw, 55vw" /></div><div className="home-gifts-copy"><span className="home-kicker">give with intention</span><h2 id="gifts-title">good things are better shared.</h2><p>Looking for something thoughtful? Explore products and brands that have gone through the truzov review process.</p><Link className="home-button home-button-gift" href="/products">find something to give <ArrowRight size={18} /></Link></div></section>

      <section className="home-seller"><div className="home-container home-seller-grid"><div><span className="home-kicker">for thoughtful brands</span><h2>become a verified brand on truzov</h2><p>Join a marketplace built around product checks and clearer information.</p></div><Link className="home-button home-button-outline" href="/vendor/register">apply as a seller <ArrowRight aria-hidden="true" size={18} /></Link></div></section>
    </div>
  );
}
