import React, { useEffect, useRef, useState } from "react";
import { 
  Platform, 
  SafeAreaView, 
  View, 
  Text 
} from "react-native";
import Webcam from "react-webcam";
import * as tf from "@tensorflow/tfjs";
import * as cocossd from "@tensorflow-models/coco-ssd";

export function WebCamera() {
  // If we're not on web, render a placeholder (or nothing).
  if (Platform.OS !== "web") {
    return (
      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor: "black",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Text style={{ color: "#fff" }}>WebCamera only supported on web.</Text>
      </SafeAreaView>
    );
  }

  const webcamRef = useRef<Webcam>(null);
  const [model, setModel] = useState<cocossd.ObjectDetection | null>(null);
  const [predictions, setPredictions] = useState<any[]>([]);
  const [isModelReady, setIsModelReady] = useState(false);

  // Scale factors to convert video coordinates to container coordinates
  const [scale, setScale] = useState({ scaleX: 1, scaleY: 1 });

  useEffect(() => {
    // Check if the browser supports getUserMedia
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      console.error("Webcam is not supported in this browser.");
      return;
    }

    // Load TF and the COCO-SSD model
    const loadModel = async () => {
      await tf.ready();
      const loadedModel = await cocossd.load();
      setModel(loadedModel);
      setIsModelReady(true);
    };
    loadModel();
  }, []);

  // Updates the scale factors based on the video's displayed size
  const updateScale = () => {
    const video = webcamRef.current?.video;
    if (video && video.videoWidth && video.videoHeight) {
      const rect = video.getBoundingClientRect();
      const scaleX = rect.width / video.videoWidth;
      const scaleY = rect.height / video.videoHeight;
      setScale({ scaleX, scaleY });
    }
  };

  // Recompute scale on resize
  useEffect(() => {
    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, []);

  // Runs object detection on the video every 200ms (~5fps for speed)
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
    }, 200);
    return () => clearInterval(intervalId);
  }, [model]);

  if (!isModelReady) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "black", justifyContent: "center", alignItems: "center" }}>
        <Text style={{ color: "#fff" }}>Loading TensorFlow model for web...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "black" }}>
      {/* The webcam fills the container; objectFit: cover to scale properly */}
      <Webcam
        ref={webcamRef}
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
        onUserMedia={updateScale} 
      />

      {/* Render bounding boxes scaled to the displayed video */}
      {predictions.map((item, index) => {
        const [x, y, width, height] = item.bbox;
        const left = x * scale.scaleX;
        const top = y * scale.scaleY;
        const boxWidth = width * scale.scaleX;
        const boxHeight = height * scale.scaleY;

        return (
          <View
            key={index}
            style={{
              position: "absolute",
              borderWidth: 2,
              borderColor: "#00FF00",
              left,
              top,
              width: boxWidth,
              height: boxHeight,
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Text
              style={{
                backgroundColor: "#00FF00",
                color: "#000",
                fontWeight: "bold",
                padding: 2,
              }}
            >
              {item.class} ({Math.round(item.score * 100)}%)
            </Text>
          </View>
        );
      })}
    </SafeAreaView>
  );
}
