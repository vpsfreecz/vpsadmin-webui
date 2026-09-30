import React from 'react';
import type { AppMode } from '../../app/appMode';
import { ContextualHelpPanel } from './ContextualHelpPanel';
import { MainContent } from './MainContentAccessibility';

export function AppMainContent({
  pathname,
  mode,
  children,
}: {
  pathname: string;
  mode: AppMode;
  children: React.ReactNode;
}) {
  const consolePage = /^\/(app|admin)\/vps\/[^/]+\/console\/?$/.test(pathname);
  return (
    <MainContent className="flex-1 p-4" data-testid="shell.main" data-document-title-region>
      <div className="space-y-4">
        {!consolePage && <ContextualHelpPanel pathname={pathname} scope={mode} />}
        {children}
      </div>
    </MainContent>
  );
}
