import {
  ObjectDetector,
  FilesetResolver
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.2";

const demosSection = document.getElementById("demos");
const video = document.getElementById("webcam");
const liveView = document.getElementById("liveView");
const webcamButton = document.getElementById("webcamButton");

let objectDetector;
let runningMode = "IMAGE";
let children = [];
let lastVideoTime = -1;

// Initialize the object detector
const initializeObjectDetector = async () => {
  const vision = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.2/wasm"
  );
  objectDetector = await ObjectDetector.createFromOptions(vision, {
      baseOptions: {
          modelAssetPath: `https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/float16/1/efficientdet_lite0.tflite`,
          delegate: "GPU"
      },
      scoreThreshold: 0.5,
      runningMode: runningMode
  });
  demosSection.classList.remove("invisible");
};
initializeObjectDetector();

// Enable the live webcam view and start detection
async function enableCam() {
  if (!objectDetector) {
      console.log("Wait! objectDetector not loaded yet.");
      return;
  }

  webcamButton.classList.add("removed");

  const constraints = {
      video: true
  };

  try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      video.srcObject = stream;
      video.addEventListener("loadeddata", predictWebcam);
  } catch (err) {
      console.error("Error accessing webcam: ", err);
      alert("Error accessing webcam: " + err.message);
  }
}

// Start webcam prediction
async function predictWebcam() {
  if (runningMode === "IMAGE") {
      runningMode = "VIDEO";
      await objectDetector.setOptions({ runningMode: "VIDEO" });
  }
  let startTimeMs = performance.now();

  if (video.currentTime !== lastVideoTime) {
      lastVideoTime = video.currentTime;
      const detections = await objectDetector.detectForVideo(video, startTimeMs);
      displayVideoDetections(detections);
  }
  window.requestAnimationFrame(predictWebcam);
}

// Display video detections
function displayVideoDetections(detections) {
  // Remove any highlighting from previous frame.
  for (let child of children) {
      liveView.removeChild(child);
  }
  children.splice(0);

  // Ensure detections is an array
  if (Array.isArray(detections.detections)) {
      // Iterate through predictions and draw them to the live view
      detections.detections.forEach(detection => {
          const category = detection.categories[0];

          const p = document.createElement("p");
          p.innerText =
              category.categoryName +
              " - with " +
              Math.round(category.score * 100) +
              "% confidence.";
          p.style =
              "left: " +
              (video.offsetWidth - detection.boundingBox.width - detection.boundingBox.originX) +
              "px;" +
              "top: " +
              detection.boundingBox.originY +
              "px; " +
              "width: " +
              (detection.boundingBox.width - 10) + "px;";

          const highlighter = document.createElement("div");
          highlighter.setAttribute("class", "highlighter");
          highlighter.style =
              "left: " +
              (video.offsetWidth - detection.boundingBox.width - detection.boundingBox.originX) +
              "px;" +
              "top: " +
              detection.boundingBox.originY +
              "px;" +
              "width: " +
              (detection.boundingBox.width - 10) + "px;" +
              "height: " +
              detection.boundingBox.height + "px;";

          liveView.appendChild(highlighter);
          liveView.appendChild(p);

          // Store drawn objects in memory so they are queued to delete at next call.
          children.push(highlighter);
          children.push(p);
      });
  } else {
      console.warn("No detections found or detections is not an array.");
  }
}

// Event listener for webcam button
webcamButton.addEventListener("click", enableCam);
