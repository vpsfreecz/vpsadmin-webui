import React, { useEffect } from 'react';
import { Link, useMatch } from 'react-router-dom';
import {
  Activity,
  Boxes,
  ClipboardList,
  CreditCard,
  Cpu,
  Database,
  DatabaseBackup,
  FileText,
  FolderOutput,
  Globe,
  GitMerge,
  HardDrive,
  Inbox,
  LayoutDashboard,
  Layers,
  ListOrdered,
  Mail,
  Menu,
  MemoryStick,
  Network,
  Server,
  Shield,
  ShieldAlert,
  TriangleAlert,
  User,
  Users,
} from 'lucide-react';

import { BuildFooter } from './BuildFooter';
import { Drawer } from '../ui/Drawer';
import { clsx } from '../ui/clsx';
import { useI18n } from '../../app/i18n';
import { SidebarTips } from './SidebarTips';
import type { UserRole } from '../../lib/roles';

export interface NavItem {
  id: string;
  to: string;
  activePathPrefix?: string;
  label: string;
  icon: React.ReactNode;
  group?: AdminSidebarGroupId;
  footer?: boolean;
  status?: boolean;
}

export type AdminSidebarGroupId =
  | 'services'
  | 'operations'
  | 'users-finance'
  | 'infrastructure'
  | 'content';

export interface SidebarNavSection {
  id: AdminSidebarGroupId | 'ungrouped' | 'status';
  labelKey?: string;
  items: NavItem[];
}

const adminSidebarGroups: Array<{ id: AdminSidebarGroupId; labelKey: string }> = [
  { id: 'services', labelKey: 'nav.group.services' },
  { id: 'operations', labelKey: 'nav.group.operations' },
  { id: 'users-finance', labelKey: 'nav.group.users_finance' },
  { id: 'infrastructure', labelKey: 'nav.group.infrastructure' },
  { id: 'content', labelKey: 'nav.group.content' },
];

export function sidebarNavSections(items: NavItem[]): SidebarNavSection[] {
  const mainItems = items.filter((item) => !item.footer);
  if (!mainItems.some((item) => item.group)) {
    return [{ id: 'ungrouped', items: mainItems }];
  }

  const sections: SidebarNavSection[] = adminSidebarGroups.flatMap((group) => {
    const groupItems = mainItems.filter((item) => item.group === group.id);
    return groupItems.length > 0 ? [{ ...group, items: groupItems }] : [];
  });
  const ungrouped = mainItems.filter((item) => !item.group && !item.status);
  const status = mainItems.filter((item) => item.status);
  if (ungrouped.length > 0) sections.unshift({ id: 'ungrouped', items: ungrouped });
  if (status.length > 0) sections.push({ id: 'status', items: status });
  return sections;
}

export function sidebarFooterNavItems(items: NavItem[]): NavItem[] {
  return items.filter((item) => item.footer);
}

export function primarySidebarNavItems(items: NavItem[]): NavItem[] {
  return items.filter((item) => item.id !== 'action-states' && !item.to.match(/\/action[_-]states(?:\/|$)/));
}

