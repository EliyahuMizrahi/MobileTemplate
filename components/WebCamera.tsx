import React, { useRef, useEffect, useState, forwardRef, useImperativeHandle } from "react";
import { Text, View } from "react-native";
import Webcam from "react-webcam";
import * as tf from "@tensorflow/tfjs";
import { nonMaxSuppression } from "@/utils/nonMaxSuppression";

export type Detection = {
  x: number;
  y: number;
  width: number;
  height: number;
  score: number;
  class: number;
};

// Convert [cx, cy, w, h] → [x1, y1, x2, y2]
function xywh2xyxy(box: number[]): number[] {
  const [cx, cy, w, h] = box;
  return [cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2];
}

interface WebCameraProps {
  onDetection?: (detection: Detection | null) => void;
}

// Helper function to map detection coordinates from video to display
function mapToDisplayed(
  det: Detection,
  videoW: number,
  videoH: number,
  displayedW: number,
  displayedH: number
) {
  let source_width, source_height, source_x, source_y;
  if (videoW / videoH > displayedW / displayedH) {
    // Video is wider, crop sides
    source_height = videoH;
    source_width = videoH * (displayedW / displayedH);
    source_x = (videoW - source_width) / 2;
    source_y = 0;
  } else {
    // Video is taller, crop top/bottom
    source_width = videoW;
    source_height = videoW * (displayedH / displayedW);
    source_x = 0;
    source_y = (videoH - source_height) / 2;
  }

  const displayedX = ((det.x - source_x) / source_width) * displayedW;
  const displayedY = ((det.y - source_y) / source_height) * displayedH;
  const displayedWidth = (det.width / source_width) * displayedW;
  const displayedHeight = (det.height / source_height) * displayedH;
  return {
    x: displayedX,
    y: displayedY,
    width: displayedWidth,
    height: displayedHeight,
    score: det.score,
    class: det.class,
  };
}

