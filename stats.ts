import { framesDone, isFinal, openNoteCount, secondsOf, type Project, type Shot } from './types';

export type Totals = {
  total: number;
  final: number;
  wip: number;
  totalFrames: number;
  doneFrames: number;
  /** Summed per shot at each shot's own rate, so mixed frame rates stay correct. */
  totalSeconds: number;
  percent: number;
};

export function totalsOf(shots: Shot[]): Totals {
  const totalFrames = shots.reduce((sum, s) => sum + s.frames, 0);
  const doneFrames = shots.reduce((sum, s) => sum + framesDone(s), 0);
  const totalSeconds = shots.reduce((sum, s) => sum + secondsOf(s), 0);
  const final = shots.filter(isFinal).length;
  return {
    total: shots.length,
    final,
    wip: shots.length - final,
    totalFrames,
    doneFrames,
    totalSeconds,
    percent: totalFrames === 0 ? 0 : doneFrames / totalFrames,
  };
}

export type ProjectSummary = Totals & {
  openNotes: number;
  /** Earliest due date among unfinished shots, or null. */
  nextDue: string | null;
  /** Furthest-along stage index reached, for a rough "where is this project" read. */
  leadStageIndex: number;
};

export function shotsIn(shots: Shot[], projectId: string): Shot[] {
  return shots.filter((s) => s.projectId === projectId);
}

export function summarize(project: Project, allShots: Shot[]): ProjectSummary {
  const mine = shotsIn(allShots, project.id);
  const nextDue =
    mine
      .filter((s) => !isFinal(s) && s.due !== null)
      .map((s) => s.due as string)
      .sort()[0] ?? null;

  return {
    ...totalsOf(mine),
    openNotes: mine.reduce((sum, s) => sum + openNoteCount(s), 0),
    nextDue,
    leadStageIndex: mine.reduce((max, s) => Math.max(max, s.stageIndex), 0),
  };
}
