import {
  Factory,
  FlaskConical,
  Hammer,
  HardHat,
  PackageSearch,
  PenTool,
  ShieldCheck,
  Truck,
  type LucideIcon,
} from "lucide-react";
import type { StagePageSlug } from "@/lib/stages";

// Each stage has its own colour so it is recognisable on cards, in the sidebar and on its page.
// Class names are written out in full so Tailwind keeps them.
export type StageTheme = {
  icon: LucideIcon;
  text: string;
  solid: string;
  soft: string;
  gradient: string;
  bar: string;
  ring: string;
};

export const STAGE_THEME: Record<StagePageSlug, StageTheme> = {
  design: {
    icon: PenTool,
    text: "text-violet-600",
    solid: "bg-violet-500",
    soft: "bg-violet-50",
    gradient: "from-violet-500 to-purple-500",
    bar: "from-violet-400 to-purple-500",
    ring: "ring-violet-300",
  },
  fabrication: {
    icon: Hammer,
    text: "text-orange-600",
    solid: "bg-orange-500",
    soft: "bg-orange-50",
    gradient: "from-orange-500 to-red-500",
    bar: "from-orange-400 to-red-400",
    ring: "ring-orange-300",
  },
  procurement: {
    icon: PackageSearch,
    text: "text-amber-600",
    solid: "bg-amber-500",
    soft: "bg-amber-50",
    gradient: "from-amber-400 to-yellow-500",
    bar: "from-amber-400 to-yellow-400",
    ring: "ring-amber-300",
  },
  production: {
    icon: Factory,
    text: "text-cyan-600",
    solid: "bg-cyan-500",
    soft: "bg-cyan-50",
    gradient: "from-cyan-500 to-sky-500",
    bar: "from-cyan-400 to-sky-400",
    ring: "ring-cyan-300",
  },
  testing: {
    icon: FlaskConical,
    text: "text-blue-600",
    solid: "bg-blue-500",
    soft: "bg-blue-50",
    gradient: "from-blue-500 to-indigo-500",
    bar: "from-blue-400 to-indigo-500",
    ring: "ring-blue-300",
  },
  inspection: {
    icon: ShieldCheck,
    text: "text-fuchsia-600",
    solid: "bg-fuchsia-500",
    soft: "bg-fuchsia-50",
    gradient: "from-fuchsia-500 to-pink-500",
    bar: "from-fuchsia-400 to-pink-400",
    ring: "ring-fuchsia-300",
  },
  dispatch: {
    icon: Truck,
    text: "text-emerald-600",
    solid: "bg-emerald-500",
    soft: "bg-emerald-50",
    gradient: "from-emerald-500 to-teal-500",
    bar: "from-emerald-400 to-teal-400",
    ring: "ring-emerald-300",
  },
  commissioning: {
    icon: HardHat,
    text: "text-lime-700",
    solid: "bg-lime-600",
    soft: "bg-lime-50",
    gradient: "from-lime-500 to-green-600",
    bar: "from-lime-400 to-green-500",
    ring: "ring-lime-300",
  },
};
