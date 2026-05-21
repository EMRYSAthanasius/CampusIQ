import * as fs from 'fs';
import * as path from 'path';

try {
  const envPath = path.resolve(process.cwd(), '.env.local');
  const envContent = fs.readFileSync(envPath, 'utf-8');
  console.log("Keys in .env.local:");
  envContent.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts[0]) {
      console.log(`- ${parts[0].trim()}: ${parts[1] ? '(present)' : '(empty)'}`);
    }
  });
} catch (err) {
  console.error("Error reading env:", err.message);
}
