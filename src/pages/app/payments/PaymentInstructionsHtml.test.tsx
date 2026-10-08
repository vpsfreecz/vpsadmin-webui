import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { PaymentInstructionsHtml } from './PaymentInstructionsHtml';

const locale = vi.hoisted(() => ({ lang: 'en' as 'en' | 'cs' }));
vi.mock('../../../app/i18n', () => ({ useI18n: () => locale }));

const instructions = '<h3>Payment in CZK</h3><img src="/qr.png?amount=300" alt="CZK QR">';

describe('PaymentInstructionsHtml', () => {
  beforeEach(() => { locale.lang = 'en'; });

  test('preserves decoded image nodes across unrelated parent updates', () => {
    const { rerender } = render(<PaymentInstructionsHtml html={instructions} />);
    const image = screen.getByRole('img', { name: 'CZK QR' });
    const heading = screen.getByRole('heading');

    rerender(<PaymentInstructionsHtml html={instructions} className="updated-layout" />);

    expect(screen.getByRole('img', { name: 'CZK QR' })).toBe(image);
    expect(screen.getByRole('heading')).toBe(heading);
    expect(image.parentElement).toHaveClass('updated-layout');
  });

  test('updates the image when payment instructions change', () => {
    const { rerender } = render(<PaymentInstructionsHtml html={instructions} />);

    rerender(<PaymentInstructionsHtml html={instructions.replace('amount=300', 'amount=600')} />);

    expect(screen.getByRole('img', { name: 'CZK QR' })).toHaveAttribute('src', '/qr.png?amount=600');
  });

  test('updates translated instructions when the UI language changes', () => {
    const { rerender } = render(<PaymentInstructionsHtml html={instructions} />);
    expect(screen.getByRole('heading')).toHaveTextContent('Payment in CZK');

    locale.lang = 'cs';
    rerender(<PaymentInstructionsHtml html={instructions} />);

    expect(screen.getByRole('heading')).toHaveTextContent('Platba v CZK');
    expect(screen.getByRole('img', { name: 'CZK QR' })).toHaveAttribute('src', '/qr.png?amount=300');
  });
});
