import { useMemo } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';

import { AddProjectBar } from './AddProjectBar';
import { ProjectRow } from './ProjectRow';
import { summarize, totalsOf } from './stats';
import { colors } from './theme';
import { formatFrames, formatLength } from './types';
import type { Store } from './useStore';

type Props = {
  store: Store;
  onOpenProject: (id: string) => void;
};

export function ProjectsScreen({ store, onOpenProject }: Props) {
  const { projects, shots, loaded, addProject } = store;

  const totals = useMemo(() => totalsOf(shots), [shots]);
  const summaries = useMemo(
    () => new Map(projects.map((p) => [p.id, summarize(p, shots)])),
    [projects, shots]
  );

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <Text style={styles.title}>Projects</Text>
        {totals.total > 0 ? (
          <>
            <Text style={styles.subtitle}>
              {formatFrames(totals.doneFrames)} of {formatFrames(totals.totalFrames)} ·{' '}
              {Math.round(totals.percent * 100)}% · {formatLength(totals.totalSeconds)} total
            </Text>
            <Text style={styles.subtitleFaint}>
              {projects.length} project{projects.length === 1 ? '' : 's'} · {totals.wip} shots in
              progress
              {totals.final > 0 ? ` · ${totals.final} final` : ''}
            </Text>
          </>
        ) : null}
      </View>

      <AddProjectBar onAdd={addProject} />

      <FlatList
        data={projects}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const summary = summaries.get(item.id);
          if (!summary) return null;
          return <ProjectRow project={item} summary={summary} onOpen={onOpenProject} />;
        }}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={projects.length === 0 ? styles.emptyContainer : undefined}
        ListEmptyComponent={
          loaded ? (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>No projects yet</Text>
              <Text style={styles.emptyBody}>
                Create a project for a show, episode, or personal reel — then add its shots inside.
              </Text>
            </View>
          ) : null
        }
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 10,
  },
  title: {
    fontSize: 34,
    fontWeight: '700',
    color: colors.text,
  },
  subtitle: {
    marginTop: 2,
    fontSize: 15,
    color: colors.muted,
    fontVariant: ['tabular-nums'],
  },
  subtitleFaint: {
    marginTop: 1,
    fontSize: 13,
    color: colors.faint,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.hairline,
    marginLeft: 16,
  },
  emptyContainer: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  empty: {
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
