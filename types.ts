export type PipelineId = '3d' | '2d';

export type Pipeline = {
  id: PipelineId;
  label: string;
  short: string;
  stages: string[];
};

export const PIPELINES: Record<PipelineId, Pipeline> = {
  '3d': {
    id: '3d',
    label: '3D / CG',
    short: '3D',
    stages: ['Blocking', 'Blocking+', 'Splining', 'Polish', 'Final'],
  },
  '2d': {
    id: '2d',
    label: '2D / Hand-drawn',
    short: '2D',
    stages: ['Thumbs', 'Keys', 'Breakdowns', 'Inbetweens', 'Cleanup', 'Colour'],
  },
};

export const PIPELINE_IDS: PipelineId[] = ['3d', '2d'];

export const DEFAULT_FPS = 24;

/** Common animation rates: 8 and 12 for shooting on threes/twos, then film/video. */
export const FPS_PRESETS = [8, 12, 24, 25, 30, 60];

export const MAX_FPS = 240;

export function isValidFps(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 && value <= MAX_FPS;
}

export type Project = {
  id: string;
  name: string;
  /** Free-text brief: what this project is, client, references. May be empty. */
  description: string;
  /** Default pipeline for new shots in this project; a shot can still override it. */
  pipeline: PipelineId;
  /** Default frame rate for new shots; a shot can still override it. */
  fps: number;
  /** Target delivery date as ISO yyyy-mm-dd, or null if none set. */
  expectedCompletion: string | null;
  createdAt: string;
};

export type Note = {
  id: string;
  /** Frame the note is anchored to, or null for a general note. */
  frame: number | null;
  text: string;
  addressed: boolean;
};

export type Shot = {
  id: string;
  projectId: string;
  code: string;
  /** Free-text note on the action or intent of the shot. May be empty. */
  description: string;
  frames: number;
  /** Identity colour (see SHOT_COLORS). Random on create, editable per shot. */
  color: string;
  /** Frames per second for this shot. Inherited from the project, editable here. */
  fps: number;
  pipeline: PipelineId;
  stageIndex: number;
  /** 1 renders as v001. Bumps on each dailies submission. */
  version: number;
  /** ISO yyyy-mm-dd, or null if undated. */
  due: string | null;
  notes: Note[];
};

export function stagesOf(shot: Shot): string[] {
  return PIPELINES[shot.pipeline].stages;
}

export function stageName(shot: Shot): string {
  const stages = stagesOf(shot);
  return stages[Math.min(shot.stageIndex, stages.length - 1)];
}

export function isFinal(shot: Shot): boolean {
  return shot.stageIndex >= stagesOf(shot).length - 1;
}

/** 0 at the first stage, 1 at the last. */
export function progressOf(shot: Shot): number {
  const lastIndex = stagesOf(shot).length - 1;
  if (lastIndex <= 0) return 1;
  return Math.min(shot.stageIndex, lastIndex) / lastIndex;
}

/** Frames credited as complete, weighted by how far through the pipeline the shot is. */
export function framesDone(shot: Shot): number {
  return shot.frames * progressOf(shot);
}

export function openNoteCount(shot: Shot): number {
  return shot.notes.reduce((sum, n) => sum + (n.addressed ? 0 : 1), 0);
}

export function formatVersion(version: number): string {
  return `v${String(version).padStart(3, '0')}`;
}

/** 96 -> "96f", 1180 -> "1,180f" */
export function formatFrames(frames: number): string {
  return `${Math.round(frames).toLocaleString('en-US')}f`;
}

/** Seconds of screen time this shot occupies at its own frame rate. */
export function secondsOf(shot: Shot): number {
  return shot.fps > 0 ? shot.frames / shot.fps : 0;
}

/** Frames at a given rate as seconds, e.g. 96 @ 24 -> "4.0s" */
export function formatSeconds(frames: number, fps = DEFAULT_FPS): string {
  if (fps <= 0) return '—';
  return `${(frames / fps).toFixed(1)}s`;
}

/** Length in seconds, the way footage is usually quoted: 49.2 -> "49.2s" */
export function formatLength(seconds: number): string {
  return `${seconds.toFixed(1)}s`;
}

/** Seconds as a duration label, e.g. 4 -> "4.0s", 95 -> "1:35" */
export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const mins = Math.floor(seconds / 60);
  const rest = Math.round(seconds - mins * 60);
  return `${mins}:${String(rest).padStart(2, '0')}`;
}

export function formatFps(fps: number): string {
  // 23.976 and friends should not render as "23.976000fps".
  return `${Number.isInteger(fps) ? fps : fps.toFixed(3).replace(/0+$/, '')}fps`;
}

/**
 * Deadlines are stored as a local ISO date-time, "YYYY-MM-DDTHH:mm".
 *
 * Earlier versions stored date-only "YYYY-MM-DD"; `toDueAt` upgrades those to
 * midnight so everything downstream can assume a time is present.
 */
const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;
const DATE_TIME = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

/**
 * Parses a stored deadline, or null if it is not a real one. Accepts the legacy
 * date-only form.
 *
 * Builds the Date from explicit components rather than letting the engine parse
 * the string: `new Date("2026-02-31T00:00")` silently rolls over to 3 March, and
 * string parsing differs between Hermes and other engines. Constructing then
 * checking every component round-trips rejects both rollovers and out-of-range
 * times without depending on engine behaviour.
 */
export function parseDueAt(value: unknown): Date | null {
  if (typeof value !== 'string') return null;

  const match = DATE_TIME.exec(DATE_ONLY.test(value) ? `${value}T00:00` : value);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);

  const date = new Date(year, month - 1, day, hour, minute);
  const roundTrips =
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day &&
    date.getHours() === hour &&
    date.getMinutes() === minute;

  return roundTrips ? date : null;
}

export function isValidDueAt(value: unknown): value is string {
  return parseDueAt(value) !== null;
}

/** Normalizes any accepted form to "YYYY-MM-DDTHH:mm", or null. */
export function toDueAt(value: unknown): string | null {
  const date = parseDueAt(value);
  return date === null ? null : formatDueAtValue(date);
}

/** A Date as the stored "YYYY-MM-DDTHH:mm", in local time. */
export function formatDueAtValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Full label for a sheet, e.g. "1 Dec 2026, 18:00". */
export function formatDueAt(value: unknown): string {
  const d = parseDueAt(value);
  if (!d) return '';
  const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}, ${time}`;
}

/** Compact label for a list row, e.g. "1 Dec 18:00". */
export function formatDueAtShort(value: unknown): string {
  const d = parseDueAt(value);
  if (!d) return '';
  const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${time}`;
}

/** Whole calendar days from today to a deadline. Negative once it has passed. */
export function daysUntil(value: unknown, today = new Date()): number | null {
  const due = parseDueAt(value);
  if (!due) return null;
  const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  const startDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((dueDay.getTime() - startDay.getTime()) / 86_400_000);
}

/** "in 12 days", "today", "3 days ago" — relative to the calendar day. */
export function formatDueRelative(value: unknown, today = new Date()): string {
  const days = daysUntil(value, today);
  if (days === null) return '';
  if (days === 0) return 'today';
  if (days === 1) return 'tomorrow';
  if (days === -1) return 'yesterday';
  return days > 0 ? `in ${days} days` : `${-days} days ago`;
}

