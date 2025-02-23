import React, { useRef, useEffect, useState } from "react";
import { SafeAreaView, View, Text } from "react-native";
import Webcam from "react-webcam";
import * as tf from "@tensorflow/tfjs";
import * as cocossd from "@tensorflow-models/coco-ssd";

export function WebCamera() {
  const webcamRef = useRef<Webcam>(null);
  const [model, setModel] = useState<cocossd.ObjectDetection | null>(null);
  const [predictions, setPredictions] = useState<any[]>([]);
  const [isModelReady, setIsModelReady] = useState(false);
  // Scale factors to convert video coordinates to container coordinates.
  const [scale, setScale] = useState({ scaleX: 1, scaleY: 1 });

  useEffect(() => {
    const loadModel = async () => {
      await tf.ready();
      const loadedModel = await cocossd.load();
      setModel(loadedModel);
      setIsModelReady(true);
    };
    loadModel();
  }, []);

  // Updates the scale factors based on the video's displayed size.
  const updateScale = () => {
    const video = webcamRef.current?.video;
    if (video && video.videoWidth && video.videoHeight) {
      // Get the current dimensions of the rendered video element.
      const rect = video.getBoundingClientRect();
      const scaleX = rect.width / video.videoWidth;
      const scaleY = rect.height / video.videoHeight;
      setScale({ scaleX, scaleY });
    }
  };

  useEffect(() => {
    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, []);

  // Runs object detection on the video at a fixed interval.
  const detectObjects = async () => {
    if (
      model &&
      webcamRef.current &&
      webcamRef.current.video &&
      !webcamRef.current.video.paused &&
      !webcamRef.current.video.ended
    ) {
      const video = webcamRef.current.video as HTMLVideoElement;
      const detections = await model.detect(video);
      setPredictions(detections);
    }
  };

  useEffect(() => {
    const intervalId = setInterval(() => {
      detectObjects();
    }, 200); // roughly 5 times per second
    return () => clearInterval(intervalId);
  }, [model]);

  if (!isModelReady) {
    return (
      <SafeAreaView className="flex-1 bg-secondary justify-center items-center">
        <Text className="text-white">Loading TensorFlow model for web...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-secondary">
      {/* The Webcam fills the container using object-cover to scale appropriately */}
      <Webcam
        ref={webcamRef}
        className="w-full h-full object-cover"
        onUserMedia={updateScale} // update scale when media starts
      />

      {/* Render bounding box overlays scaled to the displayed video */}
      {predictions.map((item, index) => {
        const [x, y, width, height] = item.bbox;
        const left = x * scale.scaleX;
        const top = y * scale.scaleY;
        const boxWidth = width * scale.scaleX;
        const boxHeight = height * scale.scaleY;
        return (
          <View
            key={index}
            className="absolute border-2 border-secondary justify-center items-center"
            style={{ left, top, width: boxWidth, height: boxHeight }}
          >
            <Text className="bg-secondary text-black font-bold p-1">
              {item.class} ({Math.round(item.score * 100)}%)
            </Text>
          </View>
        );
      })}
    </SafeAreaView>
  );
}