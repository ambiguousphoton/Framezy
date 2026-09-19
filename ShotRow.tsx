import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, pipelineColor, stageColor, textOn } from './theme';
import {
  PIPELINES,
  formatDueAtShort,
  formatFps,
  formatFrames,
  formatSeconds,
  formatVersion,
  isFinal,
  progressOf,
  stageName,
  type Shot,
} from './types';

type Props = {
  shot: Shot;
  /** Tap the stage pill to advance one stage. */
  onAdvance: (id: string) => void;
  /** Tap the row to open the shot detail sheet. */
  onOpen: (id: string) => void;
};

export function ShotRow({ shot, onAdvance, onOpen }: Props) {
  const pipeline = PIPELINES[shot.pipeline];
  const progress = progressOf(shot);
  const tint = stageColor(shot.stageIndex, pipeline.stages.length);
  const openNotes = shot.notes.filter((n) => !n.addressed).length;

  return (
    <Pressable
      style={styles.row}
      onPress={() => onOpen(shot.id)}
      accessibilityRole="button"
      accessibilityLabel={`${shot.code}, ${stageName(shot)}, ${formatVersion(shot.version)}`}>
      <View style={[styles.stripe, { backgroundColor: shot.color }]} />

      <View style={styles.headerLine}>
        <Text style={[styles.code, isFinal(shot) && styles.codeFinal]} numberOfLines={1}>
          {shot.code}
        </Text>
        <View style={[styles.pipelineTag, { backgroundColor: pipelineColor[shot.pipeline] }]}>
          <Text style={[styles.pipelineTagText, { color: textOn(pipelineColor[shot.pipeline]) }]}>
            {pipeline.short}
          </Text>
        </View>
        <Text style={styles.frames}>
          {formatFrames(shot.frames)} · {formatSeconds(shot.frames, shot.fps)}
        </Text>
        <View style={styles.spacer} />
        {openNotes > 0 ? (
          <View style={styles.noteBadge}>
            <Text style={[styles.noteBadgeText, { color: textOn(colors.warn) }]}>{openNotes}</Text>
          </View>
        ) : null}
        <Text style={styles.version}>{formatVersion(shot.version)}</Text>
      </View>

      {shot.description ? (
        <Text style={styles.description} numberOfLines={2}>
          {shot.description}
        </Text>
      ) : null}

      <View style={styles.track}>
        <View style={[styles.fill, { width: `${progress * 100}%`, backgroundColor: tint }]} />
      </View>

      <View style={styles.footerLine}>
        <Pressable
          onPress={() => onAdvance(shot.id)}
          hitSlop={8}
          style={[styles.stagePill, { backgroundColor: tint }]}
          accessibilityRole="button"
          accessibilityLabel={`Advance ${shot.code} past ${stageName(shot)}`}>
          <Text style={[styles.stagePillText, { color: textOn(tint) }]}>{stageName(shot)}</Text>
          <Text style={[styles.stagePillArrow, { color: textOn(tint) }]}>
            {isFinal(shot) ? '✓' : '→'}
          </Text>
        </Pressable>
        <Text style={styles.stageCount}>
          {Math.min(shot.stageIndex + 1, pipeline.stages.length)}/{pipeline.stages.length}
        </Text>
        <Text style={styles.fps}>{formatFps(shot.fps)}</Text>
        {shot.due ? <Text style={styles.due}>due {formatDueAtShort(shot.due)}</Text> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingLeft: 24,
    paddingRight: 16,
    paddingVertical: 12,
    gap: 8,
  },
  stripe: {
    position: 'absolute',
    left: 8,
    top: 12,
    bottom: 12,
    width: 4,
    borderRadius: 2,
  },
  headerLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  code: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text,
    fontVariant: ['tabular-nums'],
    flexShrink: 1,
  },
  codeFinal: {
    color: colors.muted,
  },
  pipelineTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  pipelineTagText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  frames: {
    fontSize: 14,
    color: colors.muted,
    fontVariant: ['tabular-nums'],
  },
  spacer: {
    flex: 1,
  },
  noteBadge: {
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
    borderRadius: 10,
    backgroundColor: colors.warn,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noteBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  version: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.faint,
    fontVariant: ['tabular-nums'],
  },
  description: {
    fontSize: 13,
    color: colors.muted,
    lineHeight: 18,
  },
  track: {
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.hairline,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 2,
  },
  footerLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stagePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 14,
  },
  stagePillText: {
    fontSize: 13,
    fontWeight: '600',
  },
  stagePillArrow: {
    fontSize: 13,
    fontWeight: '700',
  },
  stageCount: {
    fontSize: 12,
    color: colors.faint,
    fontVariant: ['tabular-nums'],
  },
  fps: {
    fontSize: 12,
    color: colors.faint,
    fontVariant: ['tabular-nums'],
  },
  due: {
    fontSize: 12,
    color: colors.faint,
    marginLeft: 'auto',
    fontVariant: ['tabular-nums'],
  },
});
