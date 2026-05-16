"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, X } from "lucide-react";

interface CitationBadgeProps {
  id: string;
  sourceText?: string;
}

export default function CitationBadge({ id, sourceText }: CitationBadgeProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isClicked, setIsClicked] = useState(false);

  const showPopover = isHovered || isClicked;

  return (
    <span className="relative inline-block align-baseline">
      <button
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={() => setIsClicked(!isClicked)}
        className="inline-flex items-center justify-center bg-slate-100 hover:bg-emerald-100 text-slate-600 hover:text-emerald-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full mx-1 border border-slate-200 cursor-pointer transition-all shadow-sm"
      >
        {id.length > 10 ? id.substring(0, 8) + "..." : id}
      </button>

      <AnimatePresence>
        {showPopover && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-4 bg-white rounded-xl shadow-xl border border-emerald-100 z-[100] pointer-events-auto"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-emerald-600 font-semibold text-[10px] uppercase tracking-wider">
                <BookOpen className="w-3 h-3" />
                Source Reference {id}
              </div>
              {isClicked && (
                <button onClick={() => setIsClicked(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
            
            <div className="text-[12px] leading-relaxed text-slate-600 italic">
              {sourceText ? (
                `"...${sourceText}..."`
              ) : (
                "Source content not available for this citation."
              )}
            </div>
            
            {/* Arrow */}
            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 w-2 h-2 bg-white border-r border-b border-emerald-100 rotate-45" />
          </motion.div>
        )}
      </AnimatePresence>
    </span>
  );
}
