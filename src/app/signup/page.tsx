"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthCard, buttonClass, inputClass } from "@/components/AuthCard";
import { GradeSelect } from "@/components/GradePicker";
import { createClient } from "@/lib/supabase/client";

const THIS_YEAR = new Date().getFullYear();

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [grade, setGrade] = useState(5);
  const [birthYear, setBirthYear] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [parentEmail, setParentEmail] = useState("");
  const [parentAgreed, setParentAgreed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkEmail, setCheckEmail] = useState(false);
  const [busy, setBusy] = useState(false);

  // Conservative: treat as under 13 if they could still be 12 this year.
  const under13 = birthYear !== "" && THIS_YEAR - Number(birthYear) <= 13;

  if (checkEmail) {
    return (
      <AuthCard title="Check your email">
        <p className="text-slate-700">
          We sent a confirmation link to <b>{email}</b>. Click it to finish creating your account.
        </p>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Create your account">
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          if (under13 && !parentAgreed) {
            return setError("A parent or guardian needs to agree before you can sign up.");
          }
          setBusy(true);
          setError(null);
          const { data, error } = await createClient().auth.signUp({
            email,
            password,
            options: {
              emailRedirectTo: `${window.location.origin}/auth/confirm`,
              data: {
                name: name.trim(),
                grade,
                birth_year: Number(birthYear),
                parent_email: under13 ? parentEmail.trim() : null,
              },
            },
          });
          setBusy(false);
          if (error) return setError(error.message);
          if (data.session) {
            router.push("/lessons");
            router.refresh();
          } else {
            setCheckEmail(true);
          }
        }}
      >
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-sm font-medium">First name</span>
            <input required maxLength={40} className={inputClass} value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="block">
            <span className="text-sm font-medium">Grade</span>
            <GradeSelect value={grade} onChange={setGrade} />
          </label>
        </div>
        <label className="block">
          <span className="text-sm font-medium">Birth year</span>
          <select required className={inputClass} value={birthYear} onChange={(e) => setBirthYear(e.target.value)}>
            <option value="" disabled>
              Select…
            </option>
            {Array.from({ length: 70 }, (_, i) => THIS_YEAR - 8 - i).map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </label>

        {under13 && (
          <div className="space-y-3 rounded-lg border border-sky-200 bg-sky-50 p-3">
            <p className="text-sm text-sky-900">
              Because you&apos;re under 13, a parent or guardian needs to be part of this.
            </p>
            <label className="block">
              <span className="text-sm font-medium">Parent or guardian&apos;s email</span>
              <input type="email" required className={inputClass} value={parentEmail} onChange={(e) => setParentEmail(e.target.value)} />
            </label>
            <label className="flex gap-2 text-sm">
              <input type="checkbox" className="mt-0.5" checked={parentAgreed} onChange={(e) => setParentAgreed(e.target.checked)} />
              My parent or guardian is with me and agrees to me creating an account.
            </label>
          </div>
        )}

        <label className="block">
          <span className="text-sm font-medium">{under13 ? "Email (yours or your parent's)" : "Email"}</span>
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

        {error && <p className="rounded-lg bg-red-50 p-2 text-sm text-red-700">{error}</p>}
        <button disabled={busy} className={buttonClass}>
          {busy ? "Creating account…" : "Create account"}
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
