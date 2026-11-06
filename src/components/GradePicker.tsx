"use client";

import { useState } from "react";
import { useProfile, type Profile } from "@/lib/storage";

/** Edit name and grade on the student's profile. */
export function GradePicker({ initial }: { initial: Profile }) {
  const [, saveProfile] = useProfile();
  const [name, setName] = useState(initial.name);
  const [grade, setGrade] = useState(initial.grade);
  const [message, setMessage] = useState<string | null>(null);

  return (
    <form
      className="flex flex-wrap items-end gap-3"
      onSubmit={async (e) => {
        e.preventDefault();
        const err = await saveProfile({ name: name.trim() || "Writer", grade });
        setMessage(err ?? "Saved!");
      }}
    >
      <label className="block">
        <span className="text-sm font-medium">First name</span>
        <input
          className="mt-1 block rounded-lg border border-slate-300 p-2 text-sm"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={40}
        />
      </label>
      <label className="block">
        <span className="text-sm font-medium">Grade</span>
        <GradeSelect value={grade} onChange={setGrade} />
      </label>
      <button className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
        Save
      </button>
      {message && <span className="text-sm text-slate-600">{message}</span>}
    </form>
  );
}

export function GradeSelect({ value, onChange }: { value: number; onChange: (g: number) => void }) {
  return (
    <select
      className="mt-1 block w-full rounded-lg border border-slate-300 p-2 text-sm"
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
    >
      {[5, 6, 7, 8, 9, 10, 11, 12].map((g) => (
        <option key={g} value={g}>
          Grade {g}
        </option>
      ))}
    </select>
  );
}
