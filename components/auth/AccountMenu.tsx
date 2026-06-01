'use client';

import { useAuthStore } from '@/store/auth.store';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function AccountMenu() {
  const router = useRouter();
  const { isLoggedIn, user, logout } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);

  if (!isLoggedIn || !user) {
    return (
      <div className="flex items-center gap-sm">
        <Link
          className="px-md py-sm font-body-md text-body-md text-on-surface hover:text-primary transition-colors"
          href="/login"
        >
          Log In
        </Link>
        <Link
          className="px-md py-sm font-body-md text-body-md bg-primary text-on-primary rounded-lg hover:bg-primary-container transition-colors"
          href="/register"
        >
          Sign Up
        </Link>
      </div>
    );
  }

  const handleLogout = () => {
    logout();
    setIsOpen(false);
    router.push('/');
  };

  return (
    <div className="relative">
      {/* Menu Button */}
      <button
        className="flex items-center gap-sm px-sm py-sm rounded-lg hover:bg-surface-container transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-on-primary font-h5-bold">
          {user.name.charAt(0).toUpperCase()}
        </div>
        <span className="hidden sm:inline font-body-md text-body-md text-on-surface">{user.name}</span>
        <span className="material-symbols-outlined text-[20px]">expand_more</span>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-sm bg-surface border border-outline rounded-lg shadow-lg z-50 min-w-[200px] py-sm">
          {/* User Info */}
          <div className="px-md py-sm border-b border-outline-variant">
            <p className="font-h6-bold text-h6-bold text-on-surface">{user.name}</p>
            <p className="font-caption text-caption text-on-surface-variant">{user.email}</p>
          </div>

          {/* Menu Items */}
          <Link
            className="flex items-center gap-md px-md py-sm hover:bg-surface-container transition-colors text-on-surface font-body-md"
            href="/account/profile"
            onClick={() => setIsOpen(false)}
          >
            <span className="material-symbols-outlined">account_circle</span>
            My Profile
          </Link>
          <Link
            className="flex items-center gap-md px-md py-sm hover:bg-surface-container transition-colors text-on-surface font-body-md"
            href="/account/orders"
            onClick={() => setIsOpen(false)}
          >
            <span className="material-symbols-outlined">receipt</span>
            My Orders
          </Link>
          <Link
            className="flex items-center gap-md px-md py-sm hover:bg-surface-container transition-colors text-on-surface font-body-md"
            href="/account/addresses"
            onClick={() => setIsOpen(false)}
          >
            <span className="material-symbols-outlined">location_on</span>
            Addresses
          </Link>

          {/* Divider */}
          <div className="border-t border-outline-variant my-sm" />

          {/* Logout */}
          <button
            className="w-full text-left px-md py-sm hover:bg-surface-container transition-colors text-error font-body-md flex items-center gap-md"
            onClick={handleLogout}
          >
            <span className="material-symbols-outlined">logout</span>
            Log Out
          </button>
        </div>
      )}
    </div>
  );
}
