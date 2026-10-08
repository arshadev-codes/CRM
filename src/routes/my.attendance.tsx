import { createFileRoute } from "@tanstack/react-router";
import { CalendarCheck } from "lucide-react";
import { AppHeader } from "@/components/app/AppHeader";
import { AppTabBar } from "@/components/app/AppTabBar";

export const Route = createFileRoute("/my/attendance")({
  head: () => ({ meta: [{ title: "Attendance — Electrosoft" }] }),
  component: AttendancePage,
});

// Placeholder until the office attendance system is connected.
function AttendancePage() {
  return (
    <div className="min-h-svh bg-slate-50 pb-24">
      <AppHeader title="Attendance" subtitle="Your days present this month" />
      <div className="mx-auto max-w-xl px-4 py-4">
        <div className="rounded-3xl bg-white px-6 py-14 text-center shadow-sm ring-1 ring-slate-200/70">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-indigo-50 text-indigo-600">
            <CalendarCheck className="h-7 w-7" />
          </span>
          <div className="mt-4 font-semibold text-slate-800">Attendance is coming soon</div>
          <div className="mt-1 text-sm text-slate-500">
            Your in and out times from the office attendance machine will show here.
          </div>
        </div>
      </div>
      <AppTabBar />
    </div>
  );
}
