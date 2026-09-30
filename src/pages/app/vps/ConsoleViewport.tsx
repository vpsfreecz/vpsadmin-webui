import React, { useLayoutEffect, useRef, useState } from 'react';

// The pinned console-router renders a 600px terminal plus six keyboard rows.
// It is cross-origin and has no resize-message protocol. Give it a full-size
// viewport, then scale the complete document instead of clipping the keyboard.
// Keep its internal dimensions stable: this router fits xterm only on load.
const ROUTER_HEIGHT = 920;
const ROUTER_WIDTH = 1280;

export function ConsoleViewport({ children, nativeSize }: { children: React.ReactNode; nativeSize: boolean }) {
  const host = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: ROUTER_WIDTH, available: ROUTER_HEIGHT });

  useLayoutEffect(() => {
    const element = host.current;
    if (!element) return;
    const measure = () => {
      const top = element.getBoundingClientRect().top + window.scrollY;
      const width = element.clientWidth;
      const available = Math.max(120, (window.visualViewport?.height ?? window.innerHeight) - top - 18);
      setSize((previous) =>
        previous.width === width && previous.available === available ? previous : { width, available }
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    // Toolbar wrapping, error banners and sidebar width can all change the space.
    observer.observe(document.querySelector('[data-testid="shell.main"]') ?? element);
    document.querySelectorAll('[data-testid="vps.console.header"], [data-testid="vps.console.page"] > :first-child')
      .forEach((toolbar) => observer.observe(toolbar));
    window.addEventListener('resize', measure);
    window.visualViewport?.addEventListener('resize', measure);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
      window.visualViewport?.removeEventListener('resize', measure);
    };
  }, []);

  const scale = nativeSize ? 1 : Math.min(1, size.available / ROUTER_HEIGHT, size.width / ROUTER_WIDTH);
  return (
    <div
      ref={host}
      className={nativeSize ? 'relative overflow-auto bg-black' : 'relative overflow-hidden bg-black'}
      style={{ height: ROUTER_HEIGHT * scale }}
      data-testid="vps.console.viewport"
    >
      <div
        className="absolute top-0 origin-top-left"
        style={{
          left: Math.max(0, (size.width - ROUTER_WIDTH * scale) / 2),
          width: ROUTER_WIDTH,
          height: ROUTER_HEIGHT,
          transform: `scale(${scale})`,
        }}
      >
        {children}
      </div>
    </div>
  );
}
