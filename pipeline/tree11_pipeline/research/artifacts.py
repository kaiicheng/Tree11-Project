"""Small, deterministic research artifacts; large row-level tables stay in runs."""
import hashlib, json, subprocess
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from .contracts import contracts

SCHEMA_VERSION = 1
CLOSED = {"closed", "complete", "completed", "cancelled", "canceled"}

def _dt(value):
    try:
        parsed=datetime.fromisoformat(str(value).replace("Z", "+00:00")) if value else None
        return parsed.replace(tzinfo=timezone.utc) if parsed and parsed.tzinfo is None else parsed
    except (ValueError, TypeError): return None
def _pct(v, p):
    v = sorted(v)
    return v[round((len(v) - 1) * p)] if v else None
def _stats(values, minimum=1):
    values = sorted(values)
    if len(values) < minimum: return {"count": len(values), "median": None, "p25": None, "p75": None, "p90": None, "suppressed": bool(values)}
    return {"count":len(values), "median":_pct(values,.5), "p25":_pct(values,.25), "p75":_pct(values,.75), "p90":_pct(values,.9), "suppressed":False}
def _age(start, observation):
    a, b = _dt(start), _dt(observation)
    return max(0, (b-a).total_seconds()/3600) if a and b else None
def _bucket(hours, limits):
    days = hours / 24
    labels = [f"<{limits[0]} days"] + [f"{limits[i-1]}–{limits[i]}" for i in range(1,len(limits))] + [f"{limits[-1]}+"]
    return next((labels[i] for i, lim in enumerate(limits) if days < lim), labels[-1])

