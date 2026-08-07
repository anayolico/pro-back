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
  title: "Full-Stack Web & Mobile Application Engineer",
  location: "Port Harcourt, Rivers State, Nigeria",
  phone: "+234 916 558 7681",
  email: "acnwa1234@gmail.com",
  portfolio: "https://anayolico.name.ng",
  github: "github.com/anayolico",
  summary: "Driven Full-Stack Software Engineer with a clear trajectory of growth, evolving from a design focus to becoming a complete application architect. Proficient across the entire stack—leveraging React.js, Next.js, and React Native for dynamic interfaces, alongside Node.js, Python (FastAPI), and Java for scalable server architectures. Skilled in configuring relational and document databases (PostgreSQL, Prisma ORM, MongoDB, Supabase), integrating local/international payment gateways (Paystack, Flutterwave), and deploying cloud infrastructure. A graduate of NIIT with a Diploma in Software Engineering, and currently an intern at Fowgate, actively applying and refining full-stack skills on enterprise-level applications. Proven track record delivering both client solutions and robust production applications.",
  skills: [
    {
      category: "Frontend Development",
      items: ["React.js", "Next.js", "JavaScript (ES6+)", "HTML5", "CSS3 & Sass", "Tailwind CSS", "Vite", "React Native", "Responsive Web Design", "UI/UX Animations"]
    },
    {
      category: "Backend & Mobile Development",
      items: ["Node.js & Express", "Python (FastAPI)", "Java (Android)", "React Native", "PostgreSQL & Prisma ORM", "MongoDB", "RESTful APIs", "Automation Systems"]
    },
    {
      category: "Databases & Storage",
      items: ["PostgreSQL", "Prisma ORM", "MongoDB", "Supabase", "SQL", "Neon Database"]
    },
    {
      category: "Integrations & Cloud Services",
      items: ["Paystack", "Flutterwave", "Stripe", "Vercel", "Render", "Hostinger & VPS", "AWS (S3)", "Supabase/Clerk", "Mailgun & Resend"]
    },
    {
      category: "DevOps & Developer Tools",
      items: ["Git & GitHub Actions (CI/CD)", "Postman & API Testing", "Progressive Web Apps (PWA)", "Figma & UI Prototyping", "CloudConvert & Sharp API"]
    }
  ],
  projects: [
    {
      title: "LuminaConvert",
      role: "Full-Stack Creator & Architect",
      bullets: [
        "Engineered an online multi-format image & media conversion workstation with high-speed backend execution pipelines and an integrated AI assistant.",
        "Integrated React, Vite, Node.js, Express, Prisma ORM, Neon PostgreSQL, Supabase, CloudConvert, Sharp API, Google Generative AI, and Resend."
      ]
    },
    {
      title: "Mindful Canvas",
      role: "Full-Stack Developer",
      bullets: [
        "Designed a minimalist note-taking application providing a distraction-free writing environment with secure authentication, real-time auto-saving, and React Markdown parsing.",
        "Built with React, Vite, Node.js, Express, PostgreSQL, Neon Database, and Supabase."
      ]
    },
    {
      title: "Construction Company Web Platform",
      role: "Full-Stack Developer",
      bullets: [
        "Designed and engineered a commercial web platform for a Nigerian construction firm using React.js, Node.js, and Tailwind CSS with interactive project galleries and service inquiry flows."
      ]
    },
    {
      title: "Weather Forecast App",
      role: "Frontend & API Engineer",
      bullets: [
        "Developed a real-time weather application with location search, multi-day forecasts, and smooth CSS weather visualizations."
      ]
    }
  ],
  hackathonProject: {
    title: "Nigeria SecureVote",
    awardTitle: "1st Place Hackathon Winner & Best Security Architecture",
    role: "Lead Architect & Full-Stack Developer",
    awardImage: "",
    summary: "Award-winning next-generation cryptographic E-Voting & Identity Ingestion platform engineered for secure, transparent multi-service election processing.",
    keyFeatures: [
      "Real-time National Identity (NIMC/NIN) verification & dynamic citizen profile ingestion via Prembly API.",
      "PWA Offline-First Resilient Vote Queue with local cryptographic signing and auto-reconnection background sync.",
      "WebAuthn Biometric Authorization (fingerprint / TouchID / FaceID) enforcing strict single-vote integrity.",
      "Cryptographic Token & Digital PVC Card Generation featuring 6-digit VIN, 16-character security tokens, and QR verification.",
      "Python FastAPI Fraud Detection Engine & Real-Time Public Transparency Audit Ledger."
    ],
    tech: ["React", "Node.js", "Python (FastAPI)", "Neon Database", "PWA Offline Sync"],
    demoLink: "https://onetime-voter.vercel.app",
    codeLink: "https://github.com/anayolico/onetime"
  },
  experience: [
    {
      period: "",
      role: "Full-Stack Software Engineer (Intern)",
      company: "Fowgate",
      bullets: [
        "Contributing as a Full-Stack Engineer intern building enterprise features, internal application modules, and scaling frontend UI performance using React.js and Next.js.",
        "Architecting scalable state management solutions, integrating RESTful API endpoints, and optimizing server payload loading speeds."
      ]
    },
    {
      period: "",
      role: "Full-Stack Developer & NIIT Graduate",
      company: "Self-Employed / NIIT",
      bullets: [
        "Earned a Diploma in Software Engineering from the National Institute of Information Technology (NIIT).",
        "Delivered custom software applications across e-commerce and real estate, integrating Paystack and Flutterwave payment gateways and designing PostgreSQL / Prisma schemas."
      ]
    },
    {
      period: "",
      role: "Mobile Application Developer",
      company: "Freelance Client Work",
      bullets: [
        "Engineered cross-platform mobile applications using React Native and Java (Android).",
        "Focused on smooth 60fps UI performance, offline data persistence, and native mobile component integrations."
      ]
    },
    {
      period: "",
      role: "UI/UX & Web Designer",
      company: "Independent Client Work",
      bullets: [
        "Spearheaded user interface research and wireframing using Figma, translating visual designs into clean responsive HTML5/CSS3/JavaScript codebases."
      ]
    }
  ],
  education: [
    {
      degree: "Diploma in Software Engineering",
      institution: "National Institute of Information Technology (NIIT)",
      period: "Graduated"
    },
    {
      degree: "Bachelor of Science (B.Sc.) Candidate — Computer Science / Engineering",
      institution: "University Degree Program",
      period: "Graduation Pending"
    }
  ]
};

