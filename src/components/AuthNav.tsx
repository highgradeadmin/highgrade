"use client";

import Link from "next/link";
import { useActiveChild, useAuthStatus, useIsAdmin } from "@/lib/storage";
import { Avatar } from "./Avatar";

export function AuthNav() {
  const status = useAuthStatus();
  const child = useActiveChild();
  const isAdmin = useIsAdmin();

  if (status === "loading" || status === "unconfigured") return null;
  if (status === "signed-out") {
    return (
      <Link href="/login" className="rounded-full bg-indigo-600 px-3 py-1.5 font-medium text-white hover:bg-indigo-700 sm:px-4">
        Log in
      </Link>
    );
  }
  return (
    <>
      {isAdmin && (
        <Link href="/admin" className="rounded-lg px-2 py-1.5 font-medium text-amber-700 hover:bg-amber-50 sm:px-3">
          Admin
        </Link>
      )}
      <Link
        href="/profiles"
        title="Switch profile"
        className="flex items-center gap-1.5 rounded-full border border-slate-200 py-1 pl-1 pr-2.5 font-medium text-slate-800 hover:bg-slate-50"
      >
        {child ? (
          <Avatar avatar={child.avatar} color={child.color} size="sm" />
        ) : (
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-200 text-xs">?</span>
        )}
        {child ? child.name : "Choose"}
      </Link>
    </>
  );
}
