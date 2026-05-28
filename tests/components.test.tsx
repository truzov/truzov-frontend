import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { DataTable } from '@/components/dashboard/DataTable';

describe('ui components', () => {
  it('renders button and badge primitives', () => {
    render(
      <div>
        <Button>Checkout</Button>
        <Badge variant="success">Lab Verified</Badge>
      </div>
    );

    expect(screen.getByRole('button', { name: 'Checkout' })).toBeInTheDocument();
    expect(screen.getByText('Lab Verified')).toBeInTheDocument();
  });

  it('renders a data table', () => {
    render(
      <DataTable
        columns={[
          { header: 'Name', cell: (row: { name: string }) => row.name },
          { header: 'Status', cell: (row: { status: string }) => row.status },
        ]}
        rows={[{ name: 'Honey', status: 'approved' }]}
      />
    );

    expect(screen.getByText('Honey')).toBeInTheDocument();
    expect(screen.getByText('approved')).toBeInTheDocument();
  });
});
