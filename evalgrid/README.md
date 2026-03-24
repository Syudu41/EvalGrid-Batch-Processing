# EvalGrid (MVP)

EvalGrid is a local web app for running CSV prompt benchmarks across multiple HuggingFace models and exporting enriched results.

## Tech Stack
- Backend: FastAPI (Python 3.11+)
- Frontend: React + Vite + TypeScript + Tailwind CSS

## Run Locally
Backend:
```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Frontend:
```bash
cd frontend
npm install
npm run dev
```
