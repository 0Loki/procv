import { FaceDetector, FilesetResolver } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0";

const video = document.getElementById("webcam");
const liveView = document.getElementById("liveView");
const enableWebcamButton = document.getElementById("webcamButton");
let faceDetector;

// Initialize the face detector
const initializeFaceDetector = async () => {
    const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
    );

    faceDetector = await FaceDetector.createFromOptions(vision, {
        baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite`,
            delegate: "GPU"
        },
        runningMode: "VIDEO" // Set running mode to VIDEO
    });

    // Show the demo section once the face detector is ready
    document.getElementById("demos").classList.remove("invisible");
};

// Call the initialization function
initializeFaceDetector();

// Check if webcam access is supported
const hasGetUserMedia = () => !!navigator.mediaDevices?.getUserMedia;

// If webcam supported, add event listener to button for activation
if (hasGetUserMedia()) {
    enableWebcamButton.addEventListener("click", enableCam);
} else {
    console.warn("getUserMedia() is not supported by your browser");
}

// Enable the live webcam view and start detection
async function enableCam() {
    if (!faceDetector) {
        alert("Face Detector is still loading. Please try again.");
        return;
    }

    // GetUserMedia parameters
    const constraints = { video: true };

    // Activate the webcam stream
    navigator.mediaDevices
        .getUserMedia(constraints)
        .then(function (stream) {
            video.srcObject = stream; // Set the video source to the webcam stream
            video.play(); // Ensure the video plays
            video.addEventListener("loadeddata", predictWebcam); // Start prediction once the video is loaded
        })
        .catch((err) => {
            console.error("Error accessing webcam: ", err);
            alert("Could not access the webcam. Please check your camera settings and permissions.");
        });
}

let lastVideoTime = -1;

async function predictWebcam() {
    // Detect faces using detectForVideo
    const startTimeMs = performance.now();

    if (video.currentTime !== lastVideoTime) {
        lastVideoTime = video.currentTime;
        const detections = await faceDetector.detectForVideo(video, startTimeMs).detections;
        displayVideoDetections(detections);
    }

    // Call this function again to keep predicting when the browser is ready
    window.requestAnimationFrame(predictWebcam);
}

function displayVideoDetections(detections) {
    // Remove any highlighting from previous frame
    liveView.querySelectorAll(".highlighter").forEach(el => el.remove()); // Clear previous detections

    // Iterate through predictions and draw them to the live view
    for (let detection of detections) {
        const highlighter = document.createElement("div");
        highlighter.setAttribute("class", "highlighter");
        highlighter.style = `left: ${video.offsetWidth - detection.boundingBox.width - detection.boundingBox.originX}px; 
                            top: ${detection.boundingBox.originY}px; 
                            width: ${detection.boundingBox.width}px; 
                            height: ${detection.boundingBox.height}px;`;

        liveView.appendChild(highlighter);
    }
}
