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

// Background color to fade to (matching your app's background)
const BACKGROUND_COLOR = '#161622';

const TabTrailIndicator: React.FC<TabTrailIndicatorProps> = ({
  activeIndex,
  numTabs,
  color,
  dotSize = 8,
  tabBarHeight = 80,
  animationDuration = 300,
  fadeOutDuration = 200,
  maxTrailLength = 50,
}) => {
  // Animated values for the dot's horizontal/vertical movement
  const dotPositionX = useRef(new Animated.Value(0)).current;
  const dotPositionY = useRef(new Animated.Value(0)).current;

  // Track the circle's current position in plain state for building the trail
  const [circleX, setCircleX] = useState(0);
  const [circleY, setCircleY] = useState(0);
  
  // For tracking when to add points to the trail
  const lastDirectionRef = useRef<'up' | 'down' | 'none'>('none');
  const lastSlopeRef = useRef(0);

  // Keep an array of points for the trailing path
  const [pathPoints, setPathPoints] = useState<{ 
    x: number; 
    y: number; 
    timestamp: number;
    isKeyPoint?: boolean; // Mark important points in the heartbeat
  }[]>([]);

  // For detecting direction changes
  const prevActiveIndexRef = useRef(activeIndex);
  
  // For tracking animation state
  const isAnimatingRef = useRef(false);

  // Calculate the new X position for the target tab
  const tabWidth = screenWidth / numTabs;
  const targetX = activeIndex * tabWidth + tabWidth / 2;

  // On mount, set initial position
  useEffect(() => {
    const initialX = targetX;
    dotPositionX.setValue(initialX);
    dotPositionY.setValue(0);
    setCircleX(initialX);
    setCircleY(0);

    // Add initial point
    setPathPoints([{ x: initialX, y: 0, timestamp: Date.now() }]);
  }, []);

  // Animate dot to new tab + realistic heartbeat pattern
  useEffect(() => {
    if (prevActiveIndexRef.current !== activeIndex) {
      prevActiveIndexRef.current = activeIndex;
      isAnimatingRef.current = true;
      
      // Clear existing path points when changing tabs
      setPathPoints([{ x: circleX, y: circleY, timestamp: Date.now() }]);
    }

    // Move horizontally
    const moveHorizontal = Animated.timing(dotPositionX, {
      toValue: targetX,
      duration: animationDuration,
      useNativeDriver: false,
      easing: Easing.inOut(Easing.ease),
    });

    // Reset Y first
    const resetY = Animated.timing(dotPositionY, {
      toValue: 0,
      duration: 0,
      useNativeDriver: false,
    });

    // Start the heartbeat sequence after most of horizontal movement is done
    const startHeartbeatAt = animationDuration * 0.2;
    const delayBeforeHeartbeat = Animated.delay(startHeartbeatAt);
    
    // Define an EKG-like heartbeat with sharp spikes
    // P wave (small bump up)
    const pWave = Animated.timing(dotPositionY, {
      toValue: -5,
      duration: 40,
      useNativeDriver: false,
      easing: Easing.out(Easing.cubic),
    });
    
    // P-Q segment (back to baseline)
    const pqSegment = Animated.timing(dotPositionY, {
      toValue: 0,
      duration: 20,
      useNativeDriver: false,
      easing: Easing.linear,
    });
    
    // QRS complex (sharp down spike)
    const qSpike = Animated.timing(dotPositionY, {
      toValue: 10,
      duration: 10,
      useNativeDriver: false,
      easing: Easing.in(Easing.cubic),
    });
    
    // R spike (sharp up spike)
    const rSpike = Animated.timing(dotPositionY, {
      toValue: -30,
      duration: 20,
      useNativeDriver: false,
      easing: Easing.out(Easing.cubic),
    });
    
    // S spike (sharp down)
    const sSpike = Animated.timing(dotPositionY, {
      toValue: 15,
      duration: 15,
      useNativeDriver: false,
      easing: Easing.in(Easing.cubic),
    });
    
    // ST segment (return to baseline)
    const stSegment = Animated.timing(dotPositionY, {
      toValue: 3,
      duration: 20,
      useNativeDriver: false,
      easing: Easing.out(Easing.cubic),
    });
    
    // T wave (rounded bump up)
    const tWave = Animated.timing(dotPositionY, {
      toValue: -8,
      duration: 30,
      useNativeDriver: false,
      easing: Easing.inOut(Easing.cubic),
    });
    
    // Back to baseline
    const backToBaseline = Animated.timing(dotPositionY, {
      toValue: 0,
      duration: 20,
      useNativeDriver: false,
      easing: Easing.inOut(Easing.cubic),
    });

    const heartbeatSequence = Animated.sequence([
      delayBeforeHeartbeat,
      pWave,         // P peak
      pqSegment,     
      qSpike,        // Q valley
      rSpike,        // R peak (main spike)
      sSpike,        // S valley
      stSegment,     
      tWave,         // T peak
      backToBaseline
    ]);

    // Run them in parallel
    Animated.parallel([
      moveHorizontal,
      Animated.sequence([resetY, heartbeatSequence]),
    ]).start(() => {
      isAnimatingRef.current = false;
    });
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

  // Sample the current dot position strategically
  useEffect(() => {
    let rafId: number;

    const update = () => {
      if (pathPoints.length > 0) {
        const lastPoint = pathPoints[pathPoints.length - 1];
        const dy = circleY - lastPoint.y;
        
        // Determine current direction
        let currentDirection: 'up' | 'down' | 'none' = 'none';
        if (dy > 0.5) currentDirection = 'down';
        else if (dy < -0.5) currentDirection = 'up';
        
        // Calculate slope to detect significant changes
        const dx = circleX - lastPoint.x;
        let currentSlope = 0;
        if (Math.abs(dx) > 0.1) {
          currentSlope = dy / dx;
        }
        
        // Distance moved
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Detect if we need to add a point
        const directionChanged = lastDirectionRef.current !== currentDirection && 
                               currentDirection !== 'none';
        const significantSlopeChange = Math.abs(currentSlope - lastSlopeRef.current) > 0.5;
        const movedSignificantly = distance > 3;
        const timeSinceLastPoint = Date.now() - lastPoint.timestamp;
        const tooLongSinceLastPoint = timeSinceLastPoint > 50; // Avoid gaps if no movement
        
        // Add points strategically
        const shouldAddPoint = directionChanged || 
                              significantSlopeChange || 
                              movedSignificantly || 
                              tooLongSinceLastPoint;
        
        // Mark key points at extremes of the heartbeat pattern
        const isKeyPoint = directionChanged || 
                          (Math.abs(dy) > 10) || 
                          (Math.abs(circleY) > 20);
        
        if (shouldAddPoint) {
          setPathPoints(prev => {
            const now = Date.now();
            
            // New points
            const newPoint = { 
              x: circleX, 
              y: circleY, 
              timestamp: now,
              isKeyPoint
            };
            
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
          
          // Update refs
          lastDirectionRef.current = currentDirection;
          lastSlopeRef.current = currentSlope;
        }
      }
      
      rafId = requestAnimationFrame(update);
    };

    rafId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(rafId);
  }, [circleX, circleY, fadeOutDuration, maxTrailLength, pathPoints]);

  // Helper function to create a custom fade curve
  // Starts fading at 30% of lifetime and fully fades out by 50%
  const getNonLinearFade = (linearPercent: number) => {
    // Configure when the fade starts and ends
    const fadeStartPercent = 0.3;   // Start fading at 30% of lifetime
    const fadeEndPercent = 0.5;     // Fully faded out by 50% of lifetime
    
    if (linearPercent < fadeStartPercent) {
      // Before fade start, stay at full color (0% fade)
      return 0;
    } else if (linearPercent >= fadeEndPercent) {
      // After fade end, be completely faded (100% fade)
      return 1;
    } else {
      // In the fade window, create a smooth transition
      // Map fadeStartPercent-fadeEndPercent to 0.0-1.0
      const normalizedPercent = (linearPercent - fadeStartPercent) / (fadeEndPercent - fadeStartPercent);
      // Use a slightly steeper curve for faster initial fade
      return Math.pow(normalizedPercent, 1.5);
    }
  };

  // Helper function to interpolate between colors based on percentage (0-1)
  const interpolateColor = (linearPercent: number) => {
    // Apply non-linear curve to the fade percentage
    const fadePercent = getNonLinearFade(linearPercent);
    
    // Parse the hex colors
    const r1 = parseInt(color.slice(1, 3), 16);
    const g1 = parseInt(color.slice(3, 5), 16);
    const b1 = parseInt(color.slice(5, 7), 16);
    
    const r2 = parseInt(BACKGROUND_COLOR.slice(1, 3), 16);
    const g2 = parseInt(BACKGROUND_COLOR.slice(3, 5), 16);
    const b2 = parseInt(BACKGROUND_COLOR.slice(5, 7), 16);
    
    // Interpolate between colors
    const r = Math.round(r1 + fadePercent * (r2 - r1));
    const g = Math.round(g1 + fadePercent * (g2 - g1));
    const b = Math.round(b1 + fadePercent * (b2 - b1));
    
    // Convert back to hex string
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  };

  // Build line segments
  const now = Date.now();
  const segments = [];
  
  for (let i = 1; i < pathPoints.length; i++) {
    const p1 = pathPoints[i - 1];
    const p2 = pathPoints[i];

    // Age-based color fade instead of opacity
    const midTime = (p1.timestamp + p2.timestamp) / 2;
    const age = now - midTime;
    
    if (age < fadeOutDuration) {
      // Get fade percentage (0 = new, 1 = old)
      const fadePercent = age / fadeOutDuration;
      
      // Get interpolated color
      const segmentColor = interpolateColor(fadePercent);
      
      // Convert Y coordinates for SVG
      const p1y = screenHeight - (tabBarHeight + p1.y);
      const p2y = screenHeight - (tabBarHeight + p2.y);
      
      // Make key points of the heartbeat have slightly thicker lines
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

  // Circle's top-based coordinate
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