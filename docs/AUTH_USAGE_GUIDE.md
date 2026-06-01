# Authentication Implementation Guide

## Overview

The authentication system is now fully implemented with:
- ✅ Zustand-based state management
- ✅ OTP-based signup and login
- ✅ Protected routes
- ✅ Account menu with user profile
- ✅ Session persistence across page refreshes

## Features

### 1. User Signup
- **Route**: `/register`
- **Flow**: Full Name → Email → Password → OTP Verification → Account Created
- **Validation**: Zod schemas for all inputs
- **Password Strength**: Visual indicator (weak/medium/strong)

### 2. User Login  
- **Route**: `/login`
- **Flow**: Email → OTP Sent → OTP Verification → Logged In
- **Session Persistence**: Uses Zustand persist middleware

### 3. OTP Verification
- **Route**: `/verify-otp`
- **Input**: 6-digit code with auto-focus between fields
- **Backspace**: Moves cursor back to previous field
- **Auto-submit**: Button disabled until all 6 digits entered

### 4. User Profile & Account Menu
- **Components**: AccountMenu in Header
- **States**:
  - Logged out: Shows "Log In" and "Sign Up" buttons
  - Logged in: Shows user avatar and dropdown menu
- **Menu Options**:
  - My Profile (`/account/profile`)
  - My Orders (`/account/orders`)
  - Addresses (`/account/addresses`)
  - Log Out

### 5. Route Protection
- **Protected Routes**: Checkout, Orders, Profile, Addresses
- **Guest Browsing**: Homepage, Products, Categories, Search fully accessible
- **Implementation**: Use `ProtectedRoute` component or `useProtectedRoute` hook

## Usage Examples

### Protecting a Route (Client-Side)

**Option 1: Using ProtectedRoute Component**
```tsx
import { ProtectedRoute } from '@/components/auth';

export default function OrdersPage() {
  return (
    <ProtectedRoute redirectTo="/auth/login">
      <YourOrdersContent />
    </ProtectedRoute>
  );
}
```

**Option 2: Using useProtectedRoute Hook**
```tsx
'use client';

import { useProtectedRoute } from '@/hooks/useProtectedRoute';

export default function OrdersPage() {
  const { isLoggedIn, isLoading } = useProtectedRoute();
  
  if (isLoading) return <div>Loading...</div>;
  if (!isLoggedIn) return null; // Already redirected by hook

  return <YourOrdersContent />;
}
```

### Accessing Auth State in Components

```tsx
'use client';

import { useAuthStore } from '@/store/auth.store';

export function MyComponent() {
  const { isLoggedIn, user, logout } = useAuthStore();

  if (!isLoggedIn) {
    return <p>Please log in</p>;
  }

  return (
    <div>
      <h1>Hello, {user?.name}</h1>
      <button onClick={logout}>Sign Out</button>
    </div>
  );
}
```

### Triggering Auth Actions

```tsx
'use client';

import { useAuthStore } from '@/store/auth.store';

export function SignupButton() {
  const { signup, isLoading, error } = useAuthStore();

  const handleSignup = async () => {
    try {
      await signup('John Doe', 'john@example.com', 'SecurePass123');
      // User is now on /auth/verify-otp
    } catch (err) {
      console.error('Signup failed:', err);
    }
  };

  return (
    <div>
      <button onClick={handleSignup} disabled={isLoading}>
        {isLoading ? 'Creating account...' : 'Sign Up'}
      </button>
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
}
```

## Auth Store API

### State
```typescript
useAuthStore((state) => ({
  isLoggedIn: boolean;        // User logged in?
  user: UserProfile | null;   // Current user data
  isLoading: boolean;         // Async operation in progress?
  error: string | null;       // Last error message
  otpSessionId: string | null; // Current OTP session
  pendingEmail: string | null; // Email awaiting OTP verification
}));
```

### Actions
```typescript
const {
  signup,      // async (fullName, email, password) => void
  sendOTP,     // async (email) => void
  verifyOTP,   // async (code) => void
  login,       // async (email, password) => void
  loginAs,     // (role) => void - For demo/testing only
  logout,      // () => void
  clearError,  // () => void
} = useAuthStore();
```

## Components

### AuthLayout
Wrapper component providing split layout (branding on left, form on right)
```tsx
<AuthLayout title="Log In" subtitle="Enter your email...">
  <LoginForm />
</AuthLayout>
```

### BrandPanel
Reusable left panel with Truzov branding and trust indicators (desktop only)

### LoginForm
Email input with OTP send button

### SignupForm
Full registration form with password validation and strength indicator

### OTPVerification
6-digit code input with auto-focus

### AccountMenu
User profile dropdown menu (logged in/out states)

### ProtectedRoute
Wrapper component for protecting routes with redirects

## File Structure

```
components/auth/
├── index.ts                 # Exports all auth components
├── AuthLayout.tsx          # Split layout wrapper
├── BrandPanel.tsx          # Branding panel (desktop)
├── LoginForm.tsx           # Login form component
├── SignupForm.tsx          # Signup form component
├── OTPVerification.tsx     # OTP input component
├── AccountMenu.tsx         # User menu
└── ProtectedRoute.tsx      # Route protection wrapper

app/(auth)/
├── layout.tsx              # Auth group layout
├── login/page.tsx          # Login page
├── register/page.tsx       # Signup page
└── verify-otp/page.tsx     # OTP verification page

hooks/
└── useProtectedRoute.ts    # Route protection hook

lib/validations/
└── auth.ts                 # Zod validation schemas

store/
└── auth.store.ts           # Zustand auth store
```

## Mock API Calls

The implementation includes mock API calls that simulate network delays:
- Signup: 800ms delay
- Send OTP: 600ms delay
- Verify OTP: 800ms delay
- Login: 800ms delay

These will be replaced with real API calls later.

## Testing the Flow

1. **Signup Flow**:
   - Navigate to `/register`
   - Fill in: Full Name, Email, Password (must contain uppercase)
   - Click "Create Account"
   - Verify password strength indicator
   - System redirects to `/verify-otp`
   - Enter any 6-digit code (except "000000" which is invalid)
   - Click "Verify & Proceed"
   - Redirected to homepage as logged-in user

2. **Login Flow**:
   - Navigate to `/login`
   - Enter email
   - Click "Send OTP"
   - Redirected to `/verify-otp`
   - Enter 6-digit code
   - Click "Verify & Proceed"
   - Logged in and redirected to homepage

3. **Account Menu**:
   - Click user avatar in header
   - See user profile dropdown
   - Test navigation to profile, orders, addresses
   - Test logout

## Session Persistence

Auth state is automatically persisted to browser localStorage using Zustand's persist middleware:
- Survives page refreshes
- Survives browser restarts
- Cleared on logout or when clearing browser data

## Next Steps for Backend Integration

When integrating with real backend:

1. **Replace mock API calls** in `store/auth.store.ts`:
   ```typescript
   const response = await fetch('/api/auth/signup', {
     method: 'POST',
     body: JSON.stringify({ fullName, email, password }),
   });
   ```

2. **Add JWT/session handling**:
   - Store token in auth state
   - Include token in API request headers

3. **Add error handling**:
   - Map backend error codes to user messages
   - Handle 401/403 responses

4. **Add validation on backend**:
   - Password strength requirements
   - Email verification
   - Rate limiting on OTP attempts

5. **Create protected API routes** in Next.js:
   - `app/api/auth/signup`
   - `app/api/auth/send-otp`
   - `app/api/auth/verify-otp`
   - `app/api/auth/login`
