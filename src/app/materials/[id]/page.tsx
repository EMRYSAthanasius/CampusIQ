import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import SmartReader from "@/components/reader/SmartReader";
import CourseChatbot from "@/components/reader/CourseChatbot";
import AiEnhancedNotes from "@/components/reader/AiEnhancedNotes";

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
    // For demo/development purposes if no material exists, we can show a placeholder
    // but typically we'd use notFound();
    // notFound();
  }

  // To simulate the API parsing functionality during development without actual PDFs in storage:
  // In production, you'd fetch from your API route if parsed_content is null.
  
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
    <div className="flex h-screen w-full bg-[#F3FAF6] overflow-hidden">
      {/* Main Reader Area */}
      <div className="flex-1 h-full relative">
        <SmartReader materialId={id} title={title} initialBlocks={blocks} fileUrl={material?.file_url || null} />
        <CourseChatbot />
      </div>

      {/* Sidebar for Pro Users */}
      <div className="hidden lg:block w-[350px] shrink-0 h-full">
        <AiEnhancedNotes materialId={id} />
      </div>
    </div>
  );
}
