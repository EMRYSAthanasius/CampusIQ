"use client";

import { useState } from 'react';
import { ChevronLeft, ChevronRight, BookOpen, MessageSquare, LayoutGrid } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import SmartReader from './SmartReader';
import CourseChatbot from './CourseChatbot';
import StudioPanel from './StudioPanel';

interface MaterialWorkspaceProps {
  materialId: string;
  title: string;
  blocks: any[];
  fileUrl: string | null;
  courseCode?: string | null;
}

export default function MaterialWorkspace({ materialId, title, blocks, fileUrl, courseCode }: MaterialWorkspaceProps) {
  const [isReaderOpen, setIsReaderOpen] = useState(true);
  const [isStudioOpen, setIsStudioOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<'material' | 'chat' | 'studio'>('material');

  return (
    <>
      <style>{`
        @media (max-width: 767px) {
          .mobile-panel {
            width: 100% !important;
            max-width: 100% !important;
            min-width: 100% !important;
            flex: 1 !important;
          }
        }
      `}</style>

      <div className="h-screen w-full flex flex-col md:flex-row bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 overflow-hidden relative font-sans transition-colors duration-300">
        
        {/* Mobile Tab Navigation */}
        <div className="md:hidden flex flex-none items-center w-full h-14 border-b border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 z-20 shadow-sm p-1 shrink-0">
          <button 
            onClick={() => setActiveTab('material')} 
            className={`flex-1 flex items-center justify-center gap-2 h-full text-xs font-medium rounded-md transition-colors ${activeTab === 'material' ? 'bg-emerald-50 text-emerald-600 dark:bg-zinc-800/60 dark:text-emerald-400 shadow-sm border border-emerald-100/50 dark:border-zinc-700' : 'text-slate-500 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-900'}`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Material</span>
          </button>
          <button 
            onClick={() => setActiveTab('chat')} 
            className={`flex-1 flex items-center justify-center gap-2 h-full text-xs font-medium rounded-md transition-colors ${activeTab === 'chat' ? 'bg-emerald-50 text-emerald-600 dark:bg-zinc-800/60 dark:text-emerald-400 shadow-sm border border-emerald-100/50 dark:border-zinc-700' : 'text-slate-500 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-900'}`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>Chat</span>
          </button>
          <button 
            onClick={() => setActiveTab('studio')} 
            className={`flex-1 flex items-center justify-center gap-2 h-full text-xs font-medium rounded-md transition-colors ${activeTab === 'studio' ? 'bg-emerald-50 text-emerald-600 dark:bg-zinc-800/60 dark:text-emerald-400 shadow-sm border border-emerald-100/50 dark:border-zinc-700' : 'text-slate-500 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-900'}`}
          >
            <LayoutGrid className="w-4 h-4" />
            <span>Studio</span>
          </button>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-row overflow-hidden relative w-full h-full">

          {/* Panel 1: Document Reader (Left Column) */}
          <div className={`h-full ${activeTab === 'material' ? 'w-full block' : 'hidden md:block'} md:w-auto shrink-0`}>
            <AnimatePresence initial={false}>
              {isReaderOpen && (
                <motion.div 
                  initial={{ width: 0, opacity: 0, flex: 0 }}
                  animate={{ width: 'auto', opacity: 1, flex: 1 }}
                  exit={{ width: 0, opacity: 0, flex: 0 }}
                  transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                  className="mobile-panel h-full bg-white dark:bg-zinc-950 border-r border-slate-200/60 dark:border-zinc-800 relative overflow-hidden z-10 shrink-0"
                >
                  <SmartReader materialId={materialId} title={title} initialBlocks={blocks} fileUrl={fileUrl} courseCode={courseCode || undefined} />
                  
                  {/* Collapse Trigger - Subtle edge button */}
                  <button 
                    onClick={() => setIsReaderOpen(false)}
                    className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-50 w-5 h-10 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-full items-center justify-center shadow-sm hover:bg-emerald-50 dark:hover:bg-zinc-800 hover:border-emerald-200 transition-all group cursor-pointer"
                  >
                    <ChevronLeft className="w-3 h-3 text-slate-400 group-hover:text-emerald-600 transition-colors" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Expand Reader Trigger - Floating on left edge if closed */}
            {!isReaderOpen && (
              <button 
                onClick={() => setIsReaderOpen(true)}
                className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 z-40 w-6 h-12 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 border-l-0 rounded-r-xl items-center justify-center shadow-md hover:bg-emerald-50 dark:hover:bg-zinc-800 hover:border-emerald-200 transition-all group cursor-pointer"
              >
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 transition-colors" />
              </button>
            )}
          </div>

          {/* Panel 2: Course AI Core (Middle Column) */}
          <div className={`mobile-panel flex-[1.2] flex-col h-full bg-slate-50/60 dark:bg-zinc-900/40 relative md:min-w-[450px] shadow-[0_0_40px_rgba(0,0,0,0.02)] z-0 ${activeTab === 'chat' ? 'w-full flex' : 'hidden md:flex'}`}>
            <CourseChatbot materialId={materialId} isEmbedded={true} sourceBlocks={blocks} />
          </div>

          {/* Panel 3: Studio & Utilities (Right Column) */}
          <div className={`h-full ${activeTab === 'studio' ? 'w-full block' : 'hidden md:block'} md:w-auto shrink-0`}>
            <AnimatePresence initial={false}>
              {isStudioOpen && (
                <motion.div 
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 460, opacity: 1 }} 
                  exit={{ width: 0, opacity: 0 }}
                  transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                  className="mobile-panel h-full bg-white dark:bg-zinc-950 border-l border-slate-200/60 dark:border-zinc-800 relative overflow-hidden z-10 shrink-0"
                >
                  {/* Collapse Trigger - Subtle edge button */}
                  <button 
                    onClick={() => setIsStudioOpen(false)}
                    className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 z-50 w-5 h-10 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-full items-center justify-center shadow-sm hover:bg-emerald-50 dark:hover:bg-zinc-800 hover:border-emerald-200 transition-all group lg:opacity-100 cursor-pointer"
                  >
                    <ChevronRight className="w-3 h-3 text-slate-400 group-hover:text-emerald-600 transition-colors" />
                  </button>
                  <StudioPanel materialId={materialId} />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Expand Studio Trigger - Floating on right edge if closed */}
            {!isStudioOpen && (
              <button 
                onClick={() => setIsStudioOpen(true)}
                className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 z-40 w-6 h-12 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 border-r-0 rounded-l-xl items-center justify-center shadow-md hover:bg-emerald-50 dark:hover:bg-zinc-800 hover:border-emerald-200 transition-all group cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 transition-colors" />
              </button>
            )}
          </div>

        </div>
      </div>
    </>
  );
}
