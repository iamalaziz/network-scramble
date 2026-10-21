/** Minimal Canvas 2D stand-in that records every draw call for comparison. */
export type RecordingContext = CanvasRenderingContext2D & { readonly ops: string[] };

const round = (value: number) => Math.round(value * 100) / 100;

export function createRecordingContext(): RecordingContext {
  const ops: string[] = [];
  const state = {
    fillStyle: "#000000" as unknown,
    font: "",
    globalAlpha: 1,
    lineWidth: 1,
    strokeStyle: "#000000" as unknown,
    textAlign: "start",
    textBaseline: "alphabetic",
  };
  const style = () => `a=${round(state.globalAlpha)} f=${String(state.fillStyle)}`;
  const context = {
    ops,
    beginPath: () => ops.push("beginPath"),
    clearRect: (...args: number[]) => ops.push(`clearRect ${args.map(round).join(",")}`),
    fill: () => ops.push(`fill ${style()}`),
    fillRect: (...args: number[]) => ops.push(`fillRect ${args.map(round).join(",")} ${style()}`),
    fillText: (text: string, x: number, y: number) =>
      ops.push(`fillText ${JSON.stringify(text)} ${round(x)},${round(y)} ${style()} ${state.font}`),
    lineTo: (x: number, y: number) => ops.push(`lineTo ${round(x)},${round(y)}`),
    moveTo: (x: number, y: number) => ops.push(`moveTo ${round(x)},${round(y)}`),
    rect: (...args: number[]) => ops.push(`rect ${args.map(round).join(",")}`),
    restore: () => ops.push("restore"),
    save: () => ops.push("save"),
    setTransform: (...args: number[]) => ops.push(`setTransform ${args.map(round).join(",")}`),
    stroke: () =>
      ops.push(`stroke a=${round(state.globalAlpha)} s=${String(state.strokeStyle)} w=${state.lineWidth}`),
  };
  for (const key of Object.keys(state) as (keyof typeof state)[]) {
    Object.defineProperty(context, key, {
      get: () => state[key],
      set: (value) => {
        (state as Record<string, unknown>)[key] = value;
      },
    });
  }
  return context as unknown as RecordingContext;
}
