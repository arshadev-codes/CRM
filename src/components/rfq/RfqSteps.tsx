import { useRef } from "react";
import { FileUp, Paperclip, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  EQUIPMENT,
  FILE_TYPES,
  FREQUENCIES,
  INSTRUMENTS,
  LV_TROLLEYS,
  MAX_FILE_MB,
  MAX_FILES,
  NOTES,
  RATING_UNITS,
  SCOPE_CHOICES,
  STANDARDS,
  SYSTEM_TYPES,
  TEST_GROUPS,
  YES_NO,
  type Errors,
  type Option,
  type RfqAnswers,
} from "@/lib/rfqForm";
import { CheckOption, Choice, Field, Note, RadioList, Section } from "./RfqParts";

// The five steps of the requirement form, as Zoho had them.

type ListKey = "systemTypes" | "tests" | "standards";
type TextKey = {
  [K in keyof RfqAnswers]: RfqAnswers[K] extends string ? K : never;
}[keyof RfqAnswers];

export type StepProps = {
  answers: RfqAnswers;
  errors: Errors;
  set: (key: TextKey, value: string) => void;
  toggle: (key: ListKey, value: string, on: boolean) => void;
  setScope: (list: "equipment" | "instruments", values: Record<string, string>) => void;
  files: File[];
  addFiles: (files: FileList | null) => void;
  removeFile: (index: number) => void;
};

const UNITS: Option[] = RATING_UNITS.map((u) => ({ key: u, label: u }));
const SHORT_SCOPE: Option[] = SCOPE_CHOICES.map((c) => ({
  key: c.key,
  label:
    c.key === "electrosoft" ? "Electrosoft" : c.key === "customer" ? "Customer" : "Not required",
}));

function TextInput({
  id,
  p,
  field,
  placeholder,
  type = "text",
  inputMode,
  autoComplete,
}: {
  id: string;
  p: StepProps;
  field: TextKey;
  placeholder?: string;
  type?: string;
  inputMode?: "decimal" | "tel" | "email" | "text";
  autoComplete?: string;
}) {
  return (
    <Input
      id={id}
      type={type}
      inputMode={inputMode}
      autoComplete={autoComplete}
      placeholder={placeholder}
      value={p.answers[field]}
      onChange={(e) => p.set(field, e.target.value)}
      aria-invalid={Boolean(p.errors[field])}
    />
  );
}

export function CustomerStep(p: StepProps) {
  const e = p.errors;
  return (
    <Section title="Customer & Project Details">
      <Field label="Name of your company" htmlFor="rfq-company" required error={e.company}>
        <TextInput id="rfq-company" p={p} field="company" autoComplete="organization" />
      </Field>
      <Field label="Contact Person Name" htmlFor="rfq-contact" required error={e.contactPerson}>
        <TextInput id="rfq-contact" p={p} field="contactPerson" autoComplete="name" />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Email" htmlFor="rfq-email" required error={e.email}>
          <TextInput
            id="rfq-email"
            p={p}
            field="email"
            type="email"
            inputMode="email"
            autoComplete="email"
          />
        </Field>
        <Field label="Phone / WhatsApp" htmlFor="rfq-phone" required error={e.phone}>
          <div className="flex gap-2">
            <Input
              aria-label="Country code"
              className="w-20 shrink-0"
              inputMode="tel"
              value={p.answers.phoneCode}
              onChange={(ev) => p.set("phoneCode", ev.target.value)}
            />
            <TextInput
              id="rfq-phone"
              p={p}
              field="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel-national"
            />
          </div>
        </Field>
      </div>
      <Field
        label="Type of Test System Required"
        required
        error={e.systemTypes}
        hint={NOTES.systemType}
      >
        <div className="space-y-0.5">
          {SYSTEM_TYPES.map((o) => (
            <CheckOption
              key={o.key}
              label={o.label}
              checked={p.answers.systemTypes.includes(o.key)}
              onChange={(on) => p.toggle("systemTypes", o.key, on)}
            />
          ))}
        </div>
      </Field>
    </Section>
  );
}

