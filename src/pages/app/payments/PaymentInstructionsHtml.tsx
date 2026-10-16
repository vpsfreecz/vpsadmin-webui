import { createElement, useEffect, useId, useMemo, useRef, type MouseEvent, type ReactNode } from 'react';

import { useI18n } from '../../../app/i18n';
import { CopyButton } from '../../../components/ui/CopyButton';
import { clsx } from '../../../components/ui/clsx';
import { sanitizePaymentInstructionsHtml } from './PaymentsModel';

// Only recognized payment rows get a copy action. Unknown server content stays intact.
export function paymentFieldCopyValue(cell: Element): string | null {
  const row = cell.parentElement;
  if (!row || row.tagName !== 'TR' || row.children[1] !== cell || cell.querySelector('img, table')) return null;
  const label = (row.children[0]?.textContent ?? '').replace(/\s+/g, ' ').trim();
  const value = (cell.textContent ?? '').trim();
  if (!value) return null;
  if (/^(?:Sum|Amount|Částka):$/i.test(label)) {
    // Preserve precision and strip currency/period, without guessing ambiguous formats.
    const amount = value.match(/^(\d+(?:[ \u00a0]\d{3})*(?:[.,]\d{1,2})?)\s+(?:CZK|EUR)(?:\s|$)/i);
    return amount ? amount[1]!.replace(/[ \u00a0]/g, '').replace(',', '.') : null;
  }
  if (/^(?:(?:Back|Bank) account for|Bankovní účet pro|IBAN:|BIC:|SWIFT:)/i.test(label)) {
    return value.replace(/\s+/g, '');
  }
  if (/^(?:Variable symbol|Variabilní symbol):$/i.test(label) || /^(?:Message|Zpráva)(?:\s*\(|:|$)/i.test(label)) return value;
  return null;
}

function renderInstructions(html: string, copyLabel: string, helpId: string): ReactNode[] {
  const template = document.createElement('template');
  template.innerHTML = html; // Already sanitized by the payment-specific policy.
  // Restore only the recognized payment-message help, not arbitrary server IDs.
  const heading = Array.from(template.content.querySelectorAll('h1, h2, h3, h4'))
    .find(el => /^(?:Variabilní symbol a zpráva|Variable symbol and message)$/i.test((el.textContent ?? '').replace(/\s+/g, ' ').trim()));
  if (heading && heading.nextElementSibling?.tagName === 'P') {
    const paragraph = heading.nextElementSibling;
    const help = document.createElement('div');
    help.id = helpId;
    help.setAttribute('data-payment-message-help', 'true');
    help.setAttribute('tabindex', '-1');
    heading.id = `${helpId}-heading`;
    help.setAttribute('aria-labelledby', heading.id);
    heading.before(help);
    help.append(heading, paragraph);
    for (const link of Array.from(template.content.querySelectorAll('a[href^="#"]'))) {
      if (/^(?:more info|více informací)$/i.test((link.textContent ?? '').trim())) {
        link.setAttribute('href', `#${helpId}`);
        link.setAttribute('data-payment-message-link', 'true');
        link.removeAttribute('target');
      }
    }
  }
  const renderNode = (node: Node, key: number): ReactNode => {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent;
    if (!(node instanceof Element)) return null;
    const tag = node.tagName.toLowerCase();
    const attributes: Record<string, string | number> = { key };
    const attributeNames: Record<string, string> = { colspan: 'colSpan', rowspan: 'rowSpan', tabindex: 'tabIndex' };
    for (const attribute of Array.from(node.attributes)) {
      attributes[attributeNames[attribute.name] ?? attribute.name] = attribute.value;
    }
    if (tag === 'img' || tag === 'br') return createElement(tag, attributes);
    let children: ReactNode = Array.from(node.childNodes, renderNode);
    const value = tag === 'td' || tag === 'th' ? paymentFieldCopyValue(node) : null;
    if (value !== null) {
      const label = node.parentElement?.children[0]?.textContent?.trim() ?? '';
      children = <div className="flex items-center justify-between gap-2">
        <span className="min-w-0">{children}</span>
        <CopyButton key={value} text={value} iconOnly variant="ghost" size="sm"
          className="shrink-0" ariaLabel={`${copyLabel}: ${label.replace(/:$/, '')}`} />
      </div>;
    }
    return createElement(tag, attributes, children);
  };
  return Array.from(template.content.childNodes, renderNode);
}

export function PaymentInstructionsHtml(props: { html: string; className?: string; testId?: string }) {
  const { lang, t } = useI18n();
  const helpId = useId();
  const root = useRef<HTMLDivElement>(null);
  const highlightTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(highlightTimer.current), []);
  const showMessageHelp = (event: MouseEvent<HTMLDivElement>) => {
    const link = event.target instanceof Element ? event.target.closest('[data-payment-message-link]') : null;
    const help = root.current?.querySelector<HTMLElement>('[data-payment-message-help]');
    if (!link || !help) return;
    event.preventDefault();
    help.focus({ preventScroll: true });
    help.scrollIntoView({ block: 'center', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
    help.dataset['highlighted'] = 'true';
    clearTimeout(highlightTimer.current);
    highlightTimer.current = setTimeout(() => { delete help.dataset['highlighted']; }, 3000);
  };
  const sanitized = useMemo(() => sanitizePaymentInstructionsHtml(props.html, lang), [props.html, lang]);
  const copyLabel = t('common.copy');
  // Stable React elements preserve decoded QR nodes during activity and copy feedback.
  const content = useMemo(() => renderInstructions(sanitized, copyLabel, helpId), [sanitized, copyLabel, helpId]);

  return (
    <div
      ref={root}
      onClick={showMessageHelp}
      data-testid={props.testId}
      className={clsx(
        'payment-instructions text-sm leading-relaxed text-strong [overflow-wrap:anywhere]',
        '[&_a]:font-medium [&_a]:text-accent [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:text-accent-2',
        '[&_h1]:mb-3 [&_h1]:mt-0 [&_h1]:text-xl [&_h1]:font-semibold',
        '[&_h2]:mb-3 [&_h2]:mt-5 [&_h2]:text-lg [&_h2]:font-semibold',
        '[&_h3]:mb-2 [&_h3]:mt-5 [&_h3]:text-base [&_h3]:font-semibold',
        '[&_h4]:mb-2 [&_h4]:mt-4 [&_h4]:text-sm [&_h4]:font-semibold',
        '[&_p]:my-3 [&_ul]:my-3 [&_ol]:my-3 [&_li]:my-1',
        '[&_table]:my-3 [&_table]:w-full [&_table]:max-w-full [&_table]:border-collapse [&_table]:overflow-hidden [&_table]:rounded-lg [&_table]:text-sm',
        '[&_td]:border [&_td]:border-border [&_td]:px-3 [&_td]:py-2 [&_td]:align-top',
        '[&_th]:border [&_th]:border-border [&_th]:bg-surface-2 [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:font-semibold',
        '[&_tr:nth-child(even)_td]:bg-surface-2/60',
        '[&_img]:h-auto [&_img]:max-w-36 [&_img]:rounded-md [&_img]:bg-white [&_img]:p-1',
        '[&_code]:rounded [&_code]:bg-surface-3 [&_code]:px-1',
        props.className,
      )}
    >
      {content}
    </div>
  );
}
