import { act, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchOomReports, type OomReport } from '../../../lib/api/oom';
import { useRecentVpsOomReports } from './useRecentVpsOomReports';

vi.mock('../../../lib/api/oom', () => ({ fetchOomReports: vi.fn() }));
vi.mock('../../../lib/refreshTiers', () => ({ useTierSlowIntervalMs: () => 60_000 }));
const fetch = vi.mocked(fetchOomReports);
const response = (data: OomReport[]) => ({ data }) as Awaited<ReturnType<typeof fetchOomReports>>;
function Probe(props: { userId?: number; vpsId?: number }) {
  const reports = useRecentVpsOomReports(props);
  return <output>{reports.size}</output>;
}
afterEach(() => {
  vi.useRealTimers();
  vi.resetAllMocks();
});

describe('recent OOM loading and expiration', () => {
  it('bounds one list request in owner scope and a detail request to its VPS', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    fetch.mockResolvedValue(response([]));
    const { rerender, unmount } = render(
      <QueryClientProvider client={client}>
        <Probe userId={10} />
      </QueryClientProvider>
    );
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    expect(fetch).toHaveBeenLastCalledWith(
      expect.objectContaining({ userId: 10, vpsId: undefined, limit: 100, sinceIso: expect.any(String) })
    );
    rerender(
      <QueryClientProvider client={client}>
        <Probe vpsId={123} />
      </QueryClientProvider>
    );
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
    expect(fetch).toHaveBeenLastCalledWith(expect.objectContaining({ userId: undefined, vpsId: 123, limit: 1 }));
    unmount();
    client.clear();
  });
  it('expires the cached badge on its clock while the API fails', async () => {
    vi.useFakeTimers();
    const now = Date.parse('2026-11-07T12:00:00Z');
    vi.setSystemTime(now);
    const report: OomReport = {
      id: 7,
      vps: { id: 123, hostname: 'synthetic.example' },
      created_at: new Date(now - 24 * 60 * 60_000 + 30_000).toISOString(),
    };
    fetch.mockResolvedValueOnce(response([report])).mockRejectedValue(new Error('unavailable'));
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { unmount } = render(
      <QueryClientProvider client={client}>
        <Probe vpsId={123} />
      </QueryClientProvider>
    );
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10);
    });
    expect(screen.getByRole('status')).toHaveTextContent('1');
    await act(async () => {
      await vi.advanceTimersByTimeAsync(61_000);
    });
    expect(screen.getByRole('status')).toHaveTextContent('0');
    expect(client.getQueryData(['oom_reports', 'recent-vps-warning', { user: undefined, vps: 123 }])).toEqual([report]);
    unmount();
    client.clear();
  });
});
