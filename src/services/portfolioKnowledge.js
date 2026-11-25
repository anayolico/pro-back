const { getTableData, getCvData } = require('../db');

const CACHE_TTL_MS = 60 * 1000; // 1 minute in-memory cache
let cachedSnapshot = null;
let cachedAt = 0;

function invalidateKnowledgeCache() {
  cachedSnapshot = null;
  cachedAt = 0;
}

function formatTech(tech) {
  if (Array.isArray(tech)) return tech.filter(Boolean).join(', ');
  if (typeof tech === 'string') return tech;
  return '';
}

async function buildPortfolioSnapshot() {
  const now = Date.now();
  if (cachedSnapshot && now - cachedAt < CACHE_TTL_MS) {
    return cachedSnapshot;
  }

  const [
    projects,
    skills,
    experiences,
    strengths,
    sourceCodes,
    freeSourceCodes,
    music,
    cv
  ] = await Promise.all([
    getTableData('projects').catch(() => []),
    getTableData('skills').catch(() => []),
    getTableData('experiences').catch(() => []),
    getTableData('strengths').catch(() => []),
    getTableData('source_codes').catch(() => []),
    getTableData('free_source_codes').catch(() => []),
    getTableData('music').catch(() => []),
    getCvData().catch(() => null)
  ]);

  const projectsText = (projects || []).length
    ? projects
        .map((p, idx) => {
          const featuredTag = p.is_featured || p.isFeatured ? ' [Featured on Homepage]' : '';
          const tech = formatTech(p.tech);
          const demo = p.demoLink || p.demo_link || '';
          const code = p.codeLink || p.code_link || '';
          const desc = p.desc || p.description || '';
          return `${idx + 1}. ${p.title}${featuredTag}\n   Description: ${desc}\n   Tech Stack: ${tech || 'N/A'}\n   Live Demo: ${demo && demo !== '#' ? demo : 'Not listed'}\n   GitHub: ${code && code !== '#' ? code : 'Private / Not listed'}`;
        })
        .join('\n')
    : 'No projects currently listed.';

  const groupedSkills = { Frontend: [], Backend: [], Tools: [], Other: [] };
  (skills || []).forEach((s) => {
    const cat = (s.category || '').toLowerCase();
    if (cat.includes('front')) groupedSkills.Frontend.push(s.name);
    else if (cat.includes('back')) groupedSkills.Backend.push(s.name);
    else if (cat.includes('tool')) groupedSkills.Tools.push(s.name);
    else groupedSkills.Other.push(s.name);
  });

  const skillsText = Object.entries(groupedSkills)
    .filter(([, list]) => list.length > 0)
    .map(([cat, list]) => `- ${cat}: ${list.join(', ')}`)
    .join('\n');

  const experiencesText = (experiences || []).length
    ? experiences
        .map((e, idx) => `${idx + 1}. ${e.role}${e.period ? ` (${e.period})` : ''}: ${e.description || ''}`)
        .join('\n')
    : (cv?.experience || [])
        .map((e, idx) => `${idx + 1}. ${e.role} at ${e.company || 'Independent'}: ${(e.bullets || []).join(' ')}`)
        .join('\n');

  const strengthsText = (strengths || []).length
    ? strengths.map((s) => `- ${s.title}: ${s.desc || s.description || ''}`).join('\n')
    : 'Scalable SaaS engineering, backend APIs, AI automation, full-stack architecture, and cloud deployment.';

  const premiumStoreText = (sourceCodes || []).length
    ? sourceCodes
        .map((sc, idx) => {
          const price = Number(sc.price || 0).toLocaleString();
          const tech = formatTech(sc.tech);
          return `${idx + 1}. ${sc.title} — ₦${price} | Tech: ${tech || 'N/A'}\n   Details: ${sc.description || ''}`;
        })
        .join('\n')
    : 'No premium source code packages currently listed.';

  const freeStoreText = (freeSourceCodes || []).length
    ? freeSourceCodes
        .map((fsc, idx) => {
          const tech = formatTech(fsc.tech);
          return `${idx + 1}. ${fsc.title} — FREE | Tech: ${tech || 'N/A'}\n   Details: ${fsc.description || ''}`;
        })
        .join('\n')
    : 'No free source code packages currently listed.';

  const musicText = (music || []).length
    ? music.map((m) => m.title || 'Untitled Track').join(', ')
    : 'Default Portfolio Track';

  const educationText = (cv?.education || [])
    .map((edu) => `- ${edu.degree} — ${edu.institution} (${edu.period || 'Graduated'})`)
    .join('\n');

  const certificationsText = (cv?.certifications || [])
    .map((c) => (typeof c === 'string' ? `- ${c}` : `- ${c.title}${c.issuer ? ` (${c.issuer})` : ''}`))
    .join('\n');

  const snapshot = `
=== PORTFOLIO OWNER & BRAND ===
Name: ${cv?.fullName || 'Caleb Anayolico'}
Brand: CaleByte (CaleByte Technologies)
Headline: ${cv?.title || 'Full-Stack & Backend Software Engineer | Mobile Application | Cloud Infrastructure & DevOps | SaaS Products'}
Location: ${cv?.location || 'Remote / Nigeria'}
Experience: 5+ Years building production web apps, mobile apps, SaaS platforms, backend APIs, and AI automation.
Motto: "If it's complex, tedious, or critical, that's my lane."
Summary: ${cv?.summary || 'Software Engineer specializing in scalable SaaS products, custom backend APIs, and AI automation.'}
Education & Courses: Also creates hands-on courses and source code teaching developers how to build and launch production systems independently.

=== SERVICES & CAPABILITIES ===
- AI & Automation Tools: Custom AI workflows, automated bots, LLM integrations (Gemini API, OpenAI API), intelligent agent systems.
- Frontend Engineering: High-performance responsive web interfaces with React.js, Next.js, Vite, Tailwind CSS.
- Backend Architectures: RESTful APIs, async pipelines, JWT auth, WebSockets using Node.js, Express, Python (FastAPI & Django).
- Mobile Development: Cross-platform apps with React Native and Java (Android).
- Databases & Payments: PostgreSQL, Neon DB, Prisma ORM, Supabase, MongoDB, Paystack, Stripe, Flutterwave.
- Cloud & DevOps: AWS (EC2/S3), Render, Vercel, Docker, GitHub Actions CI/CD.

=== LIVE PORTFOLIO PROJECTS (DATABASE) ===
${projectsText}

=== TECHNICAL SKILLS (DATABASE) ===
${skillsText || (cv?.skills || []).map((g) => `- ${g.category}: ${(g.items || []).join(', ')}`).join('\n')}

=== WORK EXPERIENCE ===
${experiencesText}

=== CORE STRENGTHS ===
${strengthsText}

=== EDUCATION & CERTIFICATIONS ===
Education:
${educationText || '- Diploma in Software Engineering — National Institute of Information Technology (NIIT)'}
Certifications:
${certificationsText || '- Google AI Essentials, AWS AI Practitioner, LangChain for LLM Application Development'}

=== PREMIUM SOURCE CODE STORE (/source-code) ===
Paid production-ready codebases purchased securely via Paystack with instant verified download delivery:
${premiumStoreText}

=== FREE SOURCE CODE STORE (/source-code) ===
Free open templates available for immediate download:
${freeStoreText}

=== BACKGROUND MUSIC PLAYLIST ===
The portfolio features an ambient music player in the bottom-right corner with tracks: ${musicText}

=== HOW VISITORS CAN SUPPORT CALEBYTE ===
1. Direct Support via Paystack: Visitors can click any "Support" button on the site to open the Support CaleByte modal and contribute via secure Paystack checkout (preset options: ₦2,000, ₦5,000, ₦10,000, ₦20,000, or any custom amount starting from ₦100). Contributions directly fuel independent engineering, free tools, and open tutorials.
2. Purchase Premium Source Codes: Buy complete production codebases in the Source Code Store (/source-code).
3. Hire / Collaborate: Reach out via the Contact form (/#contact) or WhatsApp for freelance, SaaS, backend, mobile, or AI automation work.
4. Community Support: Star Caleb's repositories on GitHub, subscribe on YouTube, or share the portfolio.

=== WEBSITE PAGES & NAVIGATION ===
- / (Home): Hero, About Me, Experience & Strengths, Featured Projects (top 3), Source Code Store preview, Technical Skills, Contact form, Social links.
- /projects: Full directory of all portfolio projects.
- /source-code: Complete Premium & Free Source Code Store with Paystack checkout.
- /cv: Interactive online CV/Resume with one-click PDF download.

=== CONTACT & SOCIAL LINKS ===
- Email: ${cv?.email || 'acnwa1234@gmail.com'}
- Phone / WhatsApp: ${cv?.phone || '+234 916 558 7681'}
- Contact Form: On the homepage (#contact) — typical response time within 24 hours.
- Portfolio Website: ${cv?.portfolio || 'https://anayolico.name.ng'}
- GitHub: https://github.com/anayolico
- LinkedIn: https://www.linkedin.com/in/caleb-anayolico-9861a8350
- Instagram: https://instagram.com/caleb_anayolico (@caleb_anayolico)
- YouTube: https://youtube.com/@caleb_anayolico
- Facebook: https://facebook.com/anayolicoDevCode
`.trim();

  cachedSnapshot = snapshot;
  cachedAt = now;
  return snapshot;
}

