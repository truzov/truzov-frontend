import { z } from 'zod';

export const vendorProductSchema = z.object({
  name: z.string().min(3, 'Product name is required'),
  brand: z.string().min(2, 'Brand is required'),
  category: z.string().min(2, 'Category is required'),
  description: z.string().min(20, 'Add a useful product description'),
  price: z.coerce.number().positive('Enter a sale price'),
  mrp: z.coerce.number().positive('Enter MRP'),
  stock: z.coerce.number().int().nonnegative('Enter stock quantity'),
  sku: z.string().min(3, 'SKU is required'),
  hasLabResults: z.boolean().default(false),
});
