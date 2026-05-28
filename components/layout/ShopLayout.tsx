import { Footer } from './Footer';
import { Header } from './Header';
import { MobileNav } from './MobileNav';

export function ShopLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main className="pb-16 lg:pb-0">{children}</main>
      <Footer />
      <MobileNav />
    </>
  );
}
