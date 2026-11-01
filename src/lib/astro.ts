/**
 * A deliberately transparent, reproducible orbital model.
 *
 * Heliocentric ecliptic longitudes are evaluated from the JPL/Standish
 * "Keplerian Elements for Approximate Positions of the Major Planets"
 * (J2000 elements + linear rates per Julian century).  Kepler's equation is
 * solved with Newton's method, then the orbit is rotated into the ecliptic.
 *
 * 1800–2050 uses JPL Table 1; −3000…3000 switches to Table 2a plus the
 * periodic Table 2b corrections for the mean anomaly of the outer planets.
 * Beyond those intervals the app keeps working but labels the result as an
 * extrapolation rather than an ephemeris.
 */

export type PlanetKey =
  | "mercury"
  | "venus"
  | "earth"
  | "mars"
  | "jupiter"
  | "saturn"
  | "uranus"
  | "neptune";

export const J2000_YEAR = 2000;
export const DAYS_PER_YEAR = 365.25;
export const MAX_SAMPLES = 8000;

export interface PlanetDefinition {
  key: PlanetKey;
  name: string;
  nameIn: string;
  symbol: string;
  color: string;
  tint: string;
  /** semi-major axis, AU */
  a: number;
  aDot: number;
  e: number;
  eDot: number;
  inclination: number;
  inclinationDot: number;
  /** mean longitude, degrees */
  meanLongitude: number;
  meanLongitudeDot: number;
  /** longitude of perihelion, degrees */
  perihelion: number;
  perihelionDot: number;
  /** longitude of ascending node, degrees */
  node: number;
  nodeDot: number;
}

export const PLANETS: PlanetDefinition[] = [
  {
    key: "mercury",
    name: "Меркурий",
    nameIn: "Меркурия",
    symbol: "☿",
    color: "#B08B5E",
    tint: "#F0E7D8",
    a: 0.38709927,
    aDot: 0.00000037,
    e: 0.20563593,
    eDot: 0.00001906,
    inclination: 7.00497902,
    inclinationDot: -0.00594749,
    meanLongitude: 252.2503235,
    meanLongitudeDot: 149472.67411175,
    perihelion: 77.45779628,
    perihelionDot: 0.16047689,
    node: 48.33076593,
    nodeDot: -0.12534081,
  },
  {
    key: "venus",
    name: "Венера",
    nameIn: "Венеры",
    symbol: "♀",
    color: "#D69B4A",
    tint: "#F8EDD8",
    a: 0.72333566,
    aDot: 0.0000039,
    e: 0.00677672,
    eDot: -0.00004107,
    inclination: 3.39467605,
    inclinationDot: -0.0007889,
    meanLongitude: 181.9790995,
    meanLongitudeDot: 58517.81538729,
    perihelion: 131.60246718,
    perihelionDot: 0.00268329,
    node: 76.67984255,
    nodeDot: -0.27769418,
  },
  {
    key: "earth",
    name: "Земля",
    nameIn: "Земли",
    symbol: "⊕",
    color: "#2F7E6C",
    tint: "#DFEEE8",
    a: 1.00000261,
    aDot: 0.00000562,
    e: 0.01671123,
    eDot: -0.00004392,
    inclination: -0.00001531,
    inclinationDot: -0.01294668,
    meanLongitude: 100.46457166,
    meanLongitudeDot: 35999.37244981,
    perihelion: 102.93768193,
    perihelionDot: 0.32327364,
    node: 0,
    nodeDot: 0,
  },
  {
    key: "mars",
    name: "Марс",
    nameIn: "Марса",
    symbol: "♂",
    color: "#BE6247",
    tint: "#F5E2DA",
    a: 1.52371034,
    aDot: 0.00001847,
    e: 0.0933941,
    eDot: 0.00007882,
    inclination: 1.84969142,
    inclinationDot: -0.00813131,
    meanLongitude: -4.55343205,
    meanLongitudeDot: 19140.30268499,
    perihelion: -23.94362959,
    perihelionDot: 0.44441088,
    node: 49.55953891,
    nodeDot: -0.29257343,
  },
  {
    key: "jupiter",
    name: "Юпитер",
    nameIn: "Юпитера",
    symbol: "♃",
    color: "#A98558",
    tint: "#F1E8DB",
    a: 5.202887,
    aDot: -0.00011607,
    e: 0.04838624,
    eDot: -0.00013253,
    inclination: 1.30439695,
    inclinationDot: -0.00183714,
    meanLongitude: 34.39644051,
    meanLongitudeDot: 3034.74612775,
    perihelion: 14.72847983,
    perihelionDot: 0.21252668,
    node: 100.47390909,
    nodeDot: 0.20469106,
  },
  {
    key: "saturn",
    name: "Сатурн",
    nameIn: "Сатурна",
    symbol: "♄",
    color: "#8A8B60",
    tint: "#ECECD9",
    a: 9.53667594,
    aDot: -0.0012506,
    e: 0.05386179,
    eDot: -0.00050991,
    inclination: 2.48599187,
    inclinationDot: 0.00193609,
    meanLongitude: 49.95424423,
    meanLongitudeDot: 1222.49362201,
    perihelion: 92.59887831,
    perihelionDot: -0.41897216,
    node: 113.66242448,
    nodeDot: -0.28867794,
  },
  {
    key: "uranus",
    name: "Уран",
    nameIn: "Урана",
    symbol: "♅",
    color: "#558D91",
    tint: "#DFECEC",
    a: 19.18916464,
    aDot: -0.00196176,
    e: 0.04725744,
    eDot: -0.00004397,
    inclination: 0.77263783,
    inclinationDot: -0.00242939,
    meanLongitude: 313.23810451,
    meanLongitudeDot: 428.48202785,
    perihelion: 170.9542763,
    perihelionDot: 0.40805281,
    node: 74.01692503,
    nodeDot: 0.04240589,
  },
  {
    key: "neptune",
    name: "Нептун",
    nameIn: "Нептуна",
    symbol: "♆",
    color: "#486B8C",
    tint: "#E1E7EF",
    a: 30.06992276,
    aDot: 0.00026291,
    e: 0.00859048,
    eDot: 0.00005105,
    inclination: 1.77004347,
    inclinationDot: 0.00035372,
    meanLongitude: -55.12002969,
    meanLongitudeDot: 218.45945325,
    perihelion: 44.96476227,
    perihelionDot: -0.32241464,
    node: 131.78422574,
    nodeDot: -0.00508664,
  },
];

