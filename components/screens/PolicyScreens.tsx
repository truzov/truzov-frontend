'use client';

import React, { useState } from 'react';
import { RotateCcw, Truck, ShieldCheck, FileText } from 'lucide-react';

interface PolicySection {
  id: string;
  title: string;
  content: React.ReactNode;
}

interface PolicyLayoutProps {
  title: string;
  lastUpdated: string;
  icon: React.ComponentType<{ className?: string }>;
  sections: PolicySection[];
}

export function PolicyLayout({ title, lastUpdated, icon: Icon, sections }: PolicyLayoutProps) {
  const [activeSection, setActiveSection] = useState(sections[0]?.id || '');

  const scrollToSection = (id: string) => {
    setActiveSection(id);
    const element = document.getElementById(id);
    if (element) {
      const headerOffset = 140; // navigation bar height offset
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.scrollY - headerOffset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFDFB] font-body text-text-primary">
      {/* Hero Header */}
      <div className="relative border-b border-surface-border bg-gradient-to-r from-brand-light/40 via-[#FDFDFB] to-brand-light/20 py-12 md:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center text-center md:flex-row md:items-start md:text-left gap-6 md:gap-8">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-brand-primary/20 bg-white text-brand-primary shadow-xs">
              <Icon className="h-8 w-8" />
            </div>
            <div>
              <h1 className="font-heading text-4xl font-bold tracking-tight text-text-primary md:text-5xl">
                {title}
              </h1>
              <p className="mt-2 text-sm text-text-secondary">
                Last updated: <span className="font-medium text-brand-primary">{lastUpdated}</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content Layout */}
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[280px_1fr]">
          {/* Sidebar Table of Contents */}
          <aside className="hidden lg:block">
            <div className="sticky top-36">
              <h2 className="text-xs font-bold uppercase tracking-wider text-text-muted mb-4">
                Table of Contents
              </h2>
              <nav className="flex flex-col gap-1 border-l border-surface-border">
                {sections.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => scrollToSection(section.id)}
                    className={`block border-l-2 py-2 pl-4 pr-3 text-left text-sm font-semibold transition-all ${
                      activeSection === section.id
                        ? 'border-brand-primary text-brand-primary bg-brand-light/30'
                        : 'border-transparent text-text-secondary hover:border-surface-border hover:text-text-primary'
                    }`}
                  >
                    {section.title}
                  </button>
                ))}
              </nav>
            </div>
          </aside>

          {/* Main Policy Content */}
          <main className="space-y-8">
            {sections.map((section) => (
              <section
                key={section.id}
                id={section.id}
                className="scroll-mt-36 rounded-2xl border border-surface-border bg-white p-6 md:p-8 shadow-xs transition-shadow hover:shadow-sm"
              >
                <h2 className="font-heading text-2xl font-bold text-text-primary border-b border-surface-border/50 pb-3 mb-5">
                  {section.title}
                </h2>
                <div className="prose max-w-none text-text-secondary leading-relaxed space-y-4 text-[15px]">
                  {section.content}
                </div>
              </section>
            ))}
          </main>
        </div>
      </div>
    </div>
  );
}

