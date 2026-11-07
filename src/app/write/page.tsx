import type { Metadata } from "next";
import { DailyWrite } from "@/components/DailyWrite";

export const metadata: Metadata = { title: "Daily Write · HighGrade Writing" };

export default function DailyWritePage() {
  return <DailyWrite />;
}
