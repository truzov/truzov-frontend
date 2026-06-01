# Authentication Flow Implementation Plan - Truzov Frontend

## 1. DESIGN ANALYSIS

### 1.1 Authentication Screens Identified

From the Stitch designs, the following authentication screens are available:

#### Desktop Screens:
- **Login**: `login_with_otp_truzov_master_template_desktop_1` - Split layout with OTP flow
- **Signup**: `signup_truzov_master_template_restored_1` - Registration with email/phone and password
- **OTP Verification**: `otp_verification_modal_overlay` - 6-digit code entry
- **Account Menu (Logged In)**: `account_menu_logged_in_desktop` - User profile menu
- **Account Menu (Logged Out)**: `account_menu_logged_out_desktop` - Auth action prompts

#### Mobile Screens:
- **Mobile Login**: `m_login_truzov_otp_optimized_mobile`
- **Mobile Signup**: `m_signup_truzov_master_design`
- **Mobile OTP**: `m_login_with_otp_truzov_master_template_unified_mobile`

### 1.2 Design System Details

**Colors Used:**
- Primary: `#00600a` (Deep Green)
- Primary Container: `#1f7a1f`
- Primary Fixed: `#9cf88d` (Light Green)
- Background: `#f6fbef`
- Surface: `#f6fbef`
- On Surface: `#181d16`
- Accent Link: `#477DCA`
- Error: `#C82333`
- Success: `#218838`

**Typography:**
- H1: 32px, bold
- H2: 24px, semi-bold
- H4: 18px, semi-bold
- H5 Bold: 16px, bold
- Body MD: 16px, regular
- Label SM: 12px, semi-bold
- Caption: 12px, regular

**Layout Patterns:**
- Split layout: 50/50 on desktop, stacked on mobile
- Left panel: Brand + trust indicators
- Right panel: Form
- Max width: 1440px
- Spacing: xs(4px), sm(8px), md(16px), lg(24px), xl(32px), xxl(64px)
- Border radius: Consistent rounded corners

---

## 2. CURRENT PROJECT STATE

### 2.1 Existing Auth Infrastructure
- ✅ Zustand store: `store/auth.store.ts` (has basic login/logout)
- ✅ Type definitions: `types/index.ts` (UserProfile, UserRole)
- ✅ (auth) route group: `app/(auth)/`
- ✅ Auth layout: `app/(auth)/layout.tsx`
- ✅ Zustand persistence middleware configured
- ✅ React Hook Form + Zod for validation
- ✅ Next.js App Router with route groups

### 2.2 Current Auth Store Structure
```typescript
interface AuthStore {
  isLoggedIn: boolean;
  user: UserProfile | null;
  loginAs: (role: UserRole) => void;
  logout: () => void;
}
```

---

## 3. IMPLEMENTATION PLAN

### 3.1 Route Structure

**Public (Guest-Accessible) Routes:**
- `/` - Homepage
- `/categories` - Browse categories
- `/search` - Search products
- `/product/[slug]` - Product detail pages
- `/offers` - Promotional banners

**Auth Routes (Group: `/auth`):**
- `/auth/login` - Email/Phone login + OTP verification
- `/auth/signup` - Registration form
- `/auth/verify-otp` - OTP entry (modal or page)

**Protected Routes (Logged-in Only):**
- `/account/profile` - User profile
- `/account/addresses` - Saved addresses
- `/account/orders` - Order history
- `/checkout` - Checkout process
- `/admin/*` - Admin dashboard

### 3.2 State Management Architecture

#### Enhanced Auth Store (Zustand)
```typescript
interface AuthStore {
  // State
  isLoggedIn: boolean;
  user: UserProfile | null;
  isLoading: boolean;
  error: string | null;
  
  // OTP Flow State
  pendingPhone: string | null;
  otpSessionId: string | null;
  otpAttempts: number;
  
  // Async Actions
  signup: (email: string, phone: string, password: string) => Promise<void>;
  sendOTP: (phoneOrEmail: string) => Promise<void>;
  verifyOTP: (code: string) => Promise<void>;
  login: (phoneOrEmail: string, password: string) => Promise<void>;
  logout: () => void;
  clearError: () => void;
}
```

#### Key Features:
- Persist auth state using Zustand middleware
- Track OTP session for verification flow
- Error handling with user-friendly messages
- Loading states for async operations
- Prevent multiple submissions

### 3.3 Component Structure

