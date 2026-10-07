import type { ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { ArrowLeft, Settings2 } from "lucide-react";
import { ViewOnlyBadge } from "@/components/auth/Can";
import { useCan } from "@/store/authStore";
import { SETTINGS_SECTIONS } from "./sections";

export function SettingsShell({ title, children }: { title: string; children: ReactNode }) {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const section = SETTINGS_SECTIONS.find((s) => s.url === pathname);
  const Icon = section?.icon ?? Settings2;
  const canEdit = useCan("settings");

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6">
      <Link
        to="/settings"
        className="mb-4 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 transition-colors hover:text-indigo-600"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> All settings
      </Link>
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${section?.tone ?? "bg-indigo-50 text-indigo-600"}`}>
          <Icon className="h-6 w-6" />
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold tracking-tight text-slate-800 sm:text-3xl">{title}</h1>
          {section && <p className="mt-0.5 text-sm text-slate-500">{section.desc}</p>}
        </div>
        <ViewOnlyBadge perm="settings" />
      </div>
      <div className="es-settings neo-surface overflow-x-auto rounded-3xl p-4 sm:p-6">
        {/* View-only users can read every list but not change it. */}
        <fieldset disabled={!canEdit} className="contents">
          {children}
        </fieldset>
      </div>
    </div>
  );
}
