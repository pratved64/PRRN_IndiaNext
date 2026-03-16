from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# IMPORT AS REQUIRED
# from qdrant_client import QdrantClient
# from sqlalchemy import create_engine
# from sqlalchemy.orm import sessionmaker

from transformers import AutoTokenizer, AutoModelForSequenceClassification
from contextlib import asynccontextmanager

MODEL_NAME = "cybersectony/phishing-email-detection-distilbert_v2.4.1"

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Setup Phase 1: Shared State & Initialization
    print("Loading global models and tokenizers...")
    try:
        app.state.tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
        model = AutoModelForSequenceClassification.from_pretrained(MODEL_NAME)
        model.eval()
        app.state.model = model
        print("Models loaded successfully!")
    except Exception as e:
        print(f"Warning: Could not load model/tokenizer. Error: {e}")
        app.state.tokenizer = None
        app.state.model = None
    
    yield
    
    # Teardown
    app.state.tokenizer = None
    app.state.model = None

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
from pipelines.api_routes import router as phishing_router
app.include_router(phishing_router)

# Include the URL Analysis router
from pipelines.url.url_routes import router as url_router
app.include_router(url_router)

@app.get("/api/health")
def health_check():
    return {"status": "ok", "message": "Backend is locked and loaded."}