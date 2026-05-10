"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { 
  ArrowRight, 
  BrainCircuit, 
  Target, 
  BarChart3, 
  GraduationCap,
  Sparkles,
  ShieldCheck,
  Zap,
  Trophy,
  ChevronRight,
  Play,
  CheckCircle2,
  Users,
  Building,
  BookOpen
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

  return (
    <div className="min-h-screen bg-[#0F172A] text-slate-300 font-sans selection:bg-slate-800 overflow-x-hidden">
      
      {/* Navigation */}
      <nav className="fixed top-0 left-0 w-full z-50 border-b border-white/5 bg-[#0F172A]/50 backdrop-blur-2xl">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-[#1E293B] border border-white/10 p-2 rounded-lg">
              <GraduationCap className="w-5 h-5 text-slate-50" />
            </div>
            <span className="text-xl font-semibold tracking-tight text-white">Campus<span className="font-light text-slate-500">IQ</span></span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium">
            <Link href="#platform" className="text-slate-400 hover:text-white transition-colors">Platform</Link>
            <Link href="#workflow" className="text-slate-400 hover:text-white transition-colors">Workflow</Link>
            <Link href="#metrics" className="text-slate-400 hover:text-white transition-colors">Metrics</Link>
            <Link href="#testimonials" className="text-slate-400 hover:text-white transition-colors">Testimonials</Link>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/auth/login" className="text-sm font-medium text-white hover:text-slate-300 transition-colors hidden md:block">Sign In</Link>
            <Link href="/auth/signup">
              <button className="px-5 py-2.5 bg-white text-black text-sm font-semibold rounded-full hover:bg-slate-200 transition-all hover:scale-105">
                Get Started Free
              </button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-40 pb-20 md:pt-52 md:pb-32 px-6 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-slate-800/30 rounded-full blur-[120px] -z-10" />
        
        <div className="max-w-5xl mx-auto text-center relative z-10">
          <motion.div 
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
          >
            <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-slate-700 bg-[#1E293B]/50 mb-8 backdrop-blur-md">
              <Sparkles className="w-4 h-4 text-slate-400" />
              <span className="text-xs font-semibold tracking-wide text-slate-300 uppercase">A New Standard in EdTech</span>
            </motion.div>
            
            <motion.h1 variants={fadeUp} className="text-5xl md:text-7xl lg:text-8xl font-semibold text-white tracking-tighter leading-[1.05] mb-8">
              Intelligence for <br className="hidden md:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-zinc-200 to-zinc-600">
                Modern Academia.
              </span>
            </motion.h1>
            
            <motion.p variants={fadeUp} className="text-lg md:text-xl text-slate-400 mb-12 max-w-2xl mx-auto font-light leading-relaxed">
              An enterprise-grade learning infrastructure designed to transform raw syllabi into targeted, metric-driven examination preparation.
            </motion.p>
            
            <motion.div variants={fadeUp} className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/auth/signup">
                <button className="w-full sm:w-auto px-8 py-4 bg-white text-black text-base font-semibold rounded-full hover:bg-slate-200 transition-all hover:scale-105 flex items-center justify-center gap-2 group">
                  Start Practicing Free
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </Link>
              <button className="w-full sm:w-auto px-8 py-4 bg-[#1E293B] border border-white/10 text-white text-base font-semibold rounded-full hover:bg-slate-800 transition-all flex items-center justify-center gap-2 group">
                <Play className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors" />
                Watch Demo
              </button>
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
          <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent z-10" />
          <div className="rounded-t-2xl border border-white/10 bg-[#0F172A] p-4 shadow-2xl relative overflow-hidden">
            <div className="flex items-center gap-2 mb-4 px-2">
              <div className="w-3 h-3 rounded-full bg-slate-800" />
              <div className="w-3 h-3 rounded-full bg-slate-800" />
              <div className="w-3 h-3 rounded-full bg-slate-800" />
            </div>
            <div className="aspect-video bg-[#1E293B] rounded-lg border border-white/5 relative overflow-hidden flex items-center justify-center">
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
              <div className="w-full h-full p-8 flex flex-col">
                <div className="flex gap-4 mb-8">
                  <div className="w-64 h-32 bg-slate-800/50 rounded-xl border border-white/5 p-4">
                    <div className="w-1/2 h-4 bg-slate-700 rounded mb-4" />
                    <div className="w-3/4 h-8 bg-zinc-600 rounded" />
                  </div>
                  <div className="flex-1 h-32 bg-slate-800/50 rounded-xl border border-white/5 p-4">
                     <div className="w-32 h-4 bg-slate-700 rounded mb-4" />
                     <div className="flex gap-2 items-end h-16">
                        {[40, 70, 45, 90, 65, 100, 80].map((h, i) => (
                           <div key={i} className="w-8 bg-zinc-600 rounded-t-sm" style={{ height: `${h}%` }} />
                        ))}
                     </div>
                  </div>
                </div>
                <div className="flex-1 bg-slate-800/30 rounded-xl border border-white/5 p-6">
                  <div className="w-48 h-5 bg-slate-700 rounded mb-6" />
                  <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="w-full h-12 bg-slate-800/50 rounded flex items-center px-4">
                         <div className="w-6 h-6 rounded-full bg-slate-700 mr-4" />
                         <div className="w-1/3 h-3 bg-slate-700 rounded" />
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
      <section id="metrics" className="py-16 border-y border-white/5 bg-[#0F172A]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 divide-x divide-white/5">
            {[
              { label: "Active Cohorts", value: "12,000+" },
              { label: "Queries Processed", value: "2.4M" },
              { label: "Performance Delta", value: "+0.8 GPA" },
              { label: "Institution Trust", value: "45+" },
            ].map((stat, i) => (
              <div key={i} className="text-center px-4">
                <h4 className="text-3xl md:text-5xl font-semibold text-white mb-2 tracking-tight">{stat.value}</h4>
                <p className="text-xs md:text-sm text-slate-500 font-medium uppercase tracking-widest">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Interactive Tabs Section */}
      <section id="platform" className="py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-semibold text-white tracking-tight mb-6">Engineered for the Ecosystem</h2>
            <p className="text-lg text-slate-400 font-light max-w-2xl mx-auto">A unified architecture bridging the gap between individual learning and institutional oversight.</p>
          </div>

          <div className="flex justify-center mb-16">
            <div className="inline-flex bg-[#1E293B] border border-white/10 rounded-full p-1.5 relative">
              {['students', 'educators', 'institutions'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`relative px-8 py-3 text-sm font-semibold rounded-full transition-colors z-10 ${
                    activeTab === tab ? "text-black" : "text-slate-400 hover:text-white"
                  }`}
                >
                  {activeTab === tab && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute inset-0 bg-white rounded-full -z-10"
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
                    <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center mb-6">
                      <BookOpen className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-3xl font-semibold text-white mb-6">Hyper-Optimized Study Workflows</h3>
                    <p className="text-slate-400 mb-8 leading-relaxed font-light text-lg">
                      Eliminate the guesswork from exam prep. Our algorithms ingest your syllabus and generate mathematically timed active-recall sequences.
                    </p>
                    <ul className="space-y-4">
                      {["Spaced Repetition Engine", "Granular Weakness Targeting", "Global Cohort Leaderboards"].map((item, i) => (
                        <li key={i} className="flex items-center gap-3">
                          <CheckCircle2 className="w-5 h-5 text-white/50" />
                          <span className="text-slate-300">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="aspect-square rounded-2xl bg-[#1E293B] border border-white/10 overflow-hidden relative">
                     <div className="absolute inset-0 bg-gradient-to-br from-zinc-800/50 to-transparent" />
                     {/* Mock UI */}
                     <div className="absolute inset-8 border border-white/5 bg-[#0F172A] rounded-xl p-6 flex flex-col gap-4">
                        <div className="h-10 w-1/3 bg-slate-800 rounded" />
                        <div className="flex-1 bg-[#1E293B] rounded-lg border border-white/5 flex items-center justify-center">
                           <BrainCircuit className="w-16 h-16 text-slate-700" />
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
                    <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center mb-6">
                      <Users className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-3xl font-semibold text-white mb-6">Actionable Cohort Telemetry</h3>
                    <p className="text-slate-400 mb-8 leading-relaxed font-light text-lg">
                      Monitor class comprehension in real-time. Identify bottlenecks in your curriculum before the midterm, not after.
                    </p>
                    <ul className="space-y-4">
                      {["Real-time Comprehension Analytics", "One-click Quiz Deployment", "Automated Grading Infrastructure"].map((item, i) => (
                        <li key={i} className="flex items-center gap-3">
                          <CheckCircle2 className="w-5 h-5 text-white/50" />
                          <span className="text-slate-300">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="aspect-square rounded-2xl bg-[#1E293B] border border-white/10 overflow-hidden relative">
                     <div className="absolute inset-0 bg-gradient-to-bl from-zinc-800/50 to-transparent" />
                     {/* Mock UI */}
                     <div className="absolute inset-8 border border-white/5 bg-[#0F172A] rounded-xl p-6 flex flex-col gap-4">
                        <div className="flex gap-4 h-32">
                           <div className="flex-1 bg-slate-800 rounded" />
                           <div className="flex-1 bg-slate-800 rounded" />
                           <div className="flex-1 bg-slate-800 rounded" />
                        </div>
                        <div className="flex-1 bg-[#1E293B] rounded-lg border border-white/5 flex items-end p-4 gap-2 justify-between">
                           {[40, 70, 50, 90, 85, 100, 60, 40].map((h, i) => (
                             <div key={i} className="w-8 bg-slate-700 rounded-t" style={{ height: `${h}%` }} />
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
                    <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center mb-6">
                      <Building className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-3xl font-semibold text-white mb-6">Department-Wide Standardization</h3>
                    <p className="text-slate-400 mb-8 leading-relaxed font-light text-lg">
                      Ensure consistency across hundreds of modules. CampusIQ provides the oversight necessary for accreditation and quality assurance.
                    </p>
                    <ul className="space-y-4">
                      {["SSO & LMS Integration", "Historical Trend Analysis", "Compliance & Audit Trails"].map((item, i) => (
                        <li key={i} className="flex items-center gap-3">
                          <CheckCircle2 className="w-5 h-5 text-white/50" />
                          <span className="text-slate-300">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="aspect-square rounded-2xl bg-[#1E293B] border border-white/10 overflow-hidden relative">
                     <div className="absolute inset-0 bg-gradient-to-t from-zinc-800/50 to-transparent" />
                     {/* Mock UI */}
                     <div className="absolute inset-8 border border-white/5 bg-[#0F172A] rounded-xl p-6 flex flex-col gap-4">
                        <div className="flex-1 bg-[#1E293B] rounded-lg border border-white/5 p-4 flex flex-col gap-3">
                           {[1, 2, 3, 4].map(i => (
                             <div key={i} className="h-10 w-full bg-slate-800 rounded flex items-center px-4 justify-between">
                                <div className="h-2 w-24 bg-slate-700 rounded" />
                                <div className="h-4 w-12 bg-zinc-600 rounded-full" />
                             </div>
                           ))}
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
      <section id="workflow" className="py-32 px-6 bg-[#0F172A] border-y border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-semibold text-white tracking-tight mb-6">The CampusIQ Protocol</h2>
            <p className="text-lg text-slate-400 font-light max-w-2xl mx-auto">Three phases from onboarding to examination mastery.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 relative">
            {/* Connecting line */}
            <div className="hidden md:block absolute top-12 left-20 right-20 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent z-0" />
            
            {[
              { step: "01", title: "Ingestion", desc: "Upload lecture slides and syllabus documents. Our engine parses the core learning objectives." },
              { step: "02", title: "Synthesis", desc: "Automatic generation of high-yield active recall questions calibrated to your institution's difficulty." },
              { step: "03", title: "Execution", desc: "Engage in timed mock exams. Receive instant feedback and adaptive spaced repetition schedules." }
            ].map((phase, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ delay: i * 0.2, duration: 0.6 }}
                className="relative z-10 flex flex-col items-center text-center group"
              >
                <div className="w-24 h-24 rounded-full bg-[#0F172A] border border-white/10 flex items-center justify-center mb-8 relative group-hover:border-white/30 transition-colors">
                   <div className="absolute inset-2 rounded-full border border-white/5" />
                   <span className="text-2xl font-light text-slate-500">{phase.step}</span>
                </div>
                <h3 className="text-2xl font-semibold text-white mb-4">{phase.title}</h3>
                <p className="text-slate-400 font-light leading-relaxed max-w-sm">{phase.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Deep-Dive Features Grid */}
      <section className="py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-20">
            <h2 className="text-4xl md:text-5xl font-semibold text-white tracking-tight mb-6">Core Infrastructure</h2>
            <p className="text-lg text-slate-400 font-light max-w-xl">Every component built from the ground up to support high-performance learning environments.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: BrainCircuit, title: "Active Recall Engine", desc: "Forces neural retrieval rather than passive reading." },
              { icon: BarChart3, title: "Telemetry Dashboard", desc: "Live tracking of your module-by-module competency." },
              { icon: Target, title: "Adaptive Scheduling", desc: "Calculates the exact moment you are about to forget." },
              { icon: Zap, title: "Sub-second Execution", desc: "A heavily optimized Edge-rendered architecture." },
              { icon: ShieldCheck, title: "Academic Integrity", desc: "Bank of thousands of verified, non-plagiarized scenarios." },
              { icon: Trophy, title: "Cohort Leaderboards", desc: "Anonymized ranking to benchmark against peers." }
            ].map((feature, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className="p-8 rounded-2xl bg-[#0F172A] border border-white/5 hover:border-white/10 transition-all hover:-translate-y-1 group"
              >
                <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center mb-6 group-hover:bg-white/10 transition-colors">
                  <feature.icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-3">{feature.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed font-light">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials / Social Proof */}
      <section id="testimonials" className="py-24 overflow-hidden bg-[#0F172A] border-t border-white/5">
         <div className="max-w-7xl mx-auto px-6 mb-16 text-center">
            <h2 className="text-3xl md:text-4xl font-semibold text-white tracking-tight">Trusted by Top Percentile Performers</h2>
         </div>
         <div className="flex gap-6 px-6 overflow-x-auto pb-8 snap-x hide-scrollbar">
            {[1, 2, 3, 4, 5].map((i) => (
               <div key={i} className="min-w-[350px] md:min-w-[400px] snap-center p-8 rounded-2xl bg-[#0F172A] border border-white/5 flex-shrink-0">
                  <div className="flex items-center gap-4 mb-6">
                     <img src={`/avatar_${(i % 3) + 1}.png`} alt={`Student ${i}`} className="w-12 h-12 rounded-full object-cover border border-white/10 bg-slate-800" />
                     <div>
                        <div className="text-white font-medium">Student {i}</div>
                        <div className="text-xs text-slate-500">Computer Science, Year 3</div>
                     </div>
                  </div>
                  <p className="text-slate-400 font-light italic">"The transition from passive studying to CampusIQ's active recall environment bumped my GPA by a full point. The telemetry dashboard is invaluable."</p>
               </div>
            ))}
         </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 px-6 relative overflow-hidden flex items-center justify-center min-h-[60vh]">
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-900/50 to-transparent" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] border border-white/5 rounded-full" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] border border-white/5 rounded-full" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] border border-white/5 rounded-full" />
        
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h2 className="text-5xl md:text-7xl font-semibold text-white tracking-tighter mb-8">Deploy Your Potential.</h2>
          <p className="text-xl text-slate-400 font-light mb-12 max-w-2xl mx-auto">Stop reading slides. Start actively commanding your curriculum.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/auth/signup">
              <button className="px-10 py-5 bg-white text-black text-lg font-bold rounded-full hover:bg-slate-200 transition-all hover:scale-105">
                Start Practicing Free
              </button>
            </Link>
            <button className="px-10 py-5 bg-transparent border border-white/20 text-white text-lg font-semibold rounded-full hover:bg-white/5 transition-all">
              Contact Sales
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-white/5 bg-[#0F172A]">
         <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-3">
               <GraduationCap className="w-6 h-6 text-slate-500" />
               <span className="text-xl font-semibold tracking-tight text-slate-500">Campus<span className="font-light text-slate-700">IQ</span></span>
            </div>
            <div className="flex gap-6 text-sm text-slate-500 font-medium">
               <span className="hover:text-white cursor-pointer transition-colors">Privacy</span>
               <span className="hover:text-white cursor-pointer transition-colors">Terms</span>
               <span className="hover:text-white cursor-pointer transition-colors">Status</span>
            </div>
            <p className="text-sm text-slate-600 font-medium">© 2026 CampusIQ Systems.</p>
         </div>
      </footer>

      {/* Add hide-scrollbar utility css class definition for the testimonials */}
      <style dangerouslySetInnerHTML={{__html: `
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}} />
    </div>
  );
}
