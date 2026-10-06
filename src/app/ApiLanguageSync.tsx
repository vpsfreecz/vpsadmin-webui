import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useI18n } from './i18n';

/** Refresh server-localized data without remounting editors or replaying writes. */
export function ApiLanguageSync() {
  const { lang } = useI18n();
  const queryClient = useQueryClient();
  const previousLanguage = useRef(lang);

  useEffect(() => {
    if (previousLanguage.current === lang) return;
    previousLanguage.current = lang;
    let cancelled = false;
    // Cancel old-language reads before invalidating active and inactive caches.
    void queryClient.cancelQueries().then(() => {
      if (!cancelled) void queryClient.invalidateQueries();
    });
    return () => {
      cancelled = true;
    };
  }, [lang, queryClient]);

  return null;
}
