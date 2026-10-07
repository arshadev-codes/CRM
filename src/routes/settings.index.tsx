import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { SETTINGS_SECTIONS } from "@/components/settings/sections";

export const Route = createFileRoute("/settings/")({
  component: SettingsHome,
});

function SettingsHome() {
  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6">
      <h1 className="text-3xl font-bold tracking-tight text-slate-800">Settings</h1>
      <p className="mt-1 mb-6 text-sm text-slate-500">
        The building blocks of every quotation. Changes apply to all future proposals.
      </p>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {SETTINGS_SECTIONS.map((s) => (
          <Link
            to={s.url}
            key={s.url}
            className="group neo-surface flex items-start gap-4 rounded-2xl p-5 transition-all duration-300 hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
          >
            <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${s.tone}`}>
              <s.icon className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1 font-semibold text-slate-800">
                {s.title}
                <ArrowRight className="h-3.5 w-3.5 -translate-x-1 text-indigo-500 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
              </span>
              <span className="mt-0.5 block text-xs text-slate-500">{s.desc}</span>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
