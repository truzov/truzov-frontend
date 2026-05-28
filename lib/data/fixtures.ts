import type {
  Address,
  AdminMetric,
  ContentBanner,
  LabReport,
  Order,
  Product,
  Review,
  UserProfile,
  Vendor,
  VerificationSubmission,
} from '@/types';

const img = (id: string, url: string, alt: string) => ({ id, url, alt });

export const categories = [
  {
    slug: 'honey',
    name: 'Raw Honey',
    image:
      'https://images.unsplash.com/photo-1587049352851-8d4e89133924?auto=format&fit=crop&w=600&q=80',
  },
  {
    slug: 'dairy',
    name: 'Grass-fed Dairy',
    image:
      'https://images.unsplash.com/photo-1563636619-e9143da7973b?auto=format&fit=crop&w=600&q=80',
  },
  {
    slug: 'supplements',
    name: 'Supplements',
    image:
      'https://images.unsplash.com/photo-1577174881658-0f30ed549adc?auto=format&fit=crop&w=600&q=80',
  },
  {
    slug: 'produce',
    name: 'Fresh Produce',
    image:
      'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=600&q=80',
  },
  {
    slug: 'grains-nuts',
    name: 'Grains & Nuts',
    image:
      'https://images.unsplash.com/photo-1604329760661-e71dc83f8f26?auto=format&fit=crop&w=600&q=80',
  },
  {
    slug: 'prepared-foods',
    name: 'Prepared Foods',
    image:
      'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=600&q=80',
  },
];

