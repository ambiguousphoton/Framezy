import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { ComposerCollapsed, ComposerExpanded, composerStyles as cs } from './Composer';
import { colors, pipelineColor, textOn } from './theme';
import {
  DEFAULT_FPS,
  FPS_PRESETS,
  PIPELINES,
  PIPELINE_IDS,
  formatFps,
  type PipelineId,
} from './types';

type Props = {
  onAdd: (name: string, pipeline: PipelineId, fps: number) => void;
};

export function AddProjectBar({ onAdd }: Props) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [pipeline, setPipeline] = useState<PipelineId>('3d');
  const [fps, setFps] = useState(DEFAULT_FPS);

  const canAdd = name.trim().length > 0;

  const reset = () => {
    setName('');
    setFps(DEFAULT_FPS);
    setOpen(false);
  };

  const submit = () => {
    if (!canAdd) return;
    onAdd(name, pipeline, fps);
    reset();
  };

  if (!open) {
    return <ComposerCollapsed label="New project" onPress={() => setOpen(true)} />;
  }

  return (
    <ComposerExpanded
      hint={`New shots default to ${PIPELINES[pipeline].label} at ${formatFps(fps)}. Both stay editable per shot.`}
      submitLabel="Create project"
      canSubmit={canAdd}
      onSubmit={submit}
      onCancel={reset}>
      <TextInput
        style={cs.input}
        value={name}
        onChangeText={setName}
        placeholder="Project name, e.g. Ember — Ep 02"
        placeholderTextColor={colors.faint}
        autoFocus
        returnKeyType="done"
        onSubmitEditing={submit}
      />
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
});
