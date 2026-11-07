import type { Metadata } from "next";
import Link from "next/link";
import { Geist } from "next/font/google";
import { AuthNav } from "@/components/AuthNav";
import { SetupGuard } from "@/components/SetupGuard";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "HighGrade Writing",
  description: "Learn to write with lessons, guided practice and a personal writing coach. Grades 5 and up.",
};

const NAV = [
  { href: "/lessons", label: "Lessons" },
  { href: "/write", label: "Daily Write" },
  { href: "/progress", label: "My Progress" },
];

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <SetupGuard />
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-3">
            <Link href="/" className="text-lg font-bold text-indigo-700">
              ✏️ HighGrade
            </Link>
            <nav className="flex gap-0.5 whitespace-nowrap text-sm sm:gap-1">
              {NAV.map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  className="rounded-lg px-2 py-1.5 font-medium text-slate-700 hover:bg-slate-100 sm:px-3"
                >
                  {n.label}
                </Link>
              ))}
              <AuthNav />
            </nav>
          </div>
        </header>
        <main className="mx-auto w-full min-w-0 max-w-6xl flex-1 px-4 py-8">{children}</main>
        <footer className="border-t border-slate-200 py-6 text-center text-xs text-slate-500">
          HighGrade Writing · Your coach gives feedback — the writing is always yours.
        </footer>
      </body>
    </html>
  );
}
