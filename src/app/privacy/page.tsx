"use client";

import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-[#F3FAF6] text-[#6B7280] font-sans selection:bg-[#2E8B57]/15">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 w-full z-50 border-b border-[#1B4332]/5 bg-[#F3FAF6]/60 backdrop-blur-2xl">
        <div className="max-w-4xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-8 h-8">
                {/* eslint-disable-next-line @next/next/no-img-element */}
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
              <ShieldCheck className="w-6 h-6 text-[#2E8B57]" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-semibold text-[#1B4332] tracking-tight">Privacy Policy</h1>
              <p className="text-sm text-[#9CA3AF] mt-1">Last updated: May 2026</p>
            </div>
          </div>

          <div className="space-y-10 prose prose-emerald prose-p:text-[#6B7280] prose-h2:text-[#1B4332] max-w-none">
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-[#1B4332]">1. Data Collection</h2>
              <p className="leading-relaxed mb-4">
                At CampusIQ, we prioritize your privacy and are committed to protecting your personal data. 
                We collect information necessary to provide you with a personalized and effective learning experience. 
                This includes:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-[#6B7280]">
                <li><strong>Account Information:</strong> Name and email address provided during registration.</li>
                <li><strong>Performance Data:</strong> Quiz scores, active recall history, study duration, and interaction with course materials to power our adaptive scheduling engine.</li>
                <li><strong>Device & Usage Information:</strong> IP address, browser type, and interaction metrics to optimize platform performance.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-[#1B4332]">2. Third-Party Services</h2>
              <p className="leading-relaxed mb-4">
                To provide a seamless infrastructure, CampusIQ integrates with select third-party services. We ensure these partners adhere to strict data protection standards:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-[#6B7280]">
                <li><strong>Supabase:</strong> For secure authentication and real-time database management.</li>
                <li><strong>Vercel:</strong> For edge-rendered hosting and performance analytics.</li>
                <li><strong>Payment Processors:</strong> If paid features are introduced in the future, we will use industry-standard providers (e.g., Paystack or Flutterwave) to handle transactions. CampusIQ will not store your payment card details.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-[#1B4332]">3. How We Use Your Data</h2>
              <p className="leading-relaxed">
                Your data is strictly used to enhance your academic experience. We utilize your performance telemetry to generate mathematically timed active-recall sequences and identify curriculum bottlenecks. <strong>We do not sell your personal data to advertisers or data brokers.</strong>
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-[#1B4332]">4. Your Rights</h2>
              <p className="leading-relaxed">
                You have the right to access, modify, or delete your personal information at any time. If you wish to request a data export or account deletion, please reach out to our support team.
              </p>
            </section>

            <section className="pt-8 border-t border-[#1B4332]/10 mt-12">
              <h2 className="text-xl font-semibold mb-2 text-[#1B4332]">Contact Us</h2>
              <p className="leading-relaxed">
                If you have any questions about this Privacy Policy, please contact us at <a href="mailto:Nnajidavid030@gmail.com" className="text-[#2E8B57] hover:underline">Nnajidavid030@gmail.com</a>.
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
