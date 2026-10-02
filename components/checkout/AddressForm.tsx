'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { InlineError } from '@/components/ui/ErrorState';
import { Input } from '@/components/ui/Input';
import { useAddresses, useCreateAddress, useUpdateAddress } from '@/hooks/api/useCommerce';
import { fieldError } from '@/lib/api/errors';
import { addressSchema } from '@/lib/validations/checkout';
import type { AddressDto } from '@/types/api';

/**
 * Create or edit a delivery address (`POST` / `PATCH /users/me/addresses`).
 *
 * The edit path is a full replace — the PATCH endpoint takes the same shape as create, so the
 * form always submits every field and there is no absent-vs-null distinction to interpret.
 * Ownership is enforced server-side: a foreign address id answers 403 like a missing one.
 */
export function AddressForm({
  address,
  onComplete,
}: {
  /** When present the form edits this address instead of creating one. */
  address?: AddressDto;
  onComplete: () => void;
}) {
  const { addresses } = useAddresses();
  const createAddress = useCreateAddress();
  const updateAddress = useUpdateAddress();

  const [form, setForm] = useState({
    label: address?.label ?? '',
    fullName: address?.fullName ?? '',
    phone: address?.phone ?? '',
    pincode: address?.pincode ?? '',
    line1: address?.line1 ?? '',
    line2: address?.line2 ?? '',
    city: address?.city ?? '',
    state: address?.state ?? '',
    landmark: address?.landmark ?? '',
  });
  // Defaults: keep the edited address's flag; a first-ever create starts as the default.
  const [isDefault, setIsDefault] = useState(address?.isDefault ?? addresses.length === 0);

  const isPending = createAddress.isPending || updateAddress.isPending;
  const mutationError = updateAddress.isError ? updateAddress.error : createAddress.error;

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Only validate fields the user has actually interacted with, so the form does not open covered
  // in red.
  useEffect(() => {
    if (Object.keys(touched).length === 0) {
      return;
    }

    const result = addressSchema.safeParse(form);

    if (result.success) {
      setErrors({});
      return;
    }

    const issues = Object.fromEntries(
      result.error.issues.map((issue) => [issue.path[0]?.toString() ?? 'form', issue.message])
    );

    setErrors(Object.fromEntries(Object.entries(issues).filter(([key]) => touched[key])));
  }, [form, touched]);

  const handleFieldChange = (field: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setTouched((current) => ({ ...current, [field]: true }));
  };

  const isFormValid = addressSchema.safeParse(form).success;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const result = addressSchema.safeParse(form);

    if (!result.success) {
      const issues = Object.fromEntries(
        result.error.issues.map((issue) => [issue.path[0]?.toString() ?? 'form', issue.message])
      );
      setTouched((current) => ({
        ...current,
        ...Object.fromEntries(Object.keys(issues).map((key) => [key, true])),
      }));
      setErrors(issues);
      return;
    }

    const body = {
      label: result.data.label || undefined,
      fullName: result.data.fullName,
      phone: result.data.phone,
      line1: result.data.line1,
      // Omitted rather than sent empty: the server validates what it receives.
      line2: result.data.line2 || undefined,
      city: result.data.city,
      state: result.data.state,
      pincode: result.data.pincode,
      landmark: result.data.landmark || undefined,
      isDefault,
    };

    if (address) {
      updateAddress.mutate({ addressId: address.id, body }, { onSuccess: () => onComplete() });
      return;
    }

    createAddress.mutate(body, { onSuccess: () => onComplete() });
  };

  /** Server-side field errors take precedence: they reflect what was actually rejected. */
  const errorFor = (field: string) => fieldError(mutationError, field) ?? errors[field];

  return (
    <form className="flex min-h-0 flex-col" onSubmit={handleSubmit}>
      <div className="min-h-0 space-y-6 overflow-y-auto overscroll-contain py-5 pr-1">
        <fieldset className="grid min-w-0 gap-x-4 gap-y-2 sm:grid-cols-2">
          <legend className="mb-4 text-base font-medium text-text-primary">Contact details</legend>
          <Input
            autoComplete="shipping name"
            error={errorFor('fullName')}
            label="Full name"
            name="fullName"
            onChange={(event) => handleFieldChange('fullName', event.target.value)}
            placeholder="Asha Singh"
            value={form.fullName}
          />
          <Input
            autoComplete="shipping tel"
            error={errorFor('phone')}
            label="Phone"
            name="phone"
            type="tel"
            onChange={(event) => handleFieldChange('phone', event.target.value)}
            placeholder="9876543210"
            value={form.phone}
          />
        </fieldset>
        <fieldset className="grid min-w-0 gap-x-4 gap-y-2">
          <legend className="mb-4 text-base font-medium text-text-primary">Delivery address</legend>
          <Input
            autoComplete="shipping address-line1"
            error={errorFor('line1')}
            label="House, building and street"
            name="line1"
            onChange={(event) => handleFieldChange('line1', event.target.value)}
            placeholder="Flat / house / street"
            value={form.line1}
          />
          <Input
            autoComplete="shipping address-line2"
            error={errorFor('line2')}
            label="Area or locality (optional)"
            name="line2"
            onChange={(event) => handleFieldChange('line2', event.target.value)}
            placeholder="Area"
            value={form.line2}
          />
          <div className="grid min-w-0 gap-x-4 gap-y-2 sm:grid-cols-2">
            <Input
              autoComplete="shipping postal-code"
              error={errorFor('pincode')}
              inputMode="numeric"
              label="Pincode"
              name="pincode"
              onChange={(event) => handleFieldChange('pincode', event.target.value)}
              placeholder="411001"
              value={form.pincode}
            />
            <Input
              autoComplete="shipping address-level2"
              error={errorFor('city')}
              label="City"
              name="city"
              onChange={(event) => handleFieldChange('city', event.target.value)}
              placeholder="Pune"
              value={form.city}
            />
            <Input
              autoComplete="shipping address-level1"
              error={errorFor('state')}
              label="State"
              name="state"
              onChange={(event) => handleFieldChange('state', event.target.value)}
              placeholder="Maharashtra"
              value={form.state}
            />
            <Input
              error={errorFor('landmark')}
              label="Landmark (optional)"
              name="landmark"
              onChange={(event) => handleFieldChange('landmark', event.target.value)}
              placeholder="Near the temple"
              value={form.landmark}
            />
          </div>
        </fieldset>
        <fieldset className="grid min-w-0 gap-x-4 gap-y-2 sm:grid-cols-2">
          <legend className="mb-4 text-base font-medium text-text-primary">
            Address preferences
          </legend>
          <Input
            error={errorFor('label')}
            label="Label (optional)"
            name="label"
            onChange={(event) => handleFieldChange('label', event.target.value)}
            placeholder="Home or work"
            value={form.label}
          />
          {/* Only one default exists server-side: setting this demotes the others in one update. */}
          <label className="flex min-h-11 items-center gap-3 self-end text-sm font-medium text-text-primary">
            <input
              checked={isDefault}
              className="h-5 w-5 accent-[#04342c]"
              onChange={(event) => setIsDefault(event.target.checked)}
              type="checkbox"
            />
            Set as default address
          </label>
        </fieldset>

        {mutationError ? (
          <div>
            <InlineError error={mutationError} />
          </div>
        ) : null}
      </div>

      <div className="flex shrink-0 flex-wrap gap-3 border-t border-surface-border py-4">
        <Button
          className="min-h-11 flex-1 sm:flex-none"
          disabled={!isFormValid || isPending}
          loading={isPending}
          type="submit"
        >
          {address ? 'Save changes' : 'Save address'}
        </Button>
        <Button
          className="min-h-11 flex-1 sm:flex-none"
          disabled={isPending}
          type="button"
          variant="ghost"
          onClick={onComplete}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
