const STRAPI_URL = 'http://127.0.0.1:1337';
const ADMIN_EMAIL = 'acnwa1234@gmail.com';
const ADMIN_PASSWORD = 'Anayolico_1992....';

// Mock Data
const MOCK_EXPERIENCES = [
  {
    period: '2024 - Present',
    role: 'Senior Frontend Developer',
    description: 'Leading the development of highly interactive web applications using React and Next.js. Architecting scalable frontend systems, mentoring junior developers, and establishing best practices for state management and component design.',
  },
  {
    period: '2022 - 2024',
    role: 'Mobile App Developer',
    description: 'Designed, engineered, and maintained cross-platform mobile applications. Optimized performance, implemented complex UI/UX designs, and guaranteed seamless user experiences across devices.',
  },
  {
    period: '2020 - 2022',
    role: 'UI/UX Designer',
    description: 'Spearheaded the redesign of core product interfaces, resulting in a 40% increase in user retention. Conducted user research, created wireframes, and delivered high-fidelity prototypes using Figma.',
  }
];

const MOCK_STRENGTHS = [
  { title: 'Frontend Architecture', description: 'Structuring scalable React apps with clean code principles.' },
  { title: 'Backend Architectures', description: 'Formulating scalable data APIs, handling secure user authorization, and orchestrating mobile integrations with Node and React Native.' },
  { title: 'UI/UX Design', description: 'Translating complex requirements into intuitive, accessible interfaces.' },
  { title: 'Performance Optimization', description: 'Enhancing Core Web Vitals and ensuring fluid 60fps animations.' }
];

const MOCK_SKILLS = [
  {name:'HTML5',level:90, category: 'Frontend'},{name:'CSS3 & Sass',level:88, category: 'Frontend'},{name:'JavaScript (ES6+)',level:85, category: 'Frontend'},{name:'React.js',level:82, category: 'Frontend'},
  {name:'React Native',level:75, category: 'Backend'},{name:'Node.js',level:60, category: 'Backend'}, {name:'MongoDB',level:70, category: 'Backend'},
  {name:'Git & GitHub',level:82, category: 'Tools'}
];

const MOCK_PROJECTS = [
  {
    title: 'Construction Company Website',
    desc: 'A modern, responsive website built for a Nigerian construction company, showcasing residential and commercial projects, service offerings, and client engagement features.',
    tech: ['React.js','Node.js', 'Tailwind'],
    demoLink: 'https://construction-website-eosin-alpha.vercel.app/',
    codeLink: 'https://github.com/anayolico/construction-website'
  },
  {
    title: 'AI Calculator Web App',
    desc: 'Interactive calculator powered by AI-assisted suggestions and advanced UX patterns.',
    tech: ['Next.js','AI', 'React'],
    demoLink: 'https://my-ai-calculator.vercel.app/',
    codeLink: 'https://github.com/anayolico/my-ai-calculator'
  },
  {
    title: 'Task Management Dashboard',
    desc: 'Full-featured dashboard with real-time task tracking, filtering, and user collaboration features.',
    tech: ['React','Node.js','MongoDB'],
    demoLink: 'https://task-dashboard-frontend-two.vercel.app',
    codeLink: 'https://github.com/anayolico/task-dashboard-backend'
  },
  {
    title: 'Weather Forecast App',
    desc: 'Real-time weather application with location search, forecasts, and animated weather visualizations.',
    tech: ['React','API','CSS Animations'],
    demoLink: 'https://weather-app-xi-tawny-68.vercel.app',
    codeLink: 'https://github.com/anayolico/weather-app'
  }
];

async function getAdminJWT() {
  const res = await fetch(`${STRAPI_URL}/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  });
  if (!res.ok) throw new Error(`Admin login failed (${res.status}). Ensure you have created this admin account in your new Neon DB first!`);
  const json = await res.json();
  return json.data.token;
}

async function createAndPublish(jwt, uid, data) {
  // 1. Create Draft
  let res = await fetch(`${STRAPI_URL}/content-manager/collection-types/${uid}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt}` },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Create failed for ${uid}: ${await res.text()}`);
  const json = await res.json();
  const documentId = json.documentId;
  
  // 2. Publish Document
  res = await fetch(`${STRAPI_URL}/content-manager/collection-types/${uid}/${documentId}/actions/publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt}` },
    body: JSON.stringify({}),
  });
  if (!res.ok) throw new Error(`Publish failed for ${uid}: ${await res.text()}`);
  console.log(`Created and published ${uid}: ${documentId}`);
}

async function main() {
  console.log('Logging into Strapi...');
  const jwt = await getAdminJWT();

  console.log('Seeding Experiences...');
  for (const exp of MOCK_EXPERIENCES) {
    await createAndPublish(jwt, 'api::experience.experience', exp);
  }

  console.log('Seeding Strengths...');
  for (const str of MOCK_STRENGTHS) {
    await createAndPublish(jwt, 'api::strength.strength', str);
  }

  console.log('Seeding Skills...');
  for (const sk of MOCK_SKILLS) {
    await createAndPublish(jwt, 'api::skill.skill', sk);
  }

  console.log('Seeding Projects...');
  for (const proj of MOCK_PROJECTS) {
    await createAndPublish(jwt, 'api::project.project', proj);
  }

  console.log('All mock data successfully synced to your Neon DB!');
}

main().catch(console.error);
