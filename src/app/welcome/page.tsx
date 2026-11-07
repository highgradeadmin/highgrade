"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthCard, buttonClass, inputClass } from "@/components/AuthCard";
import { completeParentSignup, signOut, useAuthStatus, useProviderName } from "@/lib/storage";

const THIS_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 83 }, (_, i) => THIS_YEAR - 18 - i);

/** Finish setting up a family account after signing in with Google. */
export default function WelcomePage() {
  const status = useAuthStatus();
  const providerName = useProviderName();

  if (status === "loading") return <div className="mx-auto h-64 max-w-md animate-pulse rounded-2xl bg-slate-100" />;
  if (status === "ready") {
    return (
      <AuthCard title="You're all set">
        <Link href="/parent" className={`${buttonClass} block text-center`}>
          Go to the parent area
        </Link>
      </AuthCard>
    );
  }
  if (status !== "needs-setup") {
    return (
      <AuthCard title="Finish setting up">
        <Link href="/login" className="font-medium text-indigo-700 hover:underline">
          Log in
        </Link>{" "}
        first.
      </AuthCard>
    );
  }
  // key: prefill the name once the provider name is known
  return <SetupForm key={providerName ?? ""} initialName={providerName ?? ""} />;
}

function SetupForm({ initialName }: { initialName: string }) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [birthYear, setBirthYear] = useState("");
  const [isAdult, setIsAdult] = useState(false);
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <AuthCard title="Finish setting up">
      <p className="-mt-3 mb-5 text-sm text-slate-600">
        One more step to create your family account. Next you&apos;ll set a parent PIN and add your children.
      </p>
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!isAdult || !consent) return setError("Please confirm both boxes to continue.");
          setBusy(true);
          setError(null);
          const err = await completeParentSignup(name.trim(), Number(birthYear), true);
          setBusy(false);
          if (err) return setError(err);
          router.push("/parent");
        }}
      >
        <label className="block">
          <span className="text-sm font-medium">Your name</span>
          <input required maxLength={60} className={inputClass} value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="block">
          <span className="text-sm font-medium">Your birth year</span>
          <select required className={inputClass} value={birthYear} onChange={(e) => setBirthYear(e.target.value)}>
            <option value="" disabled>
              Select…
            </option>
            {YEARS.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </label>
        <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
          <label className="flex gap-2">
            <input type="checkbox" className="mt-0.5" checked={isAdult} onChange={(e) => setIsAdult(e.target.checked)} />
            <span>I am 18 or older and the parent or legal guardian of the children I will add.</span>
          </label>
          <label className="flex gap-2">
            <input type="checkbox" className="mt-0.5" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
            <span>
              I agree to HighGrade storing my children&apos;s first names, grades and writing, and sending their
              writing to our AI provider (Anthropic) to generate feedback. I can remove a child&apos;s profile and
              writing at any time.
            </span>
          </label>
        </div>
        {error && <p className="rounded-lg bg-red-50 p-2 text-sm text-red-700">{error}</p>}
        <button disabled={busy} className={buttonClass}>
          {busy ? "Saving…" : "Create family account"}
        </button>
      </form>
      <button
        onClick={async () => {
          await signOut();
          router.push("/");
        }}
        className="mt-5 w-full text-center text-sm text-slate-500 hover:underline"
      >
        Not you? Log out
      </button>
    </AuthCard>
  );
}
