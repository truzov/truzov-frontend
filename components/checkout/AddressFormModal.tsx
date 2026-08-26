'use client';

import { Modal } from '@/components/ui/Modal';
import { AddressForm } from './AddressForm';

/**
 * Create-only. The `address` prop (edit mode) is gone because there is no address update endpoint —
 * see AddressForm and plan §T6.
 */
export function AddressFormModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} title="Add New Address" onClose={onClose}>
      <AddressForm onComplete={onClose} />
    </Modal>
  );
}
