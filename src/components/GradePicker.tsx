export const GRADES = [5, 6, 7, 8, 9, 10, 11, 12];

export function GradeSelect({
  value,
  onChange,
  className = "mt-1 block w-full rounded-lg border border-slate-300 p-2 text-sm",
}: {
  value: number;
  onChange: (g: number) => void;
  className?: string;
}) {
  return (
    <select className={className} value={value} onChange={(e) => onChange(Number(e.target.value))}>
      {GRADES.map((g) => (
        <option key={g} value={g}>
          Grade {g}
        </option>
      ))}
    </select>
  );
}