export function buildSidebarNavItems(opts: {
  basePath: string;
  appMode: 'user' | 'admin';
  role: UserRole;
  t: (key: any) => string;
}): NavItem[] {
  const { basePath, appMode, role, t } = opts;
  const adminGroup = (group: AdminSidebarGroupId): Pick<NavItem, 'group'> =>
    appMode === 'admin' ? { group } : {};

  const items: NavItem[] = [
    { id: 'dashboard', to: basePath, label: t('nav.dashboard'), icon: <LayoutDashboard size={18} /> },
    { id: 'vps', to: `${basePath}/vps`, label: t('nav.vps'), icon: <Server size={18} />, ...adminGroup('services') },
    ...(appMode === 'admin'
      ? [{
          id: 'datasets',
          to: `${basePath}/datasets`,
          label: t('nav.datasets'),
          icon: <Database size={18} />,
          group: 'services' as const,
        }]
      : []),
    { id: 'nas', to: `${basePath}/nas`, label: t('nav.nas'), icon: <HardDrive size={18} />, ...adminGroup('services') },
    ...(appMode === 'user'
      ? [{ id: 'backups', to: `${basePath}/backups`, label: t('nav.backups'), icon: <DatabaseBackup size={18} /> }]
      : []),
    { id: 'exports', to: `${basePath}/exports`, label: t('nav.exports'), icon: <FolderOutput size={18} />, ...adminGroup('services') },
    { id: 'dns', to: `${basePath}/dns`, label: t('nav.dns'), icon: <Globe size={18} />, ...adminGroup('services') },
    ...(appMode === 'user'
      ? [{ id: 'networking', to: `${basePath}/networking`, label: t('nav.networking'), icon: <Network size={18} /> }]
      : []),
    { id: 'transactions', to: `${basePath}/transactions`, label: t('nav.transactions'), icon: <ListOrdered size={18} />, ...adminGroup('operations') },
    { id: 'monitoring', to: `${basePath}/monitoring`, label: t('nav.monitoring'), icon: <Activity size={18} />, ...adminGroup('operations') },
    { id: 'incidents', to: `${basePath}/incidents`, label: t('nav.incidents'), icon: <TriangleAlert size={18} />, ...adminGroup('operations') },
    { id: 'oom-reports', to: `${basePath}/oom-reports`, label: t('nav.oom_reports'), icon: <MemoryStick size={18} />, ...adminGroup('operations') },
  ];

  if (appMode === 'user') {
    items.push({ id: 'payments', to: `${basePath}/payments`, label: t('nav.payments'), icon: <CreditCard size={18} /> });
    items.push({ id: 'requests', to: `${basePath}/requests`, label: t('nav.my_requests'), icon: <Inbox size={18} /> });
  }

  if (appMode === 'admin') {
    items.push({ id: 'audit', to: `${basePath}/audit`, label: t('nav.audit'), icon: <ClipboardList size={18} />, group: 'operations' });
    items.push({ id: 'users', to: `${basePath}/users`, label: t('nav.users'), icon: <Users size={18} />, group: 'users-finance' });
    items.push({
      id: 'user-namespaces',
      to: `${basePath}/user-namespaces/namespaces`,
      label: t('nav.user_namespaces'),
      icon: <Layers size={18} />,
      group: 'users-finance',
    });
    items.push({
      id: 'networking',
      to: `${basePath}/networking/ip-addresses`,
      label: t('nav.networking'),
      icon: <Network size={18} />,
      group: 'services',
    });
    items.push({ id: 'requests', to: `${basePath}/requests`, label: t('nav.requests'), icon: <Inbox size={18} />, group: 'users-finance' });
    items.push({ id: 'mailer', to: `${basePath}/mailer/templates`, label: t('nav.mailer'), icon: <Mail size={18} />, group: 'content' });
    items.push({ id: 'content', to: `${basePath}/content/news`, label: t('nav.content'), icon: <FileText size={18} />, group: 'content' });
    if (role === 'admin') {
      items.push({
        id: 'finance',
        to: `${basePath}/payments/incoming`,
        activePathPrefix: `${basePath}/payments`,
        label: t('nav.finance'),
        icon: <CreditCard size={18} />,
        group: 'users-finance',
      });
    }
    items.push({ id: 'cluster', to: `${basePath}/cluster/summary`, label: t('nav.cluster'), icon: <Boxes size={18} />, group: 'infrastructure' });
    items.push({ id: 'nodes', to: `${basePath}/nodes`, label: t('nav.nodes'), icon: <Cpu size={18} />, group: 'infrastructure' });
    items.push({ id: 'migration-plans', to: `${basePath}/migration-plans`, label: t('nav.migration_plans'), icon: <GitMerge size={18} />, group: 'infrastructure' });
    items.push({ id: 'admin-info', to: `${basePath}/admin-info`, label: t('nav.admin'), icon: <Shield size={18} />, group: 'infrastructure' });
  }

  items.push({
    id: 'account',
    to: `${basePath}/profile`,
    label: t('nav.account'),
    icon: <User size={18} />,
    ...(appMode === 'admin' ? { footer: true } : {}),
  });
  items.push(
    {
      id: 'outages',
      to: `${basePath}/outages`,
      label: t('nav.outages'),
      icon: <Activity size={18} />,
      status: true,
    },
    {
      id: 'security-advisories',
      to: appMode === 'admin' && role !== 'admin'
        ? `${basePath}/status/security-advisories` : `${basePath}/security-advisories`,
      label: t('nav.security_advisories'),
      icon: <ShieldAlert size={18} />,
      status: true,
    },
  );
  return items;
}

