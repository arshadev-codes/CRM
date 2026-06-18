import { createFileRoute, Link } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Layers, BookOpen, ShieldOff, Tag, Truck, CreditCard, Wrench, Boxes, ListChecks, Users } from "lucide-react";

export const Route = createFileRoute("/settings/")({
  component: SettingsHome,
});

const sections = [
  { url: "/settings/subsystems", title: "Major Sub Systems", desc: "Edit titles, descriptions and images per system type.", icon: Layers },
  { url: "/settings/scope-supply", title: "Scope of Supply", desc: "Default supply line items.", icon: BookOpen },
  { url: "/settings/scope-services", title: "Scope of Services", desc: "Default services line items.", icon: BookOpen },
  { url: "/settings/exclusions", title: "Exclusions", desc: "Standard exclusions library.", icon: ShieldOff },
  { url: "/settings/makes", title: "Makes of Supply", desc: "Manufacturer options per item.", icon: Tag },
  { url: "/settings/delivery", title: "Delivery Templates", desc: "Default delivery deliverables.", icon: Truck },
  { url: "/settings/payment", title: "Payment Templates", desc: "Reusable payment milestone sets.", icon: CreditCard },
  { url: "/settings/instruments", title: "Instruments", desc: "Master instrument library.", icon: Wrench },
  { url: "/settings/equipment", title: "Equipment", desc: "Master equipment library.", icon: Boxes },
  { url: "/settings/tests", title: "Tests", desc: "Available tests catalogue.", icon: ListChecks },
  { url: "/settings/employees", title: "Employees", desc: "Prepared/checked-by master.", icon: Users },
];

function SettingsHome() {
  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-1">Settings</h1>
      <p className="text-sm text-muted-foreground mb-6">Content Management — edits apply to all future proposals.</p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {sections.map(s => (
          <Link to={s.url} key={s.url}>
            <Card className="hover:shadow-md transition-shadow h-full">
              <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><s.icon className="h-4 w-4 text-blue-700" />{s.title}</CardTitle></CardHeader>
              <CardContent className="text-xs text-muted-foreground">{s.desc}</CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
