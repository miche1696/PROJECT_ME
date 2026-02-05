import json
import os
import threading
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Optional


@dataclass
class TraceLogger:
    path: Path
    source: str

    def __post_init__(self) -> None:
        self._lock = threading.Lock()
        self.path = Path(self.path)

    def write(self, event: str, data: Optional[Dict[str, Any]] = None, **extra: Any) -> None:
        payload: Dict[str, Any] = {
            "ts": time.time(),
            "iso": datetime.now(timezone.utc).isoformat(),
            "pid": os.getpid(),
            "source": self.source,
            "event": event,
        }
        if data is not None:
            payload["data"] = data
        if extra:
            payload.update(extra)

        line = json.dumps(payload, ensure_ascii=False)

        try:
            self.path.parent.mkdir(parents=True, exist_ok=True)
            with self._lock:
                with self.path.open("a", encoding="utf-8") as handle:
                    handle.write(line + "\n")
        except Exception:
            # Tracing must never break the app.
            pass
