"""Materialize the newest Kafka events for the local Next.js frontend."""
import json
import os
import tempfile
import time
from datetime import datetime, timezone
from collections import Counter
from pathlib import Path

from confluent_kafka import Consumer
from dotenv import load_dotenv

load_dotenv("streaming/.env")
ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "streaming" / "latest.json"
VEHICLE_OUTPUT = ROOT / "streaming" / "vehicles.geojson"
ACTIVE_SECONDS = int(os.getenv("MTA_ACTIVE_SECONDS", "180"))
consumer = Consumer({
    "bootstrap.servers": os.getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092"),
    "group.id": "tree11-frontend-materializer",
    "auto.offset.reset": "latest",
})
consumer.subscribe(["tree11.mta.vehicle_positions", "tree11.nws.observations"])
vehicles = {}
latest_nws = None
last_event_at = None


def utc_now():
    return datetime.now(timezone.utc)


def active_vehicles(now):
    cutoff = now.timestamp() - ACTIVE_SECONDS
    return {key: event for key, event in vehicles.items() if (event.get("timestamp") or 0) >= cutoff}


def write_json_atomic(output, value):
    output.parent.mkdir(parents=True, exist_ok=True)
    handle, temporary = tempfile.mkstemp(dir=output.parent, prefix=f"{output.stem}-", suffix=".tmp")
    with os.fdopen(handle, "w", encoding="utf-8") as file:
        json.dump(value, file, ensure_ascii=False)
    os.replace(temporary, output)


def save(now=None):
    global vehicles
    now = now or utc_now()
    vehicles = active_vehicles(now)
    routes = Counter(event.get("route_id") or "Unknown" for event in vehicles.values())
    state = {
        "updated_at": now.isoformat(),
        "last_event_at": last_event_at,
        "mta": {
            "active_vehicle_count": len(vehicles),
            "active_window_seconds": ACTIVE_SECONDS,
            "route_count": len(routes),
            "top_routes": [{"route_id": route, "vehicles": count} for route, count in routes.most_common(5)],
        },
        "nws": latest_nws,
    }
    features = []
    for vehicle_id, event in vehicles.items():
        longitude = event.get("longitude")
        latitude = event.get("latitude")
        if not isinstance(longitude, (int, float)) or not isinstance(latitude, (int, float)):
            continue
        features.append({
            "type": "Feature",
            "id": vehicle_id,
            "geometry": {"type": "Point", "coordinates": [longitude, latitude]},
            "properties": {
                "vehicle_id": vehicle_id,
                "route_id": event.get("route_id") or "Unknown",
                "trip_id": event.get("trip_id") or "Not available",
                "updated_at": datetime.fromtimestamp(event.get("timestamp") or 0, timezone.utc).isoformat(),
            },
        })
    write_json_atomic(OUTPUT, state)
    write_json_atomic(VEHICLE_OUTPUT, {
        "type": "FeatureCollection",
        "generated_at": now.isoformat(),
        "active_window_seconds": ACTIVE_SECONDS,
        "features": features,
    })


print("Materializing Kafka data for Next.js. Press Ctrl+C to stop.")
last_save = 0.0
try:
    while True:
        message = consumer.poll(1.0)
        if message is None:
            if time.monotonic() - last_save >= 10:
                save()
                last_save = time.monotonic()
            continue
        if message.error():
            print(f"Kafka error: {message.error()}")
            continue
        event = json.loads(message.value().decode("utf-8"))
        if message.topic() == "tree11.mta.vehicle_positions":
            key = event.get("vehicle_id") or event.get("entity_id")
            if key:
                vehicles[key] = event
        else:
            latest_nws = event
        last_event_at = utc_now().isoformat()
        if time.monotonic() - last_save >= 1:
            save()
            last_save = time.monotonic()
except KeyboardInterrupt:
    pass
finally:
    consumer.close()