export const products: Product[] = [
  {
    id: 'prd-001',
    slug: 'pure-wildflower-honey-500g',
    name: 'Pure Wildflower Honey (500g)',
    brand: 'Truzov Labs',
    category: 'honey',
    tags: ['organic', 'raw', 'lab-verified', 'bestseller'],
    images: [
      img(
        'honey-1',
        'https://images.unsplash.com/photo-1471943311424-646960669fbc?auto=format&fit=crop&w=900&q=80',
        'Glass jar of golden wildflower honey'
      ),
      img(
        'honey-2',
        'https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?auto=format&fit=crop&w=900&q=80',
        'Honey dipper dripping honey'
      ),
    ],
    price: 499,
    mrp: 699,
    discount: 29,
    rating: 4.8,
    reviewCount: 1248,
    inStock: true,
    stockCount: 18,
    isBestseller: true,
    isOrganic: true,
    isFeatured: true,
    isNewArrival: true,
    weight: '500g',
    variants: [
      { id: 'v-250', label: '250g', value: '250g', priceModifier: -140, inStock: true },
      { id: 'v-500', label: '500g', value: '500g', inStock: true },
      { id: 'v-1kg', label: '1kg', value: '1kg', priceModifier: 430, inStock: true },
    ],
    description:
      'Single-origin wildflower honey sourced from certified apiaries and screened for adulterants, pesticides, and heavy metals.',
    benefits: ['Natural antioxidants', 'No added sugar', 'Traceable batch sourcing'],
    ingredients: ['100% raw wildflower honey'],
    certifications: ['FSSAI', 'ISO/IEC 17025 Lab Tested', 'Non-GMO'],
    verificationStatus: 'approved',
    batchId: 'TRV-9042',
    labReportId: 'lab-001',
    vendorId: 'ven-001',
    sellerName: 'Himalayan Labs',
    isLabVerified: true,
    labMetrics: [
      { label: 'Pesticides', value: 'Not detected', status: 'pass' },
      { label: 'Heavy metals', value: 'Not detected', status: 'pass' },
      { label: 'Purity', value: '99.8%', status: 'pass' },
    ],
    reportAvailable: true,
  },
  {
    id: 'prd-002',
    slug: 'cold-pressed-juice-bundle',
    name: 'Cold Pressed Juice Bundle',
    brand: 'Cold Presso',
    category: 'prepared-foods',
    tags: ['juice', 'detox', 'fresh'],
    images: [
      img(
        'juice-1',
        'https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?auto=format&fit=crop&w=900&q=80',
        'Assorted cold pressed juice bottles on ice'
      ),
    ],
    price: 1299,
    mrp: 1599,
    discount: 19,
    rating: 4.6,
    reviewCount: 582,
    inStock: true,
    stockCount: 7,
    isBestseller: true,
    isOrganic: true,
    isFeatured: true,
    weight: '6 bottles',
    description:
      'A six-pack of cold pressed juices made from pesticide-screened fruits and vegetables.',
    benefits: ['No preservatives', 'Cold-chain delivered', 'Fresh batch packed'],
    ingredients: ['Beetroot', 'Apple', 'Spinach', 'Ginger', 'Lemon'],
    certifications: ['FSSAI', 'Cold-chain audited'],
    verificationStatus: 'approved',
    batchId: 'CLD-2210',
    labReportId: 'lab-002',
    vendorId: 'ven-002',
    sellerName: 'Cold Presso Foods',
    isLabVerified: true,
    labMetrics: [
      { label: 'Microbial load', value: 'Within limit', status: 'pass' },
      { label: 'Preservatives', value: 'Not detected', status: 'pass' },
    ],
    reportAvailable: true,
  },
  {
    id: 'prd-003',
    slug: 'organic-turmeric-powder',
    name: 'Organic Turmeric Powder',
    brand: 'EarthRoot',
    category: 'supplements',
    tags: ['spice', 'curcumin', 'organic'],
    images: [
      img(
        'turmeric-1',
        'https://images.unsplash.com/photo-1615485925600-97237c4fc1ec?auto=format&fit=crop&w=900&q=80',
        'Bright turmeric powder in a bowl'
      ),
    ],
    price: 249,
    mrp: 349,
    discount: 29,
    rating: 4.7,
    reviewCount: 391,
    inStock: true,
    stockCount: 4,
    isBestseller: false,
    isOrganic: true,
    isFeatured: true,
    isNewArrival: true,
    weight: '200g',
    description:
      'High-curcumin turmeric powder from organic farms, screened for lead chromate and synthetic color.',
    benefits: ['High curcumin', 'No synthetic color', 'Farm-to-batch traceability'],
    ingredients: ['Organic turmeric'],
    certifications: ['Organic India', 'FSSAI'],
    verificationStatus: 'report_uploaded',
    batchId: 'ERT-4218',
    labReportId: 'lab-003',
    vendorId: 'ven-003',
    sellerName: 'EarthRoot Naturals',
    isLabVerified: false,
    labMetrics: [
      { label: 'Lead chromate', value: 'Pending review', status: 'warning' },
      { label: 'Curcumin', value: '6.2%', status: 'pass' },
    ],
    reportAvailable: true,
  },
  {
    id: 'prd-004',
    slug: 'grass-fed-a2-ghee',
    name: 'Grass-fed A2 Cow Ghee',
    brand: 'PastureKind',
    category: 'dairy',
    tags: ['ghee', 'a2', 'grass-fed'],
    images: [
      img(
        'ghee-1',
        'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=900&q=80',
        'Jar of golden ghee'
      ),
    ],
    price: 799,
    mrp: 899,
    discount: 11,
    rating: 4.5,
    reviewCount: 168,
    inStock: false,
    stockCount: 0,
    isBestseller: false,
    isOrganic: true,
    isFeatured: false,
    weight: '500ml',
    description: 'Traditional bilona-style A2 ghee from grass-fed herds.',
    benefits: ['Small batch churned', 'No additives', 'Rich aroma'],
    ingredients: ['A2 cow milk fat'],
    certifications: ['FSSAI'],
    verificationStatus: 'pending',
    batchId: 'PSK-7720',
    vendorId: 'ven-002',
    sellerName: 'PastureKind Dairy',
    isLabVerified: false,
    labMetrics: [],
    reportAvailable: false,
  },
  {
    id: 'prd-005',
    slug: 'sprouted-millet-mix',
    name: 'Sprouted Millet Breakfast Mix',
    brand: 'Wholesome Fields',
    category: 'grains-nuts',
    tags: ['millet', 'breakfast', 'gluten-free'],
    images: [
      img(
        'millet-1',
        'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&w=900&q=80',
        'Healthy millet breakfast bowl'
      ),
    ],
    price: 349,
    mrp: 449,
    discount: 22,
    rating: 4.4,
    reviewCount: 93,
    inStock: true,
    stockCount: 24,
    isBestseller: false,
    isOrganic: true,
    isFeatured: false,
    weight: '400g',
    description: 'Ready-to-cook sprouted millet mix with no refined sugar.',
    benefits: ['Gluten free', 'Rich in fiber', 'Breakfast ready in 6 minutes'],
    ingredients: ['Ragi', 'Foxtail millet', 'Jaggery powder', 'Cardamom'],
    certifications: ['FSSAI', 'Gluten-free tested'],
    verificationStatus: 'approved',
    batchId: 'WHF-1132',
    labReportId: 'lab-004',
    vendorId: 'ven-004',
    sellerName: 'Wholesome Fields',
    isLabVerified: true,
    labMetrics: [
      { label: 'Gluten', value: '< 20 ppm', status: 'pass' },
      { label: 'Added sugar', value: 'Not detected', status: 'pass' },
    ],
    reportAvailable: true,
  },
  {
    id: 'prd-006',
    slug: 'organic-salad-box',
    name: 'Organic Salad Box',
    brand: 'Fresh Patch',
    category: 'produce',
    tags: ['fresh', 'produce', 'leafy'],
    images: [
      img(
        'salad-1',
        'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=900&q=80',
        'Fresh organic salad bowl'
      ),
    ],
    price: 299,
    mrp: 349,
    discount: 14,
    rating: 4.3,
    reviewCount: 72,
    inStock: true,
    stockCount: 12,
    isBestseller: false,
    isOrganic: true,
    isFeatured: true,
    weight: '350g',
    description: 'Washed salad greens with pesticide residue screening.',
    benefits: ['Harvested within 24 hours', 'Cold-chain packed', 'Ready to rinse and serve'],
    ingredients: ['Lettuce', 'Spinach', 'Rocket', 'Cherry tomatoes'],
    certifications: ['Residue screened', 'FSSAI'],
    verificationStatus: 'approved',
    batchId: 'FRP-5003',
    labReportId: 'lab-005',
    vendorId: 'ven-005',
    sellerName: 'Fresh Patch Farms',
    isLabVerified: true,
    labMetrics: [
      { label: 'Pesticide residue', value: 'Not detected', status: 'pass' },
      { label: 'Cold-chain log', value: '2-6C maintained', status: 'pass' },
    ],
    reportAvailable: true,
  },
];

