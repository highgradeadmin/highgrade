import type { Metadata } from "next";
import Link from "next/link";
import { Lexend } from "next/font/google";
import { AuthNav } from "@/components/AuthNav";
import { CoachOwl } from "@/components/Coach";
import { SetupGuard } from "@/components/SetupGuard";
import { Suspense } from "react";
import "./globals.css";

// Lexend was designed for reading ease, which helps younger and struggling readers.
const lexend = Lexend({ variable: "--font-lexend", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "HighGrade Writing",
  description: "Learn to write with lessons, guided practice and a personal writing coach. Grades 5 and up.",
};

const NAV = [
  { href: "/lessons", label: "Lessons", icon: "📚" },
  { href: "/write", label: "Daily Write", icon: "✍️" },
  { href: "/progress", label: "My Progress", icon: "⭐" },
];

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${lexend.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        {/* Reads the URL, so it waits for it on routes like /admin/child/[id] (Cache Components). */}
        <Suspense fallback={null}>
          <SetupGuard />
        </Suspense>
        <header className="border-b border-indigo-100 bg-white/90">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-3">
            <Link href="/" className="flex items-center gap-1.5 text-xl font-bold text-indigo-700">
              <CoachOwl className="h-8 w-8" /> HighGrade
            </Link>
            <nav className="flex gap-0.5 whitespace-nowrap text-sm sm:gap-1">
              {NAV.map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  className="rounded-full px-2 py-1.5 font-medium text-slate-700 hover:bg-indigo-50 sm:px-3"
                >
                  <span aria-hidden className="mr-1 hidden sm:inline">
                    {n.icon}
                  </span>
                  {n.label}
                </Link>
              ))}
              <AuthNav />
            </nav>
          </div>
        </header>
        <main className="mx-auto w-full min-w-0 max-w-6xl flex-1 px-4 py-8">{children}</main>
        <footer className="border-t border-indigo-100 py-6 text-center text-xs text-slate-500">
          HighGrade Writing · Your coach gives feedback — the writing is always yours.
        </footer>
      </body>
    </html>
  );
}
