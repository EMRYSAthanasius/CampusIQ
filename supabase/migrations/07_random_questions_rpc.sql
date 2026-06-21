-- Migration: add RPC function for truly random question sampling
-- This function uses Postgres's native ORDER BY random() so the database
-- itself randomizes the pool before we fetch, guaranteeing a different
-- set of questions on every call regardless of Supabase client row limits.

CREATE OR REPLACE FUNCTION get_random_questions(p_course_id uuid, p_limit int)
RETURNS TABLE (
  id          uuid,
  content     text,
  options     jsonb,
  correct_option_index int,
  explanation text
)
LANGUAGE sql
VOLATILE
AS $$
  SELECT
    q.id,
    q.content,
    q.options,
    q.correct_option_index,
    q.explanation
  FROM questions q
  WHERE q.course_id = p_course_id
  ORDER BY random()
  LIMIT p_limit;
$$;

-- Grant execute permission to authenticated users (row-level security already
-- protects the underlying table; the function only exposes the same rows).
GRANT EXECUTE ON FUNCTION get_random_questions(uuid, int) TO authenticated;
GRANT EXECUTE ON FUNCTION get_random_questions(uuid, int) TO service_role;
