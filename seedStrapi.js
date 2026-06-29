/**
 * Seed script: Uploads all static/mock data from the frontend into Strapi.
 * Authenticates via admin API, then creates entries for:
 *   - Skills (frontend, backend, tools)
 *   - Projects (without images — images can be uploaded manually in the admin panel)
 *   - Experiences
 *   - Strengths
 *
 * Usage:  node seedStrapi.js
 */

const STRAPI_URL = 'http://127.0.0.1:1337';
const ADMIN_EMAIL = 'acnwa1234@gmail.com';
const ADMIN_PASSWORD = 'Anayolico_1992....';

// ─── DATA ────────────────────────────────────────────────────────────

const SKILLS = [
  // Frontend
  { name: 'HTML5', level: 90, category: 'Frontend' },
  { name: 'CSS3 & Sass', level: 88, category: 'Frontend' },
  { name: 'JavaScript (ES6+)', level: 85, category: 'Frontend' },
  { name: 'React.js', level: 82, category: 'Frontend' },
  // Backend
  { name: 'Java Core', level: 75, category: 'Backend' },
  { name: 'Node.js', level: 60, category: 'Backend' },
  { name: 'MongoDB', level: 70, category: 'Backend' },
  // Tools
  { name: 'Git & GitHub', level: 82, category: 'Tools' },
];

const PROJECTS = [
  {
    title: 'Construction Company Website',
    desc: 'A modern, responsive website built for a Nigerian construction company, showcasing residential and commercial projects, service offerings, and client engagement features. Optimized for performance, clean UI, and seamless contact integration to strengthen the company\u2019s online presence.',
    description: 'A modern, responsive website built for a Nigerian construction company.',
    tech: ['React.js', 'Node.js', 'Tailwind'],
    demoLink: 'https://construction-website-eosin-alpha.vercel.app/',
    codeLink: 'https://github.com/anayolico/construction-website',
  },
  {
    title: 'AI Calculator Web App',
    desc: 'Interactive calculator powered by AI-assisted suggestions and advanced UX patterns.',
    description: 'Interactive calculator powered by AI-assisted suggestions and advanced UX patterns.',
    tech: ['Next.js', 'AI', 'React'],
    demoLink: 'https://my-ai-calculator.vercel.app/',
    codeLink: 'https://github.com/anayolico/my-ai-calculator',
  },
  {
    title: 'Task Management Dashboard',
    desc: 'Full-featured dashboard with real-time task tracking, filtering, and user collaboration features.',
    description: 'Full-featured dashboard with real-time task tracking, filtering, and user collaboration features.',
    tech: ['React', 'Node.js', 'MongoDB'],
    demoLink: 'https://task-dashboard-frontend-two.vercel.app',
    codeLink: 'https://github.com/anayolico/task-dashboard-backend',
  },
  {
    title: 'Weather Forecast App',
    desc: 'Real-time weather application with location search, forecasts, and animated weather visualizations.',
    description: 'Real-time weather application with location search, forecasts, and animated weather visualizations.',
    tech: ['React', 'API', 'CSS Animations'],
    demoLink: 'https://weather-app-xi-tawny-68.vercel.app',
    codeLink: 'https://github.com/anayolico/weather-app',
  },
];

const EXPERIENCES = [
  {
    period: '2024 - Present',
    role: 'Full Stack Developer',
    description:
      'Building complex, responsive React applications powered by scalable backend technologies. Focus on performance tuning, fluid state transitions, and responsive mobile architecture.',
    dotColor: 'bg-accent-teal',
    textColor: 'text-accent-teal',
  },
  {
    period: '2022 - 2024',
    role: 'Java Backend Developer',
    description:
      'Designed, engineered, and maintained microservices and API gateways using Java. Optimized relational database queries, implemented object-oriented logic, and guaranteed systems availability.',
    dotColor: 'bg-accent-purple',
    textColor: 'text-accent-purple',
  },
  {
    period: '2020 - 2022',
    role: 'Frontend Developer (Freelance)',
    description:
      'Created highly responsive landing pages and custom websites. Partnered closely with international clients to deliver pixel-perfect user interfaces and custom assets.',
    dotColor: 'bg-gray-400 dark:bg-gray-600',
    textColor: 'text-text-muted',
  },
];

const STRENGTHS = [
  {
    title: 'Problem Solving',
    desc: 'Capable of tracing performance bottlenecks, refactoring legacy architecture, and structuring logical processes.',
    dot: 'bg-accent-teal',
  },
  {
    title: 'Performance Optimization',
    desc: 'Focus on minifying client bundles, optimizing image resources, caching API calls, and maintaining 60FPS animations.',
    dot: 'bg-accent-teal',
  },
  {
    title: 'Responsive Design',
    desc: 'Developing fluid and pixel-perfect mobile-first designs matching complex device layouts.',
    dot: 'bg-accent-purple',
  },
  {
    title: 'Effective Collaboration',
    desc: 'Strong partner communicator. Able to clarify user stories, provide visual guides, and coordinate development.',
    dot: 'bg-accent-purple',
  },
];