export function RefundPolicyScreen() {
  const sections: PolicySection[] = [
    {
      id: 'overview',
      title: 'Overview',
      content: (
        <>
          <p>
            Truzov is India&apos;s first verification-led health and wellness marketplace. We prioritize customer confidence, product purity, and clinical integrity above all else. This Refund Policy describes our return and exchange guidelines to ensure a transparent, secure, and hassle-free post-purchase experience.
          </p>
          <p>
            By purchasing on Truzov, you agree to the conditions outlined in this policy. If you have any concerns regarding a specific order, our customer care team is available 24/7 to assist.
          </p>
        </>
      ),
    },
    {
      id: 'verification-guarantee',
      title: 'Verification Guarantee',
      content: (
        <>
          <p>
            We back every product listed on Truzov with our strict <strong>Verification & Authenticity Guarantee</strong>. Since each batch undergoes rigorous laboratory checks before being approved for sale, we hold ourselves and our vendors to the highest standards.
          </p>
          <p className="rounded-lg border border-brand-primary/20 bg-brand-light/25 p-4 text-text-success font-medium">
            🛡️ If any batch you purchase fails our stated quality metrics, purity reports, or is found to contain unauthorized pesticides, additives, or heavy metals, you are entitled to a full 100% refund, including return shipping costs.
          </p>
        </>
      ),
    },
    {
      id: 'return-window',
      title: '14-Day Return Window',
      content: (
        <>
          <p>
            Truzov provides a <strong>14-day return window</strong> from the date of package delivery. To be eligible for a refund or replacement, the return request must be filed through your account dashboard within 14 calendar days.
          </p>
          <p>
            After the 14-day window has expired, we unfortunately cannot offer a refund or exchange, except in documented cases of hidden quality defects verified by laboratory analysis.
          </p>
        </>
      ),
    },
    {
      id: 'eligibility',
      title: 'Eligibility Criteria',
      content: (
        <>
          <p>To ensure hygiene, product safety, and traceability, items returned must meet the following criteria:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>The product must be in its original, unopened packaging with the Truzov batch verification seal intact.</li>
            <li>All accompanying accessories, labels, booklets, or promotional gifts must be returned in their original condition.</li>
            <li>
              <strong>Temperature-Sensitive Items:</strong> Products like live probiotics, cold-pressed oils, or enzymatic honeys that require temperature control cannot be returned for change of mind. They can only be returned if they arrive damaged or fail quality verification.
            </li>
          </ul>
        </>
      ),
    },
    {
      id: 'process',
      title: 'How to Initiate a Return',
      content: (
        <>
          <p>Initiating a return is simple:</p>
          <ol className="list-decimal pl-5 space-y-2">
            <li>Go to your <strong>Account Dashboard</strong> and click on the <strong>Orders & Returns</strong> section.</li>
            <li>Select the order containing the item you wish to return and click <strong>Request Return</strong>.</li>
            <li>Upload a photo of the product, showcasing the intact batch verification seal and packaging.</li>
            <li>Select the reason for return and choose between a refund or a replacement.</li>
          </ol>
          <p>
            Once submitted, our trust assurance team will review and approve the request within 24 hours. A logistics partner will be scheduled to pick up the package from your doorstep.
          </p>
        </>
      ),
    },
    {
      id: 'refunds',
      title: 'Refund Processing',
      content: (
        <>
          <p>
            Once your returned package is received and inspected at our verification center, we will send you an email confirmation. Upon approval, your refund will be processed:
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong>Original Payment Method:</strong> Refunded to your debit/credit card, UPI, or net banking account within 5-7 business days.
            </li>
            <li>
              <strong>Truzov Store Credits:</strong> Credited to your account instantly with an additional <strong>5% bonus credit</strong> as a token of our appreciation.
            </li>
          </ul>
        </>
      ),
    },
  ];

  return (
    <PolicyLayout
      title="Refund Policy"
      lastUpdated="June 26, 2026"
      icon={RotateCcw}
      sections={sections}
    />
  );
}

