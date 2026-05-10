import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "CampusIQ — Exam Prep for Nigerian Science Students",
    template: "%s — CampusIQ",
  },
  description:
    "Practice 5,000+ past exam questions across 14 100-level science courses. Structured exam prep with instant feedback, analytics, and progress tracking.",
  keywords: ["university quiz", "past questions", "Nigerian university", "MTH 101", "PHY 101", "science courses", "exam prep"],
  openGraph: {
    title: "CampusIQ",
    description: "Your centralized exam preparation platform for 100-level science courses.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="min-h-screen bg-[#0F172A] text-slate-400 antialiased font-sans">
        {children}
      </body>
    </html>
  );
}
