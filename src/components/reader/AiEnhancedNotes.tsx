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

  const [notes, setNotes] = useState("");

  useEffect(() => {
    const handleSaveNote = (event: any) => {
      const newNote = event.detail;
      setNotes(prev => prev ? `${prev}\n\n---\n\n${newNote}` : newNote);
    };

    window.addEventListener('campus-iq-save-note', handleSaveNote);
    return () => window.removeEventListener('campus-iq-save-note', handleSaveNote);
  }, []);

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
    <div className="w-full flex flex-col overflow-hidden">
      <div className="flex items-center gap-2 mb-4 text-slate-800 dark:text-zinc-100 shrink-0">
        <Sparkles className="w-4 h-4 text-emerald-600" />
        <h2 className="font-semibold text-sm">Active Workspace</h2>
      </div>

      {accessLevel === "checking" ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-pulse w-8 h-8 rounded-full border-4 border-[#2E8B57] border-t-transparent animate-spin" />
        </div>
      ) : accessLevel === "pro" || accessLevel === "ultra" ? (
        <div className="flex-1 flex flex-col min-h-0 gap-6">
          <div className="flex-1 overflow-y-auto pr-2 space-y-4 hide-scrollbar">
            <h3 className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-500">AI Insights</h3>
            <div className="p-4 bg-white dark:bg-zinc-900 rounded-xl border border-slate-100 dark:border-zinc-800 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
              <h4 className="font-medium text-slate-800 dark:text-zinc-100 mb-2 text-sm">Key Concept</h4>
              <p className="text-[13px] text-slate-500 dark:text-zinc-400 leading-relaxed">
                The AI has identified the most important definitions and formulas from this section. They will appear here dynamically based on what you are reading.
              </p>
            </div>
            {/* Real AI notes integration would go here */}
          </div>

          <div className="h-1/2 flex flex-col gap-3 shrink-0">
            <div className="flex items-center justify-between">
              <h3 className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-500">My Workspace</h3>
              <div className="flex items-center gap-1.5">
                <div className="w-1 h-1 bg-emerald-600 rounded-full animate-pulse" />
                <span className="text-[10px] text-emerald-600 dark:text-emerald-500 font-medium">Auto-saving</span>
              </div>
            </div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Jot down your thoughts, questions, or key takeaways..."
              className="flex-1 w-full p-4 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl text-[13px] text-slate-800 dark:text-zinc-100 focus:ring-2 focus:ring-emerald-500/20 outline-none resize-none shadow-sm placeholder-slate-400 dark:placeholder-zinc-600 transition-all focus:border-emerald-500"
            />
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
          <div className="w-16 h-16 bg-emerald-600/10 dark:bg-emerald-500/10 rounded-full flex items-center justify-center mb-4">
            <Lock className="w-8 h-8 text-emerald-600 dark:text-emerald-500" />
          </div>
          <h3 className="text-xl font-semibold text-slate-800 dark:text-zinc-100 mb-2">Pro Feature</h3>
          <p className="text-sm text-slate-500 dark:text-zinc-400 mb-8">
            Upgrade to CampusIQ Pro to unlock AI-generated summaries, key takeaways, and flashcards for all your course materials.
          </p>
          <Link href="/pricing" className="w-full">
            <button className="w-full py-3 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-700 transition-colors shadow-md shadow-emerald-600/20 cursor-pointer">
              Upgrade to Pro
            </button>
          </Link>
        </div>
      )}
    </div>
  );
}
