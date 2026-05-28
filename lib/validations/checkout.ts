import { z } from 'zod';

export const addressSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().regex(/^[6-9]\d{9}$/, 'Enter a valid Indian mobile number'),
  pincode: z.string().length(6, 'Pincode must be 6 digits'),
  addressLine1: z.string().min(10, 'Enter a complete address'),
  addressLine2: z.string().optional(),
  city: z.string().min(2, 'Enter a city'),
  state: z.string().min(2, 'Enter a state'),
  saveAsDefault: z.boolean().optional(),
});
