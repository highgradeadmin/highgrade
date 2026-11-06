"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut, useAuthStatus, useProfile } from "@/lib/storage";

export function AuthNav() {
  const status = useAuthStatus();
  const [profile] = useProfile();
  const router = useRouter();

  if (status === "loading" || status === "unconfigured") return null;
  if (status === "signed-out") {
    return (
      <Link href="/login" className="rounded-lg bg-indigo-600 px-2 py-1.5 sm:px-3 font-medium text-white hover:bg-indigo-700">
        Log in
      </Link>
    );
  }
  return (
    <button
      onClick={async () => {
        await signOut();
        router.push("/");
      }}
      className="rounded-lg px-2 py-1.5 sm:px-3 font-medium text-slate-500 hover:bg-slate-100"
      title={profile ? `Signed in as ${profile.name}` : undefined}
    >
      Log out
    </button>
  );
}
