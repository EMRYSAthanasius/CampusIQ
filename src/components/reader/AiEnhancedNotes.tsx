"use client";

import { useState, useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { Sparkles, Lock } from "lucide-react";
import Link from "next/link";

export default function AiEnhancedNotes({ materialId }: { materialId?: string }) {
  const [accessLevel, setAccessLevel] = useState<"free" | "pro" | "ultra" | "checking">("checking");

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    async function checkAccess() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setAccessLevel("free");
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("subscription_status")
        .eq("id", user.id)
        .single();
        
      if (profile) {
        setAccessLevel(profile.subscription_status as any);
      }
    }
    checkAccess();
  }, [supabase]);

  return (
    <div className="w-full h-full bg-[#F3FAF6] border-l border-[#1B4332]/10 p-6 flex flex-col">
      <div className="flex items-center gap-2 mb-6 text-[#1B4332]">
        <Sparkles className="w-5 h-5 text-[#2E8B57]" />
        <h2 className="font-semibold text-lg">AI Enhanced Notes</h2>
      </div>

      {accessLevel === "checking" ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-pulse w-8 h-8 rounded-full border-4 border-[#2E8B57] border-t-transparent animate-spin" />
        </div>
      ) : accessLevel === "pro" || accessLevel === "ultra" ? (
        <div className="flex-1 overflow-y-auto pr-2 space-y-4">
          <div className="p-4 bg-white rounded-xl border border-[#1B4332]/5 shadow-sm">
            <h4 className="font-medium text-[#1B4332] mb-2">Key Concept</h4>
            <p className="text-sm text-[#6B7280] leading-relaxed">
              The AI has identified the most important definitions and formulas from this section. They will appear here dynamically based on what you are reading.
            </p>
          </div>
          {/* Real AI notes integration would go here */}
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
          <div className="w-16 h-16 bg-[#2E8B57]/10 rounded-full flex items-center justify-center mb-4">
            <Lock className="w-8 h-8 text-[#2E8B57]" />
          </div>
          <h3 className="text-xl font-semibold text-[#1B4332] mb-2">Pro Feature</h3>
          <p className="text-sm text-[#6B7280] mb-8">
            Upgrade to CampusIQ Pro to unlock AI-generated summaries, key takeaways, and flashcards for all your course materials.
          </p>
          <Link href="/pricing" className="w-full">
            <button className="w-full py-3 bg-[#2E8B57] text-white font-semibold rounded-xl hover:bg-[#256d46] transition-colors">
              Upgrade to Pro
            </button>
          </Link>
        </div>
      )}
    </div>
  );
}
