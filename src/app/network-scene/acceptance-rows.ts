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
    fixture: fixture ?? "default network shot paused at 5.0 s while the Testing label is mid-scramble",
    id: `network.${id}`,
    kind: "control",
    target,
    userAction,
    ...extra,
  };
}

/** Paused shot times (reachable by the 0.5 s scrubber step) where each chapter effect is on screen. */
export const NETWORK_CHAPTER_SECONDS = Object.freeze({
  elected: 2.5,
  failover: 2,
  path: 1.5,
  search: 0.5,
  sweep: 4.5,
});

const chapterFixture = Object.freeze({
  elected: "default network shot paused at 2.5 s after the Distributed chapter elected its replicas",
  failover: "default network shot paused at 2.0 s while the failed node blinks and its label scrambles",
  path: "default network shot paused at 1.5 s with the shortest path fully drawn",
  search: "default network shot paused at 0.5 s while the search frontier grows and its label scrambles",
  sweep: "default network shot paused at 4.5 s while the scan line crosses the frame and its label scrambles",
});

function labelRows(
  prefix: "search" | "failover" | "sweep",
  section: string,
  fixture: string,
): ToolcraftComponentAcceptance[] {
  return [
    networkControlRow({
      componentType: "text",
      expectedObservable: `The dim ${section} chapter title shows the edited text.`,
      fixture,
      id: `${prefix}.title`,
      target: `${prefix}.title`,
      userAction: `Edit Title in ${section}.`,
    }),
    networkControlRow({
      componentType: "text",
      expectedObservable: `The first decoded ${section} label line shows the edited text.`,
      fixture,
      id: `${prefix}.headline`,
      target: `${prefix}.headline`,
      userAction: `Edit Headline in ${section}.`,
    }),
    networkControlRow({
      componentType: "text",
      expectedObservable: `The second decoded ${section} label line shows the edited text.`,
      fixture,
      id: `${prefix}.detail`,
      target: `${prefix}.detail`,
      userAction: `Edit Detail in ${section}.`,
    }),
    networkControlRow({
      componentType: "rangeSlider",
      expectedObservable: `The ${section} label starts scrambling or locks its characters at a different chapter moment.`,
      extra: { controlPartCoverage: ["rangeSlider.lower", "rangeSlider.upper"] },
      fixture,
      id: `${prefix}.labelWindow`,
      target: `${prefix}.labelWindow`,
      userAction: `Drag both Decode window thumbs in ${section}.`,
    }),
  ];
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
    componentType: "rangeSlider",
    expectedObservable: "Moving either cut point switches the paused frame to a different chapter or chapter moment.",
    extra: { controlPartCoverage: ["rangeSlider.lower", "rangeSlider.upper"] },
    fixture: chapterFixture.elected,
    id: "chapters.cuts",
    target: "chapters.cuts",
    userAction: "Drag both Cut points thumbs in Chapters.",
  }),
  networkControlRow({
    componentType: "color",
    expectedObservable: "The shortest path and its squares redraw in the chosen accent color.",
    fixture: chapterFixture.path,
    id: "chapters.accent",
    target: "chapters.accent",
    userAction: "Enter a new hex color in Chapters Accent.",
  }),
  networkControlRow({
    componentType: "rangeSlider",
    expectedObservable: "The search frontier has settled more or fewer nodes at the paused time.",
    extra: { controlPartCoverage: ["rangeSlider.lower", "rangeSlider.upper"] },
    fixture: chapterFixture.search,
    id: "search.window",
    target: "search.window",
    userAction: "Drag both Timing thumbs in Path Search.",
  }),
  networkControlRow({
    componentType: "slider",
    expectedObservable: "The search tree lines become brighter or fainter.",
    fixture: chapterFixture.search,
    id: "search.treeOpacity",
    target: "search.treeOpacity",
    userAction: "Drag Tree opacity in Path Search.",
  }),
  networkControlRow({
    componentType: "slider",
    expectedObservable: "The shortest path line becomes thicker or thinner.",
    fixture: chapterFixture.path,
    id: "search.pathWidth",
    target: "search.pathWidth",
    userAction: "Drag Path width in Path Search.",
  }),
  ...labelRows("search", "Path Search", chapterFixture.search),
  networkControlRow({
    componentType: "rangeSlider",
    expectedObservable: "The node beside the upper hub fails, blinks or is replaced by the elected replicas at a different moment.",
    extra: { controlPartCoverage: ["rangeSlider.lower", "rangeSlider.upper"] },
    fixture: chapterFixture.failover,
    id: "failover.window",
    target: "failover.window",
    userAction: "Drag both Timing thumbs in Failover.",
  }),
  networkControlRow({
    componentType: "slider",
    expectedObservable: "More or fewer neighbours of the failed node are outlined as replicas.",
    fixture: chapterFixture.elected,
    id: "failover.replicas",
    target: "failover.replicas",
    userAction: "Drag Replicas in Failover.",
  }),
  ...labelRows("failover", "Failover", chapterFixture.failover),
  networkControlRow({
    componentType: "rangeSlider",
    expectedObservable: "The scan line sits further left or right and has validated a different share of squares.",
    extra: { controlPartCoverage: ["rangeSlider.lower", "rangeSlider.upper"] },
    fixture: chapterFixture.sweep,
    id: "sweep.window",
    target: "sweep.window",
    userAction: "Drag both Timing thumbs in Test Sweep.",
  }),
  networkControlRow({
    componentType: "slider",
    expectedObservable: "More or fewer validated squares stay hollow as failures.",
    fixture: chapterFixture.sweep,
    id: "sweep.failRate",
    target: "sweep.failRate",
    userAction: "Drag Fail rate in Test Sweep.",
  }),
  networkControlRow({
    componentType: "slider",
    expectedObservable: "A longer or shorter band of squares behind the scan line flashes in the accent.",
    fixture: chapterFixture.sweep,
    id: "sweep.trail",
    target: "sweep.trail",
    userAction: "Drag Trail in Test Sweep.",
  }),
  ...labelRows("sweep", "Test Sweep", chapterFixture.sweep),
  networkControlRow({
    componentType: "slider",
    expectedObservable: "The steady chapter title above the label becomes brighter or dimmer.",
    id: "decode.titleOpacity",
    target: "decode.titleOpacity",
    userAction: "Drag Title opacity in Decode.",
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
