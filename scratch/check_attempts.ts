import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl!, supabaseKey!);

async function checkAttempts() {
  console.log("Checking quiz_attempts...");
  const { data: attempts, error: aErr } = await supabase.from('quiz_attempts').select('*');
  if (aErr) {
    console.error("Error fetching quiz_attempts:", aErr);
  } else {
    console.log("quiz_attempts rows:", attempts?.length);
    if (attempts && attempts.length > 0) {
      console.log(attempts);
    }
  }

  console.log("\nChecking study_sessions...");
  const { data: sessions, error: sErr } = await supabase.from('study_sessions').select('*');
  if (sErr) {
    console.error("Error fetching study_sessions:", sErr);
  } else {
    console.log("study_sessions rows:", sessions?.length);
  }
}

checkAttempts();
