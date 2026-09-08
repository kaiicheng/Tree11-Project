from ..lifecycle import replay, relationships, analytics

def get_entity_state_as_of(snapshots, entity_type, entity_id, as_of=None):
    return replay(snapshots, as_of).get((entity_type, str(entity_id)))

def get_entity_events(snapshots, entity_type, entity_id, as_of=None):
    return [e for s in snapshots if not as_of or s.get("observed_at", "") <= as_of for e in s.get("events", []) if e["entity_type"] == entity_type and e["entity_id"] == str(entity_id)]

def get_service_request_lifecycle(snapshots, service_request_id, as_of=None):
    entities = list(replay(snapshots, as_of).values())
    rows, _, _, _ = analytics(entities, relationships(entities), [], as_of or max((s.get("observed_at", "") for s in snapshots), default=None))
    return next((r for r in rows if r["service_request_id"] == str(service_request_id)), None)

def get_backlog_as_of(snapshots, as_of=None):
    entities = replay(snapshots, as_of).values()
    closed = {"closed", "complete", "completed", "cancelled", "canceled"}
    return [e for e in entities if e["entity_type"] in {"service_request", "work_order"} and str(e["state"].get("status", "")).lower() not in closed]
