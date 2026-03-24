# EvalGrid

**Benchmark prompts across multiple HuggingFace models — in parallel, from your browser.**

EvalGrid is a local web application that lets you upload a CSV of prompts, run them against up to 5 HuggingFace models simultaneously, and export the enriched results for analysis. No cloud account required beyond a HuggingFace API token.

---

## Features

- Upload any CSV with a `user_prompt` column — no reformatting needed
- Run up to **5 models in parallel** per benchmark session
- Per-model controls: temperature, max tokens, top-p
- Live progress tracking with row-by-row status
- Export results as a **CSV** (one output column per model) or download a structured **run log**
- Fully local — your API key and data never leave your machine except to call the HuggingFace API

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python 3.11+, FastAPI, httpx |
| Frontend | React 18, TypeScript, Vite, Tailwind CSS |
| AI API | HuggingFace Inference Providers (router.huggingface.co) |

---

## Prerequisites

- **Python 3.11+**
- **Node.js 18+**
- A **HuggingFace account** with an API token that has Inference API access
  - Generate one at [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens) — select _"Make calls to serverless Inference API"_
  - New accounts receive **$0.10 free monthly credits**

---

## Getting Started

### 1. Clone the repository

```bash
git clone <repo-url>
cd EvalGrid-Batch-Processing
```

### 2. Start the backend

```bash
cd evalgrid/backend
python -m venv venv

# Windows
venv\Scripts\activate

# macOS / Linux
source venv/bin/activate

pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`.

### 3. Start the frontend

Open a second terminal:

```bash
cd evalgrid/frontend
npm install
npm run dev
```

The app will be available at `http://localhost:5173`.

---

## User Flow

### Step 1 — Upload a CSV

Prepare a CSV file with at least a `user_prompt` column. An optional `system_prompt` column is supported for setting per-row system instructions.

**Minimum valid CSV:**

```csv
user_prompt
What is the average lifespan of a giant Galapagos tortoise?
How do noise-canceling headphones block out sound?
```

**With system prompts:**

```csv
user_prompt,system_prompt
Explain quantum entanglement.,You are a physics professor speaking to undergraduates.
What is machine learning?,Explain concepts simply, using everyday analogies.
```

> A sample file `trial.csv` is included in the repository root.

Upload the file by clicking the upload area or dragging and dropping. The app validates the file and shows a preview of the first 5 rows.

---

### Step 2 — Configure Models

Enter your HuggingFace API token and add one or more models (up to 5).

**Recommended models** (confirmed working with the HuggingFace router):

| Model ID | Size | Notes |
|----------|------|-------|
| `Qwen/Qwen2.5-7B-Instruct` | 7B | Fast, high quality |
| `meta-llama/Llama-3.1-8B-Instruct` | 8B | Strong general purpose |

Each model has independent controls:

| Parameter | Range | Default | Description |
|-----------|-------|---------|-------------|
| Temperature | 0.0 – 2.0 | 0.7 | Controls output randomness |
| Max New Tokens | 1 – 4096 | 512 | Maximum response length |
| Top-p | 0.0 – 1.0 | 0.95 | Nucleus sampling threshold |

---

### Step 3 — Run the Benchmark

Click **Run Benchmark**. The backend processes all rows concurrently across models, with live row-by-row progress displayed in the UI.

Each cell in your CSV is sent to every configured model. The run completes when all rows have been processed.

---

### Step 4 — Review and Export Results

Once complete, results are displayed in a scrollable table. Each model's output appears as its own column (`output_<model_id>`).

Two export options are available:

- **Download CSV** — The enriched results table, ready for analysis in Excel, Python, or any data tool
- **Download Logs** — A timestamped log of every model call with latency and token counts, useful for debugging

Click **Start New Run** to reset and run another benchmark.

---

## CSV Output Format

The exported CSV contains all original input columns plus one output column per model:

```
user_prompt, system_prompt, output_Qwen_Qwen2.5-7B-Instruct, output_meta-llama_Llama-3.1-8B-Instruct
```

Cells containing `[ERROR: ...]` indicate that a specific model call failed for that row (e.g. rate limit, model unavailable).

---

## Project Structure

```
EvalGrid-Batch-Processing/
├── trial.csv                    # Sample prompt CSV for testing
└── evalgrid/
    ├── backend/
    │   ├── main.py              # FastAPI app entry point
    │   ├── config.py            # API URLs, timeouts, paths
    │   ├── requirements.txt
    │   ├── models/schemas.py    # Pydantic request/response models
    │   ├── routers/benchmark.py # API endpoints
    │   └── services/
    │       ├── runner.py        # Benchmark orchestration
    │       ├── hf_client.py     # HuggingFace API client
    │       ├── csv_handler.py   # CSV read/write utilities
    │       └── log_writer.py    # Async log file writer
    └── frontend/
        └── src/
            ├── App.tsx          # Root component (4-step wizard)
            ├── components/      # UI components per step
            ├── hooks/           # useBenchmarkRun, useCSVParser
            └── lib/api.ts       # Backend API client
```

---

## API Reference

The backend exposes a REST API at `http://localhost:8000/api`:

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Health check |
| `POST` | `/run` | Start a benchmark run |
| `GET` | `/run/{id}/status` | Poll run progress |
| `GET` | `/run/{id}/results` | Fetch completed results |
| `GET` | `/run/{id}/download/csv` | Download result CSV |
| `GET` | `/run/{id}/download/logs` | Download run log |

---

## Limits

| Constraint | Value |
|-----------|-------|
| Max rows per run | 500 |
| Max models per run | 5 |
| Max tokens per response | 4096 |
| Request timeout | 60 seconds |
| Retries on rate limit (429/503) | 3 attempts |
