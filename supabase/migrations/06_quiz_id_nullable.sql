-- Migration 06: Make quiz_id nullable on questions table
-- 
-- Context: The admin panel ingest flow (AdminDashboardClient / ingest-questions API route)
-- inserts questions with a course_id but no quiz_id, because questions are mapped to courses
-- rather than individual quiz sessions. The original schema had quiz_id NOT NULL which
-- causes a constraint error on every admin insert.
--
-- This migration drops the NOT NULL constraint so admin-ingested questions can exist
-- without a quiz_id. The quiz engine (quiz-service.ts) already handles this correctly
-- by joining through course_question_mappings rather than requiring quiz_id directly.

ALTER TABLE questions
  ALTER COLUMN quiz_id DROP NOT NULL;
