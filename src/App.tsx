import { useEffect, useMemo, useRef, useState } from "react";
import {
  DAYS_PER_YEAR,
  MAX_SAMPLES,
  METRICS,
  METRIC_BY_ID,
  PLANETS,
  PRESETS,
  autoStepYears,
  clampWindow,
  findMinimumDispersionAsync,
  formatEpoch,
  formatEpochFull,
  formatMoment,
  formatNumber,
  formatSigned,
  formatStep,
  formatYear,
  generateSeries,
  makeCsv,
  metricValue,
  modelBandForWindow,
  MODEL_BAND_COPY,
  normalizeDegrees,
  sampleAtYear,
  summarizeSeries,
  type DispersionMinimum,
  type MetricId,
  type PlanetKey,
  type Sample,
  type Series,
} from "./lib/astro";
import { DispersionChart, type ChartView } from "./components/DispersionChart";
import { cn } from "./utils/cn";

const CURRENT_YEAR = (() => {
  const now = new Date();
  const start = new Date(0);
  start.setUTCFullYear(now.getUTCFullYear(), 0, 1);
  start.setUTCHours(0, 0, 0, 0);
  const days = (now.getTime() - start.getTime()) / 86_400_000;
  const yearLength = (now.getUTCFullYear() % 4 === 0 && now.getUTCFullYear() % 100 !== 0) ||
    now.getUTCFullYear() % 400 === 0
    ? 366
    : 365;
  return now.getUTCFullYear() + days / yearLength;
})();

/** Locale number with a fixed number of decimals (used for metric values). */
const fmt = (value: number, digits: number) =>
  Number.isFinite(value)
    ? value.toLocaleString("ru-RU", { minimumFractionDigits: digits, maximumFractionDigits: digits })
    : "—";