export const PLANET_BY_KEY: Record<PlanetKey, PlanetDefinition> = Object.fromEntries(
  PLANETS.map((planet) => [planet.key, planet]),
) as Record<PlanetKey, PlanetDefinition>;

/**
 * JPL Table 2a — the same six elements (value, rate per century) fitted to
 * 3000 BC – 3000 AD.  Order: a, e, i, L, longitude of perihelion, node.
 */
const LONG_RANGE_ELEMENTS: Record<PlanetKey, [number, number][]> = {
  mercury: [
    [0.38709843, 0],
    [0.20563661, 0.00002123],
    [7.00559432, -0.00590158],
    [252.25166724, 149472.67486623],
    [77.45771895, 0.15940013],
    [48.33961819, -0.12214182],
  ],
  venus: [
    [0.72332102, -0.00000026],
    [0.00676399, -0.00005107],
    [3.39777545, 0.00043494],
    [181.9797085, 58517.8156026],
    [131.76755713, 0.05679648],
    [76.67261496, -0.27274174],
  ],
  earth: [
    [1.00000018, -0.00000003],
    [0.01673163, -0.00003661],
    [-0.00054346, -0.01337178],
    [100.46691572, 35999.37306329],
    [102.93005885, 0.3179526],
    [-5.11260389, -0.24123856],
  ],
  mars: [
    [1.52371243, 0.00000097],
    [0.09336511, 0.00009149],
    [1.85181869, -0.00724757],
    [-4.56813164, 19140.29934243],
    [-23.91744784, 0.45223625],
    [49.71320984, -0.26852431],
  ],
  jupiter: [
    [5.20248019, -0.00002864],
    [0.0485359, 0.00018026],
    [1.29861416, -0.00322699],
    [34.33479152, 3034.90371757],
    [14.27495244, 0.18199196],
    [100.29282654, 0.13024619],
  ],
  saturn: [
    [9.54149883, -0.00003065],
    [0.05550825, -0.00032044],
    [2.49424102, 0.00451969],
    [50.07571329, 1222.11494724],
    [92.86136063, 0.54179478],
    [113.63998702, -0.25015002],
  ],
  uranus: [
    [19.18797948, -0.00020455],
    [0.0468574, -0.0000155],
    [0.77298127, -0.00180155],
    [314.20276625, 428.49512595],
    [172.43404441, 0.09266985],
    [73.96250215, 0.05739699],
  ],
  neptune: [
    [30.06952752, 0.00006447],
    [0.00895439, 0.00000818],
    [1.7700552, 0.000224],
    [304.22289287, 218.46515314],
    [46.68158724, 0.01009938],
    [131.78635853, -0.00606302],
  ],
};

/** JPL Table 2b — periodic correction to the mean anomaly for the outer planets. */
const MEAN_ANOMALY_TERMS: Partial<
  Record<PlanetKey, { b: number; c: number; s: number; f: number }>
> = {
  jupiter: { b: -0.00012452, c: 0.0606406, s: -0.35635438, f: 38.35125 },
  saturn: { b: 0.00025899, c: -0.13434469, s: 0.87320147, f: 38.35125 },
  uranus: { b: 0.00058331, c: -0.97731848, s: 0.17689245, f: 7.67025 },
  neptune: { b: -0.00041348, c: 0.68346318, s: -0.10162547, f: 7.67025 },
};

export type ModelBand = "table1" | "table2" | "extrapolated";

export function modelBandForWindow(centerYear: number, halfSpanYears: number): ModelBand {
  const start = centerYear - halfSpanYears;
  const end = centerYear + halfSpanYears;
  if (start >= 1800 && end <= 2050) return "table1";
  // Astronomical years are used throughout: 0 = 1 BC, so −3000 = 3001 BC.
  if (start >= -3000 && end <= 3000) return "table2";
  return "extrapolated";
}

