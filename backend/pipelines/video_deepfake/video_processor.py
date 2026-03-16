"""
media_processor.py — Smart Extraction Engine for Deepfake Detection (Stable Version)

Features:
- Uses stable MediaPipe Solutions API (Guaranteed to bypass Windows C-binding bugs).
- 20% Bounding Box Padding to capture blending boundaries.
- Last-Known-Good Fallback to catch glitching frames where detection fails.
"""
import cv2
import numpy as np
import mediapipe as mp
from pathlib import Path
from urllib.request import urlretrieve
from urllib.error import URLError, HTTPError

TARGET_SIZE = 224  # ViT input requirement

# MediaPipe 0.10.30+ no longer exposes `mp.solutions` (AttributeError).
# Use Tasks FaceDetector and lazily download the official model if needed.
_BLAZE_FACE_MODEL_URL = (
    "https://storage.googleapis.com/mediapipe-models/face_detector/"
    "blaze_face_short_range/float16/1/blaze_face_short_range.tflite"
)
_DEFAULT_MODEL_PATH = Path(__file__).resolve().parent / "models" / "blaze_face_short_range.tflite"


def _ensure_face_model(model_path: Path = _DEFAULT_MODEL_PATH) -> Path:
    model_path.parent.mkdir(parents=True, exist_ok=True)
    if model_path.exists():
        return model_path

    try:
        urlretrieve(_BLAZE_FACE_MODEL_URL, model_path)
    except (URLError, HTTPError) as e:
        raise RuntimeError(
            "MediaPipe FaceDetector model is missing and could not be downloaded. "
            f"Download it manually from {_BLAZE_FACE_MODEL_URL!r} and save it to {str(model_path)!r}. "
            f"Original error: {e}"
        ) from e

    return model_path


def _create_face_detector():
    # New API (MediaPipe Tasks)
    tasks_err: Exception | None = None
    try:
        from mediapipe.tasks import python as mp_python
        from mediapipe.tasks.python import vision

        model_path = _ensure_face_model()
        options = vision.FaceDetectorOptions(
            base_options=mp_python.BaseOptions(model_asset_path=str(model_path)),
        )
        return vision.FaceDetector.create_from_options(options)
    except Exception as e:
        tasks_err = e

    # Old API fallback (if available)
    if hasattr(mp, "solutions"):
        mp_face_detection = mp.solutions.face_detection
        return mp_face_detection.FaceDetection(model_selection=1, min_detection_confidence=0.5)

    raise RuntimeError(
        "Unable to initialize MediaPipe face detector. "
        "Your mediapipe build does not expose `mp.solutions`, and tasks FaceDetector could not be created. "
        f"Tasks error: {tasks_err!r}"
    )


def _extract_bbox_xywh(detection) -> tuple[int, int, int, int] | None:
    """
    Normalize MediaPipe detection bounding box to (x, y, w, h) in pixels.
    Supports both Tasks API and older Solutions API shapes.
    """
    # Tasks API: detection.bounding_box.{origin_x, origin_y, width, height}
    bbox = getattr(detection, "bounding_box", None)
    if bbox is not None:
        ox = getattr(bbox, "origin_x", None)
        oy = getattr(bbox, "origin_y", None)
        bw = getattr(bbox, "width", None)
        bh = getattr(bbox, "height", None)
        if None not in (ox, oy, bw, bh):
            return int(ox), int(oy), int(bw), int(bh)

    # Solutions API: detection.location_data.relative_bounding_box with normalized coords
    loc = getattr(detection, "location_data", None)
    rel = getattr(loc, "relative_bounding_box", None) if loc is not None else None
    if rel is not None:
        # Return normalized form; caller converts with frame dims.
        return (rel.xmin, rel.ymin, rel.width, rel.height)  # type: ignore[return-value]

    return None


_CASCADE = None


def _opencv_face_bboxes(rgb_frame: np.ndarray) -> list[tuple[int, int, int, int]]:
    """
    Last-resort CPU fallback that avoids MediaPipe native bindings entirely.
    Returns a list of (x, y, w, h) in pixels.
    """
    global _CASCADE
    if _CASCADE is None:
        _CASCADE = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")

    gray = cv2.cvtColor(rgb_frame, cv2.COLOR_RGB2GRAY)
    faces = _CASCADE.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(30, 30))
    return [(int(x), int(y), int(w), int(h)) for (x, y, w, h) in faces]


def _safe_crop(frame: np.ndarray, x1: int, y1: int, x2: int, y2: int) -> np.ndarray:
    """Clamps the bounding box to the frame dimensions to prevent slice errors."""
    h, w = frame.shape[:2]
    x1, y1 = max(0, x1), max(0, y1)
    x2, y2 = min(w, x2), min(h, y2)
    return frame[y1:y2, x1:x2]


