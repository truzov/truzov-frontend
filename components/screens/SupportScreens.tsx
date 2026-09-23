'use client';

import { useState } from 'react';
import {
  BadgeCheck,
  Building2,
  Check,
  Clock,
  Headphones,
  Mail,
  Phone,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

/**
 * Customer and Seller support pages (§ support). Styled to match PolicyLayout's hero + the
 * app's brand tokens.
 *
 * ponytail: the forms are UI-only — submit shows a success card and does not POST anywhere.
 * Wire `onSubmit` to the real endpoint (or an email service) once that exists; nothing else
 * here needs to change.
 */

const FIELD_CLASS =
  'rounded-sm border border-surface-border bg-surface-base px-3 py-2.5 text-base text-text-primary shadow-xs outline-none transition focus:border-brand-primary focus:ring-2 focus:ring-brand-light';

function SupportHero({
  icon: Icon,
  eyebrow,
  title,
  subtitle,
}: {
  icon: React.ComponentType<{ className?: string }>;
  eyebrow: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="relative border-b border-surface-border bg-gradient-to-r from-brand-light/40 via-[#FDFDFB] to-brand-light/20 py-12 md:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center gap-6 text-center md:flex-row md:items-start md:gap-8 md:text-left">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-brand-primary/20 bg-white text-brand-primary shadow-xs">
            <Icon className="h-8 w-8" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-brand-primary">
              {eyebrow}
            </p>
            <h1 className="mt-1 font-heading text-4xl font-bold tracking-tight text-text-primary md:text-5xl">
              {title}
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-relaxed text-text-secondary">{subtitle}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function FieldLabel({ label, required }: { label: string; required?: boolean }) {
  return (
    <span className="text-sm font-medium text-text-secondary">
      {label}
      {required ? <span className="text-text-danger"> *</span> : null}
    </span>
  );
}

function SuccessCard({ heading, body, onReset }: { heading: string; body: string; onReset: () => void }) {
  return (
    <div className="rounded-3xl border border-surface-border bg-surface-base p-8 text-center shadow-sm">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-brand-light text-brand-primary">
        <Check className="h-7 w-7" />
      </div>
      <h2 className="mt-4 font-heading text-2xl text-text-primary">{heading}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-text-secondary">{body}</p>
      <Button className="mt-6" variant="outline" onClick={onReset}>
        Submit another request
      </Button>
    </div>
  );
}

function InfoPanel({
  title,
  points,
  contact,
}: {
  title: string;
  points: { icon: React.ComponentType<{ className?: string }>; label: string; text: string }[];
  contact?: boolean;
}) {
  return (
    <aside className="grid h-fit gap-6 rounded-3xl border border-surface-border bg-surface-base p-6 shadow-sm lg:p-8">
      <h2 className="font-heading text-xl text-text-primary">{title}</h2>
      <ul className="grid gap-5">
        {points.map((point) => (
          <li key={point.label} className="flex gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-light text-brand-primary">
              <point.icon className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-semibold text-text-primary">{point.label}</p>
              <p className="mt-0.5 text-sm leading-relaxed text-text-secondary">{point.text}</p>
            </div>
          </li>
        ))}
      </ul>
      {contact ? (
        <div className="grid gap-2 border-t border-surface-border pt-5 text-sm text-text-secondary">
          <a className="flex items-center gap-2 hover:text-brand-primary" href="mailto:support@truzov.com">
            <Mail className="h-4 w-4" /> support@truzov.com
          </a>
          <a className="flex items-center gap-2 hover:text-brand-primary" href="tel:+919810000000">
            <Phone className="h-4 w-4" /> +91 98100 00000
          </a>
          <p className="flex items-center gap-2">
            <Clock className="h-4 w-4" /> Mon–Sat, 9 AM – 8 PM IST
          </p>
        </div>
      ) : null}
    </aside>
  );
}

/* -------------------------------------------------------------- customer support */

export function CustomerSupportScreen() {
  const [submitted, setSubmitted] = useState(false);

  return (
    <div className="min-h-screen bg-[#FDFDFB] font-body text-text-primary">
      <SupportHero
        icon={Headphones}
        eyebrow="Customer Support"
        title="We're here to help"
        subtitle="Questions about an order, a refund, or a product's lab report? Send us a note and our support team will get back to you."
      />
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[340px_1fr]">
          <InfoPanel
            title="Ways we can help"
            contact
            points={[
              { icon: Headphones, label: 'Orders & delivery', text: 'Track, change, or ask about an order you placed.' },
              { icon: ShieldCheck, label: 'Refunds & returns', text: 'Start a return or check where your refund is.' },
              { icon: BadgeCheck, label: 'Product & lab reports', text: 'Questions about verification, ingredients, or authenticity.' },
            ]}
          />

          {submitted ? (
            <SuccessCard
              heading="Thanks for reaching out!"
              body="Your request has been received. Our support team will get back to you within 1–2 business days."
              onReset={() => setSubmitted(false)}
            />
          ) : (
            <form
              className="grid gap-5 rounded-3xl border border-surface-border bg-surface-base p-6 shadow-sm lg:p-8"
              onSubmit={(event) => {
                event.preventDefault();
                setSubmitted(true);
              }}
            >
              <div className="grid gap-5 sm:grid-cols-2">
                <Input label="Full name" name="name" placeholder="Asha Singh" required />
                <Input label="Email" name="email" type="email" placeholder="you@example.com" required />
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <Input label="Phone (optional)" name="phone" type="tel" inputMode="tel" placeholder="9876543210" />
                <Input label="Order number (optional)" name="orderNumber" placeholder="ORD-20260101-000001" />
              </div>
              <label className="grid gap-1.5">
                <FieldLabel label="Topic" required />
                <select className={FIELD_CLASS} name="topic" defaultValue="" required>
                  <option value="" disabled>
                    Choose a topic
                  </option>
                  <option>Orders & delivery</option>
                  <option>Returns & refunds</option>
                  <option>Product quality / lab reports</option>
                  <option>Payments</option>
                  <option>My account</option>
                  <option>Something else</option>
                </select>
              </label>
              <label className="grid gap-1.5">
                <FieldLabel label="How can we help?" required />
                <textarea
                  className={FIELD_CLASS}
                  name="message"
                  rows={5}
                  placeholder="Tell us what's going on…"
                  required
                />
              </label>
              <Button className="justify-self-start px-8" size="lg" type="submit">
                Send message
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- seller support */

const SELLER_CATEGORIES = [
  'Supplements & Nutrition',
  'Ayurveda & Herbal',
  'Health Food & Drinks',
  'Sports & Fitness',
  'Personal Care',
  'Mother & Baby',
  'Wellness Devices',
  'Other',
];

export function SellerSupportScreen() {
  const [submitted, setSubmitted] = useState(false);

  return (
    <div className="min-h-screen bg-[#FDFDFB] font-body text-text-primary">
      <SupportHero
        icon={Building2}
        eyebrow="Seller Support"
        title="Sell on truzov"
        subtitle="Fill in your details to get started and join India's verification-led health marketplace. Our onboarding team will review and reach out."
      />
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[340px_1fr]">
          <InfoPanel
            title="Why sell with us"
            contact
            points={[
              { icon: BadgeCheck, label: 'Verified marketplace', text: 'Lab-backed listings build the trust that converts browsers into buyers.' },
              { icon: TrendingUp, label: 'Reach real demand', text: 'Get in front of customers who shop for authenticity, not the lowest price.' },
              { icon: ShieldCheck, label: 'Guided onboarding', text: 'We help with verification, catalogue setup, and going live.' },
            ]}
          />

          {submitted ? (
            <SuccessCard
              heading="Application received!"
              body="Thanks for your interest in selling on truzov. Our onboarding team will review your details and get in touch within 2–3 business days."
              onReset={() => setSubmitted(false)}
            />
          ) : (
            <form
              className="grid gap-5 rounded-3xl border border-surface-border bg-surface-base p-6 shadow-sm lg:p-8"
              onSubmit={(event) => {
                event.preventDefault();
                setSubmitted(true);
              }}
            >
              <div className="grid gap-5 sm:grid-cols-2">
                <Input label="Brand / company name" name="brand" placeholder="Wellness Foods Pvt. Ltd." required />
                <Input label="Contact person" name="contact" placeholder="Asha Singh" required />
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <Input label="Email" name="email" type="email" placeholder="brand@example.com" required />
                <Input label="Phone" name="phone" type="tel" inputMode="tel" placeholder="9876543210" required />
              </div>
              <label className="grid gap-1.5">
                <FieldLabel label="Primary product category" required />
                <select className={FIELD_CLASS} name="category" defaultValue="" required>
                  <option value="" disabled>
                    Select a category
                  </option>
                  {SELLER_CATEGORIES.map((category) => (
                    <option key={category}>{category}</option>
                  ))}
                </select>
              </label>
              <div className="grid gap-5 sm:grid-cols-2">
                <Input label="Website / social (optional)" name="website" placeholder="https://…" />
                <Input label="GST number (optional)" name="gstin" placeholder="22AAAAA0000A1Z5" />
              </div>
              <label className="grid gap-1.5">
                <FieldLabel label="Tell us about your brand (optional)" />
                <textarea
                  className={FIELD_CLASS}
                  name="about"
                  rows={4}
                  placeholder="What do you make, and what makes it worth verifying?"
                />
              </label>
              <Button className="justify-self-start px-8" size="lg" type="submit">
                Submit application
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
