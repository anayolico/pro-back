/**
 * Publish all draft entries in Strapi v5.
 * Usage: node publishAll.js
 */

const STRAPI_URL = 'http://127.0.0.1:1337';
const ADMIN_EMAIL = 'acnwa1234@gmail.com';
const ADMIN_PASSWORD = 'Anayolico_1992....';

async function getAdminJWT() {
  const res = await fetch(`${STRAPI_URL}/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  });
  if (!res.ok) throw new Error(`Admin login failed (${res.status})`);
  const json = await res.json();
  return json.data.token;
}

async function getEntries(jwt, uid) {
  const url = `${STRAPI_URL}/content-manager/collection-types/${uid}?page=1&pageSize=100&status=draft`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${jwt}` },
  });
  if (!res.ok) return [];
  const json = await res.json();
  return json.results || [];
}

async function publishEntry(jwt, uid, documentId) {
  const url = `${STRAPI_URL}/content-manager/collection-types/${uid}/${documentId}/actions/publish`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${jwt}`,
    },
    body: JSON.stringify({}),
  });
  if (!res.ok) {
    const body = await res.text();
    console.error(`  ✗ Publish failed for ${uid} doc ${documentId}: ${res.status} ${body}`);
    return false;
  }
  return true;
}

async function main() {
  console.log('🔐 Authenticating...');
  const jwt = await getAdminJWT();
  console.log('✅ Authenticated!\n');

  const contentTypes = [
    { uid: 'api::skill.skill', label: 'Skill' },
    { uid: 'api::project.project', label: 'Project' },
    { uid: 'api::experience.experience', label: 'Experience' },
    { uid: 'api::strength.strength', label: 'Strength' },
  ];

  for (const ct of contentTypes) {
    console.log(`📢 Publishing ${ct.label}s...`);
    const entries = await getEntries(jwt, ct.uid);
    if (entries.length === 0) {
      console.log(`  ✔ No drafts found (all already published).`);
      continue;
    }
    for (const entry of entries) {
      const docId = entry.documentId;
      const name = entry.title || entry.name || entry.role || docId;
      const ok = await publishEntry(jwt, ct.uid, docId);
      if (ok) {
        console.log(`  ✔ Published: ${name}`);
      }
    }
  }

  console.log('\n🎉 All entries published!');
}

main().catch((err) => {
  console.error('❌ Failed:', err.message);
  process.exit(1);
});
