from __future__ import annotations

import asyncio
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

from models.schemas import RunRequest, RunResultsResponse, RunStartResponse, RunState, RunStatusResponse
from services.log_writer import create_log_path
from services.runner import run_benchmark

router = APIRouter()

RUN_STORE: dict[str, RunState] = {}


@router.get("/health")
async def health_check() -> dict[str, str]:
    return {"status": "ok"}


@router.post("/run", response_model=RunStartResponse)
async def start_run(request: RunRequest) -> RunStartResponse:
    run_id = str(uuid4())
    log_path = str(create_log_path())

    state = RunState(
        run_id=run_id,
        status="pending",
        total_rows=len(request.rows),
        completed_rows=0,
        results=[],
        columns=[],
        log_path=log_path,
        csv_path="",
    )
    RUN_STORE[run_id] = state

    asyncio.create_task(
        run_benchmark(
            run_id=run_id,
            rows=request.rows,
            models=request.models,
            hf_api_key=request.hf_api_key,
            run_store=RUN_STORE,
        )
    )

    return RunStartResponse(run_id=run_id)


@router.get("/run/{run_id}/status", response_model=RunStatusResponse)
async def get_run_status(run_id: str) -> RunStatusResponse:
    state = RUN_STORE.get(run_id)
    if state is None:
        raise HTTPException(status_code=404, detail="Run not found")

    return RunStatusResponse(
        run_id=state.run_id,
        status=state.status,
        total_rows=state.total_rows,
        completed_rows=state.completed_rows,
        current_row_label=state.current_row_label,
        error=state.error,
    )


@router.get("/run/{run_id}/results", response_model=RunResultsResponse)
async def get_run_results(run_id: str) -> RunResultsResponse:
    state = RUN_STORE.get(run_id)
    if state is None:
        raise HTTPException(status_code=404, detail="Run not found")
    if state.status != "completed":
        raise HTTPException(status_code=400, detail=f"Run is not completed. Current status: {state.status}")

    return RunResultsResponse(run_id=state.run_id, columns=state.columns, rows=state.results)


@router.get("/run/{run_id}/download/csv")
async def download_csv(run_id: str) -> FileResponse:
    state = RUN_STORE.get(run_id)
    if state is None or state.status != "completed" or not state.csv_path or not Path(state.csv_path).exists():
        raise HTTPException(status_code=404, detail="Run not found or not completed")

    csv_path = Path(state.csv_path)
    return FileResponse(path=str(csv_path), filename=csv_path.name, media_type="text/csv")


@router.get("/run/{run_id}/download/logs")
async def download_logs(run_id: str) -> FileResponse:
    state = RUN_STORE.get(run_id)
    if state is None or state.status != "completed" or not state.log_path or not Path(state.log_path).exists():
        raise HTTPException(status_code=404, detail="Run not found or not completed")

    log_path = Path(state.log_path)
    return FileResponse(path=str(log_path), filename=log_path.name, media_type="text/plain")
