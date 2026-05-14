"use client";

import { useState, useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { MessageSquare, Lock, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

export default function CourseChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [accessLevel, setAccessLevel] = useState<"free" | "pro" | "ultra" | "checking">("checking");

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
            className="fixed bottom-24 right-6 w-[350px] h-[500px] bg-white rounded-2xl shadow-2xl border border-[#1B4332]/10 z-50 overflow-hidden flex flex-col"
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

            <div className="flex-1 p-6 flex flex-col items-center justify-center bg-[#F3FAF6] text-center">
              {accessLevel === "checking" ? (
                <div className="animate-pulse w-8 h-8 rounded-full border-4 border-[#2E8B57] border-t-transparent animate-spin" />
              ) : accessLevel === "ultra" ? (
                <div className="text-[#1B4332]">
                  <MessageSquare className="w-12 h-12 text-[#2E8B57] mx-auto mb-4 opacity-50" />
                  <h3 className="font-semibold text-lg mb-2">How can I help you study?</h3>
                  <p className="text-sm text-[#6B7280]">Ask me anything about this document.</p>
                  {/* Chat interface would go here */}
                </div>
              ) : (
                <div className="flex flex-col items-center p-6 bg-white rounded-xl border border-[#1B4332]/10 shadow-sm">
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
