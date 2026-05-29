"use client";

import { useState, useEffect } from "react";
import { Sparkles, Zap, HelpCircle, Check, RefreshCw, ChevronLeft, ChevronRight, X, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Flashcard {
  front: string;
  back: string;
}

export default function FlashcardsPanel({ materialId }: { materialId?: string }) {
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [masteredList, setMasteredList] = useState<Record<number, "mastered" | "practice">>({});
  const [stage, setStage] = useState<"generate" | "study" | "completed">("generate");

  // Load saved state from localStorage
  useEffect(() => {
    if (materialId) {
      const saved = localStorage.getItem(`campusiq-flashcards-${materialId}`);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setCards(parsed.cards || []);
          setCurrentIndex(parsed.currentIndex || 0);
          setIsFlipped(parsed.isFlipped || false);
          setMasteredList(parsed.masteredList || {});
          setStage(parsed.stage || "generate");
        } catch {}
      }
    }
  }, [materialId]);

  // Save state helper
  const saveState = (updated: Partial<{ cards: Flashcard[], currentIndex: number, isFlipped: boolean, masteredList: Record<number, "mastered" | "practice">, stage: "generate" | "study" | "completed" }>) => {
    if (!materialId) return;
    const current = {
      cards: updated.cards !== undefined ? updated.cards : cards,
      currentIndex: updated.currentIndex !== undefined ? updated.currentIndex : currentIndex,
      isFlipped: updated.isFlipped !== undefined ? updated.isFlipped : isFlipped,
      masteredList: updated.masteredList !== undefined ? updated.masteredList : masteredList,
      stage: updated.stage !== undefined ? updated.stage : stage,
    };
    localStorage.setItem(`campusiq-flashcards-${materialId}`, JSON.stringify(current));
  };

  const generateCards = async () => {
    if (!materialId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/workspace/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ materialId, type: "flashcards" }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to generate cards");

      const generated = result.data || [];
      setCards(generated);
      setCurrentIndex(0);
      setIsFlipped(false);
      setMasteredList({});
      setStage("study");
      saveState({ cards: generated, currentIndex: 0, isFlipped: false, masteredList: {}, stage: "study" });
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to connect to generator.");
    } finally {
      setLoading(false);
    }
  };

  const handleFlip = () => {
    const nextFlipped = !isFlipped;
    setIsFlipped(nextFlipped);
    saveState({ isFlipped: nextFlipped });
  };

  const handleMark = (status: "mastered" | "practice") => {
    const nextMastered = { ...masteredList, [currentIndex]: status };
    setMasteredList(nextMastered);
    saveState({ masteredList: nextMastered });

    // Auto navigate to next card or finish study session
    setTimeout(() => {
      if (currentIndex < cards.length - 1) {
        const nextIndex = currentIndex + 1;
        setCurrentIndex(nextIndex);
        setIsFlipped(false);
        saveState({ currentIndex: nextIndex, isFlipped: false, masteredList: nextMastered });
      } else {
        setStage("completed");
        saveState({ stage: "completed", masteredList: nextMastered });
      }
    }, 300);
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      const nextIndex = currentIndex - 1;
      setCurrentIndex(nextIndex);
      setIsFlipped(false);
      saveState({ currentIndex: nextIndex, isFlipped: false });
    }
  };

  const handleRestart = () => {
    setCards([]);
    setStage("generate");
    if (materialId) localStorage.removeItem(`campusiq-flashcards-${materialId}`);
  };

  const masteredCount = Object.values(masteredList).filter(s => s === "mastered").length;

  return (
    <div className="w-full flex flex-col h-full overflow-hidden select-text">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4 text-slate-800 dark:text-zinc-100 shrink-0">
        <Zap className="w-4 h-4 text-violet-500" />
        <h2 className="font-semibold text-sm">Active Recall Flashcards</h2>
      </div>

      <div className="flex-1 overflow-y-auto pr-1 min-h-0">
        <AnimatePresence mode="wait">

          {stage === "generate" && (
            <motion.div
              key="generate"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="text-center py-10 px-4 bg-white dark:bg-zinc-900 border border-slate-150 dark:border-zinc-800 rounded-3xl space-y-4"
            >
              <div className="w-12 h-12 bg-violet-50 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto text-violet-500">
                <Zap className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-800 dark:text-zinc-150">Active Recall Cards</h4>
                <p className="text-xs text-slate-550 dark:text-zinc-400 max-w-xs mx-auto mt-1 leading-normal">
                  Convert this manual chapter into interactive flashcards. Perfect for memorizing terms, formulas, and concepts.
                </p>
              </div>

              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/40 rounded-xl text-xs text-red-655 dark:text-red-400 font-bold flex items-center justify-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {loading ? (
                <div className="py-4 space-y-2">
                  <RefreshCw className="w-7 h-7 text-violet-550 animate-spin mx-auto" />
                  <p className="text-xs font-bold text-slate-700 dark:text-zinc-300 animate-pulse">Compiling study deck...</p>
                </div>
              ) : (
                <button
                  onClick={generateCards}
                  className="w-full py-3 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-violet-55 cursor-pointer"
                >
                  Generate Flashcards
                </button>
              )}
            </motion.div>
          )}

          {stage === "study" && cards.length > 0 && (
            <motion.div
              key="study"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="space-y-6"
            >
              {/* Progress bar */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-450 dark:text-zinc-500">
                  <span>Card {currentIndex + 1} of {cards.length}</span>
                  <span className="text-violet-600 dark:text-violet-400">Mastered: {masteredCount}/{cards.length}</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-zinc-850 h-1.5 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-violet-500 rounded-full transition-all duration-300"
                    style={{ width: `${((currentIndex + 1) / cards.length) * 100}%` }}
                  />
                </div>
              </div>

              {/* 3D-effect flip card container */}
              {cards[currentIndex] && (
                <div 
                  onClick={handleFlip}
                  className="w-full h-56 md:h-64 cursor-pointer perspective"
                >
                  <div className={`relative w-full h-full duration-500 transform-style-3d ${isFlipped ? "rotate-y-180" : ""}`}>
                    
                    {/* Front of Card */}
                    <div className="absolute inset-0 bg-white dark:bg-zinc-900 border border-slate-150 dark:border-zinc-800 rounded-[2rem] shadow-md p-6 flex flex-col items-center justify-center text-center backface-hidden">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block font-mono mb-4">Prompt / Question</span>
                      <h3 className="text-sm font-bold text-slate-800 dark:text-zinc-100 leading-relaxed max-w-xs px-2">
                        {cards[currentIndex].front}
                      </h3>
                      <span className="text-[9px] font-bold text-violet-500 uppercase tracking-wider mt-8 animate-pulse">Click card to reveal answer</span>
                    </div>

                    {/* Back of Card */}
                    <div className="absolute inset-0 bg-slate-50 dark:bg-zinc-850 border border-violet-100 dark:border-violet-900/50 rounded-[2rem] shadow-inner p-6 flex flex-col items-center justify-center text-center rotate-y-180 backface-hidden">
                      <span className="text-[10px] font-black text-violet-600 dark:text-violet-400 uppercase tracking-widest block font-mono mb-4">Concept / Answer</span>
                      <p className="text-xs text-slate-750 dark:text-zinc-200 leading-relaxed font-semibold max-w-xs px-2">
                        {cards[currentIndex].back}
                      </p>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-8">Click card to hide</span>
                    </div>

                  </div>
                </div>
              )}

              {/* Swipe Action Buttons */}
              <div className="flex gap-4">
                <button
                  onClick={() => handleMark("practice")}
                  className="flex-1 py-3 bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-900/30 border border-red-100 dark:border-red-900/40 rounded-xl text-red-750 dark:text-red-400 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <X className="w-4 h-4 shrink-0" />
                  <span>Practice More</span>
                </button>
                <button
                  onClick={() => handleMark("mastered")}
                  className="flex-1 py-3 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/20 dark:hover:bg-emerald-900/30 border border-emerald-100 dark:border-emerald-900/40 rounded-xl text-emerald-750 dark:text-emerald-400 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Check className="w-4 h-4 shrink-0" />
                  <span>Mastered</span>
                </button>
              </div>

              {/* Navigation Footer */}
              <div className="flex justify-between items-center pt-2">
                <button
                  disabled={currentIndex === 0}
                  onClick={handlePrev}
                  className="flex items-center gap-1 text-xs font-bold text-slate-400 hover:text-slate-700 disabled:opacity-0 transition-all cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" /> Previous
                </button>
                
                <span className="text-[10px] text-slate-400 dark:text-zinc-550 font-bold uppercase">Manual CBT Study Mode</span>
              </div>

            </motion.div>
          )}

          {stage === "completed" && (
            <motion.div
              key="completed"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="text-center py-10 px-6 bg-white dark:bg-zinc-900 border border-slate-150 dark:border-zinc-800 rounded-3xl space-y-6"
            >
              <div className="w-20 h-20 bg-violet-500/10 rounded-full flex items-center justify-center mx-auto text-violet-500 border border-violet-500/20">
                <Zap className="w-10 h-10" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-black text-slate-800 dark:text-zinc-150">Study Deck Completed!</h3>
                <p className="text-xs text-slate-550 dark:text-zinc-400 font-medium max-w-xs mx-auto">
                  Excellent retention training! Active recall flashcards combined with spaced repetition fully cement concepts in long-term memory.
                </p>
              </div>

              <div className="py-4 px-6 bg-slate-50 dark:bg-[#161719] rounded-2xl border border-slate-200/50 dark:border-zinc-800/80 max-w-max mx-auto flex items-baseline gap-1.5">
                <span className="text-3xl font-black text-slate-800 dark:text-zinc-100">{masteredCount}</span>
                <span className="text-sm text-slate-400">/ {cards.length} Mastered</span>
                <span className="text-xs font-bold text-violet-500 ml-4">
                  {Math.round((masteredCount / cards.length) * 100)}% Mastery
                </span>
              </div>

              <button
                onClick={handleRestart}
                className="w-full py-3.5 bg-violet-600 hover:bg-violet-750 text-white text-xs font-black rounded-xl transition-all shadow-md shadow-violet-55 cursor-pointer uppercase tracking-wider"
              >
                Study Deck Again
              </button>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
      
      {/* 3D Perspective CSS helpers */}
      <style>{`
        .perspective {
          perspective: 1000px;
        }
        .transform-style-3d {
          transform-style: preserve-3d;
        }
        .backface-hidden {
          backface-visibility: hidden;
        }
        .rotate-y-180 {
          transform: rotateY(180deg);
        }
      `}</style>
    </div>
  );
}
