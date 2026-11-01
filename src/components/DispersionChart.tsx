import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  DAYS_PER_YEAR,
  METRIC_BY_ID,
  PLANETS,
  clampWindow,
  formatEpoch,
  formatYearTick,
  metricValue,
  planetTerm,
  sampleAtYear,
  type DispersionMinimum,
  type MetricId,
  type MetricSummary,
  type PlanetKey,
  type Sample,
  type Series,
} from "../lib/astro";
import { cn } from "../utils/cn";

export type ChartView = "system" | "planets";

interface ChartProps {
  series: Series;
  overview: Series;
  selected: PlanetKey[];
  centerYear: number;
  halfSpanYears: number;
  cursorYear: number;
  metric: MetricId;
  view: ChartView;
  minimum: DispersionMinimum | null;
  summary: MetricSummary;
  onCursorYear: (year: number) => void;
  onZoom: (centerYear: number, halfSpanYears: number) => void;
}

const MARGIN = { top: 28, right: 20, bottom: 38, left: 66 };

/** Units of the per-planet terms shown in the "По планетам" view. */
const PLANET_UNITS: Record<MetricId, string> = {
  variance: "δ², град²",
  rms: "|δ|, град",
  half: "√|δ|, √град",
  barycenter: "",
};

const METRIC_ORDER: MetricId[] = ["variance", "rms", "half", "barycenter"];

const formatterCache = new Map<number, Intl.NumberFormat>();
function formatFixed(value: number, digits: number) {
  if (!Number.isFinite(value)) return "—";
  let formatter = formatterCache.get(digits);
  if (!formatter) {
    formatter = new Intl.NumberFormat("ru-RU", {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    });
    formatterCache.set(digits, formatter);
  }
  return formatter.format(value);
}

/** Number of decimals needed to show a tick step exactly (0…4). */
function tickDigits(step: number) {
  let digits = 0;
  while (digits < 4 && Math.abs(step * 10 ** digits - Math.round(step * 10 ** digits)) > 1e-9) {
    digits += 1;
  }
  return digits;
}

function smoothSeries(values: number[], windowSize: number) {
  const half = Math.floor(windowSize / 2);
  const prefix = [0];
  for (const value of values) prefix.push(prefix[prefix.length - 1] + value);
  return values.map((_, index) => {
    const from = Math.max(0, index - half);
    const to = Math.min(values.length - 1, index + half);
    return (prefix[to + 1] - prefix[from]) / (to - from + 1);
  });
}

function niceTicks(maxValue: number, desired = 4) {
  if (!Number.isFinite(maxValue) || maxValue <= 0) return [0, 1];
  const rough = maxValue / desired;
  const power = 10 ** Math.floor(Math.log10(rough));
  const fraction = rough / power;
  const factor =
    fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 2.5 ? 2.5 : fraction <= 5 ? 5 : 10;
  const step = factor * power;
  const top = Math.ceil(maxValue / step) * step;
  const ticks: number[] = [];
  for (let value = 0; value <= top + step * 0.001; value += step) {
    ticks.push(Number(value.toFixed(6)));
  }
  return ticks;
}

function useElementWidth<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [width, setWidth] = useState(880);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry?.contentRect.width) {
        setWidth(Math.max(300, Math.round(entry.contentRect.width)));
      }
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return { ref, width };
}

