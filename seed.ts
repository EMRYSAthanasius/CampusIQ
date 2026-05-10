import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables from .env.local
dotenv.config({ path: join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seed() {
  console.log("Seeding database...");

  // Get courses
  const { data: courses, error: coursesError } = await supabase.from('courses').select('id, code');
  if (coursesError || !courses) {
    console.error("Error fetching courses:", coursesError);
    return;
  }

  const csCourse = courses.find(c => c.code === 'CS101');
  const bioCourse = courses.find(c => c.code === 'BIO101');

  if (!csCourse || !bioCourse) {
    console.error("Courses not found. Make sure you ran the schema.sql.");
    return;
  }

  // Insert Quizzes
  const { data: quizzes, error: quizzesError } = await supabase.from('quizzes').insert([
    { course_id: csCourse.id, title: 'CS101: Intro to Computer Science', difficulty: 'easy' },
    { course_id: bioCourse.id, title: 'BIO101: Intro to Biology', difficulty: 'easy' }
  ]).select();

  if (quizzesError || !quizzes) {
    console.error("Error inserting quizzes:", quizzesError);
    return;
  }

  const csQuiz = quizzes.find(q => q.title.includes('CS101'));
  const bioQuiz = quizzes.find(q => q.title.includes('BIO101'));

  // Insert Questions
  const { error: questionsError } = await supabase.from('questions').insert([
    {
      quiz_id: csQuiz.id,
      content: "What does CPU stand for?",
      options: ["Central Process Unit", "Computer Personal Unit", "Central Processing Unit", "Central Processor Unit"],
      correct_option_index: 2,
      explanation: "The Central Processing Unit (CPU) is the primary component of a computer that acts as its 'brain'."
    },
    {
      quiz_id: csQuiz.id,
      content: "Which of these is a valid boolean value?",
      options: ["yes", "true", "1", "on"],
      correct_option_index: 1,
      explanation: "In most programming languages, boolean values are explicitly 'true' or 'false'."
    },
    {
      quiz_id: bioQuiz.id,
      content: "What is the powerhouse of the cell?",
      options: ["Nucleus", "Ribosome", "Mitochondria", "Endoplasmic Reticulum"],
      correct_option_index: 2,
      explanation: "Mitochondria are often referred to as the powerhouse of the cell because they generate most of the cell's supply of ATP."
    }
  ]);

  if (questionsError) {
    console.error("Error inserting questions:", questionsError);
  } else {
    console.log("Successfully seeded quizzes and questions!");
  }
}

seed();
