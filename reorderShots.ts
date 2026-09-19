import { moveItem } from './dragTarget';
import type { Shot } from './types';

/**
 * Reorders one project's shots inside the flat all-projects array.
 *
 * `from`/`to` index the project's own shots as the user sees them, not the flat
 * list. The project's shots are lifted out, reordered, and written back into the
 * exact slots they came from, so shots belonging to other projects never move.
 */
export function reorderInProject(
  shots: Shot[],
  projectId: string,
  from: number,
  to: number
): Shot[] {
  const slots: number[] = [];
  shots.forEach((shot, index) => {
    if (shot.projectId === projectId) slots.push(index);
  });

  if (from === to || from < 0 || to < 0 || from >= slots.length || to >= slots.length) {
    return shots;
  }

  const reordered = moveItem(
    slots.map((slot) => shots[slot]),
    from,
    to
  );

  const next = shots.slice();
  slots.forEach((slot, i) => {
    next[slot] = reordered[i];
  });
  return next;
}