```
components/
├── auth/
│   ├── LoginForm.tsx           # Email/phone + password form
│   ├── SignupForm.tsx          # Registration form
│   ├── OTPVerification.tsx     # 6-digit OTP input
│   ├── AuthLayout.tsx          # Shared split layout (desktop/mobile)
│   ├── BrandPanel.tsx          # Left panel: branding + trust indicators
│   ├── ProtectedRoute.tsx      # Route protection wrapper
│   └── AuthGuard.tsx           # Prevent authenticated users from accessing auth pages
├── layout/
│   ├── Header.tsx              # Updated with auth state
│   ├── Navigation.tsx          # Show account menu or auth buttons based on state
│   └── AccountMenu.tsx         # Logged-in user menu
```

### 3.4 User Flows

#### Flow 1: New User Signup
1. Click "Sign Up" button
2. Redirect to `/auth/signup`
3. Enter email/phone, password, confirm password
4. Submit form → API call
5. On success: System sends OTP
6. Redirect to `/auth/verify-otp`
7. Enter 6-digit code
8. On verification: Create account + auto-login
9. Redirect to homepage or intended destination

#### Flow 2: Existing User Login
1. Click "Log In" button
2. Redirect to `/auth/login`
3. Enter email/phone
4. Click "Send OTP"
5. OTP sent → Redirect to `/auth/verify-otp` (or stay on page)
6. Enter 6-digit code
7. On verification: Set user session
8. Redirect to homepage or intended destination

#### Flow 3: Guest → Protected Route → Auth
1. Guest user browses (no auth required)
2. User clicks "Proceed to Checkout"
3. Check auth: `if (!isLoggedIn) redirect('/auth/login')`
4. Store redirect URL in session/cookie
5. User logs in
6. On success: Redirect to stored URL (checkout page)

#### Flow 4: Logout
1. User clicks "Logout" in account menu
2. Clear auth state + remove persisted data
3. Redirect to homepage

### 3.5 Protected Routes Implementation

**Approach: Middleware + Route Guards**
1. Create `lib/auth/middleware.ts` for route protection
2. Use Next.js middleware to redirect guests
3. Create `ProtectedRoute` component for client-side guards
4. Store intended destination for post-login redirect

### 3.6 Guest Browsing Requirements

**Routes Allowed Without Login:**
- All product browsing routes
- Homepage and category pages
- Search functionality
- Product detail pages
- Browse offers/banners
- FAQ, About, Help pages

**Routes Requiring Login:**
- Checkout (`/checkout`)
- Order history (`/account/orders`)
- Address management (`/account/addresses`)
- Wishlist/saved items
- Admin dashboard
- Vendor dashboard

---

## 4. IMPLEMENTATION TASKS

### Phase 1: Core State Management (2-3 hours)
- [ ] Enhance auth.store.ts with full auth flow
- [ ] Create auth action handlers (signup, OTP, login)
- [ ] Add error state management
- [ ] Add OTP session tracking
- [ ] Set up error messages

### Phase 2: Components (4-5 hours)
- [ ] Create AuthLayout wrapper (split layout)
- [ ] Create BrandPanel component
- [ ] Create LoginForm component with phone input
- [ ] Create SignupForm component
- [ ] Create OTPVerification component
- [ ] Create ProtectedRoute wrapper
- [ ] Create AccountMenu component

### Phase 3: Routes & Pages (2-3 hours)
- [ ] Create `/auth/login` page
- [ ] Create `/auth/signup` page
- [ ] Create `/auth/verify-otp` page
- [ ] Set up route protection middleware
- [ ] Create fallback error page

### Phase 4: Integration (2-3 hours)
- [ ] Update Header with auth state
- [ ] Add logout functionality
- [ ] Integrate AccountMenu into Header
- [ ] Add redirect-after-login logic
- [ ] Add guest-to-protected-route redirect
- [ ] Create session persistence

### Phase 5: Testing & Polish (2-3 hours)
- [ ] Test all user flows
- [ ] Verify responsive design
- [ ] Test error states
- [ ] Test OTP flow
- [ ] Verify session persistence
- [ ] Add form validation feedback

---

## 5. API INTEGRATION POINTS

These endpoints will be mocked initially, but designed for real backend:

