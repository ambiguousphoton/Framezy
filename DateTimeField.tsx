import DateTimePicker from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, textOn } from './theme';
import { formatDueAt, formatDueAtValue, formatDueRelative, parseDueAt } from './types';

type Props = {
  /** Stored value as "YYYY-MM-DDTHH:mm", or null when unset. */
  value: string | null;
  onChange: (value: string | null) => void;
  /** Shown on the button when nothing is set. */
  placeholder?: string;
};

/**
 * Calendar + clock picker for a deadline.
 *
 * Android's native picker only does one mode at a time, so a tap runs date then
 * time in sequence. iOS shows a single inline date-and-time spinner. Either way
 * the caller gets one "YYYY-MM-DDTHH:mm" string, so there is no free-text date
 * entry to validate.
 */
export function DateTimeField({ value, onChange, placeholder = 'Set a date' }: Props) {
  const [mode, setMode] = useState<'closed' | 'date' | 'time'>('closed');
  // Holds the date chosen in step one while the time step is open (Android).
  const [pending, setPending] = useState<Date | null>(null);

  const current = parseDueAt(value) ?? defaultWhenUnset();

  const open = () => {
    setPending(current);
    setMode(Platform.OS === 'ios' ? 'time' : 'date');
  };

  const commit = (date: Date) => {
    onChange(formatDueAtValue(date));
    setMode('closed');
    setPending(null);
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <Pressable
          onPress={open}
          style={styles.button}
          accessibilityRole="button"
          accessibilityLabel={value ? `Change date, currently ${formatDueAt(value)}` : placeholder}>
          <Text style={[styles.buttonText, !value && styles.buttonTextEmpty]}>
            {value ? formatDueAt(value) : placeholder}
          </Text>
          <Text style={styles.calendarGlyph}>🗓</Text>
        </Pressable>

        {value ? (
          <Pressable
            onPress={() => onChange(null)}
            style={styles.clear}
            accessibilityRole="button"
            accessibilityLabel="Clear date">
            <Text style={styles.clearText}>Clear</Text>
          </Pressable>
        ) : null}
      </View>

      {value ? <Text style={styles.relative}>{formatDueRelative(value)}</Text> : null}

      {mode !== 'closed' ? (
        <DateTimePicker
          value={pending ?? current}
          mode={Platform.OS === 'ios' ? 'datetime' : mode}
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          onChange={(event, picked) => {
            if (event.type === 'dismissed' || !picked) {
              setMode('closed');
              setPending(null);
              return;
            }

            if (Platform.OS === 'ios') {
              // Single combined spinner: whatever comes back is the answer.
              commit(picked);
              return;
            }

            if (mode === 'date') {
              // Carry the chosen day forward, then ask for the time.
              setPending(picked);
              setMode('time');
              return;
            }

            // Time step: graft the time onto the day chosen in step one.
            const day = pending ?? picked;
            commit(
              new Date(
                day.getFullYear(),
                day.getMonth(),
                day.getDate(),
                picked.getHours(),
                picked.getMinutes()
              )
            );
          }}
        />
      ) : null}

      {Platform.OS === 'ios' && mode !== 'closed' ? (
        <Pressable
          onPress={() => setMode('closed')}
          style={styles.done}
          accessibilityRole="button">
          <Text style={[styles.doneText, { color: textOn(colors.accent) }]}>Done</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/** Tomorrow at 18:00 — a sensible first guess for a delivery deadline. */
function defaultWhenUnset(): Date {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(18, 0, 0, 0);
  return d;
}

const styles = StyleSheet.create({
  wrap: {
    gap: 6,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  button: {
    flex: 1,
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: colors.surface,
  },
  buttonText: {
    fontSize: 16,
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  buttonTextEmpty: {
    color: colors.faint,
  },
  calendarGlyph: {
    fontSize: 17,
  },
  clear: {
    paddingHorizontal: 12,
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: colors.surface,
  },
  clearText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.badDeep,
  },
  relative: {
    fontSize: 12,
    color: colors.accentDeep,
    fontWeight: '600',
  },
  done: {
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.accent,
  },
  doneText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
