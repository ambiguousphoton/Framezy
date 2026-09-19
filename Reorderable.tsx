import { useCallback, useRef, useState } from 'react';
import {
  Animated,
  PanResponder,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type PanResponderInstance,
} from 'react-native';

import { dropIndex, markerEdge } from './dragTarget';
import { colors } from './theme';

/**
 * Long-press drag-to-reorder along one axis, used by both the shot list
 * (vertical, measured heights) and the timeline (horizontal, frame-derived
 * widths).
 *
 * Deliberately built on React Native's own Animated + PanResponder rather than
 * Reanimated/gesture-handler: those couple the JS package to an exact native
 * binary, which breaks in Expo Go whenever the two drift apart. The drag here is
 * a single-axis translate plus a drop marker, which core RN handles fine, and it
 * keeps the app free of native modules.
 *
 * Items other than the dragged one stay put; a pink marker shows where the drop
 * will land. That avoids animating N items per frame and makes the drop
 * predictable when block widths vary as wildly as they do on the timeline.
 */

/** Hold this long before a drag takes over, so taps and scrolling still work. */
const LONG_PRESS_MS = 220;
const MARKER_THICKNESS = 3;

export type ReorderableProps<T> = {
  items: T[];
  keyOf: (item: T) => string;
  axis: 'vertical' | 'horizontal';
  gap?: number;
  /**
   * Supply when item sizes are already known (timeline block widths). Omit to
   * measure each item on layout instead (list rows, whose height varies).
   */
  sizeOf?: (item: T) => number;
  renderItem: (item: T, index: number, dragging: boolean) => React.ReactNode;
  onReorder: (from: number, to: number) => void;
};

export function Reorderable<T>({
  items,
  keyOf,
  axis,
  gap = 0,
  sizeOf,
  renderItem,
  onReorder,
}: ReorderableProps<T>) {
  // A ref, not state: sizes are read when a gesture starts and must not re-render.
  const sizesRef = useRef<number[]>([]);
  const [drag, setDrag] = useState<{ from: number; target: number } | null>(null);

  const horizontal = axis === 'horizontal';

  const sizes = useCallback((): number[] => {
    if (sizeOf) return items.map(sizeOf);
    // Drop any unmeasured tail so the geometry never sees undefined holes.
    const measured = sizesRef.current.slice(0, items.length);
    return measured.every((n) => typeof n === 'number' && n > 0) ? measured : [];
  }, [items, sizeOf]);

  const measure = useCallback(
    (index: number, event: LayoutChangeEvent) => {
      const { width, height } = event.nativeEvent.layout;
      sizesRef.current[index] = horizontal ? width : height;
    },
    [horizontal]
  );

  const handleStart = useCallback((from: number) => {
    setDrag({ from, target: from });
  }, []);

  const handleMove = useCallback(
    (from: number, delta: number) => {
      const target = dropIndex(sizes(), from, delta, gap);
      setDrag((prev) => (prev && prev.from === from && prev.target === target ? prev : { from, target }));
    },
    [sizes, gap]
  );

  const handleEnd = useCallback(
    (from: number, delta: number) => {
      const target = dropIndex(sizes(), from, delta, gap);
      setDrag(null);
      if (target !== from) onReorder(from, target);
    },
    [sizes, gap, onReorder]
  );

  const handleCancel = useCallback(() => setDrag(null), []);

  const marker = drag === null ? null : markerEdge(sizes(), drag.from, drag.target, gap);

  return (
    <View style={[horizontal && styles.rowContainer, gap > 0 && { gap }]}>
      {items.map((item, index) => (
        <DragItem
          key={keyOf(item)}
          index={index}
          axis={axis}
          dragging={drag?.from === index}
          onMeasure={sizeOf ? undefined : measure}
          onStart={handleStart}
          onMove={handleMove}
          onEnd={handleEnd}
          onCancel={handleCancel}>
          {renderItem(item, index, drag?.from === index)}
        </DragItem>
      ))}

      {marker !== null ? (
        <View
          pointerEvents="none"
          style={[
            styles.marker,
            horizontal
              ? { left: marker - MARKER_THICKNESS / 2, top: 0, bottom: 0, width: MARKER_THICKNESS }
              : { top: marker - MARKER_THICKNESS / 2, left: 12, right: 12, height: MARKER_THICKNESS },
          ]}
        />
      ) : null}
    </View>
  );
}

