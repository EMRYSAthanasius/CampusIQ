"use client";

import { useState, useEffect } from "react";
import { Sparkles, Trophy, HelpCircle, CheckCircle2, XCircle, RefreshCw, ChevronRight, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: string; // "A", "B", "C", "D"
  explanation: string;
}

export default function QuickQuizPanel({ materialId }: { materialId?: string }) {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stage, setStage] = useState<"generate" | "active" | "results">("generate");

  // Load saved quiz from localStorage on mount if available
  useEffect(() => {
    if (materialId) {
      const saved = localStorage.getItem(`campusiq-quickquiz-${materialId}`);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setTimeout(() => {
            setQuestions(parsed.questions || []);
            setCurrentIndex(parsed.currentIndex || 0);
            setSelectedOption(parsed.selectedOption || null);
            setScore(parsed.score || 0);
            setStage(parsed.stage || "generate");
          }, 0);
        } catch {}
      }
    }
  }, [materialId]);

  // Defensive check: if stage is "active" or "results" but there are no questions, fall back to "generate"
  useEffect(() => {
    if ((stage === "active" || stage === "results") && questions.length === 0 && !loading) {
      const timer = setTimeout(() => {
        setStage("generate");
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [stage, questions, loading]);

  // Save state to localStorage on update
  const saveState = (updated: Partial<{ questions: QuizQuestion[], currentIndex: number, selectedOption: string | null, score: number, stage: "generate" | "active" | "results" }>) => {
    if (!materialId) return;
    const current = {
      questions: updated.questions !== undefined ? updated.questions : questions,
      currentIndex: updated.currentIndex !== undefined ? updated.currentIndex : currentIndex,
      selectedOption: updated.selectedOption !== undefined ? updated.selectedOption : selectedOption,
      score: updated.score !== undefined ? updated.score : score,
      stage: updated.stage !== undefined ? updated.stage : stage,
    };
    localStorage.setItem(`campusiq-quickquiz-${materialId}`, JSON.stringify(current));
  };

  const generateQuiz = async () => {
    if (!materialId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/workspace/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ materialId, type: "quiz" }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to generate quiz");

      let generated = result.data || [];
      if (!Array.isArray(generated)) {
        if (generated && typeof generated === "object") {
          const keys = Object.keys(generated);
          const typedGenerated = generated as Record<string, unknown>;
          const arrayKey = keys.find(k => Array.isArray(typedGenerated[k]));
          if (arrayKey) {
            generated = typedGenerated[arrayKey] as QuizQuestion[];
          } else {
            generated = [];
          }
        } else {
          generated = [];
        }
      }

      if (generated.length === 0) {
        throw new Error("No quiz questions could be parsed from the response.");
      }

      setQuestions(generated);
      setCurrentIndex(0);
      setSelectedOption(null);
      setScore(0);
      setStage("active");
      saveState({ questions: generated, currentIndex: 0, selectedOption: null, score: 0, stage: "active" });
    } catch (err: unknown) {
      console.error(err);
      const message = err instanceof Error ? err.message : "Failed to connect to generator.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectOption = (optionLetter: string) => {
    if (selectedOption) return; // Prevent changing answer
    setSelectedOption(optionLetter);
    
    const isCorrect = optionLetter === questions[currentIndex].correctAnswer;
    const nextScore = isCorrect ? score + 1 : score;
    if (isCorrect) setScore(nextScore);

    saveState({ selectedOption: optionLetter, score: nextScore });
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      setSelectedOption(null);
      saveState({ currentIndex: nextIndex, selectedOption: null });
    } else {
      setStage("results");
      saveState({ stage: "results" });
    }
  };

  const handleRestart = () => {
    setQuestions([]);
    setStage("generate");
    if (materialId) localStorage.removeItem(`campusiq-quickquiz-${materialId}`);
  };

  return (
    <div className="w-full flex flex-col h-full overflow-hidden select-text">
      <div className="flex items-center gap-2.5 mb-4 text-slate-800 dark:text-zinc-100 shrink-0 group">
        <div className="p-1 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-100/50 dark:border-amber-900/30 text-amber-600 dark:text-amber-500 shadow-sm shrink-0 flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
          <Trophy className="w-4 h-4 stroke-[1.8]" />
        </div>
        <h2 className="font-bold text-xs uppercase tracking-widest font-sans">Quick CBT Quiz</h2>
      </div>

      <div className="flex-1 overflow-y-auto pr-1 min-h-0">
        <AnimatePresence mode="wait">
          
          {stage === "generate" && (
            <motion.div
              key="generate"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="text-center py-10 px-4 bg-white dark:bg-zinc-900 border border-slate-150 dark:border-zinc-800 rounded-3xl space-y-4 group"
            >
              <div className="w-14 h-14 bg-amber-50 dark:bg-amber-950/30 border border-amber-100/50 dark:border-amber-900/30 rounded-2xl flex items-center justify-center mx-auto text-amber-605 dark:text-amber-500 shadow-sm transition-transform duration-500 group-hover:scale-110 group-hover:rotate-12">
                <HelpCircle className="w-6 h-6 animate-pulse stroke-[1.8]" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-800 dark:text-zinc-100">CBT Mini-Exams</h4>
                <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-xs mx-auto mt-1 leading-normal">
                  Generate 12 custom conceptual questions directly from this section to test your retention instantly.
                </p>
              </div>

              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/40 rounded-xl text-xs text-red-650 dark:text-red-400 font-bold flex items-center justify-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {loading ? (
                <div className="py-4 space-y-2">
                  <RefreshCw className="w-7 h-7 text-amber-500 animate-spin mx-auto" />
                  <p className="text-xs font-bold text-slate-700 dark:text-zinc-300 animate-pulse">Generating your CBT test...</p>
                </div>
              ) : (
                <button
                  onClick={generateQuiz}
                  className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-amber-55 cursor-pointer"
                >
                  Generate Quick Quiz
                </button>
              )}
            </motion.div>
          )}

          {stage === "active" && questions.length > 0 && (
            <motion.div
              key="active"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="space-y-6"
            >
              {/* Progress bar */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-450 dark:text-zinc-500">
                  <span>Question {currentIndex + 1} of {questions.length}</span>
                  <span className="text-amber-600 dark:text-amber-400">Score: {score}/{questions.length}</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-zinc-850 h-1.5 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-amber-500 rounded-full transition-all duration-300"
                    style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
                  />
                </div>
              </div>

              {/* Question card */}
              {questions[currentIndex] && (
                <>
                  <div className="p-5 bg-white dark:bg-zinc-900 border border-slate-150 dark:border-zinc-800 rounded-3xl shadow-sm space-y-4">
                    <h3 className="text-sm font-bold text-slate-800 dark:text-zinc-100 leading-snug">
                      {questions[currentIndex].question}
                    </h3>
                  </div>

                  {/* Options */}
                  <div className="space-y-2.5">
                    {(questions[currentIndex].options || []).map((opt, idx) => {
                      const letter = String.fromCharCode(65 + idx); // "A", "B", etc.
                      const isSelected = selectedOption === letter;
                      const isCorrect = questions[currentIndex].correctAnswer === letter;
                      const showCorrectStatus = selectedOption && isCorrect;
                      const showIncorrectStatus = selectedOption && isSelected && !isCorrect;

                      let style = "bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-850";

                      if (showCorrectStatus) {
                        style = "bg-emerald-50 dark:bg-[#1a2b22] border-emerald-500 dark:border-emerald-700 text-emerald-800 dark:text-emerald-400";
                      } else if (showIncorrectStatus) {
                        style = "bg-red-50 dark:bg-[#2b1a1a] border-red-500 dark:border-red-700 text-red-800 dark:text-red-400";
                      }

                      return (
                        <button
                          key={idx}
                          onClick={() => handleSelectOption(letter)}
                          className={`w-full text-left p-4 rounded-xl border transition-all flex items-start gap-3 cursor-pointer text-xs font-semibold leading-relaxed ${style}`}
                        >
                          <span className={`font-black ${isSelected ? "text-inherit" : "text-slate-400"}`}>{letter}.</span>
                          <span className="flex-1">{opt}</span>
                          {showCorrectStatus && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
                          {showIncorrectStatus && <XCircle className="w-4 h-4 text-red-650 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}

              {/* Explanation overlay */}
              {selectedOption && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-5 bg-slate-100/50 dark:bg-[#161719] border border-slate-200/50 dark:border-zinc-800/80 rounded-3xl space-y-2"
                >
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                    <div className="p-1 rounded bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100/50 dark:border-emerald-900/30 text-emerald-600 dark:text-emerald-400 shadow-sm shrink-0 flex items-center justify-center">
                      <Sparkles className="w-3.5 h-3.5 stroke-[1.8] animate-pulse" />
                    </div>
                    <span>Explanation</span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-zinc-400 leading-relaxed font-semibold">
                    {questions[currentIndex].explanation}
                  </p>
                </motion.div>
              )}

              {/* Next navigation */}
              {selectedOption && (
                <button
                  onClick={handleNext}
                  className="w-full py-3.5 bg-slate-900 dark:bg-zinc-800 hover:bg-slate-800 text-white dark:text-zinc-100 text-xs font-black rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer uppercase tracking-wider"
                >
                  <span>{currentIndex === questions.length - 1 ? "Finish Quiz" : "Next Question"}</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </motion.div>
          )}

          {stage === "results" && (
            <motion.div
              key="results"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="text-center py-10 px-6 bg-white dark:bg-zinc-900 border border-slate-150 dark:border-zinc-800 rounded-3xl space-y-6 group"
            >
              <div className="w-20 h-20 bg-amber-50 dark:bg-amber-950/30 border border-amber-100/50 dark:border-amber-900/30 rounded-3xl flex items-center justify-center mx-auto text-amber-600 dark:text-amber-500 shadow-sm transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6">
                <Trophy className="w-10 h-10 stroke-[1.6]" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-black text-slate-800 dark:text-zinc-100">CBT Quiz Completed!</h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400 font-medium max-w-xs mx-auto">
                  Excellent work practicing active recall. Regular CBT practice is proven to improve grades by up to 28%!
                </p>
              </div>

              <div className="py-4 px-6 bg-slate-50 dark:bg-[#161719] rounded-2xl border border-slate-200/50 dark:border-zinc-800/80 max-w-max mx-auto flex items-baseline gap-1.5">
                <span className="text-3xl font-black text-slate-800 dark:text-zinc-100">{score}</span>
                <span className="text-sm text-slate-400">/ {questions.length} Correct</span>
                <span className="text-xs font-bold text-emerald-500 ml-4">
                  {Math.round((score / questions.length) * 100)}%
                </span>
              </div>

              <button
                onClick={handleRestart}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl transition-all shadow-md shadow-emerald-55 cursor-pointer uppercase tracking-wider"
              >
                Restart CBT Session
              </button>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
