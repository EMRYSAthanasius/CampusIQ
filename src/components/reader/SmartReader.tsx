"use client";

import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { useHeartbeat } from "@/hooks/useHeartbeat";
import { Settings, Type, Layout, Moon, Sun, BookOpen, ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Block {
  id: string;
  type: string;
  content: string;
}

interface SmartReaderProps {
  materialId: string;
  title: string;
  initialBlocks: Block[];
  fileUrl: string | null;
}

export default function SmartReader({ materialId, title, initialBlocks, fileUrl }: SmartReaderProps) {
  // Use heartbeat to track reading time
  useHeartbeat(materialId, 60);

  const [fontSize, setFontSize] = useState<"text-sm" | "text-base" | "text-lg" | "text-xl" | "text-2xl">("text-lg");
  const [fontFamily, setFontFamily] = useState<"font-sans" | "font-serif" | "font-mono">("font-serif");
  const [theme, setTheme] = useState<"mint" | "dark" | "sepia">("mint");
  const [layoutMode, setLayoutMode] = useState<"scroll" | "swipe">("scroll");
  const [showSettings, setShowSettings] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);

  // Sync reader theme with global next-themes toggle
  const { resolvedTheme } = useTheme();
  useEffect(() => {
    if (resolvedTheme === 'dark') {
      setTheme('dark');
    } else if (theme === 'dark') {
      // Only revert to mint if currently in dark — preserve sepia choice
      setTheme('mint');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedTheme]);

  const [blocks, setBlocks] = useState<Block[]>(initialBlocks);
  const [isParsing, setIsParsing] = useState(initialBlocks.length === 0 && !!fileUrl);

  useEffect(() => {
    if (initialBlocks.length === 0 && fileUrl) {
      setIsParsing(true);
      fetch('/api/parse-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storagePath: fileUrl, materialId })
      })
      .then(res => res.json())
      .then(data => {
        if (data.blocks) {
          setBlocks(data.blocks);
        } else if (data.error) {
          const errorMessage = data.details ? `${data.error} - ${data.details}` : data.error;
          setBlocks([{ id: 'err', type: 'paragraph', content: `Failed to parse the document: ${errorMessage}` }]);
        } else {
          setBlocks([{ id: 'err', type: 'paragraph', content: 'Failed to parse the document.' }]);
        }
        setIsParsing(false);
      })
      .catch(err => {
        console.error('Error parsing PDF:', err);
        setBlocks([{ id: 'err', type: 'paragraph', content: 'An error occurred while parsing the document.' }]);
        setIsParsing(false);
      });
    }
  }, [initialBlocks.length, fileUrl, materialId]);

  // Group blocks into "pages" for swipe mode (approx 3 paragraphs per page for demo)
  const blocksPerPage = 3;
  const totalPages = Math.ceil(blocks.length / blocksPerPage);

  const themeClasses = {
    mint: "bg-[#F3FAF6] text-[#1B4332] dark:bg-zinc-950 dark:text-zinc-100",
    dark: "bg-zinc-950 text-zinc-100",
    sepia: "bg-[#f4ecd8] text-[#5b4636]",
  };

  const navThemeClasses = {
    mint: "bg-[#F3FAF6]/90 border-[#1B4332]/10 text-[#1B4332] dark:bg-zinc-900/90 dark:border-zinc-800/80 dark:text-zinc-100",
    dark: "bg-zinc-900/90 border-zinc-800/80 text-zinc-100",
    sepia: "bg-[#f4ecd8]/90 border-[#e0d5ba] text-[#5b4636]",
  };

  return (
    <div className={`flex flex-col h-full w-full transition-colors duration-300 ${themeClasses[theme]}`}>
      {/* Reader Navbar */}
      <nav className={`flex items-center justify-between p-4 border-b backdrop-blur-sm sticky top-0 z-30 transition-colors duration-300 ${navThemeClasses[theme]}`}>
        <div className="flex items-center gap-3">
          <BookOpen className="w-5 h-5" />
          <h1 className="font-semibold text-sm md:text-base truncate max-w-[200px] md:max-w-md">{title}</h1>
        </div>

        <div className="flex items-center gap-2 md:gap-4 relative">
          <button 
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          >
            <Settings className="w-5 h-5" />
          </button>

          {/* Settings Dropdown */}
          <AnimatePresence>
            {showSettings && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className={`absolute right-0 top-12 w-64 p-4 rounded-2xl shadow-xl border z-50 ${navThemeClasses[theme]}`}
              >
                {/* Font Size */}
                <div className="mb-4">
                  <div className="text-xs uppercase tracking-wider mb-2 font-semibold opacity-70 flex items-center gap-2"><Type className="w-3 h-3"/> Font Size</div>
                  <div className="flex justify-between items-center bg-black/5 dark:bg-white/5 rounded-lg p-1">
                    <button onClick={() => setFontSize("text-sm")} className={`px-3 py-1 rounded-md text-sm ${fontSize === "text-sm" ? "bg-white dark:bg-gray-800 shadow-sm" : ""}`}>A</button>
                    <button onClick={() => setFontSize("text-base")} className={`px-3 py-1 rounded-md text-base ${fontSize === "text-base" ? "bg-white dark:bg-gray-800 shadow-sm" : ""}`}>A</button>
                    <button onClick={() => setFontSize("text-lg")} className={`px-3 py-1 rounded-md text-lg ${fontSize === "text-lg" ? "bg-white dark:bg-gray-800 shadow-sm" : ""}`}>A</button>
                    <button onClick={() => setFontSize("text-xl")} className={`px-3 py-1 rounded-md text-xl ${fontSize === "text-xl" ? "bg-white dark:bg-gray-800 shadow-sm" : ""}`}>A</button>
                  </div>
                </div>

                {/* Font Family */}
                <div className="mb-4">
                  <div className="text-xs uppercase tracking-wider mb-2 font-semibold opacity-70">Font Family</div>
                  <div className="flex flex-col gap-1">
                    <button onClick={() => setFontFamily("font-sans")} className={`text-left px-3 py-2 rounded-lg font-sans ${fontFamily === "font-sans" ? "bg-black/5 dark:bg-white/10" : ""}`}>Sans Serif</button>
                    <button onClick={() => setFontFamily("font-serif")} className={`text-left px-3 py-2 rounded-lg font-serif ${fontFamily === "font-serif" ? "bg-black/5 dark:bg-white/10" : ""}`}>Serif</button>
                    <button onClick={() => setFontFamily("font-mono")} className={`text-left px-3 py-2 rounded-lg font-mono ${fontFamily === "font-mono" ? "bg-black/5 dark:bg-white/10" : ""}`}>Monospace</button>
                  </div>
                </div>

                {/* Theme */}
                <div className="mb-4">
                  <div className="text-xs uppercase tracking-wider mb-2 font-semibold opacity-70 flex items-center gap-2"><Sun className="w-3 h-3"/> Theme</div>
                  <div className="grid grid-cols-3 gap-2">
                    <button onClick={() => setTheme("mint")} className={`p-2 rounded-lg border flex flex-col items-center gap-1 ${theme === "mint" ? "border-[#2E8B57] ring-1 ring-[#2E8B57] bg-[#2E8B57]/5" : "border-[#1B4332]/10"}`}>
                      <div className="w-4 h-4 rounded-full bg-[#F3FAF6] border border-[#1B4332]/20"></div>
                      <span className="text-[10px]">Mint</span>
                    </button>
                    <button onClick={() => setTheme("sepia")} className={`p-2 rounded-lg border flex flex-col items-center gap-1 ${theme === "sepia" ? "border-[#2E8B57] ring-1 ring-[#2E8B57] bg-[#2E8B57]/5" : "border-[#e0d5ba]"}`}>
                      <div className="w-4 h-4 rounded-full bg-[#f4ecd8] border border-[#e0d5ba]"></div>
                      <span className="text-[10px]">Sepia</span>
                    </button>
                    <button onClick={() => setTheme("dark")} className={`p-2 rounded-lg border flex flex-col items-center gap-1 ${theme === "dark" ? "border-emerald-500 ring-1 ring-emerald-500 bg-emerald-500/10" : "border-slate-100 dark:border-zinc-800/80"}`}>
                      <div className="w-4 h-4 rounded-full bg-[#1B4332] dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800"></div>
                      <span className="text-[10px]">Dark</span>
                    </button>
                  </div>
                </div>

                {/* Layout Mode */}
                <div>
                  <div className="text-xs uppercase tracking-wider mb-2 font-semibold opacity-70 flex items-center gap-2"><Layout className="w-3 h-3"/> Layout</div>
                  <div className="flex bg-black/5 dark:bg-white/5 rounded-lg p-1">
                    <button onClick={() => setLayoutMode("scroll")} className={`flex-1 py-1.5 text-xs font-medium rounded-md ${layoutMode === "scroll" ? "bg-white dark:bg-gray-800 shadow-sm" : ""}`}>Scroll</button>
                    <button onClick={() => setLayoutMode("swipe")} className={`flex-1 py-1.5 text-xs font-medium rounded-md ${layoutMode === "swipe" ? "bg-white dark:bg-gray-800 shadow-sm" : ""}`}>Swipe</button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </nav>

      {/* Content Area */}
      <div className={`flex-1 overflow-y-auto ${layoutMode === "swipe" ? "overflow-hidden flex flex-col" : "pb-32"}`}>
        <div className={`max-w-3xl mx-auto px-6 py-12 md:py-16 ${fontFamily} ${fontSize} leading-[1.8] tracking-wide`}>
          
          {isParsing ? (
            <div className="flex flex-col items-center justify-center py-20 opacity-70">
              <div className="w-8 h-8 border-4 border-[#2E8B57] border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-sm font-medium animate-pulse">Extracting text from document...</p>
            </div>
          ) : layoutMode === "scroll" ? (
            <div className="space-y-8">
              {blocks.map((block) => (
                <p key={block.id}>{block.content}</p>
              ))}
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={currentPage}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-8 h-full flex flex-col justify-center"
              >
                {blocks.slice(currentPage * blocksPerPage, (currentPage + 1) * blocksPerPage).map((block) => (
                  <p key={block.id}>{block.content}</p>
                ))}
              </motion.div>
            </AnimatePresence>
          )}

        </div>
      </div>

      {/* Swipe Mode Pagination controls */}
      {layoutMode === "swipe" && (
        <div className={`p-4 border-t flex items-center justify-between ${navThemeClasses[theme]}`}>
          <button 
            onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
            disabled={currentPage === 0}
            className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-30 transition-colors"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <span className="text-sm font-medium opacity-70">
            {currentPage + 1} / {totalPages}
          </span>
          <button 
            onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
            disabled={currentPage === totalPages - 1}
            className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-30 transition-colors"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>
      )}
    </div>
  );
}
