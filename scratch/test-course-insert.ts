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
  console.log("Trying to insert a mock course using only basic columns...");
  const { data, error } = await supabase
    .from('courses')
    .insert([
      {
        code: 'TEST102',
        title: 'Test Course 102',
        description: 'Test description'
      }
    ])
    .select();

  if (error) {
    console.error("Insert failed!");
    console.error("Error Code:", error.code);
    console.error("Error Message:", error.message);
  } else {
    console.log("Insert Succeeded!", data);
    
    // Clean up
    console.log("Deleting mock course...");
    const { error: delErr } = await supabase
      .from('courses')
      .delete()
      .eq('code', 'TEST102');
    if (delErr) {
      console.error("Cleanup failed:", delErr.message);
    } else {
      console.log("Cleanup successful!");
    }
  }
}

test();
