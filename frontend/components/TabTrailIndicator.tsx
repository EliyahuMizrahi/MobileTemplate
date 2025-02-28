import React, { useRef, useEffect, useState } from 'react';
import { View, Animated, Dimensions, StyleSheet, Easing } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';

interface TabTrailIndicatorProps {
  activeIndex: number;
  numTabs: number;
  color: string;
  dotSize?: number;
  tabBarHeight?: number;
  animationDuration?: number; // not as crucial now; we use a distance-based approach
  fadeOutDuration?: number;
  maxTrailLength?: number;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Background color to fade into (same as your tab bar background or screen background)
const BACKGROUND_COLOR = '#161622';

/**
 * This component animates a circle (dot) from one tab to another and
 * briefly runs a "heartbeat" in the middle of that move, then continues
 * to the final position. The heartbeat is always the same shape.
 */
const TabTrailIndicator: React.FC<TabTrailIndicatorProps> = ({
  activeIndex,
  numTabs,
  color,
  dotSize = 8,
  tabBarHeight = 80,
  // We'll still allow a base animationDuration but mostly rely on distance-based horizontal moves
  animationDuration = 300,
  fadeOutDuration = 800,
  maxTrailLength = 50,
}) => {
  // Animated values for the circle’s horizontal and vertical movement
  const dotPositionX = useRef(new Animated.Value(0)).current;
  const dotPositionY = useRef(new Animated.Value(0)).current;

  // Current circle position in state (used for building the trail path)
  const [circleX, setCircleX] = useState(0);
  const [circleY, setCircleY] = useState(0);

  // For slope/direction checks (decides when to add new trail points)
  const lastDirectionRef = useRef<'up' | 'down' | 'none'>('none');
  const lastSlopeRef = useRef(0);

  // Array of points to draw the trailing path
  const [pathPoints, setPathPoints] = useState<{
    x: number;
    y: number;
    timestamp: number;
    isKeyPoint?: boolean;
  }[]>([]);

  // Remember the previous active tab so we detect tab changes
  const prevActiveIndexRef = useRef(activeIndex);

  // Figure out the new X coordinate for the active tab
  const tabWidth = screenWidth / numTabs;
  const targetX = activeIndex * tabWidth + tabWidth / 2;

  // On first mount, set the initial position
  useEffect(() => {
    dotPositionX.setValue(targetX);
    dotPositionY.setValue(0);
    setCircleX(targetX);
    setCircleY(0);

    // Start the path with an initial point
    setPathPoints([{ x: targetX, y: 0, timestamp: Date.now() }]);
  }, []);

  useEffect(() => {
    // If the activeIndex changed, we animate
    if (prevActiveIndexRef.current !== activeIndex) {
      prevActiveIndexRef.current = activeIndex;

      // Clear existing path points so each tab change starts fresh
      setPathPoints([{ x: circleX, y: circleY, timestamp: Date.now() }]);

      // 1) Calculate distance and midpoint
      const startX = circleX;
      const endX = targetX;
      const distance = Math.abs(endX - startX);
      const midX = startX + (endX - startX) / 2;

      // 2) Decide how long to take for half the horizontal travel
      //    We'll define a simple "speed" approach: ~1 px per ms
      //    Adjust the speed constant to taste if it feels too fast/slow.
      const speedPxPerMs = 1.0;
      const halfDistance = distance / 2;
      const moveHalfDuration = Math.round(halfDistance / speedPxPerMs);

      // 3) Animate from start -> midpoint at y=0
      const moveStartToMid = Animated.timing(dotPositionX, {
        toValue: midX,
        duration: moveHalfDuration,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: false,
      });

      // 4) Build a heartbeat that does NOT depend on distance
      //    According to your description: slight up, dip down, up more, down more,
      //    up WAY more, down less, up a bit, back to line. 
      //    We'll code them as negative = up, positive = down:
      //       0 -> -5 (slight up)
      //       -5 -> 10 (down)
      //       10 -> -15 (up more)
      //       -15 -> 20 (down more)
      //       20 -> -30 (WAY up)
      //       -30 -> 12 (down but less)
      //       12 -> -8 (up a bit)
      //       -8 -> 0 (back to line)
      const heartbeatKeyframes = [
        { toValue: -5,  duration: 60 },
        { toValue: 10,  duration: 80 },
        { toValue: -15, duration: 80 },
        { toValue: 20,  duration: 90 },
        { toValue: -30, duration: 100 },
        { toValue: 12,  duration: 80 },
        { toValue: -8,  duration: 60 },
        { toValue: 0,   duration: 70 },
      ];

      // Turn these into a sequence of animated.timing calls
      const heartbeatAnimations = heartbeatKeyframes.map(({ toValue, duration }) =>
        Animated.timing(dotPositionY, {
          toValue,
          duration,
          easing: Easing.linear,
          useNativeDriver: false,
        })
      );

      // Combine them into one sequence
      const heartbeatSequence = Animated.sequence(heartbeatAnimations);

      // 5) Animate from midpoint -> endX (back at y=0)
      //    We'll do the same duration as the first half so that total horizontal
      //    time is proportional to distance, but the heartbeat itself is fixed.
      const moveMidToEnd = Animated.timing(dotPositionX, {
        toValue: endX,
        duration: moveHalfDuration,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: false,
      });

      // 6) Run them in order:
      //    - Start -> Mid
      //    - Heartbeat (only vertical bobbing)
      //    - Mid -> End
      Animated.sequence([moveStartToMid, heartbeatSequence, moveMidToEnd]).start();
    }
  }, [activeIndex, targetX]);

  // Listen for changes in the animated X/Y to update circleX/circleY in state
  useEffect(() => {
    const xSub = dotPositionX.addListener(({ value }) => setCircleX(value));
    const ySub = dotPositionY.addListener(({ value }) => setCircleY(value));

    return () => {
      dotPositionX.removeListener(xSub);
      dotPositionY.removeListener(ySub);
    };
  }, [dotPositionX, dotPositionY]);

  /**
   * Continuously sample the circle’s position to add new points to the trailing path.
   * We add points when direction or slope changes, or enough distance/time passes.
   */
  useEffect(() => {
    let rafId: number;

    const updatePath = () => {
      if (pathPoints.length > 0) {
        const lastPoint = pathPoints[pathPoints.length - 1];
        const dx = circleX - lastPoint.x;
        const dy = circleY - lastPoint.y;

        // Basic direction detection
        let currentDirection: 'up' | 'down' | 'none' = 'none';
        if (dy > 0.5) currentDirection = 'down';
        else if (dy < -0.5) currentDirection = 'up';

        // Slope for "sharp" changes
        let currentSlope = 0;
        if (Math.abs(dx) > 0.1) {
          currentSlope = dy / dx;
        }

        // Distance since last point
        const dist = Math.sqrt(dx * dx + dy * dy);
        // Time since last point
        const timeSinceLastPoint = Date.now() - lastPoint.timestamp;

        // Conditions to add a point
        const directionChanged =
          lastDirectionRef.current !== currentDirection && currentDirection !== 'none';
        const slopeChanged = Math.abs(currentSlope - lastSlopeRef.current) > 0.5;
        const movedEnough = dist > 3;
        const tooLong = timeSinceLastPoint > 50; // avoid big time gaps

        const shouldAdd = directionChanged || slopeChanged || movedEnough || tooLong;

        // Mark "key" points if we have big vertical shifts
        const isKeyPoint = directionChanged || Math.abs(dy) > 10 || Math.abs(circleY) > 20;

        if (shouldAdd) {
          setPathPoints((prev) => {
            const now = Date.now();
            const newPoint = { x: circleX, y: circleY, timestamp: now, isKeyPoint };
            const updated = [...prev, newPoint];

            // Remove old points beyond the fadeOutDuration
            const cutoff = now - fadeOutDuration;
            const filtered = updated.filter((p) => p.timestamp >= cutoff);

            // Also limit total number of points
            if (filtered.length > maxTrailLength) {
              return filtered.slice(filtered.length - maxTrailLength);
            }
            return filtered;
          });

          lastDirectionRef.current = currentDirection;
          lastSlopeRef.current = currentSlope;
        }
      }
      rafId = requestAnimationFrame(updatePath);
    };

    rafId = requestAnimationFrame(updatePath);
    return () => cancelAnimationFrame(rafId);
  }, [circleX, circleY, pathPoints, fadeOutDuration, maxTrailLength]);

  /**
   * Helper to define a quicker fade curve: fully visible for the first ~20%,
   * then quickly fade to invisible by ~40% of its lifetime.
   */
  const getNonLinearFade = (linearPercent: number) => {
    const fadeStart = 0.2;
    const fadeEnd = 0.4;

    if (linearPercent < fadeStart) return 0; // 0% fade
    if (linearPercent >= fadeEnd) return 1;  // 100% fade

    const t = (linearPercent - fadeStart) / (fadeEnd - fadeStart);
    return Math.pow(t, 1.75);
  };

  /**
   * Interpolate between `color` and BACKGROUND_COLOR based on how "old" the point is.
   */
  const interpolateColor = (linearPercent: number) => {
    const fadePercent = getNonLinearFade(linearPercent);

    const r1 = parseInt(color.slice(1, 3), 16);
    const g1 = parseInt(color.slice(3, 5), 16);
    const b1 = parseInt(color.slice(5, 7), 16);

    const r2 = parseInt(BACKGROUND_COLOR.slice(1, 3), 16);
    const g2 = parseInt(BACKGROUND_COLOR.slice(3, 5), 16);
    const b2 = parseInt(BACKGROUND_COLOR.slice(5, 7), 16);

    const r = Math.round(r1 + fadePercent * (r2 - r1));
    const g = Math.round(g1 + fadePercent * (g2 - g1));
    const b = Math.round(b1 + fadePercent * (b2 - b1));

    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b
      .toString(16)
      .padStart(2, '0')}`;
  };

  /**
   * Build up the path’s SVG segments from the stored points, applying
   * color fade-out based on time since each segment was drawn.
   */
  const now = Date.now();
  const segments = [];

  for (let i = 1; i < pathPoints.length; i++) {
    const p1 = pathPoints[i - 1];
    const p2 = pathPoints[i];

    const midTime = (p1.timestamp + p2.timestamp) / 2;
    const age = now - midTime;

    if (age < fadeOutDuration) {
      const fadeRatio = age / fadeOutDuration;
      const segmentColor = interpolateColor(fadeRatio);

      // Convert local Y (0 at circle baseline) to SVG coords (0 at top)
      const p1y = screenHeight - (tabBarHeight + p1.y);
      const p2y = screenHeight - (tabBarHeight + p2.y);

      const isImportantSegment = p1.isKeyPoint || p2.isKeyPoint;
      const strokeWidth = isImportantSegment ? dotSize + 0.5 : dotSize - 1;

      segments.push(
        <Path
          key={`segment-${i}`}
          d={`M ${p1.x} ${p1y} L ${p2.x} ${p2y}`}
          stroke={segmentColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          fill="none"
        />
      );
    }
  }

  // Circle position in SVG coords
  const circleTopY = screenHeight - (tabBarHeight + circleY);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width="100%" height="100%">
        {/* The trail segments behind the circle */}
        {segments}

        {/* The moving circle on top */}
        <Circle cx={circleX} cy={circleTopY} r={dotSize / 2} fill={color} />
      </Svg>
    </View>
  );
};

export default TabTrailIndicator;
