"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useTheme } from "next-themes";
import { useHeartbeat } from "@/hooks/useHeartbeat";
import {
  Settings, Type, Layout, GraduationCap, ChevronLeft, ChevronRight,
  Droplet, Highlighter, Search, X, List, Clock, AlertCircle,
  Info, Lightbulb, BookMarked, Hash, ArrowUp, BookOpen, ChevronDown, ChevronUp
} from "lucide-react";
import { motion, AnimatePresence, PanInfo } from "framer-motion";

// ─── Types ───────────────────────────────────────────────────────────────────

interface WorkspaceBlock {
  id: string;
  type: 'heading' | 'subheading' | 'paragraph' | 'list_item' | 'callout' | 'divider';
  content: string;
  calloutKind?: 'note' | 'important' | 'definition' | 'example' | 'warning' | 'summary' | 'objective';
}

interface SmartReaderProps {
  materialId: string;
  title: string;
  initialBlocks: any[];
  fileUrl: string | null;
  courseCode?: string;
}

// ─── Callout Config ──────────────────────────────────────────────────────────

const getCalloutConfig = (isDark: boolean): Record<string, { icon: any; bg: string; border: string; label: string; text: string }> => ({
  note:       { icon: Info,        bg: isDark ? 'bg-emerald-950/30' : 'bg-emerald-50', border: 'border-l-emerald-500', label: 'Note',       text: isDark ? 'text-emerald-300' : 'text-emerald-700' },
  important:  { icon: AlertCircle, bg: isDark ? 'bg-amber-950/30' : 'bg-amber-50',   border: 'border-l-amber-500',   label: 'Important',  text: isDark ? 'text-amber-300' : 'text-amber-700' },
  definition: { icon: BookMarked,  bg: isDark ? 'bg-blue-950/30' : 'bg-blue-50',     border: 'border-l-blue-500',    label: 'Definition', text: isDark ? 'text-blue-300' : 'text-blue-700' },
  example:    { icon: Lightbulb,   bg: isDark ? 'bg-violet-950/30' : 'bg-violet-50', border: 'border-l-violet-500',  label: 'Example',    text: isDark ? 'text-violet-300' : 'text-violet-700' },
  warning:    { icon: AlertCircle, bg: isDark ? 'bg-rose-950/30' : 'bg-rose-50',     border: 'border-l-rose-500',    label: 'Warning',    text: isDark ? 'text-rose-300' : 'text-rose-700' },
  summary:    { icon: List,        bg: isDark ? 'bg-emerald-950/30' : 'bg-emerald-50', border: 'border-l-emerald-500', label: 'Summary',  text: isDark ? 'text-emerald-300' : 'text-emerald-700' },
  objective:  { icon: Hash,        bg: isDark ? 'bg-indigo-950/30' : 'bg-indigo-50', border: 'border-l-indigo-500',  label: 'Objective', text: isDark ? 'text-indigo-300' : 'text-indigo-700' },
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isWorkspaceBlocks(blocks: any[]): boolean {
  if (!blocks || blocks.length === 0) return false;
  return typeof blocks[0]?.type === 'string' && !blocks[0]?.correct_answer;
}

function highlightText(text: string, query: string): React.ReactElement {
  if (!query.trim()) return <>{text}</>;
  const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase()
          ? <mark key={i} className="bg-amber-200 dark:bg-amber-700/60 text-inherit rounded px-0.5">{part}</mark>
          : part
      )}
    </>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function SmartReader({ materialId, title, initialBlocks, fileUrl, courseCode }: SmartReaderProps) {
  useHeartbeat(materialId, 60);

  // Reader settings
  const [fontSize, setFontSize] = useState<"text-sm" | "text-base" | "text-lg" | "text-xl" | "text-2xl">("text-lg");
  const [fontFamily, setFontFamily] = useState<"font-sans" | "font-serif" | "font-mono">("font-serif");
  const [theme, setTheme] = useState<"mint" | "dark" | "sepia" | "navy" | "cream">("mint");
  const [layoutMode, setLayoutMode] = useState<"scroll" | "swipe">("scroll");
  const [showSettings, setShowSettings] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [highlightMode, setHighlightMode] = useState(false);

  // Workspace content
  const [blocks, setBlocks] = useState<WorkspaceBlock[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadMessage, setLoadMessage] = useState('');
  const [fileName, setFileName] = useState('');

  // Interactive features
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [showTOC, setShowTOC] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [showScrollTop, setShowScrollTop] = useState(false);

  const contentRef = useRef<HTMLDivElement>(null);
  const blockRefs = useRef<Record<string, HTMLElement>>({});
  const searchInputRef = useRef<HTMLInputElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);
  const settingsButtonRef = useRef<HTMLButtonElement>(null);

  // Theme sync
  const { resolvedTheme } = useTheme();
  useEffect(() => {
    if (resolvedTheme === 'dark' && theme !== 'dark' && theme !== 'navy') setTheme('dark');
    else if (resolvedTheme === 'light' && (theme === 'dark' || theme === 'navy')) setTheme('mint');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedTheme]);

  const isDark = theme === 'dark' || theme === 'navy' || (theme === 'mint' && resolvedTheme === 'dark');

  // Close settings on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node) &&
          settingsButtonRef.current && !settingsButtonRef.current.contains(e.target as Node)) {
        setShowSettings(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Focus search input when shown
  useEffect(() => {
    if (showSearch) setTimeout(() => searchInputRef.current?.focus(), 50);
  }, [showSearch]);

  // Fetch workspace content
  useEffect(() => {
    const hasGoodInitial = isWorkspaceBlocks(initialBlocks);
    if (hasGoodInitial) {
      setBlocks(initialBlocks as WorkspaceBlock[]);
      return;
    }
    if (!courseCode) {
      // Fallback: use initialBlocks as plain paragraphs
      if (initialBlocks.length > 0) {
        setBlocks(initialBlocks.map((b, i) => ({
          id: b.id || `fb-${i}`,
          type: 'paragraph' as const,
          content: b.content || String(b),
        })));
      }
      return;
    }

    setIsLoading(true);
    setLoadMessage('Loading course material...');
    fetch(`/api/workspace/content?courseCode=${courseCode}`)
      .then(r => r.json())
      .then(data => {
        if (data.blocks && data.blocks.length > 0) {
          setBlocks(data.blocks);
          if (data.fileName) setFileName(data.fileName.replace(/\.[^.]+$/, ''));
        } else {
          setLoadMessage(data.message || 'No material found for this course yet.');
        }
      })
      .catch(() => setLoadMessage('Could not load the course material. Please try again.'))
      .finally(() => setIsLoading(false));
  }, [courseCode]); // eslint-disable-line react-hooks/exhaustive-deps

  // Scroll tracking
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const handler = () => {
      const max = el.scrollHeight - el.clientHeight;
      if (max > 0) setScrollProgress((el.scrollTop / max) * 100);
      setShowScrollTop(el.scrollTop > 300);
    };
    el.addEventListener('scroll', handler, { passive: true });
    return () => el.removeEventListener('scroll', handler);
  }, [blocks]);

  // Derived
  const headings = blocks.filter(b => b.type === 'heading');
  const wordCount = blocks.reduce((sum, b) => sum + b.content.split(/\s+/).filter(Boolean).length, 0);
  const readMin = Math.max(1, Math.ceil(wordCount / 200));

  // Filtered blocks for search
  const filteredBlocks = searchQuery.trim()
    ? blocks.filter(b => b.content.toLowerCase().includes(searchQuery.toLowerCase()))
    : blocks;

  // Swipe pagination
  const blocksPerPage = 3;
  const totalPages = Math.ceil(filteredBlocks.length / blocksPerPage);
  const handleDragEnd = (_: any, info: PanInfo) => {
    if (layoutMode !== 'swipe') return;
    if (info.offset.x < -50 && currentPage < totalPages - 1) setCurrentPage(p => p + 1);
    if (info.offset.x > 50 && currentPage > 0) setCurrentPage(p => p - 1);
  };

  // Scroll to block
  const scrollToBlock = useCallback((id: string) => {
    const el = blockRefs.current[id];
    if (el && contentRef.current) {
      const top = el.offsetTop - 80;
      contentRef.current.scrollTo({ top, behavior: 'smooth' });
    }
    setHighlightedId(id);
    setShowTOC(false);
  }, []);

  const scrollToTop = () => contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });

  // Theme classes
  const themeClasses = {
    mint:  'bg-[#F3FAF6] text-[#1B4332]',
    dark:  'bg-zinc-900/95 text-zinc-100',
    sepia: 'bg-[#f4ecd8] text-[#5b4636]',
    navy:  'bg-slate-900 text-slate-100',
    cream: 'bg-[#FAFAFA] text-slate-800',
  };
  const navThemeClasses = {
    mint:  'bg-[#F3FAF6]/90 border-[#1B4332]/10 text-[#1B4332]',
    dark:  'bg-zinc-900/90 border-zinc-800/80 text-zinc-100',
    sepia: 'bg-[#f4ecd8]/90 border-[#e0d5ba] text-[#5b4636]',
    navy:  'bg-slate-900/90 border-slate-700/80 text-slate-100',
    cream: 'bg-[#FAFAFA]/90 border-slate-200/80 text-slate-800',
  };

  const calloutConfig = getCalloutConfig(isDark);

  // ─── Block Renderer ──────────────────────────────────────────────────────────

  const renderBlock = (block: WorkspaceBlock) => {
    const isHighlighted = highlightedId === block.id;
    const query = searchQuery.trim();

    const baseRef = (el: HTMLElement | null) => {
      if (el) blockRefs.current[block.id] = el;
    };

    switch (block.type) {

      case 'heading':
        return (
          <div
            key={block.id}
            ref={baseRef}
            onClick={() => setHighlightedId(isHighlighted ? null : block.id)}
            className={`mt-10 mb-3 scroll-mt-20 cursor-pointer rounded-xl px-2 -mx-2 transition-colors ${isHighlighted ? (isDark ? 'bg-emerald-900/20' : 'bg-emerald-100/60') : ''}`}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="h-px flex-1 bg-current opacity-10" />
              <span className="text-[10px] font-black uppercase tracking-[0.25em] opacity-40">Section</span>
              <div className="h-px flex-1 bg-current opacity-10" />
            </div>
            <h2 className={`text-xl font-black leading-tight tracking-tight ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
              {highlightText(block.content, query)}
            </h2>
          </div>
        );

      case 'subheading':
        return (
          <div
            key={block.id}
            ref={baseRef}
            onClick={() => setHighlightedId(isHighlighted ? null : block.id)}
            className={`mt-7 mb-2 pl-3 border-l-2 border-emerald-500/40 cursor-pointer rounded-r-lg pr-2 -mr-2 transition-colors ${isHighlighted ? (isDark ? 'bg-emerald-900/10 border-l-emerald-500' : 'bg-emerald-50/80 border-l-emerald-500') : ''}`}
          >
            <h3 className={`text-base font-bold leading-snug ${isDark ? 'text-zinc-100' : 'text-slate-900'}`}>
              {highlightText(block.content, query)}
            </h3>
          </div>
        );

      case 'list_item':
        return (
          <div
            key={block.id}
            ref={baseRef}
            onClick={() => setHighlightedId(isHighlighted ? null : block.id)}
            className={`flex items-start gap-3 py-1 px-2 -mx-2 rounded-lg cursor-pointer transition-colors ${isHighlighted ? (isDark ? 'bg-emerald-900/15' : 'bg-emerald-100/50') : highlightMode ? 'hover:bg-current/5' : ''}`}
          >
            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
            <span className={`flex-1 leading-relaxed ${isDark ? 'text-zinc-100/90' : 'text-slate-800/90'}`}>
              {highlightText(block.content.replace(/^[\d\w][.)]\s|^[•\-\*→–▪◦]\s/, ''), query)}
            </span>
          </div>
        );

      case 'callout': {
        const cfg = calloutConfig[block.calloutKind || 'note'] || calloutConfig.note;
        const Icon = cfg.icon;
        return (
          <div
            key={block.id}
            ref={baseRef}
            className={`my-6 p-4 rounded-2xl border-l-4 ${cfg.bg} ${cfg.border}`}
          >
            <div className={`flex items-center gap-2 font-bold text-xs uppercase tracking-wider mb-2 ${cfg.text}`}>
              <Icon className="w-3.5 h-3.5" />
              {cfg.label}
            </div>
            <p className="text-sm leading-relaxed">
              {highlightText(block.content.replace(/^[a-z\s]+:\s*/i, ''), query)}
            </p>
          </div>
        );
      }

      case 'divider':
        return (
          <div key={block.id} ref={baseRef} className="my-8 flex items-center gap-4">
            <div className="flex-1 h-px bg-current opacity-10" />
            <div className="w-1.5 h-1.5 rounded-full bg-current opacity-20" />
            <div className="flex-1 h-px bg-current opacity-10" />
          </div>
        );

      default: // paragraph
        return (
          <p
            key={block.id}
            ref={baseRef as any}
            onClick={() => setHighlightedId(isHighlighted ? null : block.id)}
            className={`leading-[1.9] cursor-pointer transition-all rounded-lg px-2 -mx-2 ${
              isHighlighted
                ? (isDark ? 'bg-amber-900/20' : 'bg-amber-100/60')
                : highlightMode
                ? (isDark ? 'hover:bg-emerald-500/10' : 'hover:bg-emerald-500/8')
                : ''
            } ${isDark ? 'text-zinc-100/90' : 'text-slate-800/90'}`}
          >
            {highlightText(block.content, query)}
          </p>
        );
    }
  };

  // ─── Display blocks ───────────────────────────────────────────────────────
  const displayBlocks = layoutMode === 'swipe'
    ? filteredBlocks.slice(currentPage * blocksPerPage, (currentPage + 1) * blocksPerPage)
    : filteredBlocks;

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className={`flex flex-col h-full w-full transition-colors duration-500 relative ${themeClasses[theme]}`}>

      {/* Scroll Progress Bar */}
      <div className="absolute top-0 left-0 right-0 h-0.5 z-50 bg-current/5">
        <motion.div
          className="h-full bg-emerald-500"
          style={{ width: `${scrollProgress}%` }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        />
      </div>

      {/* Nav Bar */}
      <nav className={`flex items-center justify-between px-4 py-3 border-b backdrop-blur-md sticky top-0 z-30 transition-colors duration-500 ${navThemeClasses[theme]} shadow-sm`}>
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={`p-1.5 rounded-lg shrink-0 ${isDark ? 'bg-emerald-500/20' : 'bg-emerald-600/10'}`}>
            <GraduationCap className={`w-4 h-4 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
          </div>
          <div className="min-w-0">
            <h1 className="font-bold text-sm truncate max-w-[180px] md:max-w-[260px]">{title}</h1>
            {fileName && (
              <p className="text-[10px] opacity-50 font-medium truncate max-w-[180px]">{fileName}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* Word Count + Read Time */}
          {blocks.length > 0 && (
            <div className="hidden md:flex items-center gap-1 text-[10px] font-bold opacity-40 mr-2">
              <Clock className="w-3 h-3" />
              {readMin} min read
              <span className="opacity-60 ml-1">· {wordCount.toLocaleString()} words</span>
            </div>
          )}

          {/* Table of Contents */}
          {headings.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setShowTOC(!showTOC)}
                className={`p-2 rounded-full transition-all ${showTOC ? 'bg-emerald-500/15 text-emerald-600' : 'hover:bg-current/8'}`}
                title="Table of Contents"
              >
                <BookOpen className="w-4 h-4" />
              </button>
              <AnimatePresence>
                {showTOC && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className={`absolute right-0 top-12 w-72 max-h-80 overflow-y-auto rounded-2xl shadow-2xl border z-50 py-3 ${navThemeClasses[theme]}`}
                  >
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] opacity-40 px-4 mb-2">Contents</p>
                    {headings.map(h => (
                      <button
                        key={h.id}
                        onClick={() => scrollToBlock(h.id)}
                        className="w-full text-left px-4 py-2 text-xs font-semibold hover:bg-current/5 transition-colors truncate"
                      >
                        {h.content}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Search */}
          <button
            onClick={() => { setShowSearch(!showSearch); if (showSearch) setSearchQuery(''); }}
            className={`p-2 rounded-full transition-all ${showSearch ? 'bg-emerald-500/15 text-emerald-600' : 'hover:bg-current/8'}`}
            title="Search"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Settings */}
          <button
            ref={settingsButtonRef}
            onClick={() => setShowSettings(!showSettings)}
            className={`p-2 rounded-full transition-all duration-300 ${showSettings ? (isDark ? 'bg-white/20 rotate-45' : 'bg-black/10 rotate-45') : (isDark ? 'hover:bg-white/10 hover:rotate-45' : 'hover:bg-black/5 hover:rotate-45')}`}
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* Settings Panel */}
          <AnimatePresence>
            {showSettings && (
              <motion.div
                ref={settingsRef}
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className={`absolute right-4 top-16 w-72 p-5 rounded-2xl shadow-2xl border z-50 ${navThemeClasses[theme]}`}
              >
                {/* Font Size */}
                <div className="mb-5">
                  <div className="text-xs uppercase tracking-wider mb-2.5 font-bold opacity-70 flex items-center gap-2"><Type className="w-3.5 h-3.5" /> Typography</div>
                  <div className={`flex justify-between items-center rounded-xl p-1 mb-2 ${isDark ? 'bg-white/5' : 'bg-black/5'}`}>
                    {(['text-sm', 'text-base', 'text-lg', 'text-xl'] as const).map((size, i) => (
                      <button key={size} onClick={() => setFontSize(size)} className={`px-3 py-1.5 rounded-lg transition-colors ${fontSize === size ? (isDark ? 'bg-gray-800 shadow-sm font-medium' : 'bg-white shadow-sm font-medium') : (isDark ? 'hover:bg-white/10' : 'hover:bg-black/5')}`}>
                        <span className={size}>A</span>
                      </button>
                    ))}
                  </div>
                  <div className={`flex rounded-xl p-1 ${isDark ? 'bg-white/5' : 'bg-black/5'}`}>
                    {(['font-sans', 'font-serif', 'font-mono'] as const).map(f => (
                      <button key={f} onClick={() => setFontFamily(f)} className={`flex-1 text-center py-1.5 rounded-lg ${f} text-xs transition-colors ${fontFamily === f ? (isDark ? 'bg-gray-800 shadow-sm font-medium' : 'bg-white shadow-sm font-medium') : (isDark ? 'hover:bg-white/10' : 'hover:bg-black/5')}`}>
                        {f.replace('font-', '')}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Theme */}
                <div className="mb-5">
                  <div className="text-xs uppercase tracking-wider mb-2.5 font-bold opacity-70 flex items-center gap-2"><Droplet className="w-3.5 h-3.5" /> Theme</div>
                  <div className="grid grid-cols-5 gap-2">
                    {[
                      { key: 'mint', bg: '#F3FAF6', border: '#1B4332' },
                      { key: 'sepia', bg: '#f4ecd8', border: '#e0d5ba' },
                      { key: 'cream', bg: '#FAFAFA', border: '#cbd5e1' },
                      { key: 'navy', bg: '#0f172a', border: '#334155' },
                      { key: 'dark', bg: '#09090b', border: '#27272a' },
                    ].map(({ key, bg, border }) => (
                      <button key={key} onClick={() => setTheme(key as any)} className={`w-full aspect-square rounded-full flex items-center justify-center border-2 transition-all ${theme === key ? 'border-emerald-500 scale-110' : 'border-transparent'}`}>
                        <div className="w-full h-full rounded-full" style={{ background: bg, border: `1px solid ${border}` }} />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Highlight Mode */}
                <div className="mb-5">
                  <div className="text-xs uppercase tracking-wider mb-2.5 font-bold opacity-70 flex items-center gap-2"><Highlighter className="w-3.5 h-3.5" /> Tools</div>
                  <button onClick={() => setHighlightMode(!highlightMode)} className={`w-full py-2 px-3 rounded-xl flex items-center justify-between text-sm transition-colors ${highlightMode ? (isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-500/20 text-emerald-700') : (isDark ? 'bg-white/5 hover:bg-white/10' : 'bg-black/5 hover:bg-black/10')}`}>
                    <span className="font-medium">Focus Highlight</span>
                    <div className={`w-8 h-4 rounded-full p-0.5 transition-colors ${highlightMode ? 'bg-emerald-500' : (isDark ? 'bg-gray-600' : 'bg-gray-400')}`}>
                      <div className={`w-3 h-3 rounded-full bg-white transition-transform ${highlightMode ? 'translate-x-4' : 'translate-x-0'}`} />
                    </div>
                  </button>
                </div>

                {/* Layout */}
                <div>
                  <div className="text-xs uppercase tracking-wider mb-2.5 font-bold opacity-70 flex items-center gap-2"><Layout className="w-3.5 h-3.5" /> Layout</div>
                  <div className={`flex rounded-xl p-1 ${isDark ? 'bg-white/5' : 'bg-black/5'}`}>
                    {(['scroll', 'swipe'] as const).map(mode => (
                      <button key={mode} onClick={() => { setLayoutMode(mode); setCurrentPage(0); }} className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors capitalize ${layoutMode === mode ? (isDark ? 'bg-gray-800 shadow-sm' : 'bg-white shadow-sm') : (isDark ? 'hover:bg-white/10' : 'hover:bg-black/5')}`}>
                        {mode}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </nav>

      {/* Search Bar */}
      <AnimatePresence>
        {showSearch && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className={`border-b overflow-hidden ${navThemeClasses[theme]}`}
          >
            <div className="flex items-center gap-3 px-4 py-2.5">
              <Search className="w-4 h-4 opacity-40 shrink-0" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setCurrentPage(0); }}
                placeholder="Search in document..."
                className="flex-1 bg-transparent text-sm outline-none placeholder:opacity-40"
              />
              {searchQuery && (
                <span className="text-[11px] font-bold opacity-50">
                  {filteredBlocks.length} result{filteredBlocks.length !== 1 ? 's' : ''}
                </span>
              )}
              <button onClick={() => { setSearchQuery(''); setShowSearch(false); }} className="p-1 rounded-full hover:bg-current/10 transition-colors">
                <X className="w-3.5 h-3.5 opacity-50" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content Area */}
      <div
        ref={contentRef}
        className={`flex-1 overflow-y-auto ${layoutMode === 'swipe' ? 'overflow-hidden' : 'pb-32'}`}
      >
        <div className={`max-w-3xl mx-auto px-5 md:px-8 py-10 md:py-14 ${fontFamily} ${fontSize} space-y-5`}>

          {/* Loading State */}
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-24 gap-4 opacity-70">
              <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm font-semibold animate-pulse">Loading course material...</p>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && blocks.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24 gap-4 text-center opacity-60">
              <BookOpen className="w-12 h-12 opacity-30" />
              <p className="text-base font-bold">{loadMessage || 'No material available for this course yet.'}</p>
              <p className="text-sm opacity-70">Check back when the course material has been uploaded.</p>
            </div>
          )}

          {/* No Search Results */}
          {!isLoading && blocks.length > 0 && filteredBlocks.length === 0 && (
            <div className="flex flex-col items-center py-16 gap-3 opacity-60">
              <Search className="w-8 h-8 opacity-40" />
              <p className="text-sm font-bold">No results for "{searchQuery}"</p>
            </div>
          )}

          {/* Scroll Mode */}
          {!isLoading && layoutMode === 'scroll' && displayBlocks.map(renderBlock)}

          {/* Swipe Mode */}
          {!isLoading && layoutMode === 'swipe' && filteredBlocks.length > 0 && (
            <motion.div
              className="h-full w-full flex flex-col justify-center cursor-grab active:cursor-grabbing min-h-[60vh]"
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
                  transition={{ duration: 0.25 }}
                  className="space-y-5"
                >
                  {displayBlocks.map(renderBlock)}
                </motion.div>
              </AnimatePresence>
            </motion.div>
          )}
        </div>
      </div>

      {/* Swipe Pagination */}
      {layoutMode === 'swipe' && filteredBlocks.length > 0 && (
        <div className={`px-4 py-3 border-t flex items-center justify-between shadow-[0_-10px_40px_rgba(0,0,0,0.05)] ${navThemeClasses[theme]}`}>
          <button onClick={() => setCurrentPage(p => Math.max(0, p - 1))} disabled={currentPage === 0}
            className={`p-3 rounded-full disabled:opacity-30 transition-all cursor-pointer ${isDark ? 'hover:bg-white/10' : 'hover:bg-black/10'}`}>
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className={`text-xs font-bold opacity-60 px-4 py-1.5 rounded-full ${isDark ? 'bg-white/5' : 'bg-black/5'}`}>
            {currentPage + 1} <span className="opacity-50 mx-1">/</span> {totalPages}
          </span>
          <button onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))} disabled={currentPage >= totalPages - 1}
            className={`p-3 rounded-full disabled:opacity-30 transition-all cursor-pointer ${isDark ? 'hover:bg-white/10' : 'hover:bg-black/10'}`}>
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Scroll to Top FAB */}
      <AnimatePresence>
        {showScrollTop && layoutMode === 'scroll' && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={scrollToTop}
            className="absolute bottom-6 right-6 w-10 h-10 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full shadow-lg flex items-center justify-center transition-colors z-20"
          >
            <ArrowUp className="w-4 h-4" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
