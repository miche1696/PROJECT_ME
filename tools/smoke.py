#!/usr/bin/env python3
import argparse
import json
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path


def request_json(method, url, payload=None, timeout=10):
    data = None
    headers = {"Content-Type": "application/json"}
    if payload is not None:
        data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        body = resp.read().decode("utf-8")
        if not body:
            return None
    return json.loads(body)


def load_trace(path: Path):
    if not path.exists():
        return []
    entries = []
    with path.open("r", encoding="utf-8") as handle:
        for line in handle:
            line = line.strip()
            if not line:
                continue
            try:
                entries.append(json.loads(line))
            except json.JSONDecodeError:
                continue
    return entries


def has_event(entries, event, needle=None):
    for entry in entries:
        if entry.get("event") != event:
            continue
        if needle and needle not in json.dumps(entry, ensure_ascii=False):
            continue
        return True
    return False


def main() -> int:
    parser = argparse.ArgumentParser(description="Minimal smoke test for Kefi backend trace + notes APIs")
    parser.add_argument("--base", default="http://localhost:5001", help="Backend base URL")
    parser.add_argument("--trace-backend", default="backend/trace.jsonl", help="Backend trace path")
    parser.add_argument("--trace-frontend", default="frontend/trace.jsonl", help="Frontend trace path")
    args = parser.parse_args()

    base = args.base.rstrip("/")
    health = request_json("GET", f"{base}/api/health")
    if health.get("status") != "healthy":
        print("Health check failed", file=sys.stderr)
        return 1

    # Create a note
    stamp = int(time.time())
    name = f"smoke_test_{stamp}"
    folder_name = f"smoke_folder_{stamp}"
    created = request_json(
        "POST",
        f"{base}/api/notes",
        {
            "name": name,
            "folder": "",
            "content": "Smoke test content",
            "file_type": "md",
        },
    )
    note_path = created.get("path")
    if not note_path:
        print("Create note failed", file=sys.stderr)
        return 1

    # Fetch note
    encoded = urllib.parse.quote(note_path, safe="/")
    fetched = request_json("GET", f"{base}/api/notes/{encoded}")
    if fetched.get("content") != "Smoke test content":
        print("Fetch note failed", file=sys.stderr)
        return 1

    # Update note
    request_json("PUT", f"{base}/api/notes/{encoded}", {"content": "Updated smoke content"})
    fetched = request_json("GET", f"{base}/api/notes/{encoded}")
    if fetched.get("content") != "Updated smoke content":
        print("Update note failed", file=sys.stderr)
        return 1

    # Text processing
    processed = request_json(
        "POST",
        f"{base}/api/text/process",
        {
            "operation": "clean-transcription",
            "text": "um so like this is a test",
            "options": {},
        },
    )
    if "processed_text" not in processed:
        print("Text processing failed", file=sys.stderr)
        return 1

    # Folder create
    request_json(
        "POST",
        f"{base}/api/folders",
        {
            "name": folder_name,
            "parent": "",
        },
    )

    # Move note into folder
    moved = request_json(
        "PATCH",
        f"{base}/api/notes/{encoded}/move",
        {"target_folder": folder_name},
    )
    note_path = moved.get("path") or note_path
    encoded = urllib.parse.quote(note_path, safe="/")

    # Rename note
    renamed = request_json(
        "PATCH",
        f"{base}/api/notes/{encoded}/rename",
        {"new_name": f"{name}_renamed"},
    )
    note_path = renamed.get("path") or note_path
    encoded = urllib.parse.quote(note_path, safe="/")

    # Rename folder
    renamed_folder = f"{folder_name}_renamed"
    request_json(
        "PATCH",
        f"{base}/api/folders/{urllib.parse.quote(folder_name, safe='/')}/rename",
        {"new_name": renamed_folder},
    )
    if note_path.startswith(f"{folder_name}/"):
        note_path = note_path.replace(f"{folder_name}/", f"{renamed_folder}/", 1)

    # Client trace ingest
    request_json(
        "POST",
        f"{base}/api/trace/client",
        {"event": "smoke.test", "data": {"note": note_path}},
    )

    # Delete note (API expects path without extension)
    if note_path.endswith(".md"):
        note_path = note_path[:-3]
    encoded = urllib.parse.quote(note_path, safe="/")
    request_json("DELETE", f"{base}/api/notes/{encoded}")

    # Delete folder
    request_json(
        "DELETE",
        f"{base}/api/folders/{urllib.parse.quote(renamed_folder, safe='/')}?recursive=true",
    )

    # Trace verification
    repo_root = Path(__file__).resolve().parents[1]
    backend_trace = load_trace(repo_root / args.trace_backend)
    frontend_trace = load_trace(repo_root / args.trace_frontend)

    required_backend_events = [
        ("api.response", None),
        ("file.write", name),
        ("file.move", name),
        ("file.rename", name),
        ("file.delete", name),
        ("folder.create", folder_name),
        ("folder.rename", renamed_folder),
        ("folder.delete", renamed_folder),
        ("text.process", "clean-transcription"),
    ]

    for event, needle in required_backend_events:
        if not has_event(backend_trace, event, needle):
            print(f"Missing backend trace event: {event}", file=sys.stderr)
            return 1

    if not has_event(frontend_trace, "smoke.test", "smoke_test_"):
        print("Missing frontend trace event: smoke.test", file=sys.stderr)
        return 1

    print("Smoke test OK")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except urllib.error.URLError as exc:
        print(f"Request failed: {exc}", file=sys.stderr)
        raise SystemExit(1)