const LIVE_LANGUAGES = {
  english: {
    label: 'English',
    voice: null, // Uses DEFAULT_LIVE_VOICE (e.g. Aoede)
    greetings: {
      morning: 'Hello, good morning! Welcome to CaleByte Support. How can I help you today?',
      afternoon: 'Hello, good afternoon! Welcome to CaleByte Support. How can I help you today?',
      evening: 'Hello, good evening! Welcome to CaleByte Support. How can I help you today?'
    },
    directive:
      'Speak ONLY in clear, natural, warm English. Do NOT switch to Spanish, French, or any other language even if you hear faint background noise, breaths, or unclear sounds.'
  },
  pidgin: {
    label: 'Nigerian Pidgin',
    voice: 'Fenrir',
    greetings: {
      morning: 'Hello, good morning! Welcome to CaleByte Support. How I fit help you today?',
      afternoon: 'Hello, good afternoon! Welcome to CaleByte Support. How I fit help you today?',
      evening: 'Hello, good evening! Welcome to CaleByte Support. How I fit help you today?'
    },
    directive:
      'ALWAYS reply in authentic, natural, warm, and respectful Nigerian Pidgin English with a genuine Nigerian (Lagos) accent and West African vocal rhythm — NOT an American or British accent. Understand the caller smoothly whether they speak Nigerian Pidgin, standard English, or a mix of both. Pronounce everyday Nigerian expressions ("how far", "wahala", "sabi", "na", "abeg", "Naira", "Nigeria", "Caleb") naturally. Keep tech terms (React, Node.js, FastAPI, Paystack) clear. NEVER switch output into Spanish or another unrelated language.'
  },
  igbo: {
    label: 'Igbo',
    voice: 'Charon',
    greetings: {
      morning: 'Hello, ụtụtụ ọma! Nnọọ na CaleByte Support. Kedu ka m ga-esi nyere gị aka?',
      afternoon: 'Hello, ehihie ọma! Nnọọ na CaleByte Support. Kedu ka m ga-esi nyere gị aka?',
      evening: 'Hello, mgbede ọma! Nnọọ na CaleByte Support. Kedu ka m ga-esi nyere gị aka?'
    },
    directive:
      'ALWAYS reply in clear, natural, polite Igbo with authentic Nigerian Igbo intonation, proper tonal rhythm, and a calm, steady pace — NOT a Western/American accent. Understand the caller smoothly whether they speak pure Igbo, Igbo mixed with English tech words (code-switching), or English/Pidgin while expecting Igbo replies. Use portfolio context generously to understand their intent rather than repeatedly asking them to repeat themselves. NEVER switch output into Spanish or another unrelated language.'
  },
  yoruba: {
    label: 'Yoruba',
    voice: 'Charon',
    greetings: {
      morning: 'Hello, ẹ káàárọ̀! Ẹ káàbọ̀ sí CaleByte Support. Báwo ni mo ṣe lè ràn yín lọ́wọ́?',
      afternoon: 'Hello, ẹ káàsán! Ẹ káàbọ̀ sí CaleByte Support. Báwo ni mo ṣe lè ràn yín lọ́wọ́?',
      evening: 'Hello, ẹ káalẹ́! Ẹ káàbọ̀ sí CaleByte Support. Báwo ni mo ṣe lè ràn yín lọ́wọ́?'
    },
    directive:
      'ALWAYS reply in clear, natural, respectful Yoruba with authentic Nigerian Yoruba vocal cadence, accurate tonal inflections, and a calm, clear pace — NOT a Western/American accent. Understand the caller smoothly whether they speak pure Yoruba, Yoruba mixed with English tech words (code-switching), or English/Pidgin while expecting Yoruba replies. Use portfolio context generously to understand their intent rather than repeatedly asking them to repeat themselves. NEVER switch output into Spanish or another unrelated language.'
  },
  hausa: {
    label: 'Hausa',
    voice: 'Charon',
    greetings: {
      morning: 'Hello, barka da safiya! Barka da zuwa CaleByte Support. Yaya zan iya taimaka muku?',
      afternoon: 'Hello, barka da rana! Barka da zuwa CaleByte Support. Yaya zan iya taimaka muku?',
      evening: 'Hello, barka da yamma! Barka da zuwa CaleByte Support. Yaya zan iya taimaka muku?'
    },
    directive:
      'ALWAYS reply in clear, natural, polite Hausa with authentic Nigerian Hausa vocal cadence, clear pronunciation, and a calm, steady pace — NOT a Western/American accent. Understand the caller smoothly whether they speak pure Hausa, Hausa mixed with English tech words (code-switching), or English/Pidgin while expecting Hausa replies. Use portfolio context generously to understand their intent rather than repeatedly asking them to repeat themselves. NEVER switch output into Spanish or another unrelated language.'
  },
  french: {
    label: 'French',
    voice: null, // Uses DEFAULT_LIVE_VOICE (e.g. Aoede)
    greetings: {
      morning: 'Bonjour ! Bienvenue chez CaleByte Support. Comment puis-je vous aider aujourd\'hui ?',
      afternoon: 'Bonjour ! Bienvenue chez CaleByte Support. Comment puis-je vous aider aujourd\'hui ?',
      evening: 'Bonsoir ! Bienvenue chez CaleByte Support. Comment puis-je vous aider ?'
    },
    directive:
      'Speak ONLY in clear, natural, friendly French. NEVER switch into another language due to background noise.'
  },
  spanish: {
    label: 'Spanish',
    voice: null, // Uses DEFAULT_LIVE_VOICE (e.g. Aoede)
    greetings: {
      morning: '¡Hola, buenos días! Bienvenido a CaleByte Support. ¿En qué puedo ayudarte hoy?',
      afternoon: '¡Hola, buenas tardes! Bienvenido a CaleByte Support. ¿En qué puedo ayudarte hoy?',
      evening: '¡Hola, buenas noches! Bienvenido a CaleByte Support. ¿En qué puedo ayudarte hoy?'
    },
    directive:
      'Speak ONLY in clear, natural, friendly Spanish. NEVER switch into another language due to background noise.'
  }
};

