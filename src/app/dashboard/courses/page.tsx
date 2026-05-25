import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CoursesClient from './CoursesClient'

export const metadata = {
  title: 'Course Library — CampusIQ',
  description: 'Browse all 100-level science courses and start practicing with past exam questions.',
}

export default async function CoursesPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // 1. List course subdirectories directly from the storage bucket
  const { data: folders, error: storageError } = await supabase
    .storage
    .from('materials')
    .list('', {
      limit: 100,
      sortBy: { column: 'name', order: 'asc' }
    })

  if (storageError) {
    console.error('Failed to list course folders from storage:', storageError);
  }

  // Filter out subdirectories (folders in Supabase storage typically have !f.id)
  const courseCodes = (folders || [])
    .filter(f => !f.id && f.name !== '.emptyFolderPlaceholder')
    .map(f => f.name)

  // 2. Fetch courses from db to map metadata properties
  const { data: dbCourses } = await supabase
    .from('courses')
    .select('*')

  // 3. Map dynamic directories to database items or build robust fallback entities
  const mappedCourses = courseCodes.map((code, index) => {
    const dbCourse = dbCourses?.find(c => c.code.replace(/\s+/g, '').toUpperCase() === code.replace(/\s+/g, '').toUpperCase())
    if (dbCourse) return dbCourse

    const colors = ['emerald', 'teal', 'cyan', 'indigo', 'emerald']
    const color = colors[index % colors.length]

    return {
      id: code, // Dynamic fallback identifier (course code)
      code: code,
      title: `Course ${code}`,
      description: `Verbatim study manuals, quizzes, and learning analytics for ${code}.`,
      color: color,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  })

  // Count quizzes and questions per course
  const { data: quizCounts } = await supabase
    .from('quizzes')
    .select('course_id')
    .eq('is_active', true)

  const { data: questionCounts } = await supabase
    .from('questions')
    .select('course_id')
    .eq('is_active', true)

  const { data: materials } = await supabase
    .from('course_materials')
    .select('id, course_id')
    .eq('is_active', true)

  const quizCountMap: Record<string, number> = {}
  const questionCountMap: Record<string, number> = {}
  const materialCountMap: Record<string, number> = {}
  const courseToMaterialMap: Record<string, string> = {}

  ;(quizCounts || []).forEach(q => {
    quizCountMap[q.course_id] = (quizCountMap[q.course_id] || 0) + 1
  })
  ;(questionCounts || []).forEach(q => {
    questionCountMap[q.course_id] = (questionCountMap[q.course_id] || 0) + 1
  })
  ;(materials || []).forEach(m => {
    materialCountMap[m.course_id] = (materialCountMap[m.course_id] || 0) + 1
    if (!courseToMaterialMap[m.course_id]) {
      courseToMaterialMap[m.course_id] = m.id
    }
  })

  return (
    <CoursesClient
      profile={profile}
      courses={mappedCourses as any || []}
      quizCountMap={quizCountMap}
      questionCountMap={questionCountMap}
      materialCountMap={materialCountMap}
      courseToMaterialMap={courseToMaterialMap}
    />
  )
}
