'use client';

import { Modal } from '@/components/ui/Modal';
import { AddressForm } from './AddressForm';
import type { Address } from '@/types';

interface AddressFormModalProps {
  open: boolean;
  address?: Address;
  onClose: () => void;
}

export function AddressFormModal({ open, address, onClose }: AddressFormModalProps) {
  return (
    <Modal
      open={open}
      title={address ? 'Edit Address' : 'Add New Address'}
      onClose={onClose}
    >
      <AddressForm address={address} onComplete={onClose} />
    </Modal>
  );
}