/**
 * Dijkstra over the occupied lattice cells with 8-neighbour moves (cost 1 or
 * √2 in lattice units). The search runs in a bounded box around the start and
 * goal, and it records the settle order so the renderer can replay the
 * frontier growing over time.
 */
export type LatticeCell = Readonly<{ column: number; row: number }>;

export type PathSearchResult = Readonly<{
  cost: number | null;
  /** Settled cells in order; the start is first and the goal (when reached) last. */
  order: readonly LatticeCell[];
  /** Index into `order` of each settled cell's parent; -1 for the start. */
  parents: readonly number[];
  /** Start → goal cells, or null when the goal is unreachable inside the box. */
  path: readonly LatticeCell[] | null;
}>;

const NEIGHBOURS: readonly (readonly [number, number, number])[] = [
  [1, 0, 1],
  [-1, 0, 1],
  [0, 1, 1],
  [0, -1, 1],
  [1, 1, Math.SQRT2],
  [1, -1, Math.SQRT2],
  [-1, 1, Math.SQRT2],
  [-1, -1, Math.SQRT2],
];

/** Minimal binary heap of [cost, cellIndex] pairs. */
class CostHeap {
  private readonly items: [number, number][] = [];

  get size(): number {
    return this.items.length;
  }

  push(cost: number, cell: number): void {
    const items = this.items;
    items.push([cost, cell]);
    let index = items.length - 1;
    while (index > 0) {
      const parent = (index - 1) >> 1;
      if (items[parent]![0] <= cost) break;
      items[index] = items[parent]!;
      index = parent;
    }
    items[index] = [cost, cell];
  }

  pop(): [number, number] {
    const items = this.items;
    const top = items[0]!;
    const last = items.pop()!;
    if (items.length > 0) {
      let index = 0;
      for (;;) {
        const left = index * 2 + 1;
        if (left >= items.length) break;
        const right = left + 1;
        const child = right < items.length && items[right]![0] < items[left]![0] ? right : left;
        if (items[child]![0] >= last[0]) break;
        items[index] = items[child]!;
        index = child;
      }
      items[index] = last;
    }
    return top;
  }
}

export function searchLatticePath({
  goal,
  isOpen,
  margin,
  start,
}: Readonly<{
  goal: LatticeCell;
  isOpen: (column: number, row: number) => boolean;
  margin: number;
  start: LatticeCell;
}>): PathSearchResult {
  const minColumn = Math.min(start.column, goal.column) - margin;
  const minRow = Math.min(start.row, goal.row) - margin;
  const columns = Math.abs(start.column - goal.column) + margin * 2 + 1;
  const rows = Math.abs(start.row - goal.row) + margin * 2 + 1;
  const count = columns * rows;
  const indexOf = (column: number, row: number) => (row - minRow) * columns + (column - minColumn);
  const distance = new Float64Array(count).fill(Number.POSITIVE_INFINITY);
  const parentCell = new Int32Array(count).fill(-1);
  const settledAt = new Int32Array(count).fill(-1);
  const order: LatticeCell[] = [];
  const parents: number[] = [];
  const goalIndex = indexOf(goal.column, goal.row);
  const heap = new CostHeap();
  const startIndex = indexOf(start.column, start.row);
  distance[startIndex] = 0;
  heap.push(0, startIndex);

  while (heap.size > 0) {
    const [cost, cell] = heap.pop();
    if (settledAt[cell]! >= 0 || cost > distance[cell]!) continue;
    const column = minColumn + (cell % columns);
    const row = minRow + Math.floor(cell / columns);
    settledAt[cell] = order.length;
    order.push({ column, row });
    parents.push(parentCell[cell]! >= 0 ? settledAt[parentCell[cell]!]! : -1);
    if (cell === goalIndex) break;
    for (const [dx, dy, step] of NEIGHBOURS) {
      const nextColumn = column + dx;
      const nextRow = row + dy;
      if (nextColumn < minColumn || nextColumn >= minColumn + columns) continue;
      if (nextRow < minRow || nextRow >= minRow + rows) continue;
      if (!isOpen(nextColumn, nextRow)) continue;
      const next = indexOf(nextColumn, nextRow);
      const nextCost = cost + step;
      if (settledAt[next]! >= 0 || nextCost >= distance[next]!) continue;
      distance[next] = nextCost;
      parentCell[next] = cell;
      heap.push(nextCost, next);
    }
  }

  const reached = settledAt[goalIndex]! >= 0;
  let path: LatticeCell[] | null = null;
  if (reached) {
    path = [];
    for (let index = settledAt[goalIndex]!; index >= 0; index = parents[index]!) {
      path.push(order[index]!);
    }
    path.reverse();
  }
  return Object.freeze({
    cost: reached ? distance[goalIndex]! : null,
    order,
    parents,
    path,
  });
}
