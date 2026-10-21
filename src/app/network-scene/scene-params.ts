export type NetworkPoint = Readonly<{ x: number; y: number }>;

export type NetworkRange = readonly [number, number];

/** Copy of one chapter label: a dim steady title plus two decoded lines. */
export type NetworkChapterLabel = Readonly<{
  detail: string;
  headline: string;
  title: string;
  /** Chapter percentage where the scramble starts and where the last character locks. */
  window: NetworkRange;
}>;

export type NetworkSceneParams = Readonly<{
  cameraZoom: number;
  chapterAccent: string;
  /** Shot percentages where the Distributed and Testing chapters begin. */
  chapterCuts: NetworkRange;
  decodeGlyphs: string;
  decodeRate: number;
  dotOpacity: number;
  dotSize: number;
  failoverLabel: NetworkChapterLabel;
  failoverReplicas: number;
  /** Chapter percentages where the node fails and where the replica set is elected. */
  failoverWindow: NetworkRange;
  hubSize: number;
  hubTravel: number;
  labelTitleOpacity: number;
  lowerHubAnchor: NetworkPoint;
  lowerHubColor: string;
  searchLabel: NetworkChapterLabel;
  searchPathWidth: number;
  searchTreeOpacity: number;
  /** Chapter percentages where the search frontier starts and reaches the goal. */
  searchWindow: NetworkRange;
  spokeCount: number;
  spokeOpacity: number;
  spokeWidth: number;
  squareColor: string;
  squareDensity: number;
  squareFalloff: number;
  squareSize: readonly [number, number];
  squareSpacing: number;
  sweepFailRate: number;
  sweepLabel: NetworkChapterLabel;
  sweepTrail: number;
  /** Chapter percentages where the scan line enters and leaves the frame. */
  sweepWindow: NetworkRange;
  upperHubAnchor: NetworkPoint;
  upperHubColor: string;
}>;

const range = (lower: number, upper: number) => Object.freeze([lower, upper]) as NetworkRange;

/** Schema defaults shared by the schema, renderer fallbacks, and tests. */
export const networkSceneDefaults = Object.freeze({
  background: "#000000",
  cameraZoom: 1.45,
  chapterAccent: "#DAFB33",
  chapterCuts: range(33.5, 67),
  decodeGlyphs: "@&%#$*+=?!/<>0123456789",
  decodeRate: 24,
  dotOpacity: 18,
  dotSize: 2,
  failoverDetail: "leader elected · quorum {replicas}/{replicas}",
  failoverHeadline: "orders-svc node-07 unreachable",
  failoverLabelWindow: range(12, 60),
  failoverReplicas: 3,
  failoverTitle: "02 · distributed",
  failoverWindow: range(12, 40),
  hubSize: 24,
  hubTravel: 260,
  labelTitleOpacity: 35,
  lowerHubAnchor: Object.freeze({ x: 0.02, y: 0.34 }),
  lowerHubColor: "#DAFB33",
  searchDetail: "visited {visited} · cost {cost}",
  searchHeadline: "dijkstra · api-gateway -> orders-db",
  searchLabelWindow: range(8, 55),
  searchPathWidth: 2,
  searchTitle: "01 · algorithm",
  searchTreeOpacity: 35,
  searchWindow: range(5, 70),
  spokeCount: 12,
  spokeOpacity: 85,
  spokeWidth: 1,
  squareColor: "#FFFFFF",
  squareDensity: 55,
  squareFalloff: 200,
  squareSize: Object.freeze([1.5, 26]) as readonly [number, number],
  squareSpacing: 60,
  sweepDetail: "coverage {coverage}%",
  sweepFailRate: 3,
  sweepHeadline: "frontend e2e · {passed} passed · {failed} failed",
  sweepLabelWindow: range(20, 115),
  sweepTitle: "03 · testing",
  sweepTrail: 160,
  sweepWindow: range(8, 92),
  upperHubAnchor: Object.freeze({ x: -0.42, y: -0.36 }),
  upperHubColor: "#DAFB33",
});

export const networkSceneLimits = Object.freeze({
  squareSpacingMax: 120,
  squareSpacingMin: 20,
});

type Values = Readonly<Record<string, unknown>>;