export const reviews: Review[] = [
  {
    id: 'rev-1',
    userId: 'usr-001',
    userName: 'Ananya Rao',
    rating: 5,
    title: 'Finally a honey I can trust',
    body: 'The lab summary and batch ID made it easy to buy. Texture and taste are excellent.',
    createdAt: '2026-05-12T10:00:00.000Z',
    verified: true,
  },
  {
    id: 'rev-2',
    userId: 'usr-002',
    userName: 'Rohit Mehta',
    rating: 4,
    title: 'Good quality and fast delivery',
    body: 'Packaging was secure and the report preview gave confidence.',
    createdAt: '2026-05-14T10:00:00.000Z',
    verified: true,
  },
];

export const users: UserProfile[] = [
  {
    id: 'usr-001',
    name: 'Asha Verma',
    email: 'customer@truzov.test',
    role: 'customer',
    phone: '9876543210',
    createdAt: '2026-01-10T00:00:00.000Z',
  },
  {
    id: 'usr-ven',
    name: 'Vendor Ops',
    email: 'vendor@truzov.test',
    role: 'vendor',
    createdAt: '2026-02-01T00:00:00.000Z',
  },
  {
    id: 'usr-admin',
    name: 'Admin Lead',
    email: 'admin@truzov.test',
    role: 'admin',
    createdAt: '2026-02-01T00:00:00.000Z',
  },
  {
    id: 'usr-lab',
    name: 'Lab Partner',
    email: 'lab@truzov.test',
    role: 'lab',
    createdAt: '2026-02-01T00:00:00.000Z',
  },
];