export const MODEL_BAND_COPY: Record<ModelBand, { title: string; note: string }> = {
  table1: {
    title: "элементы JPL · 1800–2050",
    note: "Окно целиком внутри паспортного интервала точных кеплеровских элементов JPL (таблица 1).",
  },
  table2: {
    title: "элементы JPL · −3000…3000",
    note: "Окно использует длинную таблицу 2a/2b JPL для 3000 г. до н. э. — 3000 г. н. э.",
  },
  extrapolated: {
    title: "экстраполяция",
    note: "Часть окна лежит за пределами обеих таблиц JPL и является качественной экстраполяцией.",
  },
};

export const normalizeDegrees = (value: number) => ((value % 360) + 360) % 360;

export const wrapDegrees = (value: number) => {
  let result = value % 360;
  if (result >= 180) result -= 360;
  if (result < -180) result += 360;
  return result;
};

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
const toDegrees = (radians: number) => (radians * 180) / Math.PI;

/** Newton iteration for E - e sin E = M. Returns eccentric anomaly (radians). */
function solveKepler(meanAnomaly: number, eccentricity: number) {
  let E = eccentricity < 0.8 ? meanAnomaly + eccentricity * Math.sin(meanAnomaly) : Math.PI;
  for (let iteration = 0; iteration < 8; iteration += 1) {
    const delta =
      (E - eccentricity * Math.sin(E) - meanAnomaly) /
      (1 - eccentricity * Math.cos(E));
    E -= delta;
    if (Math.abs(delta) < 1e-11) break;
  }
  return E;
}

/**
 * Heliocentric ecliptic longitude of date-independent J2000 frame, in degrees.
 * `year` is a Julian year (2000.0 = J2000.0).
 */
export function planetLongitude(planet: PlanetDefinition, year: number) {
  const T = (year - J2000_YEAR) / 100; // Julian centuries
  const useShortTable = year >= 1800 && year <= 2050;
  const long = LONG_RANGE_ELEMENTS[planet.key];
  const a = Math.max(0.05, useShortTable ? planet.a + planet.aDot * T : long[0][0] + long[0][1] * T);
  const e = Math.min(
    0.95,
    Math.max(0, useShortTable ? planet.e + planet.eDot * T : long[1][0] + long[1][1] * T),
  );
  const inclination = toRadians(
    useShortTable ? planet.inclination + planet.inclinationDot * T : long[2][0] + long[2][1] * T,
  );
  const meanLongitude = useShortTable
    ? planet.meanLongitude + planet.meanLongitudeDot * T
    : long[3][0] + long[3][1] * T;
  const perihelion = useShortTable
    ? planet.perihelion + planet.perihelionDot * T
    : long[4][0] + long[4][1] * T;
  const node = toRadians(
    useShortTable ? planet.node + planet.nodeDot * T : long[5][0] + long[5][1] * T,
  );
  const argument = toRadians(perihelion) - node;
  let meanAnomalyDegrees = normalizeDegrees(meanLongitude - perihelion);
  const periodic = MEAN_ANOMALY_TERMS[planet.key];
  if (!useShortTable && periodic) {
    const phase = toRadians(periodic.f * T);
    meanAnomalyDegrees = normalizeDegrees(
      meanLongitude -
        perihelion +
        periodic.b * T * T +
        periodic.c * Math.cos(phase) +
        periodic.s * Math.sin(phase),
    );
  }
  const meanAnomaly = toRadians(meanAnomalyDegrees);

  const E = solveKepler(meanAnomaly, e);
  const xOrbital = a * (Math.cos(E) - e);
  const yOrbital = a * Math.sqrt(1 - e * e) * Math.sin(E);

  const cosArgument = Math.cos(argument);
  const sinArgument = Math.sin(argument);
  const cosNode = Math.cos(node);
  const sinNode = Math.sin(node);
  const cosI = Math.cos(inclination);

  const x =
    (cosArgument * cosNode - sinArgument * sinNode * cosI) * xOrbital +
    (-sinArgument * cosNode - cosArgument * sinNode * cosI) * yOrbital;
  const y =
    (cosArgument * sinNode + sinArgument * cosNode * cosI) * xOrbital +
    (-sinArgument * sinNode + cosArgument * cosNode * cosI) * yOrbital;

  const sinI = Math.sin(inclination);
  const z = sinArgument * sinI * xOrbital + cosArgument * sinI * yOrbital;

  return {
    longitude: normalizeDegrees(toDegrees(Math.atan2(y, x))),
    /** heliocentric ecliptic position, AU (Sun at the origin) */
    position: [x, y, z] as [number, number, number],
    eccentricity: e,
    semiMajorAxis: a,
  };
}

