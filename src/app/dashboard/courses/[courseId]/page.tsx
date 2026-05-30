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

  // 2. If the course doesn't exist, return 404
  if (!course) {
    redirect('/dashboard?error=course_not_found')
  }

  // 3. Log course access for tracking (recent courses)
  if (course && course.id) {
    const validUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(course.id)
    if (validUUID) {
      await supabase.rpc('log_course_access', { p_course_id: course.id })
    }
  }

  // 4. Find course material
  const { data: existingMaterials } = await supabase
    .from('course_materials')
    .select('id')
    .eq('course_id', course.id)
    .eq('is_active', true)
    .limit(1)

  if (existingMaterials && existingMaterials.length > 0) {
    // Redirect to the actual workspace page with the first material ID
    redirect(`/materials/${existingMaterials[0].id}`)
  } else {
    // If no materials exist, we redirect to the dashboard with an error
    // (We no longer auto-create materials, as that is restricted to admins)
    redirect('/dashboard?error=no_materials')
  }
}
