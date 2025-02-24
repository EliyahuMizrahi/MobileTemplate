import React, { useRef, useEffect, useState } from "react";
import { SafeAreaView, Text, View } from "react-native";
import Webcam from "react-webcam";
import * as tf from "@tensorflow/tfjs";
import { nonMaxSuppression } from "@/utils/nonMaxSuppression";

/** A detection bounding box plus label info. */
type Detection = {
  x: number;
  y: number;
  width: number;
  height: number;
  score: number;
  class: number;
};

// Converts a YOLOv7 [x_center, y_center, w, h] to [x1, y1, x2, y2].
function xywh2xyxy(box: number[]): number[] {
  const [cx, cy, w, h] = box;
  return [
    cx - w / 2, // x1
    cy - h / 2, // y1
    cx + w / 2, // x2
    cy + h / 2, // y2
  ];
}

export function WebCamera() {
  const webcamRef = useRef<Webcam>(null);
  const [model, setModel] = useState<tf.GraphModel | null>(null);
  const [isModelReady, setIsModelReady] = useState(false);
  const [detections, setDetections] = useState<Detection[]>([]);

  // Update the model URL to point to your YOLOv7 model hosted on GitHub Pages.
  const MODEL_URL = "https://isaacsasson.github.io/tfjs-model/model.json";

  useEffect(() => {
    (async () => {
      await tf.ready();
      const loadedModel = await tf.loadGraphModel(MODEL_URL, {
        onProgress: (progress: number) => {
          console.log(`Model loading progress: ${(progress * 100).toFixed(2)}%`);
        },
      });
      setModel(loadedModel);
      setIsModelReady(true);
      console.log("YOLOv7 Model loaded. Input nodes:", loadedModel.inputs);
      console.log("YOLOv7 Model loaded. Output nodes:", loadedModel.outputs);

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

  const detectObjects = async () => {
    if (!model || !webcamRef.current?.video) return;

    const videoEl = webcamRef.current.video as HTMLVideoElement;
    if (!videoEl.videoWidth || !videoEl.videoHeight) return;

    // Get displayed video size
    const videoRect = videoEl.getBoundingClientRect();
    const displayedVideoW = videoRect.width;
    const displayedVideoH = videoRect.height;

    // Preprocess the current video frame for YOLOv7
    let frameTensor = tf.browser.fromPixels(videoEl);

    // If the image has 4 channels, slice out the alpha channel.
    if (frameTensor.shape[2] === 4) {
      frameTensor = frameTensor.slice(
        [0, 0, 0] as [number, number, number],
        [frameTensor.shape[0], frameTensor.shape[1], 3] as [number, number, number]
      );
    }

    // Resize to 640x640, normalize, transpose to [1,3,640,640]
    const resized = tf.image.resizeBilinear(frameTensor, [640, 640]);
    const normalized = resized.div(255.0);
    const transposed = normalized.transpose([2, 0, 1]);
    const inputTensor = transposed.expandDims(0);

    // Execute the model
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

    // YOLOv7 often outputs shape [1, N, 6+], with [x, y, w, h, objectConfidence, classConfidence...]
    // Or some variants might produce [1,N,6], depending on your exported model.
    const outputArray = (firstOutput.arraySync() as number[][][])[0];

    // Dispose the output Tensors
    tf.dispose(outputTensors);

    // Run your custom NMS that leaves you with [x, y, w, h, score, classId]
    const allDetections = nonMaxSuppression(outputArray);

    // Filter by detection threshold
    const threshold = 0.8;
    const filteredDetections = allDetections.filter((det) => det[4] >= threshold);

    // Each detection is [cx, cy, w, h, score, class].
    // Convert [cx, cy, w, h] → [x1, y1, x2, y2], then scale to the displayed size.
    const newDetections: Detection[] = filteredDetections.map((det: number[]) => {
      const [cx, cy, w, h, score, classId] = det;
      const [x1, y1, x2, y2] = xywh2xyxy([cx, cy, w, h]);
      return {
        x: (x1 * displayedVideoW) / 640,
        y: (y1 * displayedVideoH) / 640,
        width: ((x2 - x1) * displayedVideoW) / 640,
        height: ((y2 - y1) * displayedVideoH) / 640,
        score,
        class: classId,
      };
    });

    setDetections(newDetections);
    tf.dispose([frameTensor, resized, normalized, transposed, inputTensor]);
  };

  // Use requestAnimationFrame for continuous detection
  useEffect(() => {
    let animationFrameId: number;
    const detectLoop = async () => {
      await detectObjects();
      animationFrameId = requestAnimationFrame(detectLoop);
    };
    if (model) {
      detectLoop();
    }
    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [model]);

  if (!isModelReady) {
    return (
      <SafeAreaView className="flex-1 bg-gray-900 justify-center items-center">
        <Text className="text-white">Loading YOLOv7 Model...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-800">
      <Webcam
        ref={webcamRef}
        className="w-full h-full object-contain"
        videoConstraints={{
          width: window.innerWidth,
          height: window.innerHeight,
        }}
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
      />
      {/* Overlay for detections */}
      <View className="absolute inset-0">
        {detections.map((det, i) => (
          <View
            key={i}
            style={{
              position: "absolute",
              left: det.x,
              top: det.y,
              width: det.width,
              height: det.height,
              borderWidth: 2,
              borderColor: "#a5bbde",
              backgroundColor: "rgba(165,187,222,0.2)",
            }}
          >
            {/* Text Label for Class and Score */}
            <Text
              style={{
                color: "#FFFFFF",
                backgroundColor: "rgba(0, 0, 0, 0.5)",
                margin: 2,
                paddingHorizontal: 4,
                borderRadius: 2,
              }}
            >
              Class: {det.class} | Score: {(det.score * 100).toFixed(1)}%
            </Text>
          </View>
        ))}
      </View>
    </SafeAreaView>
  );
}