export interface Sample {
  year: number;
  /** circular mean of the selected heliocentric longitudes */
  meanAngle: number;
  /** mean of squared wrapped angular deviations, deg² */
  variance: number;
  /** root of `variance`, deg */
  rms: number;
  /** ½-norm (Σ√|δᵢ|)² over the selected planets, deg */
  half: number;
  /** Euclidean distance between the mean position vector of the selected planets and the Sun, AU */
  barycenterDistance: number;
  /** length of the mean resultant vector, 0…1 */
  concentration: number;
  /** heliocentric longitudes for every planet, in PLANETS order */
  longitudes: number[];
  /** wrapped deviations from the selected mean, in PLANETS order */
  deviations: number[];
}

export interface Series {
  samples: Sample[];
  stepYears: number;
  windowYears: number;
  meanConcentration: number;
  meanAngle: number;
}

/** A resolution ladder keeps the SVG light while preserving visible detail. */
const STEP_LADDER_DAYS = [
  1 / (24 * 60), // 1 minute
  1 / 96, // 15 minutes
  1 / 24, // 1 hour
  0.25, // 6 hours
  1, // 1 day
  7, // 1 week
  10, // 10 days
  30.4375, // 1 month
  91.3125, // a quarter
  182.625, // half a year
  365.25, // 1 year
  1826.25, // 5 years
];

export function autoStepYears(halfSpanYears: number) {
  const spanDays = Math.max(1e-9, halfSpanYears * 2 * DAYS_PER_YEAR);
  const minimumStep = spanDays / MAX_SAMPLES;
  const candidate =
    STEP_LADDER_DAYS.find((step) => step >= minimumStep) ??
    STEP_LADDER_DAYS[STEP_LADDER_DAYS.length - 1];
  return candidate / DAYS_PER_YEAR;
}

export interface GenerateOptions {
  centerYear: number;
  halfSpanYears: number;
  selected: PlanetKey[];
}

/** Heliocentric position of the Sun — the origin of the coordinate system. */
const SUN_POSITION: [number, number, number] = [0, 0, 0];

function buildSample(year: number, selectedIndices: number[]): Sample {
  const states = PLANETS.map((planet) => planetLongitude(planet, year));
  const longitudes = states.map((state) => state.longitude);
  let sinSum = 0;
  let cosSum = 0;
  let halfRoot = 0;
  let positionX = 0;
  let positionY = 0;
  let positionZ = 0;
  for (const index of selectedIndices) {
    const angle = toRadians(longitudes[index]);
    sinSum += Math.sin(angle);
    cosSum += Math.cos(angle);
    const [x, y, z] = states[index].position;
    positionX += x;
    positionY += y;
    positionZ += z;
  }
  const n = Math.max(1, selectedIndices.length);
  const meanAngle = normalizeDegrees(toDegrees(Math.atan2(sinSum, cosSum)));
  const concentration = Math.min(1, Math.hypot(sinSum, cosSum) / n);
  const deviations = longitudes.map((longitude) => wrapDegrees(longitude - meanAngle));
  let squaredSum = 0;
  for (const index of selectedIndices) {
    squaredSum += deviations[index] * deviations[index];
    halfRoot += Math.sqrt(Math.abs(deviations[index]));
  }
  const variance = squaredSum / n;
  // D = ‖(1/N) Σ rᵢ − r☉‖ in AU
  const barycenterDistance = Math.hypot(
    positionX / n - SUN_POSITION[0],
    positionY / n - SUN_POSITION[1],
    positionZ / n - SUN_POSITION[2],
  );
  return {
    year,
    meanAngle,
    variance,
    rms: Math.sqrt(variance),
    half: halfRoot * halfRoot,
    barycenterDistance,
    concentration,
    longitudes,
    deviations,
  };
}

/** Exact system snapshot for an arbitrary moment — not snapped to the chart grid. */
export function sampleAtYear(year: number, selected: PlanetKey[]) {
  const selectedSet = new Set(selected);
  const selectedIndices = PLANETS.map((planet, index) => ({ planet, index }))
    .filter(({ planet }) => selectedSet.has(planet.key))
    .map(({ index }) => index);
  return buildSample(year, selectedIndices);
}

export function generateSeries({
  centerYear,
  halfSpanYears,
  selected,
}: GenerateOptions): Series {
  const spanYears = halfSpanYears * 2;
  let stepYears = autoStepYears(halfSpanYears);
  if (spanYears / stepYears + 1 > MAX_SAMPLES) {
    stepYears = spanYears / (MAX_SAMPLES - 1);
  }
  const count = Math.max(2, Math.min(MAX_SAMPLES, Math.floor(spanYears / stepYears) + 1));
  const actualStep = spanYears / (count - 1);
  const start = centerYear - halfSpanYears;
  const selectedSet = new Set(selected);
  const selectedIndices = PLANETS.map((planet, index) => ({ planet, index }))
    .filter(({ planet }) => selectedSet.has(planet.key))
    .map(({ index }) => index);

  const samples: Sample[] = [];
  let sumConcentration = 0;
  let sumSin = 0;
  let sumCos = 0;
  for (let i = 0; i < count; i += 1) {
    const sample = buildSample(start + actualStep * i, selectedIndices);
    samples.push(sample);
    sumConcentration += sample.concentration;
    sumSin += Math.sin(toRadians(sample.meanAngle));
    sumCos += Math.cos(toRadians(sample.meanAngle));
  }

  return {
    samples,
    stepYears: actualStep,
    windowYears: spanYears,
    meanConcentration: sumConcentration / samples.length,
    meanAngle: normalizeDegrees(toDegrees(Math.atan2(sumSin, sumCos))),
  };
}

