const { Pool } = require('pg');
const dns = require('dns');
require('dotenv').config();

// Configure high-reliability public DNS to resolve Neon cloud database hostnames instantly on Windows
try {
  dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
  dns.setDefaultResultOrder('ipv4first');
} catch (e) {
  // Silent fallback to system default if restricted
}

let pool = null;
let useMemoryFallback = false;

const defaultCvData = {
  fullName: "Caleb Anayolico",
  title: "Full-Stack & Backend Engineer | Mobile Application | Cloud Infrastructure & DevOps | SaaS Products",
  location: "Remote / Nigeria",
  phone: "+234 916 558 7681",
  email: "acnwa1234@gmail.com",
  portfolio: "https://anayolico.name.ng",
  github: "github.com/anayolico",
  linkedin: "linkedin.com/in/caleb-anayolico-9861a8350",
  summary: "Driven Full-Stack & Backend Engineer with hands-on experience designing, shipping, and maintaining production-grade web and mobile applications across fintech, SaaS, and security domains. Strong command of React.js, Next.js, Node.js, Express, Python (FastAPI), React Native, and PostgreSQL (Prisma ORM, Neon DB), paired with cloud deployment experience on Vercel, Render, and AWS (S3). Skilled in configuring relational and document databases, integrating payment gateways (Paystack, Flutterwave), and deploying scalable server infrastructure.",
  skills: [
    {
      category: "Backend & Logic",
      items: ["Node.js", "Express.js", "Python (FastAPI)", "Java (Android)", "RESTful API Design", "JWT Authentication", "WebSockets", "Automation Systems"]
    },
    {
      category: "Frontend & Mobile",
      items: ["React.js", "Next.js", "JavaScript (ES6+)", "HTML5", "CSS3 & Sass", "Tailwind CSS", "Vite", "React Native", "Responsive Web Design", "UI/UX Animations"]
    },
    {
      category: "Databases & Storage",
      items: ["PostgreSQL", "Prisma ORM", "MongoDB", "Supabase", "SQL", "Neon Database"]
    },
    {
      category: "Cloud & DevOps",
      items: ["Vercel", "Render", "Hostinger & VPS", "AWS (S3)", "Docker", "Git & GitHub Actions (CI/CD)", "Postman & API Testing"]
    },
    {
      category: "Integrations & Tools",
      items: ["Paystack", "Flutterwave", "Stripe", "Clerk", "Mailgun & Resend", "CloudConvert & Sharp API", "Figma"]
    },
    {
      category: "AI & Automation",
      items: ["Google Generative AI (Gemini API)", "OpenAI API", "Prompt Engineering", "Agentic Workflow Integration"]
    }
  ],
  projects: [
    {
      title: "Nigeria SecureVote",
      subtitle: "1st Place Hackathon Winner & Best Security Architecture",
      tech: "React, Node.js, Python (FastAPI), Neon DB, PWA Offline Sync",
      bullets: [
        "Engineered an award-winning next-generation cryptographic E-Voting & Identity Ingestion platform for high-security multi-service elections.",
        "Integrated real-time National Identity (NIMC/NIN) verification & dynamic citizen profile ingestion via Prembly API.",
        "Built a PWA offline-first resilient vote queue with local cryptographic signing and WebAuthn biometric authorization enforcing single-vote integrity.",
        "Developed a Python FastAPI fraud detection engine and real-time public transparency audit ledger."
      ]
    },
    {
      title: "LuminaConvert",
      subtitle: "Online Media Converter & AI Workstation",
      tech: "React, Vite, Node.js, Express, Prisma ORM, Neon PostgreSQL, Supabase, Google Generative AI",
      bullets: [
        "Engineered an online multi-format image & media conversion workstation with high-speed backend execution pipelines.",
        "Integrated CloudConvert API, Sharp API, Google Generative AI assistant, and automated Resend transactional email workflows."
      ]
    },
    {
      title: "Mindful Canvas",
      subtitle: "Distraction-Free Note-Taking Application",
      tech: "React, Vite, Node.js, Express, PostgreSQL, Neon DB, Supabase",
      bullets: [
        "Designed a minimalist note-taking platform with secure authentication, real-time auto-saving, and React Markdown parsing."
      ]
    },
    {
      title: "Construction Company Web Platform",
      subtitle: "Commercial Web Platform & Engineering Flow",
      tech: "React.js, Node.js, Express, Tailwind CSS",
      bullets: [
        "Designed and engineered a commercial web platform for a Nigerian construction firm using React.js, Node.js, and Tailwind CSS with interactive project galleries and service inquiry flows."
      ]
    },
    {
      title: "Weather Forecast App",
      subtitle: "Real-Time Weather Visualization & API Service",
      tech: "React, OpenWeather API, CSS Weather Animations",
      bullets: [
        "Developed a real-time weather application with location search, multi-day forecasts, and smooth CSS weather visualizations."
      ]
    }
  ],
  experience: [
    {
      period: "",
      role: "Full-Stack Software Engineer (Intern)",
      company: "Fowgate",
      bullets: [
        "Building enterprise features, internal application modules, and optimizing frontend performance using React.js and Next.js.",
        "Architecting scalable state management solutions, integrating RESTful API endpoints, and improving server payload loading speeds."
      ]
    },
    {
      period: "",
      role: "Full-Stack Developer & NIIT Graduate",
      company: "Self-Employed / NIIT",
      bullets: [
        "Earned a Diploma in Software Engineering from the National Institute of Information Technology (NIIT).",
        "Delivered custom web and SaaS applications, integrating Paystack and Flutterwave payment gateways and designing normalized PostgreSQL database schemas."
      ]
    },
    {
      period: "",
      role: "Mobile Application Developer",
      company: "Freelance Client Work",
      bullets: [
        "Engineered cross-platform mobile applications using React Native and Java (Android).",
        "Optimized mobile component render speeds, implemented offline data persistence, and integrated native mobile capabilities."
      ]
    },
    {
      period: "",
      role: "UI/UX & Web Designer",
      company: "Independent Client Work",
      bullets: [
        "Spearheaded user interface research and wireframing in Figma, translating visual mockups into clean, responsive frontend codebases."
      ]
    }
  ],
  education: [
    {
      degree: "Diploma in Software Engineering",
      institution: "National Institute of Information Technology (NIIT)",
      period: "Graduated",
      bullets: [
        "Algorithms, data structures, software engineering principles, and systems design."
      ]
    }
  ],
  certifications: [
    { title: "Google AI Essentials", issuer: "Google" },
    { title: "AWS AI Practitioner", issuer: "Amazon Web Services" },
    { title: "LangChain for LLM Application Development", issuer: "DeepLearning.AI" },
    { title: "Backend Web Development, Python & Django", issuer: "Code Camp" },
    { title: "Diploma in Software Engineering", issuer: "NIIT" }
  ]
};

