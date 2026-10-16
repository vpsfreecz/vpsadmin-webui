import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { PaymentInstructionsHtml, paymentFieldCopyValue } from './PaymentInstructionsHtml';

const locale = vi.hoisted(() => ({ lang: 'en' as 'en' | 'cs' }));
vi.mock('../../../app/i18n', () => ({ useI18n: () => ({ ...locale, t: (key: string) => key }) }));

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

describe('individual payment values', () => {
  test.each([
    ['Bankovní účet pro CZK (CZ):', '2200 041594 / 2010', '2200041594/2010'],
    ['IBAN:', 'SK20 8330 0000 0026 0150 2873', 'SK2083300000002601502873'],
    ['BIC:', 'FIOBCZPPXXX', 'FIOBCZPPXXX'],
    ['Variable symbol:', '00053', '00053'],
    ['Zpráva (více informací):', '/VS/53', '/VS/53'],
    ['Sum:', '1 200,50 CZK per month', '1200.50'],
    ['Částka:', '0 EUR za měsíc', '0'],
    ['Amount:', '12.25 EUR per month', '12.25'],
    ['Sum:', 'unknown CZK', null],
    ['Bank account overview:', 'https://example.test', null],
  ])('copies only the value of %s', (label, value, expected) => {
    const table = document.createElement('table');
    table.innerHTML = `<tr><td>${label}</td><td>${value}</td></tr>`;
    expect(paymentFieldCopyValue(table.querySelectorAll('td')[1]!)).toBe(expected);
  });
});
