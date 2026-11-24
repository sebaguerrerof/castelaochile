-- Daily self reports. No clinical defaults or remote scheduler activation.
begin;
create table public.care_report_rules (
  id uuid primary key default gen_random_uuid(), revision bigint generated always as identity unique,
  kind text not null check(kind in ('morning','evening')),
  effective_on date not null, opens_local time not null, closes_local time not null,
  close_next_day boolean not null, basis text not null check(basis in ('active_days','agenda_days')),
  weekdays integer[] not null check(cardinality(weekdays) between 1 and 7 and weekdays <@ array[1,2,3,4,5,6,7]),
  fields text[] not null check(cardinality(fields) between 1 and 4), required_fields text[] not null check(required_fields <@ fields),
  approved_by uuid not null references auth.users(id) on delete restrict, approved_at timestamptz not null default now(),
  reason text not null check(length(btrim(reason)) between 3 and 300),
  check((not close_next_day and closes_local>opens_local) or (close_next_day and closes_local<=opens_local)),
  check((kind='morning' and fields <@ array['state','planning','commitment']) or
    (kind='evening' and fields <@ array['activities','difficulties','tools','next_plan']))
);
create index care_report_rule_effective on public.care_report_rules(kind,effective_on desc,revision desc);
create index care_report_rule_author on public.care_report_rules(approved_by);
create table public.care_report_enrolments (
  patient_id uuid primary key references public.patient_profiles(id) on delete restrict,
  starts_on date not null, ends_on date, version integer not null default 1,
  configured_by uuid not null references auth.users(id) on delete restrict, updated_at timestamptz not null default now(),
  check(ends_on is null or ends_on>=starts_on)
);
create index care_report_enrolment_actor on public.care_report_enrolments(configured_by);
create table public.care_report_enrolment_history (
  id uuid primary key default gen_random_uuid(), patient_id uuid not null references public.care_report_enrolments(patient_id) on delete restrict,
  starts_on date not null, ends_on date, actor_id uuid not null references auth.users(id) on delete restrict,
  reason text not null check(length(btrim(reason)) between 3 and 300), version integer not null,
  recorded_at timestamptz not null default now(), unique(patient_id,version)
);
create index care_report_enrolment_history_actor on public.care_report_enrolment_history(actor_id);
create table public.care_report_exemptions (
  id uuid primary key default gen_random_uuid(), revision bigint generated always as identity unique,
  patient_id uuid not null references public.patient_profiles(id) on delete restrict,
  kind text not null check(kind in ('morning','evening','both')), starts_on date not null, ends_on date not null,
  opens_local time, closes_local time, close_next_day boolean,
  reason text not null check(length(btrim(reason)) between 3 and 300),
  actor_id uuid not null references auth.users(id) on delete restrict, recorded_at timestamptz not null default now(),
  check(ends_on>=starts_on and ends_on-starts_on<=365),
  check((opens_local is null and closes_local is null and close_next_day is null) or
    (opens_local is not null and closes_local is not null and close_next_day is not null and kind<>'both'
      and ((not close_next_day and closes_local>opens_local) or (close_next_day and closes_local<=opens_local))))
);
create index care_report_exemption_patient on public.care_report_exemptions(patient_id,starts_on,ends_on);
create index care_report_exemption_actor on public.care_report_exemptions(actor_id);
create table public.care_report_obligations (
  id uuid primary key default gen_random_uuid(), patient_id uuid not null references public.patient_profiles(id) on delete restrict,
  local_day date not null, kind text not null check(kind in ('morning','evening')),
  rule_id uuid not null references public.care_report_rules(id) on delete restrict,
  exception_id uuid references public.care_report_exemptions(id) on delete restrict,
  opens_at timestamptz not null, closes_at timestamptz not null, timezone text not null default 'America/Santiago' check(timezone='America/Santiago'),
  fields text[] not null, required_fields text[] not null, required boolean not null, requirement_reason text not null,
  generated_at timestamptz not null default now(), closed_at timestamptz,
  check(closes_at>opens_at and generated_at>=opens_at and generated_at<closes_at),
  unique(patient_id,local_day,kind)
);
create index care_report_obligation_rule on public.care_report_obligations(rule_id);
create index care_report_obligation_exception on public.care_report_obligations(exception_id);
create index care_report_obligation_due on public.care_report_obligations(closes_at) where closed_at is null;
create table public.care_report_obligation_changes (
  id uuid primary key default gen_random_uuid(), obligation_id uuid not null references public.care_report_obligations(id) on delete restrict,
  actor_id uuid not null references auth.users(id) on delete restrict, recorded_at timestamptz not null default now(),
  was_required boolean not null, is_required boolean not null, old_reason text not null, reason text not null
);
create index care_report_obligation_change_parent on public.care_report_obligation_changes(obligation_id);
create index care_report_obligation_change_actor on public.care_report_obligation_changes(actor_id);
create table public.care_daily_reports (
  id uuid primary key references public.care_report_obligations(id) on delete restrict,
  patient_id uuid not null references public.patient_profiles(id) on delete restrict,
  author_id uuid not null references auth.users(id) on delete restrict, answers jsonb not null check(jsonb_typeof(answers)='object'),
  first_submitted_at timestamptz not null default now(), updated_at timestamptz not null default now(), version integer not null default 1
);
create index care_daily_report_patient on public.care_daily_reports(patient_id,first_submitted_at desc);
create index care_daily_report_author on public.care_daily_reports(author_id);
create table public.care_report_revisions (
  id uuid primary key default gen_random_uuid(), report_id uuid not null references public.care_daily_reports(id) on delete restrict,
  submission_key uuid not null unique, answers jsonb not null, reason text not null check(length(btrim(reason)) between 3 and 300),
  actor_id uuid not null references auth.users(id) on delete restrict, recorded_at timestamptz not null default now(), version integer not null,
  unique(report_id,version)
);
create index care_report_revision_actor on public.care_report_revisions(actor_id);
create table private.care_report_drafts (
  obligation_id uuid primary key references public.care_report_obligations(id) on delete restrict,
  author_id uuid not null references auth.users(id) on delete restrict,
  answers jsonb not null, base_version integer not null, version integer not null default 1, saved_at timestamptz not null default now()
);
create index care_report_draft_author on private.care_report_drafts(author_id);
create table public.care_report_reviews (
  id uuid primary key default gen_random_uuid(), report_id uuid not null references public.care_daily_reports(id) on delete restrict,
  reviewer_id uuid not null references auth.users(id) on delete restrict, reviewed_version integer not null,
  reviewed_at timestamptz not null default now(), unique(report_id,reviewer_id,reviewed_version)
);
create index care_report_review_actor on public.care_report_reviews(reviewer_id);
create table private.care_report_review_notes (
  review_id uuid primary key references public.care_report_reviews(id) on delete restrict, body text not null check(length(body)<=600)
);

