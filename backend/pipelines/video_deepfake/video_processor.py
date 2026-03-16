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

mp_face_detection = mp.solutions.face_detection
TARGET_SIZE = 224  # ViT input requirement

def _safe_crop(frame: np.ndarray, x1: int, y1: int, x2: int, y2: int) -> np.ndarray:
    """Clamps the bounding box to the frame dimensions to prevent slice errors."""
    h, w = frame.shape[:2]
    x1, y1 = max(0, x1), max(0, y1)
    x2, y2 = min(w, x2), min(h, y2)
    return frame[y1:y2, x1:x2]


def extract_faces_from_video(video_path: str, target_face_count: int = 35, padding: float = 0.20) -> list[np.ndarray]:
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

    # Use the stable solutions API context manager
    with mp_face_detection.FaceDetection(model_selection=1, min_detection_confidence=0.5) as face_detector:
        for i in range(0, total_frames, scan_interval):
            cap.set(cv2.CAP_PROP_POS_FRAMES, i)
            ret, frame = cap.read()
            if not ret:
                continue

            # Convert BGR to RGB for MediaPipe and ViT
            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            results = face_detector.process(rgb_frame)
            
            current_box = None

            if results.detections:
                # Grab the primary detected face's relative bounding box
                bbox = results.detections[0].location_data.relative_bounding_box
                h, w, _ = frame.shape
                
                # Convert normalized coordinates to absolute pixels
                x = int(bbox.xmin * w)
                y = int(bbox.ymin * h)
                bw = int(bbox.width * w)
                bh = int(bbox.height * h)

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

    with mp_face_detection.FaceDetection(model_selection=1, min_detection_confidence=0.5) as face_detector:
        results = face_detector.process(rgb_frame)
        
        if results.detections:
            bbox = results.detections[0].location_data.relative_bounding_box
            h, w, _ = frame.shape
            
            x = int(bbox.xmin * w)
            y = int(bbox.ymin * h)
            bw = int(bbox.width * w)
            bh = int(bbox.height * h)
            
            pad_x = int(bw * padding)
            pad_y = int(bh * padding)
            
            crop = _safe_crop(rgb_frame, x - pad_x, y - pad_y, x + bw + pad_x, y + bh + pad_y)
            
            if crop.size > 0 and crop.shape[0] > 0 and crop.shape[1] > 0:
                resized = cv2.resize(crop, (TARGET_SIZE, TARGET_SIZE))
                return [resized]
                
    return []