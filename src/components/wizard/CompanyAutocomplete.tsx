import { useEffect, useRef, useState } from "react";
import { useProposalStore } from "@/store/proposalStore";
import type { Company } from "@/data/companiesData";

export function CompanyAutocomplete({
  value,
  onPick,
  onChange,
  placeholder = "Start typing company name…",
}: {
  value: string;
  onChange: (v: string) => void;
  onPick: (c: Company) => void;
  placeholder?: string;
}) {
  const companies = useProposalStore(s => s.companies);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const q = value.trim().toLowerCase();
  const matches = q
    ? companies.filter(c =>
        c.companyFullName.toLowerCase().includes(q) ||
        c.companyShortName.toLowerCase().includes(q) ||
        c.city.toLowerCase().includes(q))
    : companies.slice(0, 8);

  return (
    <div ref={wrapRef} className="relative">
      <input
        value={value}
        onFocus={() => setOpen(true)}
        onChange={e => { onChange(e.target.value); setOpen(true); }}
        placeholder={placeholder}
        className="neo-inset w-full px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 outline-none"
      />
      {open && matches.length > 0 && (
        <div className="neo-surface absolute z-30 left-0 right-0 mt-2 max-h-72 overflow-auto p-2">
          {matches.map(c => (
            <button
              key={c.id}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                onPick(c);
                setOpen(false);
              }}
              className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/60 transition flex items-start justify-between gap-3"
            >
              <div>
                <div className="text-sm font-semibold text-slate-800">{c.companyFullName}</div>
                <div className="text-[11px] text-slate-500">{c.city}, {c.state} · GST {c.gst}</div>
              </div>
              <span className="text-[10px] text-blue-700 font-bold shrink-0 mt-0.5">{c.companyShortName}</span>
            </button>
          ))}
          <div className="text-[10px] text-slate-400 px-3 pt-2 pb-1 border-t border-slate-200 mt-1">
            Manage list in Settings → Companies
          </div>
        </div>
      )}
    </div>
  );
}
