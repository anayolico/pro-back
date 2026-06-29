const fs = require('fs');

const path = 'backup_extracted/entities/entities_00001.jsonl';
const lines = fs.readFileSync(path, 'utf-8').split('\n');

let fixedCount = 0;

const fixedLines = lines.map(line => {
  if (!line.trim()) return line;
  try {
    const entry = JSON.parse(line);
    if (entry.data) {
      for (const key in entry.data) {
        if (typeof entry.data[key] === 'string') {
          // If it looks like a stringified JSON array or object
          if ((entry.data[key].startsWith('[') && entry.data[key].endsWith(']')) ||
              (entry.data[key].startsWith('{') && entry.data[key].endsWith('}'))) {
            try {
              const parsed = JSON.parse(entry.data[key]);
              entry.data[key] = parsed; // Assign the parsed object/array back
              fixedCount++;
            } catch (e) {
              // Not valid JSON, keep as string
            }
          }
        }
      }
    }
    return JSON.stringify(entry);
  } catch (err) {
    return line;
  }
});

fs.writeFileSync(path, fixedLines.join('\n'));
console.log(`Fixed ${fixedCount} stringified JSON fields in JSONL file!`);
