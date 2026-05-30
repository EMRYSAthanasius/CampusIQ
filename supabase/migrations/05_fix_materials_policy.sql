-- Fix overly permissive INSERT policy on course_materials

DROP POLICY IF EXISTS "Allow inserts to course_materials" ON public.course_materials;

CREATE POLICY "Allow inserts to course_materials" ON public.course_materials 
FOR INSERT 
WITH CHECK (
  auth.uid() IN (
    SELECT id FROM public.profiles WHERE role = 'admin'
  )
);
