"use client";

import { useState, useEffect, useRef } from "react";
import { useTheme } from "next-themes";
import { useHeartbeat } from "@/hooks/useHeartbeat";
import { Settings, Type, Layout, Moon, Sun, GraduationCap, ChevronLeft, ChevronRight, Droplet, Highlighter } from "lucide-react";
import { motion, AnimatePresence, PanInfo } from "framer-motion";

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
  useHeartbeat(materialId, 60);

  const [fontSize, setFontSize] = useState<"text-sm" | "text-base" | "text-lg" | "text-xl" | "text-2xl">("text-lg");
  const [fontFamily, setFontFamily] = useState<"font-sans" | "font-serif" | "font-mono">("font-serif");
  const [theme, setTheme] = useState<"mint" | "dark" | "sepia" | "navy" | "cream">("mint");
  const [layoutMode, setLayoutMode] = useState<"scroll" | "swipe">("scroll");
  const [showSettings, setShowSettings] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [highlightMode, setHighlightMode] = useState(false);

  const settingsRef = useRef<HTMLDivElement>(null);
  const settingsButtonRef = useRef<HTMLButtonElement>(null);

  // Click outside to close settings
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        settingsRef.current && 
        !settingsRef.current.contains(event.target as Node) &&
        settingsButtonRef.current &&
        !settingsButtonRef.current.contains(event.target as Node)
      ) {
        setShowSettings(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const { resolvedTheme } = useTheme();
  useEffect(() => {
    if (resolvedTheme === 'dark' && theme !== 'dark' && theme !== 'navy') {
      setTheme('dark');
    } else if (resolvedTheme === 'light' && (theme === 'dark' || theme === 'navy')) {
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
        } else {
          setBlocks([{ id: 'err', type: 'paragraph', content: 'Failed to parse the document.' }]);
        }
        setIsParsing(false);
      })
      .catch(() => {
        setBlocks([{ id: 'err', type: 'paragraph', content: 'An error occurred while parsing the document.' }]);
        setIsParsing(false);
      });
    }
  }, [initialBlocks.length, fileUrl, materialId]);

  const blocksPerPage = 3;
  const totalPages = Math.ceil(blocks.length / blocksPerPage);

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (layoutMode !== "swipe") return;
    const swipeThreshold = 50;
    if (info.offset.x < -swipeThreshold && currentPage < totalPages - 1) {
      setCurrentPage(p => p + 1); // Swipe left -> Next page
    } else if (info.offset.x > swipeThreshold && currentPage > 0) {
      setCurrentPage(p => p - 1); // Swipe right -> Prev page
    }
  };

  const themeClasses = {
    mint: "bg-[#F3FAF6] text-[#1B4332] dark:bg-zinc-900 dark:text-zinc-100",
    dark: "bg-zinc-900/95 text-zinc-100",
    sepia: "bg-[#f4ecd8] text-[#5b4636]",
    navy: "bg-slate-900 text-slate-100",
    cream: "bg-[#FAFAFA] text-slate-800",
  };

  const navThemeClasses = {
    mint: "bg-[#F3FAF6]/90 border-[#1B4332]/10 text-[#1B4332] dark:bg-zinc-900/90 dark:border-zinc-800/80 dark:text-zinc-100",
    dark: "bg-zinc-900/90 border-zinc-800/80 text-zinc-100",
    sepia: "bg-[#f4ecd8]/90 border-[#e0d5ba] text-[#5b4636]",
    navy: "bg-slate-900/90 border-slate-700/80 text-slate-100",
    cream: "bg-[#FAFAFA]/90 border-slate-200/80 text-slate-800",
  };

  return (
    <div className={`flex flex-col h-full w-full transition-colors duration-500 ${themeClasses[theme]}`}>
      <nav className={`flex items-center justify-between p-4 border-b backdrop-blur-md sticky top-0 z-30 transition-colors duration-500 ${navThemeClasses[theme]} shadow-sm`}>
        <div className="flex items-center gap-3 group cursor-pointer">
          <div className="p-1.5 bg-emerald-600/10 dark:bg-emerald-500/20 rounded-lg group-hover:scale-105 transition-transform">
            <GraduationCap className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h1 className="font-semibold text-sm md:text-base truncate max-w-[200px] md:max-w-md">{title}</h1>
        </div>

        <div className="flex items-center gap-2 md:gap-4 relative">
          <button 
            ref={settingsButtonRef}
            onClick={() => setShowSettings(!showSettings)}
            className={`p-2 rounded-full transition-all duration-300 ${showSettings ? 'bg-black/10 dark:bg-white/20 rotate-45' : 'hover:bg-black/5 dark:hover:bg-white/10 hover:rotate-45'}`}
          >
            <Settings className="w-5 h-5" />
          </button>

          <AnimatePresence>
            {showSettings && (
              <motion.div
                ref={settingsRef}
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className={`absolute right-0 top-14 w-72 p-5 rounded-2xl shadow-2xl border z-50 ${navThemeClasses[theme]}`}
              >
                {/* Font Size */}
                <div className="mb-5">
                  <div className="text-xs uppercase tracking-wider mb-2.5 font-bold opacity-70 flex items-center gap-2"><Type className="w-3.5 h-3.5"/> Typography</div>
                  <div className="flex justify-between items-center bg-black/5 dark:bg-white/5 rounded-xl p-1 mb-2">
                    <button onClick={() => setFontSize("text-sm")} className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${fontSize === "text-sm" ? "bg-white dark:bg-gray-800 shadow-sm font-medium" : "hover:bg-black/5"}`}>A</button>
                    <button onClick={() => setFontSize("text-base")} className={`px-3 py-1.5 rounded-lg text-base transition-colors ${fontSize === "text-base" ? "bg-white dark:bg-gray-800 shadow-sm font-medium" : "hover:bg-black/5"}`}>A</button>
                    <button onClick={() => setFontSize("text-lg")} className={`px-3 py-1.5 rounded-lg text-lg transition-colors ${fontSize === "text-lg" ? "bg-white dark:bg-gray-800 shadow-sm font-medium" : "hover:bg-black/5"}`}>A</button>
                    <button onClick={() => setFontSize("text-xl")} className={`px-3 py-1.5 rounded-lg text-xl transition-colors ${fontSize === "text-xl" ? "bg-white dark:bg-gray-800 shadow-sm font-medium" : "hover:bg-black/5"}`}>A</button>
                  </div>
                  <div className="flex bg-black/5 dark:bg-white/5 rounded-xl p-1">
                    <button onClick={() => setFontFamily("font-sans")} className={`flex-1 text-center py-1.5 rounded-lg font-sans text-xs transition-colors ${fontFamily === "font-sans" ? "bg-white dark:bg-gray-800 shadow-sm font-medium" : "hover:bg-black/5"}`}>Sans</button>
                    <button onClick={() => setFontFamily("font-serif")} className={`flex-1 text-center py-1.5 rounded-lg font-serif text-xs transition-colors ${fontFamily === "font-serif" ? "bg-white dark:bg-gray-800 shadow-sm font-medium" : "hover:bg-black/5"}`}>Serif</button>
                    <button onClick={() => setFontFamily("font-mono")} className={`flex-1 text-center py-1.5 rounded-lg font-mono text-xs transition-colors ${fontFamily === "font-mono" ? "bg-white dark:bg-gray-800 shadow-sm font-medium" : "hover:bg-black/5"}`}>Mono</button>
                  </div>
                </div>

                {/* Theme */}
                <div className="mb-5">
                  <div className="text-xs uppercase tracking-wider mb-2.5 font-bold opacity-70 flex items-center gap-2"><Droplet className="w-3.5 h-3.5"/> Reading Theme</div>
                  <div className="grid grid-cols-5 gap-2">
                    <button onClick={() => setTheme("mint")} className={`w-full aspect-square rounded-full flex items-center justify-center border-2 transition-all ${theme === "mint" ? "border-emerald-500 scale-110" : "border-transparent"}`}>
                      <div className="w-full h-full rounded-full bg-[#F3FAF6] border border-[#1B4332]/20"></div>
                    </button>
                    <button onClick={() => setTheme("sepia")} className={`w-full aspect-square rounded-full flex items-center justify-center border-2 transition-all ${theme === "sepia" ? "border-emerald-500 scale-110" : "border-transparent"}`}>
                      <div className="w-full h-full rounded-full bg-[#f4ecd8] border border-[#e0d5ba]"></div>
                    </button>
                    <button onClick={() => setTheme("cream")} className={`w-full aspect-square rounded-full flex items-center justify-center border-2 transition-all ${theme === "cream" ? "border-emerald-500 scale-110" : "border-transparent"}`}>
                      <div className="w-full h-full rounded-full bg-[#FAFAFA] border border-slate-300"></div>
                    </button>
                    <button onClick={() => setTheme("navy")} className={`w-full aspect-square rounded-full flex items-center justify-center border-2 transition-all ${theme === "navy" ? "border-emerald-500 scale-110" : "border-transparent"}`}>
                      <div className="w-full h-full rounded-full bg-slate-900 border border-slate-700"></div>
                    </button>
                    <button onClick={() => setTheme("dark")} className={`w-full aspect-square rounded-full flex items-center justify-center border-2 transition-all ${theme === "dark" ? "border-emerald-500 scale-110" : "border-transparent"}`}>
                      <div className="w-full h-full rounded-full bg-zinc-950 border border-zinc-800"></div>
                    </button>
                  </div>
                </div>

                {/* Highlighting */}
                <div className="mb-5">
                  <div className="text-xs uppercase tracking-wider mb-2.5 font-bold opacity-70 flex items-center gap-2"><Highlighter className="w-3.5 h-3.5"/> Tools</div>
                  <button onClick={() => setHighlightMode(!highlightMode)} className={`w-full py-2 px-3 rounded-xl flex items-center justify-between text-sm transition-colors ${highlightMode ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400" : "bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10"}`}>
                    <span className="font-medium">Focus Highlight</span>
                    <div className={`w-8 h-4 rounded-full p-0.5 transition-colors ${highlightMode ? "bg-emerald-500" : "bg-gray-400 dark:bg-gray-600"}`}>
                      <div className={`w-3 h-3 rounded-full bg-white transition-transform ${highlightMode ? "translate-x-4" : "translate-x-0"}`} />
                    </div>
                  </button>
                </div>

                {/* Layout Mode */}
                <div>
                  <div className="text-xs uppercase tracking-wider mb-2.5 font-bold opacity-70 flex items-center gap-2"><Layout className="w-3.5 h-3.5"/> Layout</div>
                  <div className="flex bg-black/5 dark:bg-white/5 rounded-xl p-1">
                    <button onClick={() => setLayoutMode("scroll")} className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors ${layoutMode === "scroll" ? "bg-white dark:bg-gray-800 shadow-sm" : "hover:bg-black/5"}`}>Scroll</button>
                    <button onClick={() => setLayoutMode("swipe")} className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors ${layoutMode === "swipe" ? "bg-white dark:bg-gray-800 shadow-sm" : "hover:bg-black/5"}`}>Swipe</button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </nav>

      {/* Content Area */}
      <div className={`flex-1 overflow-y-auto ${layoutMode === "swipe" ? "overflow-hidden flex flex-col" : "pb-32"}`}>
        <div className={`max-w-3xl mx-auto px-6 py-12 md:py-16 ${fontFamily} ${fontSize} leading-[1.9] tracking-wide`}>
          
          {isParsing ? (
            <div className="flex flex-col items-center justify-center py-20 opacity-70">
              <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-sm font-medium animate-pulse">Extracting text from document...</p>
            </div>
          ) : layoutMode === "scroll" ? (
            <div className="space-y-8">
              {blocks.map((block) => (
                <p 
                  key={block.id} 
                  className={`transition-colors duration-300 rounded-lg ${highlightMode ? 'hover:bg-emerald-500/10 dark:hover:bg-emerald-500/20 p-2 -mx-2' : ''}`}
                >
                  {block.content}
                </p>
              ))}
            </div>
          ) : (
            <motion.div 
               className="h-full w-full flex flex-col justify-center cursor-grab active:cursor-grabbing"
               drag="x"
               dragConstraints={{ left: 0, right: 0 }}
               dragElastic={0.2}
               onDragEnd={handleDragEnd}
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentPage}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-8"
                >
                  {blocks.slice(currentPage * blocksPerPage, (currentPage + 1) * blocksPerPage).map((block) => (
                    <p 
                      key={block.id}
                      className={`transition-colors duration-300 rounded-lg ${highlightMode ? 'hover:bg-emerald-500/10 dark:hover:bg-emerald-500/20 p-2 -mx-2' : ''}`}
                    >
                      {block.content}
                    </p>
                  ))}
                </motion.div>
              </AnimatePresence>
            </motion.div>
          )}

        </div>
      </div>

      {/* Swipe Mode Pagination controls */}
      {layoutMode === "swipe" && (
        <div className={`p-4 border-t flex items-center justify-between shadow-[0_-10px_40px_rgba(0,0,0,0.05)] ${navThemeClasses[theme]}`}>
          <button 
            onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
            disabled={currentPage === 0}
            className="p-3 rounded-full hover:bg-black/10 dark:hover:bg-white/10 disabled:opacity-30 transition-all cursor-pointer"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <span className="text-sm font-semibold opacity-70 bg-black/5 dark:bg-white/5 px-4 py-1.5 rounded-full">
            {currentPage + 1} <span className="opacity-50 mx-1">/</span> {totalPages}
          </span>
          <button 
            onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
            disabled={currentPage === totalPages - 1}
            className="p-3 rounded-full hover:bg-black/10 dark:hover:bg-white/10 disabled:opacity-30 transition-all cursor-pointer"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>
      )}
    </div>
  );
}
