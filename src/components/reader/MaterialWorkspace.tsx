"use client";

import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import SmartReader from './SmartReader';
import CourseChatbot from './CourseChatbot';
import StudioPanel from './StudioPanel';

interface MaterialWorkspaceProps {
  materialId: string;
  title: string;
  blocks: any[];
  fileUrl: string | null;
}

export default function MaterialWorkspace({ materialId, title, blocks, fileUrl }: MaterialWorkspaceProps) {
  const [isReaderOpen, setIsReaderOpen] = useState(true);
  const [isStudioOpen, setIsStudioOpen] = useState(true);

  return (
    <div className="h-screen w-full flex bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 overflow-hidden relative font-sans transition-colors duration-300">
      
      {/* Panel 1: Document Reader (Left Column) */}
      <AnimatePresence initial={false}>
        {isReaderOpen && (
          <motion.div 
            initial={{ width: 0, opacity: 0, flex: 0 }}
            animate={{ width: 'auto', opacity: 1, flex: 1 }}
            exit={{ width: 0, opacity: 0, flex: 0 }}
            transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
            className="h-full border-r border-slate-200 dark:border-zinc-800/80 relative overflow-hidden bg-white dark:bg-zinc-900 z-10 shrink-0"
          >
            <SmartReader materialId={materialId} title={title} initialBlocks={blocks} fileUrl={fileUrl} />
            
            {/* Collapse Trigger - Subtle edge button */}
            <button 
              onClick={() => setIsReaderOpen(false)}
              className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-50 w-5 h-10 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-full flex items-center justify-center shadow-sm hover:bg-emerald-50 dark:hover:bg-zinc-800 hover:border-emerald-200 transition-all group cursor-pointer"
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
          className="absolute left-0 top-1/2 -translate-y-1/2 z-40 w-6 h-12 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 border-l-0 rounded-r-xl flex items-center justify-center shadow-md hover:bg-emerald-50 dark:hover:bg-zinc-800 hover:border-emerald-200 transition-all group cursor-pointer"
        >
          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 transition-colors" />
        </button>
      )}

      {/* Panel 2: Course AI Core (Middle Column) */}
      <div className="flex-[1.2] flex flex-col h-full bg-white dark:bg-zinc-900 relative min-w-[450px] shadow-[0_0_40px_rgba(0,0,0,0.02)] z-0">
        <CourseChatbot materialId={materialId} isEmbedded={true} sourceBlocks={blocks} />
      </div>

      {/* Panel 3: Studio & Utilities (Right Column) */}
      <AnimatePresence initial={false}>
        {isStudioOpen && (
          <motion.div 
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 384, opacity: 1 }} // w-96
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
            className="h-full border-l border-slate-200 dark:border-zinc-800/80 relative overflow-hidden bg-slate-50 dark:bg-zinc-950 z-10 shrink-0"
          >
             {/* Collapse Trigger - Subtle edge button */}
             <button 
              onClick={() => setIsStudioOpen(false)}
              className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 z-50 w-5 h-10 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-full flex items-center justify-center shadow-sm hover:bg-emerald-50 dark:hover:bg-zinc-800 hover:border-emerald-200 transition-all group lg:opacity-100 cursor-pointer"
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
          className="absolute right-0 top-1/2 -translate-y-1/2 z-40 w-6 h-12 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 border-r-0 rounded-l-xl flex items-center justify-center shadow-md hover:bg-emerald-50 dark:hover:bg-zinc-800 hover:border-emerald-200 transition-all group cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 transition-colors" />
        </button>
      )}

    </div>
  );
}
