-- Migration: Cleanup Exam Engine & Question Bank
-- ============================================================

-- 1. Cleanup obsolete exam_questions table
DROP TABLE IF EXISTS public.exam_questions CASCADE;

