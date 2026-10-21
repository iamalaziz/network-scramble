import type { ToolcraftComponentAcceptance } from "../acceptance/types";

export const NETWORK_BROWSER_SPEC = "e2e/product-network.spec.ts";
export const NETWORK_RUNTIME_BROWSER_SPEC = "e2e/product-shot.spec.ts";

type ControlRowInput = Readonly<{
  componentType: string;
  expectedObservable: string;
  extra?: Partial<ToolcraftComponentAcceptance>;
  fixture?: string;
  id: string;
  target: string;
  userAction: string;
}>;

/** Browser and Vitest names are derived from the row id so each row owns one test. */
export function getNetworkBrowserTestName(id: string): string {
  return `browser acceptance: network ${id}`;
}

export function getNetworkUnitTestName(id: string): string {
  return `network scene: ${id} changes the rendered frame`;
}

export function getNetworkRuntimeUnitTestName(id: string): string {
  return `network scene: ${id} runtime contract`;
}

export function networkControlRow({
  componentType,
  expectedObservable,
  extra,
  fixture,
  id,
  target,
  userAction,
}: ControlRowInput): ToolcraftComponentAcceptance {
  return {
    automated: true,
    automatedTestName: getNetworkUnitTestName(id),
    browser: {
      budget: "standard",
      file: NETWORK_BROWSER_SPEC,
      testName: getNetworkBrowserTestName(id),
    },
    componentType,
    evidence: "rendered-pixels",
    expectedObservable,
    fixture: fixture ?? "default network shot paused at 5.0 s while the request block is mid-scramble",
    id: `network.${id}`,
    kind: "control",
    target,
    userAction,
    ...extra,
  };
}

