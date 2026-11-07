"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthCard, buttonClass, inputClass } from "@/components/AuthCard";
import { createClient } from "@/lib/supabase/client";

const THIS_YEAR = new Date().getFullYear();
// Adults only: the youngest selectable birth year is 18 years ago.
const YEARS = Array.from({ length: 83 }, (_, i) => THIS_YEAR - 18 - i);

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [birthYear, setBirthYear] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isAdult, setIsAdult] = useState(false);
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkEmail, setCheckEmail] = useState(false);
  const [busy, setBusy] = useState(false);

  if (checkEmail) {
    return (
      <AuthCard title="Check your email">
        <p className="text-slate-700">
          We sent a confirmation link to <b>{email}</b>. Click it to finish creating your family account,
          then you&apos;ll set a parent PIN and add your children.
        </p>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Create a family account">
      <p className="-mt-3 mb-5 text-sm text-slate-600">
        For parents and guardians. You&apos;ll add your children&apos;s profiles next — children don&apos;t need
        their own email or password.
      </p>
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!isAdult || !consent) {
            return setError("Please confirm both boxes to continue.");
          }
          setBusy(true);
          setError(null);
          const { data, error } = await createClient().auth.signUp({
            email,
            password,
            options: {
              emailRedirectTo: `${window.location.origin}/auth/confirm`,
              data: { name: name.trim(), birth_year: Number(birthYear), parent_consent: true },
            },
          });
          setBusy(false);
          if (error) {
            return setError(
              /database error/i.test(error.message)
                ? "Only parents or guardians aged 18 or older can create an account."
                : error.message,
            );
          }
          if (data.session) {
            router.push("/parent");
            router.refresh();
          } else {
            setCheckEmail(true);
          }
        }}
      >
        <label className="block">
          <span className="text-sm font-medium">Your name</span>
          <input required maxLength={60} autoComplete="name" className={inputClass} value={name} onChange={(e) => setName(e.target.value)} />
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
        <label className="block">
          <span className="text-sm font-medium">Email</span>
          <input type="email" required autoComplete="email" className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="block">
          <span className="text-sm font-medium">Password</span>
          <input
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            className={inputClass}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <span className="text-xs text-slate-500">At least 8 characters.</span>
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
          {busy ? "Creating account…" : "Create family account"}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-600">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-indigo-700 hover:underline">
          Log in
        </Link>
      </p>
    </AuthCard>
  );
}