create function private.care_report_read(pid uuid) returns boolean language sql stable security definer set search_path='' as $$
  select private.care_self(pid) or (private.care_scope(pid,'care.patient.read') and private.care_scope(pid,'care.records.read'))
$$;
alter table public.care_report_rules enable row level security;
alter table public.care_report_enrolments enable row level security;
alter table public.care_report_enrolment_history enable row level security;
alter table public.care_report_exemptions enable row level security;
alter table public.care_report_obligations enable row level security;
alter table public.care_report_obligation_changes enable row level security;
alter table public.care_daily_reports enable row level security;
alter table public.care_report_revisions enable row level security;
alter table public.care_report_reviews enable row level security;
alter table private.care_report_drafts enable row level security;
alter table private.care_report_review_notes enable row level security;
revoke all on public.care_report_rules,public.care_report_enrolments,public.care_report_enrolment_history,
  public.care_report_exemptions,public.care_report_obligations,public.care_report_obligation_changes,
  public.care_daily_reports,public.care_report_revisions,public.care_report_reviews from public,anon,authenticated,service_role;
grant select on public.care_report_rules,public.care_report_enrolments,public.care_report_enrolment_history,
  public.care_report_exemptions,public.care_report_obligations,public.care_report_obligation_changes,
  public.care_daily_reports,public.care_report_revisions,public.care_report_reviews to authenticated;
