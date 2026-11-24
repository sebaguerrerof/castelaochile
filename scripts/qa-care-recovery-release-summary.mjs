import assert from 'node:assert/strict';
import { readFile, writeFile, stat } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mobileCoverage, recoveryMobileGroups } from './care-mobile-coverage.mjs';

// Read-only final verification of this explicitly marked, disposable local stack.
const read = async path => JSON.parse(await readFile(path, 'utf8'));
assert.equal((await read('tmp/patient-supabase-local/patient-qa.json')).project, 'castelao-patient-qa');
const cutoff = '2026-10-10T23:15:00.000Z';
const names = ['e2e', 'reports-e2e', 'records-e2e', 'dashboard-e2e', 'recovery-family-e2e', 'decisions-e2e', 'informs-e2e', 'jobs-e2e'];
const suites = [];
for (const name of [...names, 'weekly-e2e']) {
  const path = name === 'weekly-e2e' ? 'tmp/recovery-qa/weekly-e2e-results.json' : `tmp/care-qa/${name}-results.json`;
  const report = await read(path);
  assert.equal(report.status, 'PASS', path);
  assert.ok(report.at >= cutoff, `Stale functional evidence: ${path}`);
  // Original planning suite predates the cleanup field; final DB checks below
  // verify its fixture removal independently as well.
  if (name !== 'e2e') assert.equal(report.cleanup, 'complete', path);
  assert.equal(report.emailSent, false, path);
  const controls = report.count ?? report.counts;
  assert.equal(controls, report.checks.length, path);
  suites.push({ name, path, at: report.at, controls });
}
const uxGroups = ['planning-staff','planning-patient','technical','reports-staff','reports-patient','records-psychology','records-recovery','records-psychiatry','records-direction','records-patient','dashboard-direction','dashboard-empty','metrics-direction','metrics-empty','recovery-family-staff','recovery-family-direction','recovery-family-patient','recovery-family-empty','decisions-empty','decisions-direction','decisions-staff','informs-empty','informs-direction','informs-regenerated','informs-monthly','informs-professional','jobs-empty','jobs-configured','jobs-failed','jobs-completed','jobs-comparison','jobs-periods','jobs-team', ...recoveryMobileGroups];
async function matrix(kind, groups) {
  const rows = [];
  for (const group of groups) {
    const path = `tmp/care-qa/${kind}/${group}.json`;
    const report = await read(path);
    assert.ok(report.at >= cutoff, `Stale ${kind} evidence: ${path}`);
    assert.ok(report.results.length > 0, path);
    if (kind === 'mobile') assert.equal(report.physicalDevices, false, path);
    assert.ok(report.results.every(r => r.status === 'PASS' && r.findings.length === 0), path);
    rows.push({ group, path, at: report.at, controls: report.results.length });
  }
  return { groups: rows.length, controls: rows.reduce((n,r) => n+r.controls,0), findings: 0, results: rows };
}
const mobile = await matrix('mobile', Object.keys(mobileCoverage));
const ux = await matrix('ux', uxGroups);
const supplemental = {};
for (const [name,path] of Object.entries({care_sql:'tmp/care-qa/db-results.json',library_sql:'tmp/patient-library-qa/real-db.json',library_auth:'tmp/patient-library-qa/e2e.json',fresh_restore:'tmp/care-qa/step-11/db-release-results.json',public_cms:'tmp/care-qa/step-11/web/results.json'})) {
  const report = await read(path);
  assert.equal(report.status,'PASS',path);
  assert.ok((await stat(path)).mtime.toISOString() >= cutoff, `Stale supplemental evidence: ${path}`);
  if (name === 'library_auth') assert.equal(report.emailCapture,true);
  if (['fresh_restore','public_cms'].includes(name)) assert.equal(report.cleanup,'complete');
  supplemental[name] = {path, controls:report.assertions ?? report.count ?? report.checks.length};
}
assert.deepEqual((await read('tmp/patient-library-qa/pending-auth-cleanup.json')).ids,[]);
const pdf = {documents:7,pages:0,visually_inspected:true};
for (const path of ['tmp/care-qa/pdf/validation.json','tmp/care-qa/pdf/validation-scheduled.json']) {
  const report = await read(path);
  assert.equal(report.status,'PASS');assert.equal(report.visually_inspected,true);
  pdf.pages += report.total_pages;
  for (const item of report.results) assert.equal(item.source_sha256,createHash('sha256').update(await readFile(item.file)).digest('hex'));
}
const recoveryPdf = await read('tmp/recovery-qa/pdf/monthly-results.json');
assert.equal(recoveryPdf.status,'PASS');assert.equal(recoveryPdf.visually_inspected,true);
assert.equal(recoveryPdf.source_sha256,createHash('sha256').update(await readFile('tmp/recovery-qa/recovery-monthly-reviewed.pdf')).digest('hex'));
pdf.pages += recoveryPdf.pages;
const sql = `select json_build_object(
 'temporary_users',(select count(*) from auth.users where email like '%@example.test'),
 'temporary_rubric',(select count(*) from public.care_recovery_rubrics where document_version='200.0'),
 'proposal_pending',(select governance_state='proposal' and not criteria_enabled and approved_by is null from public.care_recovery_rubrics where id='c0000000-0000-4000-8000-000000000001'),
 'active_scheduler',(select count(*) from cron.job where jobname='castelao-care-tick' and active),
 'superadmin_protection',(select tgenabled='O' from pg_trigger where tgname='protect_last_active_superadmin' and tgrelid='public.admin_users'::regclass),
 'weeks',(select count(*) from public.care_recovery_weeks),
 'reviews',(select count(*) from private.care_recovery_commitment_reviews),
 'communications',(select count(*) from private.care_intervention_communications),
 'weekly_drafts',(select count(*) from private.care_recovery_week_drafts),
 'weekly_versions',(select count(*) from private.care_recovery_week_versions),
 'validations',(select count(*) from private.care_recovery_validations),
 'pilot_participants',(select count(*) from private.care_recovery_pilot_patients),
 'alert_evidence',(select count(*) from private.care_recovery_alert_evidence),
 'reiteration_rules',(select count(*) from private.care_operational_rules where kind='recovery_repeated_unfulfilled'),
 'public_care_buckets',(select count(*) from storage.buckets where id like 'care%' and public),
 'private_tables', (select json_agg(json_build_object('name',c.relname,'rls',c.relrowsecurity,'direct_grants',exists(select 1 from information_schema.role_table_grants g where g.table_schema='private' and g.table_name=c.relname and g.grantee in ('anon','authenticated','service_role','PUBLIC')))) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='private' and c.relname in ('care_recovery_commitment_reviews','care_intervention_communications','care_recovery_week_drafts','care_recovery_week_versions','care_recovery_validations','care_recovery_pilot_patients','care_recovery_governance_history','care_recovery_alert_evidence'))
);`;
const cleanup = JSON.parse(execFileSync('C:/Users/sebag/AppData/Local/Programs/DockerDesktop/resources/bin/docker.exe', ['exec','-i','supabase_db_castelao-patient-qa','psql','-X','-U','postgres','-d','postgres','-At','-v','ON_ERROR_STOP=1'], { input: sql, encoding: 'utf8', windowsHide: true }));
for (const [key,value] of Object.entries(cleanup)) if (typeof value === 'number') assert.equal(value,0,key);
assert.equal(cleanup.proposal_pending,true);
assert.equal(cleanup.superadmin_protection,true);
assert.equal(cleanup.private_tables.length,8);
assert.ok(cleanup.private_tables.every(t => t.rls && !t.direct_grants));
const report = { status:'PASS', at:new Date().toISOString(), environment:'marked-local-only', cutoff, suites, functional_controls:suites.reduce((n,s) => n+s.controls,0), metrics_subset_not_added:true, mobile, ux, supplemental, pdf, physicalDevices:false, institutionalAcceptance:false, cleanup };
await writeFile('tmp/recovery-qa/release-summary.json',JSON.stringify(report,null,2));
console.log(JSON.stringify({status:report.status,functional:report.functional_controls,mobile:mobile.controls,ux:ux.controls,supplemental,pdf,cleanup},null,2));
