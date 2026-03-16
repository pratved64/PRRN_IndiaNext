Phase 1: Safe Bounding Box Padding (The Math)MediaPipe outputs normalized coordinates (between 0.0 and 1.0). When converting these to exact pixel coordinates, expanding the box by 20% introduces a major crash risk: if the face is near the edge of the frame, adding 20% will push your slicing coordinates outside the image array, causing an immediate OpenCV IndexError.

Step 1.1: Extract the raw bounding box $x, y, width, height$ from MediaPipe.

Step 1.2: Convert normalized coordinates to absolute pixels using the frame's shape (frame.shape).

Step 1.3: Calculate a 20% padding delta based on the face's width and height.

Step 1.4 (The Trap Check): Use Python's max(0, ...) and min(dimension, ...) functions to rigidly clamp the new padded coordinates so they never exceed the physical boundaries of the video frame.

Phase 2: The State Machine (The Fallback Memory)Your frame loop needs to stop being stateless. It needs to remember the past.

Step 2.1: Before the video loop starts, initialize a variable: last_known_box = None.

Step 2.2: Inside the loop, when MediaPipe successfully detects a face, calculate the padded coordinates, use them to crop the frame, and overwrite last_known_box with those exact pixel coordinates.

Step 2.3: If MediaPipe fails to detect a face (returns None), write an else condition that checks if last_known_box is populated.

Step 2.4: If it is populated, use those old coordinates to blindly crop the current frame. This forces the ViT to look at the exact spot where the face "broke."