def build_research(tables, lifecycle_rows, observation_end, snapshots=None, minimum_group_n=5, age_buckets_days=(7,30,90,180)):
    """Build public aggregates and internal survival rows from accepted data only."""
    srs, ins, work, risks = (tables.get(x,[]) for x in ("service_requests","inspections","work_orders","risk_assessments"))
    ins_by_sr=defaultdict(list); work_by_ins=defaultdict(list)
    for x in ins: ins_by_sr[str(x.get("servicerequestglobalid"))].append(x)
    for x in work: work_by_ins[str(x.get("inspectionglobalid"))].append(x)
    sr_by_id={str(x.get("globalid")):x for x in srs}
    open_requests=[]; open_work=[]
    for sr in srs:
        if str(sr.get("srstatus",sr.get("status",""))).lower() not in CLOSED:
            age=_age(sr.get("createddate"),observation_end)
            if age is not None: open_requests.append((sr,age))
    for wo in work:
        if str(wo.get("wostatus",wo.get("status",""))).lower() not in CLOSED:
            age=_age(wo.get("createddate"),observation_end)
            if age is not None: open_work.append((wo,age))
    ages=[x[1] for x in open_requests]
    aging=defaultdict(int)
    for age in ages: aging[_bucket(age,age_buckets_days)] += 1
    timing={k:_stats([r[k] for r in lifecycle_rows if r.get(k) is not None], minimum_group_n) for k in ("request_to_first_inspection_hours","request_to_first_work_order_hours","work_order_to_completion_hours")}
    funnel=[("requests",len(srs)),("requests_with_inspection",sum(bool(ins_by_sr[str(x.get("globalid"))]) for x in srs)),("requests_with_work_order",sum(bool([w for i in ins_by_sr[str(x.get("globalid"))] for w in work_by_ins[str(i.get("globalid"))]]) for x in srs)),("completed_work_orders",sum(str(x.get("wostatus",x.get("status",""))).lower() in CLOSED for x in work))]
    funnel_rows=[]
    for i,(name,count) in enumerate(funnel): funnel_rows.append({"stage":name,"count":count,"percentage_of_requests":count/len(srs) if srs else None,"percentage_of_previous":count/funnel[i-1][1] if i and funnel[i-1][1] else None})
    cohorts=defaultdict(list)
    for r in lifecycle_rows:
        cohort=(r.get("request_created_at") or "")[:7]
        if cohort: cohorts[cohort].append(r)
    cohort_rows=[]
    for month, rows in sorted(cohorts.items()):
        for horizon in (7,30,60,90,180):
            end=_dt(observation_end); cutoff=_dt(month+"-01T00:00:00+00:00")
            eligible=bool(end and cutoff and (end-cutoff).days >= horizon)
            def rate(field):
                observed=sum(bool(r.get(field)) and (_dt(r[field])-_dt(r["request_created_at"])).days <= horizon for r in rows if _dt(r.get(field)) and _dt(r.get("request_created_at")))
                return observed/len(rows) if eligible and rows else None
            cohort_rows.append({"cohort_month":month,"horizon_days":horizon,"eligible_for_horizon":eligible,"observed_count":len(rows) if eligible else 0,"censored_before_horizon":len(rows) if not eligible else 0,"inspection_rate":rate("first_inspection_at"),"work_order_rate":rate("first_work_order_at"),"completion_rate":rate("work_order_completed_at")})
    geography=defaultdict(lambda:{"requests":0,"open_backlog":0,"inspection":[],"work":[]})
    for row in lifecycle_rows:
        sr=sr_by_id.get(row["service_request_id"],{}); geo=sr.get("boroughcode",sr.get("borough"))
        if not geo: continue
        g=geography[str(geo)]; g["requests"]+=1; g["inspection"] += [row["request_to_first_inspection_hours"]] if row.get("request_to_first_inspection_hours") is not None else []; g["work"] += [row["request_to_first_work_order_hours"]] if row.get("request_to_first_work_order_hours") is not None else []
    for sr,_ in open_requests:
        geo=sr.get("boroughcode",sr.get("borough"));
        if geo: geography[str(geo)]["open_backlog"]+=1
    geo_rows=[{"geography":k,"request_count":v["requests"],"open_backlog":v["open_backlog"],"median_request_to_inspection":_stats(v["inspection"],minimum_group_n)["median"],"median_request_to_work_order":_stats(v["work"],minimum_group_n)["median"],"suppressed":v["requests"]<minimum_group_n} for k,v in sorted(geography.items())]
    survival=[]
    for r in lifecycle_rows:
        sr=sr_by_id.get(r["service_request_id"],{});
        for endpoint,field in (("inspection","first_inspection_at"),("work_order","first_work_order_at"),("completion","work_order_completed_at")):
            start=_dt(r.get("request_created_at")); event=_dt(r.get(field)); duration=(event-start).total_seconds()/3600 if start and event else None
            survival.append({"service_request_id":r["service_request_id"],"endpoint":endpoint,"start_at":r.get("request_created_at"),"event_at":r.get(field),"duration_hours":duration,"event_observed":bool(event),"is_censored":not bool(event),"observation_end":observation_end,"cohort":(r.get("request_created_at") or "")[:7],"request_type":sr.get("srtype",sr.get("requesttype")),"geography":sr.get("boroughcode",sr.get("borough")),"history_origin":"source_event" if event else "tree11_observation"})
    overview={"schema_version":SCHEMA_VERSION,"observation_end":observation_end,"minimum_group_n":minimum_group_n,"request_count":len(srs),"inspection_count":len(ins),"risk_assessment_count":len(risks),"work_order_count":len(work),"requests_with_inspection":funnel[1][1],"requests_with_work_order":funnel[2][1],"timing":timing,"censoring":{"open_or_uncompleted_requests":sum(1 for r in lifecycle_rows if r.get("is_censored")),"policy":"Open cases are right-censored and excluded from completed-duration distributions."}}
    backlog={"schema_version":SCHEMA_VERSION,"observation_end":observation_end,"open_requests":len(open_requests),"open_work_orders":len(open_work),"new_requests":None,"completed_or_closed_requests":None,"net_backlog_change":None,"backlog_count":len(open_requests),"age_hours":_stats(ages,minimum_group_n),"aging_buckets":dict(sorted(aging.items())),"age_bucket_days":list(age_buckets_days),"note":"Current age applies only to source-status-open requests; it is not a completion duration."}
    return {"overview":overview,"lifecycle_funnel":{"schema_version":SCHEMA_VERSION,"stages":funnel_rows},"backlog":backlog,"timing_monthly":{"schema_version":SCHEMA_VERSION,"months":[]},"cohorts":{"schema_version":SCHEMA_VERSION,"rows":cohort_rows,"note":"Rates are null until the cohort has the stated follow-up horizon."},"geography":{"schema_version":SCHEMA_VERSION,"rows":geo_rows},"anomalies":{"schema_version":SCHEMA_VERSION,"data_quality":[],"operational":[]},"metric_contracts":{"schema_version":SCHEMA_VERSION,"metrics":[x.public() for x in contracts()]},"survival":survival}

def write_research_run(root, research, snapshot_ids, config):
    root=Path(root); encoded=json.dumps(config,sort_keys=True,separators=(",",":")); ident="research-"+hashlib.sha256(("|".join(snapshot_ids)+encoded).encode()).hexdigest()[:16]; run=root/"data"/"research_runs"/ident
    run.mkdir(parents=True,exist_ok=True)
    try: commit=subprocess.check_output(["git","rev-parse","HEAD"],cwd=root,text=True).strip()
    except Exception: commit=None
    manifest={"experiment_id":ident,"input_snapshot_ids":snapshot_ids,"config_hash":hashlib.sha256(encoded.encode()).hexdigest(),"git_commit":commit,"metric_versions":{x.metric_id:x.metric_version for x in contracts()}}
    (run/"manifest.json").write_text(json.dumps(manifest,sort_keys=True,indent=2)); (run/"config.resolved.json").write_text(json.dumps(config,sort_keys=True,indent=2)); (run/"metrics.json").write_text(json.dumps({k:v for k,v in research.items() if k!="survival"},sort_keys=True,indent=2)); (run/"tables").mkdir(exist_ok=True); (run/"tables"/"survival.jsonl").write_text("".join(json.dumps(x,sort_keys=True)+"\n" for x in research["survival"])); (run/"report.md").write_text("# Tree11 research run\n\nDeterministic descriptive analysis of accepted snapshots. Open endpoints are right-censored.\n")
    return run
