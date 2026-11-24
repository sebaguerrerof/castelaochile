import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomBytes, randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { createClient } from '@supabase/supabase-js';

assert.equal(process.env.NEXT_PUBLIC_SUPABASE_URL, 'http://127.0.0.1:54421');
assert.equal(process.env.NEXT_PUBLIC_SITE_URL, 'http://localhost:3450');
assert.equal(process.env.PATIENT_AUTH_EMAILS_ENABLED, 'false');
const base = 'http://localhost:3450', out = process.env.CARE_DIRECTOR_QA_OUTPUT ?? 'tmp/care-qa/director';
const require = createRequire(import.meta.url);
process.env.PLAYWRIGHT_BROWSERS_PATH ??= 'C:/Git/castelaochile/tmp/playwright-mobile';
const { chromium, webkit } = require(require.resolve('playwright', { paths: [process.env.CODEX_NODE_MODULES ?? 'C:/Users/sebag/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules'] }));
const service = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
const token = randomUUID().slice(0, 8), password = 'Aa1!' + randomBytes(20).toString('hex');
const roles = ['superadmin', 'psychologist', 'psychiatrist', 'recovery_coach', 'editor'];
const labels = ['Dirección QA', 'Psicólogo QA', 'Psiquiatra QA', 'Coach Recovery QA', 'Editor QA'];
const users = [], patients = [randomUUID(), randomUUID()], checks = [], responsive = [], pageErrors = [];
let server, browser, failure, serverLog = '';
await mkdir(out, { recursive: true });
function unwrap(r) { if (r.error) throw new Error(r.error.message); return r.data; }
async function sql(input) {
  return new Promise((resolve, reject) => {
    const p = spawn('C:/Users/sebag/AppData/Local/Programs/DockerDesktop/resources/bin/docker.exe', ['exec', '-i', 'supabase_db_castelao-patient-qa', 'psql', '-X', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-t', '-A'], { windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '', stderr = ''; p.stdout.on('data', d => stdout += d); p.stderr.on('data', d => stderr += d); p.stdin.end(input); p.on('error', reject); p.on('close', code => code ? reject(new Error(stderr)) : resolve(stdout.trim()));
  });
}
function pass(label) { checks.push(label); console.log('PASS ' + label); }
async function login(context, user) {
  const page = await context.newPage();
  page.on('pageerror', error => pageErrors.push(error.message));
  await page.goto(base + '/admin/login');
  await page.getByLabel('Correo institucional', { exact: true }).fill(user.email);
  await page.getByLabel('Contraseña', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
  await page.waitForURL(base + '/admin');
  await page.getByRole('heading', { name: user.role === 'superadmin' ? 'Panel del centro' : user.role === 'editor' ? 'Resumen' : 'Mi espacio profesional', exact: true }).waitFor();
  return page;
}
async function screen(page, route, width, engine, label) {
  if (process.env.CARE_DIALOG_QA_ONLY === 'true') return;
  await page.setViewportSize({ width, height: 900 });
  const response = await page.goto(base + route, { waitUntil: 'load' });
  assert.equal(response.status(), 200, route);
  await page.locator('h1').first().waitFor();
  await page.locator('.admin-skeleton').first().waitFor({ state: 'hidden' });
  if (route === '/admin/seguimiento/mi-trabajo') await page.getByRole('heading', { name: 'Mi agenda y pendientes', exact: true }).waitFor();
  assert.equal(await page.getByText('Tu cuenta no tiene permisos para esta sección.', { exact: true }).count(), 0);
  await page.evaluate(async () => { await document.fonts.ready; await Promise.all(document.getAnimations().filter(a => a.effect?.getTiming().iterations !== Infinity).map(a => a.finished.catch(() => {}))); });
  const result = await page.evaluate(() => ({
    overflow: document.documentElement.scrollWidth > innerWidth + 1,
    h1: document.querySelectorAll('h1').length,
    broken: [...document.images].filter(i => i.complete && i.naturalWidth === 0).length,
    error: /Application error|No fue posible cargar|Something went wrong/.test(document.body.innerText),
  }));
  if (result.overflow) await page.screenshot({ path: `${out}/${engine}-${label}-${width}-overflow.png`, fullPage: true });
  assert.equal(result.overflow, false, `${label} ${width} overflow`);
  assert.equal(result.h1, 1); assert.equal(result.broken, 0); assert.equal(result.error, false);
  responsive.push({ engine, route, width, status: 'PASS' });
  if ([320, 1440].includes(width)) await page.screenshot({ path: `${out}/${engine}-${label}-${width}.png`, fullPage: true });
}
try {
  assert.equal(await sql("select count(*)from cron.job where jobname='castelao-care-tick'and active;"), '0');
  for (let n = 0; n < 7; n++) {
    const email = `director-qa-${token}-${n}@example.test`;
    const user = unwrap(await service.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: labels[n] ?? 'Paciente neutral QA' } })).user;
    users.push({ ...user, email, role: roles[n] });
  }
  await sql(`insert into public.admin_users(user_id,role,is_active)values${users.slice(0, 5).map(u => `('${u.id}','${u.role}',true)`).join(',')};
    insert into public.patient_profiles(id,auth_user_id,email,display_name)values('${patients[0]}','${users[5].id}','${users[5].email}','Paciente A roles QA'),('${patients[1]}','${users[6].id}','${users[6].email}','Paciente B roles QA');
    insert into public.care_assignments(patient_id,professional_id,specialty,starts_at,created_by)values${users.slice(1, 4).map((u, i) => `('${patients[0]}','${u.id}','${['psychology', 'psychiatry', 'recovery'][i]}',now()-interval '1 day','${users[0].id}')`).join(',')};`);
  server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-p', '3450'], { windowsHide: true, env: process.env, stdio: ['ignore', 'pipe', 'pipe'] });
  server.stdout.on('data', d => serverLog += d); server.stderr.on('data', d => serverLog += d);
  for (let i = 0; i < 60; i++) { try { if ((await fetch(base + '/admin/login')).ok) break; } catch {} await new Promise(r => setTimeout(r, 500)); }
  for (const [engine, launcher] of [['chromium', chromium], ['webkit', webkit]]) {
    browser = await launcher.launch(engine === 'chromium' ? { headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' } : { headless: true });
    const directorContext = await browser.newContext(), director = await login(directorContext, users[0]);
    pass(engine + ': Direction signs in to centre panel');
    for (const width of [320, 375, 768, 1440]) for (const [route, label] of [['/admin/grupos-terapeuticos', 'groups'], ['/admin/biblioteca', 'library'], ['/admin/contenidos', 'content'], ['/admin/paginas', 'pages'], ['/admin/equipo', 'website-team'], ['/admin/configuracion', 'settings'], ['/admin/consultas', 'consultations'], ['/admin/analitica', 'analytics'], ['/admin/perfil', 'profile'], ['/admin/seguimiento', 'dashboard'], ['/admin/seguimiento/recovery', 'recovery'], ['/admin/seguimiento/informes', 'reports'], ['/admin/seguimiento/alertas', 'alerts'], ['/admin/seguimiento/supervision', 'supervision'], ['/admin', 'home'], ['/admin/usuarios', 'users'], ['/admin/pacientes', 'patients'], ['/admin/seguimiento/equipo', 'assignments'], ['/admin/seguimiento/rubricas', 'rubric'], ['/admin/seguimiento/mi-trabajo', 'agenda'], [`/admin/seguimiento/pacientes/${patients[1]}`, 'unassigned-patient']]) await screen(director, route, width, engine, label);
    pass(engine + ': Direction opens unassigned patient and rubric without extra capabilities');
    await director.goto(base + '/admin/usuarios');
    await director.getByRole('button', { name: 'Invitar al equipo', exact: true }).click();
    const options = await director.getByLabel('Función en el centro').locator('option').allTextContents();
    for (const label of ['Psicólogo', 'Psiquiatra', 'Coach Recovery', 'Dirección · Superadministrador']) assert.ok(options.includes(label));
    await director.keyboard.press('Escape');
    pass(engine + ': actual role selector includes clinical profiles');
    await director.goto(base + '/admin');
    await director.getByRole('link', { name: 'Mi agenda y pendientes', exact: true }).click();
    await director.waitForURL(base + '/admin/seguimiento/mi-trabajo');
    await director.getByRole('heading', { name: 'Mi agenda y pendientes', exact: true }).waitFor();
    assert.equal(await director.getByLabel('Tipo de trabajo').inputValue(), 'agenda');
    for (const mode of ['tasks', 'records', 'alerts']) {
      await director.getByLabel('Tipo de trabajo').selectOption(mode);
      await director.getByRole('button', { name: 'Aplicar filtros de trabajo' }).click();
      await director.waitForURL(new RegExp('tipo=' + mode));
      await director.getByRole('heading', { name: 'Mi agenda y pendientes', exact: true }).waitFor();
      assert.equal(await director.getByText('Tu cuenta no tiene permisos para esta sección.').count(), 0);
    }
    pass(engine + ': actual agenda link and all work filters work for unassigned Direction');
    await director.goto(base + '/admin/seguimiento/equipo');
    assert.equal(await director.getByText('Permisos adicionales · configuración avanzada', { exact: true }).count(), 0);
    assert.equal(await director.locator('input[name=capabilities]').count(), 0);
    pass(engine + ': team screen has no manual capability controls');
    await director.goto(base + '/admin/pacientes');
    assert.equal(await director.getByRole('link', { name: 'Permisos del equipo', exact: true }).count(), 0);
    await director.goto(base + '/admin/pacientes/permisos');
    await director.waitForURL(base + '/admin/usuarios');
    await director.getByRole('heading', { name: 'Equipo y usuarios', exact: true }).waitFor();
    pass(engine + ': legacy permissions URL redirects to role management');
    await director.goto(base + '/admin/usuarios');
    if (engine === 'chromium') {
      const member = director.locator('.admin-person-card').filter({ hasText: users[3].email });
      await member.getByRole('button', { name: 'Editar acceso', exact: true }).click();
      await member.getByRole('combobox').selectOption('psychiatrist');
      const saved = director.waitForResponse(r => r.request().method() === 'POST' && new URL(r.url()).pathname === '/admin/usuarios');
      await member.getByRole('button', { name: 'Guardar', exact: true }).click(); await saved;
      await director.waitForURL(/success=updated/);
      assert.equal(await sql(`select role from public.admin_users where user_id='${users[3].id}';`), 'psychiatrist');
      assert.equal(await sql(`select 'care.medical.create'=any(capabilities)from public.care_staff_capabilities where user_id='${users[3].id}';`), 't');
      pass('real role form persists psychiatrist and its capabilities');
      await sql(`update public.admin_users set role='recovery_coach'where user_id='${users[3].id}';`);
    }
    // Exercise modal focus, dismissal, small screens and the existing real save actions.
    await director.goto(base + '/admin/pacientes');
    const openPatient = director.getByRole('button', { name: 'Nuevo paciente', exact: true });
    for (const width of [320, 375, 768, 1440]) {
      await director.setViewportSize({ width, height: 780 });
      await openPatient.click();
      const modal = director.getByRole('dialog', { name: 'Nuevo paciente', exact: true });
      await modal.waitFor();
      await modal.evaluate(async d => { await Promise.all(d.getAnimations({subtree:true}).filter(a => a.effect?.getTiming().iterations !== Infinity).map(a => a.finished.catch(() => {}))); });
      await director.screenshot({ path: `${out}/${engine}-patient-modal-${width}.png` });
      assert.equal(await modal.evaluate(d => { const r=d.getBoundingClientRect(); return r.left>=0 && r.right<=innerWidth+1 && r.top>=0 && r.bottom<=innerHeight+1; }), true, `${engine} ${width}: modal geometry`);
      assert.equal(await modal.evaluate(d => d.contains(document.activeElement)), true, `${engine} ${width}: focus inside modal`);
      for (let tab = 0; tab < 12; tab++) { await director.keyboard.press('Tab'); assert.equal(await modal.evaluate(d => d.contains(document.activeElement)), true, `${engine} ${width}: focus inside modal`); assert.equal(await modal.evaluate(d => {const b=d.querySelector('.admin-dialog-body'),a=document.activeElement;if(!b.contains(a))return true;const ar=a.getBoundingClientRect(),br=b.getBoundingClientRect();return ar.top>=br.top-1&&ar.bottom<=br.bottom+1;}),true,`${engine} ${width}: focused control is visible`); }
      for (let tab = 0; tab < 3; tab++) { await director.keyboard.press('Shift+Tab'); assert.equal(await modal.evaluate(d => d.contains(document.activeElement)), true, `${engine} ${width}: reverse focus inside modal`); }
      await director.screenshot({ path: `${out}/${engine}-patient-modal-${width}.png` });
      await director.keyboard.press('Escape');
      await modal.waitFor({ state: 'hidden' });
      assert.equal(await openPatient.evaluate(b => b === document.activeElement), true);
      pass(`${engine}: modal fits ${width}px, traps focus and restores trigger`);
    }
    await openPatient.click();
    const modal = director.getByRole('dialog', { name: 'Nuevo paciente', exact: true });
    await modal.getByLabel('Nombre del paciente', { exact: true }).fill('Paciente modal QA');
    await director.keyboard.press('Escape');
    await modal.getByText('Tienes cambios sin guardar.', { exact: true }).waitFor();
    await modal.getByRole('button', { name: 'Seguir editando', exact: true }).click();
    assert.equal(await modal.getByLabel('Nombre del paciente', { exact: true }).inputValue(), 'Paciente modal QA');
    pass(engine + ': dismissing a dirty modal preserves the form');
    await modal.getByLabel('Nombre del paciente', { exact: true }).fill('   ');
    const neutralEmail = `director-qa-${token}-${engine}-modal@example.test`;
    await modal.getByLabel('Correo del paciente', { exact: true }).fill(neutralEmail);
    await modal.getByRole('button', { name: 'Guardar sin enviar', exact: true }).click();
    await modal.getByRole('alert').waitFor();
    assert.equal(await modal.getByLabel('Correo del paciente', { exact: true }).inputValue(), neutralEmail);
    assert.equal(await modal.getByLabel('Nombre del paciente', { exact: true }).inputValue(), '   ');
    pass(engine + ': server validation retains modal values and error');
    await modal.getByLabel('Nombre del paciente', { exact: true }).fill('Paciente modal QA');
    await modal.getByRole('button', { name: 'Guardar sin enviar', exact: true }).click();
    await director.waitForURL(/resultado=paciente-guardado/);
    const createdId = await sql(`select id from public.patient_profiles where email='${neutralEmail}';`);
    assert.match(createdId, /^[0-9a-f-]{36}$/); patients.push(createdId);
    await director.getByText('Paciente guardado. No se envió ningún correo.', { exact: false }).waitFor();
    assert.equal(await director.getByRole('dialog').count(), 0);
    pass(engine + ': existing patient save action works from modal without email');
    await director.getByRole('button', { name: 'Nuevo paciente', exact: true }).click();
    const repeatModal = director.getByRole('dialog', { name: 'Nuevo paciente', exact: true });
    await repeatModal.getByLabel('Nombre del paciente', { exact: true }).fill('Paciente modal QA actualizado');
    await repeatModal.getByLabel('Correo del paciente', { exact: true }).fill(neutralEmail);
    await repeatModal.getByRole('button', { name: 'Guardar sin enviar', exact: true }).click();
    await repeatModal.waitFor({ state: 'hidden' });
    assert.equal(await sql(`select display_name from public.patient_profiles where id='${createdId}';`), 'Paciente modal QA actualizado');
    pass(engine + ': repeated save to the same success URL closes the modal');

    await director.goto(base + '/admin/seguimiento/equipo');
    await director.getByRole('button', { name: 'Nueva asignación', exact: true }).click();
    const assignmentModal = director.getByRole('dialog', { name: 'Asignar un profesional', exact: true });
    await assignmentModal.getByLabel('Paciente', { exact: true }).selectOption(patients[1]);
    await assignmentModal.getByLabel('Profesional', { exact: true }).selectOption(users[3].id);
    await assignmentModal.getByLabel('Función en esta asignación', { exact: true }).selectOption('recovery');
    let releasePost, markHeld;
    const postGate = new Promise(resolve => { releasePost = resolve; });
    const requestHeld = new Promise(resolve => { markHeld = resolve; });
    const holdPost = async route => { if (route.request().method() === 'POST') { markHeld(); await postGate; } await route.continue(); };
    await director.route('**/admin/seguimiento/equipo*', holdPost);
    await assignmentModal.getByRole('button', { name: 'Crear asignación', exact: true }).click();
    await requestHeld;
    await director.waitForFunction(() => document.querySelector('dialog[open] form[aria-busy="true"]'));
    await assignmentModal.getByRole('button', { name: 'Cerrar formulario', exact: true }).click();
    assert.equal(await assignmentModal.isVisible(), true);
    await director.keyboard.press('Escape'); assert.equal(await assignmentModal.isVisible(), true);
    releasePost();
    await assignmentModal.waitFor({ state: 'hidden' });
    await director.unroute('**/admin/seguimiento/equipo*', holdPost);
    pass(engine + ': saving modal cannot be dismissed by close or Escape');
    assert.equal(await sql(`select count(*)from public.care_assignments where patient_id='${patients[1]}'and professional_id='${users[3].id}'and ends_at is null;`), '1');
    await sql(`delete from public.care_assignments where patient_id='${patients[1]}'and professional_id='${users[3].id}';`);
    pass(engine + ': existing assignment action saves from modal and success closes it');
    await director.goto(base + '/admin/grupos-terapeuticos');
    const newGroup = director.getByRole('button', { name: 'Nuevo grupo', exact: true });
    assert.equal(await newGroup.evaluate(button => Boolean(button.closest('.admin-page-header'))), true);
    for (const width of [320, 375, 768, 1440]) {
      await director.setViewportSize({ width, height: 780 });
      const originalURL = director.url();
      await newGroup.click();
      const dialog = director.getByRole('dialog', { name: 'Crear grupo', exact: true });
      await dialog.waitFor();
      await dialog.evaluate(async element => { await Promise.all(element.getAnimations({ subtree: true }).filter(a => a.effect?.getTiming().iterations !== Infinity).map(a => a.finished.catch(() => {}))); });
      assert.equal(director.url(), originalURL, 'New group opens without navigation');
      assert.equal(await dialog.evaluate(element => { const r = element.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth + 1 && r.top >= 0 && r.bottom <= innerHeight + 1; }), true);
      for (let tab = 0; tab < 8; tab++) { await director.keyboard.press('Tab'); assert.equal(await dialog.evaluate(element => element.contains(document.activeElement)), true); }
      await director.screenshot({ path: `${out}/${engine}-group-modal-${width}.png` });
      await dialog.getByRole('button', { name: 'Cancelar', exact: true }).click();
      await dialog.waitFor({ state: 'hidden' });
      assert.equal(await newGroup.evaluate(button => button === document.activeElement), true);
      pass(`${engine}: new group modal ${width}px stays on page, fits and cancels with focus restored`);
    }
    await newGroup.click();
    const dirtyGroup = director.getByRole('dialog', { name: 'Crear grupo', exact: true });
    await dirtyGroup.getByLabel('Nombre', { exact: true }).fill('Borrador de interfaz');
    await dirtyGroup.getByRole('button', { name: 'Cancelar', exact: true }).click();
    await dirtyGroup.getByText('Tienes cambios sin guardar.', { exact: true }).waitFor();
    await dirtyGroup.getByRole('button', { name: 'Seguir editando', exact: true }).click();
    assert.equal(await dirtyGroup.getByLabel('Nombre', { exact: true }).inputValue(), 'Borrador de interfaz');
    await dirtyGroup.getByRole('button', { name: 'Cancelar', exact: true }).click();
    await dirtyGroup.getByRole('button', { name: 'Cerrar sin guardar', exact: true }).click();
    await dirtyGroup.waitFor({ state: 'hidden' });
    assert.equal(director.url().includes('/admin/grupos-terapeuticos'), true);
    pass(engine + ': group Cancel uses the dirty guard and preserves fields');
    if (engine === 'chromium') {
      await director.goto(base + '/admin/grupos-terapeuticos');
      await director.getByRole('button', { name: 'Nuevo grupo', exact: true }).click();
      const groupModal = director.getByRole('dialog', { name: 'Crear grupo', exact: true });
      await groupModal.getByLabel('Nombre', { exact: true }).fill(`Grupo interfaz QA ${token}`);
      await groupModal.getByRole('button', { name: 'Crear grupo', exact: true }).click();
      await groupModal.waitFor({ state: 'hidden' });
      await director.waitForURL(/guardado=1/);
      const groupId = await sql(`select id from public.therapy_groups where name='Grupo interfaz QA ${token}';`);
      assert.match(groupId, /^[0-9a-f-]{36}$/);
      const groupCard = director.locator('.admin-panel').filter({ has: director.getByRole('heading', { name: `Grupo interfaz QA ${token}`, exact: true }) });
      await groupCard.getByRole('button', { name: 'Agregar paciente', exact: true }).click();
      const membership = director.getByRole('dialog', { name: `Agregar paciente · Grupo interfaz QA ${token}`, exact: true });
      await membership.waitFor();
      await membership.locator('select[name=patient_id]').selectOption(patients[0]);
      await membership.getByRole('button', { name: 'Agregar / reactivar membresía', exact: true }).click();
      await membership.waitFor({ state: 'hidden' });
      assert.equal(await sql(`select count(*)from public.therapy_group_memberships where group_id='${groupId}'and patient_id='${patients[0]}'and is_active;`), '1');
      pass('group and membership save through existing actions in modals');
      for (const width of [320, 375, 768, 1440]) await screen(director, '/admin/grupos-terapeuticos?guardado=1', width, engine, 'groups-populated');
      await groupCard.getByRole('button', { name: 'Editar grupo', exact: true }).click();
      const editGroup = director.getByRole('dialog', { name: `Editar grupo · Grupo interfaz QA ${token}`, exact: true });
      await editGroup.getByLabel('Descripción', { exact: true }).fill('Descripción breve actualizada desde el modal');
      await editGroup.getByRole('button', { name: 'Guardar grupo', exact: true }).click();
      await editGroup.waitFor({ state: 'hidden' });
      assert.equal(await sql(`select description from public.therapy_groups where id='${groupId}';`), 'Descripción breve actualizada desde el modal');
      pass('group editing preserves identity and saves without leaving the list');
      await director.goto(base + '/admin/biblioteca');
      await director.getByRole('button', { name: 'Nueva área', exact: true }).click();
      const areaModal = director.getByRole('dialog', { name: 'Nueva área terapéutica', exact: true });
      await areaModal.getByLabel('Nueva área', { exact: true }).fill(`Área interfaz QA ${token}`);
      await areaModal.getByRole('button', { name: 'Crear área', exact: true }).click();
      await areaModal.waitFor({ state: 'hidden' });
      await director.waitForURL(/guardado=1/);
      const areaId = await sql(`select id from public.therapy_areas where name='Área interfaz QA ${token}';`);
      assert.match(areaId, /^[0-9a-f-]{36}$/);
      await director.getByRole('button', { name: 'Nueva carpeta', exact: true }).click();
      const folderModal = director.getByRole('dialog', { name: 'Nueva carpeta', exact: true });
      await folderModal.getByLabel('Nombre', { exact: true }).fill(`Carpeta interfaz QA ${token}`);
      await folderModal.locator('select[name=area_id]').selectOption(areaId);
      await folderModal.getByRole('button', { name: 'Crear carpeta', exact: true }).click();
      await folderModal.waitFor({ state: 'hidden' });
      assert.equal(await sql(`select count(*)from public.patient_library_folders where name='Carpeta interfaz QA ${token}'and area_id='${areaId}';`), '1');
      pass('area and folder save through existing actions in modals');
      for (const width of [320, 375, 768, 1440]) await screen(director, '/admin/biblioteca?guardado=1', width, engine, 'library-populated');
      await director.goto(base + '/admin/grupos-terapeuticos');
      await groupCard.getByRole('button', { name: 'Retirar del grupo', exact: true }).click();
      await director.waitForURL(/guardado=1/);
      assert.equal(await sql(`select is_active from public.therapy_group_memberships where group_id='${groupId}'and patient_id='${patients[0]}';`), 'f');
      pass('group membership removal uses the existing action and persists');
    } else {
      for (const width of [320, 375, 768, 1440]) {
        await screen(director, '/admin/grupos-terapeuticos', width, engine, 'groups-populated');
        await screen(director, '/admin/biblioteca', width, engine, 'library-populated');
      }
    }
    await director.emulateMedia({ reducedMotion: 'reduce' });
    await director.goto(base + '/admin');
    await director.getByRole('heading', { name: 'Panel del centro', exact: true }).waitFor();
    await director.waitForFunction(() => { const header=document.querySelector('.admin-page-header'); return matchMedia('(prefers-reduced-motion: reduce)').matches && header && getComputedStyle(header).animationName === 'none'; });
    assert.equal(await director.locator('.admin-page-header').evaluate(e => getComputedStyle(e).animationName), 'none');
    await director.emulateMedia({ reducedMotion: 'no-preference' });
    pass(engine + ': reduced motion respected');
    for (let i = 1; i < 4; i++) {
      const context = await browser.newContext(), page = await login(context, users[i]);
      pass(engine + ': ' + users[i].role + ' signs in to professional panel');
      for (const width of [375, 1440]) { await screen(page, '/admin', width, engine, users[i].role); await screen(page, '/admin/seguimiento/mi-trabajo', width, engine, users[i].role + '-agenda'); }
      pass(engine + ': ' + users[i].role + ' agenda works with role defaults');
      await page.goto(base + '/admin/seguimiento');
      await page.getByText('Paciente A roles QA', { exact: true }).first().waitFor();
      assert.equal(await page.getByText('Paciente B roles QA', { exact: true }).count(), 0);
      const denied = await page.goto(base + `/admin/seguimiento/pacientes/${patients[1]}`);
      assert.equal(denied.status(), 404);
      assert.equal((await page.goto(base + '/admin/usuarios')).status(), 403);
      assert.equal((await page.goto(base + '/admin/contenidos')).status(), 403);
      pass(engine + ': ' + users[i].role + ' assigned scope and CMS/user denials');
      await context.close();
    }
    await directorContext.close(); await browser.close(); browser = null;
  }
  assert.deepEqual(pageErrors, []);
  pass('no browser application errors');
} catch (error) { failure = error; console.error(error.stack); }
finally {
  await browser?.close(); server?.kill();
  let cleaned = false;
  try {
    const ids = users.map(u => `'${u.id}'`).join(',') || 'null';
    await sql(`begin;
      delete from public.admin_audit_log where actor_id in (${ids});
      delete from private.care_audit where actor_id in (${ids});
      delete from public.care_assignments where patient_id in (${patients.map(id => `'${id}'`).join(',')});
      delete from public.therapy_group_memberships where group_id in (select id from public.therapy_groups where name='Grupo interfaz QA ${token}');
      delete from public.therapy_groups where name='Grupo interfaz QA ${token}';
      delete from public.patient_library_folders where name='Carpeta interfaz QA ${token}';
      delete from public.therapy_areas where name='Área interfaz QA ${token}';
      delete from public.patient_profiles where id in (${patients.map(id => `'${id}'`).join(',')}) or email like 'director-qa-${token}-%@example.test';
      delete from public.care_staff_capabilities where user_id in (${ids});
      alter table public.admin_users disable trigger protect_last_active_superadmin;
      delete from auth.users where id in (${ids});
      alter table public.admin_users enable trigger protect_last_active_superadmin;
      commit;`);
    assert.equal(await sql(`select count(*)from auth.users where email like 'director-qa-${token}-%@example.test';`), '0');
    assert.equal(await sql(`select count(*)from public.patient_profiles where email like 'director-qa-${token}-%@example.test';`), '0');
    assert.equal(await sql("select tgenabled from pg_trigger where tgname='protect_last_active_superadmin'and tgrelid='public.admin_users'::regclass;"), 'O');
    cleaned = true; pass('synthetic users and patients removed; protection restored');
  } catch (error) { failure ??= error; console.error('Cleanup: ' + error.message); }
  await writeFile(out + '/results.json', JSON.stringify({ status: failure ? 'FAIL' : 'PASS', at: new Date().toISOString(), mode: process.env.CARE_DIALOG_QA_ONLY === 'true' ? 'dialogs' : 'full', checks, responsive, pageErrors, failure: failure?.message, cleaned }, null, 2));
  await writeFile(out + '/server.log', serverLog);
}
if (failure) process.exitCode = 1;
else console.log(`Direction/professional QA: ${checks.length} functional and ${responsive.length} responsive PASS.`);