export const networkControlRows: readonly ToolcraftComponentAcceptance[] = [
  networkControlRow({
    componentType: "slider",
    expectedObservable: "The square lattice and dot grid redraw with wider or tighter spacing.",
    id: "squares.spacing",
    target: "squares.spacing",
    userAction: "Drag Spacing in Squares.",
  }),
  networkControlRow({
    componentType: "slider",
    expectedObservable: "More or fewer lattice points carry squares.",
    id: "squares.density",
    target: "squares.density",
    userAction: "Drag Density in Squares.",
  }),
  networkControlRow({
    componentType: "rangeSlider",
    expectedObservable: "Edge squares shrink or grow with the low thumb and hub-side squares with the high thumb.",
    extra: { controlPartCoverage: ["rangeSlider.lower", "rangeSlider.upper"] },
    id: "squares.size",
    target: "squares.size",
    userAction: "Drag both Size thumbs in Squares.",
  }),
  networkControlRow({
    componentType: "slider",
    expectedObservable: "Large squares spread further from or stay closer to the hubs.",
    id: "squares.falloff",
    target: "squares.falloff",
    userAction: "Drag Falloff in Squares.",
  }),
  networkControlRow({
    componentType: "color",
    expectedObservable: "Squares, spokes, dots and labels redraw in the chosen mono color.",
    id: "squares.color",
    target: "squares.color",
    userAction: "Enter a new hex color in Squares Color.",
  }),
  networkControlRow({
    componentType: "slider",
    expectedObservable: "The faint background dot grid becomes brighter or dimmer.",
    id: "dots.opacity",
    target: "dots.opacity",
    userAction: "Drag Opacity in Dot Grid.",
  }),
  networkControlRow({
    componentType: "slider",
    expectedObservable: "Background dots grow or shrink.",
    id: "dots.size",
    target: "dots.size",
    userAction: "Drag Size in Dot Grid.",
  }),
  networkControlRow({
    componentType: "slider",
    expectedObservable: "Both lime hub squares grow or shrink.",
    id: "hubs.size",
    target: "hubs.size",
    userAction: "Drag Size in Hubs.",
  }),
  networkControlRow({
    componentType: "slider",
    expectedObservable: "Hubs sit at different points of their paths at the paused time.",
    id: "hubs.travel",
    target: "hubs.travel",
    userAction: "Drag Travel in Hubs.",
  }),
  networkControlRow({
    componentType: "color",
    expectedObservable: "The upper hub square redraws in the chosen color.",
    id: "upperHub.color",
    target: "upperHub.color",
    userAction: "Enter a new hex color in Upper Hub Color.",
  }),
  networkControlRow({
    componentType: "vector",
    expectedObservable: "The upper hub moves in the same screen direction as each pad drag.",
    extra: { controlPartCoverage: ["vector.x", "vector.y"], interactionId: "upper-hub-anchor" },
    fixture: "paused shot with the lower hub recolored so the upper hub is the only lime feature",
    id: "upperHub.anchor",
    target: "upperHub.anchor",
    userAction: "Drag the Upper Hub Anchor pad right, left, down and up.",
  }),
  networkControlRow({
    componentType: "color",
    expectedObservable: "The lower hub square redraws in the chosen color.",
    id: "lowerHub.color",
    target: "lowerHub.color",
    userAction: "Enter a new hex color in Lower Hub Color.",
  }),
  networkControlRow({
    componentType: "vector",
    expectedObservable: "The lower hub moves in the same screen direction as each pad drag.",
    extra: { controlPartCoverage: ["vector.x", "vector.y"], interactionId: "lower-hub-anchor" },
    fixture: "paused shot with the upper hub recolored so the lower hub is the only lime feature",
    id: "lowerHub.anchor",
    target: "lowerHub.anchor",
    userAction: "Drag the Lower Hub Anchor pad right, left, down and up.",
  }),
  networkControlRow({
    componentType: "slider",
    expectedObservable: "Each hub fans out to more or fewer neighbouring squares.",
    id: "spokes.count",
    target: "spokes.count",
    userAction: "Drag Count in Spokes.",
  }),
  networkControlRow({
    componentType: "slider",
    expectedObservable: "Spoke lines become thicker or thinner.",
    id: "spokes.width",
    target: "spokes.width",
    userAction: "Drag Width in Spokes.",
  }),
  networkControlRow({
    componentType: "slider",
    expectedObservable: "Spoke lines become brighter or fainter.",
    id: "spokes.opacity",
    target: "spokes.opacity",
    userAction: "Drag Opacity in Spokes.",
  }),
  networkControlRow({
    componentType: "slider",
    expectedObservable: "The grid is pushed in further or less at the paused time.",
    id: "camera.zoom",
    target: "camera.zoom",
    userAction: "Drag Zoom in Camera.",
  }),
  networkControlRow({
    componentType: "code",
    expectedObservable: "The dim status lines beside the lower hub show the edited text.",
    id: "response.status",
    target: "response.status",
    userAction: "Edit the Status Lines editor.",
  }),
  networkControlRow({
    componentType: "slider",
    expectedObservable: "The status lines become brighter or dimmer.",
    id: "response.statusOpacity",
    target: "response.statusOpacity",
    userAction: "Drag Status opacity in Response.",
  }),
  networkControlRow({
    componentType: "code",
    expectedObservable: "The decoded body lines show the edited text.",
    id: "response.body",
    target: "response.body",
    userAction: "Edit the Body Lines editor.",
  }),
  networkControlRow({
    componentType: "rangeSlider",
    expectedObservable: "The body block starts later or resolves at a different point in the shot.",
    extra: { controlPartCoverage: ["rangeSlider.lower", "rangeSlider.upper"] },
    fixture: "default network shot paused at 1.5 s while the response body is mid-scramble",
    id: "response.window",
    target: "response.window",
    userAction: "Drag both Decode window thumbs in Response.",
  }),
  networkControlRow({
    componentType: "code",
    expectedObservable: "The late request block beside the upper hub shows the edited text.",
    id: "request.text",
    target: "request.text",
    userAction: "Edit the Request Lines editor.",
  }),
  networkControlRow({
    componentType: "rangeSlider",
    expectedObservable: "The request block appears earlier or later and locks more or fewer characters by the cut.",
    extra: { controlPartCoverage: ["rangeSlider.lower", "rangeSlider.upper"] },
    id: "request.window",
    target: "request.window",
    userAction: "Drag both Decode window thumbs in Request.",
  }),
  networkControlRow({
    componentType: "slider",
    expectedObservable: "Unlocked characters show a different scramble glyph at the paused time.",
    id: "decode.rate",
    target: "decode.rate",
    userAction: "Drag Scramble rate in Decode.",
  }),
  networkControlRow({
    componentType: "text",
    expectedObservable: "Unlocked characters cycle through the edited glyph set.",
    id: "decode.glyphs",
    target: "decode.glyphs",
    userAction: "Edit Glyphs in Decode.",
  }),
];
