import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ClipboardCheck, Eye, EyeOff, Factory, FileText, Loader2, Lock, LogIn, ShieldCheck, User,
} from "lucide-react";
import { useAuthStore, useCurrentUser } from "@/store/authStore";

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>): { redirect?: string } => ({
    redirect: typeof search.redirect === "string" ? search.redirect : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Sign In — Electrosoft Proposal Engine" },
      { name: "description", content: "Sign in to the Electrosoft techno-commercial proposal engine." },
      { property: "og:title", content: "Sign In — Electrosoft Proposal Engine" },
      { property: "og:description", content: "Sign in to the Electrosoft techno-commercial proposal engine." },
    ],
  }),
  component: LoginPage,
});

const HIGHLIGHTS = [
  { icon: FileText, text: "Quotations and proposals in minutes" },
  { icon: Factory, text: "Every order tracked from design to dispatch" },
  { icon: ClipboardCheck, text: "Testing, inspection and PDI in one place" },
];

function LoginPage() {
  const { redirect } = Route.useSearch();
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const setupFirstAdmin = useAuthStore((s) => s.setupFirstAdmin);
  // First run on the cloud: nobody has an account yet, so make the admin.
  const setup = useAuthStore((s) => s.mode === "cloud" && s.setupNeeded);
  const user = useCurrentUser();
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Already signed in (or just signed in): continue to where they were going.
  useEffect(() => {
    if (user) navigate({ to: redirect && redirect.startsWith("/") ? redirect : "/", replace: true });
  }, [user, redirect, navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(
      setup
        ? await setupFirstAdmin(name, username, password)
        : await login(username, password, remember),
    );
    setBusy(false);
  }

  return (
    <div className="min-h-screen w-full grid lg:grid-cols-[1.1fr_1fr]">
      {/* Brand panel */}
      <aside className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-gradient-to-br from-indigo-600 via-violet-600 to-sky-600 p-12 text-white">
        <div className="pointer-events-none absolute -left-24 -top-24 h-80 w-80 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-32 right-0 h-96 w-96 rounded-full bg-sky-300/20 blur-3xl" />
        <div className="relative flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-white/15 text-base font-bold ring-1 ring-white/30">
            ES
          </div>
          <div>
            <div className="text-lg font-semibold leading-tight">Electrosoft</div>
            <div className="text-xs text-white/70">Proposal Engine</div>
          </div>
        </div>
        <div className="relative max-w-md">
          <h2 className="text-4xl font-bold leading-tight tracking-tight">
            From quotation to dispatch, all in one place.
          </h2>
          <ul className="mt-8 space-y-4">
            {HIGHLIGHTS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-white/90">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white/15 ring-1 ring-white/20">
                  <Icon className="h-4 w-4" />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-white/60">© Electrosoft · Transformer testing systems</p>
      </aside>

      {/* Form */}
      <main className="grid place-items-center px-4 py-12">
        <form onSubmit={onSubmit} className="neo-surface w-full max-w-[400px] rounded-3xl p-8 es-pop-in">
          <div className="flex items-center gap-3 lg:hidden">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-sm font-bold text-white">
              ES
            </div>
            <div className="font-semibold text-slate-700">Electrosoft</div>
          </div>
          <h1 className="mt-6 text-2xl font-bold tracking-tight text-slate-800 lg:mt-0">
            {setup ? "First-time setup" : "Welcome back"}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {setup
              ? "Create the admin account. You can add everyone else after signing in."
              : "Sign in with the username your admin gave you."}
          </p>

          <div className="mt-8 space-y-5">
            {setup && (
              <Field label="Your name" icon={User}>
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  className="h-12 w-full pl-11 pr-11 text-sm text-slate-700 placeholder:text-slate-400"
                />
              </Field>
            )}
            <Field label="Username" icon={User}>
              <input
                autoFocus
                autoComplete="username"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. rahul"
                className="h-12 w-full pl-11 pr-11 text-sm text-slate-700 placeholder:text-slate-400"
              />
            </Field>

            <Field label="Password" icon={Lock}>
              <input
                type={show ? "text" : "password"}
                autoComplete={setup ? "new-password" : "current-password"}
                minLength={setup ? 6 : undefined}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={setup ? "At least 6 characters" : "••••••••"}
                className="h-12 w-full pl-11 pr-11 text-sm text-slate-700 placeholder:text-slate-400"
              />
              <button
                type="button"
                onClick={() => setShow((v) => !v)}
                aria-label={show ? "Hide password" : "Show password"}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </Field>

            <div className="flex items-center justify-between text-xs">
              <label className="flex cursor-pointer select-none items-center gap-2 text-slate-600">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="h-4 w-4 accent-indigo-600"
                />
                Keep me signed in
              </label>
              <span className="text-slate-400">Forgot it? Ask your admin.</span>
            </div>

            {error && (
              <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-600">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={busy}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:brightness-110 active:scale-[0.99] disabled:opacity-70"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
              {setup ? "Create admin and sign in" : "Sign in"}
            </button>
          </div>

          <p className="mt-8 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
            <ShieldCheck className="h-3.5 w-3.5" /> Access is set by your admin
          </p>
        </form>
      </main>
    </div>
  );
}

function Field({
  label, icon: Icon, children,
}: { label: string; icon: typeof User; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-2 ml-1 block text-xs font-semibold text-slate-500">{label}</label>
      <div className="relative">
        <Icon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        {children}
      </div>
    </div>
  );
}
