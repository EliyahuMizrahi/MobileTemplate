import React, { useRef, useEffect, useState } from "react";
import { SafeAreaView, Text, View } from "react-native";
import Webcam from "react-webcam";
import * as tf from "@tensorflow/tfjs";

/** A detection bounding box plus label info. */
type Detection = {
  x: number;
  y: number;
  width: number;
  height: number;
  score: number;
  class: number;
};

export function WebCamera() {
  const webcamRef = useRef<Webcam>(null);
  const [model, setModel] = useState<tf.GraphModel | null>(null);
  const [isModelReady, setIsModelReady] = useState(false);
  const [detections, setDetections] = useState<Detection[]>([]);

  // NOTE: The SSD MobileNet model returns class IDs, not names.
  // To display names, supply your own label mapping (e.g., for COCO).
  const MODEL_URL = "https://isaacsasson.github.io/tfjs-model/model.json";

  useEffect(() => {
    (async () => {
      await tf.ready();
      const loadedModel = await tf.loadGraphModel(MODEL_URL);
      setModel(loadedModel);
      setIsModelReady(true);
      console.log("Model loaded. Input nodes:", loadedModel.inputs);
      console.log("Model loaded. Output nodes:", loadedModel.outputs);
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
    
    // Convert current video frame to a Tensor
    let frameTensor = tf.browser.fromPixels(videoEl);
    if (frameTensor.shape[2] === 4) {
      frameTensor = frameTensor.slice([0, 0, 0], [-1, -1, 3]);
    }
    
    // Resize to 300x300 (SSD MobileNet input) and maintain uint8 type
    const resized = tf.image.resizeBilinear(frameTensor, [300, 300]);
    const inputTensor = resized.expandDims(0).toInt();
    
    // Execute the model using the correct input key ("input_tensor")
    // The converted model returns 8 outputs; we use outputs[6] (class scores)
    // and outputs[7] (candidate boxes) for postprocessing.
    let outputs: tf.Tensor[];
    try {
      outputs = (await model.executeAsync({ input_tensor: inputTensor })) as tf.Tensor[];
    } catch (err) {
      console.error("Error during model execution:", err);
      tf.dispose([frameTensor, resized, inputTensor]);
      return;
    }
    
    console.log("Raw model outputs:", outputs.map(t => t.shape));
    // Expected:
    // outputs[6]: [1, 1917, 91]  <-- candidate class scores
    // outputs[7]: [1, 1917, 4]   <-- candidate boxes
    
    const candidateClassesTensor = outputs[6];
    const candidateBoxesTensor = outputs[7];
    
    const candidateClassesData = (await candidateClassesTensor.array()) as number[][][];
    const candidateBoxesData = (await candidateBoxesTensor.array()) as number[][][];
    const candidateClasses = candidateClassesData[0]; // shape [1917, 91]
    const candidateBoxes = candidateBoxesData[0];     // shape [1917, 4]
    
    // For each candidate box, compute the maximum score and corresponding class.
    const candidateScores = candidateClasses.map(row => {
      let maxScore = 0;
      let classId = -1;
      for (let i = 0; i < row.length; i++) {
        if (row[i] > maxScore) {
          maxScore = row[i];
          classId = i;
        }
      }
      return { maxScore, classId };
    });
    
    // Convert candidate boxes and scores to tensors for non-max suppression.
    const boxesTensor2D = tf.tensor2d(candidateBoxes); // shape [1917, 4]
    const scoresTensor1D = tf.tensor1d(candidateScores.map(item => item.maxScore));
    
    const selectedIndices = await tf.image.nonMaxSuppressionAsync(
      boxesTensor2D,
      scoresTensor1D,
      100,   // max detections
      0.5,   // IOU threshold
      0.5    // score threshold
    );
    const selectedIndicesData = await selectedIndices.array() as number[];
    
    const newDetections: Detection[] = [];
    // Scale coordinates from 300x300 input space to displayed video size.
    selectedIndicesData.forEach(idx => {
      const [ymin, xmin, ymax, xmax] = candidateBoxes[idx];
      const score = candidateScores[idx].maxScore;
      const classId = candidateScores[idx].classId;
      newDetections.push({
        x: xmin * displayedVideoW,
        y: ymin * displayedVideoH,
        width: (xmax - xmin) * displayedVideoW,
        height: (ymax - ymin) * displayedVideoH,
        score,
        class: classId
      });
    });
    
    setDetections(newDetections);
    
    tf.dispose([frameTensor, resized, inputTensor, boxesTensor2D, scoresTensor1D, selectedIndices, ...outputs]);
  };
  
  useEffect(() => {
    const timer = setInterval(detectObjects, 300);
    return () => clearInterval(timer);
  }, [model]);
  
  if (!isModelReady) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#222", justifyContent: "center", alignItems: "center" }}>
        <Text style={{ color: "#fff" }}>Loading SSD MobileNet Model...</Text>
      </SafeAreaView>
    );
  }
  
  return (
    <SafeAreaView style={{ flex: 1, overflow: "hidden", backgroundColor: "#333" }}>
      <Webcam 
        ref={webcamRef} 
        className="w-full h-full object-contain" 
        videoConstraints={{ width: window.innerWidth, height: window.innerHeight }}
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
      />
      {/* Overlay for detections */}
      <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}>
        {detections.map((det, i) => {
          // Compute center and radius from detection box
          const centerX = det.x + det.width / 2;
          const centerY = det.y + det.height / 2;
          const radius = (det.width + det.height) / 4; // average radius
          // Outer circle style
          const outerStyle = {
            position: "absolute" as const,
            left: centerX - radius,
            top: centerY - radius,
            width: radius * 2,
            height: radius * 2,
            borderRadius: radius,
            borderWidth: 2,
            borderColor: "#a5bbde",
            backgroundColor: "rgba(165,187,222, 0.2)",
            overflow: "hidden" as const
          };
          // Inner small circle style
          const innerSize = 10;
          const innerStyle = {
            position: "absolute" as const,
            left: radius - innerSize / 2,
            top: radius - innerSize / 2,
            width: innerSize,
            height: innerSize,
            borderRadius: innerSize / 2,
            backgroundColor: "#a5bbde"
          };
          return (
            <View key={i} style={outerStyle}>
              <View style={innerStyle} />
            </View>
          );
        })}
      </View>
    </SafeAreaView>
  );
}