const defaultSourceCodes = [
  {
    id: "1",
    title: "MR Bayo AI Agent Source Code",
    filename: "mr-bayo.zip",
    filesize: "10.1 MB",
    description: "Includes the complete Mr. Bayo AI Agent source code, project structure, setup requirements, and everything you need to run and understand the system.",
    tech: ["Python", "FastAPI", "AI Agents", "React"],
    price: 15000,
    download_link: "#"
  },
  {
    id: "2",
    title: "Browser Cookie & Key Decryption Engine",
    filename: "Browser Decryption.zip",
    filesize: "60 KB",
    description: "This contains the complete source code for decrypting V20 browser cookies and session keys, including cookies stored in Google Chrome & Chromium browsers.",
    tech: ["Python", "Cryptography", "Chrome API"],
    price: 15000,
    download_link: "#"
  }
];

const defaultProjects = [
  {
    id: "1",
    title: "Nigeria SecureVote",
    desc: "Next-generation cryptographic E-Voting & Identity Ingestion platform engineered for high-security multi-service elections. Combines NIMC NIN citizen lookup, PWA offline vote protection, WebAuthn biometric authorization, and real-time audit streaming.",
    image: "/media__1786134354519.png",
    tech: ["React", "Node.js", "Python (FastAPI)", "Neon DB", "PWA Offline Sync"],
    demo_link: "https://nigeria-secure-vote.vercel.app",
    code_link: "https://github.com/anayolico/onetime",
    is_featured: true
  }
];

