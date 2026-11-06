export default function Loading() {
  return (
    <div className="space-y-6" aria-busy="true">
      <div className="h-4 w-24 rounded bg-slate-200" />
      <div className="h-9 w-2/3 rounded bg-slate-200" />
      <div className="grid gap-4 md:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-32 rounded-xl bg-slate-100" />
        ))}
      </div>
    </div>
  );
}
