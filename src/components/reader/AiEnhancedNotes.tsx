"use client";

import { useState, useEffect } from "react";
import { Sparkles, StickyNote, BookOpen, BrainCircuit, RefreshCw, PenTool, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface KeyConcept {
  concept: string;
  description: string;
}

interface AiNotesData {
  summary: string;
  keyConcepts: KeyConcept[];
  takeaways: string[];
}

export default function AiEnhancedNotes({ materialId }: { materialId?: string }) {
  const [activeSubTab, setActiveSubTab] = useState<"guide" | "scratchpad">("guide");
  const [notes, setNotes] = useState("");
  const [aiNotes, setAiNotes] = useState<AiNotesData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Load scratchpad from localStorage on mount
  useEffect(() => {
    if (materialId) {
      const saved = localStorage.getItem(`campusiq-notes-${materialId}`);
      if (saved) setNotes(saved);
      
      const savedAi = localStorage.getItem(`campusiq-ainotes-${materialId}`);
      if (savedAi) {
        try {
          setAiNotes(JSON.parse(savedAi));
        } catch {}
      }
    }
  }, [materialId]);

  // Handle auto-saving custom notes to localStorage
  useEffect(() => {
    if (!materialId || !notes) return;
    setIsSaving(true);
    const delay = setTimeout(() => {
      localStorage.setItem(`campusiq-notes-${materialId}`, notes);
      setIsSaving(false);
    }, 1000);
    return () => clearTimeout(delay);
  }, [notes, materialId]);

  // Listen to chatbot "save to note" events
  useEffect(() => {
    const handleSaveNote = (event: any) => {
      const newNote = event.detail;
      setNotes(prev => prev ? `${prev}\n\n---\n\n${newNote}` : newNote);
      setActiveSubTab("scratchpad");
    };

    window.addEventListener("campus-iq-save-note", handleSaveNote);
    return () => window.removeEventListener("campus-iq-save-note", handleSaveNote);
  }, []);

  const generateAiNotes = async () => {
    if (!materialId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/workspace/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ materialId, type: "notes" }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to generate AI notes");
      
      setAiNotes(result.data);
      localStorage.setItem(`campusiq-ainotes-${materialId}`, JSON.stringify(result.data));
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full flex flex-col h-full overflow-hidden">
      {/* Sub tabs */}
      <div className="flex items-center gap-2 mb-4 shrink-0 bg-slate-100/80 dark:bg-zinc-900/60 p-1.5 rounded-xl border border-slate-200/50 dark:border-zinc-800/80">
        <button
          onClick={() => setActiveSubTab("guide")}
          className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeSubTab === "guide"
              ? "bg-white dark:bg-zinc-800 text-slate-800 dark:text-zinc-100 shadow-sm"
              : "text-slate-550 dark:text-zinc-400 hover:text-slate-700 hover:bg-white/30 dark:hover:bg-zinc-800/20"
          }`}
        >
          <BrainCircuit className="w-3.5 h-3.5" />
          <span>AI Study Guide</span>
        </button>
        <button
          onClick={() => setActiveSubTab("scratchpad")}
          className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeSubTab === "scratchpad"
              ? "bg-white dark:bg-zinc-800 text-slate-800 dark:text-zinc-100 shadow-sm"
              : "text-slate-550 dark:text-zinc-400 hover:text-slate-700 hover:bg-white/30 dark:hover:bg-zinc-800/20"
          }`}
        >
          <PenTool className="w-3.5 h-3.5" />
          <span>My Scratchpad</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 pr-1 select-text">
        <AnimatePresence mode="wait">
          {activeSubTab === "guide" ? (
            <motion.div
              key="guide"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.15 }}
              className="space-y-5"
            >
              {!aiNotes && !loading && (
                <div className="text-center py-10 px-4 bg-white dark:bg-zinc-900 border border-slate-150 dark:border-zinc-800 rounded-3xl space-y-4">
                  <div className="w-12 h-12 bg-emerald-50 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto text-emerald-600">
                    <Sparkles className="w-6 h-6 animate-pulse" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-800 dark:text-zinc-150">Generate AI Summary</h4>
                    <p className="text-xs text-slate-550 dark:text-zinc-400 max-w-xs mx-auto mt-1 leading-normal">
                      Let CampusIQ analyze this document to generate structured notes, core concepts, and takeaways.
                    </p>
                  </div>
                  <button
                    onClick={generateAiNotes}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-emerald-55 cursor-pointer"
                  >
                    Generate Study Guide
                  </button>
                </div>
              )}

              {loading && (
                <div className="text-center py-16 space-y-3 bg-white dark:bg-zinc-900 border border-slate-150 dark:border-zinc-800 rounded-3xl">
                  <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin mx-auto" />
                  <p className="text-xs font-bold text-slate-700 dark:text-zinc-300 animate-pulse">CampusIQ is digesting the material...</p>
                </div>
              )}

              {error && (
                <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/40 rounded-2xl text-center text-xs font-bold text-red-650 dark:text-red-400 space-y-2">
                  <p>{error}</p>
                  <button
                    onClick={generateAiNotes}
                    className="px-4 py-2 bg-red-100 dark:bg-red-900/30 rounded-lg hover:bg-red-200 transition-all cursor-pointer"
                  >
                    Retry Generation
                  </button>
                </div>
              )}

              {aiNotes && !loading && (
                <div className="space-y-6">
                  {/* Summary Card */}
                  <div className="p-5 bg-white dark:bg-zinc-900 border border-slate-150 dark:border-zinc-800 rounded-3xl shadow-sm space-y-2">
                    <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest block font-mono">Executive Summary</span>
                    <p className="text-xs text-slate-650 dark:text-zinc-300 leading-relaxed font-semibold">
                      {aiNotes.summary || "Executive summary not generated."}
                    </p>
                  </div>

                  {/* Concept breakdown */}
                  <div className="space-y-3">
                    <span className="text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest block font-mono">Core Concepts Dictionary</span>
                    <div className="space-y-2.5">
                      {(aiNotes.keyConcepts || (aiNotes as any).key_concepts || []).map((concept: any, idx: number) => (
                        <div key={idx} className="p-4 bg-slate-50 dark:bg-[#151618] border border-slate-200/50 dark:border-zinc-800/80 rounded-2xl">
                          <h4 className="text-xs font-bold text-slate-800 dark:text-zinc-100 flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                            {concept.concept || concept.name || "Concept"}
                          </h4>
                          <p className="text-[11px] text-slate-550 dark:text-zinc-400 mt-1 leading-relaxed font-medium">
                            {concept.description || concept.meaning || "No description provided."}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Key Takeaways */}
                  <div className="p-5 bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/10 dark:border-emerald-500/20 rounded-3xl space-y-3">
                    <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest block font-mono">Study Takeaways</span>
                    <ul className="space-y-2">
                      {(aiNotes.takeaways || (aiNotes as any).key_takeaways || []).map((item: string, idx: number) => (
                        <li key={idx} className="flex gap-2.5 items-start text-xs text-slate-700 dark:text-zinc-300 font-semibold leading-relaxed">
                          <CheckCircle2 className="w-4 h-4 text-emerald-550 shrink-0 mt-0.5" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Reset/Regenerate */}
                  <button
                    onClick={generateAiNotes}
                    className="w-full py-3 border border-dashed border-slate-200 dark:border-zinc-800 hover:border-emerald-500/30 hover:text-emerald-600 text-slate-400 dark:text-zinc-500 text-xs font-bold rounded-2xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Regenerate Study Guide
                  </button>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="scratchpad"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.15 }}
              className="flex flex-col h-72 md:h-96"
            >
              <div className="flex items-center justify-between mb-2 shrink-0">
                <span className="text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest font-mono">Custom Scratchpad</span>
                {isSaving ? (
                  <span className="text-[9px] text-slate-400 dark:text-zinc-500 animate-pulse">Typing...</span>
                ) : (
                  <span className="text-[9px] text-emerald-600 dark:text-emerald-500 font-bold uppercase tracking-wider">Auto-saved</span>
                )}
              </div>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Write your study notes, insights from reading, or questions here..."
                className="flex-1 w-full p-4 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-850 rounded-2xl text-xs text-slate-800 dark:text-zinc-150 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 outline-none resize-none placeholder-slate-400 dark:placeholder-zinc-650 transition-all font-semibold leading-relaxed shadow-inner"
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
