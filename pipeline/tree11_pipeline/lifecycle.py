"""Compact, replayable lifecycle history derived from accepted source snapshots.

This module deliberately keeps source observations separate from source business
timestamps.  It stores only tracked canonical state deltas, never raw payloads.
"""
from __future__ import annotations
import hashlib, json
from collections import defaultdict
from datetime import datetime, timezone

STATE_SCHEMA_VERSION = EVENT_SCHEMA_VERSION = LIFECYCLE_SCHEMA_VERSION = 1
ENTITY_SOURCES = {"service_request": "service_requests", "inspection": "inspections", "work_order": "work_orders", "risk_assessment": "risk_assessments"}
TYPE_BY_SOURCE = {v: k for k, v in ENTITY_SOURCES.items()}

def _pick(r, *names):
    return next((r[n] for n in names if r.get(n) not in (None, "")), None)
def _iso(v):
    if not v: return None
    try: return datetime.fromisoformat(str(v).replace("Z", "+00:00")).isoformat()
    except (TypeError, ValueError): return None
def _hash(value): return hashlib.sha256(json.dumps(value, sort_keys=True, separators=(",", ":"), allow_nan=False).encode()).hexdigest()

def entity_rows(tables):
    """Normalized current entities; nullable parent IDs retain relationship uncertainty."""
    out = []
    for source, rows in sorted(tables.items()):
        typ = TYPE_BY_SOURCE[source]
        for r in sorted(rows, key=lambda x: str(x["globalid"])):
            parent_type = parent_id = None
            if typ == "inspection": parent_type, parent_id = "service_request", _pick(r, "servicerequestglobalid")
            elif typ in ("work_order", "risk_assessment"): parent_type, parent_id = "inspection", _pick(r, "inspectionglobalid")
            state = {k: v for k, v in {
                "status": _pick(r, "srstatus", "wostatus", "status"), "priority": _pick(r, "priority", "srpriority"),
                "risk_rating": _pick(r, "riskrating"), "created_at": _iso(_pick(r, "createddate", "initiateddate")),
                "event_at": _iso(_pick(r, "inspectiondate", "actualfinishdate", "closeddate", "canceldate")),
                "source_updated_at": _iso(_pick(r, "updateddate")),
                "completed_at": _iso(_pick(r, "actualfinishdate", "closeddate")),
                "type": _pick(r, "wotype", "workordertype"),
            }.items() if v is not None}
            out.append({"entity_type": typ, "entity_id": str(r["globalid"]), "parent_entity_type": parent_type,
                        "parent_entity_id": str(parent_id) if parent_id else None, "source": source,
                        "source_record_id": str(r["globalid"]), "state": state, "state_hash": _hash(state)})
    return out

def relationships(entities):
    seen, out = set(), []
    for e in entities:
        if not e["parent_entity_id"]: continue
        x = {"parent_entity_type": e["parent_entity_type"], "parent_entity_id": e["parent_entity_id"], "child_entity_type": e["entity_type"], "child_entity_id": e["entity_id"], "relationship_type": "source_identifier", "source": e["source"], "confidence": "direct"}
        key = tuple(x.values())
        if key not in seen: out.append(x); seen.add(key)
    return sorted(out, key=lambda x: tuple(str(v) for v in x.values()))

def replay(snapshots, as_of=None):
    state = {}
    for s in sorted(snapshots, key=lambda x: (x.get("observed_at", ""), x["snapshot_id"])):
        if as_of and s.get("observed_at", "") > as_of: break
        for d in s.get("deltas", []):
            key = (d["entity_type"], d["entity_id"])
            if d["change_type"] == "REMOVED_FROM_CURRENT_SOURCE": state.pop(key, None)
            else: state[key] = d["entity"]
    return state

def _event(change, observed_at):
    e = change["entity"]; before = change.get("before", {})
    events = []
    if change["change_type"] == "ADDED":
        name = {"service_request":"REQUEST_CREATED", "inspection":"INSPECTION_CREATED", "risk_assessment":"RISK_ASSESSMENT_CREATED", "work_order":"WORK_ORDER_CREATED"}[e["entity_type"]]
        event_at, precision = e["state"].get("created_at") or observed_at, "exact" if e["state"].get("created_at") else "observation"
        events.append((name, None, None, event_at, precision))
    elif change["change_type"] == "REMOVED_FROM_CURRENT_SOURCE": events.append(("SOURCE_RECORD_DISAPPEARED", None, None, observed_at, "observation"))
    else:
        for field, values in change["changed_fields"].items():
            if field == "status": name = {"service_request":"REQUEST_STATUS_CHANGED", "work_order":"WORK_ORDER_STATUS_CHANGED"}.get(e["entity_type"], "FIELD_CHANGED")
            elif field == "risk_rating" and e["entity_type"] == "risk_assessment": name = "RISK_LEVEL_CHANGED"
            elif field == "completed_at" and e["entity_type"] == "work_order": name = "WORK_ORDER_COMPLETED"
            else: name = "FIELD_CHANGED"
            event_at = e["state"].get("source_updated_at") or observed_at
            events.append((name, field, values, event_at, "source_update" if e["state"].get("source_updated_at") else "observation"))
    out=[]
    for typ, field, vals, at, precision in events:
        identity=[e["entity_type"],e["entity_id"],typ,at,field,vals]
        out.append({"event_id":_hash(identity),"entity_type":e["entity_type"],"entity_id":e["entity_id"],"event_type":typ,"event_at":at,"source_updated_at":e["state"].get("source_updated_at"),"retrieved_at":observed_at,"time_precision":precision,"field":field,"before":vals.get("before") if vals else None,"after":vals.get("after") if vals else None})
    return out

