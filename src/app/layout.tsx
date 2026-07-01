import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CogniQA — AI Code Intelligence Platform",
  description: "Understand Code. Predict Impact. Ship Smarter. CogniQA helps engineering teams analyze repositories, map dependencies, detect technical debt, and query codebases using advanced AI models.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased bg-[#050505] text-zinc-100 dark`}
    >
      <body className="min-h-full flex flex-col bg-[#050505]">{children}</body>
    </html>
  );
}
