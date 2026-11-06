import { Link, useRouterState } from "@tanstack/react-router";
import {
  BookOpen, Boxes, Building2, CreditCard, FileSpreadsheet, GitBranch,
  Layers, LayoutTemplate, ListChecks, Settings, ShieldOff, Tag, Truck, Users, Wrench,
} from "lucide-react";

const items = [
  { title: "Projects", url: "/", icon: FileSpreadsheet },
  { title: "Settings Home", url: "/settings", icon: Settings },
  { title: "Proposal Templates", url: "/settings/templates", icon: LayoutTemplate },
  { title: "Sub Systems", url: "/settings/subsystems", icon: Layers },
  { title: "Scope of Supply", url: "/settings/scope-supply", icon: BookOpen },
  { title: "Scope of Services", url: "/settings/scope-services", icon: BookOpen },
  { title: "Exclusions", url: "/settings/exclusions", icon: ShieldOff },
  { title: "Makes of Supply", url: "/settings/makes", icon: Tag },
  { title: "Delivery Templates", url: "/settings/delivery", icon: Truck },
  { title: "Payment Templates", url: "/settings/payment", icon: CreditCard },
  { title: "Instruments", url: "/settings/instruments", icon: Wrench },
  { title: "Equipment", url: "/settings/equipment", icon: Boxes },
  { title: "Tests", url: "/settings/tests", icon: ListChecks },
  { title: "Connections (A/B/C)", url: "/settings/connections", icon: GitBranch },
  { title: "Quotation people", url: "/settings/employees", icon: Users },
  { title: "Companies", url: "/settings/companies", icon: Building2 },
] as const;

export function QuotationNav() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  return (
    <nav aria-label="Quotation navigation" className="mx-3 mt-3 neo-inset rounded-xl px-2 py-2">
      <div className="flex items-center gap-2 overflow-x-auto py-1">
        {items.map((item) => {
          const active = item.url === "/" ? pathname === "/" : pathname === item.url;
          return (
            <Link
              key={item.url}
              to={item.url}
              aria-current={active ? "page" : undefined}
              className={`flex h-9 shrink-0 items-center gap-2 rounded-lg px-3 text-xs font-medium transition-colors ${
                active ? "neo-pressed text-indigo-600" : "text-slate-500 hover:text-indigo-600"
              }`}
            >
              <item.icon className="h-3.5 w-3.5" />
              <span>{item.title}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}