import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl!, supabaseKey!);

async function checkProfiles() {
  console.log("Checking profiles table columns...");
  
  // To get column types without RPC, we can insert a deliberate error or select one row and inspect types 
  // Wait, the API doesn't return types directly. We can use the REST endpoint with OPTIONS or introspect.
  // We can fetch a row and check the data.
  const { data, error } = await supabase.from('profiles').select('*').limit(1);
  if (error) {
    console.error("Error fetching profile:", error);
  } else {
    console.log("Profiles sample:", data);
  }
}

checkProfiles();
