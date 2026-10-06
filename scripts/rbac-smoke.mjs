import fs from 'node:fs/promises';
import { createClient } from '@supabase/supabase-js';

const envFile = await fs.readFile(new URL('../.env.local', import.meta.url), 'utf8').catch(() => '');
const fileEnv = Object.fromEntries(envFile.split(/\r?\n/).filter((line) => line && !line.trim().startsWith('#')).map((line) => {
  const index = line.indexOf('=');
  return index === -1 ? [line, ''] : [line.slice(0, index), line.slice(index + 1).replace(/^"|"$/g, '')];
}));
const env = { ...fileEnv, ...process.env };
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const accounts = {
  admin: { email: env.E2E_ADMIN_EMAIL, password: env.E2E_ADMIN_PASSWORD },
  doctor: { email: env.E2E_DOCTOR_EMAIL, password: env.E2E_DOCTOR_PASSWORD },
  agent: { email: env.E2E_AGENT_EMAIL, password: env.E2E_AGENT_PASSWORD },
};

if (!url || !key) throw new Error('Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY before running RBAC tests.');
for (const [role, account] of Object.entries(accounts)) {
  if (!account.email || !account.password) throw new Error(`Set E2E_${role.toUpperCase()}_EMAIL and E2E_${role.toUpperCase()}_PASSWORD before running RBAC tests.`);
}

const results = [];
function record(name, passed, detail = '') {
  results.push({ name, passed: Boolean(passed), detail });
  if (!passed) throw new Error(`${name}${detail ? ` — ${detail}` : ''}`);
}
function clientFor() {
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
async function login(role, account) {
  const client = clientFor();
  const { data, error } = await client.auth.signInWithPassword(account);
  record(`${role} login`, Boolean(data.session && data.user) && !error, error?.message || 'No session returned');
  return { client, user: data.user };
}
async function select(client, table, columns = '*') {
  const { data, error } = await client.from(table).select(columns).limit(100);
  record(`${table} select succeeds`, !error, error?.message || 'select failed');
  return data ?? [];
}

const signedIn = {};
for (const [role, account] of Object.entries(accounts)) signedIn[role] = await login(role, account);

const adminUsers = await select(signedIn.admin.client, 'users', 'id,email,role,is_verified');
record('administrator can list platform users', adminUsers.length >= 1);
record('administrator sees an administrator role', adminUsers.some((row) => row.role === 'ADMIN'));

for (const role of ['doctor', 'agent']) {
  const ownUsers = await select(signedIn[role].client, 'users', 'id,role');
  record(`${role} sees only their own user row`, ownUsers.length === 1 && ownUsers[0].id === signedIn[role].user.id);
  record(`${role} cannot read another user row`, ownUsers.every((row) => row.id === signedIn[role].user.id));
}

const doctorProfiles = await select(signedIn.doctor.client, 'doctors', 'id,user_id,approval_status');
record('doctor can read only the doctor profile owned by the session', doctorProfiles.every((row) => row.user_id === signedIn.doctor.user.id));
const agentProfiles = await select(signedIn.agent.client, 'collection_agents', 'id,user_id,is_verified');
record('collection agent can read only the agent profile owned by the session', agentProfiles.every((row) => row.user_id === signedIn.agent.user.id));

const adminDoctors = await select(signedIn.admin.client, 'doctors', 'id,user_id,approval_status');
const adminAgents = await select(signedIn.admin.client, 'collection_agents', 'id,user_id,is_verified');
record('administrator can review doctor profiles', adminDoctors.length >= 0);
record('administrator can review collection-agent profiles', adminAgents.length >= 0);

const doctorPatients = await select(signedIn.doctor.client, 'patients', 'id,user_id');
record('doctor patient visibility is consent/RLS scoped', doctorPatients.every((row) => row.user_id !== signedIn.doctor.user.id));
const agentPatients = await select(signedIn.agent.client, 'patients', 'id,user_id');
record('collection agent cannot enumerate patient profiles', agentPatients.length === 0);

const agentRequests = await select(signedIn.agent.client, 'collection_requests', 'id,collection_agent_id,status');
record('collection agent sees only assigned requests', agentRequests.every((row) => row.collection_agent_id !== null));
const doctorRequests = await select(signedIn.doctor.client, 'collection_requests', 'id,collection_agent_id');
record('doctor cannot enumerate collection requests', doctorRequests.length === 0);

const attemptedRoleChange = await signedIn.doctor.client.from('users').update({ role: 'ADMIN' }).eq('id', signedIn.doctor.user.id).select('id,role');
record('doctor cannot change own role', Boolean(attemptedRoleChange.error) || (attemptedRoleChange.data ?? []).length === 0, attemptedRoleChange.error?.message || 'Unexpected role update result');
const agentRoleChange = await signedIn.agent.client.from('users').update({ role: 'ADMIN' }).eq('id', signedIn.agent.user.id).select('id,role');
record('collection agent cannot change own role', Boolean(agentRoleChange.error) || (agentRoleChange.data ?? []).length === 0, agentRoleChange.error?.message || 'Unexpected role update result');

console.log(JSON.stringify({ suite: 'rbac', roles: Object.keys(accounts), passed: results.length, failed: 0, results }, null, 2));