function readNumber(value: unknown, fallback: number, min: number, max: number): number {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function readColor(value: unknown, fallback: string): string {
  return typeof value === "string" && /^#[0-9a-f]{6}$/iu.test(value)
    ? value.toUpperCase()
    : fallback;
}

function readText(value: unknown, fallback: string): string {
  return typeof value === "string" ? value : fallback;
}

function readLine(value: unknown, fallback: string): string {
  return readText(value, fallback).replace(/[\r\n\t]+/gu, " ");
}

function readPair(
  value: unknown,
  fallback: readonly [number, number],
  min: number,
  max: number,
): readonly [number, number] {
  if (!Array.isArray(value) || value.length !== 2) return fallback;
  const lower = readNumber(value[0], fallback[0], min, max);
  const upper = readNumber(value[1], fallback[1], min, max);
  return Object.freeze(lower <= upper ? [lower, upper] : [upper, lower]) as readonly [
    number,
    number,
  ];
}

function readPoint(value: unknown, fallback: NetworkPoint): NetworkPoint {
  if (!value || typeof value !== "object") return fallback;
  const point = value as Readonly<{ x?: unknown; y?: unknown }>;
  return Object.freeze({
    x: readNumber(point.x, fallback.x, -1, 1),
    y: readNumber(point.y, fallback.y, -1, 1),
  });
}

function readLabel(
  values: Values,
  prefix: "search" | "failover" | "sweep",
  fallback: Readonly<{ detail: string; headline: string; title: string; window: NetworkRange }>,
): NetworkChapterLabel {
  return Object.freeze({
    detail: readLine(values[`${prefix}.detail`], fallback.detail),
    headline: readLine(values[`${prefix}.headline`], fallback.headline),
    title: readLine(values[`${prefix}.title`], fallback.title),
    window: readPair(values[`${prefix}.labelWindow`], fallback.window, 0, 150),
  });
}

export function readNetworkSceneParams(values: Values): NetworkSceneParams {
  const d = networkSceneDefaults;
  return Object.freeze({
    cameraZoom: readNumber(values["camera.zoom"], d.cameraZoom, 1, 3),
    chapterAccent: readColor(values["chapters.accent"], d.chapterAccent),
    chapterCuts: readPair(values["chapters.cuts"], d.chapterCuts, 5, 95),
    decodeGlyphs: readText(values["decode.glyphs"], d.decodeGlyphs),
    decodeRate: readNumber(values["decode.rate"], d.decodeRate, 1, 60),
    dotOpacity: readNumber(values["dots.opacity"], d.dotOpacity, 0, 100) / 100,
    dotSize: readNumber(values["dots.size"], d.dotSize, 0.5, 6),
    failoverLabel: readLabel(values, "failover", {
      detail: d.failoverDetail,
      headline: d.failoverHeadline,
      title: d.failoverTitle,
      window: d.failoverLabelWindow,
    }),
    failoverReplicas: Math.round(readNumber(values["failover.replicas"], d.failoverReplicas, 1, 6)),
    failoverWindow: readPair(values["failover.window"], d.failoverWindow, 0, 100),
    hubSize: readNumber(values["hubs.size"], d.hubSize, 6, 64),
    hubTravel: readNumber(values["hubs.travel"], d.hubTravel, 0, 800),
    labelTitleOpacity: readNumber(values["decode.titleOpacity"], d.labelTitleOpacity, 0, 100) / 100,
    lowerHubAnchor: readPoint(values["lowerHub.anchor"], d.lowerHubAnchor),
    lowerHubColor: readColor(values["lowerHub.color"], d.lowerHubColor),
    searchLabel: readLabel(values, "search", {
      detail: d.searchDetail,
      headline: d.searchHeadline,
      title: d.searchTitle,
      window: d.searchLabelWindow,
    }),
    searchPathWidth: readNumber(values["search.pathWidth"], d.searchPathWidth, 0.5, 6),
    searchTreeOpacity: readNumber(values["search.treeOpacity"], d.searchTreeOpacity, 0, 100) / 100,
    searchWindow: readPair(values["search.window"], d.searchWindow, 0, 100),
    spokeCount: Math.round(readNumber(values["spokes.count"], d.spokeCount, 3, 24)),
    spokeOpacity: readNumber(values["spokes.opacity"], d.spokeOpacity, 0, 100) / 100,
    spokeWidth: readNumber(values["spokes.width"], d.spokeWidth, 0.5, 4),
    squareColor: readColor(values["squares.color"], d.squareColor),
    squareDensity: readNumber(values["squares.density"], d.squareDensity, 0, 100) / 100,
    squareFalloff: readNumber(values["squares.falloff"], d.squareFalloff, 80, 1200),
    squareSize: readPair(values["squares.size"], d.squareSize, 0, 48),
    squareSpacing: readNumber(
      values["squares.spacing"],
      d.squareSpacing,
      networkSceneLimits.squareSpacingMin,
      networkSceneLimits.squareSpacingMax,
    ),
    sweepFailRate: readNumber(values["sweep.failRate"], d.sweepFailRate, 0, 30) / 100,
    sweepLabel: readLabel(values, "sweep", {
      detail: d.sweepDetail,
      headline: d.sweepHeadline,
      title: d.sweepTitle,
      window: d.sweepLabelWindow,
    }),
    sweepTrail: readNumber(values["sweep.trail"], d.sweepTrail, 0, 600),
    sweepWindow: readPair(values["sweep.window"], d.sweepWindow, 0, 100),
    upperHubAnchor: readPoint(values["upperHub.anchor"], d.upperHubAnchor),
    upperHubColor: readColor(values["upperHub.color"], d.upperHubColor),
  });
}
