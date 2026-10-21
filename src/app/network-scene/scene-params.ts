export type NetworkPoint = Readonly<{ x: number; y: number }>;

export type NetworkSceneParams = Readonly<{
  cameraZoom: number;
  decodeGlyphs: string;
  decodeRate: number;
  dotOpacity: number;
  dotSize: number;
  hubSize: number;
  hubTravel: number;
  lowerHubAnchor: NetworkPoint;
  lowerHubColor: string;
  requestLines: readonly string[];
  requestWindow: readonly [number, number];
  responseBodyLines: readonly string[];
  responseStatusLines: readonly string[];
  responseStatusOpacity: number;
  responseWindow: readonly [number, number];
  spokeCount: number;
  spokeOpacity: number;
  spokeWidth: number;
  squareColor: string;
  squareDensity: number;
  squareFalloff: number;
  squareSize: readonly [number, number];
  squareSpacing: number;
  upperHubAnchor: NetworkPoint;
  upperHubColor: string;
}>;

/** Schema defaults shared by the schema, renderer fallbacks, and tests. */
export const networkSceneDefaults = Object.freeze({
  background: "#000000",
  cameraZoom: 1.45,
  decodeGlyphs: "@&%#$*+=?!/<>0123456789",
  decodeRate: 24,
  dotOpacity: 18,
  dotSize: 2,
  hubSize: 24,
  hubTravel: 260,
  lowerHubAnchor: Object.freeze({ x: 0.02, y: 0.34 }),
  lowerHubColor: "#DAFB33",
  requestText: "> POST /v2/messages/batch\n> key ak57",
  requestWindow: Object.freeze([93, 108]) as readonly [number, number],
  responseBody: "credits required 5\nratelimit 2 / 50 tokens",
  responseStatus: "< 200 OK\nrequest_id req_123",
  responseStatusOpacity: 35,
  responseWindow: Object.freeze([22, 48]) as readonly [number, number],
  spokeCount: 12,
  spokeOpacity: 85,
  spokeWidth: 1,
  squareColor: "#FFFFFF",
  squareDensity: 55,
  squareFalloff: 200,
  squareSize: Object.freeze([1.5, 26]) as readonly [number, number],
  squareSpacing: 60,
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

function readLines(value: unknown, fallback: string): readonly string[] {
  return Object.freeze(
    readText(value, fallback)
      .replace(/\r\n?/gu, "\n")
      .split("\n")
      .map((line) => line.replace(/\t/gu, "  ")),
  );
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

export function readNetworkSceneParams(values: Values): NetworkSceneParams {
  const d = networkSceneDefaults;
  return Object.freeze({
    cameraZoom: readNumber(values["camera.zoom"], d.cameraZoom, 1, 3),
    decodeGlyphs: readText(values["decode.glyphs"], d.decodeGlyphs),
    decodeRate: readNumber(values["decode.rate"], d.decodeRate, 1, 60),
    dotOpacity: readNumber(values["dots.opacity"], d.dotOpacity, 0, 100) / 100,
    dotSize: readNumber(values["dots.size"], d.dotSize, 0.5, 6),
    hubSize: readNumber(values["hubs.size"], d.hubSize, 6, 64),
    hubTravel: readNumber(values["hubs.travel"], d.hubTravel, 0, 800),
    lowerHubAnchor: readPoint(values["lowerHub.anchor"], d.lowerHubAnchor),
    lowerHubColor: readColor(values["lowerHub.color"], d.lowerHubColor),
    requestLines: readLines(values["request.text"], d.requestText),
    requestWindow: readPair(values["request.window"], d.requestWindow, 0, 150),
    responseBodyLines: readLines(values["response.body"], d.responseBody),
    responseStatusLines: readLines(values["response.status"], d.responseStatus),
    responseStatusOpacity:
      readNumber(values["response.statusOpacity"], d.responseStatusOpacity, 0, 100) / 100,
    responseWindow: readPair(values["response.window"], d.responseWindow, 0, 150),
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
    upperHubAnchor: readPoint(values["upperHub.anchor"], d.upperHubAnchor),
    upperHubColor: readColor(values["upperHub.color"], d.upperHubColor),
  });
}
