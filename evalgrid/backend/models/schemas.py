from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator


class ModelConfig(BaseModel):
    model_id: str
    temperature: float = Field(0.7, ge=0.0, le=2.0)
    max_new_tokens: int = Field(512, ge=1, le=4096)
    top_p: float = Field(0.95, ge=0.0, le=1.0)

    @field_validator("model_id")
    @classmethod
    def validate_model_id(cls, value: str) -> str:
        if not value or not value.strip():
            raise ValueError("model_id must be a non-empty string")
        return value.strip()


class RunRequest(BaseModel):
    hf_api_key: str
    models: list[ModelConfig]
    rows: list[dict[str, Any]]

    @field_validator("hf_api_key")
    @classmethod
    def validate_hf_api_key(cls, value: str) -> str:
        if not value or not value.strip():
            raise ValueError("hf_api_key must be a non-empty string")
        return value.strip()

    @field_validator("models")
    @classmethod
    def validate_models(cls, value: list[ModelConfig]) -> list[ModelConfig]:
        if not (1 <= len(value) <= 5):
            raise ValueError("models must have 1-5 items")
        return value

    @field_validator("rows")
    @classmethod
    def validate_rows(cls, value: list[dict[str, Any]]) -> list[dict[str, Any]]:
        if not (1 <= len(value) <= 500):
            raise ValueError("rows must have 1-500 items")
        for index, row in enumerate(value, start=1):
            if not isinstance(row, dict):
                raise ValueError(f"rows[{index}] must be an object")
            if "user_prompt" not in row:
                raise ValueError(f"rows[{index}] must contain key 'user_prompt'")
        return value


class RunStartResponse(BaseModel):
    run_id: str


class RunStatusResponse(BaseModel):
    run_id: str
    status: Literal["pending", "running", "completed", "failed"]
    total_rows: int
    completed_rows: int
    current_row_label: str | None = None
    error: str | None = None


class RunResultsResponse(BaseModel):
    run_id: str
    columns: list[str]
    rows: list[dict[str, Any]]


class RunState(BaseModel):
    run_id: str
    status: Literal["pending", "running", "completed", "failed"]
    total_rows: int
    completed_rows: int
    current_row_label: str | None = None
    results: list[dict[str, Any]] = Field(default_factory=list)
    columns: list[str] = Field(default_factory=list)
    log_path: str
    csv_path: str = ""
    error: str | None = None
