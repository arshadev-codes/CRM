import { useEffect } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  FileSpreadsheet, PackageCheck,
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar,
} from "@/components/ui/sidebar";
import logoUrl from "@/assets/electrosoft-logo.png";

const main = [
  { title: "Quotations", url: "/", icon: FileSpreadsheet },
  { title: "Inward Orders", url: "/inward-orders", icon: PackageCheck },
];

export function AppSidebar() {
  const { state, setOpen, isMobile } = useSidebar();
  const collapsed = state === "collapsed";
  const pathname = useRouterState({ select: r => r.location.pathname });
  const isQuotation = pathname === "/" || pathname.startsWith("/projects/") || pathname.startsWith("/settings");
  const isActive = (p: string) => p === "/" ? isQuotation : pathname.startsWith(p);

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

      </SidebarContent>
    </Sidebar>
  );
}