export function ShippingPolicyScreen() {
  const sections: PolicySection[] = [
    {
      id: 'rates',
      title: 'Shipping Rates & Free Shipping',
      content: (
        <>
          <p>
            We aim to deliver your verified health essentials safely and swiftly. Truzov offers simple and transparent shipping structures:
          </p>
          <div className="grid gap-4 sm:grid-cols-2 mt-2">
            <div className="rounded-xl border border-surface-border bg-[#FDFDFB] p-4 text-center">
              <p className="text-xs font-bold uppercase tracking-wider text-text-muted">Orders Above ₹999</p>
              <p className="text-2xl font-bold text-text-success mt-1">FREE</p>
              <p className="text-xs text-text-secondary mt-1">Standard Doorstep Delivery</p>
            </div>
            <div className="rounded-xl border border-surface-border bg-[#FDFDFB] p-4 text-center">
              <p className="text-xs font-bold uppercase tracking-wider text-text-muted">Orders Under ₹999</p>
              <p className="text-2xl font-bold text-text-primary mt-1">₹99</p>
              <p className="text-xs text-text-secondary mt-1">Flat Rate Shipping Fee</p>
            </div>
          </div>
        </>
      ),
    },
    {
      id: 'timelines',
      title: 'Delivery Timelines',
      content: (
        <>
          <p>
            Truzov ships to over 19,000 pin codes across India. All orders are processed at our verified vendor hubs within 12-24 hours.
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong>Metro Cities (Delhi-NCR, Mumbai, Bengaluru, Chennai, Pune, Kolkata, Hyderabad):</strong> Delivery within 24 to 48 hours.
            </li>
            <li>
              <strong>Tier 2 & Tier 3 Cities:</strong> Delivery within 3 to 5 business days.
            </li>
            <li>
              <strong>Northeast India & J&K:</strong> Delivery within 5 to 7 business days.
            </li>
          </ul>
        </>
      ),
    },
    {
      id: 'cold-chain',
      title: 'Cold-Chain & Bio-Preservation',
      content: (
        <>
          <p>
            To prevent denaturing of enzymes, vitamins, and active cultures, Truzov employs specialized <strong>Cold-Chain Shipping</strong> for designated sensitive categories:
          </p>
          <p>
            Probiotics, raw active honeys, and organic cold-pressed oils are shipped in multi-layer insulated envelopes with reusable food-grade ice gel packs. This preserves the absolute bio-potency of your supplements during transit, even in peak summer months, at no extra cost to you.
          </p>
        </>
      ),
    },
    {
      id: 'tracking',
      title: 'Order Tracking',
      content: (
        <>
          <p>
            Transparency is our core value. The moment your package leaves our fulfillment center:
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li>You will receive an automated SMS and email containing a tracking number and a live map link.</li>
            <li>You can monitor your shipment status in real-time from the <strong>Orders</strong> section under your account dashboard.</li>
            <li>Out-of-delivery notifications will be shared on the morning of delivery.</li>
          </ul>
        </>
      ),
    },
    {
      id: 'package-security',
      title: 'Tamper-Proof Tape & Security',
      content: (
        <>
          <p>
            All Truzov packages are sealed using our signature green, tamper-evident security tape.
          </p>
          <p className="rounded-lg border border-brand-primary/20 bg-brand-light/25 p-4 text-brand-primary font-medium">
            ⚠️ IMPORTANT: Please do not accept the package from the delivery executive if the Truzov security tape is broken, torn, or shows signs of re-taping. Report it immediately to support@truzov.com to receive a priority replacement order.
          </p>
        </>
      ),
    },
  ];

  return (
    <PolicyLayout
      title="Shipping Policy"
      lastUpdated="June 26, 2026"
      icon={Truck}
      sections={sections}
    />
  );
}

