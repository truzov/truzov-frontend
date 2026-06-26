'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { addressSchema } from '@/lib/validations/checkout';
import { useAddressStore } from '@/store/address.store';

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const result = addressSchema.safeParse(form);
    if (!result.success) {
      setErrors(
        Object.fromEntries(
          result.error.issues.map((i) => [i.path[0]?.toString() ?? 'form', i.message])
        )
      );
      return;
    }
    if (address) {
      updateAddress(address.id, result.data);
    } else {
      addAddress({ ...result.data, isDefault: addresses.length === 0 });
    }
    onComplete();
  };

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
      <Input
        label="Full Name"
        value={form.fullName}
        onChange={(e) => setForm({ ...form, fullName: e.target.value })}
        error={errors.fullName}
        placeholder="Asha Verma"
      />
      <Input
        label="Phone"
        value={form.phone}
        onChange={(e) => setForm({ ...form, phone: e.target.value })}
        error={errors.phone}
        placeholder="9876543210"
      />
      <Input
        label="Pincode"
        value={form.pincode}
        onChange={(e) => setForm({ ...form, pincode: e.target.value })}
        error={errors.pincode}
        placeholder="560001"
      />
      <Input
        label="City"
        value={form.city}
        onChange={(e) => setForm({ ...form, city: e.target.value })}
        error={errors.city}
        placeholder="Bengaluru"
      />
      <Input
        label="State"
        value={form.state}
        onChange={(e) => setForm({ ...form, state: e.target.value })}
        error={errors.state}
        placeholder="Karnataka"
      />
      <Input
        label="Address Line 1"
        value={form.addressLine1}
        onChange={(e) => setForm({ ...form, addressLine1: e.target.value })}
        error={errors.addressLine1}
        placeholder="Flat / house / street"
      />
      <Input
        label="Address Line 2 (optional)"
        value={form.addressLine2}
        onChange={(e) => setForm({ ...form, addressLine2: e.target.value })}
        error={errors.addressLine2}
        placeholder="Area / landmark"
      />
      <div className="flex gap-3 md:col-span-2">
        <Button type="submit">{address ? 'Update' : 'Save'} Address</Button>
        <Button type="button" variant="ghost" onClick={onComplete}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
