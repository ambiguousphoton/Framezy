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
import { colors, textOn } from './theme';
import { FPS_PRESETS, formatFps, isValidFps, toDueAt, type Project } from './types';

/** The editable slice of a project. Held as a draft until the user saves. */
type Draft = {
  name: string;
  description: string;
  fps: number;
  expectedCompletion: string | null;
};

function draftOf(project: Project): Draft {
  return {
    name: project.name,
    description: project.description,
    fps: project.fps,
    expectedCompletion: project.expectedCompletion,
  };
}

type Props = {
  project: Project | null;
  /** Shots in this project, for an honest warning on delete. */
  shotCount: number;
  onClose: () => void;
  onSave: (id: string, patch: Draft) => void;
  onRemove: (id: string) => void;
};

export function ProjectOptions({ project, shotCount, onClose, onSave, onRemove }: Props) {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [fpsDraft, setFpsDraft] = useState('');

  // Rebuild the draft whenever a different project is opened.
  useEffect(() => {
    if (!project) {
      setDraft(null);
      return;
    }
    setDraft(draftOf(project));
    setFpsDraft(String(project.fps));
  }, [project?.id]);

  if (!project || !draft) return null;

  const patch = (changes: Partial<Draft>) =>
    setDraft((prev) => (prev ? { ...prev, ...changes } : prev));

  const nameOk = draft.name.trim().length > 0;
  const dirty = JSON.stringify(draft) !== JSON.stringify(draftOf(project));

  const commitFps = () => {
    const parsed = Number.parseFloat(fpsDraft);
    if (isValidFps(parsed)) patch({ fps: parsed });
    else setFpsDraft(String(draft.fps));
  };

  const save = () => {
    if (!nameOk) return;
    // Flush any field still focused so a pending edit isn't silently dropped.
    const parsedFps = Number.parseFloat(fpsDraft);
    onSave(project.id, {
      ...draft,
      name: draft.name.trim(),
      fps: isValidFps(parsedFps) ? parsedFps : draft.fps,
      expectedCompletion: toDueAt(draft.expectedCompletion),
    });
    onClose();
  };

  const discard = () => {
    if (!dirty) {
      onClose();
      return;
    }
    Alert.alert('Discard changes?', `Your edits to ${project.name} will be lost.`, [
      { text: 'Keep editing', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: onClose },
    ]);
  };

  const confirmDelete = () => {
    Alert.alert(
      `Delete "${project.name}"?`,
      shotCount === 0
        ? 'This project has no shots.'
        : `This also deletes ${shotCount} shot${shotCount === 1 ? '' : 's'} and their notes. This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            onRemove(project.id);
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
          <Text style={styles.title}>Project options</Text>
          <Pressable
            onPress={discard}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Close without saving">
            <Text style={styles.close}>✕</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <Section title="Name">
            <TextInput
              style={styles.input}
              value={draft.name}
              onChangeText={(name) => patch({ name })}
              placeholder="Project name"
              placeholderTextColor={colors.faint}
              returnKeyType="done"
            />
            {!nameOk ? <Text style={styles.warn}>A project needs a name.</Text> : null}
          </Section>

          <Section title="Description">
            <TextInput
              style={[styles.input, styles.multiline]}
              value={draft.description}
              onChangeText={(description) => patch({ description })}
              placeholder="What this project is — client, style, references…"
              placeholderTextColor={colors.faint}
              multiline
              textAlignVertical="top"
            />
          </Section>

          <Section title="Expected completion">
            <DateTimeField
              value={draft.expectedCompletion}
              onChange={(expectedCompletion) => patch({ expectedCompletion })}
              placeholder="No delivery target"
            />
          </Section>

          <Section title="Default frame rate">
            <View style={styles.fpsRow}>
              <TextInput
                style={[styles.input, styles.fpsInput]}
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
                      <Text style={[styles.fpsChipText, selected && styles.fpsChipTextSelected]}>
                        {preset}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
            <Text style={styles.hint}>
              Applies to new shots. Existing shots keep their own rate.
            </Text>
          </Section>

          <Pressable
            onPress={save}
            disabled={!dirty || !nameOk}
            style={[styles.saveButton, (!dirty || !nameOk) && styles.saveButtonDisabled]}
            accessibilityRole="button">
            <Text style={[styles.saveButtonText, { color: textOn(colors.accent) }]}>
              {dirty ? 'Save changes' : 'No changes'}
            </Text>
          </Pressable>

          <Pressable onPress={confirmDelete} style={styles.deleteButton} accessibilityRole="button">
            <Text style={styles.deleteButtonText}>Delete project</Text>
          </Pressable>

          <Text style={styles.footNote}>
            {shotCount} shot{shotCount === 1 ? '' : 's'} · created{' '}
            {project.createdAt.slice(0, 10)}
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
      {children}
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
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
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
    paddingHorizontal: 16,
    gap: 6,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  input: {
    minHeight: 46,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: colors.surface,
    fontSize: 16,
    color: colors.text,
  },
  multiline: {
    minHeight: 96,
    lineHeight: 22,
  },
  hint: {
    fontSize: 12,
    color: colors.faint,
  },
  warn: {
    fontSize: 12,
    color: colors.badDeep,
  },
  fpsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  fpsInput: {
    width: 90,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  fpsPresets: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
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
  deleteButton: {
    marginTop: 10,
    marginHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: colors.surface,
    alignItems: 'center',
  },
  deleteButtonText: {
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
