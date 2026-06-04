const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data, error } = await supabase.from('questions').select('*').limit(1);
  if (error) console.error("Error:", error);
  else console.log("Data columns:", data.length ? Object.keys(data[0]) : "No rows, but query succeeded");
  
  // Try inserting an empty record to get the exact schema constraint error
  const { error: insErr } = await supabase.from('questions').insert({});
  console.log("Insert Error Details:", insErr);
}
main();
