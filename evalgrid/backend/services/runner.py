from __future__ import annotations

import asyncio
import json
import time
from typing import Any

from models.schemas import ModelConfig, RunState
from services.csv_handler import build_result_columns, output_column_name, write_enriched_csv
from services.hf_client import call_hf_model
from services.log_writer import append_log_line, truncate_text


async def run_benchmark(
    run_id: str,
    rows: list[dict[str, Any]],
    models: list[ModelConfig],
    hf_api_key: str,
    run_store: dict[str, RunState],
) -> None:
    state = run_store[run_id]
    start_time = time.perf_counter()

    try:
        state.status = "running"
        state.current_row_label = f"Row 1 of {state.total_rows}" if state.total_rows else None

        model_names = [model.model_id for model in models]
        await append_log_line(
            state.log_path,
            f"RUN_START run_id={run_id} models={json.dumps(model_names)} total_rows={state.total_rows}",
        )

        input_columns = list(rows[0].keys()) if rows else []
        result_columns = build_result_columns(input_columns, models)

        for index, row in enumerate(rows, start=1):
            state.current_row_label = f"Row {index} of {state.total_rows}"
            prompt_excerpt = truncate_text(str(row.get("user_prompt", "")), 80)
            await append_log_line(
                state.log_path,
                f"ROW_START row={index} user_prompt={json.dumps(prompt_excerpt)}",
            )

            tasks = [call_hf_model(model, row, hf_api_key) for model in models]
            model_results = await asyncio.gather(*tasks, return_exceptions=True)

            enriched_row = dict(row)
            for model, result in zip(models, model_results):
                col_name = output_column_name(model.model_id)

                if isinstance(result, Exception):
                    error_message = str(result)
                    enriched_row[col_name] = f"[ERROR: {error_message}]"
                    await append_log_line(
                        state.log_path,
                        (
                            f"MODEL_ERROR row={index} model={model.model_id} "
                            f"error={json.dumps(error_message)}"
                        ),
                    )
                    continue

                enriched_row[col_name] = result["output_text"]
                await append_log_line(
                    state.log_path,
                    (
                        f"MODEL_OK row={index} model={model.model_id} "
                        f"latency_ms={result['latency_ms']} tokens={result['tokens']}"
                    ),
                )

            state.results.append(enriched_row)
            state.completed_rows = index
            await append_log_line(state.log_path, f"ROW_DONE row={index}")

        state.columns = result_columns
        state.csv_path = write_enriched_csv(columns=state.columns, rows=state.results)
        state.status = "completed"
        state.current_row_label = None

        duration_s = round(time.perf_counter() - start_time, 2)
        await append_log_line(
            state.log_path,
            f"RUN_COMPLETE run_id={run_id} completed_rows={state.completed_rows} duration_s={duration_s}",
        )

    except Exception as exc:
        state.status = "failed"
        state.error = str(exc)
        state.current_row_label = None
        await append_log_line(
            state.log_path,
            f"RUN_FAILED run_id={run_id} error={json.dumps(str(exc))}",
        )