function isExactNavItem(item: NavItem): boolean {
  return item.id === 'dashboard' || item.to === '/';
}

function NavigationLink(props: {
  item: NavItem;
  surface: 'drawer' | 'sidebar';
  compact?: boolean;
  onClick?: () => void;
}) {
  const { item, surface, compact = false, onClick } = props;
  const readingStatus = useMatch('/admin/status/:statusPage/*');
  const isActive = Boolean(useMatch({
    path: item.activePathPrefix ?? item.to,
    end: isExactNavItem(item),
  })) || Boolean(item.status && readingStatus?.params['statusPage'] === item.id);

  return (
    <Link
      to={item.to}
      aria-current={isActive ? 'page' : undefined}
      data-testid={`nav.${surface}.${item.id}`}
      className={
        clsx(
          'flex min-w-0 items-center gap-2 rounded-md px-3 text-sm transition-colors',
          surface === 'drawer' || !compact ? 'py-2' : 'py-1.5',
          isActive ? 'bg-accent/15 text-fg' : 'text-muted hover:bg-surface-2 hover:text-fg'
        )
      }
      aria-label={item.label}
      onClick={onClick}
    >
      <span className="shrink-0" aria-hidden="true">{item.icon}</span>
      <span className="min-w-0 truncate">{item.label}</span>
    </Link>
  );
}

function NavigationSections(props: {
  sections: SidebarNavSection[];
  surface: 'drawer' | 'sidebar';
  compact?: boolean;
  t: (key: any) => string;
  onNavigate?: () => void;
}) {
  const { sections, surface, compact = false, t, onNavigate } = props;

  return (
    <>
      {sections.map((section, index) => {
        const label = section.labelKey ? t(section.labelKey) : null;
        const headingId = label ? `${surface}-nav-group-${section.id}` : undefined;

        return (
          <section
            key={section.id}
            aria-labelledby={headingId}
            className={clsx(index > 0 && 'pt-1')}
            data-testid={section.id === 'ungrouped' ? undefined : `nav.${surface}.group.${section.id}`}
          >
            {label ? (
              <div
                id={headingId}
                className="px-3 pb-1 pt-1 text-xs font-semibold uppercase tracking-wide text-muted"
              >
                {label}
              </div>
            ) : null}

            <div className="space-y-1">
              {section.items.map((item) => (
                <NavigationLink
                  key={item.to}
                  item={item}
                  surface={surface}
                  compact={compact}
                  onClick={onNavigate}
                />
              ))}
            </div>
          </section>
        );
      })}
    </>
  );
}

export function AppLogo() {
  return (
    <div className="flex items-center gap-2">
      <img src="/favicon.png" alt="" aria-hidden="true" width={32} height={32} className="h-8 w-8 shrink-0 object-contain" />
      <div className="leading-tight">
        <div className="text-sm font-semibold">vpsAdmin</div>
      </div>
    </div>
  );
}

