'use client';

import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { addressSchema } from '@/lib/validations/checkout';
import { useAddressStore } from '@/store/address.store';
import type { Address } from '@/types';

interface AddressFormProps {
  address?: {
    id: string;
    fullName: string;
    phone: string;
    pincode: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    isDefault?: boolean;
  };
  onComplete: () => void;
}

export function AddressForm({ address, onComplete }: AddressFormProps) {
  const addAddress = useAddressStore((state) => state.addAddress);
  const updateAddress = useAddressStore((state) => state.updateAddress);
  const addresses = useAddressStore((state) => state.addresses);

  const [form, setForm] = useState({
    fullName: address?.fullName ?? '',
    phone: address?.phone ?? '',
    pincode: address?.pincode ?? '',
    addressLine1: address?.addressLine1 ?? '',
    addressLine2: address?.addressLine2 ?? '',
    city: address?.city ?? '',
    state: address?.state ?? '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (Object.keys(touched).length === 0) {
      return;
    }

    const result = addressSchema.safeParse(form);
    if (!result.success) {
      const nextErrors = Object.fromEntries(
        result.error.issues.map((issue) => [issue.path[0]?.toString() ?? 'form', issue.message])
      );

      setErrors((currentErrors) => {
        const updatedErrors = { ...currentErrors };

        Object.keys(updatedErrors).forEach((key) => {
          if (!touched[key] || !nextErrors[key]) {
            delete updatedErrors[key];
          }
        });

        Object.entries(nextErrors).forEach(([key, message]) => {
          if (touched[key]) {
            updatedErrors[key] = message;
          }
        });

        return updatedErrors;
      });
      return;
    }

    setErrors({});
  }, [form, touched]);

  const handleFieldChange = (field: keyof typeof form, value: string) => {
    setForm((currentForm) => ({ ...currentForm, [field]: value }));
    setTouched((currentTouched) => ({ ...currentTouched, [field]: true }));
  };

  const validationResult = addressSchema.safeParse(form);
  const isFormValid = validationResult.success;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const result = addressSchema.safeParse(form);
    if (!result.success) {
      const nextErrors = Object.fromEntries(
        result.error.issues.map((issue) => [issue.path[0]?.toString() ?? 'form', issue.message])
      );
      setTouched((currentTouched) => ({
        ...currentTouched,
        ...Object.keys(nextErrors).reduce<Record<string, boolean>>((acc, key) => {
          acc[key] = true;
          return acc;
        }, {}),
      }));
      setErrors(nextErrors);
      return;
    }

    const payload: Omit<Address, 'id'> = {
      fullName: result.data.fullName,
      phone: result.data.phone,
      pincode: result.data.pincode,
      addressLine1: result.data.addressLine1,
      addressLine2: result.data.addressLine2,
      city: result.data.city,
      state: result.data.state,
      isDefault: addresses.length === 0,
    };

    if (address) {
      updateAddress(address.id, payload);
    } else {
      addAddress(payload);
    }
    onComplete();
  };

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
      <Input
        label="Full Name"
        value={form.fullName}
        onChange={(e) => handleFieldChange('fullName', e.target.value)}
        error={errors.fullName}
        placeholder="Asha Verma"
      />
      <Input
        label="Phone"
        value={form.phone}
        onChange={(e) => handleFieldChange('phone', e.target.value)}
        error={errors.phone}
        placeholder="9876543210"
      />
      <Input
        label="Pincode"
        value={form.pincode}
        onChange={(e) => handleFieldChange('pincode', e.target.value)}
        error={errors.pincode}
        placeholder="560001"
      />
      <Input
        label="City"
        value={form.city}
        onChange={(e) => handleFieldChange('city', e.target.value)}
        error={errors.city}
        placeholder="Bengaluru"
      />
      <Input
        label="State"
        value={form.state}
        onChange={(e) => handleFieldChange('state', e.target.value)}
        error={errors.state}
        placeholder="Karnataka"
      />
      <Input
        label="Address Line 1"
        value={form.addressLine1}
        onChange={(e) => handleFieldChange('addressLine1', e.target.value)}
        error={errors.addressLine1}
        placeholder="Flat / house / street"
      />
      <Input
        label="Address Line 2 (optional)"
        value={form.addressLine2}
        onChange={(e) => handleFieldChange('addressLine2', e.target.value)}
        error={errors.addressLine2}
        placeholder="Area / landmark"
      />
      <div className="flex gap-3 md:col-span-2">
        <Button type="submit" disabled={!isFormValid}>
          {address ? 'Update' : 'Save'} Address
        </Button>
        <Button type="button" variant="ghost" onClick={onComplete}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
