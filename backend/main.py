from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# IMPORT AS REQUIRED
# from qdrant_client import QdrantClient
# from sqlalchemy import create_engine
# from sqlalchemy.orm import sessionmaker

app = FastAPI()

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

@app.get("/api/health")
def health_check():
    return {"status": "ok", "message": "Backend is locked and loaded."}