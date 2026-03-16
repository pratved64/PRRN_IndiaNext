# VERIFICATION COMMANDS

## 1. Exact command to start the unified server:
```bash
cd backend
uvicorn main:app --reload --port 8000
```

## 2. These curl commands to verify everything works:

```bash
curl http://localhost:8000/api/health

curl http://localhost:8000/api/sentinel/health

curl -X POST \
  http://localhost:8000/api/sentinel/analyze/test

curl -X POST \
  http://localhost:8000/api/sentinel/demo/scenario_1
```

## 3. Expected response for each curl:

### GET /api/health
```json
{
  "status": "ok",
  "message": "Backend is locked and loaded.",
  "sentinel_models_loaded": true,
  "users_trained": 3,
  "services": {
    "phishing_pipeline": "active",
    "behavior_detection": "active"
  }
}
```

### GET /api/sentinel/health
```json
{
  "status": "ok",
  "models_loaded": true,
  "users_trained": 3
}
```

### POST /api/sentinel/analyze/test
Returns full ExplanationPayload with anomaly analysis results.

### POST /api/sentinel/demo/scenario_1
Returns full ExplanationPayload for scenario_1 attack analysis.

## 4. Summary table:

| filename | what changed | why |
|----------|--------------|-----|
| backend/main.py | Converted to unified app with lifespan, added logging middleware, exception handler, included both routers | To serve both phishing and sentinel routes from single server |
| backend/sentinel_behavior/main.py | Converted from FastAPI app to module with startup_sentinel() function and APIRouter | To integrate with main app while preserving standalone functionality |

## 5. Final route table after merging:

### Phishing routes (unchanged):
- Whatever routes pipelines/api_routes.py exposes

### Sentinel routes (new prefix /api/sentinel):
- POST /api/sentinel/analyze
- POST /api/sentinel/analyze/test
- GET  /api/sentinel/demo-scenarios
- POST /api/sentinel/demo/scenario_1
- POST /api/sentinel/demo/scenario_2
- POST /api/sentinel/demo/scenario_3
- POST /api/sentinel/demo/scenario_4
- POST /api/sentinel/demo/scenario_5
- GET  /api/sentinel/user/{user_id}/history
- GET  /api/sentinel/health

### Unified health:
- GET  /api/health

## 6. Standalone testing:
The sentinel_behavior/main.py can still be run standalone:
```bash
cd backend/sentinel_behavior
python main.py
# Runs on port 8001
```