def advance(tables, snapshots, observed_at, snapshot_id):
    prior = replay(snapshots); current = {(e["entity_type"], e["entity_id"]): e for e in entity_rows(tables)}
    deltas=[]; unchanged=[]
    for key in sorted(current):
        e=current[key]; old=prior.get(key)
        if not old: change="ADDED"; fields={}
        elif old["state_hash"] == e["state_hash"] and old.get("parent_entity_id") == e.get("parent_entity_id"):
            unchanged.append({"entity_type":key[0],"entity_id":key[1]}); continue
        else:
            change="CHANGED"; fields={k:{"before":old["state"].get(k),"after":e["state"].get(k)} for k in sorted(set(old["state"])|set(e["state"])) if old["state"].get(k)!=e["state"].get(k)}
        deltas.append({"entity_type":key[0],"entity_id":key[1],"change_type":change,"changed_fields":fields,"before":old["state"] if old else {},"entity":e})
    for key in sorted(set(prior)-set(current)):
        e=prior[key]; deltas.append({"entity_type":key[0],"entity_id":key[1],"change_type":"REMOVED_FROM_CURRENT_SOURCE","changed_fields":{},"before":e["state"],"entity":e})
    events=[event for d in deltas for event in _event(d, observed_at)]
    return {"schema_version":STATE_SCHEMA_VERSION,"snapshot_id":snapshot_id,"observed_at":observed_at,"deltas":deltas,"unchanged_entities":unchanged,"events":events}

def _percentile(values, p):
    values=sorted(values)
    if not values: return None
    return values[round((len(values)-1)*p)]
def analytics(entities, rels, events, observed_at):
    by_type=defaultdict(dict)
    for e in entities: by_type[e["entity_type"]][e["entity_id"]]=e
    ins_by_sr=defaultdict(list); wo_by_ins=defaultdict(list)
    for r in rels:
        if r["child_entity_type"]=="inspection": ins_by_sr[r["parent_entity_id"]].append(by_type["inspection"].get(r["child_entity_id"]))
        if r["child_entity_type"]=="work_order": wo_by_ins[r["parent_entity_id"]].append(by_type["work_order"].get(r["child_entity_id"]))
    timing=[]; censored=negative=missing=0
    for sr in by_type["service_request"].values():
        created=sr["state"].get("created_at"); inspections=[x for x in ins_by_sr[sr["entity_id"]] if x]
        works=[w for i in inspections for w in wo_by_ins[i["entity_id"]] if w]
        first_i=min((x["state"].get("event_at") or x["state"].get("created_at") for x in inspections if x["state"].get("event_at") or x["state"].get("created_at")), default=None)
        first_w=min((x["state"].get("created_at") for x in works if x["state"].get("created_at")), default=None)
        completed=[x["state"].get("completed_at") for x in works if x["state"].get("completed_at")]
        first_complete=min(completed, default=None)
        row={"service_request_id":sr["entity_id"],"request_created_at":created,"first_inspection_at":first_i,"inspection_count":len(inspections),"first_work_order_at":first_w,"work_order_completed_at":first_complete,"work_order_count":len(works),"latest_observed_at":observed_at,"lifecycle_version":LIFECYCLE_SCHEMA_VERSION,"is_censored":not bool(first_complete)}
        for field, end in (("request_to_first_inspection_hours",first_i),("request_to_first_work_order_hours",first_w)):
            if created and end:
                hours=(datetime.fromisoformat(end)-datetime.fromisoformat(created)).total_seconds()/3600
                if hours >= 0: row[field]=hours
                else: row[field]=None; negative+=1
            else: row[field]=None; missing+=1
        if first_w and first_complete:
            hours=(datetime.fromisoformat(first_complete)-datetime.fromisoformat(first_w)).total_seconds()/3600
            if hours >= 0: row["work_order_to_completion_hours"]=hours
            else: row["work_order_to_completion_hours"]=None; negative+=1
        else: row["work_order_to_completion_hours"]=None; missing+=1
        censored += row["is_censored"]; timing.append(row)
    durations=[r["request_to_first_inspection_hours"] for r in timing if r["request_to_first_inspection_hours"] is not None]
    works=[r["request_to_first_work_order_hours"] for r in timing if r["request_to_first_work_order_hours"] is not None]
    completions=[r["work_order_to_completion_hours"] for r in timing if r["work_order_to_completion_hours"] is not None]
    transition=defaultdict(int)
    for e in events:
        if e["event_type"].endswith("STATUS_CHANGED") and e["before"] is not None: transition[(e["before"],e["after"])]+=1
    quality={"lifecycle_rows":len(timing),"events":len(events),"linked_entities":len(rels),"orphan_relationships":sum(1 for e in entities if e["parent_entity_id"] and e["parent_entity_id"] not in by_type.get(e["parent_entity_type"],{})),"missing_event_times":missing,"observation_time_fallbacks":sum(e["time_precision"]=="observation" for e in events),"negative_duration_exclusions":negative,"censored_entities":censored,"ambiguous_relationships":0}
    summary={"schema_version":1,"observation_history":True,"source_event_history":True,"request_count":len(timing),"requests_with_inspection":sum(bool(x["inspection_count"]) for x in timing),"requests_with_work_order":sum(bool(x["work_order_count"]) for x in timing),"median_request_to_inspection_hours":_percentile(durations,.5),"median_request_to_work_order_hours":_percentile(works,.5),"median_work_order_to_completion_hours":_percentile(completions,.5),"quality":quality}
    return timing, summary, {"schema_version":1,"transitions":[{"from":a,"to":b,"count":n} for (a,b),n in sorted(transition.items())]}, quality
