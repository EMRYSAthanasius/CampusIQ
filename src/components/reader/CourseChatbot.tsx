"use client";

import { useState, useEffect, useRef } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { MessageSquare, Lock, X, Send } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

export default function CourseChatbot({ materialId }: { materialId?: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [accessLevel, setAccessLevel] = useState<"free" | "pro" | "ultra" | "checking">("checking");
  const [messages, setMessages] = useState<{role: 'user' | 'ai', content: string}[]>([
    { role: 'ai', content: "Hello! I'm your Course AI. How can I help you study this document today?" }
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

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

      // Start streaming the AI response
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
            className="fixed bottom-0 right-0 w-full h-full sm:bottom-24 sm:right-6 sm:w-[380px] sm:h-[600px] bg-white sm:rounded-2xl shadow-2xl border border-[#1B4332]/10 z-50 overflow-hidden flex flex-col"
          >
            <div className="bg-[#1B4332] text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-[#6EE7B7]" />
                <span className="font-semibold">Course AI</span>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-white/70 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 bg-[#F3FAF6] relative flex flex-col overflow-hidden">
              {accessLevel === "checking" ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="animate-pulse w-8 h-8 rounded-full border-4 border-[#2E8B57] border-t-transparent animate-spin" />
                </div>
              ) : accessLevel === "ultra" ? (
                <div className="flex-1 flex flex-col h-full overflow-hidden">
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.map((m, i) => (
                      <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] p-3 rounded-2xl text-[13px] leading-relaxed whitespace-pre-wrap ${
                          m.role === 'user' 
                            ? 'bg-[#2E8B57] text-white rounded-tr-none' 
                            : 'bg-white text-[#1B4332] border border-[#1B4332]/5 rounded-tl-none shadow-sm'
                        }`}>
                          {m.content}
                        </div>
                      </div>
                    ))}
                    {isTyping && (
                      <div className="flex justify-start">
                        <div className="bg-white p-3 rounded-2xl rounded-tl-none border border-[#1B4332]/5 shadow-sm">
                          <div className="flex gap-1">
                            <div className="w-1.5 h-1.5 bg-[#2E8B57]/40 rounded-full animate-bounce" />
                            <div className="w-1.5 h-1.5 bg-[#2E8B57]/40 rounded-full animate-bounce [animation-delay:0.2s]" />
                            <div className="w-1.5 h-1.5 bg-[#2E8B57]/40 rounded-full animate-bounce [animation-delay:0.4s]" />
                          </div>
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Quick Actions Bar */}
                  <div className="px-4 py-2 flex gap-2 overflow-x-auto no-scrollbar bg-white/50 border-t border-[#1B4332]/5">
                    {quickActions.map((action, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSendMessage(action.prompt)}
                        className="whitespace-nowrap px-3 py-1.5 bg-white border border-[#2E8B57]/20 rounded-full text-[11px] font-medium text-[#2E8B57] hover:bg-[#2E8B57] hover:text-white transition-colors shrink-0"
                      >
                        {action.label}
                      </button>
                    ))}
                  </div>

                  <div className="p-4 bg-white border-t border-[#1B4332]/10 flex gap-2 shrink-0">
                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                      placeholder="How can I help you study?"
                      className="flex-1 bg-[#F3FAF6] border-none rounded-xl px-4 py-2.5 text-sm focus:ring-1 focus:ring-[#2E8B57] outline-none text-[#1B4332] placeholder-[#9CA3AF]"
                    />
                    <button 
                      onClick={() => handleSendMessage()}
                      disabled={!input.trim()}
                      className="p-2.5 bg-[#2E8B57] text-white rounded-xl hover:bg-[#256d46] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                  <div className="w-12 h-12 bg-[#F59E0B]/10 rounded-full flex items-center justify-center mb-4">
                    <Lock className="w-6 h-6 text-[#F59E0B]" />
                  </div>
                  <h3 className="text-lg font-semibold text-[#1B4332] mb-2">Ultra Feature</h3>
                  <p className="text-sm text-[#6B7280] mb-6">Upgrade to CampusIQ Ultra to chat directly with your course materials and clarify doubts instantly.</p>
                  <Link href="/pricing">
                    <button className="px-6 py-2 bg-[#F59E0B] text-white font-medium rounded-full hover:bg-[#D97706] transition-colors">
                      Upgrade Now
                    </button>
                  </Link>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
