from __future__ import annotations

import json
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))


def call(url: str, method: str = "GET") -> dict:
    request = urllib.request.Request(url=url, method=method)
    with urllib.request.urlopen(request, timeout=8) as response:
        payload = response.read().decode("utf-8")
        return json.loads(payload)


def main() -> None:
    base = "http://127.0.0.1:5000"
    print("health:", call(f"{base}/health"))
    print("fetch-now:", call(f"{base}/api/tasks/fetch-now", method="POST"))
    latest = call(f"{base}/api/ammo/latest")
    print("latest:", latest)
    items = latest.get("items", [])
    if items:
        ammo_id = items[0]["id"]
        history = call(f"{base}/api/ammo/{ammo_id}/history?days=7")
        print("history:", history)


if __name__ == "__main__":
    main()
