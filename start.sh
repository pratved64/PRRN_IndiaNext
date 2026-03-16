#!/bin/bash
# start.sh - Run this to boot the whole stack

echo "Starting databases..."
docker compose up -d

echo "Starting FastAPI backend..."
cd backend
source venv/bin/activate
uvicorn main:app --reload &

echo "Starting Next.js frontend..."
cd ../frontend
npm run dev