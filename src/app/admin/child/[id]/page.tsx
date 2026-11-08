import { Suspense } from "react";
import { AdminChild } from "./AdminChild";

export default function AdminChildPage() {
  return (
    <Suspense fallback={<div className="h-40 animate-pulse rounded-xl bg-slate-100" />}>
      <AdminChild />
    </Suspense>
  );
}
