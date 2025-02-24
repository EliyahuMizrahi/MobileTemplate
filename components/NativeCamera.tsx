// import React, { useEffect, useState } from "react";
// import { View, Text, TouchableOpacity, SafeAreaView } from "react-native";
// import { Camera, useCameraPermissions } from "expo-camera";
// import * as tf from "@tensorflow/tfjs";
// import "@tensorflow/tfjs-react-native";
// import { cameraWithTensors } from "@tensorflow/tfjs-react-native";
// import { ObjectBox } from "@/components/ObjectBox";
// // Adjust the path to your native YOLO model loader

// // Cast Camera to any to satisfy cameraWithTensors's expected component type.
// const TensorCamera = cameraWithTensors(Camera as any);

// export function NativeCamera() {
//   // Camera type: "back" or "front"
//   const [type, setType] = useState<"front" | "back">("back");
//   const [permission, requestPermission] = useCameraPermissions();
//   const [isTfReady, setIsTfReady] = useState(false);
//   const [model, setModel] = useState<tf.GraphModel | null>(null);
//   const [isModelLoaded, setIsModelLoaded] = useState(false);
//   const [predictions, setPredictions] = useState<any[]>([]);

//   useEffect(() => {
//     const loadModelAsync = async () => {
//       if (!permission || !permission.granted) {
//         await requestPermission();
//       }
//       await tf.ready();
//       setIsTfReady(true);
//       try {
//         const loadedModel = await loadYolov8Model();
//         setModel(loadedModel);
//         setIsModelLoaded(true);
//       } catch (err) {
//         console.log("Error loading YOLOv8n model:", err);
//       }
//     };
//     loadModelAsync();
//   }, [permission]);

//   // Main camera loop for predictions
//   const handleCameraStream = (
//     images: IterableIterator<tf.Tensor3D>,
//     updatePreview: () => void,
//     gl: WebGLRenderingContext
//   ) => {
//     const loop = async () => {
//       if (!model) {
//         requestAnimationFrame(loop);
//         return;
//       }
//       const nextImageTensor = images.next().value;
//       if (nextImageTensor) {
//         try {
//           const outputs = await model.executeAsync(nextImageTensor);
//           console.log("YOLOv8 raw outputs:", outputs);
//           // TODO: Process outputs and update predictions for overlay if desired.
//         } catch (err) {
//           console.error("Detection error:", err);
//         } finally {
//           tf.dispose(nextImageTensor);
//         }
//       }
//       requestAnimationFrame(loop);
//     };
//     loop();
//   };

//   const toggleCameraType = () => {
//     setType(prev => (prev === "back" ? "front" : "back"));
//   };

//   if (!permission) {
//     return (
//       <SafeAreaView style={{ flex: 1, backgroundColor: "black", justifyContent: "center", alignItems: "center" }}>
//         <Text style={{ color: "#fff" }}>Requesting camera permission...</Text>
//       </SafeAreaView>
//     );
//   }
//   if (!permission.granted) {
//     return (
//       <SafeAreaView style={{ flex: 1, backgroundColor: "black", justifyContent: "center", alignItems: "center" }}>
//         <Text style={{ color: "#fff" }}>Camera permission not granted.</Text>
//       </SafeAreaView>
//     );
//   }
//   if (!isTfReady) {
//     return (
//       <SafeAreaView style={{ flex: 1, backgroundColor: "black", justifyContent: "center", alignItems: "center" }}>
//         <Text style={{ color: "#fff" }}>TensorFlow is loading...</Text>
//       </SafeAreaView>
//     );
//   }
//   if (!isModelLoaded) {
//     return (
//       <SafeAreaView style={{ flex: 1, backgroundColor: "black", justifyContent: "center", alignItems: "center" }}>
//         <Text style={{ color: "#fff" }}>Loading YOLOv8n model...</Text>
//       </SafeAreaView>
//     );
//   }

//   return (
//     <SafeAreaView style={{ flex: 1, backgroundColor: "black" }}>
//       <View style={{ flex: 1, position: "relative" }}>
//         <TensorCamera
//           style={{ flex: 1 }}
//           type={type}
//           zoom={0.0005}
//           cameraTextureHeight={1920}
//           cameraTextureWidth={1080}
//           resizeHeight={200}
//           resizeWidth={152}
//           resizeDepth={3}
//           autorender={true}
//           useCustomShadersToResize={false}
//           onReady={handleCameraStream}
//         />

//         {/* Overlays for predictions – requires custom YOLO post-processing */}
//         <View style={{ position: "absolute", left: 0, top: 0, right: 0, bottom: 0 }}>
//           {predictions.map((prediction, i) => {
//             if (prediction.score > 0.66) {
//               const marginLeft = Math.round(prediction.bbox[0]) * 3;
//               const marginTop = Math.round(prediction.bbox[1]) * 3;
//               const width = Math.round(prediction.bbox[2]) * 3;
//               const height = Math.round(prediction.bbox[3]) * 3;
//               return (
//                 <ObjectBox
//                   key={i}
//                   marginLeft={marginLeft}
//                   marginTop={marginTop}
//                   width={width}
//                   height={height}
//                   label={prediction.class}
//                   score={prediction.score}
//                 />
//               );
//             }
//             return null;
//           })}
//         </View>

//         <TouchableOpacity
//           onPress={toggleCameraType}
//           style={{
//             position: "absolute",
//             bottom: 20,
//             left: 20,
//             backgroundColor: "#333",
//             padding: 10,
//             borderRadius: 5,
//           }}
//         >
//           <Text style={{ color: "#fff" }}>Flip Camera</Text>
//         </TouchableOpacity>
//       </View>
//     </SafeAreaView>
//   );
// }