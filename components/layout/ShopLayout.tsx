import { Footer } from './Footer';
import { Header } from './Header';
import { MobileNav } from './MobileNav';

export function ShopLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="storefront flex min-h-screen flex-col">
      <Header />
      <main id="main-content" className="flex-1">{children}</main>
      <Footer />
      <MobileNav />
    </div>
  );
}
