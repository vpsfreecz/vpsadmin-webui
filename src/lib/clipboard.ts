export async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // ignore and fallback
  }

  const selection = window.getSelection();
  const range = selection && !selection.isCollapsed ? selection.getRangeAt(0).cloneRange() : null;
  const activeElement = document.activeElement;
  const el = document.createElement('textarea');
  el.value = text;
  el.setAttribute('readonly', '');
  el.style.position = 'fixed';
  el.style.top = '0';
  el.style.left = '0';
  el.style.opacity = '0';

  try {
    document.body.appendChild(el);
    el.select();
    return document.execCommand('copy');
  } catch {
    return false;
  } finally {
    const movedFocus = document.activeElement === el;
    el.remove();
    if (movedFocus && activeElement instanceof HTMLElement) {
      activeElement.focus({ preventScroll: true });
    }
    if (selection && range) {
      selection.removeAllRanges();
      selection.addRange(range);
    }
  }
}
