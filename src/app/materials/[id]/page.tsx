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
  
  let blocks = [];
  let title = material?.title || "Demo Course Material";
  
  if (material?.parsed_content) {
    try {
      blocks = JSON.parse(material.parsed_content);
    } catch {
      blocks = [{ id: "1", type: "paragraph", content: material.parsed_content }];
    }
  } else {
    // If we had a real fileUrl in the database, we would call our new API:
    // const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/parse-pdf`, {
    //   method: 'POST',
    //   body: JSON.stringify({ storagePath: material.file_url })
    // });
    // const parsed = await res.json();
    // blocks = parsed.blocks;

    // Dummy data for visual presentation since we don't have a real PDF bucket populated yet
    blocks = [
      { id: "1", type: "paragraph", content: "This is a demonstration of the ScholarIQ Smart Reader system." },
      { id: "2", type: "paragraph", content: "The objective is to convert static PDFs into a highly readable, native format that is responsive and easily customizable. Traditional PDFs lack reflowability, making them difficult to read on smaller mobile devices. This reader solves that problem." },
      { id: "3", type: "paragraph", content: "With the Smart Reader, you can customize the typography. Try changing the font size or family from the settings menu. You can also switch between Light, Dark, and Sepia themes to reduce eye strain." },
      { id: "4", type: "paragraph", content: "Furthermore, the reader supports two layout modes. The default is 'Scroll' mode, which is great for continuous reading. You can also switch to 'Swipe' mode, which paginates the content for a more book-like experience." },
      { id: "5", type: "paragraph", content: "While you are reading, a background process (the 'Heartbeat' hook) is silently tracking your active reading time. It only records time when this tab is actually visible, ensuring accurate study metrics." },
      { id: "6", type: "paragraph", content: "These metrics are stored in your user profile and compared against your daily study goals. As you progress, the CampusIQ platform builds a comprehensive model of your learning habits." },
      { id: "7", type: "paragraph", content: "For our Pro and Ultra subscribers, we've integrated advanced AI capabilities. On the right side, Pro users have access to 'AI Enhanced Notes' that dynamically extract key concepts from the text." },
      { id: "8", type: "paragraph", content: "Ultra users have access to the Course Chatbot, accessible via the floating button. The Chatbot allows you to ask direct questions about the material, ask for elaborations, and test your understanding through an interactive dialogue." },
    ];
  }

  return (
    <div className="flex h-screen w-full bg-[#F3FAF6] overflow-hidden">
      {/* Main Reader Area */}
      <div className="flex-1 h-full relative">
        <SmartReader materialId={id} title={title} blocks={blocks} />
        <CourseChatbot />
      </div>

      {/* Sidebar for Pro Users */}
      <div className="hidden lg:block w-[350px] shrink-0 h-full">
        <AiEnhancedNotes materialId={id} />
      </div>
    </div>
  );
}
