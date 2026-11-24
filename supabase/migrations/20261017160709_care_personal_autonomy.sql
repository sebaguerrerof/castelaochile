-- Separate self-report instrument. No changes to ICC-REC-AUT-001 or clinical rules.
begin;
-- An agreement can have an agreed frequency/review without an invented deadline.
alter table public.care_commitments alter column due_at drop not null;
alter table public.care_commitment_history alter column due_at drop not null;
create table private.care_pa_catalogs (
 id uuid primary key, document_version text not null unique, definition jsonb not null,
 created_at timestamptz not null default now(), check(definition->>'id'=id::text),
 check(definition->>'document_version'=document_version)
);
insert into private.care_pa_catalogs(id,document_version,definition) values('da000000-0000-4000-8000-000000000001','1.0-transcription',$catalog${"id":"da000000-0000-4000-8000-000000000001","document_version":"1.0-transcription","transcription_state":"verified","title":"Instrumento de autonomía personal y reinserción en la vida cotidiana","instructions":"Propósito. Conocer las habilidades, apoyos y dificultades que tengo actualmente para desenvolverme en la vida diaria; acordar pasos realistas hacia una mayor autonomía y registrar avances de manera periódica.\nInstrucciones. Responde según lo que ocurre actualmente, no según lo que crees que deberías responder. No hay respuestas buenas o malas. La información se utilizará para definir apoyos y metas concretas.\n1. Escala de autonomía. Marca una opción por cada área según la situación actual.\n2. Evaluación inicial por áreas. Para las áreas A a F, escribe el nivel de autonomía (0, 1, 2, 3 o 4). En las áreas G y H, responde Sí, No o A veces. En todas las áreas, agrega ejemplos concretos u observaciones cuando sea útil.","source_manifest":[{"page":1,"sha256":"0db2f8bf10fe06eba27ac03aaa82d716c5ddf2f979a3edd50497d375ff48d37b"},{"page":2,"sha256":"ca90bbc2c22c18253e0dc281c38736253145cdb57ebe73f98d2eb86b87e5c1fb"},{"page":3,"sha256":"34745919257580862b3bbf2e74e96c00dee64dc214116b0acb924c4b9027e42e"},{"page":4,"sha256":"ff22ec940bff0e8cae06ea47f8ea20627cdfdfee1b0a7a0b29c32c7a9ae32c6d"},{"page":5,"sha256":"623524f1cf010c7876b6380d29c67b1b2309c9ea1127b4c606bc172fd63d2082"}],"perspective_instructions":"Completa esta sección desde tu propia percepción.","agreement_instructions":"Acordar compromisos útiles, alcanzables y comprobables.","review_instructions":"Completar en cada revisión. Registrar hechos observables, reconocer avances parciales y acordar ajustes.","closing_text":"La firma indica que se conversó sobre el contenido y los acuerdos. No implica que la persona esté de acuerdo con cada observación; las diferencias pueden registrarse.","outcome_criteria":["La acción acordada se realizó en el plazo o frecuencia definidos; anotar evidencia concreta.","Se avanzó, pero no se alcanzó todo lo acordado; precisar qué sí se logró y qué falta.","No se realizó la acción acordada. Explorar barreras y redefinir el siguiente paso para lograrlo.","La meta dejó de ser adecuada o surgieron circunstancias que requieren modificarla.","No hubo información suficiente para determinar el resultado."],"scale_descriptions":[{"value":0,"description":"Necesito que otra persona lo haga por mí o esté presente casi todo el tiempo."},{"value":1,"description":"Puedo participar, pero necesito guía, recordatorios o acompañamiento frecuente."},{"value":2,"description":"Puedo hacerlo en general; a veces necesito ayuda, supervisión o recordatorios."},{"value":3,"description":"Puedo hacerlo de forma segura y responsable por mi cuenta (existe disponibilidad de apoyo de 3ras personas)"},{"value":4,"description":"Realizo todas mis actividades de manera 100 % autónoma."}],"areas":[{"key":"A","title":"Organización y autocuidado","instructions":"","items":[{"id":"A1","text":"Organizo mis horarios y cumplo una rutina diaria."},{"id":"A2","text":"Me levanto y me preparo para mis actividades sin depender de otra persona."},{"id":"A3","text":"Cuido mi higiene, ropa, alimentación y descanso."},{"id":"A4","text":"Recuerdo y asisto a mis citas o actividades programadas."},{"id":"A5","text":"Reconozco cuándo necesito pedir ayuda y a quién acudir."}]},{"key":"B","title":"Desplazamientos e interacción con el medio","instructions":"","items":[{"id":"B1","text":"Puedo planificar cómo llegar a un lugar conocido."},{"id":"B2","text":"Uso transporte público u otro medio disponible de manera segura."},{"id":"B3","text":"Puedo realizar trámites o compras sencillas fuera de casa."},{"id":"B4","text":"Informo a quien corresponde de mis planes cuando existe un acuerdo de seguridad."},{"id":"B5","text":"Resuelvo imprevistos básicos durante un desplazamiento (por ejemplo, atraso o cambio de recorrido)."}]},{"key":"C","title":"Manejo del dinero","instructions":"","items":[{"id":"C1","text":"Conozco el dinero del que dispongo y mis gastos habituales."},{"id":"C2","text":"Puedo elaborar un presupuesto sencillo para la semana."},{"id":"C3","text":"Distingo gastos necesarios, gastos opcionales y compromisos pendientes."},{"id":"C4","text":"Realizo compras y reviso el vuelto o comprobante."},{"id":"C5","text":"Evito prestar, pedir o gastar dinero impulsivamente cuando eso puede perjudicar mis objetivos."},{"id":"C6","text":"Puedo conversar sobre dinero con mi red de apoyo de forma clara y responsable."}]},{"key":"D","title":"Responsabilidades del hogar y vida práctica","instructions":"","items":[{"id":"D1","text":"Cumplo tareas acordadas en el hogar o residencia."},{"id":"D2","text":"Mantengo mis pertenencias y espacios razonablemente ordenados."},{"id":"D3","text":"Preparo o gestiono comidas sencillas de manera adecuada."},{"id":"D4","text":"Lavo o cuido mi ropa y pertenencias."},{"id":"D5","text":"Gestiono documentos, teléfono y otras necesidades prácticas."}]},{"key":"E","title":"Toma de decisiones y resolución de problemas","instructions":"","items":[{"id":"E1","text":"Evalúo opciones antes de tomar decisiones importantes."},{"id":"E2","text":"Puedo reconocer consecuencias probables de mis decisiones."},{"id":"E3","text":"Cuando aparece un problema, intento alternativas antes de abandonar la tarea."},{"id":"E4","text":"Puedo aceptar límites y acuerdos aunque no sean mi primera preferencia."},{"id":"E5","text":"Reconozco errores y propongo cómo repararlos o evitar que se repitan."}]},{"key":"F","title":"Comunicación, vínculos y red de apoyo","instructions":"","items":[{"id":"F1","text":"Puedo expresar mis necesidades y pedir ayuda de forma respetuosa."},{"id":"F2","text":"Puedo escuchar acuerdos, límites o preocupaciones de otras personas."},{"id":"F3","text":"Cumplo los acuerdos que establezco con familiares, pareja, amistades o equipo."},{"id":"F4","text":"Puedo identificar al menos una persona de apoyo y cuándo contactarla."},{"id":"F5","text":"Estoy desarrollando relaciones que apoyan mis objetivos de bienestar y reinserción."}]},{"key":"G","title":"Confianza y acuerdos con la red de apoyo","instructions":"","items":[{"id":"G1","text":"Las personas importantes para mí conocen mis objetivos actuales."},{"id":"G2","text":"Considero que mi red de apoyo confía en que puedo cumplir acuerdos cotidianos."},{"id":"G3","text":"Mi red de apoyo me permite asumir responsabilidades acordes con mis capacidades."},{"id":"G4","text":"Existen acuerdos claros sobre dinero, horarios, salidas o responsabilidades."},{"id":"G5","text":"Puedo conversar sobre cómo aumentar gradualmente la confianza y la independencia."}]},{"key":"H","title":"Participación social, estudio o trabajo","instructions":"","items":[{"id":"H1","text":"Tengo actividades saludables fuera del hogar."},{"id":"H2","text":"Estoy explorando o manteniendo estudios, capacitación, voluntariado o trabajo, según mi situación."},{"id":"H3","text":"Puedo llegar a tiempo y comunicar cambios de horario."},{"id":"H4","text":"Identifico actividades o espacios comunitarios que me interesa retomar."},{"id":"H5","text":"Organizo mi tiempo libre de una manera que favorece mis metas."}]}],"questions":[{"id":"initial1","section":"initial","text":"¿Qué cosas de mi vida diaria puedo hacer actualmente sin ayuda?"},{"id":"initial2","section":"initial","text":"¿En qué situaciones dependo más de otras personas y qué tipo de ayuda recibo?"},{"id":"initial3","section":"initial","text":"¿Qué responsabilidades me gustaría empezar a asumir o recuperar?"},{"id":"initial4","section":"initial","text":"¿Qué me resulta más difícil al intentar hacer algo de manera independiente?"},{"id":"initial5","section":"initial","text":"¿Qué apoyos me sirven y cuáles podría ir necesitando menos con el tiempo?"},{"id":"initial6","section":"initial","text":"¿Qué significa para mí avanzar hacia una vida más autónoma y saludable?"},{"id":"perspective1","section":"perspective","text":"¿Qué acuerdos siento que cumplo de forma consistente?"},{"id":"perspective2","section":"perspective","text":"¿Qué acuerdos me cuesta cumplir y por qué?"},{"id":"perspective3","section":"perspective","text":"¿Qué necesitaría observar mi red de apoyo para sentirse más tranquila?"},{"id":"perspective4","section":"perspective","text":"¿Qué grado de independencia considero realista como próximo paso?"},{"id":"perspective5","section":"perspective","text":"¿Qué límites o medidas de seguridad debemos mantener por ahora?"},{"id":"learning1","section":"learning","text":"¿Qué avance valoro de este periodo, aunque sea pequeño?"},{"id":"learning2","section":"learning","text":"¿Qué compromiso cumplí y qué me ayudó a lograrlo?"},{"id":"learning3","section":"learning","text":"¿Qué compromiso quedó parcial o pendiente y qué obstáculos aparecieron?"},{"id":"learning4","section":"learning","text":"¿Qué aprendí sobre mis capacidades, límites y necesidades de apoyo?"},{"id":"learning5","section":"learning","text":"¿Qué meta mantendré, cuál ajustaré y cuál será el siguiente paso?"}]}$catalog$::jsonb);
create table private.care_pa_assessments (
 id uuid primary key, patient_id uuid not null references public.patient_profiles(id),
 catalog_id uuid not null references private.care_pa_catalogs(id),
 baseline_id uuid references private.care_pa_assessments(id), revision integer not null default 0
);
create index care_pa_patient on private.care_pa_assessments(patient_id,catalog_id);
create index care_pa_baseline on private.care_pa_assessments(baseline_id);
create table private.care_pa_versions (
 id uuid not null references private.care_pa_assessments(id), revision integer not null,
 status text not null check(status in ('draft','submitted')), payload jsonb not null,
 respondent_patient_id uuid not null references public.patient_profiles(id),
 entered_by uuid not null references auth.users(id), mode text not null check(mode in ('self','assisted')),
 reason text not null check(length(btrim(reason)) between 3 and 300), recorded_at timestamptz not null default now(),
 primary key(id,revision)
);
create table private.care_pa_proposals (
 id uuid primary key, patient_id uuid not null references public.patient_profiles(id),
 assessment_id uuid not null, assessment_revision integer not null,
 payload jsonb not null, origin text not null check(origin in ('patient','coach')),
 proposed_by uuid not null references auth.users(id), created_at timestamptz not null default now(),
 patient_accepted_by uuid references auth.users(id), patient_accepted_at timestamptz,
 coach_accepted_by uuid references auth.users(id), coach_accepted_at timestamptz,
 commitment_id uuid unique references public.care_commitments(id),
 foreign key(assessment_id,assessment_revision) references private.care_pa_versions(id,revision)
);
create index care_pa_proposal_patient on private.care_pa_proposals(patient_id);
create index care_pa_proposal_assessment on private.care_pa_proposals(assessment_id,assessment_revision);
alter table public.care_commitments add column source_personal_proposal_id uuid unique references private.care_pa_proposals(id);
create table private.care_pa_reviews (
 id uuid primary key, proposal_id uuid not null references private.care_pa_proposals(id),
 supersedes uuid unique references private.care_pa_reviews(id), payload jsonb not null,
 actor_id uuid not null references auth.users(id), recorded_at timestamptz not null default now(), shared boolean not null
 ,actor_kind text not null check(actor_kind in ('patient','coach'))
);
create index care_pa_review_proposal on private.care_pa_reviews(proposal_id,recorded_at);
create table private.care_pa_attestations (
 id uuid primary key, assessment_id uuid not null, revision integer not null,
 actor_id uuid not null references auth.users(id), party text not null check(party in ('patient','coach')),
 state text not null check(state in ('discussed','differences','pending')), note text not null check(length(note)<=2000),
 recorded_at timestamptz not null default now(),
 agreement_snapshot jsonb not null,
 foreign key(assessment_id,revision) references private.care_pa_versions(id,revision)
);
create index care_pa_attestation_assessment on private.care_pa_attestations(assessment_id,revision);
create table private.care_pa_observations (
 id uuid primary key, assessment_id uuid not null, revision integer not null,
 actor_id uuid not null references auth.users(id), body text not null check(length(btrim(body)) between 3 and 2000),
 shared boolean not null, recorded_at timestamptz not null default now(),
 foreign key(assessment_id,revision) references private.care_pa_versions(id,revision)
);
create index care_pa_observation_assessment on private.care_pa_observations(assessment_id,revision);

