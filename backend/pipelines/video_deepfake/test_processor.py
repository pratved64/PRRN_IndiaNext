import cv2
import os
from video_processor import extract_faces_from_video

# Create a folder to dump the test images
os.makedirs("test_crops", exist_ok=True)

# Use your exact video path
video_path = r"C:\Users\vedpr\Videos\DaVinci Resolve\Clip 2.mp4"

print(f"Extracting faces from {video_path}...")
try:
    # Requesting 35 frames
    faces = extract_faces_from_video(video_path, target_face_count=35)
    print(f"Success! Extracted {len(faces)} face crops.")
    
    # Save them to disk so you can visually inspect them
    for i, face_arr in enumerate(faces):
        # Convert RGB back to BGR for OpenCV saving
        bgr_face = cv2.cvtColor(face_arr, cv2.COLOR_RGB2BGR)
        cv2.imwrite(f"test_crops/face_{i}.jpg", bgr_face)
        
    print("Check the 'test_crops' folder to see the padded faces!")
except Exception as e:
    print(f"Pipeline crashed: {e}")