/* ------------------------------------------------------------------ */
/* Metrics                                                             */
/* ------------------------------------------------------------------ */

export type MetricId = "variance" | "rms" | "half" | "barycenter";

export interface MetricDef {
  id: MetricId;
  /** label on the switch */
  short: string;
  /** symbol used in headings */
  symbol: string;
  /** long name */
  title: string;
  /** name of the minimum-search result */
  minTitle: string;
  unit: string;
  decimals: number;
  /** whether the metric decomposes into per-planet angular terms */
  angular: boolean;
  formula: string;
  description: string;
}

export const METRICS: MetricDef[] = [
  {
    id: "variance",
    short: "σ²",
    symbol: "σ²",
    title: "Дисперсия углов",
    minTitle: "День наименьшей дисперсии",
    unit: "град²",
    decimals: 0,
    angular: true,
    formula: "σ² = (1/N) Σ δᵢ²",
    description:
      "Среднее квадратов угловых отклонений выбранных планет от циркулярного среднего направления.",
  },
  {
    id: "rms",
    short: "σ",
    symbol: "σ",
    title: "Среднеквадратичное отклонение",
    minTitle: "День наименьшего СКО",
    unit: "град",
    decimals: 1,
    angular: true,
    formula: "σ = √((1/N) Σ δᵢ²)",
    description: "Корень из дисперсии: типичный угловой разброс в градусах.",
  },
  {
    id: "half",
    short: "½-норма",
    symbol: "‖δ‖½",
    title: "½-норма отклонений",
    minTitle: "День наименьшей ½-нормы",
    unit: "град",
    decimals: 0,
    angular: true,
    formula: "‖δ‖½ = (Σ √|δᵢ|)²",
    description:
      "Квазинорма порядка ½. Сильнее реагирует на малые отклонения, чем σ², и растёт с числом планет: без деления на N её значения сравнимы только при одинаковом составе системы.",
  },
  {
    id: "barycenter",
    short: "D, а.е.",
    symbol: "D",
    title: "Смещение среднего положения от Солнца",
    minTitle: "День наибольшей близости среднего к Солнцу",
    unit: "а.е.",
    decimals: 2,
    angular: false,
    formula: "D = ‖(1/N) Σ rᵢ − r☉‖, r☉ = 0",
    description:
      "Евклидова норма между средним вектором положения выбранных планет и вектором Солнца. Гелиоцентрические координаты помещают Солнце в начало, поэтому D — длина среднего радиус-вектора в а.е. Учитывает расстояния, а не только направления, поэтому отличается от R.",
  },
];

export const METRIC_BY_ID: Record<MetricId, MetricDef> = Object.fromEntries(
  METRICS.map((metric) => [metric.id, metric]),
) as Record<MetricId, MetricDef>;

export function metricValue(sample: Sample, metric: MetricId): number {
  switch (metric) {
    case "variance":
      return sample.variance;
    case "rms":
      return sample.rms;
    case "half":
      return sample.half;
    case "barycenter":
      return sample.barycenterDistance;
  }
}

/**
 * Per-planet term for the decomposed angular metrics: the squares/sums of these
 * terms reproduce the metric.  Returns 0 for non-angular metrics.
 */
export function planetTerm(sample: Sample, index: number, metric: MetricId): number {
  const absolute = Math.abs(sample.deviations[index] ?? 0);
  switch (metric) {
    case "variance":
      return absolute * absolute;
    case "half":
      return Math.sqrt(absolute);
    case "rms":
      return absolute;
    default:
      return 0;
  }
}

export interface MetricSummary {
  mean: number;
  max: number;
  maxYear: number;
  min: number;
  minYear: number;
}

export function summarizeSeries(series: Series, metric: MetricId): MetricSummary {
  let sum = 0;
  let max = Number.NEGATIVE_INFINITY;
  let min = Number.POSITIVE_INFINITY;
  let maxYear = series.samples[0]?.year ?? 0;
  let minYear = maxYear;
  for (const sample of series.samples) {
    const value = metricValue(sample, metric);
    sum += value;
    if (value > max) {
      max = value;
      maxYear = sample.year;
    }
    if (value < min) {
      min = value;
      minYear = sample.year;
    }
  }
  const count = Math.max(1, series.samples.length);
  return {
    mean: sum / count,
    max: Number.isFinite(max) ? max : 0,
    maxYear,
    min: Number.isFinite(min) ? min : 0,
    minYear,
  };
}

