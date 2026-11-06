import { useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Loader2,
  Paperclip,
  Pencil,
  Send,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { callFunction } from "@/lib/edgeFunction";
import { BUCKET } from "@/lib/enquiries";
import {
  cleanAnswers,
  emptyAnswers,
  fileProblem,
  MAX_FILES,
  STEPS,
  stepErrors,
  summarize,
  type Errors,
  type RfqAnswers,
} from "@/lib/rfqForm";
import { RfqShell, Stepper } from "./RfqParts";
import {
  AutomationStep,
  CustomerStep,
  RemarksStep,
  ScopeStep,
  TransformerStep,
  type StepProps,
} from "./RfqSteps";

// The requirement form a client fills before we quote: common link (/rfq) or a personal link
// (/rfq/<token>) that comes with their details filled in. Answers go to the enquiry-form Edge
// Function; a half-filled form waits in the client's browser until they come back.

type Phase = "loading" | "invalid" | "already" | "welcome" | "form" | "review" | "sent";

type OpenReply = { submitted: boolean; company?: string; prefill?: Partial<RfqAnswers> };
type SubmitReply = {
  ok: true;
  enquiryNo?: string | null;
  id?: string;
  finishKey?: string;
  uploads?: { path: string; token: string }[];
};

const STEP_BODIES = [CustomerStep, TransformerStep, ScopeStep, AutomationStep, RemarksStep];

/** Which form step each review section was asked on (see summarize()). */
const SECTION_STEP = [0, 1, 1, 2, 2, 3, 4];

type Draft = { answers: RfqAnswers; step: number };

function readDraft(key: string): Draft | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const saved = JSON.parse(raw) as { answers?: unknown; step?: unknown };
    const step = Number(saved.step);
    return {
      answers: cleanAnswers(saved.answers),
      step: step >= 0 && step < STEPS.length ? step : 0,
    };
  } catch {
    return null;
  }
}

function writeDraft(key: string, draft: Draft | null) {
  try {
    if (draft) localStorage.setItem(key, JSON.stringify(draft));
    else localStorage.removeItem(key);
  } catch {
    // Private windows may block storage; the form still works, it just won't remember.
  }
}

const hasErrors = (e: Errors) => Object.values(e).some(Boolean);

const scrollTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

