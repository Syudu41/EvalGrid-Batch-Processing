from __future__ import annotations

import os
from pathlib import Path

HF_API_BASE_URL = "https://router.huggingface.co"
MAX_RETRIES = 3
RETRY_DELAYS = [2, 4, 8]
REQUEST_TIMEOUT_SECONDS = 60

BACKEND_DIR = Path(__file__).resolve().parent
TMP_DIR = Path(os.getenv("EVALGRID_TMP_DIR", str(BACKEND_DIR / "tmp"))).resolve()
DEFAULT_PORT = int(os.getenv("EVALGRID_PORT", "8000"))
