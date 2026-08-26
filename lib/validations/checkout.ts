import { z } from 'zod';

/**
 * Address form validation.
 *
 * Field names are the API's (`line1` / `line2`), not the old local `addressLine1` /
 * `addressLine2`. This is not cosmetic: the backend runs
 * `spring.jackson.deserialization.fail-on-unknown-properties: true`, so posting the old names is a
 * hard 400 rather than a silently ignored extra field.
 *
 * The server requires only `line1`. Everything else is required here as a deliberate product
 * decision — an address without a name, phone or pincode is not deliverable — but that is stricter
 * than the contract, so these messages must read as our own guidance and never be presented as
 * server errors.
 */
export const addressSchema = z.object({
  fullName: z.string().trim().min(2, 'Name must be at least 2 characters'),
  /**
   * Accepts 10 local digits OR E.164. The previous pattern was `^[6-9]\d{9}$`, which rejected
   * every valid international number the API would have accepted.
   */
  phone: z
    .string()
    .trim()
    .refine(
      (value) => /^(?:\d{10}|\+\d{8,15})$/.test(value.replace(/[^\d+]/g, '')),
      'Enter a valid 10 digit or international phone number'
    ),
  /** Six digits when supplied — the one format constraint the server itself enforces. */
  pincode: z.string().trim().regex(/^\d{6}$/, 'Pincode must be 6 digits'),
  line1: z.string().trim().min(10, 'Enter a complete address'),
  line2: z.string().trim().optional(),
  city: z.string().trim().min(2, 'Enter a city'),
  state: z.string().trim().min(2, 'Enter a state'),
  /** Optional free-text tag, e.g. "Home". Rendered on the address card. */
  label: z.string().trim().max(50).optional(),
});

export type AddressInput = z.infer<typeof addressSchema>;
