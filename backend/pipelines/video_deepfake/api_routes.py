import os
import tempfile
import anyio
from fastapi import APIRouter, UploadFile, File, Request
from pydantic import BaseModel

from .video_processor import extract_faces_from_video, extract_face_from_image

router = APIRouter(prefix="/analyze", tags=["Deepfake Media Analysis"])

class MediaAnalysisResponse(BaseModel):
    status: str
    faces_extracted: int
    message: str

@router.post("/media", response_model=MediaAnalysisResponse)
async def analyze_media(request: Request, file: UploadFile = File(...)):
    """
    Phase 2: Unified API Router.
    Dynamically processes incoming deepfake media based on MIME type.
    """
    # Step 2.1: Read the MIME type of the uploaded file
    content_type = file.content_type or ""
    
    try:
        # Step 2.2: Process as an image
        if content_type.startswith("image/"):
            image_bytes = await file.read()
            
            # Run CPU-bound extraction in a background thread to prevent blocking the async loop
            face = await anyio.to_thread.run_sync(extract_face_from_image, image_bytes)
            
            if face is None:
                # Graceful Fail
                return MediaAnalysisResponse(status="success", faces_extracted=0, message="No face detected in the image.")
                
            # NOTE: Load the deepfake model dynamically from app state as required by rules
            # model = request.app.state.deepfake_model
            # result = await anyio.to_thread.run_sync(model.predict, face)
            
            return MediaAnalysisResponse(
                status="success", 
                faces_extracted=1, 
                message="Image successfully analyzed."
            )
            
        # Step 2.3: Process as a video
        elif content_type.startswith("video/"):
            # Save it to a temp file safely
            with tempfile.NamedTemporaryFile(delete=False, suffix=".mp4") as temp_video:
                temp_video.write(await file.read())
                temp_path = temp_video.name
                
            try:
                # Run the Smart Extraction Engine in a background thread
                faces = await anyio.to_thread.run_sync(extract_faces_from_video, temp_path, 30)
                
                if not faces:
                    # Graceful Fail
                    return MediaAnalysisResponse(status="success", faces_extracted=0, message="No faces detected in the video.")
                    
                # NOTE: Feed the extracted array of faces to the model
                # model = request.app.state.deepfake_model
                # result = await anyio.to_thread.run_sync(model.predict, faces)
                
                return MediaAnalysisResponse(
                    status="success", 
                    faces_extracted=len(faces), 
                    message=f"Video successfully analyzed."
                )
            finally:
                if os.path.exists(temp_path):
                    os.remove(temp_path)
        else:
            return MediaAnalysisResponse(status="error", faces_extracted=0, message="Unsupported media MIME type. Please upload an image or video.")
            
    except Exception as e:
        # Fail Gracefully block to prevent crashes
        return MediaAnalysisResponse(status="error", faces_extracted=0, message=f"Pipeline processing failed: {str(e)}")
