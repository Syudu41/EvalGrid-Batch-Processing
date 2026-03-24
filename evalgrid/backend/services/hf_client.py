from __future__ import annotations

import asyncio
import json
import time
from typing import Any

import httpx

from config import HF_API_BASE_URL, MAX_RETRIES, REQUEST_TIMEOUT_SECONDS, RETRY_DELAYS
from models.schemas import ModelConfig


class HFRequestError(RuntimeError):
    pass


def _extract_error_text(response: httpx.Response) -> str:
    try:
        payload = response.json()
        if isinstance(payload, dict):
            if isinstance(payload.get("error"), str):
                return payload["error"]
            if isinstance(payload.get("detail"), str):
                return payload["detail"]
            return json.dumps(payload)
    except ValueError:
        pass
    return response.text or f"HTTP {response.status_code}"


async def call_hf_model(model: ModelConfig, row: dict[str, Any], hf_api_key: str) -> dict[str, Any]:
    url = f"{HF_API_BASE_URL}/{model.model_id}/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {hf_api_key}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": model.model_id,
        "messages": [
            {"role": "system", "content": str(row.get("system_prompt", "") or "")},
            {"role": "user", "content": str(row.get("user_prompt", ""))},
        ],
        "temperature": model.temperature,
        "max_tokens": model.max_new_tokens,
        "top_p": model.top_p,
    }

    for attempt in range(MAX_RETRIES + 1):
        started = time.perf_counter()
        try:
            async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT_SECONDS) as client:
                response = await client.post(url, headers=headers, json=payload)
            latency_ms = int((time.perf_counter() - started) * 1000)

            if response.status_code == 200:
                body = response.json()
                try:
                    content = body["choices"][0]["message"]["content"]
                except (KeyError, IndexError, TypeError) as exc:
                    raise HFRequestError("Malformed response from HuggingFace API") from exc

                usage = body.get("usage") if isinstance(body, dict) else None
                tokens = 0
                if isinstance(usage, dict) and isinstance(usage.get("completion_tokens"), int):
                    tokens = usage["completion_tokens"]
                elif isinstance(content, str):
                    tokens = len(content.split())

                return {
                    "output_text": str(content),
                    "latency_ms": latency_ms,
                    "tokens": tokens,
                    "attempt": attempt + 1,
                }

            error_text = _extract_error_text(response)

            if response.status_code in (429, 503):
                if attempt < MAX_RETRIES:
                    await asyncio.sleep(RETRY_DELAYS[attempt])
                    continue
                raise HFRequestError("Rate limit exceeded after 3 retries")

            if response.status_code in (400, 401, 404):
                raise HFRequestError(error_text)

            raise HFRequestError(f"HTTP {response.status_code}: {error_text}")

        except httpx.TimeoutException:
            if attempt < MAX_RETRIES:
                await asyncio.sleep(RETRY_DELAYS[attempt])
                continue
            raise HFRequestError("Request timed out after 3 retries")
        except httpx.HTTPError as exc:
            raise HFRequestError(str(exc)) from exc

    raise HFRequestError("Unknown HuggingFace request failure")
