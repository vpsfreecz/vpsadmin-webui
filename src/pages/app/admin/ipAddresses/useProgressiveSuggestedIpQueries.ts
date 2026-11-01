import { useEffect, useMemo, useState } from 'react';
import { useQueries, useQueryClient } from '@tanstack/react-query';

import { fetchIpAddresses, fetchIpAddressIndexCapability, type IpAddress } from '../../../../lib/api/ipAddresses';
import type { Location as InfraLocation } from '../../../../lib/api/infra';

import {
  buildSuggestedIpQueryPlan,
  PRIORITY_LOCATION_COUNT,
  sampleSuggestedIps,
  sampleSuggestedIpsByLocationAndType,
  SUGGESTED_IP_QUERY_LIMIT,
  SUGGESTED_IPS_PER_TYPE,
} from './suggestedFreeIps';

const SUGGESTED_IP_REQUEST_TIMEOUT_MS = 12_000;
const MAX_SUGGESTED_IP_PAGES = 20;

function waitForRequest<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  return new Promise((resolve, reject) => {
    const cleanup = () => signal.removeEventListener('abort', abort);
    const abort = () => {
      cleanup();
      reject(signal.reason);
    };
    signal.addEventListener('abort', abort, { once: true });
    // Observe late resolution/rejection without continuing a cancelled caller.
    void promise.then(
      (value) => { cleanup(); resolve(value); },
      (error: unknown) => { cleanup(); reject(error); }
    );
    if (signal.aborted) abort();
  });
}

function createRequestTimeoutSignal(parentSignal: AbortSignal) {
  const controller = new AbortController();
  const abort = () => controller.abort();

  if (parentSignal.aborted) abort();
  else parentSignal.addEventListener('abort', abort, { once: true });

  const timeoutId = window.setTimeout(abort, SUGGESTED_IP_REQUEST_TIMEOUT_MS);

  return {
    signal: controller.signal,
    cleanup: () => {
      window.clearTimeout(timeoutId);
      parentSignal.removeEventListener('abort', abort);
    },
  };
}

export function useProgressiveSuggestedIpQueries(
  locations: InfraLocation[],
  enabled: boolean
) {
  const queryClient = useQueryClient();
  const queryPlan = useMemo(() => buildSuggestedIpQueryPlan(locations), [locations]);
  const progressKey = `${enabled ? 'visible' : 'hidden'}:${locations
    .map((item) => item.id)
    .join(',')}`;
  const [progress, setProgress] = useState(() => ({
    key: progressKey,
    count: PRIORITY_LOCATION_COUNT,
  }));
  const activeLocationCount = progress.key === progressKey
    ? progress.count
    : PRIORITY_LOCATION_COUNT;

  useEffect(() => {
    if (progress.key === progressKey) return;
    setProgress({ key: progressKey, count: PRIORITY_LOCATION_COUNT });
  }, [progress.key, progressKey]);

  const queries = useQueries({
    queries: queryPlan.map((query, index) => ({
      queryKey: ['ip_addresses', 'suggested_free', query.locationId, query.version, query.role ?? 'any', query.prefix ?? 'any'],
      queryFn: async ({ signal }: { signal: AbortSignal }) => {
        const timedSignal = createRequestTimeoutSignal(signal);
        try {
          timedSignal.signal.throwIfAborted();
          const capability = await waitForRequest(queryClient.fetchQuery({
            queryKey: ['ip-address-index-capability'],
            queryFn: async () => (await fetchIpAddressIndexCapability()).data,
            staleTime: 5 * 60_000,
            retry: 0,
          }), timedSignal.signal);
          const supportsEnabled = Object.prototype.hasOwnProperty.call(
            capability?.input?.parameters ?? {}, 'network_enabled'
          );
          timedSignal.signal.throwIfAborted();
          const items: IpAddress[] = [];
          let fromId: number | undefined;
          for (let page = 0; page < MAX_SUGGESTED_IP_PAGES; page += 1) {
            timedSignal.signal.throwIfAborted();
            const response = await waitForRequest(fetchIpAddresses({
              limit: SUGGESTED_IP_QUERY_LIMIT,
              fromId,
              location: query.locationId,
              version: query.version,
              prefix: query.prefix,
              role: query.role,
              user: null,
              assignedToInterface: false,
              ...(supportsEnabled ? { networkEnabled: true } : {}),
              order: 'asc',
              purpose: 'vps',
              includes: 'network__primary_location__environment',
              signal: timedSignal.signal,
            }), timedSignal.signal);
            timedSignal.signal.throwIfAborted();
            let lastId = fromId ?? 0;
            if (response.data.length > SUGGESTED_IP_QUERY_LIMIT) {
              throw new Error('Invalid IP suggestion page size');
            }
            for (const ip of response.data) {
              if (!Number.isSafeInteger(ip.id) || ip.id <= lastId) {
                throw new Error('Invalid IP suggestion cursor');
              }
              lastId = ip.id;
            }
            items.push(...sampleSuggestedIps(
              response.data.filter((ip) => ip.network?.enabled !== false),
              query.locationId,
            ));
            if (items.length >= SUGGESTED_IPS_PER_TYPE || response.data.length < SUGGESTED_IP_QUERY_LIMIT) return items;
            fromId = lastId;
          }
          throw new Error('IP suggestion scan limit reached');
        } finally {
          timedSignal.cleanup();
        }
      },
      staleTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: 0,
      enabled: enabled && index < activeLocationCount * 3,
    })),
  });
  const activeQueryCount = Math.min(queryPlan.length, activeLocationCount * 3);
  const activeQueries = queries.slice(0, activeQueryCount);
  const activeQueriesSettled = activeQueries.every(
    (query) => !query.isPending && !query.isFetching
  );

  useEffect(() => {
    if (!enabled || !activeQueriesSettled || activeLocationCount >= locations.length) return;
    setProgress((current) => ({
      key: progressKey,
      count: current.key === progressKey ? current.count + 1 : PRIORITY_LOCATION_COUNT,
    }));
  }, [activeLocationCount, activeQueriesSettled, enabled, locations.length, progressKey]);

  const data = useMemo(() => {
    const byLocation = new Map<number, IpAddress[]>();
    queries.forEach((query, index) => {
      const locationId = queryPlan[index]?.locationId;
      if (locationId === undefined || !query.data) return;
      byLocation.set(locationId, [...(byLocation.get(locationId) ?? []), ...query.data]);
    });

    return sampleSuggestedIpsByLocationAndType(
      locations.map((location) => ({
        locationId: location.id,
        items: byLocation.get(location.id) ?? [],
      }))
    );
  }, [locations, queries, queryPlan]);
  const pending = activeQueries.some((query) => query.isPending || query.isFetching);
  const error = activeQueries.find((query) => query.isError)?.error;
  const partialError = data.length > 0 && activeQueries.some((query) => query.isError);

  return {
    data,
    error: data.length === 0 ? error : undefined,
    isLoading: data.length === 0 && (
      pending || (enabled && activeLocationCount < locations.length)
    ),
    isLoadingMore: enabled && (activeLocationCount < locations.length || pending),
    partialError,
    retryErrors: () => {
      activeQueries.forEach((query) => {
        if (query.isError) void query.refetch();
      });
    },
  };
}