type DragItemProps = {
  index: number;
  axis: 'vertical' | 'horizontal';
  dragging: boolean;
  children: React.ReactNode;
  onMeasure?: (index: number, event: LayoutChangeEvent) => void;
  onStart: (index: number) => void;
  onMove: (index: number, delta: number) => void;
  onEnd: (index: number, delta: number) => void;
  onCancel: () => void;
};

function DragItem({
  index,
  axis,
  dragging,
  children,
  onMeasure,
  onStart,
  onMove,
  onEnd,
  onCancel,
}: DragItemProps) {
  const offset = useRef(new Animated.Value(0)).current;

  // PanResponder is created once, so its handlers must read the current props
  // through a ref — `index` changes every time the list reorders.
  const live = useRef({ index, axis, onStart, onMove, onEnd, onCancel });
  live.current = { index, axis, onStart, onMove, onEnd, onCancel };

  /** Set once the hold threshold passes; until then touches belong to children. */
  const armed = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const disarm = useCallback(() => {
    if (timer.current !== null) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    armed.current = false;
  }, []);

  const arm = useCallback(() => {
    disarm();
    timer.current = setTimeout(() => {
      armed.current = true;
    }, LONG_PRESS_MS);
  }, [disarm]);

  const settle = useCallback(() => {
    Animated.spring(offset, {
      toValue: 0,
      useNativeDriver: true,
      friction: 9,
      tension: 90,
    }).start();
  }, [offset]);

  const responder = useRef<PanResponderInstance>(
    PanResponder.create({
      // Never claim the touch on start: taps must still reach the row's buttons.
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: () => armed.current,
      onPanResponderGrant: () => {
        live.current.onStart(live.current.index);
      },
      onPanResponderMove: (_event, gesture) => {
        const delta = live.current.axis === 'horizontal' ? gesture.dx : gesture.dy;
        offset.setValue(delta);
        live.current.onMove(live.current.index, delta);
      },
      onPanResponderRelease: (_event, gesture) => {
        const delta = live.current.axis === 'horizontal' ? gesture.dx : gesture.dy;
        disarm();
        live.current.onEnd(live.current.index, delta);
        // Snap home: the committed reorder re-lays the items out at their new spots.
        settle();
      },
      onPanResponderTerminate: () => {
        disarm();
        live.current.onCancel();
        settle();
      },
      // Once dragging, don't hand the touch back to a parent ScrollView.
      onPanResponderTerminationRequest: () => false,
    })
  ).current;

  return (
    <Animated.View
      onLayout={onMeasure ? (event) => onMeasure(index, event) : undefined}
      onTouchStart={arm}
      onTouchEnd={disarm}
      onTouchCancel={disarm}
      {...responder.panHandlers}
      style={[
        styles.item,
        dragging && styles.itemDragging,
        {
          transform: [axis === 'horizontal' ? { translateX: offset } : { translateY: offset }],
          zIndex: dragging ? 10 : 0,
        },
      ]}>
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  rowContainer: {
    flexDirection: 'row',
  },
  item: {
    backgroundColor: colors.bg,
  },
  itemDragging: {
    shadowColor: colors.accentDeep,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    shadowOpacity: 0.25,
    // Elevation is Android's equivalent of the iOS shadow above.
    elevation: 6,
  },
  marker: {
    position: 'absolute',
    backgroundColor: colors.accent,
    borderRadius: MARKER_THICKNESS,
  },
});
