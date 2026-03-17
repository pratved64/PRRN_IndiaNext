# pipelines/shared/model_loader.py
# Shared lazy loaders — imported by main.py AND any route that needs a model.
# Keeping them here breaks the circular import between main.py and route files.

from fastapi import FastAPI

DISTILBERT_MODEL = "cybersectony/phishing-email-detection-distilbert_v2.4.1"
VIT_MODEL = "prithivMLmods/Deep-Fake-Detector-v2-Model"


async def get_phishing_model(app: FastAPI):
    if app.state.model is None:
        print("Loading phishing detection model...")
        try:
            from transformers import AutoTokenizer, AutoModelForSequenceClassification
            app.state.tokenizer = AutoTokenizer.from_pretrained(DISTILBERT_MODEL)
            distilbert = AutoModelForSequenceClassification.from_pretrained(DISTILBERT_MODEL)
            distilbert.eval()
            app.state.model = distilbert
            print("Phishing model loaded.")
        except Exception as e:
            print(f"Warning: Could not load phishing model. Error: {e}")
            raise e
    return app.state.tokenizer, app.state.model


async def get_vit_model(app: FastAPI):
    if app.state.vit_model is None:
        print("Loading deepfake detection model...")
        try:
            from transformers import ViTImageProcessor, ViTForImageClassification
            app.state.vit_processor = ViTImageProcessor.from_pretrained(VIT_MODEL)
            vit = ViTForImageClassification.from_pretrained(VIT_MODEL)
            vit.eval()
            app.state.vit_model = vit
            print("Deepfake model loaded.")
        except Exception as e:
            print(f"Warning: Could not load deepfake model. Error: {e}")
            raise e
    return app.state.vit_processor, app.state.vit_model