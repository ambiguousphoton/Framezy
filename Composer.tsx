import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, textOn } from './theme';

/**
 * Shared shell for every "add something" flow, so projects and shots use the
 * same collapsed button -> expanded form pattern rather than each inventing one.
 */

type CollapsedProps = {
  /** Primary action label, e.g. "New shot". */
  label: string;
  onPress: () => void;
  /** Optional secondary action shown beside it, e.g. "Paste list". */
  secondaryLabel?: string;
  onSecondaryPress?: () => void;
};

export function ComposerCollapsed({
  label,
  onPress,
  secondaryLabel,
  onSecondaryPress,
}: CollapsedProps) {
  return (
    <View style={styles.wrap}>
      <View style={styles.collapsedRow}>
        <Pressable onPress={onPress} style={styles.primary} accessibilityRole="button">
          <Text style={[styles.primaryText, { color: textOn(colors.accent) }]}>+ {label}</Text>
        </Pressable>
        {secondaryLabel && onSecondaryPress ? (
          <Pressable
            onPress={onSecondaryPress}
            style={styles.secondary}
            accessibilityRole="button">
            <Text style={styles.secondaryText}>{secondaryLabel}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

type ExpandedProps = {
  children: React.ReactNode;
  /** Small note under the form explaining the effect of the inputs. */
  hint?: string;
  submitLabel: string;
  canSubmit: boolean;
  onSubmit: () => void;
  onCancel: () => void;
};

export function ComposerExpanded({
  children,
  hint,
  submitLabel,
  canSubmit,
  onSubmit,
  onCancel,
}: ExpandedProps) {
  return (
    <View style={styles.wrap}>
      {children}
      <View style={styles.actionRow}>
        <Pressable onPress={onCancel} style={styles.cancel} accessibilityRole="button">
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
        <Pressable
          onPress={onSubmit}
          disabled={!canSubmit}
          style={[styles.submit, !canSubmit && styles.submitDisabled]}
          accessibilityRole="button">
          <Text style={[styles.submitText, { color: textOn(colors.accent) }]}>{submitLabel}</Text>
        </Pressable>
      </View>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

export const composerStyles = StyleSheet.create({
  input: {
    height: 44,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: colors.surface,
    fontSize: 17,
    color: colors.text,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  segment: {
    // No `flex` here: the segment is a child of the composer's column, so flexing
    // would stretch it down over the Cancel/submit row. Width comes from the
    // column's default stretch; height comes from segmentItem's padding.
    flexDirection: 'row',
    borderRadius: 10,
    backgroundColor: colors.surface,
    padding: 2,
  },
  segmentItem: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  segmentText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.muted,
  },
});

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  collapsedRow: {
    flexDirection: 'row',
    gap: 8,
  },
  primary: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: {
    fontSize: 16,
    fontWeight: '700',
  },
  secondary: {
    height: 44,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.accentDeep,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cancel: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  cancelText: {
    fontSize: 15,
    color: colors.muted,
  },
  submit: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitDisabled: {
    backgroundColor: colors.accentSoft,
  },
  submitText: {
    fontSize: 16,
    fontWeight: '700',
  },
  hint: {
    fontSize: 12,
    color: colors.faint,
  },
});
