from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path

import pandas as pd

from config import TMP_DIR
from models.schemas import ModelConfig


def sanitize_model_id_for_column(model_id: str) -> str:
    return model_id.replace("/", "_")


def output_column_name(model_id: str) -> str:
    return f"output_{sanitize_model_id_for_column(model_id)}"


def build_output_columns(models: list[ModelConfig]) -> list[str]:
    return [output_column_name(model.model_id) for model in models]


def build_result_columns(input_columns: list[str], models: list[ModelConfig]) -> list[str]:
    return [*input_columns, *build_output_columns(models)]


def create_csv_path() -> Path:
    TMP_DIR.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    return TMP_DIR / f"evalgrid_results_{timestamp}.csv"


def write_enriched_csv(columns: list[str], rows: list[dict]) -> str:
    csv_path = create_csv_path()
    frame = pd.DataFrame(rows)
    frame = frame.reindex(columns=columns)
    frame.to_csv(csv_path, index=False)
    return str(csv_path)
