/**
 * "Scribbles", the writing coach: an original owl drawn in SVG.
 * The speech bubble holds whatever the coach is saying.
 */
export function CoachOwl({ className = "h-14 w-14" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      {/* body */}
      <ellipse cx="32" cy="38" rx="22" ry="22" fill="#6366f1" />
      <ellipse cx="32" cy="44" rx="13" ry="13" fill="#c7d2fe" />
      {/* ear tufts */}
      <path d="M14 22 L18 8 L26 18 Z" fill="#4f46e5" />
      <path d="M50 22 L46 8 L38 18 Z" fill="#4f46e5" />
      {/* eyes */}
      <circle cx="23" cy="28" r="9" fill="#fff" />
      <circle cx="41" cy="28" r="9" fill="#fff" />
      <circle cx="24" cy="29" r="4" fill="#1e1b4b" />
      <circle cx="40" cy="29" r="4" fill="#1e1b4b" />
      <circle cx="25.5" cy="27.5" r="1.3" fill="#fff" />
      <circle cx="41.5" cy="27.5" r="1.3" fill="#fff" />
      {/* beak */}
      <path d="M29 35 L35 35 L32 40 Z" fill="#f59e0b" />
      {/* pencil tucked under a wing */}
      <g transform="rotate(-35 52 50)">
        <rect x="46" y="47" width="14" height="4" rx="1" fill="#facc15" />
        <path d="M60 47 L64 49 L60 51 Z" fill="#fde68a" />
        <rect x="44" y="47" width="3" height="4" rx="1" fill="#f472b6" />
      </g>
    </svg>
  );
}

export function CoachSays({ children, title }: { children: React.ReactNode; title?: string }) {
  return (
    <div className="flex items-start gap-3">
      <CoachOwl className="h-14 w-14 shrink-0" />
      <div className="relative min-w-0 flex-1 rounded-2xl rounded-tl-sm bg-indigo-50 p-3 text-slate-900">
        {title && <p className="text-xs font-bold uppercase tracking-wide text-indigo-700">{title}</p>}
        <div className={title ? "mt-0.5" : undefined}>{children}</div>
      </div>
    </div>
  );
}
