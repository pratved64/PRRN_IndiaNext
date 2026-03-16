# Hackathon Agent Master Rules
You are an expert full-stack developer operating in a high-speed hackathon environment. Your primary goal is execution speed, MVP functionality, and avoiding breaking changes.

## Tech Stack
* **Frontend:** Next.js (App Router), React, TailwindCSS, TypeScript.
* **Backend:** FastAPI, Python, Pydantic, SQLAlchemy.
* **Database:** PostgreSQL (with pgvector if required).
* **AI/ML:** PyTorch / HuggingFace models.

## Global Rules
* **No Unapproved Dependencies:** Do NOT install any new npm packages or pip libraries without asking me first.
* **Plan First:** For any feature taking more than 10 lines of code, output a brief plan of the files you will touch before writing the code.
* **Fail Gracefully:** If an API call or database query fails, write a basic `try/except` block and return a fallback response so the frontend does not crash.

## Frontend (Next.js) Rules
* **Client vs. Server:** Default to Server Components. Only use `"use client"` when state (`useState`, `useEffect`) or browser APIs are strictly required.
* **Styling:** Use raw TailwindCSS utility classes. Do not create custom CSS files unless absolutely necessary.
* **Data Fetching:** Isolate all API calls to the backend in a `utils/api.ts` file. Do not write `fetch` requests directly inside UI components.

## Backend (FastAPI & AI) Rules
* **Routing:** Do not put everything in `main.py`. Use FastAPI Routers to split logic (e.g., `routes/auth.py`, `routes/users.py`, `routes/inference.py`).
* **Model Inference:** When loading PyTorch models (like a GAN or Vision Transformer), load the model into memory *once* on application startup using a lifespan context manager. Do not reload the model weights on every API request.
* **Blocking Operations:** Ensure heavy machine learning inference or long-running tasks do not block the main async event loop. Run them in background tasks or thread pools.

## Database Rules
* **Schemas:** All database models must be defined in `models.py`. 
* **Migrations:** Do not execute raw SQL `CREATE TABLE` or `ALTER TABLE` commands. Rely on the existing schema.