"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuthStatus } from "@/lib/storage";

/** Sends logins that haven't finished family setup (e.g. new Google sign-ins) to /welcome. */
export function SetupGuard() {
  const status = useAuthStatus();
  const pathname = usePathname();
  const router = useRouter();
  useEffect(() => {
    if (status === "needs-setup" && pathname !== "/welcome") router.replace("/welcome");
  }, [status, pathname, router]);
  return null;
}
