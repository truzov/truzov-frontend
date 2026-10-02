'use client';

import { Modal } from '@/components/ui/Modal';
import { AddressForm } from './AddressForm';
import type { AddressDto } from '@/types/api';

/** Add or edit a saved address. Pass `address` for edit mode. */
export function AddressFormModal({
  open,
  onClose,
  address,
}: {
  open: boolean;
  onClose: () => void;
  address?: AddressDto;
}) {
  return (
    <Modal
      bodyClassName="flex flex-col overflow-hidden py-0"
      className="max-w-2xl"
      open={open}
      title={address ? 'Edit address' : 'Add new address'}
      onClose={onClose}
    >
      <AddressForm address={address} onComplete={onClose} />
    </Modal>
  );
}