function RangeRow({
  p,
  label,
  unit,
  min,
  max,
  minExample,
  maxExample,
}: {
  p: StepProps;
  label: string;
  unit?: string;
  min: TextKey;
  max: TextKey;
  minExample: string;
  maxExample: string;
}) {
  const suffix = unit ? ` (${unit})` : "";
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <Field
        label={`Minimum ${label}${suffix}`}
        htmlFor={`rfq-${min}`}
        required
        error={p.errors[min]}
      >
        <TextInput
          id={`rfq-${min}`}
          p={p}
          field={min}
          inputMode="decimal"
          placeholder={`Example: ${minExample}`}
        />
      </Field>
      <Field
        label={`Maximum ${label}${suffix}`}
        htmlFor={`rfq-${max}`}
        required
        error={p.errors[max]}
      >
        <TextInput
          id={`rfq-${max}`}
          p={p}
          field={max}
          inputMode="decimal"
          placeholder={`Example: ${maxExample}`}
        />
      </Field>
    </div>
  );
}

export function TransformerStep(p: StepProps) {
  const e = p.errors;
  const a = p.answers;
  return (
    <div className="space-y-10">
      <Section title="Range of Transformers to be Tested" note={NOTES.range}>
        <div className="grid gap-5 sm:grid-cols-2">
          {(
            [
              ["Minimum", "ratingMin", "ratingMinUnit", "20"],
              ["Maximum", "ratingMax", "ratingMaxUnit", "500"],
            ] as const
          ).map(([which, field, unit, example]) => (
            <div key={field} className="space-y-3">
              <Field
                label={`${which} Transformer Rating`}
                htmlFor={`rfq-${field}`}
                required
                error={e[field]}
                hint="Enter value only, then choose the unit."
              >
                <TextInput
                  id={`rfq-${field}`}
                  p={p}
                  field={field}
                  inputMode="decimal"
                  placeholder={`Example: ${example}`}
                />
              </Field>
              <Field label="Rating Unit" required error={e[unit]}>
                <Choice
                  label={`${which} rating unit`}
                  options={UNITS}
                  value={a[unit]}
                  onChange={(v) => p.set(unit, v)}
                  invalid={Boolean(e[unit])}
                />
              </Field>
            </div>
          ))}
        </div>
        <RangeRow
          p={p}
          label="HV Voltage"
          unit="kV"
          min="hvMin"
          max="hvMax"
          minExample="11"
          maxExample="220"
        />
        <RangeRow
          p={p}
          label="LV Voltage"
          unit="kV"
          min="lvMin"
          max="lvMax"
          minExample="0.433"
          maxExample="66"
        />
        <RangeRow
          p={p}
          label="% Impedance"
          min="impedanceMin"
          max="impedanceMax"
          minExample="6"
          maxExample="18"
        />
        <Field label="Frequency of Transformers Under Test" required error={e.frequency}>
          <Choice
            label="Frequency"
            options={FREQUENCIES}
            value={a.frequency}
            onChange={(v) => p.set("frequency", v)}
            invalid={Boolean(e.frequency)}
          />
        </Field>
      </Section>

      <Section title="Tests to Be Performed" note={NOTES.tests}>
        <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
          {TEST_GROUPS.map((g) => (
            <div key={g.title}>
              <div className="mb-1 px-2 text-sm font-semibold text-slate-800">{g.title}</div>
              {g.tests.map((t) => (
                <CheckOption
                  key={t.key}
                  label={t.label}
                  checked={a.tests.includes(t.key)}
                  onChange={(on) => p.toggle("tests", t.key, on)}
                />
              ))}
            </div>
          ))}
        </div>
        <div>
          <div className="mb-1 px-2 text-sm font-semibold text-slate-800">Applicable Standards</div>
          <div className="grid sm:grid-cols-2">
            {STANDARDS.map((s) => (
              <CheckOption
                key={s.key}
                label={s.label}
                checked={a.standards.includes(s.key)}
                onChange={(on) => p.toggle("standards", s.key, on)}
              />
            ))}
          </div>
          <p className="mt-1 px-2 text-xs text-slate-400">{NOTES.standards}</p>
        </div>
      </Section>
    </div>
  );
}

