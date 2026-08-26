'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { InlineError } from '@/components/ui/ErrorState';
import { Input } from '@/components/ui/Input';
import { useAddresses, useCreateAddress } from '@/hooks/api/useCommerce';
import { fieldError } from '@/lib/api/errors';
import { addressSchema } from '@/lib/validations/checkout';

/**
 * Create a delivery address via `POST /users/me/addresses`.
 *
 * Create-only, deliberately. There is no PATCH, DELETE or set-default endpoint (plan §T6), so the
 * edit path this component used to support has been removed rather than left writing to local state
 * that vanishes on reload — which is what it did before, and which looked like data loss.
 */
export function AddressForm({ onComplete }: { onComplete: () => void }) {
  const { addresses } = useAddresses();
  const createAddress = useCreateAddress();

  const [form, setForm] = useState({
    label: '',
    fullName: '',
    phone: '',
    pincode: '',
    line1: '',
    line2: '',
    city: '',
    state: '',
  });

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

    setErrors(
      Object.fromEntries(Object.entries(issues).filter(([key]) => touched[key]))
    );
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

    createAddress.mutate(
      {
        label: result.data.label || undefined,
        fullName: result.data.fullName,
        phone: result.data.phone,
        line1: result.data.line1,
        // Omitted rather than sent empty: the server validates what it receives.
        line2: result.data.line2 || undefined,
        city: result.data.city,
        state: result.data.state,
        pincode: result.data.pincode,
        // The first address becomes the default. There is no set-default endpoint, so this is the
        // only moment a default can be chosen.
        isDefault: addresses.length === 0,
      },
      { onSuccess: () => onComplete() }
    );
  };

  /** Server-side field errors take precedence: they reflect what was actually rejected. */
  const errorFor = (field: string) => fieldError(createAddress.error, field) ?? errors[field];

  return (
    <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
      <Input
        error={errorFor('fullName')}
        label="Full Name"
        onChange={(event) => handleFieldChange('fullName', event.target.value)}
        placeholder="Asha Singh"
        value={form.fullName}
      />
      <Input
        error={errorFor('phone')}
        label="Phone"
        onChange={(event) => handleFieldChange('phone', event.target.value)}
        placeholder="9876543210"
        value={form.phone}
      />
      <Input
        error={errorFor('pincode')}
        inputMode="numeric"
        label="Pincode"
        onChange={(event) => handleFieldChange('pincode', event.target.value)}
        placeholder="411001"
        value={form.pincode}
      />
      <Input
        error={errorFor('city')}
        label="City"
        onChange={(event) => handleFieldChange('city', event.target.value)}
        placeholder="Pune"
        value={form.city}
      />
      <Input
        error={errorFor('state')}
        label="State"
        onChange={(event) => handleFieldChange('state', event.target.value)}
        placeholder="Maharashtra"
        value={form.state}
      />
      <Input
        error={errorFor('label')}
        label="Label (optional)"
        onChange={(event) => handleFieldChange('label', event.target.value)}
        placeholder="Home"
        value={form.label}
      />
      <Input
        error={errorFor('line1')}
        label="Address Line 1"
        onChange={(event) => handleFieldChange('line1', event.target.value)}
        placeholder="Flat / house / street"
        value={form.line1}
      />
      <Input
        error={errorFor('line2')}
        label="Address Line 2 (optional)"
        onChange={(event) => handleFieldChange('line2', event.target.value)}
        placeholder="Area / landmark"
        value={form.line2}
      />

      {createAddress.isError ? (
        <div className="md:col-span-2">
          <InlineError error={createAddress.error} />
        </div>
      ) : null}

      <div className="flex gap-3 md:col-span-2">
        <Button disabled={!isFormValid || createAddress.isPending} loading={createAddress.isPending} type="submit">
          Save Address
        </Button>
        <Button disabled={createAddress.isPending} type="button" variant="ghost" onClick={onComplete}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
