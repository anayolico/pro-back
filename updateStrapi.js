/**
 * Script to replace Java references with Mobile App Developer in Strapi
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
  const res = await fetch(`${STRAPI_URL}/content-manager/collection-types/${uid}?page=1&pageSize=100`, {
    headers: { Authorization: `Bearer ${jwt}` },
  });
  const json = await res.json();
  return json.results || [];
}

async function updateEntry(jwt, uid, documentId, data) {
  const res = await fetch(`${STRAPI_URL}/content-manager/collection-types/${uid}/${documentId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${jwt}`,
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) console.error(`Failed to update ${documentId}`, await res.text());
  return res.ok;
}

async function publishEntry(jwt, uid, documentId) {
  await fetch(`${STRAPI_URL}/content-manager/collection-types/${uid}/${documentId}/actions/publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt}` },
    body: JSON.stringify({}),
  });
}

async function main() {
  const jwt = await getAdminJWT();

  // 1. Update Experiences
  const exps = await getEntries(jwt, 'api::experience.experience');
  for (const exp of exps) {
    if (exp.role === 'Java Backend Developer') {
      console.log(`Updating experience: ${exp.documentId}`);
      await updateEntry(jwt, 'api::experience.experience', exp.documentId, {
        role: 'Mobile App Developer',
        description: 'Designed, engineered, and maintained cross-platform mobile applications. Optimized performance, implemented complex UI/UX designs, and guaranteed seamless user experiences across devices.'
      });
      await publishEntry(jwt, 'api::experience.experience', exp.documentId);
    }
  }

  // 2. Update Skills
  const skills = await getEntries(jwt, 'api::skill.skill');
  for (const skill of skills) {
    if (skill.name === 'Java Core') {
      console.log(`Updating skill: ${skill.documentId}`);
      await updateEntry(jwt, 'api::skill.skill', skill.documentId, {
        name: 'React Native',
        level: 75,
        category: 'Backend' // keeping the same category to match previous layout or we could change to Mobile
      });
      await publishEntry(jwt, 'api::skill.skill', skill.documentId);
    }
  }

  console.log('Successfully updated Strapi content!');
}

main().catch(console.error);
