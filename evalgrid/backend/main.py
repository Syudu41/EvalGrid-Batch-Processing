from __future__ import annotations

from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import TMP_DIR
from routers.benchmark import router as benchmark_router

app = FastAPI(title="EvalGrid API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup() -> None:
    TMP_DIR.mkdir(parents=True, exist_ok=True)
    for file in Path(TMP_DIR).glob("evalgrid_*"):
        if file.is_file():
            file.unlink(missing_ok=True)


app.include_router(benchmark_router, prefix="/api")
