import fs from 'node:fs/promises';
import { createClient } from '@supabase/supabase-js';

const envFile = await fs.readFile(new URL('../.env.local', import.meta.url), 'utf8').catch(() => '');
const fileEnv = Object.fromEntries(envFile.split(/\r?\n/).filter(Boolean).map((line) => {
  const index = line.indexOf('=');
  return index === -1 ? [line, ''] : [line.slice(0, index), line.slice(index + 1).replace(/^"|"$/g, '')];
}));
const env = { ...fileEnv, ...process.env };
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const password = env.E2E_PASSWORD;
const accounts = {
  patientA: env.E2E_PATIENT_A_EMAIL || 'phase20.patient.a@example.com',
  patientB: env.E2E_PATIENT_B_EMAIL || 'phase20.patient.b@example.com',
  doctor: env.E2E_DOCTOR_EMAIL || 'phase20.doctor@example.com',
};
if (!url || !key || !password) {
  throw new Error('Set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, and E2E_PASSWORD before running Phase 20.');
}

const patientAId = env.E2E_PATIENT_A_USER_ID || 'd39cea30-f435-49e6-84e3-b7c36a98591d';
const patientBId = env.E2E_PATIENT_B_USER_ID || '7d0617eb-b814-4e03-837c-516594aa3a93';
const doctorUserId = env.E2E_DOCTOR_USER_ID || '90239a0d-424b-4d1d-9cb9-1b7a07050811';
const clients = {};
const results = [];

function assert(name, condition, detail = '') {
  results.push({ name, passed: Boolean(condition), detail });
  if (!condition) throw new Error(`${name}${detail ? ` — ${detail}` : ''}`);
}

async function login(label, email) {
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  assert(`${label} login`, Boolean(data.session && data.user) && !error, error?.message || 'No session returned');
  clients[label] = client;
  return client;
}

async function rows(client, table, select = '*', filters = {}) {
  let query = client.from(table).select(select);
  for (const [column, value] of Object.entries(filters)) query = query.eq(column, value);
  const { data, error } = await query;
  assert(`${table} query`, !error, error?.message || 'query failed');
  return data ?? [];
}

const a = await login('patientA', accounts.patientA);
const b = await login('patientB', accounts.patientB);
const doctor = await login('doctor', accounts.doctor);

const aPatients = await rows(a, 'patients', 'id,user_id,city', { user_id: patientAId });
const bPatients = await rows(b, 'patients', 'id,user_id,city', { user_id: patientBId });
assert('patient A sees exactly own profile', aPatients.length === 1 && aPatients[0].user_id === patientAId);
assert('patient B sees exactly own profile', bPatients.length === 1 && bPatients[0].user_id === patientBId);

const aCrossRead = await rows(a, 'patients', 'id,user_id', { user_id: patientBId });
const bCrossRead = await rows(b, 'patients', 'id,user_id', { user_id: patientAId });
assert('patient A cannot read patient B profile', aCrossRead.length === 0);
assert('patient B cannot read patient A profile', bCrossRead.length === 0);

const aCrossUpdate = await a.from('patients').update({ city: 'MUTATION_MUST_NOT_APPLY' }).eq('user_id', patientBId).select('id');
assert('patient A cannot update patient B profile', !aCrossUpdate.error && (aCrossUpdate.data ?? []).length === 0, aCrossUpdate.error?.message);
const bCrossUpdate = await b.from('patients').update({ city: 'MUTATION_MUST_NOT_APPLY' }).eq('user_id', patientAId).select('id');
assert('patient B cannot update patient A profile', !bCrossUpdate.error && (bCrossUpdate.data ?? []).length === 0, bCrossUpdate.error?.message);

const ownUpdate = await a.from('patients').update({ city: 'Phase20 A Verified City' }).eq('user_id', patientAId).select('id,city').single();
assert('patient A can update own profile', !ownUpdate.error && ownUpdate.data?.city === 'Phase20 A Verified City', ownUpdate.error?.message);

const doctorBefore = await rows(doctor, 'patients', 'id,user_id');
assert('doctor cannot read patients without active consent', doctorBefore.length === 0);
const consent = await a.rpc('grant_record_consent', { p_doctor_id: '00000000-0000-0000-0000-000000000000', p_expires_at: null });
assert('invalid consent target is rejected', Boolean(consent.error));
const validDoctor = await doctor.from('doctors').select('id').eq('user_id', doctorUserId).single();
assert('doctor fixture profile is available', !validDoctor.error && Boolean(validDoctor.data?.id), validDoctor.error?.message);
const grant = await a.rpc('grant_record_consent', { p_doctor_id: validDoctor.data.id, p_expires_at: null });
assert('patient A can grant consent to approved doctor', !grant.error && Boolean(grant.data), grant.error?.message);

const doctorAfterGrant = await rows(doctor, 'patients', 'id,user_id');
assert('doctor can read consented patient A', doctorAfterGrant.some((row) => row.user_id === patientAId));
assert('doctor cannot read unconsented patient B', !doctorAfterGrant.some((row) => row.user_id === patientBId));
const doctorB = await rows(doctor, 'patients', 'id,user_id', { user_id: patientBId });
assert('doctor direct cross-patient read of B is denied', doctorB.length === 0);

const revokeId = grant.data.id;
const revoke = await a.rpc('revoke_record_consent', { p_consent_id: revokeId });
assert('patient A can revoke consent', !revoke.error, revoke.error?.message);
const doctorAfterRevoke = await rows(doctor, 'patients', 'id,user_id');
assert('doctor loses patient A access after revocation', doctorAfterRevoke.length === 0);

const conversation = await a.from('ai_conversations').insert({ patient_id: aPatients[0].id, title: 'Phase 20 isolation fixture' }).select('id').single();
assert('patient A can create own AI conversation', !conversation.error && Boolean(conversation.data?.id), conversation.error?.message);
const bConversation = await b.from('ai_conversations').select('id').eq('id', conversation.data.id);
assert('patient B cannot read patient A AI conversation', !bConversation.error && (bConversation.data ?? []).length === 0, bConversation.error?.message);
const bMessage = await b.from('ai_messages').insert({ conversation_id: conversation.data.id, patient_id: aPatients[0].id, role: 'user', content: 'cross-patient write must fail' });
assert('patient B cannot write to patient A AI conversation', Boolean(bMessage.error));
await a.from('ai_conversations').delete().eq('id', conversation.data.id);

console.log(JSON.stringify({ phase: 20, passed: results.length, failed: 0, results }, null, 2));