export interface DispersionMinimum {
  year: number;
  metric: MetricId;
  /** value of the optimised metric at this moment */
  value: number;
  variance: number;
  rms: number;
  concentration: number;
  meanAngle: number;
  sample: Sample;
  /** number of selected planets within 30° of the mean direction */
  within30: number;
  /** number of selected planets within 60° of the mean direction */
  within60: number;
  /** resolution of the finest search level, years */
  resolutionYears: number;
  /** step of the whole-window coarse scan, years */
  scanStepYears: number;
  alternatives: DispersionMinimum[];
}

/** Number of selected planets whose |deviation| is within a threshold. */
function alignmentCounts(sample: Sample, selectedSet: Set<PlanetKey>) {
  let within30 = 0;
  let within60 = 0;
  for (let index = 0; index < PLANETS.length; index += 1) {
    if (!selectedSet.has(PLANETS[index].key)) continue;
    const absolute = Math.abs(sample.deviations[index]);
    if (absolute <= 30) within30 += 1;
    if (absolute <= 60) within60 += 1;
  }
  return { within30, within60 };
}

function evaluateMoment(year: number, selected: PlanetKey[], metric: MetricId): DispersionMinimum {
  const sample = sampleAtYear(year, selected);
  const counts = alignmentCounts(sample, new Set(selected));
  return {
    year,
    metric,
    value: metricValue(sample, metric),
    variance: sample.variance,
    rms: sample.rms,
    concentration: sample.concentration,
    meanAngle: sample.meanAngle,
    sample,
    within30: counts.within30,
    within60: counts.within60,
    resolutionYears: 0,
    scanStepYears: 0,
    alternatives: [],
  };
}

/** Shrink a local grid around a promising seed until the resolution is minutes. */
function refineSeed(
  seedYear: number,
  radiusDays: number,
  levels: number,
  gridPoints: number,
  selected: PlanetKey[],
  metric: MetricId,
) {
  let radius = radiusDays / DAYS_PER_YEAR;
  let best = evaluateMoment(seedYear, selected, metric);
  let resolution = (radius * 2) / gridPoints;
  for (let level = 0; level < levels; level += 1) {
    const center = best.year;
    for (let step = 0; step <= gridPoints; step += 1) {
      const year = center - radius + (2 * radius * step) / gridPoints;
      const candidate = evaluateMoment(year, selected, metric);
      if (candidate.value < best.value) best = candidate;
    }
    resolution = (radius * 2) / gridPoints;
    radius /= 8;
  }
  return { ...best, resolutionYears: resolution };
}

function assembleMinimum(
  refined: DispersionMinimum[],
  selected: PlanetKey[],
  maxAlternatives: number,
  selectionYears: number,
): DispersionMinimum | null {
  refined.sort((a, b) => a.value - b.value);
  const distinct: DispersionMinimum[] = [];
  const separation = Math.max(selectionYears, 2);
  for (const candidate of refined) {
    if (distinct.every((item) => Math.abs(item.year - candidate.year) > separation)) {
      distinct.push(candidate);
    }
  }
  if (!distinct.length) return null;
  const top = distinct.slice(0, Math.max(1, maxAlternatives + 1));
  const [best, ...alternatives] = top;
  const count = selected.length || 1;
  return { ...best, within30: Math.min(count, best.within30), alternatives };
}

export interface MinimumSearchOptions {
  onProgress?: (fraction: number, phase: "scan" | "refine") => void;
  isCancelled?: () => boolean;
  chunkSize?: number;
}

/**
 * Cooperative (non-blocking) search for the moment where the chosen metric is
 * smallest: the closest the selected planets come to a "parade" in the sense of
 * that metric.
 *
 * A day-by-day scan of ±10 000 years would need ~7.3 million evaluations of
 * eight orbits.  Instead the whole window is scanned with a span-dependent
 * step (30 days for ±10 000 y, 1 day for ±100 y), keeping only the 72 lowest
 * values; the 40 best time-separated seeds are then refined by shrinking a
 * local grid eight-fold per level down to minute resolution.  Work is yielded
 * to the browser in chunks so the interface stays responsive.
 */
