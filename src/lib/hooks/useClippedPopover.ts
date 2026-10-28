import { useLayoutEffect, useState, type CSSProperties, type RefObject } from 'react';

/** Keep inline choices inside their scroll panel and the visible viewport. */
export function useClippedPopover(
  open: boolean,
  anchorRef: RefObject<HTMLElement | null>,
  popupRef: RefObject<HTMLElement | null>
): CSSProperties | undefined {
  const [position, setPosition] = useState<CSSProperties>();
  useLayoutEffect(() => {
    const anchor = anchorRef.current;
    const popup = popupRef.current;
    if (!open || !anchor || !popup) {
      setPosition(undefined);
      return;
    }
    function update() {
      if (!anchor || !popup || anchor.getClientRects().length === 0) return;
      const viewport = window.visualViewport;
      let top = viewport?.offsetTop ?? 0;
      let bottom = top + (viewport?.height ?? window.innerHeight);
      for (let parent = anchor.parentElement; parent; parent = parent.parentElement) {
        if (!['auto', 'scroll', 'hidden', 'clip'].includes(getComputedStyle(parent).overflowY)) continue;
        const bounds = parent.getBoundingClientRect();
        top = Math.max(top, bounds.top + parent.clientTop);
        bottom = Math.min(bottom, bounds.top + parent.clientTop + parent.clientHeight);
      }
      const bounds = anchor.getBoundingClientRect();
      const below = Math.max(0, bottom - bounds.bottom - 4);
      const above = Math.max(0, bounds.top - top - 4);
      const desired = Math.min(256, popup.scrollHeight + 2);
      const upwards = below < desired && above > below;
      const next: CSSProperties = {
        top: upwards ? 'auto' : '100%',
        bottom: upwards ? 'calc(100% + 4px)' : 'auto',
        marginTop: upwards ? 0 : 4,
        maxHeight: Math.min(256, upwards ? above : below),
        visibility: bounds.bottom <= top || bounds.top >= bottom ? 'hidden' : undefined,
      };
      setPosition((previous) =>
        previous &&
        previous.top === next.top &&
        previous.bottom === next.bottom &&
        previous.marginTop === next.marginTop &&
        previous.maxHeight === next.maxHeight &&
        previous.visibility === next.visibility
          ? previous
          : next
      );
    }
    update();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(update);
    observer?.observe(anchor);
    observer?.observe(popup);
    for (let parent = anchor.parentElement; parent; parent = parent.parentElement) observer?.observe(parent);
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    const viewport = window.visualViewport;
    viewport?.addEventListener('resize', update);
    viewport?.addEventListener('scroll', update);
    return () => {
      observer?.disconnect();
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
      viewport?.removeEventListener('resize', update);
      viewport?.removeEventListener('scroll', update);
    };
  }, [open, anchorRef, popupRef]);
  return position;
}
