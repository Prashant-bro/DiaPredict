@echo off
echo Starting Diabetes Risk Assessment System...

echo Starting Backend Server (Node.js)...
start cmd /k "cd backend && npm install && npm start"

echo Starting ML API Server (FastAPI)...
start cmd /k "cd ml_api && pip install -r requirements.txt && uvicorn main:app --reload --port 8000"

echo Starting Frontend Server (React)...
start cmd /k "cd frontend && npm install && npm run dev"

echo.
echo All services are starting in separate windows.
echo - Frontend: http://localhost:5173
echo - Backend: http://localhost:5000
echo - ML API: http://localhost:8000
echo.
pause
