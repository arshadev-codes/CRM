import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Eye, EyeOff, LogIn } from "lucide-react";

export const Route = createFileRoute("/login")({
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

/** Placeholder — real authentication is wired up outside this screen. */
function onLogin(email: string, password: string) {
  console.log("onLogin", email, password);
}

function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [remember, setRemember] = useState(false);

  return (
    <div className="min-h-screen w-full grid place-items-center px-4 py-10"
         style={{ background: "#e0e5ec" }}>
      <form
        onSubmit={(e) => { e.preventDefault(); onLogin(email, password); }}
        className="w-full max-w-[380px] p-8 rounded-[20px]"
        style={{ background: "#e0e5ec", boxShadow: "9px 9px 18px #a3b1c6, -9px -9px 18px #ffffff" }}
      >
        <div className="flex flex-col items-center">
          <div
            className="h-16 w-16 rounded-full grid place-items-center text-lg font-semibold tracking-widest text-slate-500"
            style={{ background: "#e0e5ec", boxShadow: "6px 6px 12px #a3b1c6, -6px -6px 12px #ffffff" }}
          >
            EA
          </div>
          <h1 className="mt-5 text-xl font-medium tracking-[0.18em] text-slate-600 uppercase">Welcome Back</h1>
          <p className="mt-1 text-xs text-slate-400">Sign in to continue</p>
        </div>

        <div className="mt-8 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-2 ml-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              className="w-full h-12 px-4 rounded-xl text-sm text-slate-600 bg-transparent outline-none
                         placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-400/30"
              style={{ background: "#e0e5ec", boxShadow: "inset 5px 5px 10px #a3b1c6, inset -5px -5px 10px #ffffff" }}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-2 ml-1">Password</label>
            <div
              className="flex items-center rounded-xl focus-within:ring-2 focus-within:ring-indigo-400/30"
              style={{ background: "#e0e5ec", boxShadow: "inset 5px 5px 10px #a3b1c6, inset -5px -5px 10px #ffffff" }}
            >
              <input
                type={show ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="flex-1 h-12 px-4 rounded-xl text-sm text-slate-600 bg-transparent outline-none
                           placeholder:text-slate-400"
                style={{ boxShadow: "none", background: "transparent" }}
              />
              <button
                type="button"
                onClick={() => setShow((v) => !v)}
                aria-label={show ? "Hide password" : "Show password"}
                className="px-4 text-slate-400 hover:text-slate-600"
              >
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={() => setRemember((v) => !v)}
              className="flex items-center gap-2 text-slate-500"
            >
              <span
                className="h-5 w-5 rounded-md grid place-items-center"
                style={{
                  background: "#e0e5ec",
                  boxShadow: remember
                    ? "inset 3px 3px 6px #a3b1c6, inset -3px -3px 6px #ffffff"
                    : "3px 3px 6px #a3b1c6, -3px -3px 6px #ffffff",
                }}
              >
                {remember && <span className="h-2 w-2 rounded-sm bg-indigo-500" />}
              </span>
              Remember me
            </button>
            <button type="button" className="text-indigo-500 hover:text-indigo-600 font-medium">
              Forgot password?
            </button>
          </div>

          <button
            type="submit"
            className="w-full h-12 rounded-xl text-sm font-semibold tracking-wide text-indigo-600
                       flex items-center justify-center gap-2 transition-shadow duration-150
                       active:shadow-[inset_5px_5px_10px_#a3b1c6,inset_-5px_-5px_10px_#ffffff]"
            style={{ background: "#e0e5ec", boxShadow: "6px 6px 14px #a3b1c6, -6px -6px 14px #ffffff" }}
          >
            <LogIn className="h-4 w-4" />
            Sign In
          </button>
        </div>
      </form>
    </div>
  );
}