export async function findMinimumDispersionAsync(
  series: Series,
  selected: PlanetKey[],
  metric: MetricId,
  options: MinimumSearchOptions = {},
  maxAlternatives = 3,
): Promise<DispersionMinimum | null> {
  const { samples, stepYears } = series;
  if (!samples.length) return null;
  const start = samples[0].year;
  const end = samples[samples.length - 1].year;
  const span = Math.max(stepYears, end - start);
  const spanDays = span * DAYS_PER_YEAR;
  const { onProgress, isCancelled, chunkSize = 6500 } = options;
  const yieldToBrowser = () =>
    new Promise<void>((resolve) => window.setTimeout(resolve, 0));

  let scanDays: number;
  if (spanDays > 4000 * DAYS_PER_YEAR) scanDays = 30;
  else if (spanDays > 400 * DAYS_PER_YEAR) scanDays = 4;
  else if (spanDays > 40 * DAYS_PER_YEAR) scanDays = 1;
  else if (spanDays > 4 * DAYS_PER_YEAR) scanDays = 0.25;
  else scanDays = Math.max(1 / 24, stepYears * DAYS_PER_YEAR);
  const scanStep = scanDays / DAYS_PER_YEAR;
  const total = Math.max(1, Math.ceil(span / scanStep));

  let ranked: { year: number; value: number }[] = [];
  let evaluated = 0;
  for (let index = 0; index <= total; index += 1) {
    const year = start + index * scanStep;
    ranked.push({ year, value: metricValue(sampleAtYear(year, selected), metric) });
    evaluated += 1;
    if (evaluated % chunkSize === 0) {
      onProgress?.((evaluated / total) * 0.8, "scan");
      ranked.sort((a, b) => a.value - b.value);
      ranked = ranked.slice(0, 72);
      await yieldToBrowser();
      if (isCancelled?.()) return null;
    }
  }

  ranked.sort((a, b) => a.value - b.value);
  const seeds: number[] = [];
  for (const candidate of ranked) {
    if (seeds.every((year) => Math.abs(year - candidate.year) > scanStep * 1.6)) {
      seeds.push(candidate.year);
    }
    if (seeds.length >= 40) break;
  }

  const levels = scanDays > 1 ? 5 : 6;
  const refined: DispersionMinimum[] = [];
  for (let index = 0; index < seeds.length; index += 1) {
    refined.push(refineSeed(seeds[index], scanDays * 1.15, levels, 36, selected, metric));
    onProgress?.(0.8 + (index / seeds.length) * 0.2, "refine");
    await yieldToBrowser();
    if (isCancelled?.()) return null;
  }

  const result = assembleMinimum(refined, selected, maxAlternatives, scanStep * 1.3);
  onProgress?.(1, "refine");
  return result ? { ...result, scanStepYears: scanStep } : null;
}

const MONTHS_GENITIVE = [
  "января",
  "февраля",
  "марта",
  "апреля",
  "мая",
  "июня",
  "июля",
  "августа",
  "сентября",
  "октября",
  "ноября",
  "декабря",
];

/** Calendar moment (proleptic Gregorian) with hours and minutes, UTC. */
export function formatMoment(year: number) {
  const date = decimalYearToDate(year);
  const hours = String(date.getUTCHours()).padStart(2, "0");
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");
  const calendarYear = date.getUTCFullYear();
  const label =
    calendarYear <= 0
      ? `${integerFormatter.format(1 - calendarYear)} г. до н. э.`
      : `${integerFormatter.format(calendarYear)} г.`;
  return `${date.getUTCDate()} ${MONTHS_GENITIVE[date.getUTCMonth()]} ${label}, ${hours}:${minutes} UTC`;
}

export const PRESETS = [
  { id: "full", label: "±10 000 лет", short: "10 тыс.", halfSpan: 10_000 },
  { id: "millennium", label: "±1 000 лет", short: "1000", halfSpan: 1_000 },
  { id: "century", label: "±100 лет", short: "100", halfSpan: 100 },
  { id: "decade", label: "±10 лет", short: "10", halfSpan: 10 },
  { id: "year", label: "±1 год", short: "1 год", halfSpan: 1 },
  { id: "month", label: "±1 месяц", short: "1 мес.", halfSpan: 1 / 12 },
] as const;

export type PresetId = (typeof PRESETS)[number]["id"];

export function formatStep(years: number) {
  const days = Math.abs(years) * DAYS_PER_YEAR;
  if (days >= 365.25 * 2) {
    const value = days / 365.25;
    return `${formatNumber(value, value < 10 ? 1 : 0)} г.`;
  }
  if (days >= 10) return `${formatNumber(days, 0)} дней`;
  if (days >= 2) return `${formatNumber(days, 0)} дня`;
  if (days >= 1) return "1 день";
  const hours = days * 24;
  if (hours >= 1.5) return `${formatNumber(hours, 0)} ч`;
  if (hours >= 1) return "1 час";
  const minutes = hours * 60;
  if (minutes >= 1.5) return `${formatNumber(minutes, 0)} мин`;
  return "1 мин";
}

