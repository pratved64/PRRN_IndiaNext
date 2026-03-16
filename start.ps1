# start.ps1 - Boot the whole stack on Windows

Write-Host "Starting databases..." -ForegroundColor Green
docker compose up -d

Write-Host "Starting FastAPI backend..." -ForegroundColor Green
Set-Location -Path "backend"
# Activates the Windows venv and starts uvicorn in a new window
Start-Process powershell -ArgumentList "-NoExit -Command `".\venv\Scripts\Activate.ps1; uvicorn main:app --reload`""

Write-Host "Starting Next.js frontend..." -ForegroundColor Green
Set-Location -Path "..\frontend"
# Starts the Next dev server in a new window
Start-Process powershell -ArgumentList "-NoExit -Command `"npm run dev`""

# Return to the root directory
Set-Location -Path ".."

Write-Host "Stack is booting up! Check the newly opened terminal windows for your logs." -ForegroundColor Cyan