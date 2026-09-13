# Tree11 Kafka/Spark lab

This is an optional local streaming lab. It does not affect the Next.js dashboard.

## Start Kafka

```bash
docker compose -f streaming/docker-compose.yml up -d
```

Install the producer dependencies in a virtual environment:

```bash
python -m venv .venv-streaming
.venv-streaming\Scripts\Activate.ps1
pip install -r streaming/requirements.txt
Copy-Item streaming/.env.example streaming/.env
```

Set `MTA_FEED_URL` in `streaming/.env`. MTA GTFS-Realtime requires a developer API key. NWS observations use the configured ASOS station and are free, but should be polled according to the source cadence rather than every second.

Run the producer:

```bash
python streaming/producer.py
```

The producer writes raw events to:

- `tree11.mta.vehicle_positions`
- `tree11.nws.observations`

NWS observations are published only when their source timestamp changes. MTA events remain raw in Kafka; the frontend materializer counts only vehicles observed within `MTA_ACTIVE_SECONDS` (three minutes by default), so the displayed total does not grow forever.

The Spark example reads MTA vehicle positions and prints one-minute counts by route. Run it from an environment containing PySpark:

```bash
spark-submit streaming/spark_stream.py
```

To expose the newest Kafka events to the local Next.js page, run this in another terminal:

```bash
python streaming/consumer.py
```

Then open `http://localhost:3000`. The homepage's **Live city signals** card polls `/api/streaming` every 30 seconds. This local materializer is intentionally separate from the production Vercel deployment.

The materializer also writes an active-vehicle GeoJSON view. `/api/mta-vehicles` exposes it to the existing Mapbox map, where **MTA buses** can be toggled independently from forestry service requests and refresh every 30 seconds.

The current lab intentionally keeps Kafka/Spark local. Vercel continues to serve the existing dashboard; a later step can publish Spark aggregates to PostgreSQL or `public/data` for the UI.
