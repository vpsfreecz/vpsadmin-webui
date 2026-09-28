import { BffBootstrapError } from './runtimeBootstrap';

type BootstrapLanguage = 'en' | 'cs';

// This screen must be available before the lazy locale chunks and React load.
const BOOTSTRAP_STRINGS: Record<BootstrapLanguage, Record<string, string>> = {
  en: {
    'bootstrap.failure.title': 'App failed to start',
    'bootstrap.failure.body': 'An error occurred while loading the interface.',
    'common.reload': 'Reload',
    'common.retry': 'Retry',
    'common.technical_details': 'Technical details',
  },
  cs: {
    'bootstrap.failure.title': 'Aplikaci se nepodařilo spustit',
    'bootstrap.failure.body': 'Při načítání rozhraní došlo k chybě.',
    'common.reload': 'Znovu načíst',
    'common.retry': 'Zkusit znovu',
    'common.technical_details': 'Technické detaily',
  },
};

function bootstrapTForDocument(doc: Document, key: string): string {
  const primary = String(doc.documentElement?.lang || '')
    .trim()
    .toLowerCase()
    .split('-')[0];
  const lang: BootstrapLanguage = primary === 'cs' ? 'cs' : 'en';
  return BOOTSTRAP_STRINGS[lang][key] ?? BOOTSTRAP_STRINGS.en[key] ?? key;
}

/** Never display or log a response body, URL, token or thrown error message. */
export function safeBootstrapFailureClass(error: unknown): string {
  return error instanceof BffBootstrapError ? error.code : 'app_start_failed';
}

export function renderBootstrapFailure(error: unknown, doc: Document = document, onRetry?: () => void): void {
  const root = doc.getElementById('root');
  if (!root) return;

  const wrapper = doc.createElement('div');
  wrapper.style.cssText = [
    'min-height:100vh',
    'display:flex',
    'align-items:center',
    'justify-content:center',
    'padding:24px',
    'background:#0f172a',
    'color:#e2e8f0',
    'font-family:Inter, ui-sans-serif, system-ui, sans-serif',
  ].join(';');

  const card = doc.createElement('div');
  card.style.cssText = [
    'width:min(720px,100%)',
    'border:1px solid rgba(148,163,184,0.25)',
    'border-radius:12px',
    'padding:20px',
    'background:rgba(15,23,42,0.92)',
    'box-shadow:0 18px 48px rgba(15,23,42,0.45)',
  ].join(';');

  const title = doc.createElement('h1');
  title.textContent = bootstrapTForDocument(doc, 'bootstrap.failure.title');
  title.style.cssText = 'margin:0;font-size:1.25rem;line-height:1.4;font-weight:700;';

  const body = doc.createElement('p');
  body.textContent = bootstrapTForDocument(doc, 'bootstrap.failure.body');
  body.style.cssText = 'margin:12px 0 0 0;font-size:0.95rem;line-height:1.6;color:#cbd5e1;';

  const actions = doc.createElement('div');
  actions.style.cssText = 'display:flex;flex-wrap:wrap;gap:12px;margin-top:16px;';

  const actionButton = doc.createElement('button');
  actionButton.type = 'button';
  actionButton.textContent = bootstrapTForDocument(doc, onRetry ? 'common.retry' : 'common.reload');
  actionButton.style.cssText = [
    'border:0',
    'border-radius:10px',
    'padding:10px 14px',
    'background:#2563eb',
    'color:white',
    'cursor:pointer',
    'font:inherit',
  ].join(';');
  actionButton.onclick = () => {
    if (onRetry) {
      actionButton.disabled = true;
      onRetry();
    } else {
      (doc.defaultView ?? window).location.reload();
    }
  };

  const details = doc.createElement('details');
  details.style.cssText = 'margin-top:16px;';
  const summary = doc.createElement('summary');
  summary.textContent = bootstrapTForDocument(doc, 'common.technical_details');
  summary.style.cssText = 'cursor:pointer;font-weight:600;';
  const pre = doc.createElement('pre');
  pre.textContent = safeBootstrapFailureClass(error);
  pre.style.cssText = [
    'margin-top:12px',
    'max-height:320px',
    'overflow:auto',
    'border-radius:10px',
    'padding:12px',
    'background:#020617',
    'color:#e2e8f0',
    'font-size:0.8rem',
    'line-height:1.5',
    'white-space:pre-wrap',
    'word-break:break-word',
  ].join(';');

  actions.appendChild(actionButton);
  details.appendChild(summary);
  details.appendChild(pre);
  card.appendChild(title);
  card.appendChild(body);
  card.appendChild(actions);
  card.appendChild(details);
  wrapper.appendChild(card);
  root.replaceChildren(wrapper);
}
