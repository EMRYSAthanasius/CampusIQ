-- Insert Quizzes
insert into public.quizzes (course_id, title, difficulty)
select id, 'CS101: Intro to Computer Science', 'easy'
from public.courses where code = 'CS101'
limit 1;

insert into public.quizzes (course_id, title, difficulty)
select id, 'BIO101: Intro to Biology', 'easy'
from public.courses where code = 'BIO101'
limit 1;

-- Insert Questions for CS101 Quiz
insert into public.questions (quiz_id, content, options, correct_option_index, explanation)
select id, 'What does CPU stand for?', '["Central Process Unit", "Computer Personal Unit", "Central Processing Unit", "Central Processor Unit"]'::jsonb, 2, 'The Central Processing Unit (CPU) is the primary component of a computer that acts as its "brain".'
from public.quizzes where title = 'CS101: Intro to Computer Science'
limit 1;

insert into public.questions (quiz_id, content, options, correct_option_index, explanation)
select id, 'Which of these is a valid boolean value?', '["yes", "true", "1", "on"]'::jsonb, 1, 'In most programming languages, boolean values are explicitly "true" or "false".'
from public.quizzes where title = 'CS101: Intro to Computer Science'
limit 1;

-- Insert Questions for BIO101 Quiz
insert into public.questions (quiz_id, content, options, correct_option_index, explanation)
select id, 'What is the powerhouse of the cell?', '["Nucleus", "Ribosome", "Mitochondria", "Endoplasmic Reticulum"]'::jsonb, 2, 'Mitochondria are often referred to as the powerhouse of the cell because they generate most of the cell''s supply of ATP.'
from public.quizzes where title = 'BIO101: Intro to Biology'
limit 1;
