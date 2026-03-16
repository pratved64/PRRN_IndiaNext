from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# IMPORT AS REQUIRED
# from qdrant_client import QdrantClient
# from sqlalchemy import create_engine
# from sqlalchemy.orm import sessionmaker

from transformers import AutoTokenizer, AutoModelForSequenceClassification, ViTForImageClassification, ViTImageProcessor
from contextlib import asynccontextmanager

DISTILBERT_MODEL = "cybersectony/phishing-email-detection-distilbert_v2.4.1"
VIT_MODEL = "prithivMLmods/Deep-Fake-Detector-v2-Model"

@asynccontextmanager
async def lifespan(app: FastAPI):
    # --- DistilBERT phishing model ---
    print("Loading phishing detection model...")
    try:
        app.state.tokenizer = AutoTokenizer.from_pretrained(DISTILBERT_MODEL)
        distilbert = AutoModelForSequenceClassification.from_pretrained(DISTILBERT_MODEL)
        distilbert.eval()
        app.state.model = distilbert
        print("Phishing model loaded.")
    except Exception as e:
        print(f"Warning: Could not load phishing model. Error: {e}")
        app.state.tokenizer = None
        app.state.model = None

    # --- ViT deepfake model ---
    print("Loading deepfake detection model...")
    try:
        app.state.vit_processor = ViTImageProcessor.from_pretrained(VIT_MODEL)
        vit = ViTForImageClassification.from_pretrained(VIT_MODEL)
        vit.eval()
        app.state.vit_model = vit
        print("Deepfake model loaded.")
    except Exception as e:
        print(f"Warning: Could not load deepfake model. Error: {e}")
        app.state.vit_processor = None
        app.state.vit_model = None
    
    yield
    
    # Teardown
    app.state.tokenizer = None
    app.state.model = None
    app.state.vit_processor = None
    app.state.vit_model = None

# Pass lifespan into the FastAPI init
app = FastAPI(lifespan=lifespan)

# CORS Setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database Connections Placeholders
# PG_URL = "postgresql://user:password@localhost:5432/hackathon_db"
# engine = create_engine(PG_URL)
# SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# qdrant = QdrantClient(host="localhost", port=6333)

# Include the Phishing Pipeline router
from pipelines.phishing.api_routes import router as phishing_router
app.include_router(phishing_router)

# Include the URL Analysis router
from pipelines.url.url_routes import router as url_router
app.include_router(url_router)

# Include the Video Deepfake router
from pipelines.video_deepfake.video_routes import router as video_router
app.include_router(video_router)

@app.get("/api/health")
def health_check():
    return {"status": "ok", "message": "Backend is locked and loaded."}