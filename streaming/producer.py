"""Poll MTA GTFS-Realtime and NOAA/NWS ASOS into Kafka topics."""
import json
import os
import time
from datetime import datetime, timezone

import requests
from confluent_kafka import Producer
from requests.adapters import HTTPAdapter
from google.transit import gtfs_realtime_pb2
from dotenv import load_dotenv
from urllib3.util.retry import Retry

load_dotenv("streaming/.env")

BOOTSTRAP = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092")
MTA_URL = os.getenv("MTA_FEED_URL", "")
NWS_STATION = os.getenv("NWS_STATION", "KNYC")
POLL_SECONDS = int(os.getenv("POLL_SECONDS", "30"))
producer = Producer({"bootstrap.servers": BOOTSTRAP, "client.id": "tree11-ingest"})
session = requests.Session()
session.headers.update({"User-Agent": "Tree11 educational streaming lab (https://www.tree11.org)"})
session.mount("https://", HTTPAdapter(max_retries=Retry(total=3, backoff_factor=0.5, status_forcelist=[429, 500, 502, 503, 504])))
last_nws_timestamp = None


def publish(topic, value, key=None):
    producer.produce(topic, json.dumps(value), key=key, on_delivery=lambda error, _: print(f"Kafka delivery failed: {error}") if error else None)
    producer.poll(0)


def poll_mta():
    if not MTA_URL:
        print("MTA_FEED_URL is not configured; MTA polling is disabled.")
        return
    response = session.get(MTA_URL, timeout=20)
    response.raise_for_status()
    feed = gtfs_realtime_pb2.FeedMessage()
    feed.ParseFromString(response.content)
    captured_at = datetime.now(timezone.utc).isoformat()
    published = 0
    for entity in feed.entity:
        if entity.HasField("vehicle"):
            vehicle = entity.vehicle
            value = {
                "captured_at": captured_at,
                "entity_id": entity.id,
                "vehicle_id": vehicle.vehicle.id,
                "route_id": vehicle.trip.route_id,
                "trip_id": vehicle.trip.trip_id,
                "latitude": vehicle.position.latitude,
                "longitude": vehicle.position.longitude,
                "timestamp": vehicle.timestamp,
            }
            publish("tree11.mta.vehicle_positions", value, entity.id)
            published += 1
    print(f"MTA: published {published} vehicle positions")


def poll_nws():
    global last_nws_timestamp
    response = session.get(
        f"https://api.weather.gov/stations/{NWS_STATION}/observations/latest",
        headers={"Accept": "application/geo+json"},
        timeout=20,
    )
    response.raise_for_status()
    properties = response.json().get("properties", {})
    observation_timestamp = properties.get("timestamp")
    if observation_timestamp == last_nws_timestamp:
        print("NWS: observation unchanged")
        return
    value = {
        "captured_at": datetime.now(timezone.utc).isoformat(),
        "station": NWS_STATION,
        "timestamp": observation_timestamp,
        "temperature_c": (properties.get("temperature") or {}).get("value"),
        "wind_speed_kmh": (properties.get("windSpeed") or {}).get("value"),
        "description": properties.get("textDescription"),
    }
    publish("tree11.nws.observations", value, NWS_STATION)
    last_nws_timestamp = observation_timestamp
    print(f"NWS: published observation {observation_timestamp}")


def main():
    print(f"Streaming to {BOOTSTRAP}; polling every {POLL_SECONDS}s")
    try:
        while True:
            started = time.monotonic()
            for name, function in (("MTA", poll_mta), ("NWS", poll_nws)):
                try:
                    function()
                except Exception as error:
                    print(f"{name} poll failed: {error}")
            producer.flush(10)
            time.sleep(max(0, POLL_SECONDS - (time.monotonic() - started)))
    except KeyboardInterrupt:
        print("Stopping producer")
    finally:
        producer.flush(10)


if __name__ == "__main__":
    main()
