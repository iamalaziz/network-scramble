import type { NetworkSceneParams } from "./scene-params";

/**
 * The shot tells three chapters in order: an Algorithm path search, a
 * Distributed failover and a Testing sweep. Chapter boundaries are shot
 * percentages, so a duration edit rescales the same story.
 */
export type NetworkChapterId = "search" | "failover" | "sweep";

export type NetworkChapter = Readonly<{
  id: NetworkChapterId;
  /** Chapter percentage (0-100) reached at the current shot progress. */
  percent: number;
  /** Shot progress (0-1) where the chapter begins. */
  startProgress: number;
}>;

const CHAPTER_IDS: readonly NetworkChapterId[] = ["search", "failover", "sweep"];

export function getNetworkChapter(params: NetworkSceneParams, progress: number): NetworkChapter {
  const shotPercent = Math.min(100, Math.max(0, progress * 100));
  const bounds = [0, params.chapterCuts[0], params.chapterCuts[1], 100];
  let index = 2;
  if (shotPercent < bounds[1]!) index = 0;
  else if (shotPercent < bounds[2]!) index = 1;
  const start = bounds[index]!;
  const length = bounds[index + 1]! - start;
  return Object.freeze({
    id: CHAPTER_IDS[index]!,
    percent: length > 0 ? ((shotPercent - start) / length) * 100 : 100,
    startProgress: start / 100,
  });
}

/** 0 before the window, rising to 1 at its end. */
export function getWindowProgress(percent: number, window: readonly [number, number]): number {
  const [start, end] = window;
  if (percent <= start) return 0;
  if (end <= start) return 1;
  return Math.min(1, (percent - start) / (end - start));
}

/** Tokens such as `{visited}` show live values computed by the chapter. */
export function fillLabelTokens(text: string, tokens: Readonly<Record<string, string>>): string {
  return text.replace(/\{(\w+)\}/gu, (match, name: string) => tokens[name] ?? match);
}

/** Widest expected token value, used to reserve the label box before values exist. */
export const LABEL_TOKEN_PLACEHOLDER = "0000";