export const WebCamera = forwardRef(({ onDetection }: WebCameraProps, ref) => {
  const webcamRef = useRef<Webcam>(null);
  const [model, setModel] = useState<tf.GraphModel | null>(null);
  const [isModelReady, setIsModelReady] = useState(false);
  const [detections, setDetections] = useState<Detection[]>([]);
  const [chosenIndex, setChosenIndex] = useState<number>(-1);

  // Forward the webcam ref to parent component
  useImperativeHandle(ref, () => webcamRef.current);

  // YOLOv7 model URL
  const MODEL_URL = "https://isaacsasson.github.io/tfjs-model/model.json";

  useEffect(() => {
    (async () => {
      await tf.ready();
      const loadedModel = await tf.loadGraphModel(MODEL_URL, {
        onProgress: (p) => {
          console.log(`Model loading: ${(p * 100).toFixed(2)}%`);
        },
      });
      setModel(loadedModel);
      setIsModelReady(true);

      // Optional warmup
      const inputShape = loadedModel.inputs[0].shape;
      if (inputShape) {
        const dummyInput = tf.ones(inputShape as number[]);
        const warmupResult = await loadedModel.executeAsync(dummyInput);
        tf.dispose(warmupResult);
        tf.dispose(dummyInput);
      }
    })();
  }, []);

  // Finds the detection whose center is closest to the screen center
  const pickCenterDetection = (
    allDets: Detection[],
    screenW: number,
    screenH: number
  ) => {
    if (allDets.length === 0) return -1;
    const centerX = screenW / 2;
    const centerY = screenH / 2;

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
  };

  const detectObjects = async () => {
    if (!model || !webcamRef.current?.video) return;
    const videoEl = webcamRef.current.video as HTMLVideoElement;
    if (!videoEl.videoWidth || !videoEl.videoHeight) return;

    const videoW = videoEl.videoWidth;
    const videoH = videoEl.videoHeight;
    const videoRect = videoEl.getBoundingClientRect();
    const displayedW = videoRect.width;
    const displayedH = videoRect.height;

    let frameTensor = tf.browser.fromPixels(videoEl);
    if (frameTensor.shape[2] === 4) {
      frameTensor = frameTensor.slice(
        [0, 0, 0],
        [frameTensor.shape[0], frameTensor.shape[1], 3]
      );
    }

    const resized = tf.image.resizeBilinear(frameTensor, [640, 640]);
    const normalized = resized.div(255.0);
    const transposed = normalized.transpose([2, 0, 1]);
    const inputTensor = transposed.expandDims(0);

    let output: tf.Tensor | tf.Tensor[];
    try {
      output = await model.executeAsync(inputTensor);
    } catch (err) {
      console.error("Error during model execution:", err);
      tf.dispose([frameTensor, resized, normalized, transposed, inputTensor]);
      return;
    }

    const outputTensors = Array.isArray(output) ? output : [output];
    const firstOutput = outputTensors[0];
    const outputArray = (firstOutput.arraySync() as number[][][])[0];

    tf.dispose(outputTensors);

    const allDetections = nonMaxSuppression(outputArray);
    const threshold = 0.1;
    const filteredDetections = allDetections.filter(
      (det) => det[4] >= threshold
    );

    // Calculate detections in original video coordinates
    const newDetections: Detection[] = filteredDetections.map(
      (det: number[]) => {
        const [cx, cy, w, h, score, classId] = det;
        const x1 = (cx - w / 2) * (videoW / 640);
        const y1 = (cy - h / 2) * (videoH / 640);
        const width = w * (videoW / 640);
        const height = h * (videoH / 640);
        return {
          x: x1,
          y: y1,
          width,
          height,
          score,
          class: classId,
        };
      }
    );

    setDetections(newDetections);

    // Map detections to displayed coordinates for rendering
    const displayedDets = newDetections.map(det => 
      mapToDisplayed(det, videoW, videoH, displayedW, displayedH)
    );
    
    const chosenDetIndex = pickCenterDetection(
      displayedDets,
      displayedW,
      displayedH
    );
    setChosenIndex(chosenDetIndex);
    
    const chosenDet =
      chosenDetIndex >= 0 ? newDetections[chosenDetIndex] : null;

    if (onDetection) {
      onDetection(chosenDet);
    }

    tf.dispose([frameTensor, resized, normalized, transposed, inputTensor]);
  };

  useEffect(() => {
    let animationFrameId: number;
    const loop = async () => {
      await detectObjects();
      animationFrameId = requestAnimationFrame(loop);
    };
    if (model) loop();
    return () => cancelAnimationFrame(animationFrameId);
  }, [model]);

  if (!isModelReady) {
    return (
      <View className="flex-1 bg-gray-900 justify-center items-center">
        <Text className="text-white font-medium">Loading YOLOv7 Model...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-800">
      {/* Main camera feed */}
      <Webcam
        ref={webcamRef}
        className="w-full h-full object-contain"
        videoConstraints={{
          width: typeof window !== 'undefined' ? window.innerWidth : 640,
          height: typeof window !== 'undefined' ? window.innerHeight : 480,
        }}
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
      />

      {/* Detections overlay */}
      <View className="absolute inset-0">
        {detections.map((det, i) => {
          if (!webcamRef.current?.video) return null;
          
          const videoEl = webcamRef.current.video as HTMLVideoElement;
          const videoW = videoEl.videoWidth;
          const videoH = videoEl.videoHeight;
          const videoRect = videoEl.getBoundingClientRect();
          const displayedW = videoRect.width;
          const displayedH = videoRect.height;
          
          const displayedDet = mapToDisplayed(det, videoW, videoH, displayedW, displayedH);
          const isChosen = i === chosenIndex;
          
          return (
            <View
              key={i}
              className="absolute border-2"
              style={{
                left: displayedDet.x,
                top: displayedDet.y,
                width: displayedDet.width,
                height: displayedDet.height,
              }}
            >
              <View className={`absolute inset-0 ${isChosen ? "border-[#a5bbde] bg-blue-200/20" : "border-gray-500 bg-gray-200/20"}`} />
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