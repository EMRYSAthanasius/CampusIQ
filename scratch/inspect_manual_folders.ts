import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  const { data: root } = await supabase.storage.from('materials').list('', { limit: 100 });
  if (!root) return;

  for (const folder of root) {
    if (folder.id) continue; // skip files
    const { data: subfolders } = await supabase.storage.from('materials').list(folder.name, { limit: 50 });
    if (!subfolders) continue;
    for (const sub of subfolders) {
      if (sub.id) continue;
      console.log(`${folder.name}/${sub.name}`);
      const { data: files } = await supabase.storage.from('materials').list(`${folder.name}/${sub.name}`, { limit: 20 });
      if (files) {
        files.forEach(f => {
          if (f.id) console.log(`  └── ${f.name} (${Math.round((f.metadata?.size || 0)/1024)}KB)`);
        });
      }
    }
  }
}

main().catch(console.error);
