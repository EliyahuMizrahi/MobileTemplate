import React from "react";
import { Platform, SafeAreaView, Text } from "react-native";
import { NativeCamera } from "@/components/NativeCamera";  // Adjust path if needed
import { WebCamera } from "@/components/WebCamera";        // Adjust path if needed

/**
 * CameraScreen decides which camera component to render based on the platform.
 */
export default function CameraScreen() {
  if (Platform.OS === "web") {
    // Render the web-based camera
    return <WebCamera />;
  }

  // Render the native (iOS/Android) camera
  return <NativeCamera />;
}