def extract_faces_from_video(video_path: str, target_face_count: int = 500, padding: float = 0.15) -> list[np.ndarray]:
    """
    Scans the video evenly to extract up to `target_face_count` faces.
    Uses a memory fallback to capture deepfake glitches when detection fails.
    """
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise ValueError(f"Cannot open video: {video_path}")

    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    scan_interval = max(1, total_frames // 100)

    face_crops: list[np.ndarray] = []
    last_known_box = None

    face_detector = None
    use_opencv_fallback = False
    try:
        face_detector = _create_face_detector()
    except Exception:
        use_opencv_fallback = True
    try:
        for i in range(0, total_frames, scan_interval):
            cap.set(cv2.CAP_PROP_POS_FRAMES, i)
            ret, frame = cap.read()
            if not ret:
                continue

            # Convert BGR to RGB for MediaPipe and ViT
            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            detection0 = None
            if use_opencv_fallback:
                boxes = _opencv_face_bboxes(rgb_frame)
                if boxes:
                    detection0 = boxes[0]  # (x, y, w, h)
            else:
                # Tasks API expects a MediaPipe Image; Solutions API exposes `.process`.
                if hasattr(face_detector, "process"):
                    results = face_detector.process(rgb_frame)
                    detections = getattr(results, "detections", None) or []
                    detection0 = detections[0] if detections else None
                else:
                    mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_frame)
                    results = face_detector.detect(mp_image)
                    detections = getattr(results, "detections", None) or []
                    detection0 = detections[0] if detections else None
            
            current_box = None

            if detection0 is not None:
                h, w, _ = frame.shape
                xywh = detection0 if isinstance(detection0, tuple) else _extract_bbox_xywh(detection0)
                if xywh is None:
                    continue

                x, y, bw, bh = xywh
                # If bbox is normalized (Solutions API), convert to pixels
                if isinstance(x, float) or isinstance(y, float) or isinstance(bw, float) or isinstance(bh, float):
                    x = int(x * w)
                    y = int(y * h)
                    bw = int(bw * w)
                    bh = int(bh * h)

                # Apply 20% padding
                pad_x = int(bw * padding)
                pad_y = int(bh * padding)

                current_box = (x - pad_x, y - pad_y, x + bw + pad_x, y + bh + pad_y)
                last_known_box = current_box  # Update our memory
                
            elif last_known_box is not None:
                # THE FALLBACK: Detection failed (glitch/profile), reuse the last known box
                current_box = last_known_box

            # If we have a box, crop and save
            if current_box is not None:
                x1, y1, x2, y2 = current_box
                crop = _safe_crop(rgb_frame, x1, y1, x2, y2)

                # Validate crop size to prevent OpenCV resize crashes
                if crop.size > 0 and crop.shape[0] > 0 and crop.shape[1] > 0:
                    resized = cv2.resize(crop, (TARGET_SIZE, TARGET_SIZE))
                    face_crops.append(resized)

            # Stop scanning if we hit our target count
            if len(face_crops) >= target_face_count:
                break

    finally:
        # Tasks API uses `.close()`, Solutions API uses context manager.
        if face_detector is not None and hasattr(face_detector, "close"):
            try:
                face_detector.close()
            except Exception:
                pass

        cap.release()
    return face_crops


def extract_face_from_image(image_bytes: bytes, padding: float = 0.20) -> list[np.ndarray]:
    """
    Runs the stable MediaPipe detector once on a raw uploaded image.
    Returns a list containing the single RGB cropped face.
    """
    nparr = np.frombuffer(image_bytes, np.uint8)
    frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    if frame is None:
        return []

    rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

    face_detector = None
    use_opencv_fallback = False
    try:
        face_detector = _create_face_detector()
    except Exception:
        use_opencv_fallback = True
    try:
        detection0 = None
        if use_opencv_fallback:
            boxes = _opencv_face_bboxes(rgb_frame)
            if boxes:
                detection0 = boxes[0]
        else:
            if hasattr(face_detector, "process"):
                results = face_detector.process(rgb_frame)
                detections = getattr(results, "detections", None) or []
                detection0 = detections[0] if detections else None
            else:
                mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_frame)
                results = face_detector.detect(mp_image)
                detections = getattr(results, "detections", None) or []
                detection0 = detections[0] if detections else None

        if detection0 is not None:
            h, w, _ = frame.shape
            xywh = detection0 if isinstance(detection0, tuple) else _extract_bbox_xywh(detection0)
            if xywh is None:
                return []

            x, y, bw, bh = xywh
            if isinstance(x, float) or isinstance(y, float) or isinstance(bw, float) or isinstance(bh, float):
                x = int(x * w)
                y = int(y * h)
                bw = int(bw * w)
                bh = int(bh * h)

            pad_x = int(bw * padding)
            pad_y = int(bh * padding)

            crop = _safe_crop(rgb_frame, x - pad_x, y - pad_y, x + bw + pad_x, y + bh + pad_y)

            if crop.size > 0 and crop.shape[0] > 0 and crop.shape[1] > 0:
                resized = cv2.resize(crop, (TARGET_SIZE, TARGET_SIZE))
                return [resized]
    finally:
        if face_detector is not None and hasattr(face_detector, "close"):
            try:
                face_detector.close()
            except Exception:
                pass
                
    return []
