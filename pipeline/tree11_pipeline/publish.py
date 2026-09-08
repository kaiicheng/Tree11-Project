import hashlib,json,os,shutil,tempfile
from datetime import datetime,timezone
from pathlib import Path
from .validate import validate_assets,ValidationError
from .lifecycle import advance,analytics,relationships,replay,STATE_SCHEMA_VERSION,EVENT_SCHEMA_VERSION,LIFECYCLE_SCHEMA_VERSION
from .research.artifacts import build_research
FORMAT_VERSION=2
def dump(p,x): p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps(x,sort_keys=True,separators=(',',':'),allow_nan=False),encoding='utf8')
def _state(ds): return {n:{str(r['globalid']):hashlib.sha256(json.dumps(r,sort_keys=True,separators=(',',':'),allow_nan=False).encode()).hexdigest() for r in rs} for n,rs in sorted(ds.items())}
def _load(p,life=False):
    out=[]; folder=p/'lifecycle'/'snapshots' if life else p/'snapshots'
    for f in sorted(folder.glob('*.json')) if folder.exists() else []:
        try:
            x=json.loads(f.read_text())
            if (life and (x.get('schema_version')!=STATE_SCHEMA_VERSION or not isinstance(x.get('deltas'),list))) or (not life and not isinstance(x.get('state'),dict)): raise ValueError()
            out.append(x)
        except (OSError,ValueError,json.JSONDecodeError) as e: raise ValidationError(f'corrupt historical snapshot: {f.name}') from e
    return sorted(out,key=lambda x:(x.get('snapshot_time',x.get('observed_at','')),x['snapshot_id']))
