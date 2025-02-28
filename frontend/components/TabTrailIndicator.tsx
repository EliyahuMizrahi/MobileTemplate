import React, { useRef, useEffect, useState } from 'react';
import { View, Animated, Dimensions, StyleSheet, Easing } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';

interface TabTrailIndicatorProps {
  activeIndex: number;
  numTabs: number;
  color: string;
  dotSize?: number;
  tabBarHeight?: number;
  animationDuration?: number;
  fadeOutDuration?: number;
  maxTrailLength?: number;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const TabTrailIndicator: React.FC<TabTrailIndicatorProps> = ({
  activeIndex,
  numTabs,
  color,
  dotSize = 8,
  tabBarHeight = 80,
  animationDuration = 300,
  fadeOutDuration = 800,
  maxTrailLength = 50,
}) => {
  // Animated values for the dot’s horizontal/vertical movement
  const dotPositionX = useRef(new Animated.Value(0)).current;
  const dotPositionY = useRef(new Animated.Value(0)).current;

  // Track the circle's current position in plain state for building the trail
  const [circleX, setCircleX] = useState(0);
  const [circleY, setCircleY] = useState(0);

  // Keep an array of points for the trailing path
  const [pathPoints, setPathPoints] = useState<{ x: number; y: number; timestamp: number }[]>([]);

  // For detecting direction changes if needed
  const prevActiveIndexRef = useRef(activeIndex);

  // Calculate the new X position for the target tab
  const tabWidth = screenWidth / numTabs;
  const targetX = activeIndex * tabWidth + tabWidth / 2 - dotSize / 2;

  // On mount, set initial position
  useEffect(() => {
    dotPositionX.setValue(targetX);
    dotPositionY.setValue(0);
    setCircleX(targetX);
    setCircleY(0);

    // Add initial point
    setPathPoints([{ x: targetX, y: 0, timestamp: Date.now() }]);
  }, []);

  // Animate dot to new tab + heartbeat bounce
  useEffect(() => {
    if (prevActiveIndexRef.current !== activeIndex) {
      prevActiveIndexRef.current = activeIndex;
    }

    // Move horizontally
    const moveHorizontal = Animated.timing(dotPositionX, {
      toValue: targetX,
      duration: animationDuration,
      useNativeDriver: false, // false because we read the animated values
      easing: Easing.inOut(Easing.ease),
    });

    // Reset Y first
    const resetY = Animated.timing(dotPositionY, {
      toValue: 0,
      duration: 0,
      useNativeDriver: false,
    });

    // Heartbeat motion near end of horizontal movement
    const startHeartbeatAt = animationDuration * 0.65;
    const heartbeatDuration = animationDuration * 0.25;
    const delayBeforeHeartbeat = Animated.delay(startHeartbeatAt);

    const heartbeatUp = Animated.timing(dotPositionY, {
      toValue: -10,
      duration: heartbeatDuration / 3,
      useNativeDriver: false,
      easing: Easing.out(Easing.cubic),
    });

    const heartbeatDown = Animated.timing(dotPositionY, {
      toValue: 10,
      duration: heartbeatDuration / 3,
      useNativeDriver: false,
      easing: Easing.inOut(Easing.cubic),
    });

    const heartbeatBack = Animated.timing(dotPositionY, {
      toValue: 0,
      duration: heartbeatDuration / 3,
      useNativeDriver: false,
      easing: Easing.in(Easing.cubic),
    });

    const heartbeatSequence = Animated.sequence([
      delayBeforeHeartbeat,
      heartbeatUp,
      heartbeatDown,
      heartbeatBack,
    ]);

    // Run them in parallel
    Animated.parallel([
      moveHorizontal,
      Animated.sequence([resetY, heartbeatSequence]),
    ]).start();
  }, [activeIndex, targetX, animationDuration]);

  // Listen for X/Y changes from the animation, update circleX / circleY
  useEffect(() => {
    const xSub = dotPositionX.addListener(({ value }) => {
      setCircleX(value);
    });
    const ySub = dotPositionY.addListener(({ value }) => {
      setCircleY(value);
    });

    return () => {
      dotPositionX.removeListener(xSub);
      dotPositionY.removeListener(ySub);
    };
  }, [dotPositionX, dotPositionY]);

  // Sample the current dot position each frame via requestAnimationFrame
  useEffect(() => {
    let rafId: number;

    const update = () => {
      setPathPoints(prev => {
        const now = Date.now();
        const newPoint = { x: circleX, y: circleY, timestamp: now };
        const newPoints = [...prev, newPoint];

        // Remove old points beyond fadeOutDuration
        const cutoff = now - fadeOutDuration;
        const filtered = newPoints.filter((p) => p.timestamp >= cutoff);

        // Limit how many total points we keep
        if (filtered.length > maxTrailLength) {
          return filtered.slice(filtered.length - maxTrailLength);
        }
        return filtered;
      });

      rafId = requestAnimationFrame(update);
    };

    rafId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(rafId);
  }, [circleX, circleY, fadeOutDuration, maxTrailLength]);

  // Build short line segments from each pair of consecutive points
  const now = Date.now();
  const segments = [];
  for (let i = 1; i < pathPoints.length; i++) {
    const p1 = pathPoints[i - 1];
    const p2 = pathPoints[i];

    // Age-based fade
    const midTime = (p1.timestamp + p2.timestamp) / 2;
    const age = now - midTime;
    if (age < fadeOutDuration) {
      const alpha = 1 - age / fadeOutDuration;

      // Convert bottom-based Y to top-based for <Svg>
      // Circle's bottom-based Y = tabBarHeight + circleY
      // So top-based Y = screenHeight - (tabBarHeight + circleY)
      const p1y = screenHeight - (tabBarHeight + p1.y);
      const p2y = screenHeight - (tabBarHeight + p2.y);

      segments.push(
        <Path
          key={`segment-${i}`}
          d={`M ${p1.x} ${p1y} L ${p2.x} ${p2y}`}
          stroke={color}
          strokeWidth={dotSize} // match circle diameter
          strokeOpacity={alpha}
          strokeLinecap="round"
          fill="none"
        />
      );
    }
  }

  // Circle’s top-based coordinate
  const circleTopY = screenHeight - (tabBarHeight + circleY);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width="100%" height="100%">
        {/* First render the line segments (so they appear behind)... */}
        {segments}

        {/* ...then the circle on top */}
        <Circle
          cx={circleX}
          cy={circleTopY}
          r={dotSize / 2}
          fill={color}
        />
      </Svg>
    </View>
  );
};

export default TabTrailIndicator;