/** Mobile has one entry point; desktop controls live entirely in the sidebar. */
export function MobileNavigationTrigger(props: { open: boolean; onOpen: () => void }) {
  const { t } = useI18n();
  return (
    <header className="sticky top-0 z-10 border-b border-border bg-bg px-4 py-2 md:hidden [@media(max-height:640px)]:block" data-testid="shell.header">
      <button
        type="button"
        className="inline-flex min-h-11 items-center gap-2 rounded-md px-3 text-sm hover:bg-surface-2"
        onClick={props.onOpen}
        aria-label={t('nav.open')}
        aria-expanded={props.open}
        data-testid="shell.mobile-nav-button"
      >
        <Menu size={20} aria-hidden="true" />
        <span>{t('nav.navigation')}</span>
      </button>
    </header>
  );
}

export function AppSidebar(props: {
  mobileNavOpen: boolean;
  onCloseMobileNav: () => void;
  navItems: NavItem[];
  controls: React.ReactNode;
}) {
  const { mobileNavOpen, onCloseMobileNav, navItems, controls } = props;
  const { t } = useI18n();
  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 768px) and (min-height: 641px)');
    desktop.addEventListener('change', onCloseMobileNav);
    return () => desktop.removeEventListener('change', onCloseMobileNav);
  }, [onCloseMobileNav]);
  const primaryNavItems = primarySidebarNavItems(navItems);
  const navSections = sidebarNavSections(primaryNavItems);
  const footerNavItems = sidebarFooterNavItems(primaryNavItems);
  const compactDesktopNav = primaryNavItems.filter((item) => !item.status).length > 18;

  return (
    <>
      <Drawer
        open={mobileNavOpen}
        side="left"
        title={t('nav.navigation')}
        onClose={onCloseMobileNav}
        testId="nav.drawer"
        closeTestId="nav.drawer.close"
      >
        <div className="space-y-4">
          {mobileNavOpen ? controls : null}

          <nav className="space-y-1" data-document-title-nav="section">
            <NavigationSections
              sections={navSections}
              surface="drawer"
              t={t}
              onNavigate={onCloseMobileNav}
            />
            {footerNavItems.length > 0 ? (
              <div className="mt-3 border-t border-border pt-3">
                {footerNavItems.map((item) => (
                  <NavigationLink
                    key={item.to}
                    item={item}
                    surface="drawer"
                    onClick={onCloseMobileNav}
                  />
                ))}
              </div>
            ) : null}
          </nav>
          <div className="border-t border-border pt-3" data-testid="shell.brand.drawer">
            <AppLogo />
          </div>
          <BuildFooter onNavigate={onCloseMobileNav} />
        </div>
      </Drawer>

      <aside
        data-testid="shell.sidebar"
        className="sticky top-0 hidden h-screen w-64 shrink-0 border-r border-border bg-surface md:block [@media(max-height:640px)]:hidden"
      >
        <div className="flex h-full min-h-0 flex-col">
          <div className="shrink-0 border-b border-border p-2">
            {!mobileNavOpen ? controls : null}
          </div>

          <nav
            className="min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain px-2 pb-2"
            data-document-title-nav="section"
          >
            <NavigationSections
              sections={navSections}
              surface="sidebar"
              compact={compactDesktopNav}
              t={t}
            />
          </nav>

          <div className="shrink-0">
            <SidebarTips />
          </div>

          {footerNavItems.length > 0 ? (
            <div className="shrink-0 border-t border-border px-2 py-2">
              {footerNavItems.map((item) => (
                <NavigationLink
                  key={item.to}
                  item={item}
                  surface="sidebar"
                />
              ))}
            </div>
          ) : null}
          <div className="shrink-0 border-t border-border px-4 py-3" data-testid="shell.brand.sidebar">
            <AppLogo />
          </div>
          <div className="shrink-0 border-t border-border px-4 py-1">
            <BuildFooter />
          </div>
        </div>
      </aside>
    </>
  );
}
