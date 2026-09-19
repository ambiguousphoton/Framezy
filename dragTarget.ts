/**
 * Geometry for drag-to-reorder, shared by the vertical shot list and the
 * horizontal timeline. Kept free of React and Reanimated so it can be tested
 * directly — the gesture layer only feeds it sizes and a pointer delta.
 *
 * Sizes are heights in the list and widths in the timeline; the maths is the
 * same either way, which is why both views share this module.
 */

/** Centre of each item along the drag axis, in layout order. */
export function centersOf(sizes: number[], gap = 0): number[] {
  const centers: number[] = [];
  let offset = 0;
  for (const size of sizes) {
    centers.push(offset + size / 2);
    offset += size + gap;
  }
  return centers;
}

/** Leading edge of each item along the drag axis, in layout order. */
export function offsetsOf(sizes: number[], gap = 0): number[] {
  const offsets: number[] = [];
  let offset = 0;
  for (const size of sizes) {
    offsets.push(offset);
    offset += size + gap;
  }
  return offsets;
}

/**
 * Index the dragged item would land on, given how far the finger has moved.
 *
 * Counts how many other items the dragged item's centre has passed. That count
 * is exactly the destination index once the item is removed and reinserted,
 * and it handles items of differing sizes without special cases.
 */
export function dropIndex(sizes: number[], from: number, delta: number, gap = 0): number {
  if (from < 0 || from >= sizes.length) return from;

  const centers = centersOf(sizes, gap);
  const dragged = centers[from] + delta;

  let target = 0;
  for (let i = 0; i < centers.length; i += 1) {
    if (i !== from && centers[i] < dragged) target += 1;
  }
  return Math.max(0, Math.min(target, sizes.length - 1));
}

/** Moves one item, returning a new array. Out-of-range or no-op moves return the input. */
export function moveItem<T>(items: T[], from: number, to: number): T[] {
  if (
    from === to ||
    from < 0 ||
    to < 0 ||
    from >= items.length ||
    to >= items.length
  ) {
    return items;
  }
  const next = items.slice();
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

/**
 * Where to draw the insertion marker, in the *current* on-screen layout.
 *
 * The other items deliberately stay put while dragging, so the marker is placed
 * against the boundary of the item being passed: its leading edge when moving
 * up/left, its trailing edge when moving down/right. Returns null when the drop
 * would not change the order.
 */
export function markerEdge(
  sizes: number[],
  from: number,
  target: number,
  gap = 0
): number | null {
  if (target === from || from < 0 || target < 0) return null;
  if (from >= sizes.length || target >= sizes.length) return null;

  const offsets = offsetsOf(sizes, gap);
  return target < from
    ? offsets[target] - gap / 2
    : offsets[target] + sizes[target] + gap / 2;
}
