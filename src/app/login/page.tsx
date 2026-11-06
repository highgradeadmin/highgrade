"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { AuthCard, buttonClass, inputClass } from "@/components/AuthCard";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const confirmFailed = useSearchParams().get("error") === "confirm";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <AuthCard title="Log in">
      {confirmFailed && (
        <p className="mb-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
          That confirmation link has expired or was already used. If you&apos;ve confirmed your email
          before, just log in below. Otherwise, sign up again to get a new link.
        </p>
      )}
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError(null);
          const { error } = await createClient().auth.signInWithPassword({ email, password });
          setBusy(false);
          if (error) return setError(error.message);
          router.push("/lessons");
          router.refresh();
        }}
      >
        <label className="block">
          <span className="text-sm font-medium">Email</span>
          <input type="email" required autoComplete="email" className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="block">
          <span className="text-sm font-medium">Password</span>
          <input type="password" required autoComplete="current-password" className={inputClass} value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        {error && <p className="rounded-lg bg-red-50 p-2 text-sm text-red-700">{error}</p>}
        <button disabled={busy} className={buttonClass}>
          {busy ? "Logging in…" : "Log in"}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-600">
        New here?{" "}
        <Link href="/signup" className="font-medium text-indigo-700 hover:underline">
          Create an account
        </Link>
      </p>
    </AuthCard>
  );
}
