export type ParsedShot = {
  code: string;
  frames: number;
  stageIndex: number;
};

export type SkippedLine = {
  line: string;
  reason: string;
};

export type ParseResult = {
  shots: ParsedShot[];
  skipped: SkippedLine[];
};

/** First tokens of spreadsheet header rows, so a pasted header isn't imported as a shot. */
const HEADER_WORDS = new Set(['shot', 'shots', 'code', 'name', 'id', 'sq', 'seq', 'sequence']);

/** Splits on tabs, commas, semicolons, pipes, or runs of spaces. */
function tokenize(line: string): string[] {
  return line
    .split(/[\t,;|]+|\s{1,}/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}

/** "96", "96f", "96 frames" -> 96. Returns null if the token isn't a frame count. */
function asFrames(token: string): number | null {
  const match = /^(\d+)\s*(f|fr|frame|frames)?$/i.exec(token);
  if (!match) return null;
  const value = Number.parseInt(match[1], 10);
  return Number.isFinite(value) ? value : null;
}

/** Matches a stage by full name or unambiguous prefix, case-insensitively. */
function matchStage(text: string, stages: string[]): number | null {
  const needle = text.trim().toLowerCase();
  if (!needle) return null;

  const exact = stages.findIndex((s) => s.toLowerCase() === needle);
  if (exact >= 0) return exact;

  const prefixed = stages
    .map((s, i) => ({ i, s: s.toLowerCase() }))
    .filter((e) => e.s.startsWith(needle));
  return prefixed.length === 1 ? prefixed[0].i : null;
}

/**
 * Tries the whole remainder first, so a multi-word stage name still matches,
 * then falls back to individual tokens so stray words like "frames" in
 * "SH_0260 90 frames Polish" don't hide the stage.
 */
function findStage(tokens: string[], stages: string[]): number | null {
  const joined = matchStage(tokens.join(' '), stages);
  if (joined !== null) return joined;

  for (const token of tokens) {
    const hit = matchStage(token, stages);
    if (hit !== null) return hit;
  }
  return null;
}

/**
 * Parses a pasted shot list. Each line is `code [frames] [stage]`, separated by
 * tabs, commas, or spaces — so a column copied out of a spreadsheet works.
 *
 *   SH_0120  96   Splining
 *   SH_0130, 48f, Blocking
 *   SH_0140
 *
 * `existingCodes` are treated as duplicates and skipped, as are repeats within
 * the pasted text itself.
 */
export function parseShotList(
  text: string,
  stages: string[],
  existingCodes: string[] = []
): ParseResult {
  const shots: ParsedShot[] = [];
  const skipped: SkippedLine[] = [];
  const seen = new Set(existingCodes.map((c) => c.toLowerCase()));

  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;

    const tokens = tokenize(line);
    if (tokens.length === 0) continue;

    const [code, ...rest] = tokens;

    if (asFrames(code) !== null) {
      skipped.push({ line, reason: 'no shot code' });
      continue;
    }

    // A header row has a header-ish first cell and no frame count anywhere.
    if (HEADER_WORDS.has(code.toLowerCase()) && !rest.some((t) => asFrames(t) !== null)) {
      skipped.push({ line, reason: 'looks like a header' });
      continue;
    }

    if (seen.has(code.toLowerCase())) {
      skipped.push({ line, reason: 'duplicate code' });
      continue;
    }

    let frames = 0;
    const leftovers: string[] = [];
    let tookFrames = false;
    for (const token of rest) {
      const value = asFrames(token);
      if (!tookFrames && value !== null) {
        frames = value;
        tookFrames = true;
      } else {
        leftovers.push(token);
      }
    }

    const stageIndex = findStage(leftovers, stages) ?? 0;

    seen.add(code.toLowerCase());
    shots.push({ code, frames, stageIndex });
  }

  return { shots, skipped };
}
