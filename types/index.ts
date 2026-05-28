export type UserRole = 'customer' | 'vendor' | 'admin' | 'lab';

export type VerificationStatus =
  | 'submitted'
  | 'samples_collected'
  | 'in_lab'
  | 'report_uploaded'
  | 'approved'
  | 'rejected'
  | 'pending';

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

export interface ProductImage {
  id: string;
  url: string;
  alt: string;
  blurDataURL?: string;
}

export interface ProductVariant {
  id: string;
  label: string;
  value: string;
  priceModifier?: number;
  inStock: boolean;
}

export interface LabMetric {
  label: string;
  value: string;
  status: 'pass' | 'warning' | 'fail';
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  brand: string;
  category: string;
  tags: string[];
  images: ProductImage[];
  price: number;
  mrp: number;
  discount: number;
  rating: number;
  reviewCount: number;
  inStock: boolean;
  stockCount: number;
  isBestseller: boolean;
  isOrganic: boolean;
  isFeatured: boolean;
  isNewArrival?: boolean;
  weight?: string;
  variants?: ProductVariant[];
  description: string;
  benefits: string[];
  ingredients?: string[];
  certifications: string[];
  verificationStatus: VerificationStatus;
  batchId: string;
  labReportId?: string;
  vendorId: string;
  sellerName: string;
  isLabVerified: boolean;
  labMetrics: LabMetric[];
  reportAvailable: boolean;
}

export interface Review {
  id: string;
  userId: string;
  userName: string;
  rating: number;
  title: string;
  body: string;
  createdAt: string;
  verified: boolean;
}

export interface CartItem {
  product: Product;
  variantId?: string;
  quantity: number;
  unitPrice: number;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  avatarUrl?: string;
  createdAt: string;
}

export interface Address {
  id: string;
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
}

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'refunded';

export interface Order {
  id: string;
  status: OrderStatus;
  items: CartItem[];
  address: Address;
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
  paymentMethod: string;
  createdAt: string;
  deliveredAt?: string;
  trackingUrl?: string;
}

export interface VendorDocument {
  id: string;
  type: 'gst' | 'fssai' | 'organic' | 'lab_report';
  fileName: string;
  status: 'pending' | 'approved' | 'rejected';
}

export interface Vendor {
  id: string;
  name: string;
  ownerName: string;
  email: string;
  status: 'pending' | 'approved' | 'rejected';
  rating: number;
  productCount: number;
  documents: VendorDocument[];
  joinedAt: string;
}

export interface LabReport {
  id: string;
  productId: string;
  batchId: string;
  labName: string;
  status: 'pass' | 'fail' | 'pending';
  summary: string;
  metrics: LabMetric[];
  pdfUrl?: string;
  uploadedAt?: string;
}

export interface VerificationSubmission {
  id: string;
  productId: string;
  productName: string;
  vendorId: string;
  vendorName: string;
  status: VerificationStatus;
  submittedAt: string;
  labPartner: string;
  thumbnail: string;
  claims: string[];
  reportId?: string;
  rejectionReason?: string;
}

export interface AdminMetric {
  label: string;
  value: string;
  delta: string;
  tone: 'success' | 'warning' | 'danger' | 'info';
}

export interface ContentBanner {
  id: string;
  placement: 'homepage' | 'category';
  headline: string;
  subtext: string;
  ctaLabel: string;
  href: string;
  imageUrl: string;
  active: boolean;
  saleEndsAt?: string;
}
