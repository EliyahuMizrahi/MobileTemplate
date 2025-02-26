import React, { useState, useRef, useCallback } from "react";
import { SafeAreaView, View, Text, Animated, Platform } from "react-native";
import { WebCamera, type Detection } from "@/components/WebCamera";
import { NativeCamera } from "@/components/NativeCamera";
import CustomButton from "@/components/CustomButton";
import { router, useFocusEffect } from "expo-router";

export default function CameraScreen() {
  const [boundingBox, setBoundingBox] = useState<Detection | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isCaptured, setIsCaptured] = useState(false);
  const cameraRef = useRef<any>(null);
  const isWeb = Platform.OS === 'web';
  
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
    if (!cameraRef.current || !boundingBox) {
      console.error("Camera element not found or no bounding box detected");
      return;
    }

    if (isWeb) {
      const video = cameraRef.current.video;
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
    } else {
      // For native, take a picture and crop it
      cameraRef.current.takePictureAsync({
        skipProcessing: false,
        quality: 1,
      }).then((photo: any) => {
        // In real implementation, you'd crop the photo based on boundingBox
        setCapturedImage(photo.uri);
      });
    }
    
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
        params: { thumbnail: capturedImage },
      });
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-[#161622]">
      {/* Camera view */}
      <View className="flex-1 relative">
        {isWeb ? (
          <WebCamera ref={cameraRef} onDetection={handleDetection} />
        ) : (
          <NativeCamera ref={cameraRef} onDetection={handleDetection} />
        )}
        
        {/* Center indicator */}
        <View className="absolute inset-0 items-center justify-center">
          <View className="w-4 h-4 rounded-full border-2 border-[#a5bbde] bg-transparent" />
          <Text className="text-[#a5bbde] font-medium text-xs mt-1 bg-[#161622]/70 px-2 py-1 rounded text-center">
            Center object to appraise
          </Text>
        </View>
        
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