export function DispersionChart({
  series,
  overview,
  selected,
  centerYear,
  halfSpanYears,
  cursorYear,
  metric,
  view,
  minimum,
  summary,
  onCursorYear,
  onZoom,
}: ChartProps) {
  const { ref: containerRef, width } = useElementWidth<HTMLDivElement>();
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [drag, setDrag] = useState<{ anchor: number; current: number } | null>(null);
  const [inspecting, setInspecting] = useState(false);

  const def = METRIC_BY_ID[metric];
  // Non-angular metrics (distance to the Sun) have no per-planet decomposition.
  const activeView: ChartView = def.angular ? view : "system";

  const height = width < 560 ? 310 : 382;
  const margin = {
    ...MARGIN,
    left: width < 560 ? 46 : MARGIN.left,
    right: width < 560 ? 10 : MARGIN.right,
    bottom: width < 560 ? 32 : MARGIN.bottom,
  };
  const plotWidth = Math.max(20, width - margin.left - margin.right);
  const plotHeight = Math.max(20, height - margin.top - margin.bottom);
  const spanYears = halfSpanYears * 2;
  const startYear = centerYear - halfSpanYears;
  const endYear = centerYear + halfSpanYears;
  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const selectedIndices = useMemo(
    () =>
      PLANETS.map((planet, index) => ({ planet, index }))
        .filter(({ planet }) => selectedSet.has(planet.key))
        .map(({ index }) => index),
    [selectedSet],
  );

  const valueOf = (sample: Sample, planetIndex?: number) =>
    planetIndex === undefined
      ? metricValue(sample, metric)
      : planetTerm(sample, planetIndex, metric);

  const maxValue = useMemo(() => {
    if (activeView === "system") return summary.max > 0 ? summary.max : 1;
    let max = 0;
    for (const index of selectedIndices) {
      for (const sample of series.samples) {
        max = Math.max(max, planetTerm(sample, index, metric));
      }
    }
    return max > 0 ? max : 1;
  }, [activeView, summary.max, series, selectedIndices, metric]);

  const yTicks = useMemo(() => niceTicks(maxValue), [maxValue]);
  const yMax = yTicks[yTicks.length - 1] || 1;
  const tickStep = yTicks.length > 1 ? yTicks[1] : 1;
  const yDigits = tickDigits(tickStep);

  const xOf = (year: number) => margin.left + ((year - startYear) / spanYears) * plotWidth;
  const yOf = (value: number) =>
    margin.top + plotHeight - (Math.min(value, yMax) / yMax) * plotHeight;

  const paths = useMemo(() => {
    const yBottom = margin.top + plotHeight;
    if (activeView === "system") {
      const values = series.samples.map((sample) => valueOf(sample));
      // ~100-year window on the long span, ~20 samples on shorter ones:
      // reveals the slow secular modulation instead of aliasing one-day motion.
      const windowSize = Math.max(5, Math.round(series.samples.length / 200));
      const smoothedValues = smoothSeries(values, windowSize);
      const line = series.samples
        .map(
          (sample, index) =>
            `${index === 0 ? "M" : "L"}${xOf(sample.year).toFixed(2)},${yOf(smoothedValues[index]).toFixed(2)}`,
        )
        .join(" ");
      // Do not draw an aliased raw trace when the chart step is coarser than
      // ~2 months: at that resolution the hour-to-hour structure is not real.
      const rawLine =
        series.stepYears * DAYS_PER_YEAR > 60
          ? ""
          : series.samples
              .map(
                (sample, index) =>
                  `${index === 0 ? "M" : "L"}${xOf(sample.year).toFixed(2)},${yOf(values[index]).toFixed(2)}`,
              )
              .join(" ");
      const area = `${line} L${xOf(endYear).toFixed(2)},${yBottom.toFixed(2)} L${xOf(startYear).toFixed(2)},${yBottom.toFixed(2)} Z`;
      return [{ key: "system", color: "#226A57", line, rawLine, area }];
    }
    const planetWindow = Math.max(3, Math.round(series.samples.length / 120));
    return selectedIndices.map((planetIndex) => {
      const planet = PLANETS[planetIndex];
      const values = series.samples.map((sample) => valueOf(sample, planetIndex));
      const smoothed = smoothSeries(values, planetWindow);
      const line = series.samples
        .map(
          (sample, index) =>
            `${index === 0 ? "M" : "L"}${xOf(sample.year).toFixed(2)},${yOf(smoothed[index]).toFixed(2)}`,
        )
        .join(" ");
      const rawLine =
        series.stepYears * DAYS_PER_YEAR > 60
          ? ""
          : series.samples
              .map(
                (sample, index) =>
                  `${index === 0 ? "M" : "L"}${xOf(sample.year).toFixed(2)},${yOf(values[index]).toFixed(2)}`,
              )
              .join(" ");
      return { key: planet.key, color: planet.color, line, rawLine, area: "" };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [series, selectedIndices, activeView, metric, width, height, yMax, startYear, endYear]);

  const cursor = useMemo(() => sampleAtYear(cursorYear, selected), [cursorYear, selected]);
  const xTickCount = width < 430 ? 3 : width < 560 ? 4 : 6;
  const compactTicks = width < 560 && spanYears < 4;
  const xTicks = useMemo(
    () =>
      Array.from({ length: xTickCount }, (_, index) => {
        const year = startYear + (spanYears * index) / (xTickCount - 1);
        return {
          year,
          x: xOf(year),
          label: formatYearTick(year, spanYears, compactTicks),
        };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [startYear, spanYears, xTickCount, width, compactTicks],
  );

  const cursorX = xOf(cursorYear);
  const showCursor =
    inspecting && cursorX >= margin.left - 1 && cursorX <= margin.left + plotWidth + 1;
  const cursorPercent = (cursorX / width) * 100;
  const tooltipOnLeft = cursorPercent > 68;

  const selection = drag
    ? {
        x: Math.min(drag.anchor, drag.current),
        width: Math.abs(drag.current - drag.anchor),
      }
    : null;

  const viewBoxX = (clientX: number) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return 0;
    return ((clientX - rect.left) / rect.width) * width;
  };

  const yearAtX = (x: number) =>
    startYear +
    ((Math.min(margin.left + plotWidth, Math.max(margin.left, x)) - margin.left) / plotWidth) *
      spanYears;

  const handlePointerDown = (event: ReactPointerEvent<SVGSVGElement>) => {
    const x = viewBoxX(event.clientX);
    if (x < margin.left || x > margin.left + plotWidth) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    setInspecting(true);
    setDrag({ anchor: x, current: x });
    onCursorYear(yearAtX(x));
  };

  const handlePointerMove = (event: ReactPointerEvent<SVGSVGElement>) => {
    const x = viewBoxX(event.clientX);
    if (x < margin.left || x > margin.left + plotWidth) return;
    setInspecting(true);
    onCursorYear(yearAtX(x));
    if (drag) setDrag((previous) => (previous ? { ...previous, current: x } : previous));
  };

  const handlePointerUp = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (drag && Math.abs(drag.current - drag.anchor) > 12) {
      const first = yearAtX(Math.min(drag.anchor, drag.current));
      const second = yearAtX(Math.max(drag.anchor, drag.current));
      const half = Math.max(0.35 / DAYS_PER_YEAR, Math.abs(second - first) / 2);
      const next = clampWindow((first + second) / 2, Math.min(10_000, half));
      onZoom(next.centerYear, next.halfSpanYears);
    }
    setDrag(null);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const handleMinimap = (event: ReactPointerEvent<SVGSVGElement> | React.MouseEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    const overviewStart = overview.samples[0]?.year ?? -10_000;
    const overviewEnd = overview.samples[overview.samples.length - 1]?.year ?? 10_000;
    const year = overviewStart + ratio * (overviewEnd - overviewStart);
    const next = clampWindow(year, halfSpanYears);
    onZoom(next.centerYear, next.halfSpanYears);
    onCursorYear(next.centerYear);
  };

  // The minimap always shows the system-level value of the selected metric.
  const overviewPath = useMemo(() => {
    const overviewStart = overview.samples[0]?.year ?? -10_000;
    const overviewEnd = overview.samples[overview.samples.length - 1]?.year ?? 10_000;
    const overviewSpan = Math.max(1, overviewEnd - overviewStart);
    const values = overview.samples.map((sample) => metricValue(sample, metric));
    const max = Math.max(1e-9, ...values);
    return overview.samples
      .map((sample, index) => {
        const x = 8 + ((sample.year - overviewStart) / overviewSpan) * (width - 40);
        const y = 42 - (values[index] / max) * 32;
        return `${index === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
  }, [overview, metric, width]);

  const tickValue = (value: number) => formatFixed(value, yDigits);
  const showMean = activeView === "system";
  const showMarkers = activeView === "system";
  const markerY = (value: number) => yOf(value);
  const axisTitle =
    activeView === "system"
      ? `${def.symbol}, ${def.unit}`
      : `${PLANET_UNITS[metric]}`;

  return (
    <div ref={containerRef} className="relative w-full">
      <svg
        ref={svgRef}
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className={cn(
          "block w-full touch-none select-none",
          drag ? "cursor-ew-resize" : "cursor-crosshair",
        )}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => setDrag(null)}
        onPointerLeave={() => setInspecting(false)}
        role="img"
        aria-label="График угловой дисперсии планет"
      >
        <defs>
          <linearGradient id="dispersion-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2F7E6C" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#2F7E6C" stopOpacity="0.015" />
          </linearGradient>
        </defs>

        <text
          x={margin.left}
          y={14}
          className="fill-[#68726A] text-[10px] font-medium tracking-[0.1em]"
        >
          {axisTitle}
        </text>

        {yTicks.map((tick) => {
          const y = yOf(tick);
          return (
            <g key={tick}>
              <line
                x1={margin.left}
                x2={margin.left + plotWidth}
                y1={y}
                y2={y}
                stroke="#173C33"
                strokeOpacity={tick === 0 ? 0.26 : 0.1}
                strokeDasharray={tick === 0 ? undefined : "2 5"}
              />
              <text
                x={margin.left - 10}
                y={y + 3.5}
                textAnchor="end"
                className="fill-[#7D847A] text-[10px] tabular-nums"
              >
                {tickValue(tick)}
              </text>
            </g>
          );
        })}

        {xTicks.map((tick) => (
          <g key={tick.label + tick.year}>
            <line
              x1={tick.x}
              x2={tick.x}
              y1={margin.top}
              y2={margin.top + plotHeight}
              stroke="#173C33"
              strokeOpacity="0.055"
            />
            <text
              x={tick.x}
              y={height - 13}
              textAnchor={
                tick.x < margin.left + 24
                  ? "start"
                  : tick.x > margin.left + plotWidth - 24
                    ? "end"
                    : "middle"
              }
              className="fill-[#7D847A] text-[10px] tabular-nums"
            >
              {tick.label}
            </text>
          </g>
        ))}

        {showMean && Number.isFinite(summary.mean) && (
          <g>
            <line
              x1={margin.left}
              x2={margin.left + plotWidth}
              y1={markerY(summary.mean)}
              y2={markerY(summary.mean)}
              stroke="#B86745"
              strokeOpacity="0.68"
              strokeDasharray="3 5"
            />
            <text
              x={margin.left + plotWidth - 8}
              y={markerY(summary.mean) - 5}
              textAnchor="end"
              className="fill-[#A75A3B] text-[9px] font-medium tracking-[0.06em] uppercase"
            >
              среднее за окно
            </text>
          </g>
        )}

        {paths[0]?.area && activeView === "system" && (
          <path d={paths[0].area} fill="url(#dispersion-area)" />
        )}

        {paths.map((path) => (
          <g key={path.key}>
            {path.rawLine && (
              <path
                d={path.rawLine}
                fill="none"
                stroke={path.color}
                strokeWidth="0.85"
                strokeOpacity="0.13"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
            )}
            <path
              d={path.line}
              fill="none"
              stroke={path.color}
              strokeWidth={activeView === "system" ? 1.85 : 1.2}
              strokeOpacity={activeView === "system" ? 1 : 0.78}
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          </g>
        ))}

        {showMarkers && series.samples.length > 0 && summary.maxYear >= startYear && summary.maxYear <= endYear && (
          <g>
            <line
              x1={xOf(summary.maxYear)}
              x2={xOf(summary.maxYear)}
              y1={markerY(summary.max) - 5}
              y2={margin.top + plotHeight}
              stroke="#B86745"
              strokeOpacity="0.18"
              strokeDasharray="2 4"
            />
            <circle
              cx={xOf(summary.maxYear)}
              cy={markerY(summary.max)}
              r="3.4"
              fill="#F8F6ED"
              stroke="#B86745"
              strokeWidth="1.5"
            />
          </g>
        )}

        {showMarkers && minimum && minimum.year >= startYear && minimum.year <= endYear && (
          <g>
            <line
              x1={xOf(minimum.year)}
              x2={xOf(minimum.year)}
              y1={margin.top}
              y2={margin.top + plotHeight}
              stroke="#2F7E6C"
              strokeOpacity="0.3"
              strokeDasharray="2 4"
            />
            <circle
              cx={xOf(minimum.year)}
              cy={markerY(minimum.value)}
              r="4.4"
              fill="#2F7E6C"
              stroke="#FCFAF2"
              strokeWidth="1.8"
            />
            <text
              x={Math.min(
                margin.left + plotWidth - 52,
                Math.max(margin.left + 4, xOf(minimum.year) - 22),
              )}
              y={margin.top + 11}
              className="fill-[#2F7E6C] text-[8.5px] font-semibold tracking-[0.07em]"
            >
              МИНИМУМ
            </text>
            <text
              x={Math.min(margin.left + plotWidth - 6, Math.max(margin.left + 6, xOf(minimum.year)))}
              y={Math.max(margin.top + 26, markerY(minimum.value) - 11)}
              textAnchor="middle"
              className="fill-[#2F7E6C] text-[8px] font-medium tabular-nums"
              style={{ paintOrder: "stroke", stroke: "#FCFAF2", strokeWidth: 3 }}
            >
              {formatFixed(minimum.value, def.decimals)} {def.unit}
            </text>
          </g>
        )}

        {showCursor && cursor && (
          <g>
            <line
              x1={cursorX}
              x2={cursorX}
              y1={margin.top}
              y2={margin.top + plotHeight}
              stroke="#183E35"
              strokeOpacity="0.45"
              strokeDasharray="2 4"
            />
            {activeView === "system" && (
              <circle
                cx={cursorX}
                cy={yOf(valueOf(cursor))}
                r="5"
                fill="#FCFAF2"
                stroke="#183E35"
                strokeWidth="2"
              />
            )}
            {activeView === "planets" &&
              selectedIndices.map((index) => (
                <circle
                  key={index}
                  cx={cursorX}
                  cy={yOf(valueOf(cursor, index))}
                  r="3"
                  fill="#FCFAF2"
                  stroke={PLANETS[index].color}
                  strokeWidth="1.6"
                />
              ))}
          </g>
        )}

        {selection && selection.width > 1 && (
          <g pointerEvents="none">
            <rect
              x={selection.x}
              y={margin.top}
              width={selection.width}
              height={plotHeight}
              fill="#B86745"
              fillOpacity="0.1"
              stroke="#B86745"
              strokeOpacity="0.55"
              strokeDasharray="3 3"
            />
            <text
              x={selection.x + selection.width / 2}
              y={margin.top + 18}
              textAnchor="middle"
              className="fill-[#8D4B32] text-[10px] font-medium"
            >
              отпустите для увеличения
            </text>
          </g>
        )}

        <rect
          x={margin.left}
          y={margin.top}
          width={plotWidth}
          height={plotHeight}
          fill="transparent"
          stroke="none"
        />
      </svg>

      {showCursor && cursor && (
        <div
          className="pointer-events-none absolute top-7 z-10 w-[232px] rounded-xl border border-[#D9D6C8] bg-[#FCFAF2]/95 p-3 shadow-[0_12px_28px_rgba(20,50,43,0.12)] backdrop-blur-sm"
          style={{
            left: tooltipOnLeft
              ? Math.max(4, cursorX - 240)
              : Math.min(Math.max(4, width - 240), cursorX + 12),
          }}
        >
          <div className="flex items-center justify-between gap-3">
            <span className="text-[9px] font-semibold tracking-[0.14em] text-[#8A8E82] uppercase">
              Момент
            </span>
            <span className="text-[10px] text-[#677268] tabular-nums">
              {formatEpoch(cursor.year, spanYears)}
            </span>
          </div>
          <div className="mt-2 flex items-end justify-between gap-3 border-t border-[#E3E0D3] pt-2">
            <div>
              <p className="text-[8px] tracking-[0.1em] text-[#8A8E82] uppercase">{def.title}</p>
              <span className="font-display text-[24px] leading-none text-[#183E35] tabular-nums">
                {formatFixed(metricValue(cursor, metric), def.decimals)}
              </span>
              <span className="ml-1 text-[10px] text-[#7A8076]">{def.unit}</span>
            </div>
            <span className="rounded-md bg-[#E9EEE6] px-1.5 py-0.5 text-[9px] font-medium text-[#416157]">
              R {cursor.concentration.toFixed(2)}
            </span>
          </div>

          {activeView === "system" ? (
            <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 border-t border-[#E3E0D3] pt-2">
              {METRIC_ORDER.map((id) => {
                const other = METRIC_BY_ID[id];
                const active = id === metric;
                return (
                  <div
                    key={id}
                    className={cn(
                      "flex items-baseline justify-between gap-1 text-[9px]",
                      active ? "font-semibold text-[#183E35]" : "text-[#5D6B62]",
                    )}
                  >
                    <span className="truncate">{other.symbol}</span>
                    <span className="shrink-0 tabular-nums">
                      {formatFixed(metricValue(cursor, id), other.decimals)}
                      <span className="ml-0.5 text-[#8A9186]">{other.unit}</span>
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="mt-2 grid grid-cols-2 gap-x-2 gap-y-1 border-t border-[#E3E0D3] pt-2">
              {selectedIndices.map((index) => (
                <div key={index} className="flex items-center justify-between gap-1.5 text-[9px]">
                  <span className="flex min-w-0 items-center gap-1 text-[#4B5C53]">
                    <span
                      className="h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{ backgroundColor: PLANETS[index].color }}
                    />
                    <span className="truncate">{PLANETS[index].name}</span>
                  </span>
                  <span className="shrink-0 text-[#183E35] tabular-nums">
                    {formatFixed(Math.abs(cursor.deviations[index]), 0)}°
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="mt-2 rounded-xl border border-[#E4E1D4] bg-[#F7F4EA]/80 px-3 pt-1.5 pb-1">
        <div className="flex items-center justify-between">
          <span className="text-[9px] font-medium tracking-[0.12em] text-[#8B8F83] uppercase">
            Обзор ±10 000 лет
          </span>
          <span className="text-[9px] text-[#9A9D91]">нажмите, чтобы переместить окно</span>
        </div>
        <svg
          width={width - 24}
          height="50"
          viewBox={`0 0 ${width - 24} 50`}
          className="mt-0.5 w-full cursor-pointer"
          onClick={handleMinimap}
          role="img"
          aria-label="Миникарта всего диапазона"
        >
          <path d={`${overviewPath} L${width - 32},38 L8,38 Z`} fill="#B86745" fillOpacity="0.08" />
          <path
            d={overviewPath}
            fill="none"
            stroke="#B86745"
            strokeOpacity="0.8"
            strokeWidth="1.02"
            vectorEffect="non-scaling-stroke"
          />
          <rect
            x={8 + ((centerYear - halfSpanYears + 10_000) / 20_000) * (width - 40)}
            y="3"
            width={Math.max(4, (spanYears / 20_000) * (width - 40))}
            height="35"
            rx="3"
            fill="#183E35"
            fillOpacity="0.075"
            stroke="#183E35"
            strokeOpacity="0.5"
          />
          <line
            x1={8 + ((centerYear + halfSpanYears + 10_000) / 20_000) * (width - 40) - 1}
            x2={8 + ((centerYear + halfSpanYears + 10_000) / 20_000) * (width - 40) - 1}
            y1="3"
            y2="38"
            stroke="#183E35"
            strokeOpacity="0.5"
          />
          {minimum && (
            <circle
              cx={8 + ((minimum.year + 10_000) / 20_000) * (width - 40)}
              cy="6"
              r="2.6"
              fill="#2F7E6C"
              stroke="#FCFAF2"
              strokeWidth="1"
            />
          )}
          <text x="8" y="48" className="fill-[#979A8E] text-[8px]">
            −10 000
          </text>
          <text x={width - 32} y="48" textAnchor="end" className="fill-[#979A8E] text-[8px]">
            +10 000
          </text>
        </svg>
      </div>
    </div>
  );
}
