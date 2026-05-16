"use client";

import { useState, useEffect, useRef } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { MessageSquare, Lock, X, Send, Copy, ThumbsUp, ThumbsDown, Bookmark, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

import ReactMarkdown from 'react-markdown';
import CitationBadge from "./CitationBadge";
import React from 'react';

export default function CourseChatbot({ materialId, isEmbedded = false, sourceBlocks = [] }: { materialId?: string, isEmbedded?: boolean, sourceBlocks?: any[] }) {
  const [isOpen, setIsOpen] = useState(isEmbedded);
  const [accessLevel, setAccessLevel] = useState<"free" | "pro" | "ultra" | "checking">("checking");
  const [messages, setMessages] = useState<{role: 'user' | 'ai', content: string, feedback?: 'like' | 'dislike'}[]>([
    { role: 'ai', content: "Hello! I'm your Course AI. How can I help you study this document today?" }
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Helper to render text with citation badges and clean tags
  const cleanMessageText = (text: string) => {
    return text
      .replace(/<thinking>[\s\S]*?<\/thinking>/g, '')
      .replace(/<suggestions>[\s\S]*?<\/suggestions>/g, '')
      .trim();
  };

  const getSuggestions = (text: string) => {
    const suggestionsMatch = text.match(/<suggestions>([\s\S]*?)<\/suggestions>/);
    if (!suggestionsMatch) return [];
    return suggestionsMatch[1].split('|').map(s => s.trim()).filter(Boolean);
  };

  const handleCopy = (text: string, id: number) => {
    navigator.clipboard.writeText(cleanMessageText(text));
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSaveToNote = (text: string) => {
    const event = new CustomEvent('campus-iq-save-note', { detail: cleanMessageText(text) });
    window.dispatchEvent(event);
  };

  const handleFeedback = (index: number, feedback: 'like' | 'dislike') => {
    setMessages(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], feedback: updated[index].feedback === feedback ? undefined : feedback };
      return updated;
    });
  };

  const renderWithCitations = (children: any) => {
    return React.Children.map(children, (child) => {
      if (typeof child === 'string') {
        // Broaden regex to catch any bracketed content as a potential citation
        const parts = child.split(/(\[[^\]]+\])/g);
        return parts.map((part, index) => {
          const match = part.match(/^\[([^\]]+)\]$/);
          if (match) {
            const id = match[1];
            // Clean "Source: " prefix if present for lookup
            const lookupId = id.replace(/^Source: /, '');
            
            // Try to find block by exact id (e.g. p-0) or by index (e.g. 0)
            let sourceBlock = sourceBlocks?.find(b => b.id === lookupId || b.id === `p-${lookupId}`);
            if (!sourceBlock && /^\d+$/.test(lookupId)) {
               sourceBlock = sourceBlocks?.[parseInt(lookupId)];
            }
            
            return (
              <CitationBadge 
                key={index} 
                id={id} 
                sourceText={sourceBlock?.content} 
              />
            );
          }
          return part;
        });
      }
      return child;
    });
  };

  const MarkdownComponents = {
    p: ({ children }: any) => <p className="mb-4 last:mb-0">{renderWithCitations(children)}</p>,
    li: ({ children }: any) => <li className="mb-2">{renderWithCitations(children)}</li>,
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  useEffect(() => {
    if (isEmbedded) setIsOpen(true);
  }, [isEmbedded]);

  const handleSendMessage = async (overrideMessage?: string) => {
    const currentMessage = overrideMessage || input;
    if (!currentMessage.trim()) return;
    
    if (!materialId) {
      setMessages(prev => [...prev, { role: 'ai', content: "Error: Material context is missing." }]);
      return;
    }

    setMessages(prev => [...prev, { role: 'user', content: currentMessage }]);
    if (!overrideMessage) setInput("");
    setIsTyping(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: currentMessage, materialId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch response');
      }

      setIsTyping(false);
      setMessages(prev => [...prev, { role: 'ai', content: '' }]);

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulatedResponse = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value, { stream: true });
          accumulatedResponse += chunk;
          
          setMessages(prev => {
            const updated = [...prev];
            if (updated.length > 0) {
              updated[updated.length - 1] = { role: 'ai', content: accumulatedResponse };
            }
            return updated;
          });
        }
      }
    } catch (e: any) {
      console.error('Chat error:', e);
      setMessages(prev => [...prev, { role: 'ai', content: `Error: ${e.message || "I couldn't connect to the AI service. Please try again."}` }]);
      setIsTyping(false);
    }
  };

  const quickActions = [
    { label: "Study Guide", prompt: "Based on this document, create a comprehensive study guide complete with a key terms glossary and major concepts summary." },
    { label: "Create FAQ", prompt: "Generate a list of the top 5 highly likely exam questions from this text along with detailed answers." },
    { label: "Briefing Doc", prompt: "Compile an executive briefing doc summarizing the core thesis, timelines, or primary frameworks introduced in this material." }
  ];

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    async function checkAccess() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setAccessLevel("free");
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("subscription_status")
        .eq("id", user.id)
        .single();
        
      if (profile) {
        setAccessLevel(profile.subscription_status as any);
      }
    }
    checkAccess();
  }, [supabase]);

  const ChatContent = (
    <div className={`flex flex-col h-full overflow-hidden ${isEmbedded ? 'bg-white' : 'bg-[#F3FAF6]'}`}>
      {!isEmbedded && (
        <div className="bg-[#1B4332] text-white p-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-[#6EE7B7]" />
            <span className="font-semibold">Course AI</span>
          </div>
          <button onClick={() => setIsOpen(false)} className="text-white/70 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {isEmbedded && (
        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2 shrink-0">
          <MessageSquare className="w-4 h-4 text-emerald-600" />
          <h2 className="text-sm font-semibold text-slate-800">Course AI Workspace</h2>
        </div>
      )}

      <div className="flex-1 relative flex flex-col overflow-hidden">
        {accessLevel === "checking" ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="animate-pulse w-8 h-8 rounded-full border-4 border-[#2E8B57] border-t-transparent animate-spin" />
          </div>
        ) : accessLevel === "ultra" ? (
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
              {messages.map((m, i) => {
                const suggestions = m.role === 'ai' ? getSuggestions(m.content) : [];
                return (
                  <div key={i} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                    <div className={`max-w-[90%] md:max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed chat-markdown ${
                      m.role === 'user' 
                        ? 'bg-emerald-600 text-white rounded-tr-none shadow-md shadow-emerald-600/10' 
                        : 'bg-slate-50 text-slate-800 border border-slate-100 rounded-tl-none'
                    }`}>
                      <ReactMarkdown components={MarkdownComponents}>{cleanMessageText(m.content)}</ReactMarkdown>
                    </div>

                    {/* Action Toolbar for AI responses */}
                    {m.role === 'ai' && m.content && (
                      <div className="flex flex-col gap-3 mt-2 ml-1">
                        <div className="flex items-center gap-4 text-slate-400">
                          <button 
                            onClick={() => handleSaveToNote(m.content)}
                            className="hover:text-emerald-600 transition-colors flex items-center gap-1 group"
                            title="Save to Notes"
                          >
                            <Bookmark className="w-3.5 h-3.5" />
                            <span className="text-[10px] font-medium opacity-0 group-hover:opacity-100 transition-opacity">Save</span>
                          </button>
                          <button 
                            onClick={() => handleCopy(m.content, i)}
                            className="hover:text-emerald-600 transition-colors flex items-center gap-1 group"
                            title="Copy to Clipboard"
                          >
                            {copiedId === i ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                            <span className="text-[10px] font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                              {copiedId === i ? 'Copied!' : 'Copy'}
                            </span>
                          </button>
                          <div className="flex items-center gap-2 border-l border-slate-200 pl-4">
                            <button 
                              onClick={() => handleFeedback(i, 'like')}
                              className={`transition-colors ${m.feedback === 'like' ? 'text-emerald-600' : 'hover:text-emerald-600'}`}
                            >
                              <ThumbsUp className={`w-3.5 h-3.5 ${m.feedback === 'like' ? 'fill-emerald-600/10' : ''}`} />
                            </button>
                            <button 
                              onClick={() => handleFeedback(i, 'dislike')}
                              className={`transition-colors ${m.feedback === 'dislike' ? 'text-rose-600' : 'hover:text-rose-600'}`}
                            >
                              <ThumbsDown className={`w-3.5 h-3.5 ${m.feedback === 'dislike' ? 'fill-rose-600/10' : ''}`} />
                            </button>
                          </div>
                        </div>

                        {/* Suggestion Chips */}
                        {suggestions.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-3">
                            {suggestions.map((chip, index) => (
                              <button
                                key={index}
                                onClick={() => handleSendMessage(chip)}
                                className="bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 text-xs px-3 py-1.5 rounded-lg border border-slate-200/60 transition-colors text-left font-medium cursor-pointer"
                              >
                                {chip}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-slate-50 p-4 rounded-2xl rounded-tl-none border border-slate-100">
                    <div className="flex gap-1.5">
                      <div className="w-1.5 h-1.5 bg-emerald-600/40 rounded-full animate-bounce" />
                      <div className="w-1.5 h-1.5 bg-emerald-600/40 rounded-full animate-bounce [animation-delay:0.2s]" />
                      <div className="w-1.5 h-1.5 bg-emerald-600/40 rounded-full animate-bounce [animation-delay:0.4s]" />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Actions Bar */}
            <div className="px-4 py-3 flex gap-2 overflow-x-auto no-scrollbar bg-slate-50/50 border-t border-slate-100">
              {quickActions.map((action, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(action.prompt)}
                  className="whitespace-nowrap px-3.5 py-1.5 bg-white border border-slate-200 rounded-full text-[11px] font-medium text-slate-600 hover:border-emerald-200 hover:text-emerald-600 hover:bg-emerald-50 transition-all shrink-0 shadow-sm"
                >
                  {action.label}
                </button>
              ))}
            </div>

            <div className="p-4 md:p-6 bg-white border-t border-slate-100 flex gap-3 shrink-0">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Ask anything about the document..."
                className="flex-1 bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-slate-800 placeholder-slate-400 transition-all"
              />
              <button 
                onClick={() => handleSendMessage()}
                disabled={!input.trim()}
                className="p-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-emerald-600/20"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center mb-6 rotate-3">
              <Lock className="w-8 h-8 text-amber-600" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">Ultra AI Workspace</h3>
            <p className="text-sm text-slate-500 mb-8 leading-relaxed">Upgrade to CampusIQ Ultra to chat directly with your course materials and unlock advanced document reasoning.</p>
            <Link href="/pricing" className="w-full max-w-[200px]">
              <button className="w-full py-3 bg-amber-500 text-white font-bold rounded-xl hover:bg-amber-600 transition-all shadow-lg shadow-amber-500/20">
                Upgrade Now
              </button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );

  if (isEmbedded) {
    return ChatContent;
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-[#2E8B57] text-white rounded-full shadow-lg flex items-center justify-center hover:bg-[#256d46] transition-transform hover:scale-105 z-40"
      >
        <MessageSquare className="w-6 h-6" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-0 right-0 w-full h-full sm:bottom-24 sm:right-6 sm:w-[400px] sm:h-[650px] bg-white sm:rounded-2xl shadow-2xl border border-[#1B4332]/10 z-50 overflow-hidden"
          >
            {ChatContent}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

