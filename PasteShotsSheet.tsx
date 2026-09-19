import { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { parseShotList, type ParsedShot } from './parseShotList';
import { colors, stageColor, textOn } from './theme';
import { PIPELINES, formatFrames, formatSeconds, type PipelineId } from './types';

type Props = {
  visible: boolean;
  pipeline: PipelineId;
  /** Codes already in the project, treated as duplicates. */
  existingCodes: string[];
  onClose: () => void;
  onImport: (shots: ParsedShot[]) => void;
};

const PLACEHOLDER = `SH_0120  96  Splining
SH_0130, 48f, Blocking
SH_0140\t120
SH_0150`;

export function PasteShotsSheet({
  visible,
  pipeline,
  existingCodes,
  onClose,
  onImport,
}: Props) {
  const [text, setText] = useState('');
  const stages = PIPELINES[pipeline].stages;

  const result = useMemo(
    () => parseShotList(text, stages, existingCodes),
    [text, stages, existingCodes]
  );
  const totalFrames = result.shots.reduce((sum, s) => sum + s.frames, 0);

  const close = () => {
    setText('');
    onClose();
  };

  const submit = () => {
    if (result.shots.length === 0) return;
    onImport(result.shots);
    setText('');
    onClose();
  };

  if (!visible) return null;

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={close}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.topBar}>
          <Text style={styles.title}>Paste shots</Text>
          <Pressable onPress={close} hitSlop={8} accessibilityRole="button">
            <Text style={styles.close}>Cancel</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <Text style={styles.help}>
            One shot per line: <Text style={styles.mono}>code frames stage</Text>. Frames and stage
            are optional. Tabs, commas, or spaces all work, so a column copied straight out of a
            spreadsheet pastes cleanly.
          </Text>

          <TextInput
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder={PLACEHOLDER}
            placeholderTextColor={colors.faint}
            multiline
            autoCapitalize="characters"
            autoCorrect={false}
            textAlignVertical="top"
          />

          <Text style={styles.stagesHint}>
            {PIPELINES[pipeline].label} stages: {stages.join(' · ')}
          </Text>

          {result.shots.length > 0 ? (
            <View style={styles.previewBlock}>
              <Text style={styles.previewTitle}>
                {result.shots.length} shot{result.shots.length === 1 ? '' : 's'} ·{' '}
                {formatFrames(totalFrames)} · {formatSeconds(totalFrames)}
              </Text>
              {result.shots.map((shot) => {
                const tint = stageColor(shot.stageIndex, stages.length);
                return (
                  <View key={shot.code} style={styles.previewRow}>
                    <Text style={styles.previewCode}>{shot.code}</Text>
                    <Text style={styles.previewFrames}>
                      {shot.frames > 0 ? formatFrames(shot.frames) : '—'}
                    </Text>
                    <View style={[styles.previewStage, { backgroundColor: tint }]}>
                      <Text style={[styles.previewStageText, { color: textOn(tint) }]}>
                        {stages[shot.stageIndex]}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          ) : null}

          {result.skipped.length > 0 ? (
            <View style={styles.skippedBlock}>
              <Text style={styles.skippedTitle}>
                {result.skipped.length} line{result.skipped.length === 1 ? '' : 's'} skipped
              </Text>
              {result.skipped.map((entry, index) => (
                <Text key={`${entry.line}-${index}`} style={styles.skippedRow} numberOfLines={1}>
                  {entry.reason} — {entry.line}
                </Text>
              ))}
            </View>
          ) : null}
        </ScrollView>

        <View style={styles.footer}>
          <Pressable
            onPress={submit}
            disabled={result.shots.length === 0}
            style={[styles.importButton, result.shots.length === 0 && styles.importButtonDisabled]}
            accessibilityRole="button">
            <Text style={[styles.importButtonText, { color: textOn(colors.accent) }]}>
              {result.shots.length === 0
                ? 'Nothing to import'
                : `Import ${result.shots.length} shot${result.shots.length === 1 ? '' : 's'}`}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.hairline,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  close: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.muted,
  },
  body: {
    padding: 16,
    gap: 12,
    paddingBottom: 32,
  },
  help: {
    fontSize: 13,
    color: colors.muted,
    lineHeight: 19,
  },
  mono: {
    fontWeight: '700',
    color: colors.text,
  },
  input: {
    minHeight: 150,
    padding: 12,
    borderRadius: 10,
    backgroundColor: colors.surface,
    fontSize: 15,
    color: colors.text,
    lineHeight: 21,
  },
  stagesHint: {
    fontSize: 11,
    color: colors.faint,
  },
  previewBlock: {
    gap: 6,
    paddingTop: 4,
  },
  previewTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.accentDeep,
    fontVariant: ['tabular-nums'],
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  previewCode: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  previewFrames: {
    fontSize: 13,
    color: colors.muted,
    fontVariant: ['tabular-nums'],
  },
  previewStage: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    minWidth: 84,
    alignItems: 'center',
  },
  previewStageText: {
    fontSize: 11,
    fontWeight: '700',
  },
  skippedBlock: {
    gap: 4,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.hairline,
  },
  skippedTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.warnDeep,
  },
  skippedRow: {
    fontSize: 12,
    color: colors.muted,
  },
  footer: {
    padding: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.hairline,
  },
  importButton: {
    height: 48,
    borderRadius: 10,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  importButtonDisabled: {
    backgroundColor: colors.accentSoft,
  },
  importButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
});