create index care_pa_catalog on private.care_pa_assessments(catalog_id);
create index care_pa_respondent on private.care_pa_versions(respondent_patient_id);
create index care_pa_entered on private.care_pa_versions(entered_by);
create index care_pa_proposed on private.care_pa_proposals(proposed_by);
create index care_pa_accepted_patient on private.care_pa_proposals(patient_accepted_by);
create index care_pa_accepted_coach on private.care_pa_proposals(coach_accepted_by);
create index care_pa_review_actor on private.care_pa_reviews(actor_id);
create index care_pa_attestation_actor on private.care_pa_attestations(actor_id);
create index care_pa_observation_actor on private.care_pa_observations(actor_id);

-- Private tables are only accessible through the scoped RPC facade, never through the Data API.
do $$declare t text;begin
 foreach t in array array['care_pa_catalogs','care_pa_assessments','care_pa_versions','care_pa_proposals','care_pa_reviews','care_pa_attestations','care_pa_observations'] loop
  execute format('alter table private.%I enable row level security',t);
  execute format('revoke all on private.%I from public,anon,authenticated,service_role',t);
 end loop;
end $$;
create function private.care_pa_immutable() returns trigger language plpgsql set search_path='' as $$
begin raise exception 'Conserva el historial: registra una nueva versión';end $$;
create function private.care_pa_protect_agreement() returns trigger language plpgsql set search_path='' as $$
begin
 if old.source_personal_proposal_id is not null and (new.title,new.due_at,new.responsible_kind,new.responsible_id,new.visibility,new.review_at,new.verification_method,new.source_personal_proposal_id) is distinct from (old.title,old.due_at,old.responsible_kind,old.responsible_id,old.visibility,old.review_at,old.verification_method,old.source_personal_proposal_id) then raise exception 'Acuerda una nueva propuesta desde Autonomía y conserva la meta anterior';end if;
 return new;
