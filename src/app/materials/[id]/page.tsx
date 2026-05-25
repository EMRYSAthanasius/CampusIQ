import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import MaterialWorkspace from "@/components/reader/MaterialWorkspace";

export default async function MaterialPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  // Fetch the material
  const { data: material } = await supabase
    .from("course_materials")
    .select("*")
    .eq("id", id)
    .single();

  if (!material) {
    // notFound();
  } else {
    // Log course access for "Recent Courses" tracking
    await supabase.rpc('log_course_access', { p_course_id: material.course_id });
  }

  // Fetch the course code for workspace content resolution
  let courseCode: string | null = null;
  if (material?.course_id) {
    const { data: course } = await supabase
      .from("courses")
      .select("code")
      .eq("id", material.course_id)
      .single();
    courseCode = course?.code?.replace(/\s+/g, '').toUpperCase() || null;
  }

  let blocks: any[] = [];
  let title = material?.title || "Course Material";

  if (material?.parsed_content) {
    try {
      const parsed = JSON.parse(material.parsed_content);
      // Only use pre-parsed blocks if they are workspace-format (not question bank JSON)
      const isWorkspace = Array.isArray(parsed) && parsed.length > 0 &&
        typeof parsed[0].type === 'string' && !parsed[0].correct_answer;
      if (isWorkspace) {
        blocks = parsed;
      }
    } catch {
      blocks = [{ id: "1", type: "paragraph", content: material.parsed_content }];
    }
  }

  return (
    <MaterialWorkspace
      materialId={id}
      title={title}
      blocks={blocks}
      fileUrl={material?.file_url || null}
      courseCode={courseCode}
    />
  );
}
