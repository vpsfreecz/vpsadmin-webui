import { useEffect, useState, type CSSProperties } from 'react';

/** Track the visible area at normal zoom; do not fight pinch-to-zoom. */
export function useOverlayViewport(open: boolean): CSSProperties | undefined {
  const [style, setStyle] = useState<CSSProperties>();
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!open || !viewport) return;
    const update = () => {
      if (Math.abs(viewport.scale - 1) > 0.01) {
        setStyle(undefined);
        return;
      }
      setStyle({
        top: viewport.offsetTop,
        bottom: 'auto',
        height: viewport.height,
        '--overlay-height': `${viewport.height}px`,
      } as CSSProperties);
    };
    update();
    viewport.addEventListener('resize', update);
    viewport.addEventListener('scroll', update);
    return () => {
      viewport.removeEventListener('resize', update);
      viewport.removeEventListener('scroll', update);
    };
  }, [open]);
  return style;
}