export function RfqForm({ token }: { token?: string }) {
  const draftKey = `rfq-draft:${token || "common"}`;
  const [phase, setPhase] = useState<Phase>(token ? "loading" : "welcome");
  const [answers, setAnswers] = useState<RfqAnswers>(emptyAnswers);
  const [step, setStep] = useState(0);
  const [resumeStep, setResumeStep] = useState<number | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [files, setFiles] = useState<File[]>([]);
  const [website, setWebsite] = useState("");
  const [sending, setSending] = useState<string | null>(null);
  const [result, setResult] = useState<{ enquiryNo: string | null; missing: number } | null>(null);
  const [company, setCompany] = useState("");
  const [problem, setProblem] = useState("");

  // A personal link brings the client's details; a saved draft brings what they already typed.
  useEffect(() => {
    let alive = true;
    const draft = readDraft(draftKey);
    const resume = (base: Partial<RfqAnswers>) => {
      setAnswers(cleanAnswers({ ...emptyAnswers(), ...base, ...(draft?.answers ?? {}) }));
      setResumeStep(draft ? draft.step : null);
      setPhase("welcome");
    };
    if (!token) {
      resume({});
      return;
    }
    void callFunction<OpenReply>("enquiry-form", { action: "open", token }).then((res) => {
      if (!alive) return;
      if (!res.ok) {
        setProblem(res.error);
        setPhase("invalid");
      } else if (res.data.submitted) {
        setCompany(res.data.company ?? "");
        setPhase("already");
      } else resume(res.data.prefill ?? {});
    });
    return () => {
      alive = false;
    };
  }, [token, draftKey]);

  useEffect(() => {
    if (phase === "form" || phase === "review") writeDraft(draftKey, { answers, step });
  }, [answers, step, phase, draftKey]);

  const clearError = (key: string) => setErrors((e) => (e[key] ? { ...e, [key]: undefined } : e));

  const props: StepProps = {
    answers,
    errors,
    set: (key, value) => {
      setAnswers((a) => ({ ...a, [key]: value }));
      clearError(key);
      // A new unit can make "less than the minimum" wrong; it is checked again on Next.
      if (key === "ratingMinUnit" || key === "ratingMaxUnit") clearError("ratingMax");
    },
    toggle: (key, value, on) => {
      setAnswers((a) => ({
        ...a,
        [key]: on
          ? [...a[key].filter((v) => v !== value), value]
          : a[key].filter((v) => v !== value),
      }));
      clearError(key);
    },
    setScope: (list, values) => {
      setAnswers((a) => ({ ...a, [list]: { ...a[list], ...values } }));
      setErrors((e) => {
        const next = { ...e };
        for (const k of Object.keys(values)) delete next[`${list}.${k}`];
        return next;
      });
    },
    files,
    addFiles: (list) => {
      if (!list) return;
      const next = [...files];
      for (const f of Array.from(list)) {
        const bad = fileProblem(f.name, f.size);
        if (bad) {
          toast.error(bad);
          continue;
        }
        if (next.length >= MAX_FILES) {
          toast.error(`You can attach up to ${MAX_FILES} files.`);
          break;
        }
        if (!next.some((x) => x.name === f.name && x.size === f.size)) next.push(f);
      }
      setFiles(next);
    },
    removeFile: (index) => setFiles((fs) => fs.filter((_, i) => i !== index)),
  };

  function goTo(i: number) {
    setStep(i);
    setPhase("form");
    scrollTop();
  }

  function showErrors(e: Errors) {
    setErrors(e);
    toast.error("Please fill in the highlighted fields.");
    requestAnimationFrame(() =>
      document
        .querySelector('[data-error="true"]')
        ?.scrollIntoView({ behavior: "smooth", block: "center" }),
    );
  }

  function next() {
    const e = stepErrors(step, answers);
    if (hasErrors(e)) return showErrors(e);
    setErrors({});
    if (step < STEPS.length - 1) goTo(step + 1);
    else {
      setPhase("review");
      scrollTop();
    }
  }

  async function submit() {
    const firstBad = STEPS.findIndex((_, i) => hasErrors(stepErrors(i, answers)));
    if (firstBad >= 0) {
      goTo(firstBad);
      return showErrors(stepErrors(firstBad, answers));
    }
    setSending("Sending your requirement…");
    const res = await callFunction<SubmitReply>("enquiry-form", {
      action: "submit",
      token,
      answers,
      files: files.map((f) => ({ name: f.name, size: f.size })),
      website,
    });
    if (!res.ok) {
      setSending(null);
      toast.error(res.error);
      return;
    }
    let missing = 0;
    const { uploads, id, finishKey } = res.data;
    if (uploads?.length && id && finishKey) {
      for (const [i, u] of uploads.entries()) {
        setSending(`Uploading file ${i + 1} of ${uploads.length}…`);
        const file = files[i];
        const up = file
          ? await supabase.storage
              .from(BUCKET)
              .uploadToSignedUrl(u.path, u.token, file, { contentType: file.type || undefined })
          : { error: new Error("missing") };
        if (up.error) missing++;
      }
      setSending("Finishing…");
      const done = await callFunction<{ missing: number }>("enquiry-form", {
        action: "finish",
        id,
        finishKey,
      });
      if (done.ok) missing = done.data.missing;
    }
    writeDraft(draftKey, null);
    setResult({ enquiryNo: res.data.enquiryNo ?? null, missing });
    setSending(null);
    setPhase("sent");
    scrollTop();
  }

  if (phase === "loading")
    return (
      <RfqShell>
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Opening the form…
        </div>
      </RfqShell>
    );

  if (phase === "invalid" || phase === "already")
    return (
      <RfqShell>
        <div className="py-10 text-center es-pop-in">
          {phase === "already" ? (
            <CheckCircle2 className="mx-auto mb-3 h-12 w-12 text-emerald-500" />
          ) : (
            <AlertTriangle className="mx-auto mb-3 h-12 w-12 text-amber-500" />
          )}
          <h1 className="text-xl font-bold text-slate-800">
            {phase === "already" ? "This form is already submitted" : "This link doesn't work"}
          </h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
            {phase === "already"
              ? `Thank you${company ? `, ${company}` : ""}. We have your requirements and our engineering team will get back to you.`
              : problem}
          </p>
        </div>
      </RfqShell>
    );

  if (phase === "welcome")
    return (
      <RfqShell>
        <div className="es-pop-in">
          <h1 className="text-center text-2xl font-bold tracking-tight text-slate-800 sm:text-3xl">
            Transformer Testing System – Requirement Form
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-slate-600 sm:text-base">
            This guided requirement form helps us understand your transformer testing needs in
            detail. Based on your inputs, our engineering team will prepare a suitable technical
            proposal and quotation.
          </p>
          <p className="mt-5 text-sm font-semibold text-slate-800">
            This form will capture details related to:
          </p>
          <ul className="mt-2 list-disc space-y-1.5 pl-6 text-sm text-slate-600">
            <li>Transformer ratings, voltages, and impedance</li>
            <li>Tests to be performed (routine, type, special)</li>
            <li>Scope of supply for equipment and instruments</li>
            <li>Level of automation required</li>
            <li>Final remarks and submission</li>
          </ul>
          <p className="mt-6 flex items-center justify-center gap-1.5 text-sm text-slate-500">
            <Clock className="h-4 w-4" /> Estimated time to complete:{" "}
            <b className="text-slate-700">5–10 minutes</b>
          </p>
          <div className="mt-6 flex flex-col items-center gap-2">
            {resumeStep !== null ? (
              <>
                <Button size="lg" onClick={() => goTo(resumeStep)}>
                  Continue where you left off <ChevronRight />
                </Button>
                <button
                  type="button"
                  onClick={() => {
                    setAnswers(
                      cleanAnswers({
                        ...emptyAnswers(),
                        company: answers.company,
                        contactPerson: answers.contactPerson,
                        email: answers.email,
                        phoneCode: answers.phoneCode,
                        phone: answers.phone,
                      }),
                    );
                    goTo(0);
                  }}
                  className="cursor-pointer text-xs text-slate-500 underline-offset-4 hover:text-slate-700 hover:underline"
                >
                  Start again
                </button>
              </>
            ) : (
              <Button size="lg" onClick={() => goTo(0)}>
                Start Requirement Form <ChevronRight />
              </Button>
            )}
          </div>
        </div>
      </RfqShell>
    );

  if (phase === "sent")
    return (
      <RfqShell>
        <div className="py-8 text-center es-pop-in">
          <CheckCircle2 className="mx-auto mb-3 h-14 w-14 text-emerald-500" />
          <h1 className="text-2xl font-bold text-slate-800">Thank you!</h1>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-600">
            Your requirement has reached Electrosoft. Our engineering team will study it and get
            back to you with a suitable technical proposal and quotation.
          </p>
          {result?.enquiryNo && (
            <p className="mt-4 text-sm text-slate-500">
              Your reference number:{" "}
              <b className="font-mono text-base text-slate-800">{result.enquiryNo}</b>
            </p>
          )}
          {result && result.missing > 0 && (
            <p className="mx-auto mt-4 max-w-md rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
              {result.missing === 1 ? "One file" : `${result.missing} files`} could not be uploaded.
              Please email {result.missing === 1 ? "it" : "them"} to us, quoting your reference
              number.
            </p>
          )}
        </div>
      </RfqShell>
    );

  if (phase === "review")
    return (
      <RfqShell>
        <Stepper steps={STEPS} step={STEPS.length} onJump={goTo} />
        <div className="es-pop-in">
          <h2 className="text-lg font-bold text-indigo-950">Review your responses</h2>
          <p className="mt-1 text-xs text-slate-500">
            Check your answers below. Use Edit to change anything, then submit.
          </p>
          <div className="mt-5 space-y-4">
            {summarize(answers).map((s, i) => (
              <div key={s.title} className="rounded-2xl bg-white/60 p-4">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-slate-800">{s.title}</h3>
                  <button
                    type="button"
                    onClick={() => goTo(SECTION_STEP[i])}
                    className="inline-flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-50"
                  >
                    <Pencil className="h-3 w-3" /> Edit
                  </button>
                </div>
                <dl className="divide-y divide-slate-200/70 text-sm">
                  {s.rows.map((r) => (
                    <div
                      key={r.label}
                      className="grid gap-0.5 py-1.5 sm:grid-cols-[2fr_3fr] sm:gap-3"
                    >
                      <dt className="text-slate-500">{r.label}</dt>
                      <dd className="whitespace-pre-line font-medium text-slate-800">
                        {r.value || "—"}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}
            {files.length > 0 && (
              <div className="rounded-2xl bg-white/60 p-4">
                <h3 className="mb-2 text-sm font-semibold text-slate-800">Files</h3>
                <ul className="space-y-1 text-sm text-slate-700">
                  {files.map((f) => (
                    <li key={`${f.name}-${f.size}`} className="flex items-center gap-2">
                      <Paperclip className="h-3.5 w-3.5 text-slate-400" /> {f.name}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <div className="mt-8 flex items-center justify-between gap-3">
            <Button variant="outline" onClick={() => goTo(STEPS.length - 1)} disabled={!!sending}>
              <ChevronLeft /> Back
            </Button>
            <Button
              onClick={submit}
              disabled={!!sending}
              className="bg-[linear-gradient(135deg,oklch(0.62_0.15_165),oklch(0.66_0.13_180))]"
            >
              {sending ? <Loader2 className="animate-spin" /> : <Send />}
              {sending ?? "Submit"}
            </Button>
          </div>
        </div>
      </RfqShell>
    );

  const Body = STEP_BODIES[step];
  return (
    <RfqShell>
      <Stepper steps={STEPS} step={step} onJump={goTo} />
      {/* Only bots fill this in; people never see it. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label>
          Website
          <input
            data-no-neo
            tabIndex={-1}
            autoComplete="off"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
          />
        </label>
      </div>
      <div key={step} className="es-pop-in">
        <Body {...props} />
      </div>
      <div className="mt-8 flex items-center justify-between gap-3">
        {step > 0 ? (
          <Button variant="outline" onClick={() => goTo(step - 1)}>
            <ChevronLeft /> Back
          </Button>
        ) : (
          <span />
        )}
        <span className="text-xs text-slate-400">
          {step + 1}/{STEPS.length}
        </span>
        <Button onClick={next}>
          {step === STEPS.length - 1 ? "Review your responses" : "Next"} <ChevronRight />
        </Button>
      </div>
    </RfqShell>
  );
}
