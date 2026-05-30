"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import ScrollToTop from "@/components/ScrollToTop";
import { 
  ArrowRight, 
  BrainCircuit, 
  Target, 
  BarChart3, 
  Sparkles,
  ShieldCheck,
  Zap,
  Trophy,
  ChevronRight,
  CheckCircle2,
  Users,
  Building,
  BookOpen,
  Mail,
  MessageCircle
} from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" as const } }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

export default function LandingPage() {
  const [activeTab, setActiveTab] = useState("students");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isContactOptionsOpen, setIsContactOptionsOpen] = useState(false);


  return (
    <div className="min-h-screen bg-[#F3FAF6] text-[#6B7280] font-sans selection:bg-[#2E8B57]/15 overflow-x-hidden">
      
      {/* Navigation */}
      <nav className="fixed top-0 left-0 w-full z-50 border-b border-[#1B4332]/5 bg-[#F3FAF6]/60 backdrop-blur-2xl">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9">
              <img src="/logo.png" alt="CampusIQ Logo" className="w-full h-full object-contain" />
            </div>
            <span className="text-xl font-bold tracking-tight text-[#1B4332] font-sora">
              Campus<span className="text-[#2E8B57]">IQ</span>
            </span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium">
            <Link href="#platform" className="text-[#6B7280] hover:text-[#1B4332] transition-colors">Platform</Link>
            <Link href="#workflow" className="text-[#6B7280] hover:text-[#1B4332] transition-colors">Workflow</Link>
            <Link href="#metrics" className="text-[#6B7280] hover:text-[#1B4332] transition-colors">Metrics</Link>
            <Link href="#testimonials" className="text-[#6B7280] hover:text-[#1B4332] transition-colors">Testimonials</Link>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/auth/login" className="text-sm font-medium text-[#1B4332] hover:text-[#2E8B57] transition-colors hidden md:block">Sign In</Link>
            <Link href="/auth/signup">
              <button className="px-5 py-2.5 bg-[#2E8B57] text-white text-sm font-semibold rounded-full hover:bg-[#256d46] transition-all hover:scale-105 hidden sm:block">
                Get Started Free
              </button>
            </Link>
            {/* Mobile Menu Button */}
            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 md:hidden text-[#1B4332]"
            >
              <div className="w-6 h-5 flex flex-col justify-between">
                <span className={`w-full h-0.5 bg-current transition-all ${isMobileMenuOpen ? 'rotate-45 translate-y-2' : ''}`} />
                <span className={`w-full h-0.5 bg-current transition-all ${isMobileMenuOpen ? 'opacity-0' : ''}`} />
                <span className={`w-full h-0.5 bg-current transition-all ${isMobileMenuOpen ? '-rotate-45 -translate-y-2.5' : ''}`} />
              </div>
            </button>
          </div>
        </div>

        {/* Mobile Menu Overlay */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden bg-[#F3FAF6] border-b border-[#1B4332]/5 overflow-hidden"
            >
              <div className="px-6 py-8 flex flex-col gap-6">
                <Link href="#platform" onClick={() => setIsMobileMenuOpen(false)} className="text-lg font-medium text-[#1B4332]">Platform</Link>
                <Link href="#workflow" onClick={() => setIsMobileMenuOpen(false)} className="text-lg font-medium text-[#1B4332]">Workflow</Link>
                <Link href="#metrics" onClick={() => setIsMobileMenuOpen(false)} className="text-lg font-medium text-[#1B4332]">Metrics</Link>
                <Link href="#testimonials" onClick={() => setIsMobileMenuOpen(false)} className="text-lg font-medium text-[#1B4332]">Testimonials</Link>
                <div className="pt-4 border-t border-[#1B4332]/5 flex flex-col gap-4">
                  <Link href="/auth/login" className="text-center py-3 rounded-xl border border-[#1B4332]/10 text-[#1B4332] font-semibold">Sign In</Link>
                  <Link href="/auth/signup" className="text-center py-3 rounded-xl bg-[#2E8B57] text-white font-semibold">Get Started Free</Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>


      {/* Hero Section */}
      <section className="relative pt-40 pb-20 md:pt-52 md:pb-32 px-6 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#6EE7B7]/15 rounded-full blur-[120px] -z-10" />
        
        <div className="max-w-5xl mx-auto text-center relative z-10">
          <motion.div 
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
          >
            <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#2E8B57]/20 bg-white/60 mb-8 backdrop-blur-md">
              <Sparkles className="w-4 h-4 text-[#2E8B57]" />
              <span className="text-xs font-semibold tracking-wide text-[#1B4332] uppercase">A New Standard in EdTech</span>
            </motion.div>
            
            <motion.h1 variants={fadeUp} className="text-5xl md:text-7xl lg:text-8xl font-semibold text-[#1B4332] tracking-tighter leading-[1.05] mb-8">
              Master Your Exams. <br className="hidden md:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#2E8B57] to-[#6EE7B7]">
                Boost Your CGPA.
              </span>
            </motion.h1>
            
            <motion.p variants={fadeUp} className="text-lg md:text-xl text-[#6B7280] mb-12 max-w-2xl mx-auto font-light leading-relaxed">
              The ultimate revision platform for first-year Nigerian university students. Transform past questions and course syllabi into realistic Computer-Based Test (CBT) practice.
            </motion.p>
            
            <motion.div variants={fadeUp} className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/auth/signup">
                <button className="w-full sm:w-auto px-8 py-4 bg-[#2E8B57] text-white text-base font-semibold rounded-full hover:bg-[#256d46] transition-all hover:scale-105 flex items-center justify-center gap-2 group shadow-lg shadow-[#2E8B57]/20">
                  Start Practicing Free
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </Link>

            </motion.div>
          </motion.div>
        </div>

        {/* Dashboard Preview Mockup */}
        <motion.div 
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 1, ease: "easeOut" }}
          className="max-w-6xl mx-auto mt-24 relative"
        >
          <div className="absolute inset-0 bg-gradient-to-t from-[#F3FAF6] via-transparent to-transparent z-10" />
          <div className="rounded-t-2xl border border-[#1B4332]/10 bg-white p-2 md:p-4 shadow-2xl relative overflow-hidden">

            <div className="flex items-center gap-2 mb-4 px-2">
              <div className="w-3 h-3 rounded-full bg-[#EF4444]/60" />
              <div className="w-3 h-3 rounded-full bg-[#F59E0B]/60" />
              <div className="w-3 h-3 rounded-full bg-[#10B981]/60" />
            </div>
            <div className="aspect-video bg-[#F3FAF6] rounded-lg border border-[#1B4332]/5 relative overflow-hidden">
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#1B433208_1px,transparent_1px),linear-gradient(to_bottom,#1B433208_1px,transparent_1px)] bg-[size:24px_24px]" />
              <div className="w-full h-full p-3 md:p-8 flex flex-col">

                {/* Top stat cards */}
                <div className="flex flex-col sm:flex-row gap-3 mb-4">
                  <div className="w-full sm:w-44 h-20 sm:h-24 bg-white/90 rounded-xl border border-[#1B4332]/5 p-3 flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <div className="w-7 h-7 rounded-lg bg-[#2E8B57]/10 flex items-center justify-center">
                        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#2E8B57" strokeWidth="2"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                      </div>
                      <span className="text-[8px] font-sans font-bold text-[#2E8B57] bg-[#2E8B57]/8 px-1.5 py-0.5 rounded">+12%</span>
                    </div>
                    <div>
                      <div className="text-lg font-semibold text-[#1B4332]">247</div>
                      <div className="text-[9px] text-[#9CA3AF]">Quizzes Completed</div>
                    </div>
                  </div>
                  <div className="hidden sm:block flex-1 h-24 bg-white/90 rounded-xl border border-[#1B4332]/5 p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[9px] font-semibold text-[#6B7280] uppercase tracking-wider">Weekly Progress</span>
                      <span className="text-[8px] text-[#9CA3AF]">Last 7 days</span>
                    </div>
                    <div className="flex gap-1.5 items-end h-12">
                      {[35, 55, 40, 75, 60, 90, 70].map((h, i) => (
                        <div key={i} className="flex-1 rounded-t" style={{ height: `${h}%`, background: i === 5 ? '#2E8B57' : '#2E8B5730' }} />
                      ))}
                    </div>
                  </div>
                  <div className="w-full sm:w-36 h-20 sm:h-24 bg-white/90 rounded-xl border border-[#1B4332]/5 p-3 flex flex-col justify-between">
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                      <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#10B981" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>
                    </div>
                    <div>
                      <div className="text-lg font-semibold text-[#1B4332]">82%</div>
                      <div className="text-[9px] text-[#9CA3AF]">Avg Score</div>
                    </div>
                  </div>
                </div>

                {/* Course list */}
                <div className="flex-1 bg-white/70 rounded-xl border border-[#1B4332]/5 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider">Active Courses</span>
                    <span className="text-[9px] text-[#2E8B57] font-medium">View all →</span>
                  </div>
                  <div className="space-y-2">
                    {[
                      { code: 'MTH 101', title: 'Elementary Mathematics', score: 88, color: '#2E8B57' },
                      { code: 'PHY 101', title: 'General Physics', score: 74, color: '#F59E0B' },
                      { code: 'CHM 101', title: 'General Chemistry', score: 91, color: '#10B981' },
                    ].map((c, i) => (
                      <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-[#F3FAF6]/80">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[8px] font-bold" style={{ background: c.color + '15', color: c.color, border: `1px solid ${c.color}30` }}>{c.code.split(' ')[0]}</div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[10px] font-semibold text-[#1B4332]">{c.title}</div>
                          <div className="text-[8px] text-[#9CA3AF] font-sans font-semibold">{c.code}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-[11px] font-sans font-bold" style={{ color: c.color }}>{c.score}%</div>
                          <div className="w-16 h-1 rounded-full bg-[#1B4332]/5 overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${c.score}%`, background: c.color }} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Stats Section */}
      <section id="metrics" className="py-16 border-y border-[#1B4332]/5 bg-white/50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-y-12 md:gap-8 md:divide-x divide-[#1B4332]/5">

            {[
              { label: "100L Courses Supported", value: "14" },
              { label: "Targeted past questions", value: "5,000+" },
              { label: "Beta Platform Access", value: "Free" },
            ].map((stat, i) => (
              <div key={i} className="text-center px-4">
                <h4 className="text-3xl md:text-5xl font-semibold text-[#1B4332] mb-2 tracking-tight">{stat.value}</h4>
                <p className="text-xs md:text-sm text-[#6B7280] font-medium uppercase tracking-widest">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Interactive Tabs Section */}
      <section id="platform" className="py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-semibold text-[#1B4332] tracking-tight mb-6">Designed for Your Success</h2>
            <p className="text-lg text-[#6B7280] font-light max-w-2xl mx-auto">Revise smarter, practice faster, and master your courses with tools built specifically for Nigerian university students.</p>
          </div>

          <div className="flex justify-center mb-16 overflow-x-auto hide-scrollbar -mx-6 px-6">
            <div className="inline-flex bg-white border border-[#1B4332]/10 rounded-full p-1.5 relative shadow-sm whitespace-nowrap">

              {['students', 'educators', 'institutions'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`relative px-8 py-3 text-sm font-semibold rounded-full transition-colors z-10 ${
                    activeTab === tab ? "text-white" : "text-[#6B7280] hover:text-[#1B4332]"
                  }`}
                >
                  {activeTab === tab && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute inset-0 bg-[#2E8B57] rounded-full -z-10"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="min-h-[400px]">
            <AnimatePresence mode="wait">
              {activeTab === 'students' && (
                <motion.div
                  key="students"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.4 }}
                  className="grid md:grid-cols-2 gap-12 items-center"
                >
                  <div>
                    <div className="w-12 h-12 bg-[#2E8B57]/10 rounded-xl flex items-center justify-center mb-6">
                      <BookOpen className="w-6 h-6 text-[#2E8B57]" />
                    </div>
                    <h3 className="text-3xl font-semibold text-[#1B4332] mb-6">Realistic CBT & Exam Practice</h3>
                    <p className="text-[#6B7280] mb-8 leading-relaxed font-light text-lg">
                      Practice with verified past questions that match your exact lecturer's syllabus. No more searching for dusty physical booklet compiles.
                    </p>
                    <ul className="space-y-4">
                      {["Authentic Past Question Bank", "Topic-by-Topic Revision Mode", "Instant AI Explanations"].map((item, i) => (
                        <li key={i} className="flex items-center gap-3">
                          <CheckCircle2 className="w-5 h-5 text-[#2E8B57]" />
                          <span className="text-[#1B4332]">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="aspect-square rounded-2xl bg-white border border-[#1B4332]/10 overflow-hidden relative shadow-lg">
                     <div className="absolute inset-0 bg-gradient-to-br from-[#6EE7B7]/15 to-transparent" />
                     {/* Quiz interface mockup */}
                     <div className="absolute inset-6 flex flex-col">
                       {/* Quiz header */}
                       <div className="flex items-center justify-between mb-4">
                         <div className="flex items-center gap-2">
                           <div className="w-6 h-6 rounded bg-[#2E8B57]/15 flex items-center justify-center">
                             <BrainCircuit className="w-3.5 h-3.5 text-[#2E8B57]" />
                           </div>
                           <span className="text-[10px] font-semibold text-[#1B4332]">Active Recall Mode</span>
                         </div>
                         <span className="text-[9px] font-sans font-bold text-[#2E8B57] bg-[#2E8B57]/8 px-2 py-0.5 rounded">Q4 / 20</span>
                       </div>
                       {/* Progress bar */}
                       <div className="h-1 bg-[#1B4332]/5 rounded-full mb-5 overflow-hidden">
                         <div className="h-full w-[20%] bg-[#2E8B57] rounded-full" />
                       </div>
                       {/* Question */}
                       <div className="bg-[#F3FAF6] rounded-xl border border-[#1B4332]/5 p-4 mb-4">
                         <div className="text-[10px] font-medium text-[#1B4332] leading-relaxed">What is the derivative of f(x) = 3x² + 2x − 5?</div>
                       </div>
                       {/* Options */}
                       <div className="space-y-2 flex-1">
                         {[
                           { label: 'A', text: 'f\'(x) = 6x + 2', correct: true },
                           { label: 'B', text: 'f\'(x) = 3x + 2', correct: false },
                           { label: 'C', text: 'f\'(x) = 6x² + 2', correct: false },
                           { label: 'D', text: 'f\'(x) = 6x − 5', correct: false },
                         ].map((opt, i) => (
                           <div key={i} className={`flex items-center gap-2.5 p-2.5 rounded-lg border transition-all ${
                             opt.correct ? 'bg-[#2E8B57]/8 border-[#2E8B57]/30' : 'bg-white/80 border-[#1B4332]/5'
                           }`}>
                             <div className={`w-5 h-5 rounded text-[9px] font-bold flex items-center justify-center ${
                               opt.correct ? 'bg-[#2E8B57] text-white' : 'bg-[#1B4332]/5 text-[#9CA3AF]'
                             }`}>{opt.label}</div>
                             <span className={`text-[9px] ${opt.correct ? 'text-[#1B4332] font-medium' : 'text-[#6B7280]'}`}>{opt.text}</span>
                             {opt.correct && <CheckCircle2 className="w-3 h-3 text-[#2E8B57] ml-auto" />}
                           </div>
                         ))}
                       </div>
                       {/* Timer */}
                       <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#1B4332]/5">
                         <span className="text-[8px] text-[#9CA3AF] uppercase tracking-wider">Time remaining</span>
                         <span className="text-[10px] font-sans text-[#2E8B57] font-bold">04:32</span>
                       </div>
                     </div>
                  </div>
                </motion.div>
              )}
              {activeTab === 'educators' && (
                <motion.div
                  key="educators"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.4 }}
                  className="grid md:grid-cols-2 gap-12 items-center"
                >
                  <div>
                    <div className="w-12 h-12 bg-[#2E8B57]/10 rounded-xl flex items-center justify-center mb-6">
                      <Users className="w-6 h-6 text-[#2E8B57]" />
                    </div>
                    <h3 className="text-3xl font-semibold text-[#1B4332] mb-6">Actionable Cohort Telemetry</h3>
                    <p className="text-[#6B7280] mb-8 leading-relaxed font-light text-lg">
                      Monitor class comprehension in real-time. Identify bottlenecks in your curriculum before the midterm, not after.
                    </p>
                    <ul className="space-y-4">
                      {["Real-time Comprehension Analytics", "One-click Quiz Deployment", "Automated Grading Infrastructure"].map((item, i) => (
                        <li key={i} className="flex items-center gap-3">
                          <CheckCircle2 className="w-5 h-5 text-[#2E8B57]" />
                          <span className="text-[#1B4332]">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="aspect-square rounded-2xl bg-white border border-[#1B4332]/10 overflow-hidden relative shadow-lg">
                     <div className="absolute inset-0 bg-gradient-to-bl from-[#6EE7B7]/15 to-transparent" />
                     {/* Educator analytics mockup */}
                     <div className="absolute inset-6 flex flex-col">
                       <div className="flex items-center justify-between mb-4">
                         <span className="text-[10px] font-semibold text-[#1B4332]">Cohort Performance</span>
                         <span className="text-[8px] text-[#9CA3AF]">MTH 101 · Section A</span>
                       </div>
                       {/* Performance cards */}
                       <div className="flex gap-2 mb-4">
                         {[
                           { label: 'Class Avg', value: '76%', color: '#2E8B57' },
                           { label: 'Pass Rate', value: '94%', color: '#10B981' },
                           { label: 'At Risk', value: '3', color: '#F59E0B' },
                         ].map((s, i) => (
                           <div key={i} className="flex-1 p-2.5 rounded-lg bg-[#F3FAF6] border border-[#1B4332]/5 text-center">
                             <div className="text-sm font-semibold" style={{ color: s.color }}>{s.value}</div>
                             <div className="text-[7px] text-[#9CA3AF] uppercase tracking-wider mt-0.5">{s.label}</div>
                           </div>
                         ))}
                       </div>
                       {/* Bar chart */}
                       <div className="flex-1 bg-[#F3FAF6] rounded-xl border border-[#1B4332]/5 p-3">
                         <div className="text-[8px] text-[#9CA3AF] uppercase tracking-wider mb-2">Score distribution</div>
                         <div className="flex items-end gap-1 h-full pb-4">
                           {[15, 25, 45, 70, 90, 100, 85, 60, 35, 20].map((h, i) => (
                             <div key={i} className="flex-1 rounded-t" style={{ height: `${h}%`, background: h >= 70 ? '#2E8B57' : h >= 40 ? '#F59E0B' : '#EF4444', opacity: 0.7 }} />
                           ))}
                         </div>
                       </div>
                       {/* Student rows */}
                       <div className="mt-3 space-y-1.5">
                         {[
                           { name: 'Adaeze O.', score: 92, trend: '↑' },
                           { name: 'Emeka N.', score: 78, trend: '↑' },
                           { name: 'Fatima K.', score: 45, trend: '↓' },
                         ].map((s, i) => (
                           <div key={i} className="flex items-center justify-between p-1.5 rounded bg-white/80 border border-[#1B4332]/3">
                             <div className="flex items-center gap-1.5">
                               <div className="w-4 h-4 rounded-full bg-[#2E8B57]/10 flex items-center justify-center text-[6px] font-bold text-[#2E8B57]">{s.name[0]}</div>
                               <span className="text-[8px] text-[#1B4332] font-medium">{s.name}</span>
                             </div>
                             <div className="flex items-center gap-1">
                               <span className={`text-[8px] font-sans font-bold ${s.score >= 70 ? 'text-[#2E8B57]' : 'text-[#F59E0B]'}`}>{s.score}%</span>
                               <span className={`text-[8px] ${s.trend === '↑' ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>{s.trend}</span>
                             </div>
                           </div>
                         ))}
                       </div>
                     </div>
                  </div>
                </motion.div>
              )}
              {activeTab === 'institutions' && (
                <motion.div
                  key="institutions"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.4 }}
                  className="grid md:grid-cols-2 gap-12 items-center"
                >
                  <div>
                    <div className="w-12 h-12 bg-[#2E8B57]/10 rounded-xl flex items-center justify-center mb-6">
                      <Building className="w-6 h-6 text-[#2E8B57]" />
                    </div>
                    <h3 className="text-3xl font-semibold text-[#1B4332] mb-6">Department-Wide Standardization</h3>
                    <p className="text-[#6B7280] mb-8 leading-relaxed font-light text-lg">
                      Ensure consistency across hundreds of modules. CampusIQ provides the oversight necessary for accreditation and quality assurance.
                    </p>
                    <ul className="space-y-4">
                      {["SSO & LMS Integration", "Historical Trend Analysis", "Compliance & Audit Trails"].map((item, i) => (
                        <li key={i} className="flex items-center gap-3">
                          <CheckCircle2 className="w-5 h-5 text-[#2E8B57]" />
                          <span className="text-[#1B4332]">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="aspect-square rounded-2xl bg-white border border-[#1B4332]/10 overflow-hidden relative shadow-lg">
                     <div className="absolute inset-0 bg-gradient-to-t from-[#6EE7B7]/10 to-transparent" />
                     {/* Department overview mockup */}
                     <div className="absolute inset-6 flex flex-col">
                       <div className="flex items-center justify-between mb-4">
                         <span className="text-[10px] font-semibold text-[#1B4332]">Department Overview</span>
                         <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#2E8B57]/8 border border-[#2E8B57]/15">
                           <ShieldCheck className="w-2.5 h-2.5 text-[#2E8B57]" />
                           <span className="text-[7px] text-[#2E8B57] font-semibold">Compliant</span>
                         </div>
                       </div>
                       {/* Department cards */}
                       <div className="space-y-2 flex-1">
                         {[
                           { dept: 'Mathematics', courses: 4, students: 1240, compliance: 100, color: '#2E8B57' },
                           { dept: 'Physics', courses: 3, students: 890, compliance: 95, color: '#6366F1' },
                           { dept: 'Chemistry', courses: 3, students: 780, compliance: 100, color: '#F59E0B' },
                           { dept: 'Biology', courses: 4, students: 1100, compliance: 88, color: '#10B981' },
                         ].map((d, i) => (
                           <div key={i} className="p-2.5 rounded-lg bg-[#F3FAF6] border border-[#1B4332]/5">
                             <div className="flex items-center justify-between mb-1.5">
                               <div className="flex items-center gap-2">
                                 <div className="w-1.5 h-5 rounded-full" style={{ background: d.color }} />
                                 <span className="text-[9px] font-semibold text-[#1B4332]">{d.dept}</span>
                               </div>
                               <span className={`text-[7px] font-sans font-black ${d.compliance === 100 ? 'text-[#2E8B57]' : 'text-[#F59E0B]'}`}>{d.compliance}%</span>
                             </div>
                             <div className="flex items-center gap-3">
                               <span className="text-[7px] text-[#9CA3AF]">{d.courses} courses</span>
                               <span className="text-[7px] text-[#9CA3AF]">·</span>
                               <span className="text-[7px] text-[#9CA3AF]">{d.students.toLocaleString()} students</span>
                               <div className="flex-1 h-1 rounded-full bg-[#1B4332]/5 overflow-hidden ml-auto max-w-[60px]">
                                 <div className="h-full rounded-full" style={{ width: `${d.compliance}%`, background: d.color }} />
                               </div>
                             </div>
                           </div>
                         ))}
                       </div>
                       {/* Summary bar */}
                       <div className="mt-3 pt-3 border-t border-[#1B4332]/5 flex items-center justify-between">
                         <span className="text-[8px] text-[#9CA3AF]">14 courses · 4,010 students</span>
                         <span className="text-[8px] font-semibold text-[#2E8B57]">96% overall compliance</span>
                       </div>
                     </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </section>

      {/* How it Works / Workflow */}
      <section id="workflow" className="py-32 px-6 bg-white/40 border-y border-[#1B4332]/5">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-semibold text-[#1B4332] tracking-tight mb-6">How CampusIQ Works</h2>
            <p className="text-lg text-[#6B7280] font-light max-w-2xl mx-auto">Three simple steps to build your confidence and pass with flying colors.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 relative">
            {/* Connecting line */}
            <div className="hidden md:block absolute top-12 left-20 right-20 h-px bg-gradient-to-r from-transparent via-[#2E8B57]/20 to-transparent z-0" />
            
            {[
              { step: "01", title: "Select Course", desc: "Pick from our wide array of 100L courses, including Mathematics, Physics, Chemistry, and GST modules." },
              { step: "02", title: "Practice CBT", desc: "Take realistic timed mock computer-based tests designed to simulate your actual university exam environment." },
              { step: "03", title: "Master Weaknesses", desc: "Get detailed answer breakdowns and smart insights to identify and improve on your weak areas instantly." }
            ].map((phase, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ delay: i * 0.2, duration: 0.6 }}
                className="relative z-10 flex flex-col items-center text-center group"
              >
                <div className="w-24 h-24 rounded-full bg-white border border-[#1B4332]/10 flex items-center justify-center mb-8 relative group-hover:border-[#2E8B57]/30 transition-colors shadow-sm">
                   <div className="absolute inset-2 rounded-full border border-[#1B4332]/5" />
                   <span className="text-2xl font-light text-[#2E8B57]">{phase.step}</span>
                </div>
                <h3 className="text-2xl font-semibold text-[#1B4332] mb-4">{phase.title}</h3>
                <p className="text-[#6B7280] font-light leading-relaxed max-w-sm">{phase.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Deep-Dive Features Grid */}
      <section className="py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-20">
            <h2 className="text-4xl md:text-5xl font-semibold text-[#1B4332] tracking-tight mb-6">Designed for Smarter Revision</h2>
            <p className="text-lg text-[#6B7280] font-light max-w-xl">Everything you need to build confidence, save time, and hit your target grade.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: BrainCircuit, title: "Smart CBT Simulator", desc: "Simulates real university CBT platforms with actual multi-choice formatting." },
              { icon: BarChart3, title: "Detailed Analytics", desc: "Track your scores and monitor your progress module by module." },
              { icon: Target, title: "Step-by-Step Explanations", desc: "Learn from your mistakes with clear, instant answer breakdowns for each question." },
              { icon: Zap, title: "Super Fast & Light", desc: "Optimized to load instantly and run perfectly even on weak networks." },
              { icon: ShieldCheck, title: "Lecturer Calibrated", desc: "Questions curated to match actual Nigerian university standard exam questions." },
              { icon: Trophy, title: "Study Planner & Streaks", desc: "Plan your study session goals and stay consistent throughout the semester." }
            ].map((feature, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className="p-8 rounded-2xl bg-white/70 backdrop-blur-sm border border-[#1B4332]/5 hover:border-[#2E8B57]/20 transition-all hover:-translate-y-1 group shadow-sm"
              >
                <div className="w-12 h-12 rounded-xl bg-[#2E8B57]/8 flex items-center justify-center mb-6 group-hover:bg-[#2E8B57]/15 transition-colors">
                  <feature.icon className="w-5 h-5 text-[#2E8B57]" />
                </div>
                <h3 className="text-lg font-semibold text-[#1B4332] mb-3">{feature.title}</h3>
                <p className="text-sm text-[#6B7280] leading-relaxed font-light">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Early Access / Feedback */}
      <section id="testimonials" className="py-24 px-6 bg-white/30 border-t border-[#1B4332]/5">
         <div className="max-w-4xl mx-auto text-center">
            <div className="mb-6 inline-flex items-center gap-2 px-4 py-1.5 bg-emerald-50 border border-emerald-200 rounded-full text-xs font-bold text-emerald-700 uppercase tracking-widest">
               Beta
            </div>
            <h2 className="text-4xl md:text-5xl font-semibold text-[#1B4332] tracking-tight mb-6">
              Be Among the First
            </h2>
            <p className="text-lg text-[#6B7280] max-w-2xl mx-auto mb-12 leading-relaxed">
              CampusIQ is actively being built for 100-level students at FUOYE and beyond. 
              Sign up now to get early access, shape the product with your feedback, and prepare 
              smarter from day one.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
              {[
                {
                  icon: "🎯",
                  title: "Practice-First Design",
                  desc: "Built around actual CBT question formats used in Nigerian university exams — not generic quiz apps."
                },
                {
                  icon: "📚",
                  title: "Course-Specific Content",
                  desc: "Questions organised by course code. Study MTH101, BIO102, or CHM101 with questions mapped to your syllabus."
                },
                {
                  icon: "💬",
                  title: "Shape What Gets Built",
                  desc: "Early users directly influence the roadmap. Your feedback determines which features ship next."
                }
              ].map((card, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1, duration: 0.5 }}
                  className="p-7 rounded-2xl bg-white/70 backdrop-blur-sm border border-[#1B4332]/5 shadow-sm hover:shadow-md hover:border-[#2E8B57]/15 transition-all"
                >
                  <div className="text-3xl mb-4">{card.icon}</div>
                  <h3 className="text-base font-semibold text-[#1B4332] mb-2">{card.title}</h3>
                  <p className="text-sm text-[#6B7280] leading-relaxed">{card.desc}</p>
                </motion.div>
              ))}
            </div>
         </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 px-6 relative overflow-hidden flex items-center justify-center min-h-[60vh]">
        <div className="absolute inset-0 bg-gradient-to-t from-[#6EE7B7]/5 to-transparent" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] border border-[#2E8B57]/8 rounded-full" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] border border-[#2E8B57]/8 rounded-full" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] border border-[#2E8B57]/8 rounded-full" />
        
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h2 className="text-4xl md:text-7xl font-semibold text-[#1B4332] tracking-tighter mb-8 px-4">Unlock Your Academic Potential.</h2>
          <p className="text-lg md:text-xl text-[#6B7280] font-light mb-12 max-w-2xl mx-auto px-6">Stop passive reading. Start practicing with actual CBT questions today and see the difference.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 px-6">

            <Link href="/auth/signup">
              <button className="px-10 py-5 bg-[#2E8B57] text-white text-lg font-bold rounded-full hover:bg-[#256d46] transition-all hover:scale-105 shadow-lg shadow-[#2E8B57]/20">
                Start Practicing Free
              </button>
            </Link>
            <div className="relative">
              <button 
                onClick={() => setIsContactOptionsOpen(!isContactOptionsOpen)}
                className="px-10 py-5 bg-white border border-[#1B4332]/10 text-[#1B4332] text-lg font-semibold rounded-full hover:bg-[#F3FAF6] transition-all flex items-center gap-2"
              >
                Contact Sales
                <motion.div
                  animate={{ rotate: isContactOptionsOpen ? 180 : 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <ChevronRight className="w-4 h-4 rotate-90" />
                </motion.div>
              </button>

              <AnimatePresence>
                {isContactOptionsOpen && (
                  <>
                    {/* Backdrop to close on click outside */}
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={() => setIsContactOptionsOpen(false)}
                      className="fixed inset-0 z-40"
                    />
                    
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute bottom-full mb-4 left-1/2 -translate-x-1/2 w-72 bg-white rounded-3xl border border-[#1B4332]/10 shadow-[0_20px_50px_rgba(27,67,50,0.15)] p-4 z-50 backdrop-blur-xl"
                    >
                      <div className="flex flex-col gap-2">
                        <a 
                          href="https://wa.me/2349137079072" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center gap-4 p-4 rounded-2xl hover:bg-[#25D366]/5 transition-all group border border-transparent hover:border-[#25D366]/20"
                        >
                          <div className="w-12 h-12 rounded-2xl bg-[#25D366]/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <MessageCircle className="w-6 h-6 text-[#25D366]" />
                          </div>
                          <div className="text-left">
                            <div className="text-[15px] font-bold text-[#1B4332]">WhatsApp</div>
                            <div className="text-xs text-[#6B7280]">Instant response</div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-[#1B4332]/20 ml-auto group-hover:translate-x-1 transition-transform" />
                        </a>
                        
                        <a 
                          href="mailto:Nnajidavid030@gmail.com"
                          className="flex items-center gap-4 p-4 rounded-2xl hover:bg-[#EA4335]/5 transition-all group border border-transparent hover:border-[#EA4335]/20"
                        >
                          <div className="w-12 h-12 rounded-2xl bg-[#EA4335]/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Mail className="w-6 h-6 text-[#EA4335]" />
                          </div>
                          <div className="text-left">
                            <div className="text-[15px] font-bold text-[#1B4332]">Gmail</div>
                            <div className="text-xs text-[#6B7280]">Official inquiry</div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-[#1B4332]/20 ml-auto group-hover:translate-x-1 transition-transform" />
                        </a>
                      </div>
                      
                      {/* Arrow tail */}
                      <div className="absolute top-full left-1/2 -translate-x-1/2 w-4 h-4 bg-white border-r border-b border-[#1B4332]/10 rotate-45 -mt-2" />
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#1B4332] text-[#F3FAF6] relative overflow-hidden">
        {/* Glassmorphism accent */}
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#6EE7B7]/30 to-transparent" />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#2E8B57]/8 rounded-full blur-[120px] -translate-y-1/2" />
        
        <div className="max-w-7xl mx-auto px-6 pt-20 pb-8 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-8 mb-16">
            
            {/* Column 1: Brand */}
            <div className="lg:col-span-1">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10">
                  <img src="/logo.png" alt="CampusIQ Logo" className="w-full h-full object-contain" />
                </div>
                <span className="text-xl font-bold tracking-tight text-white font-sora">
                  Campus<span className="text-[#6EE7B7]">IQ</span>
                </span>
              </div>
              <p className="text-sm text-[#F3FAF6]/60 leading-relaxed mb-6 max-w-xs">
                Empowering students with structured exam preparation. Built for the Nigerian academic ecosystem.
              </p>
              {/* Social Icons */}
              <div className="flex gap-3">
                {[
                  { label: 'Twitter', path: 'M22.46 6c-.77.35-1.6.58-2.46.69.88-.53 1.56-1.37 1.88-2.38-.83.5-1.75.85-2.72 1.05C18.37 4.5 17.26 4 16 4c-2.35 0-4.27 1.92-4.27 4.29 0 .34.04.67.11.98C8.28 9.09 5.11 7.38 3 4.79c-.37.63-.58 1.37-.58 2.15 0 1.49.75 2.81 1.91 3.56-.71 0-1.37-.2-1.95-.5v.03c0 2.08 1.48 3.82 3.44 4.21a4.22 4.22 0 01-1.93.07 4.28 4.28 0 004 2.98 8.521 8.521 0 01-5.33 1.84c-.34 0-.68-.02-1.02-.06C3.44 20.29 5.7 21 8.12 21 16 21 20.33 14.46 20.33 8.79c0-.19 0-.37-.01-.56.84-.6 1.56-1.36 2.14-2.23z' },
                  { label: 'Instagram', path: 'M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z' },
                ].map((social, i) => (
                  <a key={i} href="#" aria-label={social.label} className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center hover:bg-[#2E8B57]/20 hover:border-[#2E8B57]/30 transition-all">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-[#F3FAF6]/60"><path d={social.path} /></svg>
                  </a>
                ))}
              </div>
            </div>

            {/* Column 2: Contact */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-[#6EE7B7] mb-6">Contact</h4>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[#F3FAF6]/40 mt-0.5 shrink-0"><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></svg>
                  <a href="mailto:Nnajidavid030@gmail.com" className="text-sm text-[#F3FAF6]/60 hover:text-[#6EE7B7] transition-colors break-all">Nnajidavid030@gmail.com</a>
                </li>
                <li className="flex items-start gap-3">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[#F3FAF6]/40 mt-0.5 shrink-0"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
                  <a href="tel:+2349137079072" className="text-sm text-[#F3FAF6]/60 hover:text-[#6EE7B7] transition-colors">+234 913 707 9072</a>
                </li>
                <li className="flex items-start gap-3">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[#F3FAF6]/40 mt-0.5 shrink-0"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></svg>
                  <span className="text-sm text-[#F3FAF6]/60">Built at Federal University Oye-Ekiti · Designed for all Nigerian campuses</span>
                </li>
              </ul>

              {/* FUOYE Mini Map */}
              <div className="mt-6 rounded-xl overflow-hidden border border-white/10 bg-white/5 relative group">
                <a
                  href="https://www.google.com/maps/place/Federal+University+Oye-Ekiti/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block"
                >
                  <svg viewBox="0 0 280 120" fill="none" className="w-full h-auto">
                    {/* Map background */}
                    <rect width="280" height="120" fill="#162D24" />
                    {/* Roads */}
                    <path d="M0 60 Q70 40 140 55 Q210 70 280 45" stroke="#2E8B57" strokeWidth="1.5" opacity="0.3" />
                    <path d="M0 80 Q50 90 100 75 Q180 50 280 70" stroke="#2E8B57" strokeWidth="1" opacity="0.2" />
                    <path d="M140 0 Q130 40 145 80 Q155 100 140 120" stroke="#2E8B57" strokeWidth="1" opacity="0.2" />
                    {/* Building blocks */}
                    <rect x="100" y="35" width="30" height="18" rx="2" fill="#2E8B57" opacity="0.15" />
                    <rect x="138" y="42" width="24" height="14" rx="2" fill="#2E8B57" opacity="0.2" />
                    <rect x="170" y="38" width="20" height="12" rx="2" fill="#2E8B57" opacity="0.12" />
                    <rect x="115" y="65" width="22" height="16" rx="2" fill="#2E8B57" opacity="0.15" />
                    <rect x="145" y="62" width="28" height="20" rx="2" fill="#2E8B57" opacity="0.18" />
                    {/* Green areas */}
                    <circle cx="90" cy="50" r="15" fill="#6EE7B7" opacity="0.06" />
                    <circle cx="200" cy="60" r="20" fill="#6EE7B7" opacity="0.05" />
                    {/* Pin */}
                    <circle cx="148" cy="52" r="6" fill="#2E8B57" opacity="0.6" />
                    <circle cx="148" cy="52" r="3" fill="#6EE7B7" />
                    {/* Label */}
                    <text x="148" y="95" textAnchor="middle" fill="#6EE7B7" fontSize="8" fontFamily="monospace" opacity="0.7">FUOYE Campus</text>
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-[#1B4332]/60 backdrop-blur-sm">
                    <span className="text-[10px] font-semibold text-[#6EE7B7] uppercase tracking-wider">Open in Maps →</span>
                  </div>
                </a>
              </div>
            </div>

            {/* Column 3: Resources */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-[#6EE7B7] mb-6">Resources</h4>
              <ul className="space-y-3">
                {[
                  { label: 'CBT Quizzes', href: '/dashboard/courses' },
                  { label: '100L Courses', href: '/dashboard/courses' },
                  { label: 'Mock Exams', href: '/dashboard/courses' },
                ].map((link, i) => (
                  <li key={i}>
                    <Link href={link.href} className="text-sm text-[#F3FAF6]/60 hover:text-[#6EE7B7] transition-colors flex items-center gap-2 group">
                      <ChevronRight className="w-3 h-3 text-[#F3FAF6]/20 group-hover:text-[#6EE7B7] group-hover:translate-x-0.5 transition-all" />
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Column 4: Legal */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-[#6EE7B7] mb-6">Legal</h4>
              <ul className="space-y-3">
                {[
                  { label: 'Privacy Policy', href: '/privacy' },
                  { label: 'Terms of Service', href: '/terms' },
                ].map((link, i) => (
                  <li key={i}>
                    <Link href={link.href} className="text-sm text-[#F3FAF6]/60 hover:text-[#6EE7B7] transition-colors flex items-center gap-2 group">
                      <ChevronRight className="w-3 h-3 text-[#F3FAF6]/20 group-hover:text-[#6EE7B7] group-hover:translate-x-0.5 transition-all" />
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-xs text-[#F3FAF6]/40 font-medium">
              Copyright © 2026 CampusIQ. All Rights Reserved.
            </p>
            <div className="flex items-center gap-2 text-xs text-[#F3FAF6]/30">
              <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
              All systems operational
            </div>
          </div>
        </div>
      </footer>

      <ScrollToTop />
    </div>
  );
}
