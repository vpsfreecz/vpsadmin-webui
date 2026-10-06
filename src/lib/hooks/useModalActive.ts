import { useEffect, useState } from 'react';

/** Portal dialogs pause background notifications until their actions are done. */
export function useModalActive() {
  const [active, setActive] = useState<HTMLElement | null>(null);
  useEffect(() => {
    const update = () => {
      const dialogs = document.querySelectorAll<HTMLElement>('[aria-modal="true"][data-overlay]');
      setActive(dialogs.item(dialogs.length - 1));
    };
    const observer = new MutationObserver(update);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['aria-modal'],
    });
    update();
    return () => observer.disconnect();
  }, []);
  return active;
}