```typescript
// API Endpoints (to be integrated later)
POST /api/auth/signup
  Request: { email, phone, password }
  Response: { sessionId, message }

POST /api/auth/send-otp
  Request: { phoneOrEmail }
  Response: { sessionId, expiresIn }

POST /api/auth/verify-otp
  Request: { sessionId, code }
  Response: { token, user }

POST /api/auth/login
  Request: { phoneOrEmail, password }
  Response: { token, user }

POST /api/auth/logout
  Request: { token }
  Response: { success }
```

---

## 6. FILE STRUCTURE TO BE CREATED

```
d:\truzov-frontend\
├── app/
│   ├── (auth)/
│   │   ├── layout.tsx                    # Auth group layout
│   │   ├── login/
│   │   │   └── page.tsx                  # Login page
│   │   ├── signup/
│   │   │   └── page.tsx                  # Signup page
│   │   └── verify-otp/
│   │       └── page.tsx                  # OTP verification
│   └── middleware.ts                     # Route protection
├── components/
│   └── auth/
│       ├── LoginForm.tsx                 # Reusable login form
│       ├── SignupForm.tsx                # Reusable signup form
│       ├── OTPVerification.tsx           # OTP input component
│       ├── AuthLayout.tsx                # Split layout wrapper
│       ├── BrandPanel.tsx                # Left panel branding
│       ├── ProtectedRoute.tsx            # Route guard component
│       └── AccountMenu.tsx               # User menu
├── lib/
│   ├── auth/
│   │   ├── constants.ts                  # Auth endpoints, timeouts
│   │   ├── types.ts                      # Auth-specific types
│   │   └── utils.ts                      # Auth helper functions
│   └── validations/
│       └── auth.ts                       # Zod schemas for auth forms
├── hooks/
│   └── useProtectedRoute.ts              # Hook for route protection
└── store/
    └── auth.store.ts                     # Enhanced Zustand store
```

---

## 7. DESIGN-TO-CODE MAPPING

### Login Screen
- **Left Panel**: BrandPanel component with:
  - Truzov logo
  - Headline: "Elevating Global Health Through Clinical Verification"
  - Trust badges: "Lab Certified", "Full Transparency"
  - Trust statement at bottom
  - Green gradient background (#00600a to #1f7a1f)
  
- **Right Panel**: LoginForm with:
  - Mobile logo (hidden on desktop)
  - "Verify OTP" heading
  - Phone number input (read-only during OTP entry, editable on initial screen)
  - 6-digit OTP input fields
  - "Verify & Proceed" button with arrow icon
  - "Didn't receive code?" link
  - "Back to Login" link

### Signup Screen
- **Left Panel**: BrandPanel component (same as login)
- **Right Panel**: SignupForm with:
  - Mobile logo (hidden on desktop)
  - "Create Account" heading + subtitle
  - Full Name input with validation checkmark
  - Email or Phone input
  - Password fields (password + confirm)
  - Password strength indicator (visual bars)
  - "Continue" button
  - Social login divider (optional)
  - Login link at bottom

---

## 8. VALIDATION SCHEMAS (Zod)

```typescript
// Login
const loginSchema = z.object({
  phoneOrEmail: z.string().min(1, "Phone or email required"),
});

// OTP
const otpSchema = z.object({
  code: z.string().length(6, "Must be 6 digits").regex(/^\d+$/, "Only digits allowed"),
});

// Signup
const signupSchema = z.object({
  fullName: z.string().min(2, "Name too short").max(100),
  phoneOrEmail: z.union([
    z.string().email("Invalid email"),
    z.string().regex(/^\d{10}$/, "Invalid phone"),
  ]),
  password: z.string().min(8, "Password at least 8 chars").regex(/[A-Z]/, "Need uppercase"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});
```

---

## 9. NEXT STEPS

1. ✅ Analyze designs (DONE)
2. ✅ Create implementation plan (DONE - THIS DOCUMENT)
3. → Review and validate plan with team
4. → Proceed with Phase 1: Enhanced state management
5. → Proceed with Phase 2-5: Components, routes, integration

---

## 10. NOTES

- **OTP Flow**: Currently designed as sequential steps (login → OTP on same/new page)
- **Session Persistence**: Using Zustand's persist middleware to survive page refreshes
- **Error Handling**: User-friendly error messages for common scenarios
- **Accessibility**: ARIA labels, semantic HTML, keyboard navigation
- **Mobile First**: All components responsive (mobile: stacked, desktop: split)
- **Future Integrations**: Designed to easily add JWT, OAuth, social login, real OTP service
