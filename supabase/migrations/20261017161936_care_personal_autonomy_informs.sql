-- Extend the existing report snapshot source pipeline. Reserved material never enters shared exports.
begin;
alter function private.care_inform_sources(uuid[],timestamptz,timestamptz,timestamptz) rename to care_inform_before_personal_sources;
revoke all on function private.care_inform_before_personal_sources(uuid[],timestamptz,timestamptz,timestamptz) from public,anon,authenticated,service_role;
create function private.care_inform_sources(patients uuid[],lo timestamptz,hi timestamptz,seen timestamptz)
returns table(patient_id uuid,source_id uuid,metric text,category text,occurred_at timestamptz,label text,revision integer,body text,author_id uuid,carried boolean)
language sql stable security definer set search_path='' as $$
 select * from private.care_inform_before_personal_sources(patients,lo,hi,seen)
 union all
 select a.patient_id,a.id,'personal_autonomy_self','self_report',
 ((v.payload->>'evaluation_date'))::date::timestamp at time zone 'America/Santiago',
 'Autorreporte de autonomía personal · '||c.document_version,v.revision,
 'Respuesta del paciente. Carga '||v.mode||'. '||
 (select string_agg((ar->>'key')||'. '||(it->>'text')||': '||
 coalesce(v.payload->'answers'->((it->>'id'))->>'value','Sin información')||
 '. Ejemplo/apoyo: '||coalesce(v.payload->'answers'->((it->>'id'))->>'context','')||
 '. Motivo de información faltante: '||coalesce(v.payload->'answers'->((it->>'id'))->>'missing_reason',''),E'\n' order by an,inum)
 from jsonb_array_elements(c.definition->'areas')with ordinality ar(ar,an) cross join lateral jsonb_array_elements(ar->'items')with ordinality it(it,inum))||E'\n'||
 coalesce((select string_agg((q->>'text')||': '||coalesce(v.payload->'open_answers'->>((q->>'id')),'Sin responder'),E'\n' order by n)from jsonb_array_elements(c.definition->'questions')with ordinality q(q,n) where (q->>'section')<>'learning'),'')||E'\nObservaciones adicionales del paciente: '||coalesce((v.payload->>'additional_notes'),''),
 v.entered_by,false
 from private.care_pa_assessments a join private.care_pa_catalogs c on c.id=a.catalog_id
 join lateral(select * from private.care_pa_versions av where av.id=a.id and av.status='submitted' and av.recorded_at<=seen order by av.revision desc limit 1)v on true
 where a.patient_id=any(patients) and private.care_pa_readable(a.patient_id)
 and ((v.payload->>'evaluation_date'))::date::timestamp at time zone 'America/Santiago'>=lo and ((v.payload->>'evaluation_date'))::date::timestamp at time zone 'America/Santiago'<hi
 union all
 select p.patient_id,r.id,'personal_autonomy_review',(r.payload->>'outcome'),
 ((r.payload->>'review_date'))::date::timestamp at time zone 'America/Santiago','Seguimiento de acuerdo · '||(p.payload->>'description'),null,
 'Fuente: '||case when r.actor_id=p.patient_accepted_by then 'autorreporte del paciente' else 'registro del equipo' end||
 '. Resultado: '||(r.payload->>'result')||'. Evidencia o ejemplo: '||(r.payload->>'evidence')||'. Apoyo: '||(r.payload->>'support')||'. Próximo paso: '||(r.payload->>'next_step')||
 coalesce((select E'\n'||string_agg((q->>'text')||': '||coalesce(r.payload->'learning'->>((q->>'id')),'Sin respuesta'),E'\n' order by n)from jsonb_array_elements(c.definition->'questions')with ordinality q(q,n) where (q->>'section')='learning'),''),r.actor_id,false
 from private.care_pa_reviews r join private.care_pa_proposals p on p.id=r.proposal_id join private.care_pa_assessments a on a.id=p.assessment_id join private.care_pa_catalogs c on c.id=a.catalog_id
 where p.patient_id=any(patients) and private.care_pa_readable(p.patient_id) and r.shared and r.recorded_at<=seen
 and not exists(select 1 from private.care_pa_reviews n where n.supersedes=r.id and n.recorded_at<=seen and n.shared)
 and ((r.payload->>'review_date'))::date::timestamp at time zone 'America/Santiago'>=lo and ((r.payload->>'review_date'))::date::timestamp at time zone 'America/Santiago'<hi
 union all
 select a.patient_id,o.id,'personal_autonomy_coach','professional_observation',o.recorded_at,'Observación compartida del coach · autonomía personal',o.revision,o.body,o.actor_id,false
 from private.care_pa_observations o join private.care_pa_assessments a on a.id=o.assessment_id
 where a.patient_id=any(patients) and private.care_pa_readable(a.patient_id) and o.shared and o.recorded_at>=lo and o.recorded_at<hi and o.recorded_at<=seen
$$;
revoke all on function private.care_inform_sources(uuid[],timestamptz,timestamptz,timestamptz) from public,anon,authenticated,service_role;
commit;
