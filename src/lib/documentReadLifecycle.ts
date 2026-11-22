// A discarded document must not start another read from an invalid origin.
// Keep caller cancellation separate: its signal may also belong to a mutation.
let documentReads = typeof window === 'undefined' ? undefined : new AbortController();
let pageHidden = false;

if (typeof window !== 'undefined') {
  const resume = () => {
    if (!pageHidden && documentReads?.signal.aborted) documentReads = new AbortController();
  };
  window.addEventListener('beforeunload', () => documentReads?.abort());
  window.addEventListener('pagehide', () => {
    pageHidden = true;
    documentReads?.abort();
  });
  window.addEventListener('pageshow', () => {
    pageHidden = false;
    resume();
  });
  // A cancelled departure keeps this document alive. Real foreground activation
  // resumes reads; synthetic events and hidden/cached documents cannot do so.
  for (const event of ['focus', 'pointerdown', 'keydown', 'click']) {
    window.addEventListener(
      event,
      (activation) => {
        if (activation.isTrusted) resume();
      },
      { capture: true }
    );
  }
}

export function bindDocumentReadSignal(caller?: AbortSignal): {
  signal: AbortSignal | undefined;
  release: () => void;
} {
  const documentSignal = documentReads?.signal;
  if (!documentSignal) return { signal: caller, release: () => {} };

  const combined = new AbortController();
  const abort = () => combined.abort();
  documentSignal.addEventListener('abort', abort, { once: true });
  caller?.addEventListener('abort', abort, { once: true });
  if (documentSignal.aborted || caller?.aborted) abort();

  return {
    signal: combined.signal,
    release: () => {
      documentSignal.removeEventListener('abort', abort);
      caller?.removeEventListener('abort', abort);
    },
  };
}
