import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Settings, Cog, BookOpen, Users, Wrench, Boxes, ListChecks, Truck, CreditCard, ShieldOff, Tag, Layers } from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar,
} from "@/components/ui/sidebar";
import logoUrl from "@/assets/electrosoft-logo.png";


const main = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
];

const cms = [
  { title: "Settings Home", url: "/settings", icon: Settings },
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
  { title: "Employees", url: "/settings/employees", icon: Users },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const pathname = useRouterState({ select: r => r.location.pathname });
  const isActive = (p: string) => p === "/" ? pathname === "/" : pathname.startsWith(p);

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <div className="px-3 py-4 border-b flex items-center gap-2">
          {collapsed
            ? <img src={logoUrl} alt="Electrosoft" className="w-8 h-8 object-contain" />
            : <img src={logoUrl} alt="Electrosoft Automation Pvt. Ltd." className="h-8 w-auto object-contain" />}

        </div>

        <SidebarGroup>
          <SidebarGroupLabel>Main</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {main.map(item => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
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
                  <SidebarMenuButton asChild isActive={pathname === item.url} size="sm">
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