function ScopeList({
  p,
  list,
  title,
  items,
}: {
  p: StepProps;
  list: "equipment" | "instruments";
  title: string;
  items: Option[];
}) {
  const values = p.answers[list];
  const missing = items.some((i) => p.errors[`${list}.${i.key}`]);
  return (
    <div data-error={missing ? "true" : undefined}>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className={`text-sm font-semibold ${missing ? "text-rose-600" : "text-slate-800"}`}>
          {title} <span className="text-rose-500">*</span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-400">
          Mark all:
          {SHORT_SCOPE.map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={() => p.setScope(list, Object.fromEntries(items.map((i) => [i.key, c.key])))}
              className="cursor-pointer rounded-md px-1.5 py-0.5 font-medium text-indigo-600 hover:bg-indigo-50"
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>
      <div className="divide-y divide-slate-300/50 rounded-2xl bg-white/50 px-4">
        {items.map((item) => {
          const error = p.errors[`${list}.${item.key}`];
          return (
            <div
              key={item.key}
              className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <span className={`text-sm ${error ? "font-medium text-rose-600" : "text-slate-700"}`}>
                {item.label}
              </span>
              <Choice
                size="sm"
                label={item.label}
                options={SHORT_SCOPE}
                value={values[item.key] ?? ""}
                onChange={(v) => p.setScope(list, { [item.key]: v })}
                invalid={Boolean(error)}
              />
            </div>
          );
        })}
      </div>
      {missing && <p className="mt-1 text-xs text-rose-600">Choose an option for every item.</p>}
    </div>
  );
}

export function ScopeStep(p: StepProps) {
  return (
    <Section title="Equipment & Testing Instruments Scope" note={NOTES.scope}>
      <ScopeList p={p} list="equipment" title="Equipment" items={EQUIPMENT} />
      <Note>{NOTES.panels}</Note>
      <ScopeList p={p} list="instruments" title="Testing Instruments" items={INSTRUMENTS} />
      <Note title="Important Commercial Note">{NOTES.commercial}</Note>
    </Section>
  );
}

export function AutomationStep(p: StepProps) {
  const a = p.answers;
  return (
    <Section title="Advanced Automation & Switching Options" note={NOTES.automation}>
      <Field label="Motorized HT Isolator switch required for Temperature Rise Test?">
        <Choice
          label="Motorized HT Isolator for Temperature Rise Test"
          options={YES_NO}
          value={a.isolatorTempRise}
          onChange={(v) => p.set("isolatorTempRise", v)}
        />
      </Field>
      <Field label="Motorized HT Isolator switch with Earthing mechanism required for HT Capacitor Bank?">
        <Choice
          label="Motorized HT Isolator with Earthing for HT Capacitor Bank"
          options={YES_NO}
          value={a.isolatorCapBank}
          onChange={(v) => p.set("isolatorCapBank", v)}
        />
      </Field>
      <Field label="Type of LV Test Trolley">
        <RadioList
          label="Type of LV Test Trolley"
          options={LV_TROLLEYS}
          value={a.lvTrolley}
          onChange={(v) => p.set("lvTrolley", v)}
        />
      </Field>
      <Note>{NOTES.trolley}</Note>
    </Section>
  );
}

export function RemarksStep(p: StepProps) {
  const picker = useRef<HTMLInputElement>(null);
  return (
    <Section title="Final Remarks & Attachments">
      <Field
        label="Any special requirements or additional remarks"
        htmlFor="rfq-remarks"
        hint={NOTES.remarks}
      >
        <Textarea
          id="rfq-remarks"
          rows={5}
          value={p.answers.remarks}
          onChange={(e) => p.set("remarks", e.target.value)}
        />
      </Field>
      <Field
        label="File Upload"
        hint={`${NOTES.files} Up to ${MAX_FILES} files, ${MAX_FILE_MB} MB each.`}
      >
        <input
          ref={picker}
          type="file"
          multiple
          accept={FILE_TYPES.join(",")}
          className="hidden"
          onChange={(e) => {
            p.addFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <button
          type="button"
          onClick={() => picker.current?.click()}
          disabled={p.files.length >= MAX_FILES}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            p.addFiles(e.dataTransfer.files);
          }}
          className="flex w-full cursor-pointer items-center justify-between rounded-2xl border-2 border-dashed border-slate-300 bg-white/50 px-4 py-4 text-sm text-slate-600 transition hover:border-indigo-300 hover:text-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span>Choose file(s) or drop them here</span>
          <FileUp className="h-5 w-5" />
        </button>
        {p.files.length > 0 && (
          <ul className="mt-2 space-y-1.5">
            {p.files.map((f, i) => (
              <li
                key={`${f.name}-${f.size}`}
                className="flex items-center gap-2 rounded-xl bg-white/70 px-3 py-2 text-sm text-slate-700"
              >
                <Paperclip className="h-4 w-4 shrink-0 text-slate-400" />
                <span className="min-w-0 flex-1 truncate">{f.name}</span>
                <span className="shrink-0 text-xs text-slate-400">
                  {(f.size / 1024 / 1024).toFixed(1)} MB
                </span>
                <button
                  type="button"
                  onClick={() => p.removeFile(i)}
                  aria-label={`Remove ${f.name}`}
                  className="cursor-pointer rounded-md p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Field>
      <p className="text-xs italic leading-relaxed text-slate-500">{NOTES.privacy}</p>
    </Section>
  );
}
