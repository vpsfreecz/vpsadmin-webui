import React from 'react';
import { PageHelpProvider } from '../../app/pageHelp';
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
  const help = !consolePage ? <ContextualHelpPanel key="help" pathname={pathname} scope={mode} /> : null;
  const content = <React.Fragment key="page">{children}</React.Fragment>;
  return (
    <MainContent className="flex-1 p-4" data-testid="shell.main" data-document-title-region>
      <div className="space-y-4">
        <PageHelpProvider>{content}{help}</PageHelpProvider>
      </div>
    </MainContent>
  );
}
