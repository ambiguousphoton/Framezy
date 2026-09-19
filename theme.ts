import type { PipelineId } from './types';

/** Brand: rgb(255, 128, 149) on white. */
export const BRAND_PINK = '#ff8095';

export const colors = {
  bg: '#ffffff',
  /** White with a whisper of the brand pink, for inputs and wells. */
  surface: '#fff4f6',
  surfaceStrong: '#ffe7ec',
  text: '#33181e',
  muted: '#8f7278',
  faint: '#c4a8ae',
  hairline: '#ffdfe5',

  accent: BRAND_PINK,
  /** Darkened pink that passes AA as text on white (5.3:1). */
  accentDeep: '#c2385a',
  /** Disabled / inactive fill. */
  accentSoft: '#ffd3db',

  // Status colours come in pairs: the bright tone fills bars and badges, the
  // deep tone is used wherever the colour has to work as text on white.
  good: '#2fb574',
  goodDeep: '#1c7a4b',
  warn: '#e08a2e',
  warnDeep: '#8f560f',
  bad: '#d5344f',
  badDeep: '#b32444',
};

/** Pale to deep, all in the brand's pink family, so stage reads as "filling up". */
const STAGE_RAMP = ['#e3ccd1', '#ffc2ce', BRAND_PINK, '#f2637c', '#cf3c56', '#b32d4c'];

/** Picks a ramp colour by position, so 5- and 6-stage pipelines both end on deep rose. */
export function stageColor(stageIndex: number, stageCount: number): string {
  if (stageCount <= 1) return STAGE_RAMP[STAGE_RAMP.length - 1];
  const t = Math.min(stageIndex, stageCount - 1) / (stageCount - 1);
  return STAGE_RAMP[Math.round(t * (STAGE_RAMP.length - 1))];
}

/** Two shades of the brand family rather than an off-palette second hue. */
export const pipelineColor: Record<PipelineId, string> = {
  '3d': '#c2385a',
  '2d': BRAND_PINK,
};

/**
 * Identity colours for shots — the tag that says "this is that shot" on the row
 * stripe and the timeline block. Deliberately separate from the stage ramp,
 * which means progress.
 *
 * Generated rather than hand-picked: hues are evenly spaced from the brand rose,
 * and lightness alternates so adjacent entries differ in both hue and tone. Every
 * one clears 4.5:1 against `colors.text`, so `textOn` always returns dark here
 * and labels stay readable whichever colour a shot draws.
 */
export const SHOT_COLORS = [
  '#e66f83', // rose
  '#dfb799', // sand
  '#9fa426', // olive
  '#a6d68a', // sage
  '#24b045', // green
  '#58cfbb', // turquoise
  '#68a8d9', // sky
  '#c3c1ea', // periwinkle
  '#bf7ce6', // orchid
  '#e7a3d7', // mauve
];

/** Random identity colour, optionally avoiding one so neighbours don't match. */
export function randomShotColor(avoid?: string): string {
  const pool = avoid ? SHOT_COLORS.filter((c) => c !== avoid) : SHOT_COLORS;
  return pool[Math.floor(Math.random() * pool.length)];
}

/**
 * Colour for the nth item of a batch, walking the palette from a random start.
 * Used when pasting a shot list, so a run of new shots never repeats adjacently.
 */
export function batchShotColor(index: number, seed: number): string {
  return SHOT_COLORS[(seed + index) % SHOT_COLORS.length];
}

export function isShotColor(value: unknown): value is string {
  return typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value);
}

function channel(value: number): number {
  const c = value / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** WCAG relative luminance of a #rrggbb colour. */
function luminance(hex: string): number {
  const n = Number.parseInt(hex.replace('#', ''), 16);
  return (
    0.2126 * channel((n >> 16) & 0xff) +
    0.7152 * channel((n >> 8) & 0xff) +
    0.0722 * channel(n & 0xff)
  );
}

/**
 * Readable text colour for a given background. The brand pink is light enough
 * that white-on-pink fails contrast, so fills get dark text and only genuinely
 * dark backgrounds get white.
 */
export function textOn(background: string): string {
  return luminance(background) > 0.25 ? colors.text : '#ffffff';
}

/** Low-opacity version of a colour, for selected-row tints. */
export function tintOf(hex: string): string {
  return `${hex}1f`;
}