export const addresses: Address[] = [
  {
    id: 'addr-1',
    fullName: 'Asha Verma',
    phone: '9876543210',
    addressLine1: 'Flat 403, Green Heights, MG Road',
    addressLine2: 'Near Metro Gate 2',
    city: 'Bengaluru',
    state: 'Karnataka',
    pincode: '560001',
    isDefault: true,
  },
  {
    id: 'addr-2',
    fullName: 'Asha Verma',
    phone: '9876543210',
    addressLine1: '18 Wellness Street',
    city: 'Pune',
    state: 'Maharashtra',
    pincode: '411001',
    isDefault: false,
  },
];

export const orders: Order[] = [
  {
    id: 'TRZ-2026-1042',
    status: 'shipped',
    items: [{ product: products[0], quantity: 2, unitPrice: products[0].price }],
    address: addresses[0],
    subtotal: 998,
    discount: 100,
    shipping: 0,
    total: 898,
    paymentMethod: 'UPI',
    createdAt: '2026-05-20T08:30:00.000Z',
    trackingUrl: '/account/orders/TRZ-2026-1042',
  },
  {
    id: 'TRZ-2026-0988',
    status: 'delivered',
    items: [{ product: products[2], quantity: 1, unitPrice: products[2].price }],
    address: addresses[1],
    subtotal: 249,
    discount: 0,
    shipping: 49,
    total: 298,
    paymentMethod: 'Card',
    createdAt: '2026-05-08T08:30:00.000Z',
    deliveredAt: '2026-05-11T08:30:00.000Z',
  },
];

export const vendors: Vendor[] = [
  {
    id: 'ven-001',
    name: 'Himalayan Labs',
    ownerName: 'Kabir Sharma',
    email: 'ops@himalayanlabs.test',
    status: 'approved',
    rating: 4.8,
    productCount: 18,
    joinedAt: '2026-01-12T00:00:00.000Z',
    documents: [
      { id: 'doc-1', type: 'gst', fileName: 'gst-certificate.pdf', status: 'approved' },
      { id: 'doc-2', type: 'fssai', fileName: 'fssai-license.pdf', status: 'approved' },
    ],
  },
  {
    id: 'ven-002',
    name: 'Cold Presso Foods',
    ownerName: 'Mira Kapoor',
    email: 'quality@coldpresso.test',
    status: 'approved',
    rating: 4.6,
    productCount: 11,
    joinedAt: '2026-02-18T00:00:00.000Z',
    documents: [{ id: 'doc-3', type: 'fssai', fileName: 'fssai.pdf', status: 'approved' }],
  },
  {
    id: 'ven-003',
    name: 'EarthRoot Naturals',
    ownerName: 'Nikhil Nair',
    email: 'hello@earthroot.test',
    status: 'pending',
    rating: 4.2,
    productCount: 6,
    joinedAt: '2026-04-03T00:00:00.000Z',
    documents: [{ id: 'doc-4', type: 'organic', fileName: 'organic-certificate.pdf', status: 'pending' }],
  },
  {
    id: 'ven-004',
    name: 'Wholesome Fields',
    ownerName: 'Priya Iyer',
    email: 'seller@wholesome.test',
    status: 'approved',
    rating: 4.5,
    productCount: 9,
    joinedAt: '2026-03-11T00:00:00.000Z',
    documents: [{ id: 'doc-5', type: 'fssai', fileName: 'fssai.pdf', status: 'approved' }],
  },
  {
    id: 'ven-005',
    name: 'Fresh Patch Farms',
    ownerName: 'Dev Patel',
    email: 'farm@freshpatch.test',
    status: 'approved',
    rating: 4.4,
    productCount: 14,
    joinedAt: '2026-03-18T00:00:00.000Z',
    documents: [{ id: 'doc-6', type: 'organic', fileName: 'residue-audit.pdf', status: 'approved' }],
  },
];

