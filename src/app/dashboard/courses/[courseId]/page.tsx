import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export const revalidate = 0

export default async function CourseDetailPage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // 1. Try to find the course in the database
  let course: any = null
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(courseId)

  if (isUUID) {
    const { data: dbCourse } = await supabase
      .from('courses')
      .select('*')
      .eq('id', courseId)
      .single()
    course = dbCourse
  }

  if (!course) {
    // Try search by code
    const normalizedCode = courseId.replace(/\s+/g, '').toUpperCase()
    const { data: byCodeCourse } = await supabase
      .from('courses')
      .select('*')
      .eq('code', normalizedCode)
      .maybeSingle()
    course = byCodeCourse
  }

  // 2. If the course doesn't exist, let's create it dynamically in the db
  if (!course) {
    const normalizedCode = courseId.replace(/\s+/g, '').toUpperCase()
    const { data: newCourse, error: createError } = await supabase
      .from('courses')
      .insert([
        {
          code: normalizedCode,
          title: `Course ${normalizedCode}`,
          description: `Verbatim study manuals, quizzes, and learning analytics for ${normalizedCode}.`,
          color: 'emerald',
        }
      ])
      .select('*')
      .single()

    if (createError) {
      console.error('Failed to auto-create course:', createError.message)
      redirect('/dashboard')
    }
    course = newCourse
  }

  // 3. Log course access for tracking (recent courses)
  if (course && course.id) {
    const validUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(course.id)
    if (validUUID) {
      await supabase.rpc('log_course_access', { p_course_id: course.id })
    }
  }

  // 4. Find or create course material
  const { data: existingMaterials } = await supabase
    .from('course_materials')
    .select('id')
    .eq('course_id', course.id)
    .eq('is_active', true)
    .limit(1)

  if (existingMaterials && existingMaterials.length > 0) {
    // Redirect to the actual workspace page with the first material ID
    redirect(`/materials/${existingMaterials[0].id}`)
  }

  // Create a default course material space if none exists
  const { data: newMaterial, error: materialError } = await supabase
    .from('course_materials')
    .insert([
      {
        course_id: course.id,
        title: `${course.code} Course Workspace`,
        file_url: `${course.code}/Material/`,
        parsed_content: '[]',
        is_active: true
      }
    ])
    .select('id')
    .single()

  if (materialError) {
    console.error('Failed to auto-create course material:', materialError.message)
    redirect('/dashboard')
  }

  // Redirect to the newly created material workspace
  redirect(`/materials/${newMaterial.id}`)
}
