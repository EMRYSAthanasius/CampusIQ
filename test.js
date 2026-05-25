import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
const { data } = await supabase.from('course_materials').select('parsed_content').limit(1);
console.log(data[0].parsed_content.substring(0, 500));
