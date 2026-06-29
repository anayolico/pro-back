const Database = require('better-sqlite3');
const path = require('path');

try {
  const dbPath = path.join(__dirname, '.tmp', 'data.db');
  console.log('Connecting to database at:', dbPath);
  const db = new Database(dbPath);
  
  // Query all permissions and their roles
  const rows = db.prepare(`
    SELECT p.id as permission_id, p.action, rl.role_id, r.name as role_name
    FROM up_permissions p
    LEFT JOIN up_permissions_role_lnk rl ON rl.permission_id = p.id
    LEFT JOIN up_roles r ON r.id = rl.role_id
    WHERE p.action LIKE 'api::%'
  `).all();
  
  console.log('All API permissions in db:');
  console.log(JSON.stringify(rows, null, 2));
} catch (err) {
  console.error('Error querying database:', err);
}
