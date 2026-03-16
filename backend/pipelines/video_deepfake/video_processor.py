"""
video_processor.py — Phase 1 & 2 of the Deepfake Detection Pipeline

Phase 1: extract_frames         → OpenCV frame sampling at 1 fps
Phase 2: detect_and_crop_faces  → OpenCV Haar Cascade face detection,
                                  10% padded, 224×224 crops returned as RGB arrays
video_processor.py — Smart Extraction Engine
"""
import cv2
import numpy as np
import mediapipe as mp

TARGET_SIZE = 224  # ViT input requirement
mp_face_detection = mp.solutions.face_detection

# Load OpenCV's bundled frontal-face Haar Cascade (no extra files needed)
_face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
def _safe_crop(frame: np.ndarray, x1: int, y1: int, x2: int, y2: int) -> np.ndarray:
    """Clamp bounding box to frame dimensions before slicing."""
    h, w = frame.shape[:2]
    x1 = max(0, x1)
    y1 = max(0, y1)
    x2 = min(w, x2)
    y2 = min(h, y2)
    return frame[y1:y2, x1:x2]


# ---------------------------------------------------------------------------
# Phase 1: Frame Extraction
# ---------------------------------------------------------------------------

def extract_faces_from_video(video_path: str, target_face_count: int = 30, padding: float = 0.10) -> list[np.ndarray]:
    """
    Step 1.2: Open video_path with OpenCV, sample exactly one frame per second.

    Returns:
        List of BGR NumPy arrays, one per sampled second.
    Raises:
        ValueError: if the file cannot be opened or has no frames.
    Smart Extraction Engine (Phase 1):
    Scans the video evenly to find and extract up to `target_face_count` faces using MediaPipe.
    """
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise ValueError(f"Cannot open video: {video_path}")

    source_fps: float = cap.get(cv2.CAP_PROP_FPS)
    total_frames: int = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

    if source_fps <= 0 or total_frames <= 0:
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    if total_frames <= 0:
        cap.release()
        raise ValueError(f"Invalid video metadata (fps={source_fps}, frames={total_frames})")
        raise ValueError(f"Invalid video metadata (frames={total_frames})")

    # How many source frames equal one second in the video
    frame_interval = max(1, int(round(source_fps / fps)))
    # Step 1.2: Calculate interval to scan evenly
    interval = max(1, total_frames // target_face_count)

    sampled: list[np.ndarray] = []
    face_crops: list[np.ndarray] = []
    frame_idx = 0

    while True:
        ret, frame = cap.read()
        if not ret:
            break
        if frame_idx % frame_interval == 0:
            sampled.append(frame)
        frame_idx += 1
    # Step 1.3: Read frame and run MediaPipe
    with mp_face_detection.FaceDetection(model_selection=1, min_detection_confidence=0.5) as face_detector:
        while True:
            ret, frame = cap.read()
            if not ret:
                break

    cap.release()
    return sampled
            if frame_idx % interval == 0:
                rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                results = face_detector.process(rgb_frame)

                if results.detections:
                    # Grab the primary detected face
                    detection = results.detections[0]
                    bboxC = detection.location_data.relative_bounding_box
                    h, w, _ = frame.shape
                    
                    x = int(bboxC.xmin * w)
                    y = int(bboxC.ymin * h)
                    bw = int(bboxC.width * w)
                    bh = int(bboxC.height * h)

# ---------------------------------------------------------------------------
# Phase 2: Face Detection & Cropping
# ---------------------------------------------------------------------------
                    pad_x = int(bw * padding)
                    pad_y = int(bh * padding)

def _safe_crop(frame: np.ndarray, x1: int, y1: int, x2: int, y2: int) -> np.ndarray:
    """Clamp bounding box to frame dimensions before slicing."""
    h, w = frame.shape[:2]
    x1 = max(0, x1)
    y1 = max(0, y1)
    x2 = min(w, x2)
    y2 = min(h, y2)
    return frame[y1:y2, x1:x2]
                    crop = _safe_crop(frame, x - pad_x, y - pad_y, x + bw + pad_x, y + bh + pad_y)

                    if crop.size > 0:
                        resized = cv2.resize(crop, (TARGET_SIZE, TARGET_SIZE))
                        face_crops.append(cv2.cvtColor(resized, cv2.COLOR_BGR2RGB))

def detect_and_crop_faces(
    frames: list[np.ndarray],
    padding: float = 0.10,
) -> list[np.ndarray]:
    """
    Step 2.1–2.3: For each frame, run OpenCV Haar Cascade face detection.
    Applies `padding` (10%) to the bounding box and resizes the crop to 224×224.
            # Step 1.4: Stop scanning if we hit our target count
            if len(face_crops) >= target_face_count:
                break
                
            frame_idx += 1

    Returns:
        List of RGB 224×224 NumPy arrays — one per frame where a face was found.
        Frames with no detected face are silently skipped.
    """
    face_crops: list[np.ndarray] = []
    cap.release()
    return face_crops

    for frame in frames:
        h, w = frame.shape[:2]
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

        # Step 2.2: Detect faces with Haar Cascade
        detections = _face_cascade.detectMultiScale(
            gray,
            scaleFactor=1.1,
            minNeighbors=5,
            minSize=(60, 60),
        )
def extract_face_from_image(image_bytes: bytes, padding: float = 0.10) -> np.ndarray | None:
    """
    Runs MediaPipe cropper once on a raw uploaded image.
    """
    nparr = np.frombuffer(image_bytes, np.uint8)
    frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    if frame is None:
        return None

        if len(detections) == 0:
            continue  # No face found in this frame — skip

        # Take the first (largest area) detection
        x, y, bw, bh = detections[0]

        # Step 2.3: 10% padding on each side
        pad_x = int(bw * padding)
        pad_y = int(bh * padding)

        crop = _safe_crop(frame, x - pad_x, y - pad_y, x + bw + pad_x, y + bh + pad_y)

        if crop.size == 0:
            continue

        # Resize to 224×224 and convert BGR → RGB for PIL / ViT processor
        resized = cv2.resize(crop, (TARGET_SIZE, TARGET_SIZE))
        face_crops.append(cv2.cvtColor(resized, cv2.COLOR_BGR2RGB))

    return face_crops
    with mp_face_detection.FaceDetection(model_selection=1, min_detection_confidence=0.5) as face_detector:
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = face_detector.process(rgb_frame)
        
        if results.detections:
            detection = results.detections[0]
            bboxC = detection.location_data.relative_bounding_box
            h, w, _ = frame.shape
            
            x = int(bboxC.xmin * w)
            y = int(bboxC.ymin * h)
            bw = int(bboxC.width * w)
            bh = int(bboxC.height * h)
            
            pad_x = int(bw * padding)
            pad_y = int(bh * padding)
            
            crop = _safe_crop(frame, x - pad_x, y - pad_y, x + bw + pad_x, y + bh + pad_y)
            
            if crop.size > 0:
                resized = cv2.resize(crop, (TARGET_SIZE, TARGET_SIZE))
                return cv2.cvtColor(resized, cv2.COLOR_BGR2RGB)
                
    return None
