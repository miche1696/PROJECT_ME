#!/usr/bin/env python3
import argparse
import json
from pathlib import Path
from typing import Iterable


def iter_lines(path: Path) -> Iterable[dict]:
    if not path.exists():
        return []
    with path.open("r", encoding="utf-8") as handle:
        for line in handle:
            line = line.strip()
            if not line:
                continue
            try:
                yield json.loads(line)
            except json.JSONDecodeError:
                continue


def main() -> None:
    parser = argparse.ArgumentParser(description="Query JSONL trace logs.")
    parser.add_argument("--file", help="Path to trace.jsonl")
    parser.add_argument("--backend", action="store_true", help="Use backend/trace.jsonl")
    parser.add_argument("--frontend", action="store_true", help="Use frontend/trace.jsonl")
    parser.add_argument("--last", type=int, default=50, help="Show last N entries")
    parser.add_argument("--event", help="Filter by event name (substring match)")
    parser.add_argument("--source", help="Filter by source name")
    parser.add_argument("--contains", help="Filter by substring in JSON")
    parser.add_argument("--json", action="store_true", help="Output raw JSON")
    args = parser.parse_args()

    base = Path(__file__).resolve().parents[1]
    if args.file:
        path = Path(args.file)
    elif args.frontend:
        path = base / "frontend" / "trace.jsonl"
    else:
        path = base / "backend" / "trace.jsonl"

    entries = list(iter_lines(path))

    if args.source:
        entries = [e for e in entries if e.get("source") == args.source]

    if args.event:
        entries = [e for e in entries if args.event in str(e.get("event"))]

    if args.contains:
        entries = [e for e in entries if args.contains in json.dumps(e, ensure_ascii=False)]

    entries = entries[-args.last :]

    for entry in entries:
        if args.json:
            print(json.dumps(entry, ensure_ascii=False))
        else:
            ts = entry.get("iso") or entry.get("ts")
            event = entry.get("event")
            source = entry.get("source")
            print(f"[{source}] {ts} {event}")
            if "data" in entry:
                print(json.dumps(entry["data"], ensure_ascii=False, indent=2))
            print("---")


if __name__ == "__main__":
    main()
