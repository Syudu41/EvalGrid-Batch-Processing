from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path

import aiofiles

from config import TMP_DIR


def utc_now_z() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def build_timestamp_slug() -> str:
    return datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")


def create_log_path() -> Path:
    TMP_DIR.mkdir(parents=True, exist_ok=True)
    return TMP_DIR / f"evalgrid_run_{build_timestamp_slug()}.log"


async def append_log_line(log_path: str | Path, message: str) -> None:
    line = f"[{utc_now_z()}] {message}\n"
    async with aiofiles.open(log_path, mode="a", encoding="utf-8") as handle:
        await handle.write(line)


def truncate_text(value: str, max_len: int = 80) -> str:
    if len(value) <= max_len:
        return value
    return value[: max_len - 3] + "..."
