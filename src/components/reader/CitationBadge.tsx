"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, X } from "lucide-react";

interface CitationBadgeProps {
  id: string;
  number?: number;
  sourceText?: string;
}

export default function CitationBadge({ id, number, sourceText }: CitationBadgeProps) {
  const [isOpen, setIsOpen] = useState(false);

  const displayNum = number ?? id;

  return (
    <span className="relative inline-block" style={{ verticalAlign: "super", lineHeight: 0 }}>
      {/* Superscript number badge */}
      <button
        onClick={() => setIsOpen((v) => !v)}
        style={{
          backdropFilter: "blur(20px) saturate(180%)",
          WebkitBackdropFilter: "blur(20px) saturate(180%)",
          background: "rgba(255,255,255,0.08)",
          border: "1px solid rgba(255,255,255,0.22)",
          boxShadow:
            "0 2px 8px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.25), inset 0 -1px 0 rgba(0,0,0,0.08)",
          fontSize: "9px",
          lineHeight: 1,
          width: "16px",
          height: "16px",
          borderRadius: "50%",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 700,
          cursor: "pointer",
          color: "rgba(255,255,255,0.7)",
          transition: "all 0.18s ease",
          margin: "0 2px",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.16)";
          (e.currentTarget as HTMLElement).style.border = "1px solid rgba(255,255,255,0.38)";
          (e.currentTarget as HTMLElement).style.transform = "scale(1.15)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.08)";
          (e.currentTarget as HTMLElement).style.border = "1px solid rgba(255,255,255,0.22)";
          (e.currentTarget as HTMLElement).style.transform = "scale(1)";
        }}
        aria-label={`Citation ${displayNum}`}
        title={`Reference ${displayNum}`}
      >
        {displayNum}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop dismiss */}
            <span
              className="fixed inset-0 z-[99]"
              onClick={() => setIsOpen(false)}
            />

            {/* Glass popover */}
            <motion.div
              initial={{ opacity: 0, y: 6, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.92 }}
              transition={{ duration: 0.16, ease: "easeOut" }}
              style={{
                backdropFilter: "blur(32px) saturate(200%)",
                WebkitBackdropFilter: "blur(32px) saturate(200%)",
                background: "rgba(255,255,255,0.07)",
                border: "1px solid rgba(255,255,255,0.18)",
                boxShadow:
                  "0 8px 40px rgba(0,0,0,0.35), 0 2px 8px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.3), inset 0 -1px 0 rgba(0,0,0,0.12)",
              }}
              className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-60 p-3.5 rounded-2xl z-[100] pointer-events-auto"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-2">
                <div
                  className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest"
                  style={{ color: "rgba(255,255,255,0.5)" }}
                >
                  <BookOpen className="w-2.5 h-2.5" />
                  Reference {displayNum}
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  style={{ color: "rgba(255,255,255,0.35)" }}
                  className="hover:opacity-80 transition-opacity cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>

              {/* Content */}
              <p
                className="text-[11px] leading-relaxed italic"
                style={{ color: "rgba(255,255,255,0.65)" }}
              >
                {sourceText
                  ? `"…${sourceText.slice(0, 180)}…"`
                  : "Source content not available for this citation."}
              </p>

              {/* Glass arrow */}
              <div
                style={{
                  backdropFilter: "blur(32px)",
                  WebkitBackdropFilter: "blur(32px)",
                  background: "rgba(255,255,255,0.07)",
                  border: "1px solid rgba(255,255,255,0.18)",
                  borderLeft: "none",
                  borderTop: "none",
                }}
                className="absolute top-full left-1/2 -translate-x-1/2 -mt-[5px] w-2.5 h-2.5 rotate-45"
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </span>
  );
}
