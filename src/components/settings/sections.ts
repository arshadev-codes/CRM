import {
  BookOpen, Boxes, Building2, CreditCard, FileText, Layers, ListChecks, Network, ShieldOff, Tag,
  Truck, Users, Wrench, type LucideIcon,
} from "lucide-react";

export type SettingsSection = {
  url: string;
  title: string;
  desc: string;
  icon: LucideIcon;
  /** Icon chip colours. */
  tone: string;
};

export const SETTINGS_SECTIONS: SettingsSection[] = [
  { url: "/settings/subsystems", title: "Major Sub Systems", desc: "Titles, descriptions and images per system type.", icon: Layers, tone: "bg-indigo-50 text-indigo-600" },
  { url: "/settings/scope-supply", title: "Scope of Supply", desc: "Default supply line items.", icon: BookOpen, tone: "bg-sky-50 text-sky-600" },
  { url: "/settings/scope-services", title: "Scope of Services", desc: "Default services line items.", icon: BookOpen, tone: "bg-cyan-50 text-cyan-600" },
  { url: "/settings/exclusions", title: "Exclusions", desc: "Standard exclusions library.", icon: ShieldOff, tone: "bg-rose-50 text-rose-600" },
  { url: "/settings/makes", title: "Makes of Supply", desc: "Manufacturer options per item.", icon: Tag, tone: "bg-amber-50 text-amber-600" },
  { url: "/settings/delivery", title: "Delivery Templates", desc: "Default delivery deliverables.", icon: Truck, tone: "bg-orange-50 text-orange-600" },
  { url: "/settings/payment", title: "Payment Templates", desc: "Reusable payment milestone sets.", icon: CreditCard, tone: "bg-emerald-50 text-emerald-600" },
  { url: "/settings/instruments", title: "Instruments", desc: "Master instrument library.", icon: Wrench, tone: "bg-violet-50 text-violet-600" },
  { url: "/settings/equipment", title: "Equipment", desc: "Master equipment library.", icon: Boxes, tone: "bg-fuchsia-50 text-fuchsia-600" },
  { url: "/settings/tests", title: "Tests", desc: "Available tests catalogue.", icon: ListChecks, tone: "bg-teal-50 text-teal-600" },
  { url: "/settings/connections", title: "Connections", desc: "Which tests go under connection A, B or C.", icon: Network, tone: "bg-blue-50 text-blue-600" },
  { url: "/settings/templates", title: "Templates", desc: "Proposal layouts used by the wizard.", icon: FileText, tone: "bg-slate-100 text-slate-600" },
  { url: "/settings/employees", title: "Quotation people", desc: "Who appears as Prepared / Checked by on quotations.", icon: Users, tone: "bg-pink-50 text-pink-600" },
  { url: "/settings/companies", title: "Companies", desc: "Company database used for auto-complete in the wizard.", icon: Building2, tone: "bg-lime-50 text-lime-700" },
];