export const labReports: LabReport[] = products
  .filter((product) => product.labReportId)
  .map((product) => ({
    id: product.labReportId as string,
    productId: product.id,
    batchId: product.batchId,
    labName: 'NABL Partner Lab',
    status: product.isLabVerified ? 'pass' : 'pending',
    summary: product.isLabVerified
      ? 'Third-party lab test confirms purity and safety markers.'
      : 'Report uploaded and awaiting admin quality review.',
    metrics: product.labMetrics,
    pdfUrl: '#',
    uploadedAt: '2026-05-18T10:00:00.000Z',
  }));

export const verificationSubmissions: VerificationSubmission[] = products.map((product, index) => ({
  id: `ver-${index + 1}`,
  productId: product.id,
  productName: product.name,
  vendorId: product.vendorId,
  vendorName: product.sellerName,
  status: product.verificationStatus,
  submittedAt: `2026-05-${10 + index}T09:00:00.000Z`,
  labPartner: index % 2 === 0 ? 'NABL Partner Lab' : 'PureCheck Labs',
  thumbnail: product.images[0].url,
  claims: product.benefits.slice(0, 3),
  reportId: product.labReportId,
  rejectionReason: product.verificationStatus === 'rejected' ? 'Contaminant threshold exceeded' : undefined,
}));

export const adminMetrics: AdminMetric[] = [
  { label: 'GMV this month', value: 'Rs 18.4L', delta: '+12%', tone: 'success' },
  { label: 'Pending verification', value: '23', delta: '8 urgent', tone: 'warning' },
  { label: 'Open vendor apps', value: '11', delta: '+3 today', tone: 'info' },
  { label: 'Refund reviews', value: '5', delta: '2 escalated', tone: 'danger' },
];

export const banners: ContentBanner[] = [
  {
    id: 'ban-hero',
    placement: 'homepage',
    headline: 'Scientific Purity. Every batch lab-verified.',
    subtext:
      'Shop organic staples with batch IDs, transparent lab metrics, and verified vendor sourcing.',
    ctaLabel: 'Browse Verified Products',
    href: '/products?labVerified=true',
    imageUrl:
      'https://images.unsplash.com/photo-1579154204601-01588f351e67?auto=format&fit=crop&w=1400&q=80',
    active: true,
    saleEndsAt: '2026-06-15T18:00:00.000Z',
  },
  {
    id: 'ban-sale',
    placement: 'homepage',
    headline: 'Verified bestsellers under Rs 499',
    subtext: 'Pesticide-screened, certified, and ready to ship from trusted vendors.',
    ctaLabel: 'View All Deals',
    href: '/products?sort=best_selling',
    imageUrl:
      'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?auto=format&fit=crop&w=1400&q=80',
    active: true,
    saleEndsAt: '2026-06-05T18:00:00.000Z',
  },
];

export function findProduct(slugOrId: string) {
  return products.find((product) => product.slug === slugOrId || product.id === slugOrId);
}

export function findOrder(id: string) {
  return orders.find((order) => order.id === id) ?? orders[0];
}

export function productsForCategory(slug?: string) {
  if (!slug) {
    return products;
  }

  return products.filter((product) => product.category === slug || product.tags.includes(slug));
}
