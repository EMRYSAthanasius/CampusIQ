import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  console.log("Checking profiles table contents...");
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, full_name, role, subscription_status')
    .limit(10);

  if (error) {
    console.error("Profiles query failed:", error.message);
  } else {
    console.log("Profiles in DB:", profiles);
  }
}

test();
