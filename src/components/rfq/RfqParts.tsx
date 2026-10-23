import type { ReactNode } from "react";
import { Check } from "lucide-react";
import logoUrl from "@/assets/electrosoft-logo.png";
import { Checkbox } from "@/components/ui/checkbox";
import type { Option } from "@/lib/rfqForm";

// Building blocks of the public requirement form.

/** Page frame the client sees: company header, the white card, footer. No app sidebar. */
export function RfqShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-svh px-3 py-6 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-3xl">
        <header className="mb-5 px-1">
          <img
            src={logoUrl}
            alt="Electrosoft Automation Pvt. Ltd."
            className="h-9 w-auto max-w-full object-contain sm:h-11"
          />
          <div className="mt-2 text-xs text-slate-500">
            Transformer Testing System – Requirement Form
          </div>
        </header>
        <main className="neo-surface relative rounded-3xl p-5 sm:p-8">{children}</main>
        <footer className="mt-6 text-center text-xs text-slate-400">
          Electrosoft Automation Pvt. Ltd. · Transformer Testing Solutions
        </footer>
      </div>
    </div>
  );
}

/** The five steps as numbered dots; finished steps can be clicked to go back. */
export function Stepper({
  steps,
  step,
  onJump,
}: {
  steps: string[];
  step: number;
  onJump: (i: number) => void;
}) {
  return (
    <div className="mb-7">
      <ol className="flex items-start">
        {steps.map((title, i) => {
          const done = i < step;
          const current = i === step;
          return (
            <li key={title} className="relative flex flex-1 flex-col items-center text-center">
              {i > 0 && (
                <span
                  className={`absolute right-1/2 top-4 h-0.5 w-full -translate-y-1/2 ${i <= step ? "bg-indigo-500" : "bg-slate-300/70"}`}
                />
              )}
              <button
                type="button"
                disabled={!done}
                onClick={() => onJump(i)}
                aria-current={current ? "step" : undefined}
                aria-label={`Step ${i + 1}: ${title}`}
                className={`relative z-10 grid h-8 w-8 place-items-center rounded-full text-xs font-bold transition ${
                  current
                    ? "bg-indigo-600 text-white ring-4 ring-indigo-100"
                    : done
                      ? "cursor-pointer bg-indigo-500 text-white hover:bg-indigo-600"
                      : "bg-slate-200 text-slate-500"
                }`}
              >
                {done ? <Check className="h-4 w-4" /> : i + 1}
              </button>
              <span
                className={`mt-2 hidden px-1 text-[11px] leading-tight sm:block ${current ? "font-semibold text-slate-800" : "text-slate-400"}`}
              >
                {title}
              </span>
            </li>
          );
        })}
      </ol>
      <p className="mt-3 text-center text-xs font-medium text-slate-500 sm:hidden">
        {step < steps.length ? `Step ${step + 1} of ${steps.length} · ${steps[step]}` : "Review"}
      </p>
    </div>
  );
}

export function Section({
  title,
  note,
  children,
}: {
  title: string;
  note?: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-indigo-950">{title}</h2>
        {note && <p className="mt-1 text-xs leading-relaxed text-slate-500">{note}</p>}
        <div className="mt-3 h-px bg-slate-300/60" />
      </div>
      {children}
    </section>
  );
}

/** A question with its label, star, hint and error. `data-error` lets the form scroll to it. */
export function Field({
  label,
  htmlFor,
  required,
  error,
  hint,
  children,
}: {
  label: string;
  htmlFor?: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div data-error={error ? "true" : undefined}>
      <label
        htmlFor={htmlFor}
        className={`mb-1.5 block text-sm font-medium ${error ? "text-rose-600" : "text-slate-700"}`}
      >
        {label}
        {required && <span className="text-rose-500"> *</span>}
      </label>
      {children}
      {error ? (
        <p className="mt-1 text-xs text-rose-600">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-xs text-slate-400">{hint}</p>
      ) : null}
    </div>
  );
}

/** Pick one: a row of pill buttons (kVA / MVA, Yes / No, Electrosoft / Customer / ...). */
export function Choice({
  options,
  value,
  onChange,
  label,
  invalid,
  size = "md",
}: {
  options: Option[];
  value: string;
  onChange: (key: string) => void;
  label: string;
  invalid?: boolean;
  size?: "sm" | "md";
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={`inline-flex flex-wrap gap-1.5 rounded-xl ${invalid ? "ring-2 ring-rose-300 ring-offset-2 ring-offset-[var(--neo-bg)]" : ""}`}
    >
      {options.map((o) => {
        const on = value === o.key;
        return (
          <button
            key={o.key}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o.key)}
            className={`cursor-pointer rounded-lg border font-medium transition ${
              size === "sm" ? "px-2.5 py-1.5 text-xs" : "px-3.5 py-2 text-sm"
            } ${
              on
                ? "border-indigo-600 bg-indigo-600 text-white shadow-sm"
                : "border-slate-300/80 bg-white/60 text-slate-600 hover:border-indigo-300 hover:text-indigo-700"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** Pick one from longer labels: a list of radio rows. */
export function RadioList({
  options,
  value,
  onChange,
  label,
  invalid,
}: {
  options: Option[];
  value: string;
  onChange: (key: string) => void;
  label: string;
  invalid?: boolean;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="space-y-1">
      {options.map((o) => {
        const on = value === o.key;
        return (
          <button
            key={o.key}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o.key)}
            className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-sm text-slate-700 hover:bg-white/60"
          >
            <span
              className={`grid h-4 w-4 shrink-0 place-items-center rounded-full border ${on ? "border-indigo-600" : invalid ? "border-rose-400" : "border-slate-400"}`}
            >
              {on && <span className="h-2 w-2 rounded-full bg-indigo-600" />}
            </span>
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function CheckOption({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (on: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-2.5 rounded-lg px-2 py-1.5 text-sm text-slate-700 hover:bg-white/60">
      <Checkbox
        checked={checked}
        onCheckedChange={(v) => onChange(v === true)}
        className="mt-0.5 !border !border-solid !border-slate-400 bg-white/70 data-[state=checked]:!border-indigo-600 data-[state=checked]:bg-indigo-600"
      />
      <span>{label}</span>
    </label>
  );
}

export function Note({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <div className="rounded-xl bg-indigo-50/70 px-4 py-3 text-xs leading-relaxed text-slate-600">
      {title && <div className="mb-0.5 font-semibold text-slate-700">{title}</div>}
      {children}
    </div>
  );
}
