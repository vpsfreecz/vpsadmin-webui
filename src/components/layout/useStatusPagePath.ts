import { useLocation } from 'react-router-dom';

// Shared read-only status content follows the shell it is rendered inside.
export function useStatusPagePath(): (path: string) => string {
  const { pathname } = useLocation();
  const prefix = /^\/app(?:\/|$)/.test(pathname) ? '/app' : /^\/admin(?:\/|$)/.test(pathname) ? '/admin/status' : '';
  return (path) => `${prefix}${path}`;
}