function ArrowDown({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <path d="M8 2.5v10M3.8 8.3 8 12.5l4.2-4.2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function DownloadIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 18 18" fill="none" className={className} aria-hidden="true">
      <path d="M9 2.5v8.2M5.8 7.6 9 10.8l3.2-3.2M3 13.2v1.3c0 .5.4.9.9.9h10.2c.5 0 .9-.4.9-.9v-1.3" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function OrbitLogo({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" fill="none" className={className} aria-hidden="true">
      <ellipse cx="20" cy="20" rx="16" ry="6.4" transform="rotate(-28 20 20)" stroke="currentColor" strokeWidth="1.25" opacity="0.7" />
      <ellipse cx="20" cy="20" rx="7" ry="15.5" transform="rotate(32 20 20)" stroke="currentColor" strokeWidth="1" opacity="0.34" />
      <circle cx="20" cy="20" r="3.2" fill="currentColor" />
      <circle cx="33.4" cy="12.6" r="2.4" fill="#B86745" stroke="#F4F1E6" strokeWidth="0.8" />
      <circle cx="8.4" cy="27.3" r="1.35" fill="currentColor" opacity="0.7" />
    </svg>
  );
}

function SectionHeading({
  index,
  title,
  description,
  id,
}: {
  index: string;
  title: React.ReactNode;
  description: string;
  id?: string;
}) {
  return (
    <div id={id} className="mb-6 flex scroll-mt-24 flex-col gap-3 border-t border-line pt-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex gap-4">
        <span className="pt-1 font-mono text-[10px] tracking-[0.15em] text-[#9B9E91]">{index}</span>
        <div>
          <h2 className="font-display text-[30px] leading-[1.05] tracking-[-0.01em] text-ink sm:text-[38px]">
            {title}
          </h2>
          <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-muted">{description}</p>
        </div>
      </div>
    </div>
  );
}

function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: string; disabled?: boolean; title?: string }[];
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <div className="inline-flex max-w-full flex-wrap rounded-lg border border-line bg-[#EEECE1]/70 p-0.5" role="group" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          disabled={option.disabled}
          title={option.title}
          aria-pressed={value === option.value}
          className={cn(
            "rounded-[6px] px-2.5 py-1.5 text-[11px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-35",
            value === option.value
              ? "bg-card text-ink shadow-[0_1px_3px_rgba(23,60,51,0.12)]"
              : "text-[#788077] hover:text-ink",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function OrbitSnapshot({
  snapshot,
  selected,
  band,
  metric,
}: {
  snapshot: Sample;
  selected: PlanetKey[];
  band: "table1" | "table2" | "extrapolated";
  metric: MetricId;
}) {
  const activeMetric = METRIC_BY_ID[metric];
  const selectedSet = new Set(selected);
  const center = 150;
  const maxRadius = 115;
  const radiusFor = (a: number) => 24 + (Math.log10(a + 1) / Math.log10(31)) * 86;
  const pointFor = (longitude: number, radius: number) => {
    const angle = (-normalizeDegrees(longitude) * Math.PI) / 180;
    return { x: center + radius * Math.cos(angle), y: center + radius * Math.sin(angle) };
  };
  const meanPoint = pointFor(snapshot.meanAngle, maxRadius);
  const meanEnd = {
    x: center + (meanPoint.x - center) * 0.96,
    y: center + (meanPoint.y - center) * 0.96,
  };

  return (
    <div className="relative flex flex-col overflow-hidden rounded-[26px] border border-[#2B554A] bg-forest p-5 text-[#F6F2E5] shadow-[0_24px_55px_-30px_rgba(15,45,38,0.65)] lg:p-6">
      <div className="pointer-events-none absolute -top-28 -right-24 h-72 w-72 rounded-full border border-[#F6F2E5]/10" />
      <div className="pointer-events-none absolute -top-16 -right-12 h-48 w-48 rounded-full border border-[#F6F2E5]/10" />
      <div className="relative flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-[#C7D78A] shadow-[0_0_8px_rgba(199,215,138,0.8)]" />
            <span className="text-[9px] font-semibold tracking-[0.18em] text-[#C7D78A] uppercase">Снимок системы</span>
          </div>
          <p className="mt-1.5 text-[12px] text-[#F6F2E5]/62">{formatEpochFull(snapshot.year)}</p>
        </div>
        <span className="rounded-full border border-[#F6F2E5]/15 px-2 py-1 text-[9px] tracking-[0.08em] text-[#F6F2E5]/55">
          J2000.0
        </span>
      </div>

      <div className="relative mt-5 flex items-end justify-between gap-2">
        <div>
          <p className="text-[9px] font-medium tracking-[0.15em] text-[#F6F2E5]/50 uppercase">{activeMetric.title}, момент</p>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="font-display text-[44px] leading-none tracking-[-0.02em] text-[#FBF7E9] tabular-nums">
              {fmt(metricValue(snapshot, metric), activeMetric.decimals)}
            </span>
            <span className="pb-1 text-[11px] text-[#F6F2E5]/52">{activeMetric.unit}</span>
          </div>
        </div>
        <div className="mb-1 rounded-lg border border-[#F6F2E5]/13 bg-[#F6F2E5]/[0.055] px-2.5 py-1.5 text-right">
          <p className="text-[8px] tracking-[0.1em] text-[#F6F2E5]/45 uppercase">СКО</p>
          <p className="mt-0.5 text-[14px] font-semibold text-[#F6F2E5] tabular-nums">{formatNumber(snapshot.rms, 1)}°</p>
        </div>
      </div>

      <div className="relative mt-3">
        <svg viewBox="0 0 300 300" className="mx-auto w-full max-w-[285px]" role="img" aria-label="Схема гелиоцентрических долгот планет">
          <defs>
            <radialGradient id="sun-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#F2B27E" stopOpacity="0.55" />
              <stop offset="100%" stopColor="#F2B27E" stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle cx={center} cy={center} r={maxRadius + 12} fill="url(#sun-glow)" opacity="0.35" />
          {[0.35, 0.62, 0.86, 1].map((fraction) => (
            <circle
              key={fraction}
              cx={center}
              cy={center}
              r={maxRadius * fraction}
              fill="none"
              stroke="#F6F2E5"
              strokeOpacity={fraction === 1 ? 0.2 : 0.1}
              strokeDasharray={fraction === 1 ? "2 4" : "1 6"}
            />
          ))}
          {[0, 90, 180, 270].map((angle) => {
            const radians = (-angle * Math.PI) / 180;
            return (
              <line
                key={angle}
                x1={center - Math.cos(radians) * maxRadius}
                y1={center - Math.sin(radians) * maxRadius}
                x2={center + Math.cos(radians) * maxRadius}
                y2={center + Math.sin(radians) * maxRadius}
                stroke="#F6F2E5"
                strokeOpacity="0.055"
              />
            );
          })}
          <line
            x1={center}
            y1={center}
            x2={meanEnd.x}
            y2={meanEnd.y}
            stroke="#E7A477"
            strokeWidth="1.2"
            strokeDasharray="3 4"
            strokeOpacity="0.85"
          />
          <circle cx={meanEnd.x} cy={meanEnd.y} r="3.1" fill="#E7A477" />
          <text
            x={meanEnd.x + (meanEnd.x > center ? 7 : -24)}
            y={meanEnd.y + (meanEnd.y > center ? 10 : -5)}
            className="fill-[#E7A477] text-[8px]"
          >
            λ̄
          </text>
          <circle cx={center} cy={center} r="9" fill="#F5C08D" opacity="0.14" />
          <circle cx={center} cy={center} r="4" fill="#F5C08D" />

          {PLANETS.map((planet, index) => {
            const point = pointFor(snapshot.longitudes[index], radiusFor(planet.a));
            const active = selectedSet.has(planet.key);
            return (
              <g key={planet.key} opacity={active ? 1 : 0.28}>
                <circle cx={point.x} cy={point.y} r={active ? 5 : 3.6} fill={planet.color} stroke="#F8F3E3" strokeWidth={active ? 1.2 : 0.7} />
                <title>{planet.name}</title>
              </g>
            );
          })}
          <text x="12" y="24" className="fill-[#F6F2E5] text-[8px] tracking-[0.08em]" fillOpacity="0.38">
            ВИД СВЕРХУ
          </text>
          <text x="278" y="282" textAnchor="end" className="fill-[#F6F2E5] text-[8px]" fillOpacity="0.34">
            НЕ В МАСШТАБЕ
          </text>
        </svg>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-[#F6F2E5]/12 pt-4">
        <div>
          <p className="text-[8px] tracking-[0.12em] text-[#F6F2E5]/42 uppercase">Средний угол λ̄</p>
          <p className="mt-1 font-display text-[21px] leading-none text-[#F6F2E5] tabular-nums">{snapshot.meanAngle.toFixed(1)}°</p>
        </div>
        <div>
          <p className="text-[8px] tracking-[0.12em] text-[#F6F2E5]/42 uppercase">Концентрация R</p>
          <p className="mt-1 font-display text-[21px] leading-none text-[#F6F2E5] tabular-nums">{snapshot.concentration.toFixed(2)}</p>
        </div>
        <div className="col-span-2">
          <div className="flex items-center justify-between text-[9px] text-[#F6F2E5]/48">
            <span>Согласованность направлений</span>
            <span className="tabular-nums">{Math.round(snapshot.concentration * 100)}%</span>
          </div>
          <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-[#F6F2E5]/12">
            <div
              className="h-full rounded-full bg-[#C7D78A] transition-[width] duration-300"
              style={{ width: `${Math.max(1.5, Math.min(100, snapshot.concentration * 100))}%` }}
            />
          </div>
        </div>
      </div>

      <p className="mt-4 flex items-start gap-1.5 text-[9px] leading-relaxed text-[#F6F2E5]/38">
        <span
          className={cn(
            "mt-1 h-1 w-1 shrink-0 rounded-full",
            band === "table1" ? "bg-[#C7D78A]" : band === "table2" ? "bg-[#E7C68A]" : "bg-[#E7A477]",
          )}
        />
        {MODEL_BAND_COPY[band].note}
      </p>
    </div>
  );
}

function PlanetGrid({
  snapshot,
  selected,
  series,
  onToggle,
  onSelectAll,
}: {
  snapshot: Sample;
  selected: PlanetKey[];
  series: Series;
  onToggle: (key: PlanetKey) => void;
  onSelectAll: () => void;
}) {
  const selectedSet = new Set(selected);
  const [mode, setMode] = useState<"moment" | "window">("moment");

  const windowStats = useMemo(() => {
    return PLANETS.map((planet, index) => {
      if (!selectedSet.has(planet.key)) return null;
      let absoluteSum = 0;
      let squaredSum = 0;
      let nearShare = 0;
      for (const sample of series.samples) {
        const deviation = sample.deviations[index] ?? 0;
        absoluteSum += Math.abs(deviation);
        squaredSum += deviation * deviation;
        if (Math.abs(deviation) <= 90) nearShare += 1;
      }
      const count = Math.max(1, series.samples.length);
      return {
        meanAbsolute: absoluteSum / count,
        rms: Math.sqrt(squaredSum / count),
        nearShare: (nearShare / count) * 100,
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [series, selected]);

  return (
    <section className="mt-4 rounded-[24px] border border-line bg-card p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-baseline gap-3">
          <h3 className="font-display text-[23px] leading-none text-ink">Планеты в модели</h3>
          <span className="hidden text-[10px] text-[#93978A] lg:inline">нажмите на карточку, чтобы включить или исключить</span>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <Segmented<"moment" | "window">
            label="Данные карточек"
            value={mode}
            onChange={setMode}
            options={[
              { value: "moment", label: "Сейчас" },
              { value: "window", label: "За период" },
            ]}
          />
          <span className="text-[10px] text-muted tabular-nums">
            {selected.length} из 8
          </span>
          <button
            type="button"
            onClick={onSelectAll}
            className="rounded-full border border-line px-2.5 py-1 text-[10px] font-medium text-ink transition-colors hover:bg-[#EEEBDD]"
          >
            Все
          </button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-8">
        {PLANETS.map((planet, index) => {
          const active = selectedSet.has(planet.key);
          const longitude = snapshot.longitudes[index];
          const deviation = snapshot.deviations[index];
          const stats = windowStats[index];
          return (
            <button
              key={planet.key}
              type="button"
              onClick={() => onToggle(planet.key)}
              aria-pressed={active}
              className={cn(
                "group relative rounded-xl border p-3 text-left transition-all duration-150",
                active
                  ? "border-[#CFD5C4] bg-[#FBF9F0] shadow-[0_2px_8px_rgba(23,60,51,0.045)] hover:-translate-y-0.5 hover:border-[#B6C1B0]"
                  : "border-[#E5E1D5] bg-[#F5F2E8]/40 opacity-65 hover:opacity-100",
              )}
            >
              <div className="flex items-center justify-between">
                <span
                  className="flex h-7 w-7 items-center justify-center rounded-full text-[14px]"
                  style={{ backgroundColor: planet.tint, color: planet.color }}
                >
                  {planet.symbol}
                </span>
                <span
                  className={cn(
                    "flex h-4 w-4 items-center justify-center rounded-[4px] border transition-colors",
                    active ? "border-forest bg-forest text-[#F7F3E6]" : "border-[#C8C6B8] bg-transparent",
                  )}
                >
                  {active && (
                    <svg viewBox="0 0 10 10" className="h-2.5 w-2.5" fill="none" aria-hidden="true">
                      <path d="m2 5 2 2 4-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </span>
              </div>
              <div className="mt-2.5 flex items-baseline justify-between gap-1">
                <p className="text-[11px] font-semibold tracking-[0.01em] text-ink">{planet.name}</p>
                <span className="text-[7.5px] tracking-[0.05em] text-[#9A9D91] uppercase">
                  {mode === "moment" ? "λ" : "ср. |δ|"}
                </span>
              </div>
              <p className="mt-0.5 font-display text-[21px] leading-none text-[#254E43] tabular-nums">
                {mode === "moment"
                  ? `${longitude.toFixed(1)}°`
                  : stats
                    ? `${stats.meanAbsolute.toFixed(1)}°`
                    : "—"}
              </p>
              <div className="mt-1.5 flex items-center justify-between gap-1 text-[9px]">
                <span className="text-[#96998D]">{mode === "moment" ? "откл." : "СКО"}</span>
                <span
                  className="font-medium tabular-nums"
                  style={{ color: active ? planet.color : "#9A9C91" }}
                >
                  {mode === "moment"
                    ? `${formatSigned(deviation, 1)}°`
                    : stats
                      ? `${stats.rms.toFixed(0)}°`
                      : "—"}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function VectorDiagram({ snapshot, selected }: { snapshot: Sample; selected: PlanetKey[] }) {
  const center = 110;
  const radius = 76;
  const selectedSet = new Set(selected);
  const point = (angle: number, r: number) => ({
    x: center + r * Math.cos((angle * Math.PI) / 180),
    y: center - r * Math.sin((angle * Math.PI) / 180),
  });
  const mean = point(snapshot.meanAngle, radius);

  return (
    <svg viewBox="0 0 220 220" className="w-full max-w-[222px]" role="img" aria-label="Векторная схема циркулярного среднего">
      <circle cx={center} cy={center} r={radius} fill="none" stroke="#F5F0E2" strokeOpacity="0.22" />
      <circle cx={center} cy={center} r="1.8" fill="#F5F0E2" opacity="0.55" />
      {[0, 90, 180, 270].map((angle) => {
        const outer = point(angle, radius);
        return (
          <line key={angle} x1={center} y1={center} x2={outer.x} y2={outer.y} stroke="#F5F0E2" strokeOpacity="0.07" strokeDasharray="2 5" />
        );
      })}
      {PLANETS.map((planet, index) => {
        if (!selectedSet.has(planet.key)) return null;
        const endpoint = point(snapshot.longitudes[index], radius - 8);
        return (
          <g key={planet.key}>
            <line x1={center} y1={center} x2={endpoint.x} y2={endpoint.y} stroke={planet.color} strokeWidth="1.3" strokeOpacity="0.85" />
            <circle cx={endpoint.x} cy={endpoint.y} r="3" fill={planet.color} stroke="#173C33" strokeWidth="0.7" />
          </g>
        );
      })}
      <line x1={center} y1={center} x2={mean.x} y2={mean.y} stroke="#E7A477" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx={mean.x} cy={mean.y} r="4.3" fill="#E7A477" stroke="#173C33" strokeWidth="1" />
      <text x={mean.x + (mean.x > center ? 7 : -30)} y={mean.y + (mean.y > center ? 2 : -7)} className="fill-[#E7A477] font-display text-[19px] italic">
        λ̄
      </text>
      <text x="110" y="209" textAnchor="middle" className="fill-[#F5F0E2] text-[8px] tracking-[0.12em]" fillOpacity="0.42">
        СУММА ЕДИНИЧНЫХ ВЕКТОРОВ
      </text>
    </svg>
  );
}

function App() {
  const [selected, setSelected] = useState<PlanetKey[]>(PLANETS.map((planet) => planet.key));
  const [windowState, setWindowState] = useState({ centerYear: 0, halfSpanYears: 10_000 });
  const [cursorYear, setCursorYear] = useState(CURRENT_YEAR);
  const [metric, setMetric] = useState<MetricId>("variance");
  const [view, setView] = useState<ChartView>("system");
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<number | null>(null);

  const series = useMemo(
    () =>
      generateSeries({
        centerYear: windowState.centerYear,
        halfSpanYears: windowState.halfSpanYears,
        selected,
      }),
    [windowState, selected],
  );

  const overview = useMemo(
    () => generateSeries({ centerYear: 0, halfSpanYears: 10_000, selected }),
    [selected],
  );

  const snapshot = useMemo(() => sampleAtYear(cursorYear, selected), [cursorYear, selected]);

  const [minimum, setMinimum] = useState<DispersionMinimum | null>(null);
  const [inBandMinimum, setInBandMinimum] = useState<DispersionMinimum | null>(null);
  const [minimumLoading, setMinimumLoading] = useState(true);
  const [minimumProgress, setMinimumProgress] = useState(0);
  const [minimumPhase, setMinimumPhase] = useState<"scan" | "refine">("scan");

  // The calibrated search window: always 1800–2050 (JPL Table 1), independent
  // of the visible zoom window.  Gives an honest "reliable" reference moment.
  const referenceSeries = useMemo(
    () => generateSeries({ centerYear: 1925, halfSpanYears: 125, selected }),
    [selected],
  );

  useEffect(() => {
    let cancelled = false;
    setMinimumLoading(true);
    setMinimumProgress(0);
    setMinimumPhase("scan");
    const options = {
      isCancelled: () => cancelled,
      onProgress: (fraction: number, phase: "scan" | "refine") => {
        if (cancelled) return;
        setMinimumProgress(fraction);
        setMinimumPhase(phase);
      },
    };
    findMinimumDispersionAsync(series, selected, metric, options)
      .then((result) => {
        if (cancelled) return;
        setMinimum(result);
        setMinimumLoading(false);
      })
      .catch(() => {
        if (!cancelled) setMinimumLoading(false);
      });
    findMinimumDispersionAsync(referenceSeries, selected, metric)
      .then((result) => {
        if (!cancelled) setInBandMinimum(result);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [series, selected, referenceSeries, metric]);

  const band = modelBandForWindow(windowState.centerYear, windowState.halfSpanYears);

  const notify = (message: string) => {
    setToast(message);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2800);
  };

  useEffect(
    () => () => {
      if (toastTimer.current) window.clearTimeout(toastTimer.current);
    },
    [],
  );

  const setWindow = (centerYear: number, halfSpanYears: number) => {
    const next = clampWindow(centerYear, halfSpanYears);
    setWindowState(next);
  };

  const changePreset = (halfSpanYears: number) => {
    if (halfSpanYears === 10_000) {
      setWindow(0, halfSpanYears);
      return;
    }
    setWindow(cursorYear, halfSpanYears);
  };

  const zoomBy = (factor: number) => {
    const nextHalf = Math.min(
      10_000,
      Math.max(0.5 / DAYS_PER_YEAR, windowState.halfSpanYears * factor),
    );
    setWindow(cursorYear, nextHalf);
  };

  const openMinimum = (moment: DispersionMinimum) => {
    setCursorYear(moment.year);
    setWindow(moment.year, 3 / DAYS_PER_YEAR);
    notify(`День наименьшей дисперсии: ${formatMoment(moment.year)}.`);
  };

  const togglePlanet = (key: PlanetKey) => {
    const active = selected.includes(key);
    if (active && selected.length <= 2) {
      notify("Для дисперсии нужны минимум две планеты.");
      return;
    }
    if (active) {
      setSelected(selected.filter((item) => item !== key));
    } else {
      setSelected(
        PLANETS.filter((planet) => planet.key === key || selected.includes(planet.key)).map(
          (planet) => planet.key,
        ),
      );
    }
  };

  const exportCsv = () => {
    const metricDef = METRIC_BY_ID[metric];
    const minimumLine = minimum
      ? `# ${metricDef.minTitle} (окно): ${formatMoment(minimum.year)}; ${metricDef.symbol}=${minimum.value.toFixed(4)} ${metricDef.unit}; σ²=${minimum.variance.toFixed(2)}; σ=${minimum.rms.toFixed(2)}; ½-норма=${minimum.sample.half.toFixed(2)}; D=${minimum.sample.barycenterDistance.toFixed(4)} а.е.; R=${minimum.concentration.toFixed(4)}; планет в ±30°: ${minimum.within30}/${selected.length}`
      : "";
    const reliableLine = inBandMinimum
      ? `# Надёжный минимум ${metricDef.symbol} (1800–2050, таблица 1): ${formatMoment(inBandMinimum.year)}; ${metricDef.symbol}=${inBandMinimum.value.toFixed(4)} ${metricDef.unit}`
      : "";
    const csv = [minimumLine, reliableLine, makeCsv(series, selected, metric)]
      .filter(Boolean)
      .join("\n");
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `orbita-dispersion_${formatYear(windowState.centerYear)}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    notify("CSV для текущего окна готов.");
  };

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const startYear = windowState.centerYear - windowState.halfSpanYears;
  const endYear = windowState.centerYear + windowState.halfSpanYears;
  const spanYears = windowState.halfSpanYears * 2;
  const activePreset = PRESETS.find(
    (preset) => Math.abs(preset.halfSpan - windowState.halfSpanYears) < 1e-9,
  );
  const def = METRIC_BY_ID[metric];
  const chartView: ChartView = def.angular ? view : "system";
  const summary = useMemo(() => summarizeSeries(series, metric), [series, metric]);
  const meanMetric = summary.mean;
  const maxMetric = summary.max;

  const previewHalfSpans = [10_000, 10, 1 / 12];
  const previews = previewHalfSpans.map((half) => {
    const step = autoStepYears(half);
    const rawCount = Math.floor((half * 2) / step) + 1;
    return { half, step, count: Math.min(MAX_SAMPLES, rawCount) };
  });

  const rangeText =
    spanYears > 40
      ? `${formatYear(startYear)} — ${formatYear(endYear)} гг.`
      : `${formatEpoch(startYear, spanYears)} — ${formatEpoch(endYear, spanYears)}`;

  return (
    <div className="min-h-screen bg-paper text-ink">
      <header className="sticky top-0 z-40 border-b border-line/90 bg-paper/92 backdrop-blur-md">
        <div className="mx-auto flex h-[68px] max-w-[1480px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-10">
          <button type="button" onClick={() => scrollTo("top")} className="flex shrink-0 items-center gap-2.5 text-left" aria-label="Орбита — наверх">
            <OrbitLogo className="h-[38px] w-[38px] text-forest" />
            <span>
              <span className="block font-sans text-[15px] font-bold tracking-[0.16em] text-ink">ОРБИТА</span>
              <span className="mt-0.5 hidden text-[8px] tracking-[0.13em] text-[#8B9185] uppercase sm:block">
                планетарная динамика
              </span>
            </span>
          </button>

          <nav className="hidden items-center gap-1 md:flex" aria-label="Навигация">
            {[
              ["Обзор", "overview"],
              ["Масштаб", "scales"],
              ["Модель", "model"],
              ["Источники", "sources"],
            ].map(([label, id]) => (
              <button
                key={id}
                type="button"
                onClick={() => scrollTo(id)}
                className="rounded-md px-3 py-2 text-[11px] font-medium text-[#69746B] transition-colors hover:bg-[#ECE9DD] hover:text-ink"
              >
                {label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <span className="hidden items-center gap-1.5 rounded-full border border-[#D7D8CA] bg-card px-2.5 py-1.5 text-[9px] font-medium tracking-[0.04em] text-[#617066] sm:flex">
              <span className="h-1.5 w-1.5 rounded-full bg-[#7BA676]" />
              JPL · J2000
            </span>
            <button
              type="button"
              onClick={exportCsv}
              className="flex items-center gap-1.5 rounded-lg border border-[#CBCCBE] bg-[#FBF9F0] px-2.5 py-2 text-[10px] font-semibold text-ink transition-colors hover:border-[#A9B2A5] hover:bg-white"
            >
              <DownloadIcon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">CSV</span>
            </button>
          </div>
        </div>
      </header>

      <main id="top" className="mx-auto max-w-[1480px] px-4 pb-16 sm:px-6 lg:px-10">
        <section className="grid gap-8 pt-10 pb-7 sm:pt-14 xl:grid-cols-[minmax(0,1fr)_300px] xl:items-end">
          <div>
            <div className="flex items-center gap-2.5 text-[9px] font-semibold tracking-[0.19em] text-[#7B8478] uppercase">
              <span className="h-px w-7 bg-[#B7B9AA]" />
              Наблюдение · 01
              <span className="hidden h-px w-7 bg-[#B7B9AA] sm:block" />
              <span className="hidden text-[#9A9D91] sm:inline">циркулярная статистика</span>
            </div>
            <h1 className="mt-5 max-w-[860px] font-display text-[48px] leading-[0.92] tracking-[-0.025em] text-ink sm:text-[68px] lg:text-[78px]">
              Дисперсия <span className="italic text-[#2E6E5C]">планетных</span> углов
            </h1>
            <p className="mt-6 max-w-[650px] text-[13px] leading-[1.75] text-[#5F6B62] sm:text-[14px]">
              Гелиоцентрические долготы восьми планет за 20 000 лет. Для каждого момента находим
              циркулярное среднее направление и измеряем, насколько сильно планеты от него расходятся.
              Ищем и день наименьшей дисперсии — ближайший к «параду планет», с масштабом от
              тысячелетий до одного дня.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => scrollTo("overview")}
                className="flex items-center gap-2 rounded-lg bg-forest px-4 py-2.5 text-[11px] font-semibold text-[#F8F4E6] transition-colors hover:bg-[#215448]"
              >
                Открыть график
                <ArrowDown className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => scrollTo("model")}
                className="rounded-lg border border-[#CBCDBF] px-4 py-2.5 text-[11px] font-medium text-[#4F5F55] transition-colors hover:bg-[#ECE9DD]"
              >
                Как построена модель
              </button>
              <span className="ml-1 hidden text-[9px] text-[#9B9D91] sm:inline">учебная модель, не для навигации</span>
            </div>
          </div>

          <aside className="border-t border-line pt-5 xl:border-t-0 xl:border-l xl:pt-0 xl:pl-6">
            <p className="text-[9px] font-semibold tracking-[0.16em] text-[#8C9084] uppercase">Параметры обзора</p>
            <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-4 xl:grid-cols-1 xl:gap-y-3.5">
              <div>
                <p className="font-display text-[28px] leading-none text-ink">±10 000</p>
                <p className="mt-1 text-[9px] tracking-[0.08em] text-[#8C9186] uppercase">лет истории</p>
              </div>
              <div>
                <p className="font-display text-[28px] leading-none text-ink">8</p>
                <p className="mt-1 text-[9px] tracking-[0.08em] text-[#8C9186] uppercase">планет в модели</p>
              </div>
              <div>
                <p className="font-display text-[28px] leading-none text-ink">15 мин</p>
                <p className="mt-1 text-[9px] tracking-[0.08em] text-[#8C9186] uppercase">минимальный шаг графика</p>
              </div>
              <div>
                <p className="font-display text-[28px] leading-none text-ink">8 000</p>
                <p className="mt-1 text-[9px] tracking-[0.08em] text-[#8C9186] uppercase">точек в бюджете</p>
              </div>
            </div>
          </aside>
        </section>

        <section id="overview" className="scroll-mt-24 grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px] 2xl:grid-cols-[minmax(0,1fr)_410px]">
          <div className="rounded-[26px] border border-line bg-card p-4 shadow-[0_18px_45px_-38px_rgba(25,60,51,0.5)] sm:p-5">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[9px] font-semibold tracking-[0.15em] text-[#93978B] uppercase">01 / динамика</span>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[8px] font-semibold tracking-[0.05em]",
                      band === "table1"
                        ? "bg-[#E6EEE2] text-[#4D7453]"
                        : band === "table2"
                          ? "bg-[#F2EBD9] text-[#7D6A3C]"
                          : "bg-[#F4E6D9] text-[#9A5B3A]",
                    )}
                  >
                    {MODEL_BAND_COPY[band].title}
                  </span>
                </div>
                <h2 className="mt-1.5 font-display text-[30px] leading-none tracking-[-0.015em] text-ink">
                  {chartView === "system" ? def.title : "Отклонения по планетам"}
                </h2>
                <p className="mt-2 max-w-[560px] text-[11px] leading-relaxed text-[#7A8379]">
                  {chartView === "system"
                    ? (def.angular ? "Разброс долгот относительно циркулярного среднего. Зелёная точка — минимум выбранной метрики. Выделите участок, чтобы приблизить." : def.description)
                    : "Квадрат отклонения каждой выбранной планеты от общего среднего направления системы."}
                </p>
              </div>
              <Segmented<ChartView>
                label="Режим графика"
                value={chartView}
                onChange={setView}
                options={[
                  { value: "system", label: "Система" },
                  {
                    value: "planets",
                    label: "По планетам",
                    disabled: !def.angular,
                    title: def.angular ? undefined : "Недоступно для расстояния до Солнца",
                  },
                ]}
              />
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-1.5 border-y border-[#E8E4D8] py-2.5">
              {PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => changePreset(preset.halfSpan)}
                  aria-pressed={activePreset?.id === preset.id}
                  className={cn(
                    "rounded-full border px-2.5 py-1.5 text-[10px] font-medium transition-all",
                    activePreset?.id === preset.id
                      ? "border-forest bg-forest text-[#F8F4E6]"
                      : "border-[#DCD9CC] bg-[#F8F5EB] text-[#59675E] hover:border-[#B4BCAF] hover:text-ink",
                  )}
                >
                  {preset.label}
                </button>
              ))}
              <div className="ml-auto flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => zoomBy(2)}
                  disabled={windowState.halfSpanYears >= 10_000}
                  className="flex h-7 w-7 items-center justify-center rounded-md border border-[#DCD9CC] bg-[#F8F5EB] text-[15px] text-ink transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-35"
                  aria-label="Уменьшить масштаб"
                  title="Уменьшить масштаб"
                >
                  −
                </button>
                <button
                  type="button"
                  onClick={() => zoomBy(0.5)}
                  disabled={windowState.halfSpanYears <= 0.5 / DAYS_PER_YEAR + 1e-10}
                  className="flex h-7 w-7 items-center justify-center rounded-md border border-[#DCD9CC] bg-[#F8F5EB] text-[15px] text-ink transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-35"
                  aria-label="Увеличить масштаб"
                  title="Увеличить масштаб"
                >
                  +
                </button>
                <button
                  type="button"
                  onClick={() => setWindow(0, 10_000)}
                  className="ml-1 rounded-md border border-transparent px-1.5 py-1 text-[9px] font-medium text-[#8A9186] transition-colors hover:text-ink"
                >
                  Сброс
                </button>
              </div>
            </div>

            <div className="flex flex-col justify-between gap-2 pt-2.5 pb-1 sm:flex-row sm:items-center">
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[9px] text-[#8E9388]">
                <span className="font-medium text-[#5E6A61] tabular-nums">{rangeText}</span>
                <span className="h-2.5 w-px bg-[#D9D6C9]" />
                <span>шаг {formatStep(series.stepYears)}</span>
                <span className="h-2.5 w-px bg-[#D9D6C9]" />
                <span>{formatNumber(series.samples.length)} точек</span>
                <span className="h-2.5 w-px bg-[#D9D6C9]" />
                <span>средний курсор {formatEpoch(cursorYear, spanYears)}</span>
              </div>
              <Segmented<MetricId>
                label="Метрика"
                value={metric}
                onChange={setMetric}
                options={METRICS.map((item) => ({ value: item.id, label: item.short, title: item.title }))}
              />
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-0.5 pb-2 text-[8.5px] text-[#8D9387]">
              {chartView === "system" ? (
                <>
                  <span className="flex items-center gap-1.5">
                    <span className="h-[2px] w-4 rounded-full bg-[#226A57]" />
                    скользящее среднее · {def.symbol}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-[3px] w-4 rounded-full bg-[#226A57]/35" />
                    по моментам
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-4 border-t border-dashed border-[#B86745]" />
                    среднее за окно
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full border border-[#B86745] bg-card" />
                    пик
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-[#2F7E6C]" />
                    минимум за окно
                  </span>
                </>
              ) : (
                PLANETS.filter((planet) => selected.includes(planet.key)).map((planet) => (
                  <span key={planet.key} className="flex items-center gap-1.5">
                    <span className="h-[2px] w-3.5 rounded-full" style={{ backgroundColor: planet.color }} />
                    {planet.name}
                  </span>
                ))
              )}
              <span className="ml-auto hidden items-center gap-1.5 text-[#9B9E92] sm:flex">
                <span className="inline-block h-2.5 w-2.5 rounded-[2px] border border-dashed border-[#AEB4A7]" />
                протяните по графику, чтобы увеличить
              </span>
            </div>

            <DispersionChart
              series={series}
              overview={overview}
              selected={selected}
              centerYear={windowState.centerYear}
              halfSpanYears={windowState.halfSpanYears}
              cursorYear={cursorYear}
              metric={metric}
              view={view}
              minimum={minimum}
              summary={summary}
              onCursorYear={setCursorYear}
              onZoom={setWindow}
            />

            <div className="mt-3 rounded-xl border border-[#C9D5BC] bg-[#EDF1E1] p-3 sm:p-3.5">
              <div className="flex flex-wrap items-start justify-between gap-2.5">
                <div className="flex min-w-0 items-start gap-2.5">
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#C4D2B4] bg-[#DFE9CF]">
                    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 text-[#3E6A4D]" fill="none" aria-hidden="true">
                      <circle cx="8" cy="8" r="5.4" stroke="currentColor" strokeWidth="1.2" />
                      <circle cx="8" cy="8" r="1.8" fill="currentColor" />
                      <path d="M8 .8v2.2M8 13v2.2M.8 8h2.2M13 8h2.2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                    </svg>
                  </span>
                  <div className="min-w-0">
                    <p className="text-[8px] font-semibold tracking-[0.15em] text-[#5C7454] uppercase">
                      {def.minTitle}
                    </p>
                    <p className="mt-1 font-display text-[20px] leading-tight text-[#183E35] sm:text-[23px]">
                      {minimumLoading ? (
                        <span className="inline-flex items-center gap-2 text-[#7E8C74]">
                          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#7E8C74]" />
                          {minimumPhase === "scan" ? "Скан всего окна" : "Уточнение момента"} ·{" "}
                          {Math.round(minimumProgress * 100)}%
                        </span>
                      ) : minimum ? (
                        formatMoment(minimum.year)
                      ) : (
                        "Нет данных для этого окна"
                      )}
                    </p>
                    {minimumLoading && (
                      <div className="mt-2 h-1 w-full max-w-[320px] overflow-hidden rounded-full bg-[#D5E0C5]">
                        <div
                          className="h-full rounded-full bg-[#6E9573] transition-[width] duration-200"
                          style={{ width: `${Math.max(3, minimumProgress * 100)}%` }}
                        />
                      </div>
                    )}
                    <p className="mt-1 text-[9.5px] leading-relaxed text-[#68775F]">
                      {minimum ? (
                        def.angular ? (
                          <>
                            Лучшее сближение в окне {rangeText}: {minimum.within30} из {selected.length} планет
                            в пределах 30{"\u00A0"}° от общего среднего.{" "}
                          </>
                        ) : (
                          <>
                            Среднее положение выбранных планет ближе всего к Солнцу в окне {rangeText}: D ={" "}
                            {fmt(minimum.value, def.decimals)} {def.unit}{" "}
                          </>
                        )
                      ) : (
                        "Выберите минимум две планеты."
                      )}
                      {minimum && modelBandForWindow(minimum.year, 0) === "extrapolated" && (
                        <span className="font-medium text-[#9A6B47]">
                          Момент лежит вне паспортных таблиц JPL — это экстраполяция.
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex gap-1.5">
                    {METRICS.map((item) => {
                      const active = item.id === metric;
                      return (
                        <div
                          key={item.id}
                          className={cn(
                            "min-w-[58px] rounded-md border px-2 py-1 text-center",
                            active ? "border-[#7F9C70] bg-[#FBFCF6]" : "border-[#CBD8BE] bg-[#F7F9EF]/70",
                          )}
                        >
                          <p className="text-[7px] tracking-[0.06em] text-[#85937B] uppercase">{item.symbol}</p>
                          <p
                            className={cn(
                              "text-[13px] leading-tight tabular-nums",
                              active ? "font-semibold text-[#183E35]" : "font-medium text-[#4F6353]",
                            )}
                          >
                            {minimum ? fmt(metricValue(minimum.sample, item.id), item.decimals) : "—"}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                  <button
                    type="button"
                    onClick={() => minimum && openMinimum(minimum)}
                    disabled={!minimum || minimumLoading}
                    className="flex items-center gap-1.5 rounded-md bg-forest px-2.5 py-2 text-[9.5px] font-semibold text-[#F8F4E6] transition-colors hover:bg-[#215448] disabled:cursor-not-allowed disabled:opacity-40"
                    title="Открыть ±3 дня вокруг найденного момента"
                  >
                    Открыть день
                    <ArrowDown className="h-3 w-3 rotate-[-90deg]" />
                  </button>
                </div>
              </div>

              {inBandMinimum && (
                <div className="mt-2.5 rounded-lg border border-[#CFDCC1] bg-[#F6F8EE] px-2.5 py-2">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="text-[8px] font-semibold tracking-[0.06em] text-[#5C7454] uppercase">
                      Надёжный минимум · {def.symbol}
                    </span>
                    <span className="text-[8px] text-[#98A38E]">1800–2050 · таблица 1</span>
                    <button
                      type="button"
                      onClick={() => openMinimum(inBandMinimum)}
                      className="ml-auto rounded-full border border-[#BFD0AF] bg-[#FBFCF6] px-2 py-0.5 text-[8.5px] font-semibold text-[#3F6559] transition-colors hover:bg-white hover:text-[#183E35]"
                    >
                      Открыть
                    </button>
                  </div>
                  <p className="mt-0.5 text-[10px] font-medium text-[#294F3D]">
                    {formatMoment(inBandMinimum.year)}
                  </p>
                  <p className="text-[9px] text-[#73826A] tabular-nums">
                    {def.symbol} {fmt(inBandMinimum.value, def.decimals)}
                    {"\u00A0"}
                    {def.unit} · R {inBandMinimum.concentration.toFixed(2)} · {inBandMinimum.within30}/
                    {selected.length} в&nbsp;±30{"\u00A0"}°
                  </p>
                </div>
              )}

              {minimum && minimum.alternatives.length > 0 && (
                <div className="mt-2.5 flex flex-wrap items-center gap-1.5 border-t border-[#D5E0C5] pt-2">
                  <span className="text-[8px] font-medium tracking-[0.06em] text-[#87947B] uppercase">
                    Другие сближения:
                  </span>
                  {minimum.alternatives.map((alternative) => (
                    <button
                      key={alternative.year}
                      type="button"
                      onClick={() => openMinimum(alternative)}
                      className="rounded-full border border-[#CBD8BE] bg-[#F7F9EF] px-2 py-1 text-[8.5px] text-[#4F6353] transition-colors hover:border-[#A9BC96] hover:text-[#183E35]"
                      title={`${def.symbol} ${fmt(alternative.value, def.decimals)} ${def.unit}`}
                    >
                      {formatEpoch(alternative.year, spanYears)}
                      <span className="ml-1.5 tabular-nums text-[#8C9A80]">
                        {fmt(alternative.value, def.decimals)}
                      </span>
                    </button>
                  ))}
                  <span className="ml-auto hidden text-[8px] text-[#94A088] sm:inline">
                    скан {formatStep(minimum.scanStepYears)} → уточнение до{" "}
                    {formatStep(minimum.resolutionYears)}
                  </span>
                </div>
              )}
            </div>

            <dl className="mt-3 grid grid-cols-3 divide-x divide-[#E6E2D6] border-t border-[#E6E2D6] pt-3">
              <div className="pr-3">
                <dt className="text-[8px] tracking-[0.1em] text-[#989C8F] uppercase">Среднее за окно</dt>
                <dd className="mt-1 font-display text-[19px] leading-none text-[#244D42] tabular-nums">
                  {fmt(meanMetric, def.decimals)}
                  <span className="ml-1 font-sans text-[9px] text-[#959A8F]">{def.unit}</span>
                </dd>
              </div>
              <div className="px-3">
                <dt className="text-[8px] tracking-[0.1em] text-[#989C8F] uppercase">
                  {def.angular ? "Пик разброса" : "Пик смещения"}
                </dt>
                <dd className="mt-1 font-display text-[19px] leading-none text-[#244D42] tabular-nums">
                  {fmt(maxMetric, def.decimals)}
                  <span className="ml-1 font-sans text-[9px] text-[#959A8F]">
                    {formatEpoch(summary.maxYear, spanYears)}
                  </span>
                </dd>
              </div>
              <div className="pl-3">
                <dt className="text-[8px] tracking-[0.1em] text-[#989C8F] uppercase">Средняя R</dt>
                <dd className="mt-1 font-display text-[19px] leading-none text-[#244D42] tabular-nums">
                  {series.meanConcentration.toFixed(2)}
                  <span className="ml-1 font-sans text-[9px] text-[#959A8F]">из 1,00</span>
                </dd>
              </div>
            </dl>
          </div>

          <div className="xl:sticky xl:top-[84px] xl:self-start">
            <OrbitSnapshot snapshot={snapshot} selected={selected} band={band} metric={metric} />
          </div>
        </section>

        <PlanetGrid
          snapshot={snapshot}
          selected={selected}
          series={series}
          onToggle={togglePlanet}
          onSelectAll={() => setSelected(PLANETS.map((planet) => planet.key))}
        />

        <section className="mt-14">
          <SectionHeading
            id="scales"
            index="02"
            title={<>Масштаб без потери смысла</>}
            description="Чем уже окно, тем подробнее шаг. Выборка автоматически подстраивается, чтобы не считать лишние миллионы точек."
          />
          <div className="grid gap-3 lg:grid-cols-3">
            {[
              {
                label: "Обзор",
                title: "Вся история",
                half: 10_000,
                copy: "Долгие века, крупные эпохи и медленный дрейф среднего направления.",
                accent: "#7F9183",
                index: previews[0],
              },
              {
                label: "Десятилетие",
                title: "Видно циклы",
                half: 10,
                copy: "Суточный шаг показывает синодические сближения и быстрые перестройки системы.",
                accent: "#2F7E6C",
                index: previews[1],
              },
              {
                label: "Месяц",
                title: "Почти непрерывно",
                half: 1 / 12,
                copy: "Минутная шкала для локальной динамики: шаг подбирается под размер окна.",
                accent: "#B86745",
                index: previews[2],
              },
            ].map((card) => (
              <article key={card.label} className="group flex flex-col rounded-[22px] border border-line bg-card p-5">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-semibold tracking-[0.14em] uppercase" style={{ color: card.accent }}>
                    {card.label}
                  </span>
                  <div className="flex h-8 items-end gap-[3px]" aria-hidden="true">
                    {[3, 5, 4, 7, 5, 9, 6, 8, 7, 10, 8, 11].map((bar, index) => (
                      <span
                        key={index}
                        className="w-[3px] rounded-sm opacity-55 transition-opacity group-hover:opacity-100"
                        style={{ height: `${bar * 2}px`, backgroundColor: card.accent }}
                      />
                    ))}
                  </div>
                </div>
                <h3 className="mt-4 font-display text-[27px] leading-none text-ink">{card.title}</h3>
                <p className="mt-2 grow text-[11px] leading-relaxed text-[#737D74]">{card.copy}</p>
                <div className="mt-5 flex items-end justify-between border-t border-[#E8E4D8] pt-3">
                  <div>
                    <p className="font-display text-[25px] leading-none text-ink">
                      ±{card.half === 1 / 12 ? "1 месяц" : card.half === 10 ? "10 лет" : "10 000 лет"}
                    </p>
                    <p className="mt-1 text-[9px] text-[#93988C]">
                      шаг {formatStep(card.index.step)} · {formatNumber(card.index.count)} точек
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      changePreset(card.half);
                      scrollTo("overview");
                    }}
                    className="rounded-md border border-[#D5D5C7] px-2.5 py-1.5 text-[9px] font-semibold text-[#506157] transition-colors hover:border-[#A9B3A6] hover:bg-[#F4F2E7]"
                  >
                    Открыть
                  </button>
                </div>
              </article>
            ))}
          </div>
          <div className="mt-3 flex flex-col gap-2 rounded-xl border border-[#E3DFD2] bg-[#EFECDF]/70 px-4 py-3 text-[10px] leading-relaxed text-[#737D74] sm:flex-row sm:items-center sm:justify-between">
            <p>
              <span className="font-semibold text-ink">Бюджет выборки:</span> до {formatNumber(MAX_SAMPLES)} точек на график.
              Шаг подбирается из дискретной лестницы — от 1 минуты до 5 лет.
            </p>
            <button
              type="button"
              onClick={() => scrollTo("model")}
              className="shrink-0 text-left font-semibold text-[#3F6559] underline decoration-[#B9C4B5] underline-offset-2 hover:text-ink"
            >
              Почему это важно →
            </button>
          </div>
        </section>

        <section className="mt-14">
          <SectionHeading
            id="model"
            index="03"
            title={<>Как построена модель</>}
            description="Прозрачная кеплеровская модель на двух интервалах элементов JPL и с линейными вековыми поправками. Её можно воспроизвести по формулам ниже."
          />
          <div className="grid gap-3 lg:grid-cols-12">
            <div className="grid gap-3 lg:col-span-7">
              {[
                {
                  number: "01",
                  tag: "Элементы орбит",
                  title: "JPL / Standish, эпоха J2000",
                  text: "Для каждой планеты берём a, e, i, среднюю долготу L, долготу перигелия ϖ и узел Ω с линейными скоростями на юлианский век. Для 1800–2050 используем таблицу 1 JPL, для −3000…3000 — таблицу 2a с периодической поправкой 2b. Затем решаем уравнение Кеплера E − e sin E = M методом Ньютона и поворачиваем орбиту в эклиптику.",
                  note: "Поправка M + bT² + c·cos(fT) + s·sin(fT) для Юпитера–Нептуна применяется только вне короткой таблицы.",
                },
                {
                  number: "02",
                  tag: "Среднее направление",
                  title: "Циркулярное, а не арифметическое",
                  text: "Складываем единичные векторы sin λ и cos λ, затем находим λ̄ = atan2(Σsin λᵢ, Σcos λᵢ). Так среднее корректно работает на разрыве 0°/360°, а R — длина суммарного вектора — показывает концентрацию направлений.",
                  note: "Отклонение δᵢ = wrap(λᵢ − λ̄) всегда лежит в диапазоне [−180°, 180°).",
                },
                {
                  number: "03",
                  tag: "Дисперсия",
                  title: "Мгновенный разброс по системе",
                  text: "Четыре метрики по одним и тем же отклонениям: σ² и σ — классическая дисперсия и СКО; ½-норма (Σ√|δᵢ|)² — более грубая квадратичная альтернатива; D — евклидово расстояние от среднего положения планет до Солнца в а.е., которое учитывает расстояния, а не только направления.",
                  note: "Переключатель метрик меняет и график, и поиск минимума. «По планетам» доступно для угловых метрик.",
                },
                {
                  number: "04",
                  tag: "Поиск парада",
                  title: "Глобальный скан, затем уточнение",
                  text: "Для окна ±10 000 лет суточный перебор потребовал бы ~7,3 млн восьмипланетных расчётов. Поэтому всё окно просматривается с шагом 30 дней (≈243 тыс. точек), отбираются 40 лучших разделённых моментов, и вокруг каждого локальная сетка сужается в 8 раз на уровень. Победитель уточняется до минут и отмечается на графике.",
                  note: "«Парад» здесь — статистический: сколько выбранных планет попало в ±30° от циркулярного среднего. Это не видимое сближение на небе.",
                },
              ].map((step) => (
                <article key={step.number} className="rounded-[20px] border border-line bg-card p-5">
                  <div className="flex gap-4">
                    <span className="font-mono text-[10px] text-[#A0A294]">{step.number}</span>
                    <div>
                      <p className="text-[8px] font-semibold tracking-[0.14em] text-[#7E9282] uppercase">{step.tag}</p>
                      <h3 className="mt-1.5 font-display text-[23px] leading-tight text-ink">{step.title}</h3>
                      <p className="mt-2 max-w-[640px] text-[11.5px] leading-[1.7] text-[#647065]">{step.text}</p>
                      <p className="mt-2.5 flex items-start gap-2 text-[10px] leading-relaxed text-[#8A9185]">
                        <span className="mt-[5px] h-1 w-1 shrink-0 rounded-full bg-[#A7B4A4]" />
                        {step.note}
                      </p>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            <article className="relative overflow-hidden rounded-[22px] bg-forest p-5 text-[#F6F2E5] lg:col-span-5 lg:p-6">
              <div className="pointer-events-none absolute -top-16 -right-16 h-48 w-48 rounded-full border border-[#F6F2E5]/10" />
              <p className="text-[8px] font-semibold tracking-[0.16em] text-[#C7D78A] uppercase">Математика</p>
              <h3 className="mt-2 max-w-[300px] font-display text-[30px] leading-[1.04] text-[#FBF7E9]">
                Среднее — это вектор,
                <br />
                <span className="italic text-[#E7A477]">а не число.</span>
              </h3>
              <div className="mt-5 space-y-2.5">
                {[
                  ["mean", "λ̄ = atan2(Σ sin λᵢ, Σ cos λᵢ)"],
                  ["delta", "δᵢ = wrap(λᵢ − λ̄)"],
                  ["variance", "σ² = 1/N Σ δᵢ²"],
                  ["half", "‖δ‖½ = (Σ √|δᵢ|)²"],
                  ["distance", "D = ‖1/N Σ rᵢ − r☉‖, r☉ = 0"],
                  ["concentration", "R = 1/N · |Σ e^(iλᵢ)|"],
                ].map(([key, formula]) => (
                  <div key={key} className="rounded-lg border border-[#F6F2E5]/12 bg-[#F6F2E5]/[0.045] px-3 py-2.5">
                    <p className="font-mono text-[11px] leading-relaxed text-[#F5F0E2]/88">{formula}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex justify-center border-t border-[#F6F2E5]/12 pt-3">
                <VectorDiagram snapshot={snapshot} selected={selected} />
              </div>
              <p className="mt-2 text-[9px] leading-relaxed text-[#F6F2E5]/45">
                Обычное среднее углов ошибается на разрыве: 359° и 1° дают 180° вместо 0°.
                Циркулярное среднее решает это через сумму векторов.
              </p>
            </article>
          </div>

          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-[#D9D9C9] bg-[#F0EDDF] p-4">
              <p className="text-[8px] font-semibold tracking-[0.12em] text-[#6F8C6B] uppercase">01 · Короткая таблица</p>
              <p className="mt-1.5 font-display text-[23px] leading-none text-ink">1800 — 2050</p>
              <p className="mt-1.5 text-[10px] leading-relaxed text-[#727C72]">
                Таблица 1 JPL: элементы и скорости, подогнанные для двух с половиной веков. Ошибка по гелиоцентрической долготе от 15″ у Меркурия до 10′ у Сатурна.
              </p>
            </div>
            <div className="rounded-xl border border-[#D9D9C9] bg-[#F0EDDF] p-4">
              <p className="text-[8px] font-semibold tracking-[0.12em] text-[#9A6B47] uppercase">02 · Длинная таблица</p>
              <p className="mt-1.5 font-display text-[21px] leading-none text-ink">−3000 … 3000</p>
              <p className="mt-1.5 text-[10px] leading-relaxed text-[#727C72]">
                Таблица 2a и периодические члены 2b JPL. Именно она используется в ±10 000-летнем графике везде, где момент попадает в этот интервал.
              </p>
            </div>
            <div className="rounded-xl border border-[#D9D9C9] bg-[#F0EDDF] p-4">
              <p className="text-[8px] font-semibold tracking-[0.12em] text-[#9A6B47] uppercase">03 · Точнее на длинной дистанции</p>
              <p className="mt-1.5 font-display text-[23px] leading-none text-ink">VSOP87 / DE441</p>
              <p className="mt-1.5 text-[10px] leading-relaxed text-[#727C72]">
                VSOP87: ~1″ для внутренних планет на ±4 000 лет, для Юпитера и Сатурна — ±2 000, для Урана и Нептуна — ±6 000. DE441 учитывает N-тела и резонансы.
              </p>
            </div>
          </div>
        </section>

        <section className="mt-14">
          <SectionHeading
            id="sources"
            index="04"
            title={<>Источники и допущения</>}
            description="Данные и формулы, по которым собран расчёт. Внешние материалы открываются в новой вкладке."
          />
          <div className="grid gap-3 lg:grid-cols-12">
            <div className="space-y-2 lg:col-span-7">
              {[
                {
                  n: "01",
                  title: "Keplerian Elements for Approximate Positions of the Major Planets",
                  author: "E. M. Standish · JPL Solar System Dynamics",
                  note: "Таблица 1 (1800–2050) и таблицы 2a/2b (−3000…3000) с периодическими поправками. Основа расчёта.",
                  href: "https://ssd.jpl.nasa.gov/planets/approx_pos.html",
                  host: "ssd.jpl.nasa.gov",
                },
                {
                  n: "02",
                  title: "JPL Planetary and Lunar Ephemerides DE440 / DE441",
                  author: "R. S. Park et al. · The Astronomical Journal 161, 105 (2021)",
                  note: "Численная эфемерида с гравитационными взаимодействиями — эталон точности для будущей версии модели.",
                  href: "https://ssd.jpl.nasa.gov/planets/eph_export.html",
                  host: "ssd.jpl.nasa.gov",
                },
                {
                  n: "03",
                  title: "Planetary theories in rectangular and spherical variables: VSOP87 solutions",
                  author: "P. Bretagnon, G. Francou · A&A 202, 309–315 (1988)",
                  note: "Длинные тригонометрические ряды для планетных орбит; ориентир точности ~1″ на своём интервале.",
                  href: "https://ui.adsabs.harvard.edu/abs/1988A%26A...202..309B/abstract",
                  host: "ui.adsabs.harvard.edu",
                },
                {
                  n: "04",
                  title: "Secular evolution of the Solar System over 10 million years",
                  author: "J. Laskar · A&A 198, 341–362 (1988)",
                  note: "Вековая эволюция орбит и ограничения предсказуемости Солнечной системы.",
                  href: "https://ui.adsabs.harvard.edu/abs/1988A%26A...198..341L/abstract",
                  host: "ui.adsabs.harvard.edu",
                },
                {
                  n: "05",
                  title: "Directional Statistics",
                  author: "K. V. Mardia, P. E. Jupp · Wiley (2000)",
                  note: "Циркулярное среднее, средний результирующий вектор R и угловая дисперсия.",
                  href: "https://doi.org/10.1002/9780470316979",
                  host: "doi.org",
                },
              ].map((source) => (
                <a
                  key={source.n}
                  href={source.href}
                  target="_blank"
                  rel="noreferrer"
                  className="group flex items-start gap-4 rounded-xl border border-line bg-card px-4 py-3.5 transition-colors hover:border-[#B7C1B3] hover:bg-[#FCFAF1]"
                >
                  <span className="pt-0.5 font-mono text-[9px] text-[#A1A396]">{source.n}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[12px] font-semibold leading-snug text-ink">{source.title}</span>
                    <span className="mt-0.5 block text-[9.5px] text-[#7C867D]">{source.author}</span>
                    <span className="mt-1 block text-[10px] leading-relaxed text-[#8A9186]">{source.note}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-1.5 pt-0.5 text-[8px] text-[#9A9E91]">
                    <span className="hidden sm:inline">{source.host}</span>
                    <svg viewBox="0 0 12 12" className="h-3 w-3 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" fill="none" aria-hidden="true">
                      <path d="M3 9 9 3M4 3h5v5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                </a>
              ))}
            </div>

            <aside className="rounded-[22px] border border-[#DDD7C7] bg-[#F0EBDD] p-5 lg:col-span-5">
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#E5D7BE] text-[10px] font-bold text-[#935A3B]">!</span>
                <p className="text-[9px] font-semibold tracking-[0.14em] text-[#8F6346] uppercase">Допущения</p>
              </div>
              <h3 className="mt-3 font-display text-[27px] leading-[1.06] text-ink">
                Красивый график
                <br />
                не равен эфемериде.
              </h3>
              <div className="mt-4 space-y-3 border-t border-[#D9D1BF] pt-4">
                {[
                  "Модель кеплеровская: орбиты не взаимодействуют между собой.",
                  "Долготы гелиоцентрические в эклиптике J2000, не геоцентрические координаты.",
                  "Годы — юлианские астрономические; 0 год = 1 год до н. э.",
                  "1800–2050 — таблица 1; −3000…3000 — таблица 2a/2b; дальше результаты помечены как экстраполяция.",
                  "Схема орбит над графиком — качественная и не в масштабе.",
                ].map((item) => (
                  <p key={item} className="flex items-start gap-2 text-[10px] leading-relaxed text-[#6E7569]">
                    <span className="mt-[5px] h-1 w-1 shrink-0 rounded-full bg-[#B88A67]" />
                    {item}
                  </p>
                ))}
              </div>
              <div className="mt-5 rounded-lg border border-[#D6CDBA] bg-[#F8F4E8]/60 px-3 py-3">
                <p className="text-[9px] leading-relaxed text-[#7A7E71]">
                  <span className="font-semibold text-[#5B5F53]">Проверка:</span> при J2000 средняя долгота Земли
                  близка к 100,46°, Марса — к 355,45°, Юпитера — к 34,40°. Это значения средней долготы,
                  а не видимые координаты на небе.
                </p>
              </div>
            </aside>
          </div>
        </section>
      </main>

      <footer className="border-t border-line bg-[#EDEADD]/60">
        <div className="mx-auto flex max-w-[1480px] flex-col gap-5 px-4 py-7 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-10">
          <div className="flex items-center gap-3">
            <OrbitLogo className="h-8 w-8 text-forest" />
            <div>
              <p className="text-[11px] font-bold tracking-[0.16em] text-ink">ОРБИТА</p>
              <p className="mt-0.5 text-[9px] text-[#8C9185]">инструмент визуальной планетарной динамики</p>
            </div>
          </div>
          <p className="max-w-xl text-[9px] leading-relaxed text-[#8C9185]">
            Расчёт в браузере по приближённым элементам JPL. Не является эфемеридой для навигации,
            наблюдений или определения событий. Для точных дат используйте DE440/DE441 или VSOP87.
          </p>
          <div className="flex items-center gap-4 text-[9px] text-[#7E887D]">
            <button type="button" onClick={() => scrollTo("model")} className="hover:text-ink">Методика</button>
            <button type="button" onClick={() => scrollTo("sources")} className="hover:text-ink">Источники</button>
            <button type="button" onClick={() => scrollTo("top")} className="hover:text-ink">Наверх ↑</button>
          </div>
        </div>
      </footer>

      {toast && (
        <div
          role="status"
          className="fixed right-4 bottom-4 z-50 flex max-w-[320px] items-center gap-2.5 rounded-xl border border-[#2E5349] bg-forest px-4 py-3 text-[11px] text-[#F7F3E6] shadow-[0_16px_40px_rgba(20,50,43,0.25)]"
        >
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#C7D78A]" />
          {toast}
        </div>
      )}
    </div>
  );
}

export default App;
