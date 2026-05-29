"use client";

import { useState } from "react";
import { Sparkles, StickyNote, Trophy, Zap } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import AiEnhancedNotes from "./AiEnhancedNotes";
import QuickQuizPanel from "./QuickQuizPanel";
import FlashcardsPanel from "./FlashcardsPanel";

export default function StudioPanel({ materialId }: { materialId?: string }) {
  const [activeTool, setActiveTool] = useState<"notes" | "quiz" | "flashcards">("notes");

  return (
    <div className="h-full flex flex-col bg-slate-50 dark:bg-zinc-950 overflow-hidden transition-colors duration-300">
      {/* Header with Segmented Tool Switcher */}
      <div className="px-5 py-4 border-b border-slate-200 dark:border-zinc-800 flex flex-col gap-3 shrink-0 bg-white dark:bg-zinc-900 shadow-sm">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-600 animate-pulse" />
          <h2 className="text-xs font-black text-slate-800 dark:text-zinc-150 uppercase tracking-widest font-mono">Workspace Studio</h2>
        </div>

        {/* Premium Segmented Switcher */}
        <div className="flex bg-slate-100 dark:bg-zinc-950 p-1 rounded-2xl border border-slate-200/40 dark:border-zinc-800/80">
          <button
            onClick={() => setActiveTool("notes")}
            className={`flex-1 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-1.5 cursor-pointer select-none ${
              activeTool === "notes"
                ? "bg-white dark:bg-zinc-800 text-emerald-600 dark:text-emerald-450 shadow-sm border border-slate-200/40 dark:border-zinc-700/50"
                : "text-slate-500 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-zinc-200"
            }`}
          >
            <StickyNote className="w-3.5 h-3.5" />
            <span>Notes</span>
          </button>
          
          <button
            onClick={() => setActiveTool("quiz")}
            className={`flex-1 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-1.5 cursor-pointer select-none ${
              activeTool === "quiz"
                ? "bg-white dark:bg-zinc-800 text-amber-600 dark:text-amber-455 shadow-sm border border-slate-200/40 dark:border-zinc-700/50"
                : "text-slate-500 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-zinc-200"
            }`}
          >
            <Trophy className="w-3.5 h-3.5" />
            <span>CBT Quiz</span>
          </button>
          
          <button
            onClick={() => setActiveTool("flashcards")}
            className={`flex-1 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-1.5 cursor-pointer select-none ${
              activeTool === "flashcards"
                ? "bg-white dark:bg-zinc-800 text-violet-600 dark:text-violet-450 shadow-sm border border-slate-200/40 dark:border-zinc-700/50"
                : "text-slate-500 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-zinc-200"
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Flashcards</span>
          </button>
        </div>
      </div>

      {/* Active Tool View Container - No outer scrollbar so child components expand to full height */}
      <div className="flex-1 p-5 overflow-hidden flex flex-col min-h-0">
        <AnimatePresence mode="wait">
          {activeTool === "notes" && (
            <motion.div
              key="notes"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
              className="w-full h-full flex flex-col min-h-0 overflow-hidden"
            >
              <AiEnhancedNotes materialId={materialId} />
            </motion.div>
          )}

          {activeTool === "quiz" && (
            <motion.div
              key="quiz"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
              className="w-full h-full flex flex-col min-h-0 overflow-hidden"
            >
              <QuickQuizPanel materialId={materialId} />
            </motion.div>
          )}

          {activeTool === "flashcards" && (
            <motion.div
              key="flashcards"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
              className="w-full h-full flex flex-col min-h-0 overflow-hidden"
            >
              <FlashcardsPanel materialId={materialId} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

