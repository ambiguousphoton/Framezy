import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Reorderable } from './Reorderable';
import { colors, stageColor, textOn } from './theme';
import {
  formatDuration,
  formatFps,
  formatFrames,
  isFinal,
  openNoteCount,
  progressOf,
  secondsOf,
  stageName,
  type Shot,
} from './types';

/**
 * Blocks are scaled by DURATION, not frame count. Shots may run at different
 * frame rates, so frames are not proportional to screen time — scaling by frames
 * would make the second-ruler below lie about where each shot starts.
 */
const PX_PER_SECOND = 38.4;
/** Shots with no frame count still need a tappable block. */
const MIN_BLOCK_WIDTH = 56;
const TRACK_HEIGHT = 76;

const BLOCK_GAP = 2;

type Props = {
  shots: Shot[];
  onOpen: (id: string) => void;
  onReorder: (from: number, to: number) => void;
};

function widthOf(shot: Shot): number {
  return Math.max(MIN_BLOCK_WIDTH, secondsOf(shot) * PX_PER_SECOND);
}

export function Timeline({ shots, onOpen, onReorder }: Props) {
  const totalFrames = shots.reduce((sum, s) => sum + s.frames, 0);
  const totalSeconds = shots.reduce((sum, s) => sum + secondsOf(s), 0);
  const totalWidth = shots.reduce((sum, s) => sum + widthOf(s), 0);
  // One tick per second of screen time, labelled every 5s to avoid a crowded ruler.
  const seconds = Math.ceil(totalSeconds);
  // Frame rates in play, so a mixed-rate timeline says so rather than implying one.
  const rates = [...new Set(shots.map((s) => s.fps))].sort((a, b) => a - b);

  return (
    <View style={styles.wrap}>
      <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={styles.scroll}>
        <View>
          <View style={[styles.ruler, { width: Math.max(totalWidth, 1) }]}>
            {Array.from({ length: seconds + 1 }, (_, s) => (
              <View
                key={s}
                style={[styles.tick, { left: s * PX_PER_SECOND }, s % 5 === 0 && styles.tickMajor]}>
                {s % 5 === 0 ? <Text style={styles.tickLabel}>{s}s</Text> : null}
              </View>
            ))}
          </View>

          <View style={styles.track}>
            <Reorderable
              items={shots}
              keyOf={(shot) => shot.id}
              axis="horizontal"
              gap={BLOCK_GAP}
              sizeOf={widthOf}
              onReorder={onReorder}
              renderItem={(shot, _index, dragging) => {
                const label = textOn(shot.color);
                const width = widthOf(shot);
                const openNotes = openNoteCount(shot);

                return (
                  <Pressable
                    onPress={() => onOpen(shot.id)}
                    style={[
                      styles.block,
                      { width, backgroundColor: shot.color },
                      dragging && styles.blockDragging,
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={`${shot.code}, ${stageName(shot)}, ${formatFrames(shot.frames)}`}>
                    {/* Fill shows how far through its pipeline this shot is. */}
                    <View style={[styles.blockProgress, { width: `${progressOf(shot) * 100}%` }]} />

                    <View style={styles.blockContent}>
                      <Text style={[styles.blockCode, { color: label }]} numberOfLines={1}>
                        {shot.code}
                      </Text>
                      {width >= 90 ? (
                        <Text style={[styles.blockStage, { color: label }]} numberOfLines={1}>
                          {stageName(shot)}
                        </Text>
                      ) : null}
                      <Text style={[styles.blockFrames, { color: label }]} numberOfLines={1}>
                        {formatFrames(shot.frames)}
                        {width >= 110 ? ` · ${formatFps(shot.fps)}` : ''}
                      </Text>
                    </View>

                    {openNotes > 0 ? (
                      <View style={styles.noteDot}>
                        <Text style={[styles.noteDotText, { color: textOn(colors.warn) }]}>
                          {openNotes}
                        </Text>
                      </View>
                    ) : null}

                    {/* Keyframe diamond marks the shot boundary, like a timeline key. */}
                    <View style={[styles.diamond, isFinal(shot) && styles.diamondFinal]} />
                  </Pressable>
                );
              }}
            />
          </View>
        </View>
      </ScrollView>

      <Text style={styles.footer}>
        {shots.length} shot{shots.length === 1 ? '' : 's'} · {formatFrames(totalFrames)} ·{' '}
        {formatDuration(totalSeconds)} at {rates.map(formatFps).join(' / ')} — tap to open, hold then
        drag to reorder
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingVertical: 12,
    gap: 8,
  },
  scroll: {
    paddingHorizontal: 16,
  },
  ruler: {
    height: 18,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.hairline,
  },
  tick: {
    position: 'absolute',
    bottom: 0,
    width: StyleSheet.hairlineWidth,
    height: 5,
    backgroundColor: colors.hairline,
  },
  tickMajor: {
    height: 10,
    backgroundColor: colors.faint,
  },
  tickLabel: {
    position: 'absolute',
    bottom: 10,
    left: 2,
    fontSize: 9,
    color: colors.faint,
    fontVariant: ['tabular-nums'],
  },
  track: {
    height: TRACK_HEIGHT,
    paddingTop: 6,
  },
  block: {
    height: TRACK_HEIGHT - 6,
    borderRadius: 8,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  blockDragging: {
    opacity: 0.9,
  },
  blockProgress: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    // A translucent white wash reads as "done" over any stage colour.
    backgroundColor: 'rgba(255,255,255,0.28)',
  },
  blockContent: {
    paddingHorizontal: 8,
    gap: 1,
  },
  blockCode: {
    fontSize: 12,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  blockStage: {
    fontSize: 10,
    fontWeight: '600',
    opacity: 0.85,
  },
  blockFrames: {
    fontSize: 10,
    fontVariant: ['tabular-nums'],
    opacity: 0.8,
  },
  noteDot: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 4,
    borderRadius: 8,
    backgroundColor: colors.warn,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noteDotText: {
    fontSize: 10,
    fontWeight: '700',
  },
  diamond: {
    position: 'absolute',
    right: -5,
    top: '50%',
    width: 10,
    height: 10,
    marginTop: -5,
    backgroundColor: colors.bg,
    borderWidth: 1.5,
    borderColor: colors.accentDeep,
    transform: [{ rotate: '45deg' }],
  },
  diamondFinal: {
    backgroundColor: colors.accentDeep,
  },
  footer: {
    paddingHorizontal: 16,
    fontSize: 11,
    color: colors.faint,
    fontVariant: ['tabular-nums'],
  },
});
