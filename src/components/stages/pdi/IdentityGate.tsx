import {
  useEffect,
  useRef,
  useState,
  type ClipboardEvent,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  LoaderCircle,
  Mail,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fullName, isValidEmail, type DispatchIdentity } from "@/lib/pdi";
import { EASE, initials } from "../shared";

const CODE_LENGTH = 6;
const RESEND_AFTER = 30;
const LAST_EMAIL_KEY = "dispatch_last_email";

// Dummy one-time code until email sending is connected: the code is shown on screen.
function makeCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// Who is working on dispatch: name and email, confirmed with a 6-digit code.
export function IdentityGate({
  employees,
  defaultName,
  onVerified,
}: {
  employees: string[];
  defaultName: string;
  onVerified: (identity: DispatchIdentity) => void;
}) {
  const [step, setStep] = useState<"details" | "code" | "done">("details");
  const [firstName, setFirstName] = useState(() => defaultName.split(" ")[0] ?? "");
  const [lastName, setLastName] = useState(() => defaultName.split(" ").slice(1).join(" "));
  const [email, setEmail] = useState(() => {
    try {
      return localStorage.getItem(LAST_EMAIL_KEY) ?? "";
    } catch {
      return "";
    }
  });
  const [touched, setTouched] = useState(false);
  const [sending, setSending] = useState(false);
  const [code, setCode] = useState("");

  const typed = `${firstName} ${lastName}`.trim().toLowerCase();
  const suggestions = employees
    .filter((name) => name.toLowerCase() !== typed)
    .filter((name) => !typed || name.toLowerCase().includes(firstName.trim().toLowerCase()))
    .slice(0, 6);
  const emailOk = isValidEmail(email);
  const companyEmail = /@electrosoft/i.test(email);
  const canSend = Boolean(firstName.trim()) && emailOk;

  function pick(name: string) {
    const [first, ...rest] = name.split(" ");
    setFirstName(first ?? "");
    setLastName(rest.join(" "));
  }

  async function sendCode(event?: FormEvent) {
    event?.preventDefault();
    setTouched(true);
    if (!canSend) return;
    setSending(true);
    // Stand-in for the email request.
    await new Promise((resolve) => window.setTimeout(resolve, 700));
    setCode(makeCode());
    setSending(false);
    setStep("code");
  }

  function verified() {
    const identity: DispatchIdentity = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim().toLowerCase(),
      verifiedAt: new Date().toISOString(),
    };
    try {
      localStorage.setItem(LAST_EMAIL_KEY, identity.email);
    } catch {
      /* storage unavailable */
    }
    setStep("done");
    window.setTimeout(() => onVerified(identity), 900);
  }

  return (
    <div className="mx-auto w-full max-w-md py-4 sm:py-8">
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: EASE }}
        className="neo-surface relative overflow-hidden rounded-[28px] p-6 sm:p-8"
      >
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-gradient-to-br from-primary/25 to-chart-2/20 blur-3xl" />
        <StepDots step={step === "details" ? 0 : 1} />
        <AnimatePresence mode="wait" initial={false}>
          {step === "details" && (
            <motion.form
              key="details"
              onSubmit={sendCode}
              initial={{ opacity: 0, x: -24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.35, ease: EASE }}
              className="relative space-y-5"
            >
              <div>
                <span className="neo-pop grid h-14 w-14 place-items-center rounded-2xl text-primary">
                  <ShieldCheck className="h-7 w-7" />
                </span>
                <h2 className="mt-4 text-2xl font-bold text-foreground">
                  Who's working on dispatch?
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Confirm your name and email before filling the pre-dispatch inspection.
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold text-primary">
                  Name <span className="text-destructive">*</span>
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  <div className="relative">
                    <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={firstName}
                      onChange={(event) => setFirstName(event.target.value)}
                      placeholder="First name"
                      autoComplete="given-name"
                      className="h-11 pl-9"
                      aria-invalid={touched && !firstName.trim()}
                    />
                  </div>
                  <Input
                    value={lastName}
                    onChange={(event) => setLastName(event.target.value)}
                    placeholder="Last name"
                    autoComplete="family-name"
                    className="h-11"
                  />
                </div>
                {suggestions.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {suggestions.map((name) => (
                      <button
                        key={name}
                        type="button"
                        onClick={() => pick(name)}
                        className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 py-1 pl-1 pr-2.5 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
                      >
                        <span className="grid h-5 w-5 place-items-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
                          {initials(name)}
                        </span>
                        {name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="dispatch-email" className="text-xs font-semibold text-primary">
                  Email <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="dispatch-email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@gmail.com"
                    className="h-11 pl-9"
                    aria-invalid={touched && !emailOk}
                  />
                  <AnimatePresence>
                    {emailOk && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                        className="absolute right-3 top-1/2 grid h-5 w-5 -translate-y-1/2 place-items-center rounded-full bg-emerald-500 text-white"
                      >
                        <Check className="h-3 w-3" strokeWidth={3} />
                      </motion.span>
                    )}
                  </AnimatePresence>
                </div>
                <p
                  className={`text-xs ${companyEmail ? "font-medium text-amber-700" : touched && !emailOk ? "text-destructive" : "text-muted-foreground"}`}
                >
                  {companyEmail
                    ? "This looks like a company email. Please use your personal email address."
                    : touched && !emailOk
                      ? "Enter a valid email address."
                      : "Use your personal email address, not the company one."}
                </p>
              </div>

              <Button type="submit" className="h-11 w-full text-base" disabled={sending}>
                {sending ? <LoaderCircle className="animate-spin" /> : <Mail />}
                {sending ? "Sending code…" : "Send verification code"}
              </Button>
            </motion.form>
          )}

          {step === "code" && (
            <motion.div
              key="code"
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 24 }}
              transition={{ duration: 0.35, ease: EASE }}
              className="relative"
            >
              <CodeStep
                email={email.trim()}
                code={code}
                onBack={() => setStep("details")}
                onResend={() => setCode(makeCode())}
                onVerified={verified}
              />
            </motion.div>
          )}

          {step === "done" && (
            <motion.div
              key="done"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative flex flex-col items-center py-10 text-center"
            >
              <motion.span
                initial={{ scale: 0, rotate: -40 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 320, damping: 14 }}
                className="grid h-20 w-20 place-items-center rounded-full bg-emerald-500 text-white shadow-xl shadow-emerald-500/40"
              >
                <Check className="h-10 w-10" strokeWidth={3} />
              </motion.span>
              <div className="mt-5 text-xl font-bold text-foreground">
                Welcome, {fullName({ firstName, lastName })}
              </div>
              <div className="mt-1 text-sm text-muted-foreground">Email verified</div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

function StepDots({ step }: { step: number }) {
  return (
    <div className="relative mb-6 flex items-center gap-2" aria-hidden>
      {[0, 1].map((index) => (
        <motion.span
          key={index}
          animate={{ width: index === step ? 28 : 8 }}
          className={`h-2 rounded-full ${index <= step ? "bg-primary" : "bg-muted"}`}
        />
      ))}
      <span className="ml-auto text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        Step {step + 1} of 2
      </span>
    </div>
  );
}

function CodeStep({
  email,
  code,
  onBack,
  onResend,
  onVerified,
}: {
  email: string;
  code: string;
  onBack: () => void;
  onResend: () => void;
  onVerified: () => void;
}) {
  const [digits, setDigits] = useState<string[]>(() => Array(CODE_LENGTH).fill(""));
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(0);
  const [checking, setChecking] = useState(false);
  const [wait, setWait] = useState(RESEND_AFTER);
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    refs.current[0]?.focus();
  }, [code]);

  useEffect(() => {
    if (wait <= 0) return;
    const timer = window.setTimeout(() => setWait((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [wait]);

  async function check(value: string[]) {
    if (value.some((digit) => !digit)) return;
    setChecking(true);
    await new Promise((resolve) => window.setTimeout(resolve, 450));
    setChecking(false);
    if (value.join("") === code) onVerified();
    else {
      setError(true);
      setShake((count) => count + 1);
      setDigits(Array(CODE_LENGTH).fill(""));
      refs.current[0]?.focus();
    }
  }

  function setAt(index: number, raw: string) {
    const clean = raw.replace(/\D/g, "");
    if (!clean) {
      setDigits((current) => current.map((digit, i) => (i === index ? "" : digit)));
      return;
    }
    // Typing or autofill can bring several digits at once.
    const next = [...digits];
    for (let i = 0; i < clean.length && index + i < CODE_LENGTH; i++) next[index + i] = clean[i];
    setDigits(next);
    setError(false);
    const focus = Math.min(index + clean.length, CODE_LENGTH - 1);
    refs.current[focus]?.focus();
    void check(next);
  }

  function onKey(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Backspace" && !digits[index] && index > 0) {
      refs.current[index - 1]?.focus();
      setDigits((current) => current.map((digit, i) => (i === index - 1 ? "" : digit)));
    }
    if (event.key === "ArrowLeft" && index > 0) refs.current[index - 1]?.focus();
    if (event.key === "ArrowRight" && index < CODE_LENGTH - 1) refs.current[index + 1]?.focus();
  }

  function onPaste(event: ClipboardEvent) {
    const text = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, CODE_LENGTH);
    if (!text) return;
    event.preventDefault();
    setAt(0, text);
  }

  return (
    <div className="space-y-5">
      <div>
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Change email
        </button>
        <span className="neo-pop mt-3 grid h-14 w-14 place-items-center rounded-2xl text-primary">
          <Mail className="h-7 w-7" />
        </span>
        <h2 className="mt-4 text-2xl font-bold text-foreground">Check your email</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Enter the 6-digit code sent to{" "}
          <span className="font-semibold text-foreground">{email}</span>
        </p>
      </div>

      <div className="flex items-center gap-2 rounded-xl bg-violet-50 px-3 py-2 text-xs text-violet-800">
        <Sparkles className="h-4 w-4 shrink-0" />
        <span>
          Demo mode, no email is sent yet. Your code is{" "}
          <button
            type="button"
            onClick={() => setAt(0, code)}
            className="font-mono text-sm font-bold tracking-widest underline decoration-dotted"
            title="Fill the code"
          >
            {code}
          </button>
        </span>
      </div>

      <motion.div
        key={shake}
        animate={shake ? { x: [0, -10, 10, -8, 8, -4, 4, 0] } : {}}
        transition={{ duration: 0.45 }}
        className="flex justify-between gap-2"
        onPaste={onPaste}
      >
        {digits.map((digit, index) => (
          <input
            key={index}
            ref={(element) => {
              refs.current[index] = element;
            }}
            value={digit}
            onChange={(event) => setAt(index, event.target.value)}
            onKeyDown={(event) => onKey(index, event)}
            onFocus={(event) => event.target.select()}
            inputMode="numeric"
            autoComplete={index === 0 ? "one-time-code" : "off"}
            maxLength={CODE_LENGTH}
            aria-label={`Digit ${index + 1}`}
            className={`h-14 w-full min-w-0 rounded-2xl text-center font-mono text-2xl font-bold outline-none transition-all focus:ring-4 ${error ? "neo-inset text-destructive ring-2 ring-destructive/40 focus:ring-destructive/30" : digit ? "neo-pop text-primary focus:ring-primary/30" : "neo-inset text-foreground focus:ring-primary/30"}`}
          />
        ))}
      </motion.div>

      <div className="flex min-h-5 items-center justify-between text-xs">
        <span className={error ? "font-medium text-destructive" : "text-muted-foreground"}>
          {checking ? (
            <span className="inline-flex items-center gap-1.5 text-primary">
              <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> Verifying…
            </span>
          ) : error ? (
            "That code is not right. Try again."
          ) : (
            "The code fills in as you type or paste."
          )}
        </span>
        {wait > 0 ? (
          <span className="text-muted-foreground">Resend in {wait}s</span>
        ) : (
          <button
            type="button"
            className="font-semibold text-primary hover:underline"
            onClick={() => {
              onResend();
              setWait(RESEND_AFTER);
              setError(false);
              setDigits(Array(CODE_LENGTH).fill(""));
            }}
          >
            Resend code
          </button>
        )}
      </div>

      <Button
        className="h-11 w-full text-base"
        disabled={checking || digits.some((digit) => !digit)}
        onClick={() => void check(digits)}
      >
        {checking ? <LoaderCircle className="animate-spin" /> : <ArrowRight />} Verify
      </Button>
    </div>
  );
}
