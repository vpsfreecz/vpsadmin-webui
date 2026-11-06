import React, { useCallback, useMemo, useRef, useState } from 'react';

import {
  seriesColorClass,
  thresholdColorClass,
  type ChartSeriesVariant,
  type ChartThresholdVariant,
} from '../../lib/chartPalette';

import { clsx } from './clsx';

export type TimeSeriesVariant = ChartSeriesVariant;

type RawPoint = { x: number | string; y: number };

type RenderPoint = {
  x: number; // unix seconds
  y: number;
  xPx: number;
  yPx: number;
  isolated: boolean;
};

export type TimeSeriesThreshold = {
  value: number;
  label?: string;
  variant?: ChartThresholdVariant;
};

function defaultFormatTime(unixSeconds: number): string {
  const d = new Date(unixSeconds * 1000);
  // Include timezone abbreviation for operational correctness.
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'short',
      timeStyle: 'short',
      timeZoneName: 'short',
    }).format(d);
  } catch {
    return d.toLocaleString();
  }
}

function pickNearestIndex(points: RenderPoint[], xPx: number): number {
  let bestIdx = 0;
  let bestDist = Infinity;
  for (let i = 0; i < points.length; i++) {
    const point = points[i];
    if (!point) continue;
    const d = Math.abs(point.xPx - xPx);
    if (d < bestDist) {
      bestDist = d;
      bestIdx = i;
    }
  }
  return bestIdx;
}

