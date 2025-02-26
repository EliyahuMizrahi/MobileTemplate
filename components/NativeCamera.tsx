import React, {
  useRef,
  useState,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from "react";
import {
  Text,
  View,
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
} from "react-native";
// If your version doesn't export CameraType, remove this import and just use facing="back"
import {
  CameraView,
  // CameraType,  // <-- remove if it doesn't exist in your expo-camera version
  useCameraPermissions,
  PermissionStatus,
} from "expo-camera";

import * as tf from "@tensorflow/tfjs";
import "@tensorflow/tfjs-react-native";
import { loadGraphModel, image, dispose, Tensor } from "@tensorflow/tfjs";
import * as FileSystem from "expo-file-system";
import { decodeJpeg } from "@tensorflow/tfjs-react-native";

import { nonMaxSuppression } from "@/utils/nonMaxSuppression";

export type Detection = {
  x: number;
  y: number;
  width: number;
  height: number;
  score: number;
  class: number;
};

interface NativeCameraProps {
  onDetection?: (detection: Detection | null) => void;
}

/**
 * Convert raw detection [cx, cy, w, h, score, class] → bounding box
 */
function convertToBoundingBox(
  det: number[],
  originalWidth: number,
  originalHeight: number
) {
  const [cx, cy, w, h, score, classId] = det;
  const x1 = (cx - w / 2) * (originalWidth / 640);
  const y1 = (cy - h / 2) * (originalHeight / 640);
  return {
    x: x1,
    y: y1,
    width: w * (originalWidth / 640),
    height: h * (originalHeight / 640),
    score,
    class: classId,
  };
}

/**
 * Picks detection whose center is closest to the image center
 */
function pickCenterDetection(
  allDets: Detection[],
  width: number,
  height: number
) {
  if (!allDets.length) return -1;
  const centerX = width / 2;
  const centerY = height / 2;

  let minDist = Number.MAX_VALUE;
  let bestIndex = -1;

  allDets.forEach((det, index) => {
    const detCenterX = det.x + det.width / 2;
    const detCenterY = det.y + det.height / 2;
    const dist = (detCenterX - centerX) ** 2 + (detCenterY - centerY) ** 2;
    if (dist < minDist) {
      minDist = dist;
      bestIndex = index;
    }
  });

  return bestIndex;
}

export const NativeCamera = forwardRef(({ onDetection }: NativeCameraProps, ref) => {
  const cameraRef = useRef<CameraView>(null);
  useImperativeHandle(ref, () => cameraRef.current);

  // Hook-based permissions from expo-camera
  const [cameraPermission, requestPermission] = useCameraPermissions();
  const [permissionAsked, setPermissionAsked] = useState(false);

  const [model, setModel] = useState<tf.GraphModel | null>(null);
  const [isModelReady, setIsModelReady] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);

  const [detections, setDetections] = useState<Detection[]>([]);
  const [chosenIndex, setChosenIndex] = useState(-1);

  // YOLOv7 model .json URL
  const MODEL_URL = "https://isaacsasson.github.io/tfjs-model/model.json";

  /**
   * Ensure camera permissions
   */
  const ensureCameraPermissions = async () => {
    setPermissionAsked(true);
    if (!cameraPermission || cameraPermission.status !== PermissionStatus.GRANTED) {
      const result = await requestPermission();
      if (!result.granted) {
        Alert.alert(
          "Camera Permission Required",
          "Please grant camera access in device settings.",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Open Settings",
              onPress: () => {
                if (Platform.OS === "ios") {
                  Linking.openURL("app-settings:");
                } else {
                  Linking.openSettings();
                }
              },
            },
          ]
        );
      }
    }
  };

  /**
   * Initialize TF & load model
   */
  useEffect(() => {
    (async () => {
      // 1) Permissions
      await ensureCameraPermissions();

      // 2) TF init
      await tf.ready();
      setLoadingProgress(0.1);

      // 3) Load YOLOv7
      try {
        const loadedModel = await loadGraphModel(MODEL_URL, {
          onProgress: (frac) => setLoadingProgress(Math.max(0.2, frac)),
        });
        setModel(loadedModel);
        setLoadingProgress(1.0);
        setIsModelReady(true);
      } catch (err) {
        console.error("Failed to load model:", err);
        Alert.alert(
          "Model Loading Error",
          "Failed to load YOLOv7. Check your connection."
        );
      }
    })();
    // no cleanup
  }, []);

  /**
   * Take picture & run detection
   */
  const detectObjects = async () => {
    if (!isModelReady || !model || !cameraRef.current) return;

    try {
      // Take a picture
      const photo = await cameraRef.current.takePictureAsync({
        skipProcessing: true,
        quality: 0.5,
      });

      // Photo could theoretically be undefined, so check
      if (!photo?.uri) {
        console.warn("No photo or URI returned from takePictureAsync");
        return;
      }

      // Decode to Tensor
      const base64Img = await FileSystem.readAsStringAsync(photo.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const rawImageData = tf.util.encodeString(base64Img, "base64").buffer;
      const raw = new Uint8Array(rawImageData);

      let imgTensor: tf.Tensor3D;
      try {
        imgTensor = decodeJpeg(raw);
      } catch (decodeError) {
        console.error("Image decode error:", decodeError);
        return;
      }

      // Preprocess for YOLOv7
      const resized = image.resizeBilinear(imgTensor, [640, 640]);
      const normalized = resized.div(255.0);
      const transposed = normalized.transpose([2, 0, 1]);
      const inputTensor = transposed.expandDims(0);

      // Inference
      const output = model.execute(inputTensor) as Tensor | Tensor[];
      const outputTensors = Array.isArray(output) ? output : [output];
      const firstOutput = outputTensors[0];
      const outputArray = (firstOutput.arraySync() as number[][][])[0];
      dispose(outputTensors);

      // NMS
      const allDetections = nonMaxSuppression(outputArray);
      const threshold = 0.15;
      const filteredDetections = allDetections.filter((d) => d[4] >= threshold);

      // Convert to bounding boxes
      const screenWidth = imgTensor.shape[1];
      const screenHeight = imgTensor.shape[0];
      const newDets: Detection[] = filteredDetections.map((det: number[]) =>
        convertToBoundingBox(det, screenWidth, screenHeight)
      );

      setDetections(newDets);

      // Pick detection near center
      const chosenDetIndex = pickCenterDetection(newDets, screenWidth, screenHeight);
      setChosenIndex(chosenDetIndex);

      if (onDetection) {
        onDetection(chosenDetIndex >= 0 ? newDets[chosenDetIndex] : null);
      }

      dispose([imgTensor, resized, normalized, transposed, inputTensor]);
    } catch (err) {
      console.error("Error during detection:", err);
    }
  };

  /**
   * Periodically run detection
   */
  useEffect(() => {
    // Let TS infer the timer type to avoid NodeJS vs. DOM mismatch
    let interval: ReturnType<typeof setInterval> | null = null;

    const canRun = cameraPermission?.granted && isModelReady && model;
    if (canRun) {
      interval = setInterval(() => {
        detectObjects();
      }, 1000); // 1 second
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [cameraPermission, isModelReady, model]);

  /**
   * Render permission screen
   */
  const renderPermissionScreen = () => (
    <View className="flex-1 bg-[#161622] justify-center items-center p-6">
      <Text className="text-white font-medium text-lg text-center mb-4">
        {permissionAsked ? "Camera access denied" : "Camera permission required"}
      </Text>
      <Text className="text-gray-300 text-center mb-6">
        {permissionAsked
          ? "Please enable camera access in your device settings to use this feature."
          : "This app needs access to your camera to detect objects."}
      </Text>
      {!permissionAsked ? (
        <CustomButton
          title="Grant Camera Access"
          handlePress={ensureCameraPermissions}
          containerStyles="w-64"
        />
      ) : (
        <CustomButton
          title="Open Settings"
          handlePress={() => {
            if (Platform.OS === "ios") {
              Linking.openURL("app-settings:");
            } else {
              Linking.openSettings();
            }
          }}
          containerStyles="w-64"
        />
      )}
    </View>
  );

  // If cameraPermission is still unknown
  if (!cameraPermission) {
    return (
      <View className="flex-1 bg-[#161622] justify-center items-center">
        <ActivityIndicator size="large" color="#a5bbde" />
        <Text className="text-white font-medium mt-4">
          Requesting camera permission...
        </Text>
      </View>
    );
  }

  // If permission denied
  if (!cameraPermission.granted) {
    return renderPermissionScreen();
  }

  // If model still loading
  if (!isModelReady) {
    return (
      <View className="flex-1 bg-[#161622] justify-center items-center">
        <ActivityIndicator size="large" color="#a5bbde" />
        <Text className="text-white font-medium mt-4">
          Loading YOLOv7 Model...
        </Text>
        <View className="w-64 h-2 bg-gray-800 rounded-full mt-2 overflow-hidden">
          <View
            className="h-full bg-[#a5bbde] rounded-full"
            style={{ width: `${loadingProgress * 100}%` }}
          />
        </View>
        <Text className="text-white text-xs mt-1">
          {Math.floor(loadingProgress * 100)}%
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#161622]">
      <CameraView
        ref={cameraRef}
        style={{ flex: 1 }}
        // If your version has no CameraType, just do facing="back"
        facing="back"
      />
      {/* Detections overlay */}
      <View className="absolute inset-0">
        {detections.map((det, i) => {
          const isChosen = i === chosenIndex;
          return (
            <View
              key={i}
              className="absolute border-2"
              style={{
                left: det.x,
                top: det.y,
                width: det.width,
                height: det.height,
                borderColor: isChosen ? "#a5bbde" : "#666666",
              }}
            >
              <View
                className={`absolute inset-0 ${
                  isChosen ? "bg-blue-200/20" : "bg-gray-200/20"
                }`}
              />
              <Text className="text-white bg-black/50 m-1 px-2 rounded text-xs font-medium">
                Class: {det.class} | {(det.score * 100).toFixed(1)}%
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
});

const CustomButton = ({ title, handlePress, containerStyles }: any) => (
  <View
    className={`bg-[#a5bbde] rounded-md ${containerStyles || ""}`}
    style={{ opacity: 1 }}
  >
    <Text className="text-center py-3 px-4 text-[#161622] font-bold" onPress={handlePress}>
      {title}
    </Text>
  </View>
);