def publish(model,target,datasets,max_map_bytes,snapshot_retention=26,refresh=None):
    target=Path(target);target.parent.mkdir(parents=True,exist_ok=True);tmp=Path(tempfile.mkdtemp(prefix='tree11-build-',dir=target.parent))
    try:
        if target.exists(): shutil.copytree(target,tmp,dirs_exist_ok=True)
        prior=json.loads((target/'manifest.json').read_text()).get('source_rows',{}) if (target/'manifest.json').exists() else {}
        for n,rs in datasets.items():
            if prior.get(n,0) and len(rs)<prior[n]*.5: raise ValidationError(f'{n} row count dropped more than 50%; refusing publication')
        hist=_load(tmp/'history');state=_state(datasets);sid='state-'+hashlib.sha256(json.dumps(state,sort_keys=True,separators=(',',':')).encode()).hexdigest()[:16]
        item=next((x for x in hist if x['snapshot_id']==sid),None);old=hist[-1]['state'] if hist else {}
        delta={n:{'added':len(v.keys()-old.get(n,{}).keys()),'removed':len(old.get(n,{}).keys()-v.keys()),'changed':sum(old.get(n,{}).get(k)!=v[k] for k in v.keys()&old.get(n,{}).keys())} for n,v in state.items()}
        if not item:
            item={'format_version':2,'snapshot_id':sid,'snapshot_time':model['summary']['generated_at'],'data_through':model['summary']['data_through'],'source_rows':{n:len(v) for n,v in datasets.items()},'state':state,'changes':delta,'change_counts':{k:sum(x[k] for x in delta.values()) for k in ('added','removed','changed')}};dump(tmp/'history'/'snapshots'/(sid+'.json'),item);hist.append(item)
        hist=hist[-snapshot_retention:];keep={x['snapshot_id'] for x in hist}
        for f in (tmp/'history'/'snapshots').glob('*.json'):
            if f.stem not in keep:f.unlink()
        life=_load(tmp/'history',True); ls=next((x for x in life if x['snapshot_id']==sid),None)
        if not ls: ls=advance(datasets,life,model['summary']['generated_at'],sid);dump(tmp/'history'/'lifecycle'/'snapshots'/(sid+'.json'),ls);life.append(ls)
        entities=list(replay(life).values());rels=relationships(entities);events={e['event_id']:e for s in life for e in s.get('events',[])};rows,lsummary,transitions,quality=analytics(entities,rels,list(events.values()),model['summary']['generated_at'])
        refresh=refresh or {'status':'success','sources':{n:{'rows':len(v),'status':'success'} for n,v in datasets.items()}}; ended=datetime.now(timezone.utc);refresh={**refresh,'status':'success','snapshot_id':sid,'ended_at':ended.isoformat()}
        summary={**model['summary'],'format_version':2,'snapshot_id':sid,'change_counts':item['change_counts'],'validation_status':'valid','refresh':refresh,'lifecycle':lsummary};dump(tmp/'summary.json',summary);dump(tmp/'map'/'points.geojson',model['geojson'])
        for n,c in model['charts'].items():dump(tmp/'charts'/(n+'.json'),c)
        dump(tmp/'history'/'trend.json',{'format_version':2,'labels':[x['snapshot_id'] for x in hist],'datasets':[{'label':k.title()+' records','data':[x['change_counts'][k] for x in hist]} for k in ('added','changed','removed')]})
        monthly={}
        for r in rows:
            m=(r.get('request_created_at') or '')[:7]
            if not m: continue
            x=monthly.setdefault(m,{'month':m,'requests_created':0,'inspection_hours':[],'work_order_hours':[],'linked_inspection_count':0,'linked_work_order_count':0})
            x['requests_created']+=1; x['linked_inspection_count']+=bool(r['inspection_count']); x['linked_work_order_count']+=bool(r['work_order_count'])
            if r['request_to_first_inspection_hours'] is not None:x['inspection_hours'].append(r['request_to_first_inspection_hours'])
            if r['request_to_first_work_order_hours'] is not None:x['work_order_hours'].append(r['request_to_first_work_order_hours'])
        def stats(x):
            a=sorted(x); return {'eligible_count':len(a),'median':a[len(a)//2] if a else None,'p25':a[round((len(a)-1)*.25)] if a else None,'p75':a[round((len(a)-1)*.75)] if a else None,'p90':a[round((len(a)-1)*.9)] if a else None}
        monthly_rows=[{'month':m,'requests_created':x['requests_created'],'inspection_timing':stats(x['inspection_hours']),'work_order_timing':stats(x['work_order_hours']),'linked_inspection_pct':x['linked_inspection_count']/x['requests_created'],'linked_work_order_pct':x['linked_work_order_count']/x['requests_created']} for m,x in sorted(monthly.items())]
        dump(tmp/'history'/'lifecycle_summary.json',lsummary);dump(tmp/'history'/'transition_matrix.json',transitions);dump(tmp/'history'/'quality.json',quality);dump(tmp/'history'/'monthly_timing.json',{'schema_version':1,'months':monthly_rows});dump(tmp/'history'/'relationships.json',{'schema_version':1,'relationships':rels})
        research=build_research(datasets,rows,model['summary']['generated_at'],life)
        for name, value in research.items():
            if name != 'survival': dump(tmp/'research'/(name+'.json'),value)
        prior_quality=[]
        trend_file=tmp/'quality'/'trend.json'
        if trend_file.exists():
            try: prior_quality=json.loads(trend_file.read_text()).get('refreshes',[])
            except (ValueError,json.JSONDecodeError): prior_quality=[]
        quality_entry={'snapshot_id':sid,'observation_date':model['summary']['generated_at'],'row_counts':{n:len(v) for n,v in datasets.items()},'invalid_coordinates':model['summary'].get('excluded_invalid_coordinate_count',0),'orphan_relationship_count':quality['orphan_relationships'],'relationship_coverage':1-(quality['orphan_relationships']/max(1,quality['linked_entities'])),'censored_lifecycle_count':quality['censored_entities'],'observation_fallback_count':quality['observation_time_fallbacks']}
        prior_quality=[x for x in prior_quality if x.get('snapshot_id') != sid][-snapshot_retention+1:]+[quality_entry]
        dump(tmp/'quality'/'current.json',quality_entry); dump(tmp/'quality'/'trend.json',{'schema_version':1,'refreshes':prior_quality,'coverage_note':'Trend covers retained Tree11 observations only.'})
        dump(tmp/'research'/'backlog_trend.json',{'schema_version':1,'observations':[{'snapshot_id':x['snapshot_id'],'observation_date':x['observation_date'],'open_requests':x.get('open_requests'),'open_work_orders':x.get('open_work_orders'),'note':'Historical backlog is available only for retained observations.'} for x in prior_quality]})
        assets={'summary':'summary.json','map':'map/points.geojson','history_trend':'history/trend.json','lifecycle_summary':'history/lifecycle_summary.json','lifecycle_quality':'history/quality.json','lifecycle_transitions':'history/transition_matrix.json','quality_current':'quality/current.json','quality_trend':'quality/trend.json',**{'research_'+n:'research/'+n+'.json' for n in research if n != 'survival'},**{n:'charts/'+n+'.json' for n in sorted(model['charts'])}}
        hm={'schema_version':1,'state_schema_version':1,'event_schema_version':1,'snapshots_retained':len(life),'events':len(events),'service_request_lifecycles':len(rows),'earliest_observation':min((x['observed_at'] for x in life),default=None),'latest_observation':max((x['observed_at'] for x in life),default=None),'relationship_quality':quality}
        dump(tmp/'manifest.json',{'format_version':2,'generated_at':summary['generated_at'],'data_through':summary['data_through'],'snapshot_id':sid,'snapshot_time':item['snapshot_time'],'validation_status':'valid','source_rows':item['source_rows'],'change_counts':item['change_counts'],'refresh':refresh,'datasets':{n:{'rows':len(v),'grain':'one row per source globalid'} for n,v in datasets.items()},'retention':{'max_snapshots':snapshot_retention,'stored_snapshots':len(hist),'lifecycle_policy':'compact state deltas'},'history':hm,'assets':assets})
        validate_assets(tmp,max_map_bytes);backup=target.with_name(target.name+'.previous')
        if backup.exists():shutil.rmtree(backup)
        if target.exists():os.replace(target,backup)
        try:os.replace(tmp,target)
        except Exception:
            if backup.exists() and not target.exists():os.replace(backup,target)
            raise
        if backup.exists():shutil.rmtree(backup)
    except Exception: shutil.rmtree(tmp,ignore_errors=True);raise
