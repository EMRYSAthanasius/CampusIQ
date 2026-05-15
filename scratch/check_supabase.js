
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://pypswvjrevvkrqwdofva.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5cHN3dmpyZXZ2a3Jxd2RvZnZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgzNTc5NzksImV4cCI6MjA5MzkzMzk3OX0.XjvwQNqXXI2Okin87N4VOXPmSpTYDjQC-MQiw5Kt1jU';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkMaterials() {
  const { data, error } = await supabase
    .from('course_materials')
    .select('id, title, file_url')
    .limit(5);

  if (error) {
    console.error('Error fetching materials:', error);
    return;
  }

  console.log('Materials:', JSON.stringify(data, null, 2));
}

checkMaterials();
