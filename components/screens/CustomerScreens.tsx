'use client';

import {
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  CreditCard,
  Heart,
  Leaf,
  MapPin,
  PackageCheck,
  Search,
  ShieldCheck,
  ShoppingBag,
  Truck,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { Rating } from '@/components/ui/Rating';
import { Stepper } from '@/components/ui/Stepper';
import { CartItemRow } from '@/components/commerce/CartItemRow';
import { OrderSummary } from '@/components/commerce/OrderSummary';
import { ProductGrid } from '@/components/product/ProductGrid';
import {
  addresses,
  banners,
  categories,
  findOrder,
  findProduct,
  labReports,
  orders,
  products,
  reviews,
} from '@/lib/data/fixtures';
import { filterProducts, type ProductFilterState } from '@/lib/utils/filters';
import { formatCurrency } from '@/lib/utils/money';
import { verificationLabels } from '@/lib/utils/verification';
import { useCartStore } from '@/store/cart.store';
import { useUiStore } from '@/store/ui.store';
import { useWishlistStore } from '@/store/wishlist.store';
import type { Product } from '@/types';

function SectionHeading({
  eyebrow,
  title,
  action,
}: {
  eyebrow?: string;
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <div>
        {eyebrow ? <p className="text-sm font-semibold text-text-secondary">{eyebrow}</p> : null}
        <h2 className="font-heading text-3xl">{title}</h2>
      </div>
      {action}
    </div>
  );
}

function TrustStrip() {
  const items = [
    [Leaf, 'Certified Organic Sources'],
    [ShieldCheck, 'Third-Party Lab Audited'],
    [CreditCard, 'Secure Checkout'],
    [Truck, '2-3 Day Delivery'],
  ] as const;

  return (
    <div className="border-y border-surface-border bg-surface-overlay">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-4 px-4 py-5 text-sm text-text-secondary md:grid-cols-4">
        {items.map(([Icon, label]) => (
          <div key={label} className="flex items-center gap-2">
            <Icon aria-hidden="true" className="h-4 w-4 text-brand-primary" />
            <span>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function HomeScreen() {
  const hero = banners[0];
  const featured = products.filter((product) => product.isFeatured);
  const newArrivals = products.filter((product) => product.isNewArrival);

  return (
    <>
      <section className="bg-brand-primary text-text-inverse">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-14 lg:grid-cols-[1fr_0.9fr] lg:py-20">
          <div>
            <Badge className="bg-brand-secondary text-text-inverse">Clinically audited inventory</Badge>
            <h1 className="mt-6 max-w-xl font-heading text-5xl">{hero.headline}</h1>
            <p className="mt-5 max-w-lg text-md text-brand-light">{hero.subtext}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                className="inline-flex h-[52px] items-center justify-center rounded-md bg-surface-base px-6 font-semibold text-brand-primary"
                href={hero.href}
              >
                {hero.ctaLabel}
              </Link>
              <Link
                className="inline-flex h-[52px] items-center justify-center rounded-md border border-brand-light px-6 font-semibold text-text-inverse"
                href="/trust/how-it-works"
              >
                Learn verification
              </Link>
            </div>
          </div>
          <div className="relative aspect-[4/3] overflow-hidden rounded-xl border-4 border-brand-secondary bg-brand-light">
            <Image alt={hero.headline} className="object-cover" fill priority src={hero.imageUrl} />
          </div>
        </div>
      </section>
      <TrustStrip />
      <section className="mx-auto max-w-7xl px-4 py-12">
        <SectionHeading eyebrow="Shop by lab-verified category" title="Popular categories" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {categories.map((category) => (
            <Link
              key={category.slug}
              className="group rounded-md border border-surface-border bg-surface-base p-3 text-center shadow-xs transition hover:shadow-sm"
              href={`/category/${category.slug}`}
            >
              <div className="relative mx-auto aspect-square w-24 overflow-hidden rounded-md bg-surface-raised">
                <Image alt={category.name} className="object-cover transition group-hover:scale-105" fill src={category.image} />
              </div>
              <p className="mt-3 text-sm font-semibold">{category.name}</p>
            </Link>
          ))}
        </div>
      </section>
      <section className="bg-surface-raised">
        <div className="mx-auto max-w-7xl px-4 py-12">
          <SectionHeading
            eyebrow="Verified best-sellers"
            title="Top performing products"
            action={
              <Link className="hidden text-sm font-semibold text-brand-primary sm:flex" href="/products">
                View All Marketplace <ArrowRight aria-hidden="true" className="ml-1 h-4 w-4" />
              </Link>
            }
          />
          <ProductGrid priorityCount={4} products={featured} />
        </div>
      </section>
      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-12 lg:grid-cols-[1fr_0.55fr]">
        <div className="rounded-lg border border-surface-border bg-surface-base p-6">
          <SectionHeading title="Why Truzov?" />
          <div className="grid gap-4 md:grid-cols-4">
            {[
              ['1. Sourced', 'Carefully sourced from trusted farms and brands'],
              ['2. Lab Tested', 'Every batch tested in accredited labs'],
              ['3. Verified', 'Only passing products are sold'],
              ['4. Delivered', 'Cold-chain and secure delivery where needed'],
            ].map(([title, text]) => (
              <div key={title} className="text-center">
                <span className="mx-auto grid h-12 w-12 place-items-center rounded-md bg-brand-light text-brand-primary">
                  <ShieldCheck aria-hidden="true" className="h-5 w-5" />
                </span>
                <h3 className="mt-3 text-sm font-semibold">{title}</h3>
                <p className="mt-1 text-xs text-text-secondary">{text}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-lg bg-brand-light p-6">
          <h2 className="font-heading text-2xl">See the Proof, Always</h2>
          <p className="mt-3 text-sm text-text-secondary">
            Every product comes with a lab report excerpt because you deserve to know what you eat.
          </p>
          <Link
            className="mt-5 inline-flex h-10 items-center rounded-md bg-brand-primary px-4 text-sm font-semibold text-text-inverse"
            href="/trust/lab-reports"
          >
            View Lab Reports
          </Link>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-4 py-12">
        <SectionHeading eyebrow="New lab arrivals" title="Recently verified" />
        <ProductGrid products={newArrivals} />
      </section>
      <section className="bg-surface-raised">
        <div className="mx-auto max-w-7xl px-4 py-12">
          <SectionHeading eyebrow="Verified purchase reviews" title="Customers trust the reports" />
          <div className="grid gap-4 md:grid-cols-3">
            {reviews.concat(reviews.slice(0, 1)).map((review, index) => (
              <article key={`${review.id}-${index}`} className="rounded-md border border-surface-border bg-surface-base p-5">
                <Rating rating={review.rating} />
                <h3 className="mt-3 font-semibold">{review.title}</h3>
                <p className="mt-2 line-clamp-3 text-sm text-text-secondary">{review.body}</p>
                <Badge className="mt-4" variant="success">
                  Verified Purchase
                </Badge>
              </article>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

function FilterPanel({ filters }: { filters: ProductFilterState }) {
  return (
    <aside className="rounded-lg border border-surface-border bg-surface-base p-4 lg:sticky lg:top-36">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-2xl">Filters</h2>
        <Link className="text-sm font-semibold text-brand-primary" href="/products">
          Clear
        </Link>
      </div>
      <div className="mt-5 grid gap-5 text-sm">
        <div>
          <h3 className="font-semibold">Category</h3>
          <div className="mt-3 grid gap-2">
            {categories.map((category) => (
              <Link
                key={category.slug}
                className={filters.category === category.slug ? 'font-semibold text-brand-primary' : 'text-text-secondary'}
                href={`/products?category=${category.slug}`}
              >
                {category.name}
              </Link>
            ))}
          </div>
        </div>
        <div>
          <h3 className="font-semibold">Trust</h3>
          <Link className="mt-3 flex items-center justify-between rounded-md bg-brand-light p-3 font-semibold text-brand-primary" href="/products?labVerified=true">
            Lab Verified Only
            <ShieldCheck aria-hidden="true" className="h-4 w-4" />
          </Link>
        </div>
        <div>
          <h3 className="font-semibold">Sort</h3>
          <div className="mt-3 grid gap-2 text-text-secondary">
            <Link href="?sort=price_asc">Price: Low to High</Link>
            <Link href="?sort=price_desc">Price: High to Low</Link>
            <Link href="?sort=best_rated">Best Rated</Link>
            <Link href="?sort=best_selling">Best Selling</Link>
          </div>
        </div>
      </div>
    </aside>
  );
}

export function ProductListingScreen({
  title = 'Verified Marketplace',
  filters,
}: {
  title?: string;
  filters: ProductFilterState;
}) {
  const visibleProducts = useMemo(() => filterProducts(products, filters), [filters]);
  const activeFilters = Object.entries(filters).filter(([, value]) => value !== undefined && value !== '' && value !== false);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6 text-sm text-text-secondary">
        <Link href="/">Home</Link> <span>&gt;</span> <span>{title}</span>
      </div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-4xl">{title}</h1>
          <p className="mt-1 text-text-secondary">Showing {visibleProducts.length} laboratory-certified products</p>
        </div>
        <Link
          className="inline-flex h-10 items-center rounded-md border border-brand-primary px-4 text-sm font-semibold text-brand-primary lg:hidden"
          href="/products?labVerified=true"
        >
          Filters
        </Link>
      </div>
      {activeFilters.length ? (
        <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
          {activeFilters.map(([key, value]) => (
            <Badge key={key} variant="info">
              {key}: {String(value)}
            </Badge>
          ))}
        </div>
      ) : null}
      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <div className="hidden lg:block">
          <FilterPanel filters={filters} />
        </div>
        {visibleProducts.length ? (
          <ProductGrid priorityCount={4} products={visibleProducts} />
        ) : (
          <EmptyState
            action="Clear Filters"
            href="/products"
            icon={Search}
            message="No products found matching your filters."
            title="No matching products"
          />
        )}
      </div>
    </div>
  );
}

export function ProductDetailScreen({ slug }: { slug: string }) {
  const product = findProduct(slug) ?? products[0];
  const [selectedImage, setSelectedImage] = useState(product.images[0]);
  const [quantity, setQuantity] = useState(1);
  const [tab, setTab] = useState('description');
  const addItem = useCartStore((state) => state.addItem);
  const addToast = useUiStore((state) => state.addToast);
  const toggleWishlist = useWishlistStore((state) => state.toggle);
  const report = labReports.find((item) => item.id === product.labReportId);
  const similar = products.filter((item) => item.id !== product.id).slice(0, 4);

  const addToCart = () => {
    addItem(product, quantity);
    addToast({ type: 'success', title: 'Added to cart', message: product.name, actionLabel: 'View cart', actionHref: '/cart' });
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6 text-sm text-text-secondary">
        <Link href="/">Home</Link> <span>&gt;</span> <Link href={`/category/${product.category}`}>{product.category}</Link> <span>&gt;</span>{' '}
        <span>{product.name}</span>
      </div>
      <div className="grid gap-8 lg:grid-cols-[1fr_0.8fr]">
        <div>
          <div className="relative aspect-square overflow-hidden rounded-lg border border-surface-border bg-surface-raised">
            <Image alt={selectedImage.alt} className="object-cover" fill priority src={selectedImage.url} />
          </div>
          <div className="mt-3 flex gap-3">
            {product.images.map((image) => (
              <button
                key={image.id}
                className="relative h-20 w-20 overflow-hidden rounded-md border border-surface-border"
                onClick={() => setSelectedImage(image)}
              >
                <Image alt={image.alt} className="object-cover" fill src={image.url} />
              </button>
            ))}
          </div>
        </div>
        <section>
          <Link className="text-sm font-semibold uppercase text-text-muted" href={`/products?brand=${product.brand}`}>
            {product.brand}
          </Link>
          <h1 className="mt-2 font-heading text-4xl">{product.name}</h1>
          <div className="mt-3 flex flex-wrap gap-2">
            {product.certifications.map((certification) => (
              <Badge key={certification} variant="info">
                {certification}
              </Badge>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Rating count={product.reviewCount} rating={product.rating} />
            <a className="text-sm font-semibold text-brand-primary" href="#reviews">
              Write a Review
            </a>
          </div>
          <div className="mt-5 flex flex-wrap items-end gap-3">
            <span className="text-3xl font-semibold text-brand-primary">{formatCurrency(product.price)}</span>
            <span className="text-lg text-text-muted line-through">{formatCurrency(product.mrp)}</span>
            <Badge variant="sale">{product.discount}% off</Badge>
          </div>
          <div className="mt-5 rounded-lg border border-brand-primary bg-brand-light p-4">
            <div className="flex items-center gap-2 font-semibold text-brand-primary">
              <ShieldCheck aria-hidden="true" className="h-5 w-5" />
              {product.isLabVerified ? 'Lab Verified Authentic' : verificationLabels[product.verificationStatus]}
            </div>
            <p className="mt-2 text-sm text-text-secondary">
              Batch #{product.batchId}. {report?.summary ?? 'Lab report will be available after testing.'}
            </p>
          </div>
          <div className="mt-6 flex items-center gap-4">
            <label className="text-sm font-semibold text-text-secondary" htmlFor="qty">
              Quantity
            </label>
            <div className="flex items-center rounded-md border border-surface-border">
              <Button size="icon" variant="ghost" onClick={() => setQuantity(Math.max(1, quantity - 1))}>
                -
              </Button>
              <input id="qty" className="h-10 w-10 text-center outline-none" readOnly value={quantity} />
              <Button size="icon" variant="ghost" onClick={() => setQuantity(Math.min(product.stockCount || 1, quantity + 1))}>
                +
              </Button>
            </div>
            <span className={product.inStock ? 'text-sm font-semibold text-text-success' : 'text-sm font-semibold text-text-danger'}>
              {product.inStock ? `${product.stockCount} in stock` : 'Currently unavailable'}
            </span>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
            <Button disabled={!product.inStock} size="lg" onClick={addToCart}>
              Add to Cart
            </Button>
            <Link href="/checkout/address">
              <Button className="w-full" disabled={!product.inStock} size="lg" variant="outline">
                Buy Now
              </Button>
            </Link>
            <Button aria-label="Add to wishlist" size="icon" variant="ghost" onClick={() => toggleWishlist(product.id)}>
              <Heart aria-hidden="true" className="h-5 w-5" />
            </Button>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {['Free Shipping', 'Easy Returns', 'Secure Payment'].map((item) => (
              <div key={item} className="rounded-md bg-surface-raised p-3 text-sm font-semibold">
                <CheckCircle2 aria-hidden="true" className="mb-2 h-4 w-4 text-brand-primary" />
                {item}
              </div>
            ))}
          </div>
        </section>
      </div>
      <section className="mt-10 rounded-lg border border-surface-border bg-surface-base">
        <div className="flex overflow-x-auto border-b border-surface-border">
          {['description', 'ingredients', 'benefits', 'lab report', 'reviews'].map((item) => (
            <button
              key={item}
              className={`px-5 py-4 text-sm font-semibold capitalize ${tab === item ? 'text-brand-primary' : 'text-text-secondary'}`}
              onClick={() => setTab(item)}
            >
              {item}
            </button>
          ))}
        </div>
        <div className="p-6">
          {tab === 'description' ? <p className="max-w-3xl text-text-secondary">{product.description}</p> : null}
          {tab === 'ingredients' ? <ul className="list-inside list-disc text-text-secondary">{product.ingredients?.map((item) => <li key={item}>{item}</li>)}</ul> : null}
          {tab === 'benefits' ? <ul className="grid gap-2 text-text-secondary">{product.benefits.map((item) => <li key={item}>- {item}</li>)}</ul> : null}
          {tab === 'lab report' ? (
            <div className="grid gap-4 md:grid-cols-3">
              {product.labMetrics.length ? (
                product.labMetrics.map((metric) => (
                  <div key={metric.label} className="rounded-md border border-surface-border p-4">
                    <p className="text-sm text-text-secondary">{metric.label}</p>
                    <p className="mt-1 font-semibold">{metric.value}</p>
                  </div>
                ))
              ) : (
                <p className="text-text-secondary">Lab report will be available after testing.</p>
              )}
            </div>
          ) : null}
          {tab === 'reviews' ? (
            <div id="reviews" className="grid gap-4">
              {reviews.map((review) => (
                <article key={review.id} className="rounded-md border border-surface-border p-4">
                  <Rating rating={review.rating} />
                  <h3 className="mt-2 font-semibold">{review.title}</h3>
                  <p className="mt-1 text-sm text-text-secondary">{review.body}</p>
                </article>
              ))}
            </div>
          ) : null}
        </div>
      </section>
      <section className="mt-12">
        <SectionHeading title="Similar Verified Products" />
        <ProductGrid products={similar} />
      </section>
    </div>
  );
}

export function CartScreen() {
  const items = useCartStore((state) => state.items);

  if (!items.length) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-12">
        <EmptyState
          action="Start Shopping"
          href="/products"
          icon={ShoppingBag}
          message="Your cart feels light. Browse lab-verified staples and add a few favorites."
          title="Your cart is empty"
        />
      </div>
    );
  }

  return (
    <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 lg:grid-cols-[1fr_360px]">
      <section>
        <h1 className="mb-6 font-heading text-4xl">Your Shopping Cart</h1>
        <div className="grid gap-4">
          {items.map((item) => (
            <CartItemRow key={`${item.product.id}-${item.variantId ?? 'base'}`} item={item} />
          ))}
        </div>
      </section>
      <OrderSummary />
    </div>
  );
}

export function CheckoutAddressScreen() {
  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
      <section className="rounded-lg border border-surface-border bg-surface-base p-6">
        <Stepper active={0} steps={['Address', 'Payment', 'Confirmation']} />
        <h1 className="mt-8 font-heading text-3xl">Select delivery address</h1>
        <div className="mt-5 grid gap-3">
          {addresses.map((address) => (
            <label key={address.id} className="flex gap-3 rounded-md border border-surface-border p-4">
              <input defaultChecked={address.isDefault} name="address" type="radio" />
              <span>
                <strong>{address.fullName}</strong>
                <span className="mt-1 block text-sm text-text-secondary">
                  {address.addressLine1}, {address.city}, {address.state} - {address.pincode}
                </span>
              </span>
            </label>
          ))}
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <Input label="Full name" placeholder="Asha Verma" />
          <Input label="Phone" placeholder="9876543210" />
          <Input label="Pincode" placeholder="560001" />
          <Input label="City" placeholder="Bengaluru" />
          <Input className="md:col-span-2" label="Address line 1" placeholder="Flat / house / street" />
        </div>
        <Link className="mt-6 inline-block" href="/checkout/payment">
          <Button size="lg">Continue to Payment</Button>
        </Link>
      </section>
      <OrderSummary checkoutHref="/checkout/payment" />
    </div>
  );
}

export function CheckoutPaymentScreen() {
  const [method, setMethod] = useState('UPI');
  const totals = useCartStore((state) => state.totals());

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
      <section className="rounded-lg border border-surface-border bg-surface-base p-6">
        <Stepper active={1} steps={['Address', 'Payment', 'Confirmation']} />
        <h1 className="mt-8 font-heading text-3xl">Choose payment mode</h1>
        <div className="mt-6 grid gap-4 md:grid-cols-[220px_1fr]">
          <div className="grid gap-2">
            {['UPI', 'Cards', 'Net Banking', 'Cash on Delivery'].map((item) => (
              <button
                key={item}
                className={`rounded-md border px-4 py-3 text-left font-semibold ${method === item ? 'border-brand-primary bg-brand-light text-brand-primary' : 'border-surface-border'}`}
                onClick={() => setMethod(item)}
              >
                {item}
              </button>
            ))}
          </div>
          <div className="rounded-md bg-surface-raised p-5">
            <h2 className="font-semibold">{method}</h2>
            {method === 'UPI' ? <Input className="mt-4" label="UPI ID" placeholder="name@upi" /> : null}
            {method === 'Cards' ? (
              <div className="mt-4 grid gap-4">
                <Input label="Card number" placeholder="4111 1111 1111 1111" />
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Expiry" placeholder="MM/YY" />
                  <Input label="CVV" placeholder="123" />
                </div>
              </div>
            ) : null}
            {method === 'Net Banking' ? <Input className="mt-4" label="Bank" placeholder="Select bank" /> : null}
            {method === 'Cash on Delivery' ? <p className="mt-4 text-sm text-text-secondary">Cash on Delivery available for this address.</p> : null}
            <p className="mt-5 text-sm text-text-secondary">Payments secured by Razorpay. Mock payment for prototype.</p>
            <Link className="mt-5 inline-block" href="/checkout/confirm">
              <Button size="lg">Pay {formatCurrency(totals.total)}</Button>
            </Link>
          </div>
        </div>
      </section>
      <OrderSummary checkoutHref="/checkout/confirm" />
    </div>
  );
}

export function CheckoutConfirmScreen() {
  return (
    <section className="mx-auto max-w-3xl rounded-lg border border-surface-border bg-surface-base p-8 text-center">
      <Stepper active={2} steps={['Address', 'Payment', 'Confirmation']} />
      <CheckCircle2 aria-hidden="true" className="mx-auto mt-10 h-16 w-16 text-text-success" />
      <h1 className="mt-5 font-heading text-4xl">Your order is confirmed!</h1>
      <p className="mt-3 text-text-secondary">Order ID <span className="font-mono">TRZ-2026-1042</span> has been placed successfully.</p>
      <div className="mt-8 flex justify-center gap-3">
        <Link className="inline-flex h-10 items-center rounded-md bg-brand-primary px-4 text-sm font-semibold text-text-inverse" href="/account/orders/TRZ-2026-1042">
          Track Order
        </Link>
        <Link className="inline-flex h-10 items-center rounded-md border border-brand-primary px-4 text-sm font-semibold text-brand-primary" href="/">
          Continue Shopping
        </Link>
      </div>
    </section>
  );
}

export function SearchScreen({ query }: { query?: string }) {
  return (
    <ProductListingScreen
      filters={{ query, sort: 'relevance' }}
      title={query ? `Search results for "${query}"` : 'Search verified products'}
    />
  );
}

export function AccountScreen() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="font-heading text-4xl">Your Account</h1>
      <div className="mt-6 grid gap-6 lg:grid-cols-[0.7fr_1fr]">
        <section className="rounded-lg border border-surface-border bg-surface-base p-6">
          <div className="flex items-center gap-4">
            <span className="grid h-16 w-16 place-items-center rounded-full bg-brand-light text-2xl font-semibold text-brand-primary">
              AV
            </span>
            <div>
              <h2 className="font-heading text-2xl">Asha Verma</h2>
              <p className="text-text-secondary">customer@truzov.test</p>
            </div>
          </div>
          <div className="mt-6 grid grid-cols-3 gap-3 text-center">
            <div className="rounded-md bg-surface-raised p-3"><strong>{orders.length}</strong><span className="block text-xs text-text-muted">Orders</span></div>
            <div className="rounded-md bg-surface-raised p-3"><strong>4</strong><span className="block text-xs text-text-muted">Wishlist</span></div>
            <div className="rounded-md bg-surface-raised p-3"><strong>{addresses.length}</strong><span className="block text-xs text-text-muted">Addresses</span></div>
          </div>
        </section>
        <section>
          <SectionHeading title="Recent orders" />
          <div className="grid gap-3">
            {orders.map((order) => (
              <Link key={order.id} className="rounded-md border border-surface-border bg-surface-base p-4 shadow-xs" href={`/account/orders/${order.id}`}>
                <div className="flex justify-between gap-3">
                  <strong>{order.id}</strong>
                  <Badge variant="info">{order.status}</Badge>
                </div>
                <p className="mt-1 text-sm text-text-secondary">{order.items.length} item(s) - {formatCurrency(order.total)}</p>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

export function OrdersScreen() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="font-heading text-4xl">Your Orders</h1>
      <div className="mt-6 grid gap-4">
        {orders.map((order) => (
          <article key={order.id} className="rounded-lg border border-surface-border bg-surface-base p-5">
            <div className="flex flex-wrap justify-between gap-3">
              <div>
                <h2 className="font-semibold">{order.id}</h2>
                <p className="text-sm text-text-secondary">{new Date(order.createdAt).toLocaleDateString('en-IN')}</p>
              </div>
              <Badge variant="info">{order.status}</Badge>
            </div>
            <div className="mt-4 flex items-center justify-between gap-4">
              <p className="text-sm text-text-secondary">{order.items.map((item) => item.product.name).join(', ')}</p>
              <Link className="font-semibold text-brand-primary" href={`/account/orders/${order.id}`}>View Order</Link>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

export function OrderDetailScreen({ id }: { id: string }) {
  const order = findOrder(id);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="font-heading text-4xl">Order {order.id}</h1>
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        <section className="grid gap-4">
          {order.items.map((item) => (
            <CartItemRow key={item.product.id} item={item} />
          ))}
          <div className="rounded-lg border border-surface-border bg-surface-base p-5">
            <h2 className="font-semibold">Timeline</h2>
            <div className="mt-4 grid gap-3 text-sm text-text-secondary">
              {['Confirmed', 'Processing', 'Shipped', 'Delivered'].map((step, index) => (
                <div key={step} className="flex items-center gap-3">
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-brand-light text-brand-primary">{index + 1}</span>
                  {step}
                </div>
              ))}
            </div>
          </div>
        </section>
        <aside className="rounded-lg border border-surface-border bg-surface-base p-5">
          <Badge variant="info">{order.status}</Badge>
          <p className="mt-4 text-sm text-text-secondary">Delivering to</p>
          <p className="font-semibold">{order.address.fullName}</p>
          <p className="text-sm text-text-secondary">{order.address.addressLine1}, {order.address.city}</p>
          <p className="mt-4 text-2xl font-semibold">{formatCurrency(order.total)}</p>
          <Button className="mt-5 w-full" variant="outline">Download Invoice</Button>
        </aside>
      </div>
    </div>
  );
}

export function AddressesScreen() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="font-heading text-4xl">Saved Addresses</h1>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {addresses.map((address) => (
          <article key={address.id} className="rounded-lg border border-surface-border bg-surface-base p-5">
            <MapPin aria-hidden="true" className="h-5 w-5 text-brand-primary" />
            <h2 className="mt-3 font-semibold">{address.fullName}</h2>
            <p className="mt-1 text-sm text-text-secondary">{address.addressLine1}, {address.city}, {address.state} - {address.pincode}</p>
            {address.isDefault ? <Badge className="mt-4" variant="success">Default</Badge> : null}
          </article>
        ))}
      </div>
    </div>
  );
}

export function WishlistScreen() {
  const ids = useWishlistStore((state) => state.ids);
  const wishlistProducts = products.filter((product) => ids.includes(product.id));

  if (!wishlistProducts.length) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-12">
        <EmptyState action="Browse Products" href="/products" icon={Heart} message="Save products you love and compare lab reports later." title="Save items you love" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="mb-6 font-heading text-4xl">Wishlist</h1>
      <ProductGrid products={wishlistProducts} />
    </div>
  );
}

export function TrustHowItWorksScreen() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      <h1 className="max-w-3xl font-heading text-5xl">Verification before checkout confidence.</h1>
      <p className="mt-4 max-w-2xl text-text-secondary">
        Truzov combines Amazon-like shopping speed with a transparent verification workflow for health, organic, and wellness products.
      </p>
      <div className="mt-10 grid gap-5 md:grid-cols-4">
        {[
          [PackageCheck, 'Vendor submits product and compliance documents'],
          [ClipboardCheck, 'Samples are collected and assigned to partner labs'],
          [ShieldCheck, 'Reports are reviewed against product claims'],
          [Truck, 'Approved batches go live with report excerpts'],
        ].map(([Icon, text], index) => (
          <article key={text as string} className="rounded-lg border border-surface-border bg-surface-base p-5">
            <Icon aria-hidden="true" className="h-8 w-8 text-brand-primary" />
            <h2 className="mt-4 font-heading text-2xl">Step {index + 1}</h2>
            <p className="mt-2 text-sm text-text-secondary">{text as string}</p>
          </article>
        ))}
      </div>
    </div>
  );
}

export function LabReportsScreen() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      <h1 className="font-heading text-5xl">Lab Reports</h1>
      <p className="mt-3 text-text-secondary">Customer-facing excerpts from every available batch report.</p>
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {labReports.map((report) => {
          const product = products.find((item) => item.id === report.productId) as Product;

          return (
            <article key={report.id} className="rounded-lg border border-surface-border bg-surface-base p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="font-heading text-2xl">{product.name}</h2>
                  <p className="text-sm text-text-secondary">Batch #{report.batchId} - {report.labName}</p>
                </div>
                <Badge variant={report.status === 'pass' ? 'success' : 'info'}>{report.status}</Badge>
              </div>
              <div className="mt-5 grid gap-3">
                {report.metrics.map((metric) => (
                  <div key={metric.label} className="flex justify-between rounded-md bg-surface-raised p-3 text-sm">
                    <span>{metric.label}</span>
                    <strong>{metric.value}</strong>
                  </div>
                ))}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
