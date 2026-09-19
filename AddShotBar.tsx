import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { ComposerCollapsed, ComposerExpanded, composerStyles as cs } from './Composer';
import { colors, pipelineColor, textOn } from './theme';
import { FPS_PRESETS, PIPELINES, PIPELINE_IDS, formatFps, type PipelineId } from './types';

type Props = {
  /** Project's pipeline, pre-selected for new shots. */
  defaultPipeline: PipelineId;
  /** Project's frame rate, pre-selected for new shots. */
  defaultFps: number;
  onAdd: (input: { code: string; frames: number; pipeline: PipelineId; fps: number }) => void;
  onPasteList: () => void;
};

export function AddShotBar({ defaultPipeline, defaultFps, onAdd, onPasteList }: Props) {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState('');
  const [frames, setFrames] = useState('');
  const [pipeline, setPipeline] = useState<PipelineId>(defaultPipeline);
  const [fps, setFps] = useState(defaultFps);

  // Follow the project defaults when they change, rather than stranding an old pick.
  useEffect(() => {
    setPipeline(defaultPipeline);
  }, [defaultPipeline]);

  useEffect(() => {
    setFps(defaultFps);
  }, [defaultFps]);

  const frameCount = Number.parseInt(frames, 10);
  const canAdd = code.trim().length > 0;

  const reset = () => {
    setCode('');
    setFrames('');
    setPipeline(defaultPipeline);
    setFps(defaultFps);
    setOpen(false);
  };

  const submit = () => {
    if (!canAdd) return;
    onAdd({ code, frames: Number.isFinite(frameCount) ? frameCount : 0, pipeline, fps });
    // Stay open so a run of shots can be typed in without reopening each time.
    setCode('');
    setFrames('');
    setPipeline(defaultPipeline);
    setFps(defaultFps);
  };

  if (!open) {
    return (
      <ComposerCollapsed
        label="New shot"
        onPress={() => setOpen(true)}
        secondaryLabel="Paste list"
        onSecondaryPress={onPasteList}
      />
    );
  }

  return (
    <ComposerExpanded
      hint={`New shots use ${formatFps(fps)}. Adding keeps the form open, so you can type a run of shots.`}
      submitLabel="Add shot"
      canSubmit={canAdd}
      onSubmit={submit}
      onCancel={reset}>
      <View style={cs.row}>
        <TextInput
          style={[cs.input, styles.codeInput]}
          value={code}
          onChangeText={setCode}
          placeholder="Shot code, e.g. SH_0120"
          placeholderTextColor={colors.faint}
          autoCapitalize="characters"
          autoCorrect={false}
          autoFocus
          returnKeyType="next"
        />
        <TextInput
          style={[cs.input, styles.framesInput]}
          value={frames}
          onChangeText={(text) => setFrames(text.replace(/[^0-9]/g, ''))}
          placeholder="96f"
          placeholderTextColor={colors.faint}
          keyboardType="number-pad"
          returnKeyType="done"
          onSubmitEditing={submit}
        />
      </View>

      <View style={styles.fpsRow}>
        <Text style={styles.fpsLabel}>Rate</Text>
        {FPS_PRESETS.map((preset) => {
          const selected = fps === preset;
          return (
            <Pressable
              key={preset}
              onPress={() => setFps(preset)}
              style={[styles.fpsChip, selected && styles.fpsChipSelected]}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={formatFps(preset)}>
              <Text style={[styles.fpsChipText, selected && styles.fpsChipTextSelected]}>
                {preset}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={cs.segment}>
        {PIPELINE_IDS.map((id) => {
          const selected = pipeline === id;
          return (
            <Pressable
              key={id}
              onPress={() => setPipeline(id)}
              style={[cs.segmentItem, selected && { backgroundColor: pipelineColor[id] }]}
              accessibilityRole="radio"
              accessibilityState={{ selected }}>
              <Text
                style={[
                  cs.segmentText,
                  selected && { color: textOn(pipelineColor[id]), fontWeight: '700' },
                ]}>
                {PIPELINES[id].label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </ComposerExpanded>
  );
}

const styles = StyleSheet.create({
  codeInput: {
    flex: 1,
  },
  fpsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  fpsLabel: {
    fontSize: 12,
    color: colors.muted,
    marginRight: 2,
  },
  fpsChip: {
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.surface,
  },
  fpsChipSelected: {
    backgroundColor: colors.accent,
  },
  fpsChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.muted,
    fontVariant: ['tabular-nums'],
  },
  fpsChipTextSelected: {
    color: textOn(colors.accent),
    fontWeight: '700',
  },
  framesInput: {
    width: 84,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
});