export function TimeSeriesChart(props: {
  points: RawPoint[];
  className?: string;
  ariaLabel: string;
  variant?: TimeSeriesVariant;
  /** Force Y domain; used for percent charts */
  yMin?: number;
  yMax?: number;
  /** Tooltip value formatter */
  formatValue?: (n: number) => string;
  /** Tooltip time formatter */
  formatTime?: (unixSeconds: number) => string;
  /** Optional threshold lines */
  thresholds?: TimeSeriesThreshold[];
  showAxes?: boolean;
  emptyLabel?: string;
  testId?: string;
}) {
  const variant: TimeSeriesVariant = props.variant ?? 'muted';
  const formatValue = props.formatValue ?? ((n: number) => n.toFixed(1));
  const formatTime = props.formatTime ?? defaultFormatTime;

  const containerRef = useRef<HTMLDivElement | null>(null);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  const computed = useMemo(() => {
    const raw: Array<{ x: number; y: number | null }> = props.points
      .map((p) => ({
        x: Number(p.x),
        y: Number.isFinite(p.y) ? Number(p.y) : null,
      }))
      .filter((p) => Number.isFinite(p.x))
      .sort((a, b) => a.x - b.x);

    const finite = raw.filter((p): p is { x: number; y: number } => typeof p.y === 'number');

    // We still want a stable axis even when there are gaps.
    const firstPoint = raw[0];
    const lastPoint = raw[raw.length - 1];
    const minX = firstPoint ? firstPoint.x : 0;
    const maxX = lastPoint ? lastPoint.x : 1;
    const spanX = maxX - minX || 1;

    const w = 100;
    const h = 48;
    const padding = 6;
    const plotX0 = padding;
    const plotX1 = w - padding;
    const plotY0 = padding;
    const plotY1 = h - padding;

    if (finite.length < (props.showAxes ? 1 : 2)) {
      return {
        pathD: null as string | null,
        points: [] as RenderPoint[],
        minX,
        maxX,
        w,
        h,
        padding,
        plotX0,
        plotX1,
        plotY0,
        plotY1,
        yMin: 0,
        yMax: 1,
        ySpan: 1,
        yScale: (_y: number) => plotY1,
      };
    }

    const yMinData = Math.min(...finite.map((p) => p.y));
    const yMaxData = Math.max(...finite.map((p) => p.y));

    const yMin = Number.isFinite(props.yMin) ? (props.yMin as number) : yMinData;
    const yMax = Number.isFinite(props.yMax) ? (props.yMax as number) : yMaxData;
    const yUpper = props.showAxes && yMin === yMax ? yMax + 1 : yMax;
    const ySpan = yUpper - yMin || 1;

    const xScale = (x: number) => plotX0 + ((x - minX) / spanX) * (plotX1 - plotX0);
    const yScale = (y: number) => plotY1 - ((y - yMin) / ySpan) * (plotY1 - plotY0);

    // Path: multiple segments (M... L... M... L...) to show gaps when y is missing.
    let started = false;
    const cmds: string[] = [];
    for (const p of raw) {
      if (typeof p.y !== 'number') {
        started = false;
        continue;
      }

      const x = xScale(p.x);
      const y = yScale(p.y);
      cmds.push(`${started ? 'L' : 'M'}${x.toFixed(2)} ${y.toFixed(2)}`);
      started = true;
    }

    const renderPoints: RenderPoint[] = raw.flatMap((p, index) => {
      if (p.y === null) return [];
      return [
        {
          x: p.x,
          y: p.y,
          xPx: xScale(p.x),
          yPx: yScale(p.y),
          isolated: raw[index - 1]?.y == null && raw[index + 1]?.y == null,
        },
      ];
    });

    return {
      pathD: cmds.join(' '),
      points: renderPoints,
      minX,
      maxX,
      w,
      h,
      padding,
      plotX0,
      plotX1,
      plotY0,
      plotY1,
      yMin,
      yMax: yUpper,
      ySpan,
      yScale,
    };
  }, [props.points, props.showAxes, props.yMin, props.yMax]);

  const onMoveAtClientX = useCallback(
    (clientX: number) => {
      const el = containerRef.current;
      if (!el) return;

      const rect = el.getBoundingClientRect();
      const x = clientX - rect.left;
      const ratio = rect.width > 0 ? x / rect.width : 0;
      const xPx = ratio * computed.w;

      if (!computed.points.length) return;

      const idx = pickNearestIndex(computed.points, xPx);
      setSelectedIdx(idx);
    },
    [computed.points, computed.w]
  );

  const onMouseMove = useCallback(
    (e: React.MouseEvent) => {
      onMoveAtClientX(e.clientX);
    },
    [onMoveAtClientX]
  );

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      const t = e.touches[0];
      if (!t) return;
      onMoveAtClientX(t.clientX);
    },
    [onMoveAtClientX]
  );

  const onMouseLeave = useCallback(() => {
    setSelectedIdx(null);
  }, []);

  const onBlur = useCallback(() => {
    setSelectedIdx(null);
  }, []);

  const onFocus = useCallback(() => {
    if (!computed.points.length) return;
    setSelectedIdx(computed.points.length - 1);
  }, [computed.points]);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!computed.points.length) return;

      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        setSelectedIdx((prev) => {
          const cur = prev ?? computed.points.length - 1;
          const next = e.key === 'ArrowLeft' ? cur - 1 : cur + 1;
          return Math.max(0, Math.min(computed.points.length - 1, next));
        });
      }

      if (e.key === 'Escape') {
        setSelectedIdx(null);
      }
    },
    [computed.points]
  );

  const selected = selectedIdx != null ? (computed.points[selectedIdx] ?? null) : null;

  const thresholds: TimeSeriesThreshold[] = props.thresholds ?? [];

  const plot = (
    <div
      ref={containerRef}
      className={clsx(
        'relative min-w-0 w-full rounded-md border border-border bg-surface',
        props.showAxes ? 'h-36 sm:h-44' : 'h-16 p-2',
        props.className
      )}
      role="group"
      aria-label={props.ariaLabel}
      tabIndex={0}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      onTouchStart={onTouchMove}
      onTouchMove={onTouchMove}
      onBlur={onBlur}
      onFocus={onFocus}
      onKeyDown={onKeyDown}
      data-testid={props.testId}
    >
      <svg
        viewBox={`0 0 ${computed.w} ${computed.h}`}
        preserveAspectRatio={props.showAxes ? 'none' : undefined}
        className="h-full w-full"
      >
        {/* Baseline (subtle) */}
        <path
          d={`M${computed.plotX0} ${computed.plotY1} L${computed.plotX1} ${computed.plotY1}`}
          fill="none"
          stroke="currentColor"
          className="text-chart-grid"
          opacity={0.35}
        />

        {/* Thresholds */}
        {computed.points.length
          ? thresholds.map((th, i) => {
              const y = computed.yScale(th.value);
              const cls = thresholdColorClass(th.variant);
              return (
                <g key={`${th.value}.${i}`} aria-hidden="true">
                  <line
                    x1={computed.plotX0}
                    x2={computed.plotX1}
                    y1={y}
                    y2={y}
                    stroke="currentColor"
                    className={cls}
                    strokeWidth={1}
                    strokeDasharray="3 3"
                    opacity={0.75}
                  />
                  {th.label ? (
                    <text
                      x={computed.plotX1}
                      y={y - 1.5}
                      textAnchor="end"
                      fontSize={8}
                      fill="currentColor"
                      className={cls}
                      opacity={0.85}
                    >
                      {th.label}
                    </text>
                  ) : null}
                </g>
              );
            })
          : null}

        {/* Series */}
        {computed.pathD ? (
          <path
            d={computed.pathD}
            fill="none"
            stroke="currentColor"
            className={seriesColorClass(variant)}
            strokeWidth={2}
            vectorEffect={props.showAxes ? 'non-scaling-stroke' : undefined}
            strokeLinecap="round"
          />
        ) : (
          <path
            d={`M${computed.plotX0} ${(computed.plotY0 + computed.plotY1) / 2} L${computed.plotX1} ${(computed.plotY0 + computed.plotY1) / 2}`}
            fill="none"
            stroke="currentColor"
            className="text-chart-axis"
            strokeWidth={2}
            strokeLinecap="round"
            opacity={0.35}
          />
        )}

        {props.showAxes
          ? computed.points
              .filter((point) => point.isolated)
              .map((point, index) => (
                <circle
                  key={index}
                  cx={point.xPx}
                  cy={point.yPx}
                  r={1.3}
                  fill="currentColor"
                  className={seriesColorClass(variant)}
                />
              ))
          : null}

        {/* Crosshair + point */}
        {selected ? (
          <g aria-hidden="true">
            <line
              x1={selected.xPx}
              x2={selected.xPx}
              y1={computed.plotY0}
              y2={computed.plotY1}
              stroke="currentColor"
              className="text-chart-crosshair"
              strokeWidth={1}
              opacity={0.75}
            />
            <circle
              cx={selected.xPx}
              cy={selected.yPx}
              r={2.5}
              fill="currentColor"
              className={seriesColorClass(variant)}
            />
          </g>
        ) : null}
      </svg>

      {selected ? (
        <div
          className="absolute left-2 top-2 rounded-md border border-border bg-overlay-surface px-2 py-1 text-xs text-fg shadow-card"
          role={props.showAxes ? 'status' : undefined}
          data-overlay="tooltip"
          data-overlay-surface="overlay"
        >
          <div className="font-medium tabular-nums">{formatValue(selected.y)}</div>
          <div className="mt-0.5 text-muted tabular-nums">{formatTime(selected.x)}</div>
        </div>
      ) : null}
    </div>
  );

  if (!props.showAxes) return plot;
  if (computed.points.length === 0) {
    return (
      <div className="rounded-md border border-border p-3 text-sm text-muted" data-testid={props.testId}>
        {props.emptyLabel}
      </div>
    );
  }

  return (
    <div className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] gap-x-2 gap-y-1">
      <div
        className="flex flex-col justify-between py-3 text-xs text-muted tabular-nums"
        data-testid={props.testId ? `${props.testId}.y-axis` : undefined}
      >
        <span>{formatValue(computed.yMax)}</span>
        <span>{formatValue(computed.yMin + computed.ySpan / 2)}</span>
        <span>{formatValue(computed.yMin)}</span>
      </div>
      {plot}
      <div
        className="col-start-2 grid grid-cols-2 gap-2 text-xs text-muted tabular-nums"
        data-testid={props.testId ? `${props.testId}.x-axis` : undefined}
      >
        <span>{formatTime(computed.minX)}</span>
        {computed.maxX !== computed.minX ? <span className="text-right">{formatTime(computed.maxX)}</span> : null}
      </div>
    </div>
  );
}
