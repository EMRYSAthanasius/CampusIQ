"use client";

import Link from "next/link";
import { ArrowLeft, FileText } from "lucide-react";

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-[#F3FAF6] text-[#6B7280] font-sans selection:bg-[#2E8B57]/15">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 w-full z-50 border-b border-[#1B4332]/5 bg-[#F3FAF6]/60 backdrop-blur-2xl">
        <div className="max-w-4xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-[#1B4332] hover:text-[#2E8B57] transition-colors">
            <ArrowLeft className="w-5 h-5" />
            <span className="font-semibold text-sm">Back to Home</span>
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8">
              <img src="/logo.png" alt="CampusIQ Logo" className="w-full h-full object-contain" />
            </div>
            <span className="text-lg font-bold tracking-tight text-[#1B4332] font-sora">
              Campus<span className="text-[#2E8B57]">IQ</span>
            </span>
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="pt-32 pb-24 px-6">
        <div className="max-w-3xl mx-auto bg-white border border-[#1B4332]/10 rounded-3xl shadow-sm p-8 md:p-12">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 rounded-2xl bg-[#2E8B57]/10 flex items-center justify-center">
              <FileText className="w-6 h-6 text-[#2E8B57]" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-semibold text-[#1B4332] tracking-tight">Terms of Service</h1>
              <p className="text-sm text-[#9CA3AF] mt-1">Last updated: May 2026</p>
            </div>
          </div>

          <div className="space-y-10 prose prose-emerald prose-p:text-[#6B7280] prose-h2:text-[#1B4332] max-w-none">
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-[#1B4332]">1. Acceptance of Terms</h2>
              <p className="leading-relaxed">
                By accessing and using CampusIQ, you agree to be bound by these Terms of Service. If you do not agree with any part of these terms, you must not use our platform. These terms apply to all students, educators, and institutions using our services.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-[#1B4332]">2. Subscription Tiers</h2>
              <p className="leading-relaxed mb-4">
                CampusIQ operates on a freemium model designed to scale with your academic needs. We offer three primary subscription tiers:
              </p>
              
              <div className="space-y-6 mt-6">
                <div className="p-5 rounded-2xl border border-[#1B4332]/10 bg-[#F3FAF6]/50">
                  <h3 className="text-lg font-bold text-[#1B4332] mb-2">Free Tier</h3>
                  <p className="text-sm">
                    Ideal for getting started. Includes access to a limited subset of past questions, basic performance tracking, and standard community leaderboards. Contains all essential tools for a foundational revision strategy.
                  </p>
                </div>
                
                <div className="p-5 rounded-2xl border border-[#2E8B57]/30 bg-[#2E8B57]/5 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 right-0 px-3 py-1 bg-[#2E8B57] text-white text-[10px] font-bold uppercase tracking-wider rounded-bl-lg">Most Popular</div>
                  <h3 className="text-lg font-bold text-[#2E8B57] mb-2">Pro Tier</h3>
                  <p className="text-sm">
                    For serious students aiming for academic excellence. Unlocks the full database of questions for your registered courses, advanced active-recall algorithms, predictive grade telemetry, and detailed weakness targeting.
                  </p>
                </div>

                <div className="p-5 rounded-2xl border border-[#1B4332] bg-[#1B4332] text-white">
                  <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                    Ultra Tier
                  </h3>
                  <p className="text-sm text-gray-300">
                    The ultimate academic laboratory. Includes everything in Pro, plus one-on-one tutor matching, priority support, early access to new module releases, and exclusive mock exam simulations calibrated to specific lecturer formats.
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-[#1B4332]">3. User Conduct and Academic Integrity</h2>
              <p className="leading-relaxed mb-4">
                You are responsible for maintaining the confidentiality of your account credentials. CampusIQ promotes academic excellence and integrity. You agree not to:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-[#6B7280]">
                <li>Share your Pro or Ultra account credentials with unauthorized individuals.</li>
                <li>Attempt to scrape, reverse-engineer, or systematically extract questions from our database.</li>
                <li>Use the platform to facilitate cheating during official university examinations.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-[#1B4332]">4. Termination</h2>
              <p className="leading-relaxed">
                We reserve the right to suspend or terminate your access to CampusIQ immediately, without prior notice or liability, if you breach these Terms of Service. Upon termination, your right to use the platform will cease immediately.
              </p>
            </section>

            <section className="pt-8 border-t border-[#1B4332]/10 mt-12">
              <h2 className="text-xl font-semibold mb-2 text-[#1B4332]">Contact Us</h2>
              <p className="leading-relaxed">
                If you have any questions about these Terms of Service, please contact us at <a href="mailto:Nnajidavid030@gmail.com" className="text-[#2E8B57] hover:underline">Nnajidavid030@gmail.com</a>.
              </p>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