const integerFormatter = new Intl.NumberFormat("ru-RU", {
  maximumFractionDigits: 0,
});
const decimalFormatter = new Intl.NumberFormat("ru-RU", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

export function formatNumber(value: number, digits = 0) {
  if (!Number.isFinite(value)) return "—";
  return digits > 0 ? decimalFormatter.format(value) : integerFormatter.format(value);
}

export function formatCompact(value: number) {
  if (!Number.isFinite(value)) return "—";
  if (Math.abs(value) >= 100_000) return `${decimalFormatter.format(value / 1000)} тыс.`;
  if (Math.abs(value) >= 10_000) return `${integerFormatter.format(value)}`;
  return `${integerFormatter.format(value)}`;
}

export function formatSigned(value: number, digits = 1) {
  if (!Number.isFinite(value)) return "—";
  const rounded = Number(value.toFixed(digits));
  const prefix = rounded > 0 ? "+" : rounded < 0 ? "−" : "";
  const absolute = Math.abs(rounded);
  return `${prefix}${digits > 0 ? decimalFormatter.format(absolute) : integerFormatter.format(absolute)}`;
}

export function formatAngle(value: number, digits = 1) {
  return `${value.toFixed(digits).replace("-", "−")}°`;
}

export function formatYear(year: number) {
  const rounded = Math.trunc(year);
  if (rounded < 0) return `−${integerFormatter.format(Math.abs(rounded))}`;
  return integerFormatter.format(rounded);
}

const MONTHS_SHORT = [
  "янв",
  "фев",
  "мар",
  "апр",
  "мая",
  "июн",
  "июл",
  "авг",
  "сен",
  "окт",
  "ноя",
  "дек",
];

export function decimalYearToDate(year: number) {
  const wholeYear = Math.floor(year);
  const fraction = year - wholeYear;
  const date = new Date(0);
  date.setUTCFullYear(wholeYear, 0, 1);
  date.setUTCHours(0, 0, 0, 0);
  const isLeap = (wholeYear % 4 === 0 && wholeYear % 100 !== 0) || wholeYear % 400 === 0;
  date.setTime(date.getTime() + fraction * (isLeap ? 366 : 365) * 86_400_000);
  return date;
}

export function formatYearTick(year: number, spanYears: number, compact = false) {
  if (spanYears > 40) return formatYear(year);
  const date = decimalYearToDate(year);
  if (spanYears > 2) {
    return compact
      ? MONTHS_SHORT[date.getUTCMonth()]
      : `${MONTHS_SHORT[date.getUTCMonth()]} ${formatYear(date.getUTCFullYear())}`;
  }
  return compact
    ? `${date.getUTCDate()} ${MONTHS_SHORT[date.getUTCMonth()]}`
    : `${date.getUTCDate()} ${MONTHS_SHORT[date.getUTCMonth()]} ${formatYear(date.getUTCFullYear())}`;
}

export function formatEpoch(year: number, spanYears: number) {
  if (spanYears > 30) return `${formatYear(year)} г.`;
  const date = decimalYearToDate(year);
  return `${date.getUTCDate()} ${MONTHS_SHORT[date.getUTCMonth()]} ${formatYear(
    date.getUTCFullYear(),
  )} г.`;
}

export function formatEpochFull(year: number) {
  const date = decimalYearToDate(year);
  const months = [
    "января",
    "февраля",
    "марта",
    "апреля",
    "мая",
    "июня",
    "июля",
    "августа",
    "сентября",
    "октября",
    "ноября",
    "декабря",
  ];
  if (year < 1) {
    return `${formatYear(year)} г. (астр.)`;
  }
  return `${date.getUTCDate()} ${months[date.getUTCMonth()]} ${date.getUTCFullYear()} г.`;
}

export function clampWindow(centerYear: number, halfSpanYears: number) {
  const minCenter = -10_000 + halfSpanYears;
  const maxCenter = 10_000 - halfSpanYears;
  if (minCenter > maxCenter) return { centerYear: 0, halfSpanYears: 10_000 };
  return {
    centerYear: Math.min(maxCenter, Math.max(minCenter, centerYear)),
    halfSpanYears,
  };
}

export function makeCsv(series: Series, selected: PlanetKey[], metric: MetricId = "variance") {
  const selectedLabels = PLANETS.filter((planet) => selected.includes(planet.key)).map(
    (planet) => planet.name,
  );
  const header = [
    "year_julian",
    "variance_deg2",
    "rms_deg",
    "half_norm_deg",
    "barycenter_distance_au",
    "concentration_R",
    "mean_angle_deg",
    ...PLANETS.flatMap((planet) => [`${planet.key}_longitude_deg`, `${planet.key}_deviation_deg`]),
  ];
  const rows = series.samples.map((sample) =>
    [
      sample.year.toFixed(6),
      sample.variance.toFixed(4),
      sample.rms.toFixed(4),
      sample.half.toFixed(4),
      sample.barycenterDistance.toFixed(6),
      sample.concentration.toFixed(6),
      sample.meanAngle.toFixed(4),
      ...PLANETS.flatMap((_, index) => [
        sample.longitudes[index].toFixed(4),
        sample.deviations[index].toFixed(4),
      ]),
    ].join(","),
  );
  const active = METRIC_BY_ID[metric];
  const metadata = [
    `# Орбита — метрики углового разброса планет`,
    `# Метрика графика: ${active.title}, ${active.formula}`,
    `# Выбранные планеты: ${selectedLabels.join(", ")}`,
    `# Модель: JPL Standish J2000; таблица 1 для 1800–2050, таблица 2a/2b для −3000…3000`,
    `# За пределами −3000…3000 — качественная экстраполяция`,
    `# δ = wrap(λ − циркулярное среднее), градусы; σ² = mean(δ²)`,
    `# ½-норма = (Σ√|δᵢ|)², град, без деления на N`,
    `# D = |(1/N)Σrᵢ − r☉|, а.е., r☉ = 0 (Солнце в начале гелиоцентрических координат)`,
    `# Шаг: ${formatStep(series.stepYears)}; точек: ${series.samples.length}`,
  ];
  return [...metadata, header.join(","), ...rows].join("\n");
}