const defaultFreeSourceCodes = [
  {
    id: "f1",
    title: "Vite Tailwind Dashboard Boilerplate",
    filename: "vite-tailwind-dashboard.zip",
    filesize: "4.2 MB",
    description: "A premium, fully configured React + Vite + Tailwind CSS admin dashboard template. Includes dark mode toggling, custom chart components, and auth layouts.",
    tech: ["React", "Vite", "Tailwind CSS"],
    download_link: "https://github.com/anayolico/onetime"
  }
];

let memoryDb = {
  projects: defaultProjects,
  skills: [],
  experiences: [],
  strengths: [],
  contacts: [],
  source_codes: defaultSourceCodes,
  free_source_codes: defaultFreeSourceCodes,
  cv: defaultCvData
};

async function initDb() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.log('[DB] Operating in fast clean memory mode.');
    useMemoryFallback = true;
    return;
  }

  try {
    pool = new Pool({
      connectionString,
      ssl: process.env.DATABASE_SSL === 'false' ? false : { rejectUnauthorized: false },
      connectionTimeoutMillis: 10000,
      idleTimeoutMillis: 30000,
      max: 10
    });

    const client = await pool.connect();
    console.log('[DB] Connected to PostgreSQL Database.');

    // Create clean tables if not exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS projects (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        desc_text TEXT NOT NULL,
        image TEXT,
        tech JSONB,
        demo_link TEXT,
        code_link TEXT,
        is_featured BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS skills (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        level INT DEFAULT 80,
        category TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS experiences (
        id SERIAL PRIMARY KEY,
        period TEXT NOT NULL,
        role TEXT NOT NULL,
        description TEXT NOT NULL,
        dot_color TEXT DEFAULT 'bg-accent-teal',
        text_color TEXT DEFAULT 'text-accent-teal',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS strengths (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        desc_text TEXT NOT NULL,
        dot TEXT DEFAULT 'bg-accent-teal',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS contacts (
        id SERIAL PRIMARY KEY,
        full_name TEXT NOT NULL,
        email TEXT NOT NULL,
        description TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS source_codes (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        filename TEXT,
        filesize TEXT,
        description TEXT NOT NULL,
        tech JSONB,
        price INT NOT NULL DEFAULT 15000,
        download_link TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS free_source_codes (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        filename TEXT,
        filesize TEXT,
        description TEXT NOT NULL,
        tech JSONB,
        download_link TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS cv (
        id INT PRIMARY KEY DEFAULT 1,
        content JSONB NOT NULL
      );

      ALTER TABLE projects ADD COLUMN IF NOT EXISTS image TEXT;
      ALTER TABLE projects ADD COLUMN IF NOT EXISTS "desc" TEXT;
      ALTER TABLE projects ADD COLUMN IF NOT EXISTS desc_text TEXT;
      ALTER TABLE projects ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE;
      ALTER TABLE strengths ADD COLUMN IF NOT EXISTS "desc" TEXT;
      ALTER TABLE strengths ADD COLUMN IF NOT EXISTS desc_text TEXT;
    `);

    // Ensure initial top 3 projects are featured if none are currently set to featured
    try {
      const featCountRes = await client.query('SELECT COUNT(*) FROM projects WHERE is_featured = TRUE');
      if (parseInt(featCountRes.rows[0].count, 10) === 0) {
        await client.query(`
          UPDATE projects SET is_featured = TRUE 
          WHERE id IN (SELECT id FROM projects ORDER BY id ASC LIMIT 3)
        `);
        console.log('[DB Migration] Set top 3 existing projects to is_featured = TRUE.');
      }
    } catch (fErr) {
      console.error('[DB Migration Warning] Checking featured projects:', fErr.message);
    }

    // Ensure Nigeria SecureVote exists in projects table
    await client.query(`
      INSERT INTO projects (title, "desc", desc_text, image, tech, demo_link, code_link, is_featured)
      SELECT 'Nigeria SecureVote', 'Next-generation cryptographic E-Voting & Identity Ingestion platform engineered for high-security multi-service elections. Combines NIMC NIN citizen lookup, PWA offline vote protection, WebAuthn biometric authorization, and real-time audit streaming.', 'Next-generation cryptographic E-Voting & Identity Ingestion platform engineered for high-security multi-service elections. Combines NIMC NIN citizen lookup, PWA offline vote protection, WebAuthn biometric authorization, and real-time audit streaming.', '/media__1786134354519.png', '["React", "Node.js", "Python (FastAPI)", "Neon DB", "PWA Offline Sync"]'::jsonb, 'https://nigeria-secure-vote.vercel.app', 'https://github.com/anayolico/onetime', true
      WHERE NOT EXISTS (SELECT 1 FROM projects WHERE LOWER(title) LIKE '%securevote%');
    `);

    await client.query(`INSERT INTO cv (id, content) VALUES (1, $1) ON CONFLICT (id) DO UPDATE SET content=$1`, [JSON.stringify(defaultCvData)]);

    // Fetch and migrate existing cv row if exists
    try {
      const cvRes = await client.query('SELECT content FROM cv WHERE id=1');
      if (cvRes.rows.length > 0 && cvRes.rows[0].content) {
        let cvContent = typeof cvRes.rows[0].content === 'string' ? JSON.parse(cvRes.rows[0].content) : cvRes.rows[0].content;
        if (cvContent && Array.isArray(cvContent.skills)) {
          let migrated = false;
          cvContent.skills = cvContent.skills.map(group => {
            if (group && (group.category === 'Backend & Mobile Development' || group.category === 'Backend Development')) {
              const beforeCount = group.items.length;
              group.items = group.items.filter(item => item !== 'React Native');
              if (group.items.length !== beforeCount) migrated = true;
            }
            return group;
          });
          if (migrated) {
            await client.query('UPDATE cv SET content=$1 WHERE id=1', [JSON.stringify(cvContent)]);
            console.log('[DB Migration] Removed "React Native" from Backend skills category in database CV.');
          }
        }
      }
    } catch (migErr) {
      console.error('[DB Migration Error] Migrating CV database record:', migErr.message);
    }

    client.release();
    console.log('[DB] Simple tables created and database ready.');
  } catch (err) {
    console.error('[DB Warning] PostgreSQL connection issue, falling back to memory mode:', err.message);
    useMemoryFallback = true;
  }
}

// Database helper functions
async function getTableData(table) {
  if (useMemoryFallback || !pool) {
    return memoryDb[table] || [];
  }
  try {
    const res = await pool.query(`SELECT * FROM ${table} ORDER BY id ASC`);
    const seen = new Set();
    const rows = [];

    res.rows.forEach(row => {
      // Determine unique key to avoid duplicate database entries
      const uniqueKey = (row.title || row.name || row.role || row.id || '').toString().toLowerCase();
      if (uniqueKey && seen.has(uniqueKey)) return;
      if (uniqueKey) seen.add(uniqueKey);

      if (row.desc_text) {
        row.desc = row.desc_text;
        delete row.desc_text;
      }
      if (row.dot_color) {
        row.dotColor = row.dot_color;
      }
      if (row.text_color) {
        row.textColor = row.text_color;
      }
      if (row.demo_link) {
        row.demoLink = row.demo_link;
      }
      if (row.code_link) {
        row.codeLink = row.code_link;
      }
      if (row.download_link) {
        row.downloadLink = row.download_link;
      }
      if (table === 'projects') {
        row.is_featured = Boolean(row.is_featured);
        row.isFeatured = Boolean(row.is_featured);
      }
      rows.push(row);
    });

    return rows;
  } catch (err) {
    console.error(`[DB Error] getTableData(${table}):`, err.message);
    return memoryDb[table] || [];
  }
}

async function insertItem(table, data) {
  if (useMemoryFallback || !pool) {
    const isFeat = data.is_featured !== undefined ? Boolean(data.is_featured) : (data.isFeatured !== undefined ? Boolean(data.isFeatured) : false);
    const newItem = { id: String(Date.now()), ...data, is_featured: isFeat, isFeatured: isFeat, created_at: new Date().toISOString() };
    if (!memoryDb[table]) memoryDb[table] = [];
    memoryDb[table].push(newItem);
    return newItem;
  }

  try {
    if (table === 'projects') {
      const descVal = data.desc || data.desc_text || '';
      const isFeatured = data.is_featured !== undefined ? Boolean(data.is_featured) : (data.isFeatured !== undefined ? Boolean(data.isFeatured) : false);
      const res = await pool.query(
        `INSERT INTO projects (title, "desc", desc_text, image, tech, demo_link, code_link, is_featured) VALUES ($1, $2, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [data.title || '', descVal, data.image || '', JSON.stringify(data.tech || []), data.demoLink || data.demo_link || '#', data.codeLink || data.code_link || '#', isFeatured]
      );
      const row = res.rows[0];
      if (row) {
        row.is_featured = Boolean(row.is_featured);
        row.isFeatured = Boolean(row.is_featured);
      }
      return row;
    } else if (table === 'skills') {
      const res = await pool.query(
        `INSERT INTO skills (name, level, category) VALUES ($1, $2, $3) RETURNING *`,
        [data.name || '', data.level || 80, data.category || 'Frontend']
      );
      return res.rows[0];
    } else if (table === 'experiences') {
      const res = await pool.query(
        `INSERT INTO experiences (period, role, description, dot_color, text_color) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [data.period || '', data.role || '', data.description || '', data.dotColor || 'bg-accent-teal', data.textColor || 'text-accent-teal']
      );
      return res.rows[0];
    } else if (table === 'strengths') {
      const descVal = data.desc || data.desc_text || '';
      const res = await pool.query(
        `INSERT INTO strengths (title, "desc", desc_text, dot) VALUES ($1, $2, $2, $3) RETURNING *`,
        [data.title || '', descVal, data.dot || 'bg-accent-teal']
      );
      return res.rows[0];
    } else if (table === 'contacts') {
      const res = await pool.query(
        `INSERT INTO contacts (full_name, email, description) VALUES ($1, $2, $3) RETURNING *`,
        [data.fullName || data.full_name || '', data.email || '', data.description || '']
      );
      return res.rows[0];
    } else if (table === 'source_codes') {
      const res = await pool.query(
        `INSERT INTO source_codes (title, filename, filesize, description, tech, price, download_link) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [data.title || '', data.filename || '', data.filesize || '', data.description || '', JSON.stringify(data.tech || []), data.price || 15000, data.downloadLink || data.download_link || '#']
      );
      return res.rows[0];
    } else if (table === 'free_source_codes') {
      const res = await pool.query(
        `INSERT INTO free_source_codes (title, filename, filesize, description, tech, download_link) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [data.title || '', data.filename || '', data.filesize || '', data.description || '', JSON.stringify(data.tech || []), data.downloadLink || data.download_link || '#']
      );
      return res.rows[0];
    }
  } catch (err) {
    console.error(`[DB Error] insertItem(${table}):`, err.message);
    const isFeat = data.is_featured !== undefined ? Boolean(data.is_featured) : (data.isFeatured !== undefined ? Boolean(data.isFeatured) : false);
    const newItem = { id: String(Date.now()), ...data, is_featured: isFeat, isFeatured: isFeat, created_at: new Date().toISOString() };
    if (!memoryDb[table]) memoryDb[table] = [];
    memoryDb[table].push(newItem);
    return newItem;
  }
}

async function updateItem(table, id, data) {
  if (useMemoryFallback || !pool) {
    const list = memoryDb[table] || [];
    const idx = list.findIndex(item => String(item.id) === String(id));
    if (idx !== -1) {
      list[idx] = { ...list[idx], ...data };
      if (data.is_featured !== undefined) {
        list[idx].is_featured = Boolean(data.is_featured);
        list[idx].isFeatured = Boolean(data.is_featured);
      } else if (data.isFeatured !== undefined) {
        list[idx].is_featured = Boolean(data.isFeatured);
        list[idx].isFeatured = Boolean(data.isFeatured);
      }
      return list[idx];
    }
    return null;
  }

  try {
    if (table === 'projects') {
      const currentRes = await pool.query('SELECT * FROM projects WHERE id=$1', [id]);
      const current = currentRes.rows[0];
      const title = data.title !== undefined ? data.title : (current ? current.title : '');
      const descVal = data.desc !== undefined ? data.desc : (data.desc_text !== undefined ? data.desc_text : (current ? (current.desc || current.desc_text || '') : ''));
      const image = data.image !== undefined ? data.image : (current ? current.image : '');
      const tech = data.tech !== undefined ? (typeof data.tech === 'string' ? data.tech : JSON.stringify(data.tech)) : (current ? (typeof current.tech === 'string' ? current.tech : JSON.stringify(current.tech || [])) : '[]');
      const demoLink = data.demoLink !== undefined ? data.demoLink : (data.demo_link !== undefined ? data.demo_link : (current ? (current.demo_link || current.demoLink || '#') : '#'));
      const codeLink = data.codeLink !== undefined ? data.codeLink : (data.code_link !== undefined ? data.code_link : (current ? (current.code_link || current.codeLink || '#') : '#'));
      const isFeatured = data.is_featured !== undefined ? Boolean(data.is_featured) : (data.isFeatured !== undefined ? Boolean(data.isFeatured) : (current ? Boolean(current.is_featured) : false));

      const res = await pool.query(
        `UPDATE projects SET title=$1, "desc"=$2, desc_text=$2, image=$3, tech=$4, demo_link=$5, code_link=$6, is_featured=$7 WHERE id=$8 RETURNING *`,
        [title, descVal, image, tech, demoLink, codeLink, isFeatured, id]
      );
      const row = res.rows[0];
      if (row) {
        row.is_featured = Boolean(row.is_featured);
        row.isFeatured = Boolean(row.is_featured);
      }
      return row;
    } else if (table === 'skills') {
      const res = await pool.query(
        `UPDATE skills SET name=$1, level=$2, category=$3 WHERE id=$4 RETURNING *`,
        [data.name, data.level, data.category, id]
      );
      return res.rows[0];
    } else if (table === 'experiences') {
      const res = await pool.query(
        `UPDATE experiences SET period=$1, role=$2, description=$3, dot_color=$4, text_color=$5 WHERE id=$6 RETURNING *`,
        [data.period, data.role, data.description, data.dotColor, data.textColor, id]
      );
      return res.rows[0];
    } else if (table === 'strengths') {
      const descVal = data.desc || data.desc_text || '';
      const res = await pool.query(
        `UPDATE strengths SET title=$1, "desc"=$2, desc_text=$2, dot=$3 WHERE id=$4 RETURNING *`,
        [data.title, descVal, data.dot || 'bg-accent-teal', id]
      );
      return res.rows[0];
    } else if (table === 'source_codes') {
      const res = await pool.query(
        `UPDATE source_codes SET title=$1, filename=$2, filesize=$3, description=$4, tech=$5, price=$6, download_link=$7 WHERE id=$8 RETURNING *`,
        [data.title, data.filename, data.filesize, data.description, JSON.stringify(data.tech || []), data.price, data.downloadLink || data.download_link || '#', id]
      );
      return res.rows[0];
    } else if (table === 'free_source_codes') {
      const res = await pool.query(
        `UPDATE free_source_codes SET title=$1, filename=$2, filesize=$3, description=$4, tech=$5, download_link=$6 WHERE id=$7 RETURNING *`,
        [data.title, data.filename, data.filesize, data.description, JSON.stringify(data.tech || []), data.downloadLink || data.download_link || '#', id]
      );
      return res.rows[0];
    }
  } catch (err) {
    console.error(`[DB Error] updateItem(${table}):`, err.message);
    return null;
  }
}

async function deleteItem(table, id) {
  // Always update memoryDb cache first
  if (memoryDb[table]) {
    memoryDb[table] = memoryDb[table].filter(item => String(item.id) !== String(id));
  }

  if (useMemoryFallback || !pool) {
    return true;
  }

  try {
    const numericId = parseInt(id, 10);
    const idToUse = isNaN(numericId) ? id : numericId;
    await pool.query(`DELETE FROM ${table} WHERE id=$1`, [idToUse]);
    return true;
  } catch (err) {
    console.error(`[DB Error] deleteItem(${table}):`, err.message);
    return true;
  }
}

async function getCvData() {
  let cvData = defaultCvData;
  if (!useMemoryFallback && pool) {
    try {
      const res = await pool.query('SELECT content FROM cv WHERE id=1');
      if (res.rows.length > 0 && res.rows[0].content) {
        cvData = typeof res.rows[0].content === 'string' ? JSON.parse(res.rows[0].content) : res.rows[0].content;
      }
    } catch (err) {
      console.error('[DB Error] getCvData query:', err.message);
      cvData = memoryDb.cv || defaultCvData;
    }
  } else if (memoryDb.cv) {
    cvData = memoryDb.cv;
  }

  // Dynamically merge any backend projects from projects table into cvData.projects
  try {
    const dbProjects = await getTableData('projects');
    if (Array.isArray(dbProjects) && dbProjects.length > 0) {
      const existingTitles = new Set((cvData.projects || []).map(p => (p.title || '').toLowerCase().trim()));
      const extraProjects = dbProjects
        .filter(p => p.title && !existingTitles.has(p.title.toLowerCase().trim()))
        .map(p => {
          const techStr = Array.isArray(p.tech) ? p.tech.join(', ') : (p.tech || '');
          return {
            title: p.title,
            subtitle: p.subtitle || techStr || 'Software Engineering Project',
            tech: techStr,
            bullets: [p.desc || p.desc_text || 'Showcased software project engineering and production release.']
          };
        });
      if (extraProjects.length > 0) {
        cvData = { ...cvData, projects: [...(cvData.projects || []), ...extraProjects] };
      }
    }
  } catch (err) {
    console.error('[DB Error] Merging dynamic projects into CV:', err.message);
  }

  // Ensure title & location are synced with latest header & location
  cvData.title = defaultCvData.title;
  cvData.location = defaultCvData.location;

  // Ensure education items have bullet points
  if (Array.isArray(cvData.education)) {
    cvData.education = cvData.education.map(edu => {
      if (!edu.bullets || edu.bullets.length === 0) {
        return {
          ...edu,
          bullets: ["Algorithms, data structures, software engineering principles, and systems design."]
        };
      }
      return edu;
    });
  }

  // Ensure certifications are updated if missing new entries
  if (!Array.isArray(cvData.certifications) || cvData.certifications.length < 3) {
    cvData.certifications = defaultCvData.certifications;
  }

  memoryDb.cv = cvData;
  return cvData;
}

async function updateCvData(data) {
  memoryDb.cv = data;
  if (useMemoryFallback || !pool) {
    return memoryDb.cv;
  }
  try {
    const jsonStr = JSON.stringify(data);
    await pool.query(
      `INSERT INTO cv (id, content) VALUES (1, $1) ON CONFLICT (id) DO UPDATE SET content=$1`,
      [jsonStr]
    );
    return data;
  } catch (err) {
    console.error('[DB Error] updateCvData:', err.message);
    return data;
  }
}

module.exports = {
  initDb,
  getTableData,
  insertItem,
  updateItem,
  deleteItem,
  getCvData,
  updateCvData,
  defaultCvData
};