let memoryDb = {
  projects: [],
  skills: [],
  experiences: [],
  strengths: [],
  contacts: [],
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

      CREATE TABLE IF NOT EXISTS cv (
        id INT PRIMARY KEY DEFAULT 1,
        content JSONB NOT NULL
      );

      ALTER TABLE projects ADD COLUMN IF NOT EXISTS image TEXT;
      ALTER TABLE projects ADD COLUMN IF NOT EXISTS "desc" TEXT;
      ALTER TABLE projects ADD COLUMN IF NOT EXISTS desc_text TEXT;
      ALTER TABLE strengths ADD COLUMN IF NOT EXISTS "desc" TEXT;
      ALTER TABLE strengths ADD COLUMN IF NOT EXISTS desc_text TEXT;
    `);

    await client.query(`INSERT INTO cv (id, content) VALUES (1, $1) ON CONFLICT (id) DO NOTHING`, [JSON.stringify(defaultCvData)]);

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
    const newItem = { id: String(Date.now()), ...data, created_at: new Date().toISOString() };
    if (!memoryDb[table]) memoryDb[table] = [];
    memoryDb[table].push(newItem);
    return newItem;
  }

  try {
    if (table === 'projects') {
      const descVal = data.desc || data.desc_text || '';
      const res = await pool.query(
        `INSERT INTO projects (title, "desc", desc_text, image, tech, demo_link, code_link) VALUES ($1, $2, $2, $3, $4, $5, $6) RETURNING *`,
        [data.title || '', descVal, data.image || '', JSON.stringify(data.tech || []), data.demoLink || data.demo_link || '#', data.codeLink || data.code_link || '#']
      );
      return res.rows[0];
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
    }
  } catch (err) {
    console.error(`[DB Error] insertItem(${table}):`, err.message);
    const newItem = { id: String(Date.now()), ...data, created_at: new Date().toISOString() };
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
      return list[idx];
    }
    return null;
  }

  try {
    if (table === 'projects') {
      const descVal = data.desc || data.desc_text || '';
      const res = await pool.query(
        `UPDATE projects SET title=$1, "desc"=$2, desc_text=$2, image=$3, tech=$4, demo_link=$5, code_link=$6 WHERE id=$7 RETURNING *`,
        [data.title, descVal, data.image, JSON.stringify(data.tech || []), data.demoLink || data.demo_link || '#', data.codeLink || data.code_link || '#', id]
      );
      return res.rows[0];
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
  if (useMemoryFallback || !pool) {
    return memoryDb.cv || defaultCvData;
  }
  try {
    const res = await pool.query('SELECT content FROM cv WHERE id=1');
    if (res.rows.length > 0 && res.rows[0].content) {
      return typeof res.rows[0].content === 'string' ? JSON.parse(res.rows[0].content) : res.rows[0].content;
    }
    return defaultCvData;
  } catch (err) {
    console.error('[DB Error] getCvData:', err.message);
    return memoryDb.cv || defaultCvData;
  }
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