revoke all on private.care_report_drafts,private.care_report_review_notes from public,anon,authenticated,service_role;
create policy care_report_rule_read on public.care_report_rules for select to authenticated using
  ((select private.care_can('care.assignments.manage')) or (select private.care_can('care.records.read')));
create policy care_report_enrolment_read on public.care_report_enrolments for select to authenticated using
  (private.care_report_read(patient_id) or private.care_scope(patient_id,'care.assignments.manage'));
create policy care_report_enrolment_history_read on public.care_report_enrolment_history for select to authenticated using
  (private.care_scope(patient_id,'care.assignments.manage'));
create policy care_report_exception_read on public.care_report_exemptions for select to authenticated using
  (private.care_scope(patient_id,'care.assignments.manage'));
create policy care_report_obligation_read on public.care_report_obligations for select to authenticated using
  (private.care_report_read(patient_id) or private.care_scope(patient_id,'care.assignments.manage'));
create policy care_report_obligation_changes_read on public.care_report_obligation_changes for select to authenticated using
  (exists(select 1 from public.care_report_obligations o where o.id=obligation_id and private.care_scope(o.patient_id,'care.assignments.manage')));
create policy care_daily_report_read on public.care_daily_reports for select to authenticated using (private.care_report_read(patient_id));
create policy care_report_revision_read on public.care_report_revisions for select to authenticated using
  (exists(select 1 from public.care_daily_reports r where r.id=report_id and private.care_report_read(r.patient_id)));
create policy care_report_review_read on public.care_report_reviews for select to authenticated using
  (exists(select 1 from public.care_daily_reports r where r.id=report_id and private.care_report_read(r.patient_id)));

