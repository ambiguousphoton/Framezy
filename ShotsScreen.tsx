import { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { AddShotBar } from './AddShotBar';
import { PasteShotsSheet } from './PasteShotsSheet';
import { ProjectOptions } from './ProjectOptions';
import { Reorderable } from './Reorderable';
import { ShotDetail } from './ShotDetail';
import { ShotRow } from './ShotRow';
import { Timeline } from './Timeline';
import { shotsIn, totalsOf } from './stats';
import { colors, pipelineColor, textOn } from './theme';
import {
  PIPELINES,
  PIPELINE_IDS,
  formatDueAt,
  formatDueRelative,
  formatFrames,
  formatLength,
  type Project,
} from './types';
import type { Store } from './useStore';

type Props = {
  project: Project;
  store: Store;
  onBack: () => void;
};

export function ShotsScreen({ project, store, onBack }: Props) {
  const [openShotId, setOpenShotId] = useState<string | null>(null);
  const [view, setView] = useState<'list' | 'timeline'>('list');
  const [pasting, setPasting] = useState(false);
  const [showOptions, setShowOptions] = useState(false);

  const projectShots = useMemo(() => shotsIn(store.shots, project.id), [store.shots, project.id]);
  const totals = useMemo(() => totalsOf(projectShots), [projectShots]);
  const openShot = projectShots.find((s) => s.id === openShotId) ?? null;

  const reorder = useCallback(
    (from: number, to: number) => store.reorderShots(project.id, from, to),
    [store, project.id]
  );

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.navRow}>
        <Pressable onPress={onBack} hitSlop={8} accessibilityRole="button">
          <Text style={styles.back}>‹ Projects</Text>
        </Pressable>
        <Pressable
          onPress={() => setShowOptions(true)}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Project options">
          <Text style={styles.more}>⋯</Text>
        </Pressable>
      </View>

      <View style={styles.header}>
        <Text style={styles.title}>{project.name}</Text>

        {project.description ? (
          <Text style={styles.description}>{project.description}</Text>
        ) : null}

        <View style={styles.pipelineRow}>
          {PIPELINE_IDS.map((id) => {
            const selected = project.pipeline === id;
            return (
              <Pressable
                key={id}
                onPress={() => store.setProjectPipeline(project.id, id)}
                style={[styles.pipelineChip, selected && { backgroundColor: pipelineColor[id] }]}
                accessibilityRole="radio"
                accessibilityState={{ selected }}>
                <Text
                  style={[
                    styles.pipelineChipText,
                    selected && { color: textOn(pipelineColor[id]), fontWeight: '700' },
                  ]}>
                  {PIPELINES[id].short}
                </Text>
              </Pressable>
            );
          })}
          <Text style={styles.pipelineHint}>default for new shots</Text>
        </View>

        {totals.total > 0 ? (
          <>
            <Text style={styles.subtitle}>
              {formatFrames(totals.doneFrames)} of {formatFrames(totals.totalFrames)} ·{' '}
              {Math.round(totals.percent * 100)}%
            </Text>
            <Text style={styles.subtitleFaint}>
              Length {formatLength(totals.totalSeconds)} · {totals.total} shot
              {totals.total === 1 ? '' : 's'}
              {totals.final > 0 ? ` · ${totals.final} final` : ''}
            </Text>
          </>
        ) : null}

        {project.expectedCompletion ? (
          <Text style={styles.target}>
            Due {formatDueAt(project.expectedCompletion)} ·{' '}
            {formatDueRelative(project.expectedCompletion)}
          </Text>
        ) : null}
      </View>

      <AddShotBar
        defaultPipeline={project.pipeline}
        defaultFps={project.fps}
        onAdd={(input) => store.addShot(project.id, input)}
        onPasteList={() => setPasting(true)}
      />

      {projectShots.length > 0 ? (
        <View style={styles.viewToggle}>
          {(['list', 'timeline'] as const).map((mode) => {
            const selected = view === mode;
            return (
              <Pressable
                key={mode}
                onPress={() => setView(mode)}
                style={[styles.viewItem, selected && styles.viewItemSelected]}
                accessibilityRole="radio"
                accessibilityState={{ selected }}>
                <Text style={[styles.viewText, selected && styles.viewTextSelected]}>
                  {mode === 'list' ? 'List' : 'Timeline'}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {projectShots.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No shots in this project</Text>
          <Text style={styles.emptyBody}>
            Add a shot, or paste a whole list, then tap the stage pill to walk each one down the{' '}
            {PIPELINES[project.pipeline].label} pipeline.
          </Text>
        </View>
      ) : view === 'timeline' ? (
        <Timeline shots={projectShots} onOpen={setOpenShotId} onReorder={reorder} />
      ) : (
        <ScrollView keyboardShouldPersistTaps="handled">
          <Reorderable
            items={projectShots}
            keyOf={(shot) => shot.id}
            axis="vertical"
            onReorder={reorder}
            renderItem={(shot, index, dragging) => (
              <View style={[styles.listItem, dragging && styles.listItemDragging]}>
                {index > 0 ? <View style={styles.separator} /> : null}
                <ShotRow shot={shot} onAdvance={store.advanceStage} onOpen={setOpenShotId} />
              </View>
            )}
          />
          <Text style={styles.listHint}>Hold a shot, then drag to reorder.</Text>
        </ScrollView>
      )}

      <PasteShotsSheet
        visible={pasting}
        pipeline={project.pipeline}
        existingCodes={projectShots.map((s) => s.code)}
        onClose={() => setPasting(false)}
        onImport={(entries) => store.addShots(project.id, project.pipeline, project.fps, entries)}
      />

      <ProjectOptions
        project={showOptions ? project : null}
        shotCount={projectShots.length}
        onClose={() => setShowOptions(false)}
        onSave={store.saveProject}
        onRemove={(id) => {
          store.removeProject(id);
          onBack();
        }}
      />

      <ShotDetail
        shot={openShot}
        onClose={() => setOpenShotId(null)}
        onSave={store.saveShot}
        onRemove={store.removeShot}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  back: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.accentDeep,
  },
  more: {
    fontSize: 26,
    fontWeight: '700',
    lineHeight: 28,
    color: colors.accentDeep,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
    gap: 6,
  },
  title: {
    fontSize: 30,
    fontWeight: '700',
    color: colors.text,
  },
  description: {
    fontSize: 14,
    color: colors.muted,
    lineHeight: 20,
  },
  target: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.accentDeep,
    fontVariant: ['tabular-nums'],
  },
  pipelineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pipelineChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: colors.surface,
  },
  pipelineChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.muted,
  },
  pipelineHint: {
    fontSize: 11,
    color: colors.faint,
    marginLeft: 2,
  },
  subtitle: {
    fontSize: 15,
    color: colors.muted,
    fontVariant: ['tabular-nums'],
  },
  subtitleFaint: {
    fontSize: 13,
    color: colors.faint,
    fontVariant: ['tabular-nums'],
  },
  viewToggle: {
    flexDirection: 'row',
    gap: 2,
    marginHorizontal: 16,
    marginBottom: 4,
    padding: 2,
    borderRadius: 9,
    backgroundColor: colors.surface,
    alignSelf: 'flex-start',
  },
  viewItem: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 7,
  },
  viewItemSelected: {
    backgroundColor: colors.accent,
  },
  viewText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.muted,
  },
  viewTextSelected: {
    color: textOn(colors.accent),
    fontWeight: '700',
  },
  listItem: {
    backgroundColor: colors.bg,
  },
  listItemDragging: {
    backgroundColor: colors.surface,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.hairline,
    marginLeft: 16,
  },
  listHint: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 11,
    color: colors.faint,
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 40,
    alignItems: 'center',
    gap: 6,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.muted,
  },
  emptyBody: {
    fontSize: 14,
    color: colors.faint,
    textAlign: 'center',
    lineHeight: 20,
  },
});
