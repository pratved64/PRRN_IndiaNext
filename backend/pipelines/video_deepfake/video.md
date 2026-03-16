Phase 1: The Smart Extraction Engine
We are going to rewrite your video_processor.py so that it doesn't just extract frames; it extracts faces.

Step 1.1: Pass the desired number of frames (e.g., target_face_count=30) to the function.

Step 1.2: Calculate an interval to scan the video evenly.

Step 1.3: Read a frame, immediately run MediaPipe on it. If a face is found, crop it and add it to our array. If no face is found, skip to the next interval.

Step 1.4: Stop scanning once we hit our target_face_count or reach the end of the video.

Phase 2: The Unified API Router
We will replace the /analyze/video endpoint with /analyze/media.

Step 2.1: Use FastAPI's UploadFile.content_type to read the MIME type of the uploaded file.

Step 2.2: If the MIME type starts with image/, read the file directly into a NumPy array using cv2.imdecode, run the MediaPipe cropper once, and pass it to the model.

Step 2.3: If the MIME type starts with video/, save it to a temp file, run the new Smart Extraction Engine, and pass the resulting array of faces to the model.