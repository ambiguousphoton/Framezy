import { useEffect, useState } from 'react';
import {
  Alert,
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

import { DateTimeField } from './DateTimeField';
import { SHOT_COLORS, colors, pipelineColor, stageColor, textOn, tintOf } from './theme';
import {
  FPS_PRESETS,
  PIPELINES,
  PIPELINE_IDS,
  formatFps,
  formatFrames,
  formatSeconds,
  formatVersion,
  toDueAt,
  isValidFps,
  type Note,
  type PipelineId,
  type Shot,
} from './types';

/** The editable slice of a shot. Held as a draft until the user saves. */
type Draft = {
  description: string;
  frames: number;
  fps: number;
  color: string;
  pipeline: PipelineId;
  stageIndex: number;
  version: number;
  due: string | null;
  notes: Note[];
};

function draftOf(shot: Shot): Draft {
  return {
    description: shot.description,
    frames: shot.frames,
    fps: shot.fps,
    color: shot.color,
    pipeline: shot.pipeline,
    stageIndex: shot.stageIndex,
    version: shot.version,
    due: shot.due,
    notes: shot.notes,
  };
}

function isDirty(draft: Draft, shot: Shot): boolean {
  return JSON.stringify(draft) !== JSON.stringify(draftOf(shot));
}

type Props = {
  shot: Shot | null;
  onClose: () => void;
  onSave: (id: string, patch: Draft) => void;
  onRemove: (id: string) => void;
};

export function ShotDetail({ shot, onClose, onSave, onRemove }: Props) {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [noteFrame, setNoteFrame] = useState('');
  const [noteText, setNoteText] = useState('');
  const [framesDraft, setFramesDraft] = useState('');
  const [fpsDraft, setFpsDraft] = useState('');

  // Rebuild the draft whenever a different shot is opened.
  useEffect(() => {
    if (!shot) {
      setDraft(null);
      return;
    }
    setDraft(draftOf(shot));
    setFramesDraft(String(shot.frames));
    setFpsDraft(String(shot.fps));
    setNoteFrame('');
    setNoteText('');
  }, [shot?.id]);

  if (!shot || !draft) return null;

  const pipeline = PIPELINES[draft.pipeline];
  const stages = pipeline.stages;
  const dirty = isDirty(draft, shot);
  const openNotes = draft.notes.filter((n) => !n.addressed);
  const doneNotes = draft.notes.filter((n) => n.addressed);

  const patch = (changes: Partial<Draft>) =>
    setDraft((prev) => (prev ? { ...prev, ...changes } : prev));

  const setPipeline = (id: PipelineId) =>
    patch({
      pipeline: id,
      // 3D and 2D differ in length, so clamp rather than point past the end.
      stageIndex: Math.min(draft.stageIndex, PIPELINES[id].stages.length - 1),
    });

  const commitFrames = () => {
    const parsed = Number.parseInt(framesDraft, 10);
    if (Number.isFinite(parsed) && parsed >= 0) patch({ frames: parsed });
    else setFramesDraft(String(draft.frames));
  };

  const commitFps = () => {
    const parsed = Number.parseFloat(fpsDraft);
    if (isValidFps(parsed)) patch({ fps: parsed });
    else setFpsDraft(String(draft.fps));
  };

  const addNote = () => {
    if (!noteText.trim()) return;
    const frame = Number.parseInt(noteFrame, 10);
    patch({
      notes: [
        ...draft.notes,
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          frame: Number.isFinite(frame) ? frame : null,
          text: noteText.trim(),
          addressed: false,
        },
      ],
    });
    setNoteFrame('');
    setNoteText('');
  };

  const save = () => {
    // Flush any field still focused so a pending edit isn't silently dropped.
    const parsedFrames = Number.parseInt(framesDraft, 10);
    const parsedFps = Number.parseFloat(fpsDraft);
    onSave(shot.id, {
      ...draft,
      frames: Number.isFinite(parsedFrames) && parsedFrames >= 0 ? parsedFrames : draft.frames,
      fps: isValidFps(parsedFps) ? parsedFps : draft.fps,
      due: toDueAt(draft.due),
    });
    onClose();
  };

  const discard = () => {
    if (!dirty) {
      onClose();
      return;
    }
    Alert.alert('Discard changes?', `Your edits to ${shot.code} will be lost.`, [
      { text: 'Keep editing', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: onClose },
    ]);
  };

  const confirmDelete = () => {
    const noteCount = shot.notes.length;
    Alert.alert(
      `Delete ${shot.code}?`,
      noteCount > 0
        ? `This also deletes ${noteCount} note${noteCount === 1 ? '' : 's'}. This cannot be undone.`
        : 'This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            onRemove(shot.id);
            onClose();
          },
        },
      ]
    );
  };

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={discard}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.topBar}>
          <View style={styles.titleGroup}>
            <View style={[styles.colorDot, { backgroundColor: draft.color }]} />
            <Text style={styles.title}>{shot.code}</Text>
            <View style={[styles.pipelineTag, { backgroundColor: pipelineColor[draft.pipeline] }]}>
              <Text
                style={[styles.pipelineTagText, { color: textOn(pipelineColor[draft.pipeline]) }]}>
                {pipeline.short}
              </Text>
            </View>
          </View>
          <Pressable
            onPress={discard}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Close without saving">
            <Text style={styles.close}>✕</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <Section title="Description">
            <TextInput
              style={styles.descriptionInput}
              value={draft.description}
              onChangeText={(description) => patch({ description })}
              placeholder="What happens in this shot…"
              placeholderTextColor={colors.faint}
              multiline
              textAlignVertical="top"
            />
          </Section>

          <Section title="Colour">
            <View style={styles.swatchRow}>
              {SHOT_COLORS.map((swatch) => {
                const selected = draft.color === swatch;
                return (
                  <Pressable
                    key={swatch}
                    onPress={() => patch({ color: swatch })}
                    style={[
                      styles.swatch,
                      { backgroundColor: swatch },
                      selected && styles.swatchSelected,
                    ]}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    accessibilityLabel={`Colour ${swatch}`}>
                    {selected ? (
                      <Text style={[styles.swatchCheck, { color: textOn(swatch) }]}>✓</Text>
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          </Section>

          <Section title="Pipeline">
            <View style={styles.pipelineRow}>
              {PIPELINE_IDS.map((id) => {
                const selected = draft.pipeline === id;
                return (
                  <Pressable
                    key={id}
                    onPress={() => setPipeline(id)}
                    style={[
                      styles.pipelineOption,
                      selected && { backgroundColor: pipelineColor[id] },
                    ]}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}>
                    <Text
                      style={[
                        styles.pipelineOptionText,
                        selected && { color: textOn(pipelineColor[id]), fontWeight: '700' },
                      ]}>
                      {PIPELINES[id].label}
                    </Text>
                    <Text
                      style={[
                        styles.pipelineOptionMeta,
                        selected && { color: textOn(pipelineColor[id]) },
                      ]}>
                      {PIPELINES[id].stages.length} stages
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Section>

          <Section title="Stage">
            {stages.map((name, index) => {
              const selected = index === draft.stageIndex;
              const passed = index < draft.stageIndex;
              const tint = stageColor(index, stages.length);
              return (
                <Pressable
                  key={name}
                  onPress={() => patch({ stageIndex: index })}
                  style={[styles.stageRow, selected && { backgroundColor: tintOf(tint) }]}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}>
                  <View
                    style={[
                      styles.stageDot,
                      { borderColor: tint },
                      (selected || passed) && { backgroundColor: tint },
                    ]}
                  />
                  <Text
                    style={[
                      styles.stageLabel,
                      passed && styles.stageLabelPassed,
                      selected && styles.stageLabelSelected,
                    ]}>
                    {name}
                  </Text>
                  {selected ? <Text style={styles.stageNow}>current</Text> : null}
                </Pressable>
              );
            })}
          </Section>

          <Section title="Shot">
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Frames</Text>
              <TextInput
                style={styles.fieldInput}
                value={framesDraft}
                onChangeText={(text) => setFramesDraft(text.replace(/[^0-9]/g, ''))}
                onBlur={commitFrames}
                onSubmitEditing={commitFrames}
                keyboardType="number-pad"
                returnKeyType="done"
              />
              <Text style={styles.fieldHint}>
                {formatSeconds(draft.frames, draft.fps)} at {formatFps(draft.fps)}
              </Text>
            </View>

            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Rate</Text>
              <TextInput
                style={styles.fieldInput}
                value={fpsDraft}
                onChangeText={(text) => setFpsDraft(text.replace(/[^0-9.]/g, ''))}
                onBlur={commitFps}
                onSubmitEditing={commitFps}
                keyboardType="decimal-pad"
                returnKeyType="done"
              />
              <View style={styles.fpsPresets}>
                {FPS_PRESETS.map((preset) => {
                  const selected = draft.fps === preset;
                  return (
                    <Pressable
                      key={preset}
                      onPress={() => {
                        patch({ fps: preset });
                        setFpsDraft(String(preset));
                      }}
                      style={[styles.fpsChip, selected && styles.fpsChipSelected]}
                      accessibilityRole="radio"
                      accessibilityState={{ selected }}
                      accessibilityLabel={formatFps(preset)}>
                      <Text
                        style={[styles.fpsChipText, selected && styles.fpsChipTextSelected]}>
                        {preset}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.dueBlock}>
              <Text style={styles.fieldLabel}>Due</Text>
              <DateTimeField
                value={draft.due}
                onChange={(due) => patch({ due })}
                placeholder="Undated"
              />
            </View>

            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Version</Text>
              <Text style={styles.versionValue}>{formatVersion(draft.version)}</Text>
              <Pressable
                onPress={() => patch({ version: draft.version + 1 })}
                style={styles.submitButton}
                accessibilityRole="button">
                <Text style={[styles.submitButtonText, { color: textOn(colors.accent) }]}>
                  Submit to dailies →
                </Text>
              </Pressable>
            </View>
          </Section>

          <Section
            title={`Dailies notes${openNotes.length > 0 ? ` · ${openNotes.length} open` : ''}`}>
            <View style={styles.noteComposer}>
              <TextInput
                style={styles.noteFrameInput}
                value={noteFrame}
                onChangeText={(text) => setNoteFrame(text.replace(/[^0-9]/g, ''))}
                placeholder="f—"
                placeholderTextColor={colors.faint}
                keyboardType="number-pad"
              />
              <TextInput
                style={styles.noteTextInput}
                value={noteText}
                onChangeText={setNoteText}
                placeholder="Contact pose floaty…"
                placeholderTextColor={colors.faint}
                returnKeyType="done"
                onSubmitEditing={addNote}
              />
              <Pressable
                onPress={addNote}
                disabled={!noteText.trim()}
                style={[styles.noteAdd, !noteText.trim() && styles.noteAddDisabled]}
                accessibilityRole="button"
                accessibilityLabel="Add note">
                <Text style={[styles.noteAddText, { color: textOn(colors.accent) }]}>+</Text>
              </Pressable>
            </View>

            {draft.notes.length === 0 ? (
              <Text style={styles.emptyNotes}>No notes yet.</Text>
            ) : (
              [...openNotes, ...doneNotes].map((note) => (
                <View key={note.id} style={styles.noteRow}>
                  <Pressable
                    style={styles.noteMain}
                    onPress={() =>
                      patch({
                        notes: draft.notes.map((n) =>
                          n.id === note.id ? { ...n, addressed: !n.addressed } : n
                        ),
                      })
                    }
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: note.addressed }}>
                    <View style={[styles.noteBox, note.addressed && styles.noteBoxDone]}>
                      {note.addressed ? (
                        <Text style={[styles.noteCheck, { color: textOn(colors.good) }]}>✓</Text>
                      ) : null}
                    </View>
                    {note.frame !== null ? (
                      <Text style={[styles.noteFrame, note.addressed && styles.noteMuted]}>
                        f{note.frame}
                      </Text>
                    ) : null}
                    <Text style={[styles.noteText, note.addressed && styles.noteTextDone]}>
                      {note.text}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => patch({ notes: draft.notes.filter((n) => n.id !== note.id) })}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel={`Delete note ${note.text}`}>
                    <Text style={styles.noteDelete}>✕</Text>
                  </Pressable>
                </View>
              ))
            )}
          </Section>

          <Pressable
            onPress={save}
            disabled={!dirty}
            style={[styles.saveButton, !dirty && styles.saveButtonDisabled]}
            accessibilityRole="button">
            <Text style={[styles.saveButtonText, { color: textOn(colors.accent) }]}>
              {dirty ? 'Save changes' : 'No changes'}
            </Text>
          </Pressable>

          <Pressable onPress={confirmDelete} style={styles.deleteShot} accessibilityRole="button">
            <Text style={styles.deleteShotText}>Delete {shot.code}</Text>
          </Pressable>

          <Text style={styles.footNote}>
            {formatFrames(draft.frames)} at {formatFps(draft.fps)} · {stages.length} stages ·{' '}
            {draft.notes.length} notes
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
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
  titleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
  },
  colorDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    fontVariant: ['tabular-nums'],
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
  close: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.muted,
  },
  body: {
    paddingBottom: 48,
  },
  section: {
    paddingTop: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  sectionBody: {
    paddingHorizontal: 8,
  },
  descriptionInput: {
    marginHorizontal: 8,
    minHeight: 88,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: colors.surface,
    fontSize: 15,
    color: colors.text,
    lineHeight: 21,
  },
  swatchRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingHorizontal: 8,
  },
  swatch: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatchSelected: {
    borderWidth: 3,
    borderColor: colors.text,
  },
  swatchCheck: {
    fontSize: 15,
    fontWeight: '700',
  },
  pipelineRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 8,
  },
  pipelineOption: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: colors.surface,
    gap: 2,
  },
  pipelineOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  pipelineOptionMeta: {
    fontSize: 11,
    color: colors.muted,
  },
  stageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 11,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  stageDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
  },
  stageLabel: {
    fontSize: 16,
    color: colors.text,
  },
  stageLabelPassed: {
    color: colors.muted,
  },
  stageLabelSelected: {
    color: colors.accentDeep,
    fontWeight: '700',
  },
  stageNow: {
    marginLeft: 'auto',
    fontSize: 12,
    fontWeight: '600',
    color: colors.accentDeep,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  fieldLabel: {
    fontSize: 16,
    color: colors.text,
    width: 68,
  },
  fieldInput: {
    height: 38,
    width: 96,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: colors.surface,
    fontSize: 16,
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  dueBlock: {
    paddingHorizontal: 8,
    paddingVertical: 8,
    gap: 6,
  },
  fpsPresets: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
  },
  fpsChip: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 7,
    backgroundColor: colors.surface,
  },
  fpsChipSelected: {
    backgroundColor: colors.accent,
  },
  fpsChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.muted,
    fontVariant: ['tabular-nums'],
  },
  fpsChipTextSelected: {
    color: textOn(colors.accent),
    fontWeight: '700',
  },
  fieldHint: {
    flex: 1,
    fontSize: 12,
    color: colors.faint,
  },
  versionValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    minWidth: 120,
    paddingHorizontal: 12,
    fontVariant: ['tabular-nums'],
  },
  submitButton: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.accent,
  },
  submitButtonText: {
    fontSize: 13,
    fontWeight: '700',
  },
  noteComposer: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  noteFrameInput: {
    width: 56,
    height: 38,
    borderRadius: 8,
    backgroundColor: colors.surface,
    textAlign: 'center',
    fontSize: 15,
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  noteTextInput: {
    flex: 1,
    height: 38,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: colors.surface,
    fontSize: 15,
    color: colors.text,
  },
  noteAdd: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noteAddDisabled: {
    backgroundColor: colors.accentSoft,
  },
  noteAddText: {
    fontSize: 22,
    fontWeight: '600',
    lineHeight: 26,
  },
  emptyNotes: {
    paddingHorizontal: 8,
    paddingVertical: 8,
    fontSize: 14,
    color: colors.faint,
  },
  noteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 8,
    paddingVertical: 10,
  },
  noteMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  noteBox: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noteBoxDone: {
    backgroundColor: colors.good,
    borderColor: colors.good,
  },
  noteCheck: {
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 14,
  },
  noteFrame: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.accentDeep,
    fontVariant: ['tabular-nums'],
  },
  noteMuted: {
    color: colors.faint,
  },
  noteText: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
  },
  noteTextDone: {
    color: colors.muted,
    textDecorationLine: 'line-through',
  },
  noteDelete: {
    fontSize: 16,
    color: colors.faint,
    paddingHorizontal: 4,
  },
  saveButton: {
    marginTop: 32,
    marginHorizontal: 16,
    height: 50,
    borderRadius: 10,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: colors.accentSoft,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
  deleteShot: {
    marginTop: 10,
    marginHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: colors.surface,
    alignItems: 'center',
  },
  deleteShotText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.badDeep,
  },
  footNote: {
    paddingTop: 16,
    textAlign: 'center',
    fontSize: 12,
    color: colors.faint,
  },
});
