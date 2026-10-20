import { render, screen, cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { TransactionPayloadReader } from './TransactionPayloadReader';

afterEach(cleanup);

describe('TransactionPayloadReader', () => {
  it('shows nested email text with real paragraphs and keeps HTML inert', () => {
    const body = 'Hello Alice,\n\nYour account is ready.\n<script>alert(1)</script>\n<img src=x onerror=alert(2)>';
    const { container } = render(
      <TransactionPayloadReader
        label="Input"
        text={JSON.stringify({
          mail: { text_plain: body },
          recipients: ['alice@example.test'],
          sent: false,
          optional: null,
        })}
      />
    );
    expect([...container.querySelectorAll('pre')].some((pre) => pre.textContent === body)).toBe(true);
    expect(screen.getByText('alice@example.test')).toBeVisible();
    expect(screen.getByText('false')).toBeVisible();
    expect(screen.getByText('null')).toBeVisible();
    expect(container.querySelector('script, img')).toBeNull();
    expect(screen.getByRole('region', { name: 'Input' })).toHaveAttribute('tabindex', '0');
  });

  it.each(['Plain text\nwith paragraphs', '{invalid: json}', '{"id":9007199254740993}', '{"value":1e400}'])(
    'preserves plain, malformed or unsafe numeric input: %s',
    (text) => {
      const { container } = render(<TransactionPayloadReader label="Input" text={text} />);
      expect(container.querySelector('pre')?.textContent).toBe(text);
    }
  );
});
