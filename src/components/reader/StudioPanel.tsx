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

      <div className="flex-1 overflow-y-auto p-4 space-y-6 hide-scrollbar">
        {/* Grid Matrix of Utility Blocks */}
        <div className="grid grid-cols-1 gap-3">
          <button className="flex items-center gap-4 p-4 bg-white dark:bg-zinc-900/50 hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-900 dark:text-zinc-100 border border-slate-200/60 dark:border-zinc-800/80 rounded-2xl transition-all duration-300 text-left group shadow-sm hover:shadow-md cursor-pointer relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/0 via-emerald-500/0 to-emerald-500/5 dark:to-emerald-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-zinc-800 border border-emerald-100/50 dark:border-zinc-700/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300 relative z-10">
              <StickyNote className="w-5 h-5" />
            </div>
            <div className="flex-1 relative z-10">
              <h3 className="text-sm font-semibold text-slate-800 dark:text-zinc-100 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">AI Enhanced Notes</h3>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-tight mt-0.5">Smart summaries & key insights</p>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-300 dark:text-zinc-600 group-hover:text-emerald-500 transition-colors relative z-10 group-hover:translate-x-1" />
          </button>

          <button className="flex items-center gap-4 p-4 bg-white dark:bg-zinc-900/50 hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-900 dark:text-zinc-100 border border-slate-200/60 dark:border-zinc-800/80 rounded-2xl transition-all duration-300 text-left group shadow-sm hover:shadow-md cursor-pointer relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-amber-500/0 via-amber-500/0 to-amber-500/5 dark:to-amber-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-zinc-800 border border-amber-100/50 dark:border-zinc-700/50 flex items-center justify-center text-amber-600 dark:text-amber-400 group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-300 relative z-10">
              <Trophy className="w-5 h-5" />
            </div>
            <div className="flex-1 relative z-10">
              <h3 className="text-sm font-semibold text-slate-800 dark:text-zinc-100 group-hover:text-amber-700 dark:group-hover:text-amber-400 transition-colors">Quick Quiz / Mock Tests</h3>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-tight mt-0.5">Test your knowledge instantly</p>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-300 dark:text-zinc-600 group-hover:text-amber-500 transition-colors relative z-10 group-hover:translate-x-1" />
          </button>

          <button className="flex items-center gap-4 p-4 bg-white dark:bg-zinc-900/50 hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-900 dark:text-zinc-100 border border-slate-200/60 dark:border-zinc-800/80 rounded-2xl transition-all duration-300 text-left group shadow-sm hover:shadow-md cursor-pointer relative overflow-hidden">
             <div className="absolute inset-0 bg-gradient-to-r from-violet-500/0 via-violet-500/0 to-violet-500/5 dark:to-violet-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="w-10 h-10 rounded-xl bg-violet-50 dark:bg-zinc-800 border border-violet-100/50 dark:border-zinc-700/50 flex items-center justify-center text-violet-600 dark:text-violet-400 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300 relative z-10">
              <Zap className="w-5 h-5" />
            </div>
            <div className="flex-1 relative z-10">
              <h3 className="text-sm font-semibold text-slate-800 dark:text-zinc-100 group-hover:text-violet-700 dark:group-hover:text-violet-400 transition-colors">Flashcards</h3>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-tight mt-0.5">Active recall for better retention</p>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-300 dark:text-zinc-600 group-hover:text-violet-500 transition-colors relative z-10 group-hover:translate-x-1" />
          </button>
        </div>

        {/* Active Tool View - Defaulting to Notes for now */}
        <div className="pt-6 mt-6 border-t border-slate-200/60 dark:border-zinc-800/80">
           <AiEnhancedNotes materialId={materialId} />
        </div>
      </div>
    </div>
  );
}
