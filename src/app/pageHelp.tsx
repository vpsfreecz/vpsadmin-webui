import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

type HeadingRegistration = { element: HTMLElement; priority: number };
type PageHelpRegistry = {
  heading: HTMLElement | null;
  available: boolean;
  setAvailable: (available: boolean) => void;
  register: (element: HTMLElement, priority: number) => () => void;
};

const PageHelpContext = createContext<PageHelpRegistry | null>(null);

/** Keep help attached to one primary heading without owning or remounting page content. */
export function PageHelpProvider({ children }: { children: React.ReactNode }) {
  const [headings, setHeadings] = useState<HeadingRegistration[]>([]);
  const [available, setAvailable] = useState(false);
  const register = useCallback((element: HTMLElement, priority: number) => {
    setHeadings((previous) => [...previous, { element, priority }]);
    return () => setHeadings((previous) => previous.filter((item) => item.element !== element));
  }, []);
  const heading = useMemo(
    () =>
      [...headings]
        .filter((item) => item.element.isConnected)
        .sort(
          (a, b) =>
            a.priority - b.priority ||
            (a.element.compareDocumentPosition(b.element) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1)
        )[0]?.element ?? null,
    [headings]
  );
  const value = useMemo(() => ({ heading, available, setAvailable, register }), [heading, available, register]);
  return <PageHelpContext.Provider value={value}>{children}</PageHelpContext.Provider>;
}

export function usePageHelpRegistry() {
  return useContext(PageHelpContext);
}