create function private.care_report_configure(op text,p jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare pid uuid;rid uuid:=gen_random_uuid();d date:=(now() at time zone 'America/Santiago')::date;
  current_enrol public.care_report_enrolments;v integer;o public.care_report_obligations;
begin
  if not private.care_can('care.assignments.manage') then raise exception 'Recurso no disponible' using errcode='42501'; end if;
  if coalesce(length(btrim(p->>'reason')),0) not between 3 and 300 then raise exception 'Registra un motivo breve'; end if;
  if op='rule' then
    if not coalesce((p->>'confirm_approved')::boolean,false) or (p->>'effective_on')::date<d then raise exception 'Confirma configuración aprobada desde hoy o una fecha futura'; end if;
    insert into public.care_report_rules(id,kind,effective_on,opens_local,closes_local,close_next_day,basis,weekdays,fields,required_fields,approved_by,reason)
    values(rid,p->>'kind',(p->>'effective_on')::date,(p->>'opens_local')::time,(p->>'closes_local')::time,(p->>'close_next_day')::boolean,p->>'basis',
      array(select value::integer from jsonb_array_elements_text(p->'weekdays')),array(select value from jsonb_array_elements_text(p->'fields')),
      array(select value from jsonb_array_elements_text(p->'required_fields')),auth.uid(),btrim(p->>'reason'));
  else
    pid:=(p->>'patient_id')::uuid;
    if not private.care_scope(pid,'care.assignments.manage') or not private.care_scope(pid,'care.patient.read') then raise exception 'Recurso no disponible' using errcode='42501'; end if;
    -- Serialise with generation and submission; changes cannot race a closed obligation.
    perform pg_advisory_xact_lock(hashtextextended('care.report.patient:'||pid::text,0));
    if op='enrol' then
      select * into current_enrol from public.care_report_enrolments where patient_id=pid for update;
      if coalesce(current_enrol.version,0) is distinct from (p->>'version')::integer then raise exception 'El registro cambió' using errcode='40001'; end if;
      if (current_enrol.patient_id is null and (p->>'starts_on')::date<d) or
        (current_enrol.patient_id is not null and current_enrol.starts_on is distinct from (p->>'starts_on')::date) or
        (nullif(p->>'ends_on','')::date<d) then raise exception 'No se modifica la incorporación original ni se cierra retroactivamente'; end if;
      insert into public.care_report_enrolments(patient_id,starts_on,ends_on,configured_by) values(pid,(p->>'starts_on')::date,nullif(p->>'ends_on','')::date,auth.uid())
        on conflict(patient_id) do update set ends_on=excluded.ends_on,configured_by=auth.uid(),updated_at=now(),version=care_report_enrolments.version+1;
      select version into v from public.care_report_enrolments where patient_id=pid;
      insert into public.care_report_enrolment_history(patient_id,starts_on,ends_on,actor_id,reason,version)
        select patient_id,starts_on,ends_on,auth.uid(),btrim(p->>'reason'),version from public.care_report_enrolments where patient_id=pid;
      rid:=pid;
    elsif op in ('exempt','window') then
      if (p->>'starts_on')::date<d then raise exception 'Excepciones desde hoy; sin recalcular periodos cerrados'; end if;
      insert into public.care_report_exemptions(id,patient_id,kind,starts_on,ends_on,opens_local,closes_local,close_next_day,reason,actor_id)
        values(rid,pid,p->>'kind',(p->>'starts_on')::date,(p->>'ends_on')::date,
          case when op='window' then (p->>'opens_local')::time end,case when op='window' then (p->>'closes_local')::time end,
          case when op='window' then (p->>'close_next_day')::boolean end,btrim(p->>'reason'),auth.uid());
      -- Exempt unsent, still-open obligations explicitly. Window overrides apply only before generation.
      if op='exempt' then
        for o in select * from public.care_report_obligations b where b.patient_id=pid and b.local_day between (p->>'starts_on')::date and (p->>'ends_on')::date
          and (p->>'kind'='both' or b.kind=p->>'kind') and b.closed_at is null and b.closes_at>now() and b.required
          and not exists(select 1 from public.care_daily_reports r where r.id=b.id) for update loop
          insert into public.care_report_obligation_changes(obligation_id,actor_id,was_required,is_required,old_reason,reason)
            values(o.id,auth.uid(),true,false,o.requirement_reason,btrim(p->>'reason'));
          update public.care_report_obligations set required=false,requirement_reason='explicit_exemption',exception_id=rid where id=o.id;
        end loop;
      end if;
    else raise exception 'Operación no disponible'; end if;
  end if;
  insert into private.care_audit(actor_id,action,resource_id) values(auth.uid(),'care.report.configure.'||op,rid);
  return rid;
end $$;
create function public.care_report_configure(op text,p jsonb) returns uuid language sql security invoker set search_path='' as $$ select private.care_report_configure(op,p) $$;

create function private.care_reports_prepare(pid uuid,report_day date) returns jsonb language plpgsql security definer set search_path='' as $$
declare d date:=(now() at time zone 'America/Santiago')::date;k text;rule public.care_report_rules;
  en public.care_report_enrolments;ex public.care_report_exemptions;win public.care_report_exemptions;
  o public.care_report_obligations;sent public.care_daily_reports;opens timestamptz;closes timestamptz;
  eligible boolean;why text;state text;quality text;slots jsonb:='[]'::jsonb;created integer:=0;closed integer;
begin
  if not private.care_report_read(pid) and not private.care_scope(pid,'care.assignments.manage') then raise exception 'Recurso no disponible' using errcode='42501'; end if;
  if report_day is null or not isfinite(report_day) or report_day>d then raise exception 'Consulta hoy o un día anterior'; end if;
  perform pg_advisory_xact_lock(hashtextextended('care.report.patient:'||pid::text,0));
  select * into en from public.care_report_enrolments where patient_id=pid;
  -- Close only real, generated obligations; never invent missed rows after a generator failure.
  update public.care_report_obligations set closed_at=now() where patient_id=pid and closes_at<=now() and closed_at is null;
  get diagnostics closed=row_count;
  if closed>0 then insert into private.care_audit(actor_id,action,resource_id) values(auth.uid(),'care.report.close',pid);end if;
  foreach k in array array['morning','evening'] loop
    o:=null;sent:=null;rule:=null;ex:=null;win:=null;opens:=null;closes:=null;state:=null;quality:=null;
    select * into o from public.care_report_obligations where patient_id=pid and local_day=report_day and kind=k;
    if o.id is null then
      select * into rule from public.care_report_rules where kind=k and effective_on<=report_day order by effective_on desc,revision desc limit 1;
      if en.patient_id is null or report_day<en.starts_on or (en.ends_on is not null and report_day>en.ends_on) then state:='not_required';quality:='outside_enrolment';
      elsif rule.id is null then state:='configuration_pending';quality:='configuration_pending';
      elsif not extract(isodow from report_day)::integer=any(rule.weekdays) then state:='not_required';quality:='outside_weekdays';
      else
        select * into ex from public.care_report_exemptions where patient_id=pid and report_day between starts_on and ends_on and kind in (k,'both') and opens_local is null order by revision desc limit 1;
        select * into win from public.care_report_exemptions where patient_id=pid and report_day between starts_on and ends_on and kind=k and opens_local is not null order by revision desc limit 1;
        begin
          opens:=private.care_civil_instant(report_day+coalesce(win.opens_local,rule.opens_local));
          closes:=private.care_civil_instant((report_day+case when coalesce(win.close_next_day,rule.close_next_day) then 1 else 0 end)+coalesce(win.closes_local,rule.closes_local));
        exception when others then state:='data_incomplete';quality:='invalid_civil_window';end;
        if state is null then
          eligible:=exists(select 1 from public.care_episodes e where e.patient_id=pid and e.started_at<=opens and (e.ended_at is null or e.ended_at>opens)
            and (select h.status from public.care_episode_history h where h.episode_id=e.id and h.effective_at<=opens order by h.effective_at desc,h.version desc limit 1)='active');
          why:=case when ex.id is not null then 'explicit_exemption' when not eligible then 'no_active_episode'
            when rule.basis='agenda_days' and not exists(select 1 from public.care_events e join public.care_event_participants a on a.event_id=e.id
              where a.patient_id=pid and e.status<>'cancelled' and (e.starts_at at time zone 'America/Santiago')::date=report_day) then 'no_expected_agenda' else 'eligible' end;
          if why<>'eligible' then state:='not_required';quality:=why;
          elsif now()<opens then state:='not_open';quality:='awaiting_window';
          elsif now()>=closes then state:='data_incomplete';quality:='missing_generation';
          else
            insert into public.care_report_obligations(patient_id,local_day,kind,rule_id,exception_id,opens_at,closes_at,fields,required_fields,required,requirement_reason)
              values(pid,report_day,k,rule.id,win.id,opens,closes,rule.fields,rule.required_fields,true,why) returning * into o;
            created:=created+1;
          end if;
        end if;
      end if;
    end if;
    if o.id is not null then
      select * into sent from public.care_daily_reports where id=o.id;
      state:=case when not o.required then 'not_required' when sent.id is not null then case when sent.first_submitted_at<=o.closes_at then 'on_time' else 'late' end
        when o.closed_at is not null then 'omitted' else 'pending' end;
      quality:=case when not o.required and o.requirement_reason='explicit_exemption' then 'explicit_exemption' else 'generated' end;opens:=o.opens_at;closes:=o.closes_at;
    end if;
    slots:=slots||jsonb_build_array(jsonb_build_object('kind',k,'state',state,'quality',quality,'obligation_id',o.id,'opens_at',opens,'closes_at',closes));
  end loop;
  if created>0 then insert into private.care_audit(actor_id,action,resource_id) values(auth.uid(),'care.report.generate',pid);end if;
  return jsonb_build_object('day',report_day,'timezone','America/Santiago','slots',slots);
end $$;
create function public.care_reports_prepare(pid uuid,report_day date) returns jsonb language sql security invoker set search_path='' as $$ select private.care_reports_prepare(pid,report_day) $$;

create function private.care_report_editor(oid uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare o public.care_report_obligations;draft private.care_report_drafts;r public.care_daily_reports;
begin
  select * into o from public.care_report_obligations where id=oid;
  if o.id is null or not private.care_self(o.patient_id) then raise exception 'Recurso no disponible' using errcode='42501'; end if;
  select * into draft from private.care_report_drafts where obligation_id=oid and author_id=auth.uid();
  select * into r from public.care_daily_reports where id=oid;
  return jsonb_build_object('obligation',to_jsonb(o),'draft',case when draft.obligation_id is not null then to_jsonb(draft) end,'report',case when r.id is not null then to_jsonb(r) end);
end $$;
create function public.care_report_editor(oid uuid) returns jsonb language sql security invoker set search_path='' as $$ select private.care_report_editor(oid) $$;

create function private.care_report_write(op text,p jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare oid uuid:=(p->>'obligation_id')::uuid;o public.care_report_obligations;r public.care_daily_reports;
  draft private.care_report_drafts;prior public.care_report_revisions;answers jsonb:=p->'answers';
  field text;val jsonb;rid uuid;reason text;key uuid;v integer;
begin
  select * into o from public.care_report_obligations where id=oid;
  if o.id is null then raise exception 'Recurso no disponible' using errcode='42501'; end if;
  perform pg_advisory_xact_lock(hashtextextended('care.report.patient:'||o.patient_id::text,0));
  select * into o from public.care_report_obligations where id=oid for update;
  select * into r from public.care_daily_reports where id=oid for update;
  if op='review' then
    if not private.care_scope(o.patient_id,'care.patient.read') or not private.care_scope(o.patient_id,'care.records.read') or
      not private.care_scope(o.patient_id,'care.records.create') or r.id is null or r.author_id=auth.uid() then raise exception 'Recurso no disponible' using errcode='42501'; end if;
    if r.version is distinct from (p->>'report_version')::integer then raise exception 'El reporte cambió' using errcode='40001'; end if;
    if length(coalesce(p->>'comment',''))>600 then raise exception 'Comentario demasiado largo';end if;
    insert into public.care_report_reviews(report_id,reviewer_id,reviewed_version) values(oid,auth.uid(),r.version)
      on conflict(report_id,reviewer_id,reviewed_version) do nothing returning id into rid;
    if rid is null then select id into rid from public.care_report_reviews where report_id=oid and reviewer_id=auth.uid() and reviewed_version=r.version;return rid;end if;
    insert into private.care_report_review_notes(review_id,body) values(rid,btrim(coalesce(p->>'comment','')));
  elsif op in ('draft','submit') then
    if not private.care_self(o.patient_id) then raise exception 'Recurso no disponible' using errcode='42501'; end if;
    if answers is null or jsonb_typeof(answers)<>'object' then raise exception 'Respuestas inválidas'; end if;
    for field,val in select * from jsonb_each(answers) loop
      if not field=any(o.fields) or jsonb_typeof(val)<>'string' or length(val#>>'{}')>600 then raise exception 'Campo no autorizado o demasiado largo'; end if;
    end loop;
    if op='submit' then
      if not coalesce((p->>'confirm_submit')::boolean,false) then raise exception 'Confirma el envío al equipo'; end if;
      key:=(p->>'submission_key')::uuid;
      if key is null then raise exception 'Identificador de envío requerido';end if;
      select * into prior from public.care_report_revisions where submission_key=key;
      if prior.id is not null then
        if prior.report_id=oid and prior.actor_id=auth.uid() and prior.answers=answers then return oid;end if;
        raise exception 'Identificador ya utilizado para otro envío';
      end if;
      foreach field in array o.required_fields loop
        if coalesce(length(btrim(answers->>field)),0)=0 then raise exception 'Completa los campos requeridos'; end if;
      end loop;
    end if;
    if not o.required or now()<o.opens_at then raise exception 'El reporte no es requerido o todavía no abre'; end if;
    if coalesce(r.version,0) is distinct from (p->>'report_version')::integer then raise exception 'El reporte cambió' using errcode='40001'; end if;
    select * into draft from private.care_report_drafts where obligation_id=oid for update;
    if coalesce(draft.version,0) is distinct from (p->>'draft_version')::integer then raise exception 'El borrador cambió' using errcode='40001'; end if;
    if op='draft' then
      insert into private.care_report_drafts(obligation_id,author_id,answers,base_version) values(oid,auth.uid(),answers,coalesce(r.version,0))
        on conflict(obligation_id) do update set answers=excluded.answers,base_version=excluded.base_version,version=care_report_drafts.version+1,saved_at=now();
      rid:=oid;
    else
      reason:=case when r.id is null then 'Envío original del paciente' else btrim(p->>'reason') end;
      if coalesce(length(reason),0) not between 3 and 300 then raise exception 'Registra motivo de corrección'; end if;
      insert into public.care_daily_reports(id,patient_id,author_id,answers) values(oid,o.patient_id,auth.uid(),answers)
        on conflict(id) do update set answers=excluded.answers,updated_at=now(),version=care_daily_reports.version+1 returning version into v;
      insert into public.care_report_revisions(report_id,submission_key,answers,reason,actor_id,version) values(oid,key,answers,reason,auth.uid(),v);
      delete from private.care_report_drafts where obligation_id=oid;
      rid:=oid;
    end if;
  else raise exception 'Operación no disponible';end if;
  insert into private.care_audit(actor_id,action,resource_id) values(auth.uid(),'care.report.'||op,rid);
  return rid;
end $$;
create function public.care_report_write(op text,p jsonb) returns uuid language sql security invoker set search_path='' as $$ select private.care_report_write(op,p) $$;

create function private.care_report_review_comments(rid uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare pid uuid;
begin
  select patient_id into pid from public.care_daily_reports where id=rid;
  if pid is null or not private.care_scope(pid,'care.records.read') or not private.care_scope(pid,'care.patient.read') then raise exception 'Recurso no disponible' using errcode='42501';end if;
  insert into private.care_audit(actor_id,action,resource_id) values(auth.uid(),'care.report.review_read',rid);
  return coalesce((select jsonb_agg(jsonb_build_object('review_id',v.id,'comment',n.body,'version',v.reviewed_version,'reviewed_at',v.reviewed_at) order by v.reviewed_at desc)
    from public.care_report_reviews v join private.care_report_review_notes n on n.review_id=v.id where v.report_id=rid),'[]'::jsonb);
end $$;
create function public.care_report_review_comments(rid uuid) returns jsonb language sql security invoker set search_path='' as $$ select private.care_report_review_comments(rid) $$;

-- Explicit function permissions; private definers implement scoped atomic commands only.
revoke all on function private.care_report_read(uuid),private.care_report_configure(text,jsonb),public.care_report_configure(text,jsonb),
  private.care_reports_prepare(uuid,date),public.care_reports_prepare(uuid,date),private.care_report_editor(uuid),public.care_report_editor(uuid),
  private.care_report_write(text,jsonb),public.care_report_write(text,jsonb),private.care_report_review_comments(uuid),public.care_report_review_comments(uuid)
  from public,anon,authenticated,service_role;
grant execute on function private.care_report_read(uuid),private.care_report_configure(text,jsonb),public.care_report_configure(text,jsonb),
  private.care_reports_prepare(uuid,date),public.care_reports_prepare(uuid,date),private.care_report_editor(uuid),public.care_report_editor(uuid),
  private.care_report_write(text,jsonb),public.care_report_write(text,jsonb),private.care_report_review_comments(uuid),public.care_report_review_comments(uuid) to authenticated;
commit;
