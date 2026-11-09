import { describe, expect, it } from 'vitest';

import { csCommon_navigation } from '../../i18n/locales/cs/common/navigation';
import {
  buildSidebarNavItems,
  primarySidebarNavItems,
  sidebarNavSections,
  type NavItem,
} from './AppSidebar';

function fakeT(key: string) {
  return key;
}

describe('buildSidebarNavItems', () => {
  it.each(['user', 'support', 'admin'] as const)('hides nodes in personal view for %s', (role) => {
    const items = buildSidebarNavItems({ basePath: '/app', appMode: 'user', role, t: fakeT });
    expect(items.map((item) => item.id)).not.toContain('nodes');
    expect(items.map((item) => item.to)).not.toContain('/app/nodes');
  });

  it.each(['support', 'admin'] as const)('keeps nodes in administrator view for %s', (role) => {
    const items = buildSidebarNavItems({ basePath: '/admin', appMode: 'admin', role, t: fakeT });
    expect(items.find((item) => item.id === 'nodes')?.to).toBe('/admin/nodes');
  });

  it('does not expose action states as a primary navigation item', () => {
    for (const appMode of ['user', 'admin'] as const) {
      const items = buildSidebarNavItems({ basePath: appMode === 'user' ? '/app' : '/admin', appMode, role: 'admin', t: fakeT });

      expect(items.map((item) => item.id)).not.toContain('action-states');
      expect(items.map((item) => item.to)).not.toContain(`${appMode === 'user' ? '/app' : '/admin'}/action-states`);
    }
  });

  it('does not show the old Czech action states label in the sidebar', () => {
    const t = (key: keyof typeof csCommon_navigation) => csCommon_navigation[key] ?? key;

    for (const appMode of ['user', 'admin'] as const) {
      const items = buildSidebarNavItems({ basePath: appMode === 'user' ? '/app' : '/admin', appMode, role: 'admin', t });

      expect(items.map((item) => item.label)).not.toContain('Stavy akcí');
    }
  });

  it('shows security advisory management only to administrators', () => {
    const admin = buildSidebarNavItems({ basePath: '/admin', appMode: 'admin', role: 'admin', t: fakeT });
    const support = buildSidebarNavItems({ basePath: '/admin', appMode: 'admin', role: 'support', t: fakeT });

    expect(admin.map((item) => item.id)).toContain('security-advisories');
    expect(admin.find((item) => item.id === 'security-advisories')?.to).toBe('/admin/security-advisories');
    expect(support.find((item) => item.id === 'security-advisories')?.to).toBe('/admin/status/security-advisories');
  });

  it('groups admin navigation without hiding links behind another interaction', () => {
    const items = primarySidebarNavItems(
      buildSidebarNavItems({ basePath: '/admin', appMode: 'admin', role: 'admin', t: fakeT }),
    );
    const sections = sidebarNavSections(items);

    expect(sections.map((section) => section.id)).toEqual([
      'ungrouped',
      'services',
      'operations',
      'users-finance',
      'infrastructure',
      'content',
      'status',
    ]);
    expect(sections.map((section) => section.labelKey)).toEqual([
      undefined,
      'nav.group.services',
      'nav.group.operations',
      'nav.group.users_finance',
      'nav.group.infrastructure',
      'nav.group.content',
      undefined,
    ]);
    expect(sections.flatMap((section) => section.items.map((item) => item.id))).toEqual([
      'dashboard',
      'vps',
      'datasets',
      'nas',
      'exports',
      'dns',
      'networking',
      'transactions',
      'monitoring',
      'incidents',
      'oom-reports',
      'audit',
      'users',
      'user-namespaces',
      'requests',
      'finance',
      'cluster',
      'nodes',
      'migration-plans',
      'admin-info',
      'mailer',
      'content',
      'outages',
      'security-advisories',
    ]);
  });

  it('keeps the user sidebar flat with status links at the end', () => {
    const items = primarySidebarNavItems(
      buildSidebarNavItems({ basePath: '/app', appMode: 'user', role: 'user', t: fakeT }),
    );

    expect(sidebarNavSections(items)).toEqual([{ id: 'ungrouped', items }]);
    expect(items.map((item) => item.id)).toContain('backups');
    expect(items.map((item) => item.id)).not.toContain('datasets');
    expect(items.map((item) => item.id)).toContain('requests');
    expect(items.find((item) => item.id === 'requests')?.to).toBe('/app/requests');
    expect(items.slice(-2).map((item) => item.id)).toEqual(['outages', 'security-advisories']);
  });

  it('keeps the generic dataset label in the administrator navigation', () => {
    const items = buildSidebarNavItems({ basePath: '/admin', appMode: 'admin', role: 'admin', t: fakeT });

    expect(items.find((item) => item.id === 'datasets')?.label).toBe('nav.datasets');
  });

  it('opens the most frequently used incoming payments view from Finance', () => {
    const items = buildSidebarNavItems({ basePath: '/admin', appMode: 'admin', role: 'admin', t: fakeT });
    const finance = items.find((item) => item.id === 'finance');

    expect(finance?.to).toBe('/admin/payments/incoming');
    expect(finance?.activePathPrefix).toBe('/admin/payments');
  });

  it('preserves support role gating inside the grouped admin navigation', () => {
    const items = primarySidebarNavItems(
      buildSidebarNavItems({ basePath: '/admin', appMode: 'admin', role: 'support', t: fakeT }),
    );
    const visibleIds = sidebarNavSections(items).flatMap((section) => section.items.map((item) => item.id));

    expect(visibleIds.slice(-2)).toEqual(['outages', 'security-advisories']);
    expect(visibleIds).not.toContain('action-states');
    expect(visibleIds).not.toContain('finance');
  });

  it.each(['user', 'support', 'admin'] as const)('keeps status links at the end and read-only in My view for %s', (role) => {
    const items = buildSidebarNavItems({ basePath: '/app', appMode: 'user', role, t: fakeT });
    expect(items.filter((item) => item.status).map(({ id, to }) => ({ id, to }))).toEqual([
      { id: 'outages', to: '/app/outages' },
      { id: 'security-advisories', to: '/app/security-advisories' },
    ]);
    expect(sidebarNavSections(items).flatMap((section) => section.items).slice(-2).map((item) => item.id))
      .toEqual(['outages', 'security-advisories']);
  });

  it.each(['support', 'admin'] as const)('exposes existing outage administration in administrator view for %s', (role) => {
    const items = buildSidebarNavItems({ basePath: '/admin', appMode: 'admin', role, t: fakeT });
    expect(items.find((item) => item.id === 'outages')).toMatchObject({ to: '/admin/outages', status: true });
    expect(items.filter((item) => item.id === 'security-advisories')).toHaveLength(1);
  });

  it('defensively removes action states from externally supplied navigation', () => {
    const items = [
      { id: 'dashboard', to: '/app', label: 'Přehled', icon: null },
      { id: 'action-states', to: '/app/action-states', label: 'Stavy akcí', icon: null },
      { id: 'legacy-action-states', to: '/app/action_states', label: 'Stavy akcí', icon: null },
    ] satisfies NavItem[];

    expect(primarySidebarNavItems(items).map((item) => item.id)).toEqual(['dashboard']);
  });
});