// ─── HELPERS ─────────────────────────────────────────────────────────

async function getAdminJWT() {
  const res = await fetch(`${STRAPI_URL}/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Admin login failed (${res.status}): ${body}`);
  }
  const json = await res.json();
  return json.data.token;
}

async function createEntry(jwt, pluralApiId, data) {
  const url = `${STRAPI_URL}/content-manager/collection-types/api::${pluralApiId}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${jwt}`,
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const body = await res.text();
    console.error(`  ✗ Failed to create ${pluralApiId} entry: ${res.status} ${body}`);
    return null;
  }
  return await res.json();
}

async function publishEntry(jwt, singularApiId, documentId) {
  const url = `${STRAPI_URL}/content-manager/collection-types/api::${singularApiId}/${documentId}/actions/publish`;
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
    console.error(`  ✗ Failed to publish ${singularApiId} (${documentId}): ${res.status} ${body}`);
    return false;
  }
  return true;
}

async function getExistingEntries(jwt, singularApiId) {
  const url = `${STRAPI_URL}/content-manager/collection-types/api::${singularApiId}?page=1&pageSize=100`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${jwt}` },
  });
  if (!res.ok) return [];
  const json = await res.json();
  return json.results || json.data || [];
}

// ─── MAIN ────────────────────────────────────────────────────────────

async function main() {
  console.log('🔐 Authenticating with Strapi admin...');
  const jwt = await getAdminJWT();
  console.log('✅ Authenticated!\n');

  // ── SKILLS ──
  console.log('📦 Seeding Skills...');
  const existingSkills = await getExistingEntries(jwt, 'skill.skill');
  const existingSkillNames = existingSkills.map((s) => s.name);
  for (const skill of SKILLS) {
    if (existingSkillNames.includes(skill.name)) {
      console.log(`  ⏭  Skill "${skill.name}" already exists, skipping.`);
      continue;
    }
    const created = await createEntry(jwt, 'skill.skill', skill);
    if (created) {
      const docId = created.data?.documentId || created.documentId;
      if (docId) await publishEntry(jwt, 'skill.skill', docId);
      console.log(`  ✔ Created & published skill: ${skill.name}`);
    }
  }

  // ── PROJECTS ──
  console.log('\n📦 Seeding Projects...');
  const existingProjects = await getExistingEntries(jwt, 'project.project');
  const existingProjectTitles = existingProjects.map((p) => p.title);
  for (const project of PROJECTS) {
    if (existingProjectTitles.includes(project.title)) {
      console.log(`  ⏭  Project "${project.title}" already exists, skipping.`);
      continue;
    }
    const created = await createEntry(jwt, 'project.project', project);
    if (created) {
      const docId = created.data?.documentId || created.documentId;
      if (docId) await publishEntry(jwt, 'project.project', docId);
      console.log(`  ✔ Created & published project: ${project.title}`);
    }
  }

  // ── EXPERIENCES ──
  console.log('\n📦 Seeding Experiences...');
  const existingExps = await getExistingEntries(jwt, 'experience.experience');
  const existingExpRoles = existingExps.map((e) => e.role);
  for (const exp of EXPERIENCES) {
    if (existingExpRoles.includes(exp.role)) {
      console.log(`  ⏭  Experience "${exp.role}" already exists, skipping.`);
      continue;
    }
    const created = await createEntry(jwt, 'experience.experience', exp);
    if (created) {
      const docId = created.data?.documentId || created.documentId;
      if (docId) await publishEntry(jwt, 'experience.experience', docId);
      console.log(`  ✔ Created & published experience: ${exp.role}`);
    }
  }

  // ── STRENGTHS ──
  console.log('\n📦 Seeding Strengths...');
  const existingStrs = await getExistingEntries(jwt, 'strength.strength');
  const existingStrTitles = existingStrs.map((s) => s.title);
  for (const str of STRENGTHS) {
    if (existingStrTitles.includes(str.title)) {
      console.log(`  ⏭  Strength "${str.title}" already exists, skipping.`);
      continue;
    }
    const created = await createEntry(jwt, 'strength.strength', str);
    if (created) {
      const docId = created.data?.documentId || created.documentId;
      if (docId) await publishEntry(jwt, 'strength.strength', docId);
      console.log(`  ✔ Created & published strength: ${str.title}`);
    }
  }

  console.log('\n🎉 Seeding complete!');
  console.log('💡 Note: Project images need to be uploaded manually via the Strapi admin panel at http://localhost:1337/admin');
}

main().catch((err) => {
  console.error('❌ Seed script failed:', err.message);
  process.exit(1);
});
