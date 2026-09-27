export type RuntimeMode = 'bff' | 'legacy';

export function resolveRuntimeMode(value: string | undefined, isDev: boolean): RuntimeMode {
  if (value === 'bff' || value === 'legacy') return value;
  if (value === undefined && isDev) return 'legacy';
  throw new Error('runtime_mode');
}

export function selectedRuntimeMode(): RuntimeMode {
  return resolveRuntimeMode(import.meta.env['VITE_RUNTIME_MODE'], import.meta.env.DEV);
}
