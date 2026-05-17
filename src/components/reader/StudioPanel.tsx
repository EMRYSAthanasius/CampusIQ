"use client";

import { Sparkles, StickyNote, Trophy, Zap, ChevronRight } from 'lucide-react';
import AiEnhancedNotes from './AiEnhancedNotes';

export default function StudioPanel({ materialId }: { materialId?: string }) {
  return (
    <div className="h-full flex flex-col bg-slate-50 dark:bg-zinc-950 overflow-hidden transition-colors duration-300">
      <div className="px-6 py-4 border-b border-slate-200 dark:border-zinc-800 flex items-center gap-2 shrink-0 bg-white dark:bg-zinc-900">
        <Sparkles className="w-4 h-4 text-emerald-600" />
        <h2 className="text-sm font-semibold text-slate-800 dark:text-zinc-100">Studio & Utilities</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Grid Matrix of Utility Blocks */}
        <div className="grid grid-cols-1 gap-3">
          <button className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-zinc-900/80 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-900 dark:text-zinc-100 border border-slate-200/40 dark:border-zinc-800/60 rounded-2xl transition-all text-left group shadow-sm cursor-pointer">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-zinc-800 flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform">
              <StickyNote className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-zinc-100">AI Enhanced Notes</h3>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-tight">Smart summaries & key insights</p>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-300 dark:text-zinc-650 group-hover:text-emerald-500 transition-colors" />
          </button>

          <button className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-zinc-900/80 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-900 dark:text-zinc-100 border border-slate-200/40 dark:border-zinc-800/60 rounded-2xl transition-all text-left group shadow-sm cursor-pointer">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-zinc-800 flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform">
              <Trophy className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-zinc-100">Quick Quiz / Mock Tests</h3>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-tight">Test your knowledge instantly</p>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-300 dark:text-zinc-650 group-hover:text-emerald-500 transition-colors" />
          </button>

          <button className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-zinc-900/80 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-900 dark:text-zinc-100 border border-slate-200/40 dark:border-zinc-800/60 rounded-2xl transition-all text-left group shadow-sm cursor-pointer">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-zinc-800 flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform">
              <Zap className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-zinc-100">Flashcards</h3>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-tight">Active recall for better retention</p>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-300 dark:text-zinc-650 group-hover:text-emerald-500 transition-colors" />
          </button>
        </div>

        {/* Active Tool View - Defaulting to Notes for now */}
        <div className="pt-4 border-t border-slate-200 dark:border-zinc-800">
           <AiEnhancedNotes materialId={materialId} />
        </div>
      </div>
    </div>
  );
}
