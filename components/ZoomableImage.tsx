import React, { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Image as ExpoImage } from 'expo-image';

interface Props {
  uri: string;
}

export default function ZoomableImage({ uri }: Props) {
  const scale = useSharedValue(1);
  const translationX = useSharedValue(0);
  const translationY = useSharedValue(0);
  const offsetX = useSharedValue(0);
  const offsetY = useSharedValue(0);

  const pinch = useMemo(() =>
    Gesture.Pinch()
      .onUpdate((e) => {
        'worklet';
        scale.value = Math.max(1, Math.min(4, e.scale));
      })
      .onEnd(() => {
        'worklet';
        if (scale.value <= 1.02) {
          scale.value = withTiming(1);
          translationX.value = withTiming(0);
          translationY.value = withTiming(0);
          offsetX.value = 0;
          offsetY.value = 0;
        }
      }), // eslint-disable-next-line react-hooks/exhaustive-deps
    []);

  const pan = useMemo(() =>
    Gesture.Pan()
      .manualActivation(true)
      .onTouchesMove((_, state) => {
        'worklet';
        // Only activate pan when zoomed; otherwise let FlatList handle horizontal swipe
        if (scale.value > 1.02) state.activate(); else state.fail();
      })
      .onStart(() => {
        'worklet';
        offsetX.value = translationX.value;
        offsetY.value = translationY.value;
      })
      .onUpdate((e) => {
        'worklet';
        if (scale.value > 1.02) {
          translationX.value = offsetX.value + e.translationX;
          translationY.value = offsetY.value + e.translationY;
        }
      })
      .onEnd(() => {
        'worklet';
        if (scale.value <= 1.02) {
          translationX.value = withTiming(0);
          translationY.value = withTiming(0);
          offsetX.value = 0;
          offsetY.value = 0;
        }
      }), // eslint-disable-next-line react-hooks/exhaustive-deps
    []);

  const doubleTap = useMemo(() =>
    Gesture.Tap().numberOfTaps(2).onEnd(() => {
      'worklet';
      const next = scale.value > 1 ? 1 : 2;
      scale.value = withTiming(next);
      if (next === 1) {
        translationX.value = withTiming(0);
        translationY.value = withTiming(0);
        offsetX.value = 0;
        offsetY.value = 0;
      }
    }), // eslint-disable-next-line react-hooks/exhaustive-deps
    []);

  const composed = Gesture.Simultaneous(pinch, pan, doubleTap);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: translationX.value },
      { translateY: translationY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <GestureDetector gesture={composed}>
      <Animated.View style={[styles.container, style]}>
        <ExpoImage source={{ uri }} style={styles.image} contentFit="contain" />
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  image: { width: '100%', height: '100%' },
});