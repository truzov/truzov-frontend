import type { VerificationStatus } from '@/types';

export const verificationLabels: Record<VerificationStatus, string> = {
  submitted: 'Submitted',
  samples_collected: 'Samples Collected',
  in_lab: 'In Lab',
  report_uploaded: 'Report Uploaded',
  approved: 'Approved',
  rejected: 'Rejected',
  pending: 'Pending',
};

export const verificationColumns: VerificationStatus[] = [
  'submitted',
  'samples_collected',
  'in_lab',
  'report_uploaded',
  'approved',
  'rejected',
];

export function nextVerificationStatus(status: VerificationStatus): VerificationStatus {
  const index = verificationColumns.indexOf(status);

  if (index < 0 || index === verificationColumns.length - 1) {
    return status;
  }

  return verificationColumns[index + 1];
}
