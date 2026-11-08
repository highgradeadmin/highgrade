import Link from "next/link";
import { CoachSays } from "@/components/Coach";

export const metadata = { title: "Account deleted · HighGrade" };

export default function GoodbyePage() {
  return (
    <div className="mx-auto max-w-lg py-10">
      <CoachSays title="Your family account has been deleted">
        <p className="text-slate-800">
          Your account, your children&apos;s profiles and all their writing and scores are gone, and your plan
          has been cancelled. Thank you for writing with us!
        </p>
        <Link href="/" className="mt-3 inline-block font-semibold text-indigo-700 hover:underline">
          Back to the home page
        </Link>
      </CoachSays>
    </div>
  );
}
