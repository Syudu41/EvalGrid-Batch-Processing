# EvalGrid — MVP Specification

> A web-based LLM benchmarking tool that runs a CSV of prompts across multiple HuggingFace models in parallel and exports enriched results side-by-side.

**Version:** 1.0 (MVP)  
**Generated:** 2026-03-24  
**Tech Stack:** Python (FastAPI) + React (Vite + TypeScript + Tailwind CSS)  
**Target Build Agent:** Claude Code / Cursor / Gemini CLI  

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack & Rationale](#2-tech-stack--rationale)
3. [Project Structure](#3-project-structure)
4. [Environment Setup](#4-environment-setup)
5. [Data Models & Schema](#5-data-models--schema)
6. [Authentication & Authorization](#6-authentication--authorization)
7. [API Specification](#7-api-specification)
8. [Pages & UI Components](#8-pages--ui-components)
9. [State Management](#9-state-management)
10. [Error Handling](#10-error-handling)
11. [Seed Data & Migrations](#11-seed-data--migrations)
12. [Build & Deploy Instructions](#12-build--deploy-instructions)
13. [Testing Expectations](#13-testing-expectations)
14. [Roadmap (Post-MVP)](#14-roadmap-post-mvp)

---

## 1. Project Overview

### Problem Statement

Researchers and engineers who want to compare LLM outputs across multiple models currently have to write custom scripts or use expensive hosted platforms (promptfoo, deepeval). EvalGrid gives them a local, zero-cost-infrastructure web UI to upload a CSV of prompts, run it against any HuggingFace-hosted models in parallel, and download the enriched results side-by-side — no coding required.

### Core User Personas

| Persona | Description | Primary Goal |
|---------|-------------|--------------|
| ML Researcher | Evaluates model outputs for NLP/VQA research | Run a prompt dataset across 2+ models, compare raw outputs, export for manual analysis |
| Applied Engineer | Compares open-source models before integrating one | Get side-by-side outputs quickly without writing code |

### MVP Feature Set

1. **CSV Upload** — Upload a CSV file with at minimum a `user_prompt` column and optionally a `system_prompt` column.
2. **Model Configuration** — Add 1–5 models by entering their HuggingFace model ID and generation parameters (temperature, max_new_tokens, top_p) per model.
3. **HuggingFace API Key Input** — Enter a HF API key in the UI (stored only in browser session, never sent to any server except HF).
4. **Parallel Benchmark Run** — Run all models concurrently for each row; rows are processed sequentially, models per row in parallel.
5. **Live Progress Bar** — Show real-time row-by-row progress during the run.
6. **Results Preview Table** — Display results in a scrollable side-by-side table in the UI after the run completes.
7. **Enriched CSV Download** — Download the original CSV with new `output_<model_id>` columns appended.
8. **Timestamped Run Log Download** — Download a `.log` file with per-row, per-model request metadata (status, latency, error if any).
9. **Retry / Error Handling** — Automatic retry (up to 3 attempts) for rate-limited or transient HF API failures, with clear error shown in the results table for hard failures.

### User Flows

#### Flow: Complete Benchmark Run (Happy Path)

1. User opens the app at `http://localhost:5173`
2. User clicks "Upload CSV" and selects a `.csv` file
3. App parses and validates the CSV — shows row count and detected columns
4. If `system_prompt` column is missing, app shows a yellow notice: "No system_prompt column detected — system prompt will be empty for all rows"
5. User clicks "+ Add Model", enters a HuggingFace model ID (e.g. `mistralai/Mistral-7B-Instruct-v0.3`)
6. User optionally adjusts temperature, max_new_tokens, top_p for that model
7. User repeats step 5–6 for a second model
8. User enters their HuggingFace API key in the API key field
9. User clicks "Run Benchmark"
10. Progress bar appears: "Processing row 1 of 10…"
11. On completion, results table renders below with columns: row #, user_prompt, system_prompt, output_model1, output_model2
12. User clicks "Download CSV" → receives `evalgrid_results_<timestamp>.csv`
13. User clicks "Download Logs" → receives `evalgrid_run_<timestamp>.log`

#### Flow: CSV Validation Failure

1. User uploads a file that has no `user_prompt` column
2. App shows error banner: "CSV must contain a column named 'user_prompt'. Found columns: [list]. Please fix and re-upload."
3. File input resets; user can re-upload

#### Flow: Model API Failure (Hard)

1. During a run, one model returns a non-retryable error (e.g. 404 model not found, 401 invalid key)
2. That cell in the results table shows: `[ERROR: <error message>]`
3. Run continues for all other rows and the other model
4. Log file records the full error with timestamp

#### Flow: Rate Limit / Transient Failure (Soft, Retried)

1. HF API returns 429 or 503
2. Backend waits (exponential backoff: 2s, 4s, 8s) and retries up to 3 times
3. If all retries fail, the cell shows `[ERROR: Rate limit exceeded after 3 retries]`
4. Progress bar continues; user is not interrupted

---

## 2. Tech Stack & Rationale

| Layer | Technology | Reason |
|-------|-----------|--------|
| Frontend | React 18 + Vite + TypeScript | Fast dev server, small bundle, TypeScript for safety |
| Styling | Tailwind CSS v3 | Utility-first, easy to keep minimalist |
| Fonts | Inter (via `@fontsource/inter`) | Clean, modern, matches the design spec |
| HTTP Client (Frontend) | Native `fetch` | No extra dependencies needed |
| Backend | FastAPI (Python 3.11+) | Async-native, easy to reason about, automatic OpenAPI docs |
| HF API Client | `httpx` (async) | Native async HTTP, supports concurrent requests |
| CSV Handling | `pandas` | Reliable CSV read/write with column manipulation |
| Parallelism | `asyncio.gather` | Run multiple HF calls concurrently per row with no extra infra |
| In-memory State | Python `dict` (module-level) | Run results stored in memory — no DB needed for local tool |
| CORS | `fastapi.middleware.cors` | Allow Vite dev server to call FastAPI |
| Hosting | Local only (MVP) | `uvicorn` backend + `vite dev` frontend |
| Database | Not applicable | No persistence needed; results returned per-run |
| Auth | Not applicable | Single-user local tool; no login |
| Payments | Not applicable | — |
| File Storage | Local filesystem (`/tmp/evalgrid/`) | Store generated CSV and log files temporarily per run |
| Email | Not applicable | — |

### Key Dependencies

**Backend (`backend/requirements.txt`):**
```
fastapi==0.111.0
uvicorn[standard]==0.29.0
httpx==0.27.0
pandas==2.2.2
python-multipart==0.0.9
pydantic==2.7.1
aiofiles==23.2.1
```

**Frontend (`frontend/package.json`):**
```json
{
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "@fontsource/inter": "^5.0.18"
  },
  "devDependencies": {
    "@types/react": "^18.3.1",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.0",
    "autoprefixer": "^10.4.19",
    "postcss": "^8.4.38",
    "tailwindcss": "^3.4.4",
    "typescript": "^5.4.5",
    "vite": "^5.2.12"
  }
}
```

---

## 3. Project Structure

```
evalgrid/
├── .gitignore
├── README.md
│
├── backend/
│   ├── requirements.txt
│   ├── main.py                    # FastAPI app, CORS, router registration, /tmp cleanup
│   ├── config.py                  # Constants: HF_API_BASE_URL, MAX_RETRIES, RETRY_DELAYS, TMP_DIR
│   ├── routers/
│   │   └── benchmark.py           # All /api/* endpoints
│   ├── services/
│   │   ├── hf_client.py           # Async HF Inference API caller with retry logic
│   │   ├── runner.py              # Orchestrates parallel model calls per CSV row
│   │   ├── csv_handler.py         # CSV parsing, validation, enriched export
│   │   └── log_writer.py          # Creates and writes timestamped .log files
│   ├── models/
│   │   └── schemas.py             # Pydantic request/response models
│   └── tmp/                       # Runtime: auto-created, stores run CSVs and logs
│       └── .gitkeep
│
└── frontend/
    ├── index.html
    ├── package.json
    ├── tsconfig.json
    ├── tsconfig.node.json
    ├── vite.config.ts             # Proxy /api/* to localhost:8000
    ├── postcss.config.js
    ├── tailwind.config.ts
    └── src/
        ├── main.tsx               # React root, imports Inter font
        ├── App.tsx                # Root component, orchestrates wizard steps
        ├── index.css              # Tailwind directives, CSS variables, Inter font apply
        ├── components/
        │   ├── StepIndicator.tsx  # 1 Upload → 2 Configure → 3 Run → 4 Results
        │   ├── CSVUploader.tsx    # File input, CSV preview (first 5 rows), validation error
        │   ├── ModelConfigurator.tsx  # Add/remove models, param inputs per model
        │   ├── APIKeyInput.tsx    # HF API key field (password type, never stored)
        │   ├── RunProgress.tsx    # Progress bar + row counter during run
        │   ├── ResultsTable.tsx   # Scrollable table of all results
        │   └── DownloadBar.tsx    # CSV and log download buttons
        ├── hooks/
        │   ├── useBenchmarkRun.ts # Calls POST /api/run, polls /api/run/:id/status
        │   └── useCSVParser.ts    # Parses uploaded file client-side for preview
        ├── lib/
        │   ├── api.ts             # Typed fetch wrappers for all backend endpoints
        │   └── utils.ts           # formatTimestamp, truncateText, downloadBlob
        └── types/
            └── index.ts           # Shared TS interfaces: ModelConfig, RunStatus, ResultRow
```

---

## 4. Environment Setup

### Prerequisites

- Python 3.11 or higher
- Node.js 20 or higher
- A HuggingFace account with an API token (free tier available at https://huggingface.co/settings/tokens)
- No environment variables needed — HF API key is entered in the UI at runtime

### Environment Variables

No `.env` file is required. The HF API key is passed from the browser to the backend as part of the run request body and used only to call HuggingFace. It is never logged or persisted.

There is one optional backend config you can set as an environment variable:

| Variable | Description | Default |
|----------|-------------|---------|
| `EVALGRID_TMP_DIR` | Directory for temporary run files | `./backend/tmp` |
| `EVALGRID_PORT` | Port for FastAPI server | `8000` |

### Setup Commands

```bash
# ── Backend ──────────────────────────────────────────────────
cd evalgrid/backend
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
# Backend running at http://localhost:8000
# OpenAPI docs at http://localhost:8000/docs

# ── Frontend (separate terminal) ─────────────────────────────
cd evalgrid/frontend
npm install
npm run dev
# Frontend running at http://localhost:5173
```

---

## 5. Data Models & Schema

No database. All data is in-memory during a run, then flushed to temporary files.

### In-Memory Run Store (Python)

The backend maintains a module-level dictionary in `routers/benchmark.py`:

```python
# Key: run_id (uuid4 string)
# Value: RunState dict
RUN_STORE: dict[str, RunState] = {}
```

### Pydantic Schemas (`backend/models/schemas.py`)

```python
from pydantic import BaseModel, Field
from typing import Optional

class ModelConfig(BaseModel):
    model_id: str                          # e.g. "mistralai/Mistral-7B-Instruct-v0.3"
    temperature: float = Field(0.7, ge=0.0, le=2.0)
    max_new_tokens: int = Field(512, ge=1, le=4096)
    top_p: float = Field(0.95, ge=0.0, le=1.0)

class RunRequest(BaseModel):
    hf_api_key: str                        # HuggingFace Bearer token
    models: list[ModelConfig]              # 1–5 models
    rows: list[dict]                       # Parsed CSV rows as list of dicts

class RunStatusResponse(BaseModel):
    run_id: str
    status: str                            # "pending" | "running" | "completed" | "failed"
    total_rows: int
    completed_rows: int
    current_row_label: Optional[str]       # e.g. "Row 3 of 10"
    error: Optional[str]                   # Top-level failure message if status == "failed"

class RunResultsResponse(BaseModel):
    run_id: str
    columns: list[str]                     # All column names including output_<model>
    rows: list[dict]                       # Enriched rows

class RunState(BaseModel):                 # Internal — not exposed in API response directly
    run_id: str
    status: str
    total_rows: int
    completed_rows: int
    results: list[dict]                    # Accumulates as rows complete
    log_path: str
    csv_path: str
    error: Optional[str] = None
```

### CSV Schema

**Input CSV (minimum required):**

| Column | Type | Required | Notes |
|--------|------|----------|-------|
| `user_prompt` | string | ✅ Yes | The user message sent to the model |
| `system_prompt` | string | ❌ Optional | The system instruction; empty string if column absent |
| Any other columns | any | ❌ Optional | Passed through unchanged to output CSV |

**Output CSV (enriched):**
All input columns are preserved in their original order. For each model, one new column is appended:

| Column | Notes |
|--------|-------|
| `output_<model_id>` | Raw text output from that model. On error: `[ERROR: <message>]`. The model_id has `/` replaced with `_` to be safe as a column name. Example: `output_mistralai_Mistral-7B-Instruct-v0.3` |

---

## 6. Authentication & Authorization

Not applicable for MVP.

The app is a local single-user tool with no login, no sessions, and no role-based access. The HuggingFace API key is:
1. Entered by the user in the UI
2. Sent over localhost only (never leaves the local machine except to `api-inference.huggingface.co`)
3. Stored only in React component state for the lifetime of the browser session
4. Never written to disk, logs, or backend state

---

## 7. API Specification

Base URL: `http://localhost:8000`  
All endpoints are prefixed with `/api`.

---

### Health Check

#### `GET /api/health`

**Description:** Verifies backend is running.  
**Auth Required:** No  

**Response (200):**
```json
{ "status": "ok" }
```

---

### Benchmark Runs

#### `POST /api/run`

**Description:** Starts a new benchmark run. Accepts the parsed CSV rows, model configs, and HF API key. Returns a run_id immediately. The actual benchmark runs in the background via `asyncio.create_task`.

**Auth Required:** No  

**Request Body:**
```typescript
{
  hf_api_key: string;       // required, the HF bearer token
  models: Array<{
    model_id: string;        // required, e.g. "mistralai/Mistral-7B-Instruct-v0.3"
    temperature: number;     // optional, default 0.7, range [0.0, 2.0]
    max_new_tokens: number;  // optional, default 512, range [1, 4096]
    top_p: number;           // optional, default 0.95, range [0.0, 1.0]
  }>;
  rows: Array<{             // all CSV rows as objects, keys are column names
    user_prompt: string;    // required key
    system_prompt?: string; // optional key
    [key: string]: any;     // any other original columns
  }>;
}
```

**Validation:**
- `models` must have 1–5 items
- `rows` must have 1–500 items
- `hf_api_key` must be non-empty string
- Each `rows` item must have `user_prompt` key

**Response (200):**
```json
{
  "run_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Error Responses:**
| Code | Condition | Body |
|------|-----------|------|
| 400 | Validation fails (missing fields, out-of-range params) | `{ "detail": "models must have 1–5 items" }` |
| 422 | Pydantic schema mismatch | FastAPI default 422 response |

---

#### `GET /api/run/{run_id}/status`

**Description:** Poll this endpoint to get progress of a running benchmark. Frontend polls every 1 second.

**Auth Required:** No  

**Path Parameter:** `run_id` — the UUID returned by `POST /api/run`

**Response (200):**
```json
{
  "run_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "running",
  "total_rows": 10,
  "completed_rows": 4,
  "current_row_label": "Row 4 of 10",
  "error": null
}
```

`status` values:
- `"pending"` — task created, not yet started
- `"running"` — actively processing rows
- `"completed"` — all rows done; results and files are ready
- `"failed"` — top-level failure (e.g. all models 401'd immediately); `error` field has message

**Error Responses:**
| Code | Condition | Body |
|------|-----------|------|
| 404 | `run_id` not found | `{ "detail": "Run not found" }` |

---

#### `GET /api/run/{run_id}/results`

**Description:** Returns the full enriched results once status is `"completed"`. Do not call until status is `completed`.

**Auth Required:** No  

**Response (200):**
```json
{
  "run_id": "550e8400-e29b-41d4-a716-446655440000",
  "columns": ["user_prompt", "system_prompt", "output_mistralai_Mistral-7B-Instruct-v0.3", "output_google_flan-t5-large"],
  "rows": [
    {
      "user_prompt": "What is 2+2?",
      "system_prompt": "You are a math tutor.",
      "output_mistralai_Mistral-7B-Instruct-v0.3": "The answer is 4.",
      "output_google_flan-t5-large": "4"
    }
  ]
}
```

**Error Responses:**
| Code | Condition | Body |
|------|-----------|------|
| 404 | `run_id` not found | `{ "detail": "Run not found" }` |
| 400 | Run is not completed yet | `{ "detail": "Run is not completed. Current status: running" }` |

---

#### `GET /api/run/{run_id}/download/csv`

**Description:** Returns the enriched CSV file as a download.

**Auth Required:** No  

**Response (200):**
- `Content-Type: text/csv`
- `Content-Disposition: attachment; filename="evalgrid_results_<timestamp>.csv"`
- Body: raw CSV bytes

**Error Responses:**
| Code | Condition | Body |
|------|-----------|------|
| 404 | Run not found or not completed | `{ "detail": "Run not found or not completed" }` |

---

#### `GET /api/run/{run_id}/download/logs`

**Description:** Returns the run log file as a download.

**Auth Required:** No  

**Response (200):**
- `Content-Type: text/plain`
- `Content-Disposition: attachment; filename="evalgrid_run_<timestamp>.log"`
- Body: plain text log

**Error Responses:**
| Code | Condition | Body |
|------|-----------|------|
| 404 | Run not found or not completed | `{ "detail": "Run not found or not completed" }` |

---

### HuggingFace API Integration (`backend/services/hf_client.py`)

The HF Inference API endpoint used for all models:

```
POST https://api-inference.huggingface.co/models/{model_id}/v1/chat/completions
Authorization: Bearer {hf_api_key}
Content-Type: application/json
```

Request body sent to HF:
```json
{
  "model": "{model_id}",
  "messages": [
    { "role": "system", "content": "{system_prompt or empty string}" },
    { "role": "user", "content": "{user_prompt}" }
  ],
  "temperature": 0.7,
  "max_tokens": 512,
  "top_p": 0.95
}
```

Expected HF response shape:
```json
{
  "choices": [
    {
      "message": {
        "role": "assistant",
        "content": "The model's response text"
      }
    }
  ]
}
```

Extract: `response["choices"][0]["message"]["content"]`

**Retry logic (in `hf_client.py`):**
```python
MAX_RETRIES = 3
RETRY_DELAYS = [2, 4, 8]  # seconds, exponential backoff

# Retry on: status 429 (rate limit), 503 (service unavailable), httpx.TimeoutException
# Do NOT retry on: 401 (bad key), 404 (model not found), 400 (bad request)
```

**Timeout:** 60 seconds per request (some HF models cold-start slowly).

---

### Runner Logic (`backend/services/runner.py`)

```python
async def run_benchmark(run_id: str, rows: list[dict], models: list[ModelConfig], hf_api_key: str):
    # 1. Set run status to "running"
    # 2. For each row (sequentially):
    #    a. Set current_row_label = "Row N of M"
    #    b. Gather all model calls concurrently:
    #       results = await asyncio.gather(
    #           *[call_hf_model(model, row, hf_api_key) for model in models],
    #           return_exceptions=True
    #       )
    #    c. For each model result: if Exception, store "[ERROR: ...]", else store output text
    #    d. Write log entry for this row
    #    e. Append enriched row to run results
    #    f. Increment completed_rows
    # 3. Write enriched CSV to tmp/
    # 4. Set run status to "completed"
```

---

### Log File Format

Each line in the `.log` file follows this format:

```
[2026-03-24T14:32:01Z] RUN_START run_id=550e8400 models=["mistralai/Mistral-7B-Instruct-v0.3", "google/flan-t5-large"] total_rows=10
[2026-03-24T14:32:02Z] ROW_START row=1 user_prompt="What is 2+2?" (truncated to 80 chars)
[2026-03-24T14:32:03Z] MODEL_OK row=1 model=mistralai/Mistral-7B-Instruct-v0.3 latency_ms=1243 tokens=12
[2026-03-24T14:32:03Z] MODEL_OK row=1 model=google/flan-t5-large latency_ms=890 tokens=3
[2026-03-24T14:32:03Z] ROW_DONE row=1
...
[2026-03-24T14:32:45Z] MODEL_ERROR row=5 model=mistralai/Mistral-7B-Instruct-v0.3 attempt=3 error="429 Rate limit exceeded"
...
[2026-03-24T14:33:10Z] RUN_COMPLETE run_id=550e8400 completed_rows=10 duration_s=68.2
```

---

## 8. Pages & UI Components

The app is a single-page application. There is no routing — a linear wizard flow with a `currentStep` state variable controls what's shown. No auth pages, no nav links.

### Design Spec

- **Font:** Inter (all weights via `@fontsource/inter`)
- **Color palette:** Near-white background (`#FAFAFA`), near-black text (`#111`), gray borders (`#E4E4E7`), blue accent for CTAs (`#2563EB`), red for errors (`#DC2626`), yellow for warnings (`#D97706`)
- **Layout:** Centered column, max-width `768px`, `mx-auto`, `px-6`, `py-12`
- **Aesthetic:** Lots of whitespace, minimal borders, clean form elements. Inspired by Linear/Vercel design language.
- **No sidebar, no nav, no modal dialogs** (errors shown inline)

---

### Step 1: CSV Upload (`CSVUploader.tsx`)

**Shown when:** `currentStep === 1`

**Layout:**  
A card with a dashed border drop zone. Below it, a small preview table if a valid CSV is loaded.

**Components:**
1. **DropZone** — Clickable area with text "Click to upload or drag & drop a CSV file". On file select: client-side parse with `useCSVParser` hook. Shows filename + row count on success. Accepts only `.csv` files.
2. **CSVPreview** — Shows first 5 rows in a small table (columns: all detected columns). Only renders if CSV is valid.
3. **ValidationBanner** — Red banner shown if `user_prompt` column is missing. Message: "CSV must have a column named 'user_prompt'. Found: [col1, col2, ...]."
4. **SystemPromptNotice** — Yellow notice shown if `system_prompt` column is absent. Message: "No 'system_prompt' column detected — system prompt will be left empty for all rows."
5. **Next Button** — Disabled until a valid CSV is loaded. Label: "Configure Models →"

**Client-side CSV parsing (`useCSVParser` hook):**
- Uses the browser's built-in `FileReader` API to read the file as text
- Parse manually: split by `\n`, first line is headers, remaining lines are rows
- Handle quoted fields (simple parser: split by `,` is fine for MVP; note this in comments)
- Return: `{ headers: string[], rows: Record<string, string>[], error: string | null }`

---

### Step 2: Model Configuration (`ModelConfigurator.tsx` + `APIKeyInput.tsx`)

**Shown when:** `currentStep === 2`

**Layout:**  
Two sections stacked vertically:
1. API Key section (top)
2. Models section (below, expandable list)

**Components:**

1. **APIKeyInput** — Password-type text input. Label: "HuggingFace API Key". Placeholder: `hf_xxxxxxxxxxxxxxxxxxxx`. Helper text below: "Your key is used only to call HuggingFace and is never stored." No show/hide toggle needed for MVP.

2. **ModelCard** — One card per model. Contains:
   - Text input: "Model ID" (full placeholder: `mistralai/Mistral-7B-Instruct-v0.3`)
   - Number input: "Temperature" (default: `0.7`, step: `0.05`, min: `0`, max: `2`)
   - Number input: "Max New Tokens" (default: `512`, step: `64`, min: `1`, max: `4096`)
   - Number input: "Top-p" (default: `0.95`, step: `0.05`, min: `0`, max: `1`)
   - Red "Remove" text button (hidden if only 1 model remains)

3. **Add Model Button** — `+ Add Model` — adds a new ModelCard with default params. Disabled when 5 models are already added. Below button: small gray text "Up to 5 models supported."

4. **Back / Run Buttons** — Row of two buttons: "← Back" (ghost) and "Run Benchmark →" (primary blue). "Run Benchmark" is disabled if: API key is empty, any model_id is empty, or fewer than 1 model.

---

### Step 3: Run Progress (`RunProgress.tsx`)

**Shown when:** `currentStep === 3` (i.e., run has been started)

**Layout:**  
Centered, minimal. A label, a progress bar, and a row counter.

**Components:**

1. **StatusLabel** — Text: "Running benchmark…" (or "Completed!" when done)
2. **ProgressBar** — Full-width gray bar with a blue filled portion. Width = `(completed_rows / total_rows) * 100%`. Animated with CSS `transition: width 0.3s ease`.
3. **RowCounter** — Text: "4 of 10 rows complete" — updated on each poll.
4. **ModelList** — Static list of model IDs being run, shown as small gray pills below the bar.
5. **Cancel Button** — For MVP: NOT implemented. Add a grayed-out "Cancel" button with tooltip "Not available in MVP".

**Polling behavior (in `useBenchmarkRun` hook):**
- After `POST /api/run` returns a `run_id`, start polling `GET /api/run/{run_id}/status` every 1000ms using `setInterval`
- When `status === "completed"`: clear interval, fetch results from `GET /api/run/{run_id}/results`, move to `currentStep = 4`
- When `status === "failed"`: clear interval, show error banner, allow user to go back to step 2

---

### Step 4: Results (`ResultsTable.tsx` + `DownloadBar.tsx`)

**Shown when:** `currentStep === 4`

**Layout:**  
Download bar at the top (sticky), then the results table below.

**Components:**

1. **DownloadBar** — A slim toolbar at the top. Contains:
   - Left: "✓ Run complete — 10 rows processed"
   - Right: Two buttons: "Download CSV" and "Download Logs" (both outlined style)
   - Both call `GET /api/run/{run_id}/download/csv` and `/download/logs` via `downloadBlob` utility
   - "Start New Run" link on the far right — resets all state, returns to step 1

2. **ResultsTable** — A horizontally scrollable table with:
   - Column headers: all original CSV columns + `output_<model>` columns (in the order they appear in the API response)
   - Each row: displays all cell values. Output cells that contain `[ERROR: ...]` are shown with a red text color.
   - Long cell values (>120 chars) are truncated with `...` and show full text on hover via HTML `title` attribute.
   - Sticky first column (row number, 1-indexed) for easy scanning.
   - Max height: `70vh` with vertical scroll.

3. **SummaryStats** (inline, above the table) — Small gray metadata row: "2 models · 10 rows · ~68s total"

---

### Shared Components

#### `StepIndicator.tsx`
- **Props:** `{ currentStep: 1 | 2 | 3 | 4 }`
- **Behavior:** Shows 4 labeled steps in a horizontal row: "1 Upload → 2 Configure → 3 Run → 4 Results". Current step is blue and underlined. Completed steps are gray with a checkmark. Future steps are light gray.
- Rendered at the top of `App.tsx` always.

---

## 9. State Management

### All state lives in `App.tsx` (React `useState`)

No external state library needed — this is a linear wizard. Prop drilling is acceptable given the shallow component tree.

```typescript
// App.tsx state
const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);
const [csvData, setCSVData] = useState<CSVData | null>(null);         // headers + rows
const [models, setModels] = useState<ModelConfig[]>([defaultModel]);
const [hfApiKey, setHfApiKey] = useState<string>('');
const [runId, setRunId] = useState<string | null>(null);
const [runStatus, setRunStatus] = useState<RunStatusResponse | null>(null);
const [results, setResults] = useState<RunResultsResponse | null>(null);
const [globalError, setGlobalError] = useState<string | null>(null);
```

### Client State (never persisted)

All state above is wiped when the user clicks "Start New Run" or refreshes the page. This is intentional — EvalGrid is a stateless session tool.

### URL State

None. No routing, no URL params.

### Server State

The backend `RUN_STORE` dict holds active run state in memory. Completed run files are in `/tmp/evalgrid/`. These persist until the backend process is restarted — no cleanup strategy needed for MVP (the `/tmp` folder is not shared across restarts in practice).

---

## 10. Error Handling

### Global Error Banner

`App.tsx` renders a dismissible red banner at the top of the page when `globalError` is non-null. Example: when `POST /api/run` itself fails (e.g. backend is not running).

### Step-Level Errors

- **Step 1:** Inline validation inside `CSVUploader` (no `user_prompt` column)
- **Step 2:** Inline validation on "Run Benchmark" click (empty model IDs, empty API key)
- **Step 3:** If `runStatus.status === "failed"`, replace progress bar with a red error message + "← Go Back" button
- **Step 4:** Cells with `[ERROR: ...]` shown in red text inline in the table

### API Error Handling (Frontend)

All `fetch` calls are wrapped in `try/catch`. On network failure (backend not reachable): set `globalError = "Cannot connect to backend. Make sure the server is running on port 8000."`. On non-2xx response: read `response.json()` for `{ detail: string }` and show that message.

### Form Validation

Client-side only, no library. Validated on button click:
- `hfApiKey`: non-empty string
- Each model: `model_id` non-empty, all numeric params within allowed ranges (enforced by `<input type="number" min max>` attributes)

### CSV Parsing Errors

If the client-side CSV parser fails (e.g. file is not valid UTF-8, file is empty): show error: "Failed to parse CSV file. Please ensure the file is a valid UTF-8 encoded CSV."

### Backend Unhandled Exceptions

FastAPI's default exception handler returns 500 with `{ "detail": "Internal Server Error" }`. Frontend treats any 5xx as a generic error: "Something went wrong on the server. Check the terminal for details."

---

## 11. Seed Data & Migrations

Not applicable — no database.

### Example CSV for Testing

The build agent should create `backend/example_data/sample_prompts.csv` with this content:

```csv
user_prompt,system_prompt
"What is the capital of France?","You are a helpful geography assistant."
"Explain gravity in simple terms.","You are a science teacher for 10-year-olds."
"Write a haiku about rain.","You are a poet."
"What is 15% of 240?","You are a math tutor."
"Name three programming languages invented before 1980.","You are a computer science historian."
```

---

## 12. Build & Deploy Instructions

### Local Development (standard workflow)

```bash
# Terminal 1: Backend
cd evalgrid/backend
source venv/bin/activate
uvicorn main:app --reload --port 8000

# Terminal 2: Frontend
cd evalgrid/frontend
npm run dev
# Open http://localhost:5173
```

### Vite Proxy Configuration

The frontend must proxy `/api/*` requests to the backend to avoid CORS issues in development. Add to `vite.config.ts`:

```typescript
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      }
    }
  }
})
```

### FastAPI CORS Configuration

The backend must allow the Vite dev server origin. In `main.py`:

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### Production Build (optional, if serving statically)

```bash
cd evalgrid/frontend
npm run build
# Outputs to frontend/dist/

# In backend/main.py, mount the dist folder:
# app.mount("/", StaticFiles(directory="../frontend/dist", html=True), name="static")
# Then run: uvicorn main:app --port 8000
# Visit http://localhost:8000
```

---

## 13. Testing Expectations

After the build agent finishes, manually verify the following smoke tests:

### Backend

- [ ] `GET http://localhost:8000/api/health` returns `{ "status": "ok" }`
- [ ] `POST /api/run` with invalid body (missing `hf_api_key`) returns 422
- [ ] `GET /api/run/nonexistent-id/status` returns 404
- [ ] OpenAPI docs are accessible at `http://localhost:8000/docs`

### Frontend

- [ ] App loads at `http://localhost:5173` with Inter font visible
- [ ] `StepIndicator` shows "1 Upload" as active on load
- [ ] "Configure Models →" button is disabled before uploading a CSV
- [ ] Uploading the sample CSV (`sample_prompts.csv`) shows 5-row preview and no error banners
- [ ] Uploading a CSV without `user_prompt` column shows the red validation banner
- [ ] Adding a second model card works; removing it works; "Add Model" is disabled at 5 models
- [ ] "Run Benchmark" is disabled when API key is empty
- [ ] Entering a valid HF API key and clicking "Run Benchmark" transitions to Step 3 with a progress bar
- [ ] After run completes, Step 4 shows a table with `output_<model>` columns
- [ ] "Download CSV" downloads a file with the correct columns
- [ ] "Download Logs" downloads a `.log` file with timestamped entries
- [ ] "Start New Run" resets all state and returns to Step 1
- [ ] A row with an intentionally invalid model ID shows `[ERROR: ...]` in red in the results table

---

## 14. Roadmap (Post-MVP)

### v1.1 (Quick Wins)

- **Cancel running benchmark** — Add a `DELETE /api/run/{run_id}` endpoint and wire up the Cancel button in the UI. Complexity: low.
- **Column mapping UI** — Let users specify which CSV column maps to `user_prompt` and `system_prompt` instead of requiring exact column names. Complexity: low.
- **HF model search / autocomplete** — Query the HF Hub API to suggest model IDs as the user types. Complexity: medium.
- **CSV row limit increase** — Currently capped at 500. Lift the cap and add a warning for large files. Complexity: low.
- **Configurable retry params** — Expose MAX_RETRIES and timeout in the UI. Complexity: low.

### v2.0 (Major Features)

- **Evaluation / scoring layer** — Add optional scoring columns: LLM-as-judge (using a separate model call), ROUGE/BLEU vs. `expected_output` column, or a configurable Python eval function. This is the deepeval-like layer.
- **Run history** — Persist runs to SQLite so users can revisit past results without keeping the browser tab open. Requires adding a DB layer (SQLite + SQLAlchemy).
- **Side-by-side diff view** — Highlight token-level differences between two model outputs in the results table.
- **Multiple system prompts** — Allow defining multiple system prompt variants per run (combinatorial expansion of rows × system prompts).

### v2.1 (Collaboration)

- **Export to Google Sheets** — OAuth + Sheets API integration to push results directly.
- **Shareable run links** — If deployed, generate a read-only URL for a completed run.

### Future Considerations

- Support for non-HF APIs (OpenAI, Anthropic, Cohere) via a provider abstraction layer
- Local model inference via Ollama as a provider option
- Batch mode CLI for headless/scripted use in CI pipelines
- Per-row model parameter overrides via CSV columns