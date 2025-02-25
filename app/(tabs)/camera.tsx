import React, { useState, useRef, useCallback } from "react";
import { SafeAreaView, View, Text, Animated } from "react-native";
import { WebCamera, type Detection } from "@/components/WebCamera";
import CustomButton from "@/components/CustomButton";
import { router, useFocusEffect } from "expo-router";

export default function CameraScreen() {
  const [boundingBox, setBoundingBox] = useState<Detection | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isCaptured, setIsCaptured] = useState(false);
  const webcamRef = useRef<any>(null);
  
  // Animation values
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const positionAnim = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;

  const handleDetection = (detection: Detection | null) => {
    setBoundingBox(detection);
  };

  useFocusEffect(
    useCallback(() => {
      // Reset state when screen is focused (i.e. when returning from Appraise)
      setCapturedImage(null);
      setIsCaptured(false);
      setBoundingBox(null);
    }, [])
  );

  const handleCapture = () => {
    if (!webcamRef.current?.video || !boundingBox) {
      console.error("Video element not found or no bounding box detected");
      return;
    }

    const video = webcamRef.current.video;
    const canvas = document.createElement("canvas");
    canvas.width = boundingBox.width;
    canvas.height = boundingBox.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      console.error("Could not get canvas context");
      return;
    }
    // Draw only the detected object
    ctx.drawImage(
      video,
      boundingBox.x,
      boundingBox.y,
      boundingBox.width,
      boundingBox.height,
      0,
      0,
      boundingBox.width,
      boundingBox.height
    );

    const croppedImage = canvas.toDataURL("image/png");
    setCapturedImage(croppedImage);
    setIsCaptured(true);

    Animated.sequence([
      Animated.delay(300),
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 0.5,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(positionAnim, {
          toValue: { x: 0, y: -150 },
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0.8,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),
    ]).start(() => {
      router.push({
        pathname: "/(appraise)/appraise",
        params: { thumbnail: croppedImage },
      });
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-[#161622]">
      {/* Camera view */}
      <View className="flex-1 relative">
        <WebCamera ref={webcamRef} onDetection={handleDetection} />
        {/* Center indicator */}
        <View className="absolute top-1/2 left-1/2 items-center">
          <View className="w-4 h-4 rounded-full border-2 border-[#a5bbde] -ml-2 -mt-2 bg-transparent" />
          <Text className="text-[#a5bbde] font-medium text-xs mt-1 -ml-20 bg-[#161622]/70 px-2 py-1 rounded">
            Center object to appraise
          </Text>
        </View>
        {/* Removed extra bounding box overlay */}
        {/* Captured image overlay (animated) */}
        {isCaptured && capturedImage && (
          <Animated.Image
            source={{ uri: capturedImage }}
            style={{
              position: "absolute",
              left: boundingBox?.x ?? 0,
              top: boundingBox?.y ?? 0,
              width: boundingBox?.width ?? 0,
              height: boundingBox?.height ?? 0,
              transform: [
                { scale: scaleAnim },
                { translateX: positionAnim.x },
                { translateY: positionAnim.y },
              ],
              opacity: opacityAnim,
              resizeMode: "contain",
            }}
          />
        )}
      </View>
      {/* Controls */}
      <View className="absolute bottom-0 left-0 right-0 p-4 bg-[#161622] bg-opacity-80">
        <CustomButton
          title="Appraise"
          handlePress={handleCapture}
          containerStyles="w-full"
          isLoading={isCaptured}
        />
      </View>
    </SafeAreaView>
  );
}