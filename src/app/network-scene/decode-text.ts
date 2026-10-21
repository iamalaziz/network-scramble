/**
 * Glyph-scramble decode: every character of a block appears at once as random
 * glyphs, then the real characters lock in left-to-right. Nothing fades or
 * types in. Output is a pure function of shot progress and time, so preview
 * and export render identical frames.
 */
export type DecodeWindow = readonly [number, number];

export type DecodedLine = Readonly<{ locked: number; text: string }>;

export type DecodedBlock = Readonly<{
  lines: readonly DecodedLine[];
  /** 0 before the window, 1 once every character has locked. */
  progress: number;
  visible: boolean;
}>;

function hashGlyph(line: number, column: number, tick: number): number {
  let hash = Math.imul(line + 1, 0x27d4eb2d) ^ Math.imul(column + 1, 0x165667b1);
  hash = Math.imul(hash ^ Math.imul(tick + 1, 0x9e3779b1), 0x85ebca6b);
  hash ^= hash >>> 13;
  hash = Math.imul(hash, 0xc2b2ae35);
  hash ^= hash >>> 16;
  return hash >>> 0;
}

/** Shot percentage (0-100) where the decode window begins and ends. */
export function getDecodeProgress(shotPercent: number, window: DecodeWindow): number {
  const [start, end] = window;
  if (shotPercent < start) return -1;
  if (end <= start) return 1;
  return Math.min(1, (shotPercent - start) / (end - start));
}

export function decodeBlock({
  glyphs,
  lines,
  rate,
  shotPercent,
  timeSeconds,
  window,
}: Readonly<{
  glyphs: string;
  lines: readonly string[];
  rate: number;
  shotPercent: number;
  timeSeconds: number;
  window: DecodeWindow;
}>): DecodedBlock {
  const progress = getDecodeProgress(shotPercent, window);
  if (progress < 0) {
    return Object.freeze({ lines: Object.freeze([]), progress: 0, visible: false });
  }
  const charset = Array.from(glyphs.replace(/\s/gu, ""));
  const tick = Math.floor(Math.max(0, timeSeconds) * rate);
  const decoded = lines.map((line, lineIndex) => {
    const characters = Array.from(line);
    const locked = Math.min(characters.length, Math.floor(progress * characters.length));
    const text = characters
      .map((character, column) => {
        if (column < locked || /\s/u.test(character) || charset.length === 0) {
          return character;
        }
        return charset[hashGlyph(lineIndex, column, tick) % charset.length]!;
      })
      .join("");
    return Object.freeze({ locked, text });
  });
  return Object.freeze({
    lines: Object.freeze(decoded),
    progress,
    visible: true,
  });
}
