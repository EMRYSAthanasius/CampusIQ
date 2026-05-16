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

  let blocks: any[] = [];
  let title = material?.title || "Demo Course Material";
  
  if (material?.parsed_content) {
    try {
      blocks = JSON.parse(material.parsed_content);
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
    />
  );
}

