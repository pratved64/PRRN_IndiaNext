"""
video_processor.py — Phase 1 & 2 of the Deepfake Detection Pipeline
Safe Bounding Box Padding with MediaPipe & State Machine Fallback
"""
import cv2
import numpy as np
import mediapipe as mp

TARGET_SIZE = 224

# Initialize MediaPipe Face Detection globally so it doesn't reload every frame
mp_face_detection = mp.solutions.face_detection
face_detector = mp_face_detection.FaceDetection(min_detection_confidence=0.5)
def _safe_crop(frame: np.ndarray, x1: int, y1: int, x2: int, y2: int) -> np.ndarray:
    """Clamp bounding box to frame dimensions before slicing."""
    h, w = frame.shape[:2]
    return frame[max(0, y1):min(h, y2), max(0, x1):min(w, x2)]

def _extract_padded_box(detection, frame_h: int, frame_w: int, padding: float = 0.20) -> tuple:
    """
    Phase 1: Safe Bounding Box Padding (The Math)
    Step 1.1-1.4: Convert MediaPipe normalized coords to pixels with safe padding.
    
    Returns: (x1, y1, x2, y2) clamped to frame boundaries
    """
    # Step 1.1 & 1.2: Extract normalized coords and convert to pixels
    bbox = detection.location_data.relative_bounding_box
    x = int(bbox.xmin * frame_w)
    y = int(bbox.ymin * frame_h)
    width = int(bbox.width * frame_w)
    height = int(bbox.height * frame_h)
    
    # Step 1.3: Calculate 20% padding delta
    pad_x = int(width * padding)
    pad_y = int(height * padding)
    
    # Step 1.4: Clamp to frame boundaries (The Trap Check)
    x1 = max(0, x - pad_x)
    y1 = max(0, y - pad_y)
    x2 = min(frame_w, x + width + pad_x)
    y2 = min(frame_h, y + height + pad_y)
    
    return (x1, y1, x2, y2)

def extract_faces_from_video(video_path: str, target_face_count: int = 30) -> list[np.ndarray]:
    """
    Smart Extraction Engine with State Machine Fallback.
    Phase 2: The State Machine (The Fallback Memory)
    """
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise ValueError(f"Cannot open video: {video_path}")

    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    if total_frames <= 0:
        cap.release()
        raise ValueError(f"Invalid video metadata (frames={total_frames})")

    interval = max(1, total_frames // target_face_count)
    face_crops = []
    frame_idx = 0
    
    # Step 2.1: Initialize fallback memory
    last_known_box = None

    while True:
        ret, frame = cap.read()
        if not ret:
            break
        
        if frame_idx % interval == 0:
            frame_h, frame_w = frame.shape[:2]
            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            results = face_detector.process(rgb_frame)
            
            # Step 2.2: If face detected, update fallback memory
            if results.detections and len(results.detections) > 0:
                detection = results.detections[0]
                x1, y1, x2, y2 = _extract_padded_box(detection, frame_h, frame_w)
                last_known_box = (x1, y1, x2, y2)
                
                crop = _safe_crop(frame, x1, y1, x2, y2)
                if crop.size > 0:
                    resized = cv2.resize(crop, (TARGET_SIZE, TARGET_SIZE))
                    face_crops.append(cv2.cvtColor(resized, cv2.COLOR_BGR2RGB))
            
            # Step 2.3 & 2.4: Use fallback if no detection but memory exists
            elif last_known_box is not None:
                x1, y1, x2, y2 = last_known_box
                crop = _safe_crop(frame, x1, y1, x2, y2)
                if crop.size > 0:
                    resized = cv2.resize(crop, (TARGET_SIZE, TARGET_SIZE))
                    face_crops.append(cv2.cvtColor(resized, cv2.COLOR_BGR2RGB))
                    
        if len(face_crops) >= target_face_count:
            break
            
        frame_idx += 1

    cap.release()
    return face_crops

def extract_face_from_image(image_bytes: bytes) -> np.ndarray | None:
    """Runs MediaPipe face detection once on a raw uploaded image."""
    nparr = np.frombuffer(image_bytes, np.uint8)
    frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    if frame is None:
        return None
    
    frame_h, frame_w = frame.shape[:2]
    rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    results = face_detector.process(rgb_frame)
    
    if results.detections and len(results.detections) > 0:
        detection = results.detections[0]
        x1, y1, x2, y2 = _extract_padded_box(detection, frame_h, frame_w)
        
        crop = _safe_crop(frame, x1, y1, x2, y2)
        if crop.size > 0:
            resized = cv2.resize(crop, (TARGET_SIZE, TARGET_SIZE))
            return cv2.cvtColor(resized, cv2.COLOR_BGR2RGB)
            
    return None
