import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { UsageBar } from './UsageBar';

describe('UsageBar severity', () => {
  it('reports memory utilization neutrally while retaining threshold colors for capacity', () => {
    const { rerender } = render(<UsageBar ariaLabel="RAM" used={99} max={100} severity="none" />);
    expect(screen.getByRole('img', { name: 'RAM' }).querySelector('.bg-accent')).not.toBeNull();
    expect(screen.getByRole('img', { name: 'RAM' }).querySelector('.bg-danger,.bg-warn')).toBeNull();
    rerender(<UsageBar ariaLabel="Disk" used={99} max={100} />);
    expect(screen.getByRole('img', { name: 'Disk' }).querySelector('.bg-danger')).not.toBeNull();
  });
});
