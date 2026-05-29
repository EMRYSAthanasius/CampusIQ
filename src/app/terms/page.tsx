"use client";

import Link from "next/link";
import { ArrowLeft, FileText } from "lucide-react";

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-[#F3FAF6] text-[#6B7280] font-sans selection:bg-[#2E8B57]/15">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 w-full z-50 border-b border-[#1B4332]/5 bg-[#F3FAF6]/60 backdrop-blur-2xl">
        <div className="max-w-4xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-8 h-8">
                <img src="/logo.png" alt="CampusIQ Logo" className="w-full h-full object-contain" />
              </div>
              <span className="text-lg font-bold tracking-tight text-[#1B4332] font-sora">
                Campus<span className="text-[#2E8B57]">IQ</span>
              </span>
            </Link>
            <Link href="/" className="flex items-center gap-1.5 text-[#6B7280] hover:text-[#2E8B57] transition-colors text-sm">
              <ArrowLeft className="w-4 h-4" />
              Home
            </Link>
          </div>
          <div className="flex items-center gap-6 text-sm">
            <Link href="/privacy" className="text-[#6B7280] hover:text-[#1B4332] transition-colors">Privacy</Link>
            <Link href="/terms" className="text-[#6B7280] hover:text-[#1B4332] transition-colors">Terms</Link>
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
              <h2 className="text-2xl font-semibold mb-4 text-[#1B4332]">2. Platform Access</h2>
              <p className="leading-relaxed">
                CampusIQ is currently free for all students. We may introduce premium tiers with additional features in the future. Any changes to pricing or feature access will be communicated to users in advance. Your continued use of the platform after such changes constitutes acceptance of the updated terms.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-[#1B4332]">3. User Conduct and Academic Integrity</h2>
              <p className="leading-relaxed mb-4">
                You are responsible for maintaining the confidentiality of your account credentials. CampusIQ promotes academic excellence and integrity. You agree not to:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-[#6B7280]">
                <li>Share your account credentials with unauthorized individuals.</li>
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
      {/* Footer */}
      <footer className="border-t border-[#1B4332]/5 py-8 px-6 mt-auto">
        <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-[#9CA3AF]">© 2026 CampusIQ. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <Link href="/privacy" className="text-xs text-[#6B7280] hover:text-[#2E8B57] transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="text-xs text-[#6B7280] hover:text-[#2E8B57] transition-colors">Terms of Service</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
