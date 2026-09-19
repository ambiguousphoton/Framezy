import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { ProjectSummary } from './stats';
import { colors, pipelineColor, stageColor, textOn } from './theme';
import { PIPELINES, formatDueAtShort, formatLength, type Project } from './types';

type Props = {
  project: Project;
  summary: ProjectSummary;
  onOpen: (id: string) => void;
};

export function ProjectRow({ project, summary, onOpen }: Props) {
  const pipeline = PIPELINES[project.pipeline];
  const tint = stageColor(summary.leadStageIndex, pipeline.stages.length);
  const complete = summary.total > 0 && summary.final === summary.total;

  return (
    <Pressable
      style={styles.row}
      onPress={() => onOpen(project.id)}
      accessibilityRole="button"
      accessibilityLabel={`${project.name}, ${summary.total} shots, ${Math.round(summary.percent * 100)} percent`}>
      <View style={styles.titleLine}>
        <Text style={[styles.name, complete && styles.nameComplete]} numberOfLines={1}>
          {project.name}
        </Text>
        <View style={[styles.tag, { backgroundColor: pipelineColor[project.pipeline] }]}>
          <Text style={[styles.tagText, { color: textOn(pipelineColor[project.pipeline]) }]}>
            {pipeline.short}
          </Text>
        </View>
        <View style={styles.spacer} />
        {summary.openNotes > 0 ? (
          <View style={styles.noteBadge}>
            <Text style={[styles.noteBadgeText, { color: textOn(colors.warn) }]}>
              {summary.openNotes}
            </Text>
          </View>
        ) : null}
        <Text style={styles.chevron}>›</Text>
      </View>

      {project.description ? (
        <Text style={styles.description} numberOfLines={1}>
          {project.description}
        </Text>
      ) : null}

      <View style={styles.track}>
        <View
          style={[styles.fill, { width: `${summary.percent * 100}%`, backgroundColor: tint }]}
        />
      </View>

      <View style={styles.metaLine}>
        <Text style={styles.meta}>
          {summary.total === 0
            ? 'No shots yet'
            : `${summary.total} shot${summary.total === 1 ? '' : 's'} · ${formatLength(summary.totalSeconds)} · ${Math.round(summary.percent * 100)}%`}
        </Text>
        {summary.final > 0 ? <Text style={styles.metaFaint}>{summary.final} final</Text> : null}
        {project.expectedCompletion ? (
          <Text style={styles.due}>target {formatDueAtShort(project.expectedCompletion)}</Text>
        ) : summary.nextDue ? (
          <Text style={styles.due}>due {formatDueAtShort(summary.nextDue)}</Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 8,
  },
  titleLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  name: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    flexShrink: 1,
  },
  nameComplete: {
    color: colors.muted,
  },
  tag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tagText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
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
  chevron: {
    fontSize: 22,
    color: colors.faint,
    lineHeight: 24,
  },
  description: {
    fontSize: 13,
    color: colors.muted,
  },
  track: {
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.hairline,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 3,
  },
  metaLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  meta: {
    fontSize: 13,
    color: colors.muted,
    fontVariant: ['tabular-nums'],
  },
  metaFaint: {
    fontSize: 13,
    color: colors.faint,
  },
  due: {
    marginLeft: 'auto',
    fontSize: 12,
    color: colors.faint,
    fontVariant: ['tabular-nums'],
  },
});