end $$;
create trigger care_pa_protect_agreement before update on public.care_commitments for each row execute function private.care_pa_protect_agreement();
do $$declare t text;begin
 foreach t in array array['care_pa_catalogs','care_pa_versions','care_pa_reviews','care_pa_attestations','care_pa_observations'] loop
  execute format('create trigger care_pa_immutable before update or delete on private.%I for each row execute function private.care_pa_immutable()',t);
 end loop;
end $$;
create function private.care_pa_readable(pid uuid) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and (private.care_self(pid) or (private.care_scope(pid,'care.patient.read') and private.care_scope(pid,'care.records.read')))
$$;
create function private.care_pa_validate(data jsonb,cat jsonb,final boolean) returns void language plpgsql set search_path='' as $$
declare a jsonb;i jsonb;e record;r jsonb;v jsonb;question jsonb;k text;begin
 if jsonb_typeof(data) is distinct from 'object' or
 (select array_agg(key order by key) from jsonb_object_keys(data)key) is distinct from array['additional_notes','answers','coach_id','evaluation_date','meeting_day','next_review','open_answers','review_frequency'] or
 jsonb_typeof(data->'answers') is distinct from 'object' or jsonb_typeof(data->'open_answers') is distinct from 'object' then raise exception 'Estructura de evaluación inválida';end if;
 if coalesce(data->>'evaluation_date','') !~ '^\d{4}-\d{2}-\d{2}$' or not isfinite((data->>'evaluation_date')::date) then raise exception 'Fecha inválida';end if;
 if data->>'next_review' is not null and (data->>'next_review' !~ '^\d{4}-\d{2}-\d{2}$' or not isfinite((data->>'next_review')::date)) then raise exception 'Revisión inválida';end if;
 foreach k in array array['additional_notes','meeting_day','review_frequency'] loop
  if jsonb_typeof(data->k) is distinct from 'string' or length(data->>k)>(case k when 'meeting_day' then 80 when 'review_frequency' then 120 else 2000 end) then raise exception 'Texto inválido';end if;
 end loop;
 for e in select * from jsonb_each(data->'answers') loop
  select ar into a from jsonb_array_elements(cat->'areas')ar where exists(select 1 from jsonb_array_elements(ar->'items')it where it->>'id'=e.key);
  if a is null then raise exception 'Ítem ajeno a esta versión';end if;
  r:=e.value;v:=r->'value';
  if jsonb_typeof(r) is distinct from 'object' or (select array_agg(key order by key)from jsonb_object_keys(r)key) is distinct from array['context','missing_reason','value'] or jsonb_typeof(r->'context') is distinct from 'string' or jsonb_typeof(r->'missing_reason') is distinct from 'string' or length(r->>'context')>2000 or length(r->>'missing_reason')>2000 then raise exception 'Respuesta inválida';end if;
  if v<>'null'::jsonb then
   if (a->>'key'<='F' and (jsonb_typeof(v)<>'number' or v#>>'{}' not in ('0','1','2','3','4'))) or (a->>'key'>'F' and (jsonb_typeof(v)<>'string' or v#>>'{}' not in ('Sí','No','A veces'))) or length(r->>'missing_reason')>0 then raise exception 'Escala o estado de información inválido';end if;
  elsif final and length(btrim(r->>'missing_reason'))<3 then raise exception 'Explica la información faltante';end if;
 end loop;
 for e in select * from jsonb_each(data->'open_answers') loop
  if not exists(select 1 from jsonb_array_elements(cat->'questions')q where q->>'id'=e.key and q->>'section'<>'learning') or jsonb_typeof(e.value)<>'string' or length(e.value#>>'{}')>2000 then raise exception 'Pregunta o texto inválidos';end if;
 end loop;
 if final then
  if cat->>'transcription_state'<>'verified' or jsonb_array_length(cat->'source_manifest')<>5 then raise exception 'Falta transcripción verificada';end if;
  if data->>'coach_id' is null or length(btrim(data->>'meeting_day'))=0 or length(btrim(data->>'review_frequency'))=0 then raise exception 'Completa identificación y periodicidad';end if;
  for a in select * from jsonb_array_elements(cat->'areas') loop
   for i in select * from jsonb_array_elements(a->'items') loop
    if not(data->'answers' ? (i->>'id')) then raise exception 'Faltan respuestas o motivos explícitos';end if;
   end loop;
  end loop;
  for question in select * from jsonb_array_elements(cat->'questions') where value->>'section'<>'learning' loop
   if coalesce(length(btrim(data->'open_answers'->>(question->>'id'))),0)=0 then raise exception 'Completa las preguntas abiertas';end if;
  end loop;
 end if;
end $$;

create function private.care_pa_write(pid uuid,op text,p jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare rid uuid:=(p->>'id')::uuid; a private.care_pa_assessments; cat jsonb; v private.care_pa_versions;
 prop private.care_pa_proposals; old_review private.care_pa_reviews; c public.care_commitments;
 is_patient boolean:=private.care_self(pid); writer boolean:=private.care_rc_writer(pid);
 data jsonb:=p->'payload'; final boolean:=op='submit'; k text; e record; cid uuid; coach uuid; baseline uuid;
begin
 if rid is null or not private.care_pa_readable(pid) or not(is_patient or writer) then raise exception 'Recurso no disponible' using errcode='42501';end if;
 if jsonb_typeof(p) is distinct from 'object' or octet_length(p::text)>180000 then raise exception 'Entrada inválida';end if;
 perform pg_advisory_xact_lock(hashtextextended(pid::text,173));
 if op in ('draft','submit') then
  select * into a from private.care_pa_assessments where id=rid for update;
  if a.id is not null and a.patient_id<>pid then raise exception 'Recurso no disponible' using errcode='42501';end if;
  if coalesce(a.revision,0) is distinct from (p->>'version')::integer then raise exception 'El registro cambió' using errcode='40001';end if;
  select definition into cat from private.care_pa_catalogs where id=(p->>'catalog_id')::uuid;
  if cat is null or (a.id is not null and a.catalog_id<>(p->>'catalog_id')::uuid) then raise exception 'Versión de instrumento inválida';end if;
  baseline:=nullif(p->>'baseline_id','')::uuid;
  if a.id is not null and a.baseline_id is distinct from baseline then raise exception 'Conserva la evaluación inicial';end if;
  if baseline is not null and not exists(select 1 from private.care_pa_assessments b join private.care_pa_versions bv on bv.id=b.id where b.id=baseline and b.id<>rid and b.patient_id=pid and b.catalog_id=(p->>'catalog_id')::uuid and b.baseline_id is null and bv.status='submitted') then raise exception 'Evaluación inicial incompatible';end if;
  if (is_patient and p->>'mode' is distinct from 'self') or (not is_patient and (p->>'mode' is distinct from 'assisted' or p->>'patient_present' is distinct from 'true')) then raise exception 'La carga asistida exige respuesta del paciente presente';end if;
  if length(btrim(coalesce(p->>'reason',''))) not between 3 and 300 or (final and p->>'confirm' is distinct from 'true') then raise exception 'Confirma envío y registra motivo';end if;
  perform private.care_pa_validate(data,cat,final);
  coach:=nullif(data->>'coach_id','')::uuid;
  if coach is not null and not exists(select 1 from public.admin_users u where u.user_id=coach and u.is_active and (u.role::text='superadmin' or exists(select 1 from public.care_assignments x where x.patient_id=pid and x.professional_id=coach and x.specialty in ('recovery','direction') and x.starts_at<=now() and (x.ends_at is null or x.ends_at>now())))) then raise exception 'Coach no autorizado';end if;
  if a.id is null then insert into private.care_pa_assessments(id,patient_id,catalog_id,baseline_id) values(rid,pid,(p->>'catalog_id')::uuid,baseline);end if;
  insert into private.care_pa_versions(id,revision,status,payload,respondent_patient_id,entered_by,mode,reason)
   values(rid,coalesce(a.revision,0)+1,case when final then 'submitted' else 'draft' end,data,pid,auth.uid(),case when is_patient then 'self' else 'assisted' end,btrim(p->>'reason'));
  update private.care_pa_assessments set revision=revision+1 where id=rid;
 elsif op='propose' then
  select * into a from private.care_pa_assessments where id=(p->>'assessment_id')::uuid and patient_id=pid;
  select * into v from private.care_pa_versions where id=a.id and revision=(p->>'assessment_revision')::integer;
  if v.id is null or v.status<>'submitted' then raise exception 'Selecciona una evaluación enviada';end if;
  select definition into cat from private.care_pa_catalogs where id=a.catalog_id;
  if coalesce(p->>'area','') not in ('A','B','C','D','E','F','G','H') or (coalesce(p->>'item_id','')<>'' and not exists(select 1 from jsonb_array_elements(cat->'areas')ar cross join lateral jsonb_array_elements(ar->'items')it where ar->>'key'=p->>'area' and it->>'id'=p->>'item_id')) then raise exception 'Área o ítem incompatibles';end if;
  if coalesce(length(btrim(p->>'description')),0) not between 3 and 160 or coalesce(length(btrim(p->>'verification')),0) not between 3 and 600 or coalesce(p->>'responsible_kind','') not in ('patient','professional') then raise exception 'Completa descripción, responsable y verificación';end if;
  foreach k in array array['frequency','difficulty','contingency'] loop
   if jsonb_typeof(p->k) is distinct from 'string' or length(p->>k)>(case when k='frequency' then 120 else 2000 end) then raise exception 'Texto inválido';end if;
  end loop;
  if (p->>'due_at' is not null and not isfinite((p->>'due_at')::timestamptz)) or p->>'review_at' is null or not isfinite((p->>'review_at')::timestamptz) then raise exception 'Fecha de plazo o revisión inválida';end if;
  coach:=nullif(p->>'responsible_id','')::uuid;
  if (p->>'responsible_kind'='patient' and coach is not null) or (p->>'responsible_kind'='professional' and (coach is null or not exists(select 1 from public.admin_users u where u.user_id=coach and u.is_active and (u.role::text='superadmin' or exists(select 1 from public.care_assignments x where x.patient_id=pid and x.professional_id=coach and x.starts_at<=now() and(x.ends_at is null or x.ends_at>now())))))) then raise exception 'Responsable no autorizado';end if;
  select * into prop from private.care_pa_proposals where id=rid;
  if prop.id is not null then
   if prop.patient_id<>pid or prop.proposed_by<>auth.uid() or prop.payload<>p then raise exception 'Identificador ya utilizado' using errcode='40001';end if;
   return rid;
  end if;
  insert into private.care_pa_proposals(id,patient_id,assessment_id,assessment_revision,payload,origin,proposed_by)
   values(rid,pid,a.id,v.revision,p,case when is_patient then 'patient' else 'coach' end,auth.uid());
 elsif op='accept' then
  select * into prop from private.care_pa_proposals where id=(p->>'proposal_id')::uuid and patient_id=pid for update;
  if prop.id is null or p->>'confirm' is distinct from 'true' then raise exception 'Confirma un acuerdo autorizado';end if;
  if prop.commitment_id is not null then return prop.id;end if;
  if is_patient then update private.care_pa_proposals set patient_accepted_by=auth.uid(),patient_accepted_at=now() where id=prop.id and patient_accepted_by is null;
  else update private.care_pa_proposals set coach_accepted_by=auth.uid(),coach_accepted_at=now() where id=prop.id and coach_accepted_by is null;end if;
  select * into prop from private.care_pa_proposals where id=prop.id;
  if prop.patient_accepted_by is not null and prop.coach_accepted_by is not null then
   data:=prop.payload;cid:=nullif(data->>'existing_commitment_id','')::uuid;
   if cid is not null then
    select * into c from public.care_commitments where id=cid for update;
    if c.id is null or c.patient_id<>pid or c.visibility<>'patient' or c.status<>'pending' or c.source_personal_proposal_id is not null or c.title<>data->>'description' or c.due_at is distinct from (data->>'due_at')::timestamptz or c.responsible_kind<>data->>'responsible_kind' or c.responsible_id is distinct from nullif(data->>'responsible_id','')::uuid then raise exception 'El compromiso existente debe coincidir con el acuerdo compartido';end if;
    update public.care_commitments set source_personal_proposal_id=prop.id,review_at=(data->>'review_at')::timestamptz,verification_method=data->>'verification',version=version+1 where id=cid returning * into c;
    insert into public.care_commitment_history(commitment_id,title,due_at,status,visibility,confirmation,result,actor_id,reason,version)values(c.id,c.title,c.due_at,c.status,c.visibility,c.confirmation,c.result,auth.uid(),'Vínculo acordado con autonomía personal',c.version);
   else
    cid:=gen_random_uuid();
    insert into public.care_commitments(id,patient_id,title,due_at,responsible_kind,responsible_id,visibility,origin,created_by,review_at,verification_method,source_personal_proposal_id)
     values(cid,pid,data->>'description',(data->>'due_at')::timestamptz,data->>'responsible_kind',nullif(data->>'responsible_id','')::uuid,'patient',case when prop.origin='patient' then 'self' else 'professional' end,prop.proposed_by,(data->>'review_at')::timestamptz,data->>'verification',prop.id);
    insert into public.care_commitment_history(commitment_id,title,due_at,status,visibility,confirmation,result,actor_id,reason,version)
     values(cid,data->>'description',(data->>'due_at')::timestamptz,'pending','patient',null,'',auth.uid(),'Acuerdo explícito de paciente y coach',1);
   end if;
   update private.care_pa_proposals set commitment_id=cid where id=prop.id;
  end if;
  insert into private.care_audit(actor_id,action,resource_id)values(auth.uid(),'personal_autonomy_accept',prop.id);
  return prop.id;
 elsif op='review' then
  select * into prop from private.care_pa_proposals where id=(p->>'proposal_id')::uuid and patient_id=pid;
  if prop.id is null or prop.commitment_id is null then raise exception 'Selecciona una meta acordada';end if;
  if coalesce(p->>'outcome','') not in ('Cumplida','Parcialmente cumplida','No cumplida en este periodo','Reformulada / pausada','No evaluable') then raise exception 'Resultado inválido';end if;
  foreach k in array array['review_date','period_start','period_end'] loop
   if coalesce(p->>k,'') !~ '^\d{4}-\d{2}-\d{2}$' or not isfinite((p->>k)::date) then raise exception 'Fecha inválida';end if;
  end loop;
  if (p->>'period_start')::date>(p->>'period_end')::date then raise exception 'Periodo inválido';end if;
  foreach k in array array['result','evidence','next_step','reason'] loop
   if jsonb_typeof(p->k) is distinct from 'string' or length(btrim(p->>k)) not between 3 and (case when k='reason' then 300 else 2000 end) then raise exception 'Completa resultado, evidencia, ajuste y motivo';end if;
  end loop;
  if jsonb_typeof(p->'support') is distinct from 'string' or length(p->>'support')>2000 or jsonb_typeof(p->'learning') is distinct from 'object' or jsonb_typeof(p->'shared') is distinct from 'boolean' or (is_patient and p->>'shared'<>'true') then raise exception 'Apoyo o visibilidad inválidos';end if;
  select definition into cat from private.care_pa_catalogs where id=(select catalog_id from private.care_pa_assessments where id=prop.assessment_id);
  for e in select * from jsonb_each(p->'learning') loop
   if jsonb_typeof(e.value)<>'string' or length(e.value#>>'{}')>2000 or not exists(select 1 from jsonb_array_elements(cat->'questions')q where q->>'id'=e.key and q->>'section'='learning') then raise exception 'Pregunta de aprendizaje inválida';end if;
  end loop;
  if nullif(p->>'supersedes','') is not null then
   select * into old_review from private.care_pa_reviews where id=(p->>'supersedes')::uuid and proposal_id=prop.id;
   if old_review.id is null or old_review.actor_id<>auth.uid() then raise exception 'Solo el autor corrige su revisión' using errcode='42501';end if;
  end if;
  if exists(select 1 from private.care_pa_reviews where id=rid) then
   if not exists(select 1 from private.care_pa_reviews where id=rid and proposal_id=prop.id and actor_id=auth.uid() and payload=p) then raise exception 'Identificador ya utilizado' using errcode='40001';end if;return rid;
  end if;
  insert into private.care_pa_reviews(id,proposal_id,supersedes,payload,actor_id,shared,actor_kind)values(rid,prop.id,nullif(p->>'supersedes','')::uuid,p,auth.uid(),(p->>'shared')::boolean,case when is_patient then 'patient' else 'coach' end);
  -- The five instrument outcomes stay separate from task status/professional verification.
 elsif op in ('attest','observe') then
  select * into a from private.care_pa_assessments where id=(p->>'assessment_id')::uuid and patient_id=pid;
  select * into v from private.care_pa_versions where id=a.id and revision=(p->>'revision')::integer and status='submitted';
  if v.id is null then raise exception 'Selecciona la versión enviada que se conversó';end if;
  if op='attest' then
   if coalesce(p->>'state','') not in ('discussed','differences','pending') or jsonb_typeof(p->'note') is distinct from 'string' or length(p->>'note')>2000 or (p->>'state'='differences' and length(btrim(p->>'note'))<3) or p->>'confirm' is distinct from 'true' then raise exception 'Registra tu constancia y las diferencias';end if;
   insert into private.care_pa_attestations(id,assessment_id,revision,actor_id,party,state,note,agreement_snapshot)values(rid,a.id,v.revision,auth.uid(),case when is_patient then 'patient' else 'coach' end,p->>'state',p->>'note',coalesce((select jsonb_agg(jsonb_build_object('id',pr.id,'commitment_id',pr.commitment_id,'patient_accepted_by',pr.patient_accepted_by,'coach_accepted_by',pr.coach_accepted_by)order by pr.id)from private.care_pa_proposals pr where pr.patient_id=pid),'[]'));
  else
   if is_patient or not writer then raise exception 'Solo coach autorizado' using errcode='42501';end if;
   if jsonb_typeof(p->'shared') is distinct from 'boolean' then raise exception 'Indica visibilidad';end if;
   insert into private.care_pa_observations(id,assessment_id,revision,actor_id,body,shared)values(rid,a.id,v.revision,auth.uid(),p->>'body',(p->>'shared')::boolean);
  end if;
 else raise exception 'Operación inválida';end if;
 -- Technical audit holds IDs/actions only. Never responses or evidence.
 insert into private.care_audit(actor_id,action,resource_id)values(auth.uid(),'personal_autonomy_'||op,rid);
 return rid;
end $$;

create function private.care_pa_context(pid uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare self boolean:=private.care_self(pid);begin
 if not private.care_pa_readable(pid) then raise exception 'Recurso no disponible' using errcode='42501';end if;
 insert into private.care_audit(actor_id,action,resource_id)values(auth.uid(),'personal_autonomy_read',pid);
 return jsonb_build_object('actor_id',auth.uid(),'patient_mode',self,'can_write',self or private.care_rc_writer(pid),
 'patient_actor_id',(select auth_user_id from public.patient_profiles where id=pid),
 'coach_ids',coalesce((select jsonb_agg(u.user_id)from public.admin_users u where u.is_active and (u.role::text='superadmin' or exists(select 1 from public.care_assignments x where x.professional_id=u.user_id and x.patient_id=pid and x.specialty in ('recovery','direction') and x.starts_at<=now() and(x.ends_at is null or x.ends_at>now())))),'[]'),
 'catalogs',coalesce((select jsonb_agg(definition order by created_at,id)from private.care_pa_catalogs),'[]'),
 'assessments',coalesce((select jsonb_agg(to_jsonb(v)||jsonb_build_object('catalog_id',a.catalog_id,'baseline_id',a.baseline_id) order by v.recorded_at desc,v.revision desc)from private.care_pa_assessments a join private.care_pa_versions v on v.id=a.id where a.patient_id=pid),'[]'),
 'proposals',coalesce((select jsonb_agg(p.payload||(to_jsonb(p)-'payload') order by p.created_at desc,p.id)from private.care_pa_proposals p where p.patient_id=pid),'[]'),
 'reviews',coalesce((select jsonb_agg(r.payload||(to_jsonb(r)-'payload') order by r.recorded_at desc,r.id)from private.care_pa_reviews r join private.care_pa_proposals p on p.id=r.proposal_id where p.patient_id=pid and (r.shared or r.actor_id=auth.uid() or private.care_is_director())),'[]'),
 'attestations',coalesce((select jsonb_agg(to_jsonb(t) order by t.recorded_at desc,t.id)from private.care_pa_attestations t join private.care_pa_assessments a on a.id=t.assessment_id where a.patient_id=pid),'[]'),
 'observations',coalesce((select jsonb_agg(to_jsonb(o) order by o.recorded_at desc,o.id)from private.care_pa_observations o join private.care_pa_assessments a on a.id=o.assessment_id where a.patient_id=pid and (o.shared or o.actor_id=auth.uid() or private.care_is_director())),'[]'),
 'actors',coalesce((select jsonb_agg(jsonb_build_object('id',u.id,'label',coalesce(nullif(u.raw_user_meta_data->>'full_name',''),case when u.id=(select auth_user_id from public.patient_profiles where id=pid) then (select display_name from public.patient_profiles where id=pid) else 'Profesional '||left(u.id::text,8) end)))from auth.users u where u.id=auth.uid() or u.id=(select auth_user_id from public.patient_profiles where id=pid) or exists(select 1 from public.care_assignments x where x.patient_id=pid and x.professional_id=u.id and x.starts_at<=now() and(x.ends_at is null or x.ends_at>now())) or exists(select 1 from public.admin_users ad where ad.user_id=u.id and ad.is_active and ad.role::text='superadmin')),'[]'));
end $$;
create function public.care_pa_context(pid uuid) returns jsonb language sql security invoker set search_path='' as $$select private.care_pa_context(pid)$$;
create function public.care_pa_write(pid uuid,op text,p jsonb) returns uuid language sql security invoker set search_path='' as $$select private.care_pa_write(pid,op,p)$$;
revoke all on function private.care_pa_immutable(),private.care_pa_protect_agreement(),private.care_pa_readable(uuid),private.care_pa_validate(jsonb,jsonb,boolean),private.care_pa_context(uuid),private.care_pa_write(uuid,text,jsonb),public.care_pa_context(uuid),public.care_pa_write(uuid,text,jsonb) from public,anon,authenticated,service_role;
grant execute on function private.care_pa_context(uuid),private.care_pa_write(uuid,text,jsonb),public.care_pa_context(uuid),public.care_pa_write(uuid,text,jsonb) to authenticated;
commit;