function normalizeLiveLanguage(lang) {
  const key = typeof lang === 'string' ? lang.trim().toLowerCase() : 'english';
  return LIVE_LANGUAGES[key] ? key : 'english';
}

function normalizeTimeOfDay(timeOfDay) {
  const key = typeof timeOfDay === 'string' ? timeOfDay.trim().toLowerCase() : '';
  if (key === 'morning' || key === 'afternoon' || key === 'evening') return key;
  return 'morning';
}

function getLiveVoiceForLanguage(lang, defaultVoice = 'Aoede') {
  const key = normalizeLiveLanguage(lang);
  const cfg = LIVE_LANGUAGES[key];
  if (cfg && cfg.voice) {
    return (process.env.GEMINI_LIVE_VOICE_NG || '').trim() || cfg.voice;
  }
  return defaultVoice;
}

async function getPortfolioSystemInstruction(mode = 'chat', language = 'english', timeOfDay = 'morning') {
  const knowledge = await buildPortfolioSnapshot();

  if (mode === 'voice') {
    const langKey = normalizeLiveLanguage(language);
    const todKey = normalizeTimeOfDay(timeOfDay);
    const langCfg = LIVE_LANGUAGES[langKey];
    const greetingLine = langCfg.greetings[todKey] || langCfg.greetings.morning;

    return `You are CaleByte Support, the live voice support desk on Caleb Anayolico's (CaleByte) official portfolio website. Do NOT call yourself an AI or say "CaleByte AI" during the call — speak naturally as CaleByte Support.

STRICT LANGUAGE RULE (HIGHEST PRIORITY):
- Selected Call Language: ${langCfg.label}
- Caller's Local Time of Day: ${todKey}
- ${langCfg.directive}
- If you hear only faint room noise or static, stay silent. If the caller speaks and you catch their topic or keywords, answer helpfully in ${langCfg.label} instead of repeating "I didn't understand." NEVER switch output into another language.

OPENING GREETING RULE:
- When notified that a caller just connected, immediately answer the call warmly using this greeting in ${langCfg.label}: "${greetingLine}"

VOICE STYLE RULES:
- Speak naturally, warmly, confidently, and concisely — like a helpful live support representative on a phone call.
- Keep spoken answers short and conversational (typically 2 to 4 sentences) unless the caller specifically asks for a deeper technical breakdown.
- Do NOT read raw URLs, markdown symbols, asterisks, or bullet syntax aloud. Refer to pages naturally (e.g., the Projects page, the Source Code Store, the CV page, or the Support button).
- Answer accurately using ONLY the live portfolio knowledge below. If something is not listed, be honest and invite the caller to contact Caleb directly via the Contact form, email, or WhatsApp.
- If a caller asks how to support Caleb, explain the Paystack Support option (presets from 2,000 to 20,000 Naira or any custom amount from 100 Naira), buying premium source code packages, or hiring/collaborating with him.
- Always stay helpful, respectful, and focused on Caleb / CaleByte's portfolio, services, projects, skills, store, and contact options.

LIVE PORTFOLIO KNOWLEDGE:
${knowledge}`;
  }

  return `You are CaleByte AI, the official AI assistant on Caleb Anayolico's (CaleByte) developer portfolio website.

CHAT STYLE RULES:
- Be helpful, friendly, sharp, and concise. Use clean plain text or light formatting (short paragraphs or brief bullet points when listing projects/skills).
- Answer accurately using ONLY the live portfolio knowledge below — never invent projects, prices, or credentials.
- This chat is text-only (no image uploads) to keep replies fast and lightweight.
- When helpful, mention the relevant section or page (e.g., /projects, /source-code, /cv, /#contact, or the Support CaleByte modal).
- If a visitor wants to hire Caleb, collaborate, or discuss custom work, guide them to the Contact form (/#contact), email (${'acnwa1234@gmail.com'}), or WhatsApp (+234 916 558 7681).
- If a visitor asks how to support Caleb, clearly explain the Paystack Support modal (₦2,000, ₦5,000, ₦10,000, ₦20,000, or custom amount from ₦100), purchasing from the Premium Source Code Store (/source-code), or sharing his work.

LIVE PORTFOLIO KNOWLEDGE:
${knowledge}`;
}

module.exports = {
  buildPortfolioSnapshot,
  getPortfolioSystemInstruction,
  invalidateKnowledgeCache,
  normalizeLiveLanguage,
  normalizeTimeOfDay,
  getLiveVoiceForLanguage,
  LIVE_LANGUAGES
};