export function PrivacyPolicyScreen() {
  const sections: PolicySection[] = [
    {
      id: 'collection',
      title: 'Information We Collect',
      content: (
        <>
          <p>
            Truzov is committed to protecting your personal data and respect for your digital privacy. We collect:
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong>Profile & Contact Information:</strong> Name, email address, delivery and billing addresses, and phone number when you register an account.
            </li>
            <li>
              <strong>Transaction Details:</strong> Payment history, order items, and delivery preferences. Note: Card and banking information is processed directly by PCI-DSS compliant secure gateways; we do not store raw credentials.
            </li>
            <li>
              <strong>Verification Preference Profile:</strong> Your choice of allergies, dietary choices, and health goals to help customize product listings.
            </li>
          </ul>
        </>
      ),
    },
    {
      id: 'usage',
      title: 'How We Use Your Information',
      content: (
        <>
          <p>We utilize the gathered information to:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>Efficiently process, verify, and deliver your marketplace orders.</li>
            <li>Coordinate specific batch laboratory report checks with ISO certified labs.</li>
            <li>Send order statuses, compliance updates, and security alerts.</li>
            <li>Provide personalized verification indicators on products based on your preferences.</li>
          </ul>
        </>
      ),
    },
    {
      id: 'sharing',
      title: 'Third-Party Data Sharing',
      content: (
        <>
          <p>
            Your trust is our primary asset. Truzov does <strong>not sell, trade, or rent</strong> your personal information to marketing databases. We only share essential metadata with:
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong>Logistics Carriers:</strong> To execute package deliveries.
            </li>
            <li>
              <strong>Payment Processors:</strong> To process secure transactions.
            </li>
            <li>
              <strong>Compliance Labs:</strong> Anonymized batch feedback to authenticate vendor certifications.
            </li>
          </ul>
        </>
      ),
    },
    {
      id: 'cookies',
      title: 'Cookies & Tracking',
      content: (
        <>
          <p>
            We use technical cookies to store session states, maintain items inside your cart, and preserve wishlist selections. You can adjust your browser settings to decline cookies; however, some core parts of the shopping process will be unavailable.
          </p>
        </>
      ),
    },
    {
      id: 'security-rights',
      title: 'Data Security & Your Rights',
      content: (
        <>
          <p>
            We implement state-of-the-art secure socket layers (SSL/TLS) and 256-bit AES encryption to protect user data from unauthorized access or breaches.
          </p>
          <p>
            You have the right to request a copy of your stored personal details, modify inaccuracies, or ask for complete deletion of your account. Contact us at <strong>privacy@truzov.com</strong> to exercise your rights.
          </p>
        </>
      ),
    },
  ];

  return (
    <PolicyLayout
      title="Privacy Policy"
      lastUpdated="June 26, 2026"
      icon={ShieldCheck}
      sections={sections}
    />
  );
}

export function TermsOfServiceScreen() {
  const sections: PolicySection[] = [
    {
      id: 'acceptance',
      title: 'Acceptance of Terms',
      content: (
        <>
          <p>
            Welcome to Truzov. These Terms of Service govern your use of the website, mobile site, and services hosted by Truzov Verification Health.
          </p>
          <p>
            By accessing or placing an order on our platform, you acknowledge that you have read, understood, and agreed to be bound by these terms. If you do not agree, please do not use the services.
          </p>
        </>
      ),
    },
    {
      id: 'marketplace',
      title: 'Verification Marketplace Role',
      content: (
        <>
          <p>
            Truzov operates a curation platform connecting health-conscious buyers to verified vendors.
          </p>
          <p>
            While Truzov conducts independent lab testing on random batch samples, the primary legal liability for product weights, manufacturing compliance, FSSAI licensing, and advertising claims resides with the respective third-party vendor listed on the product page.
          </p>
        </>
      ),
    },
    {
      id: 'disclaimer',
      title: 'Accuracy of Lab Reports & Medical Disclaimer',
      content: (
        <>
          <p>
            Lab verification excerpts and metrics represent tests conducted on specific batches. These metrics are meant to provide transparency and are <strong>not a substitute for professional medical advice, diagnosis, or treatment</strong>.
          </p>
          <p>
            Consult your healthcare professional before starting any supplement or changing your diet based on the products purchased here.
          </p>
        </>
      ),
    },
    {
      id: 'obligations',
      title: 'User Accounts & Obligations',
      content: (
        <>
          <p>
            You must be at least 18 years of age to establish a Truzov account. You are responsible for keeping your login credentials confidential.
          </p>
          <p>
            Any attempt to bypass security, scrap laboratory databases, upload malicious code, or post fraudulent reviews is subject to account termination and legal action.
          </p>
        </>
      ),
    },
    {
      id: 'liability',
      title: 'Limitation of Liability',
      content: (
        <>
          <p>
            Truzov Verification Health, its directors, and employees shall not be liable for any indirect, incidental, or consequential damages resulting from product usage. Our total liability for any claim shall not exceed the amount paid by the customer for the product under dispute.
          </p>
        </>
      ),
    },
  ];

  return (
    <PolicyLayout
      title="Terms of Service"
      lastUpdated="June 26, 2026"
      icon={FileText}
      sections={sections}
    />
  );
}
