import React, { useEffect, useState } from "react";
import { 
  View, 
  Text, 
  TouchableOpacity, 
  SafeAreaView, 
  Platform 
} from "react-native";

// Only require these on mobile to avoid "navigator" errors on web:
let Camera: any;
let useCameraPermissions: any;
let tf: any;
let cameraWithTensors: any;
let cocossd: any;

if (Platform.OS !== "web") {
  Camera = require("expo-camera").Camera;
  useCameraPermissions = require("expo-camera").useCameraPermissions;
  tf = require("@tensorflow/tfjs-react-native");
  cameraWithTensors = tf.cameraWithTensors;
  cocossd = require("@tensorflow-models/coco-ssd");
}

// Example bounding box component
import { ObjectBox } from "@/components/ObjectBox";

export function NativeCamera() {
  // If we're on web, just render a "not supported" view
  if (Platform.OS === "web") {
    return (
      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor: "black",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Text style={{ color: "#fff" }}>NativeCamera is not supported on web.</Text>
      </SafeAreaView>
    );
  }

  // State
  const [type, setType] = useState<"front" | "back">("back");
  const [permission, requestPermission] = useCameraPermissions();
  const [isTfReady, setIsTfReady] = useState(false);
  const [model, setModel] = useState<any>(null);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [predictions, setPredictions] = useState<any[]>([]);

  useEffect(() => {
    // Only run if we're not on web
    if (Platform.OS === "web") return;

    (async () => {
      // Request camera permission
      if (!permission || !permission.granted) {
        await requestPermission();
      }

      // Wait for TensorFlow to be ready
      await tf.ready();
      setIsTfReady(true);

      // Load the COCO-SSD model
      try {
        const loadedModel = await cocossd.load();
        setModel(loadedModel);
        setIsModelLoaded(true);
      } catch (err) {
        console.log("Error loading model:", err);
      }
    })();
  }, [permission]);

  // The main camera loop for predictions
  const handleCameraStream = (
    images: IterableIterator<any>,
    updatePreview: () => void,
    gl: WebGLRenderingContext
  ) => {
    const loop = async () => {
      if (!model) {
        requestAnimationFrame(loop);
        return;
      }

      const nextImageTensor = images.next().value;
      if (nextImageTensor) {
        try {
          const detections = await model.detect(nextImageTensor);
          setPredictions(detections);
        } catch (err) {
          console.error("Detection error:", err);
        } finally {
          // Dispose of the tensor to free memory
          tf.dispose(nextImageTensor);
        }
      }
      requestAnimationFrame(loop);
    };

    loop();
  };

  const toggleCameraType = () => {
    setType((prev) => (prev === "back" ? "front" : "back"));
  };

  // Return early states (permissions, TF loading, model loading, etc.)
  if (!permission) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "black", justifyContent: "center", alignItems: "center" }}>
        <Text style={{ color: "#fff" }}>Requesting camera permission...</Text>
      </SafeAreaView>
    );
  }
  if (!permission.granted) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "black", justifyContent: "center", alignItems: "center" }}>
        <Text style={{ color: "#fff" }}>Camera permission not granted.</Text>
      </SafeAreaView>
    );
  }
  if (!isTfReady) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "black", justifyContent: "center", alignItems: "center" }}>
        <Text style={{ color: "#fff" }}>TensorFlow is loading...</Text>
      </SafeAreaView>
    );
  }
  if (!isModelLoaded) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "black", justifyContent: "center", alignItems: "center" }}>
        <Text style={{ color: "#fff" }}>Loading COCO-SSD model...</Text>
      </SafeAreaView>
    );
  }

  // Create TensorCamera after we've ensured tf is loaded
  const TensorCamera = cameraWithTensors(Camera);

  // Render the TensorCamera with bounding box overlays
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "black" }}>
      <View style={{ flex: 1, position: "relative" }}>
        <TensorCamera
          style={{ flex: 1 }}
          type={type} // "back" or "front"
          zoom={0.0005}
          cameraTextureHeight={1920}
          cameraTextureWidth={1080}
          resizeHeight={200}
          resizeWidth={152}
          resizeDepth={3}
          autorender={true}
          useCustomShadersToResize={false}
          onReady={handleCameraStream}
        />

        {/* Overlays for predictions */}
        <View style={{ position: "absolute", left: 0, top: 0, right: 0, bottom: 0 }}>
          {predictions.map((prediction, i) => {
            // Only display if score is high enough
            if (prediction.score > 0.66) {
              const marginLeft = Math.round(prediction.bbox[0]) * 3;
              const marginTop = Math.round(prediction.bbox[1]) * 3;
              const width = Math.round(prediction.bbox[2]) * 3;
              const height = Math.round(prediction.bbox[3]) * 3;
              return (
                <ObjectBox
                  key={i}
                  marginLeft={marginLeft}
                  marginTop={marginTop}
                  width={width}
                  height={height}
                  label={prediction.class}
                  score={prediction.score}
                />
              );
            }
            return null;
          })}
        </View>

        <TouchableOpacity
          onPress={toggleCameraType}
          style={{
            position: "absolute",
            bottom: 20,
            left: 20,
            backgroundColor: "#333",
            padding: 10,
            borderRadius: 5,
          }}
        >
          <Text style={{ color: "#fff" }}>Flip Camera</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
