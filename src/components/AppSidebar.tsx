import { useEffect } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  FileSpreadsheet, PackageCheck, Settings, Cog, BookOpen, Users, Wrench, Boxes, ListChecks,
  Truck, CreditCard, ShieldOff, Tag, Layers, GitBranch, Building2, LayoutTemplate,
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar,
} from "@/components/ui/sidebar";
import logoUrl from "@/assets/electrosoft-logo.png";

const main = [
  { title: "Quotations", url: "/", icon: FileSpreadsheet },
  { title: "Inward Orders", url: "/inward-orders", icon: PackageCheck },
];

const cms = [
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
  { title: "Employees", url: "/settings/employees", icon: Users },
  { title: "Companies", url: "/settings/companies", icon: Building2 },
];

export function AppSidebar() {
  const { state, setOpen, isMobile } = useSidebar();
  const collapsed = state === "collapsed";
  const pathname = useRouterState({ select: r => r.location.pathname });
  const isActive = (p: string) => p === "/" ? pathname === "/" : pathname.startsWith(p);

  // Below ~900px the sidebar shows icons only; on mobile the provider already
  // switches to a hamburger-triggered overlay.
  useEffect(() => {
    if (isMobile) return;
    const mq = window.matchMedia("(max-width: 900px)");
    const apply = () => setOpen(!mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [isMobile, setOpen]);

  return (
    <Sidebar collapsible="icon">
      <SidebarContent className="!bg-transparent">
        <div className="px-3 py-4 flex items-center gap-3">
          <div className="h-10 w-10 shrink-0 rounded-full neo-pop grid place-items-center overflow-hidden">
            <img src={logoUrl} alt="Electrosoft" className="h-6 w-6 object-contain" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <div className="text-sm font-semibold text-slate-700 truncate">Electrosoft</div>
              <div className="text-[10px] uppercase tracking-widest text-slate-400">Proposal Engine</div>
            </div>
          )}
        </div>

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {main.map(item => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={item.title}>
                    <Link to={item.url}><item.icon className="h-4 w-4" />{!collapsed && <span>{item.title}</span>}</Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel><Cog className="h-3 w-3 inline mr-1" />Content Management</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {cms.map(item => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={pathname === item.url} size="sm" tooltip={item.title}>
                    <Link to={item.url}><item.icon className="h-4 w-4" />{!collapsed && <span>{item.title}</span>}</Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
