import { useEffect, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Boxes, FileSpreadsheet, LayoutGrid } from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuBadge, SidebarMenuButton, SidebarMenuItem, SidebarSeparator, useSidebar,
} from "@/components/ui/sidebar";
import logoUrl from "@/assets/electrosoft-logo.png";
import { STAGE_PAGES, STAGE_SLUGS } from "@/lib/stages";
import { STAGE_THEME } from "@/lib/stageTheme";
import { loadActiveStageCounts } from "@/lib/stageProgress";

export function AppSidebar() {
  const { state, setOpen, isMobile, setOpenMobile } = useSidebar();
  // The mobile menu always opens full width, whatever the desktop collapse state.
  const collapsed = state === "collapsed" && !isMobile;
  const pathname = useRouterState({ select: r => r.location.pathname });
  const [counts, setCounts] = useState<Record<string, number>>({});
  const isQuotation = pathname === "/" || pathname.startsWith("/projects/") || pathname.startsWith("/settings");
  const stageMatch = pathname.match(/\/stages\/([a-z]+)/);
  const activeStage = stageMatch?.[1];
  const onOrders = pathname.startsWith("/inward-orders") && !activeStage;

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

  // Refresh the "orders at this stage" badges as the user moves around,
  // and close the mobile menu once a page is chosen.
  useEffect(() => {
    void loadActiveStageCounts().then(setCounts);
    setOpenMobile(false);
  }, [pathname, setOpenMobile]);

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
          <SidebarGroupLabel>Sales</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isQuotation} tooltip="Quotations">
                  <Link to="/"><FileSpreadsheet className="h-4 w-4" />{!collapsed && <span>Quotations</span>}</Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Execution</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={onOrders} tooltip="All inward orders">
                  <Link to="/inward-orders"><LayoutGrid className="h-4 w-4" />{!collapsed && <span>Inward Orders</span>}</Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>

            {/* The seven stages, in order, each in its own colour. */}
            <SidebarMenu className={`mt-1 ${collapsed ? "" : "relative ml-3 border-l border-slate-300/60 pl-2"}`}>
              {STAGE_SLUGS.map((slug, index) => {
                const page = STAGE_PAGES[slug];
                const theme = STAGE_THEME[slug];
                const Icon = theme.icon;
                const active = activeStage === slug;
                const count = counts[page.name] ?? 0;
                return (
                  <SidebarMenuItem key={slug}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      tooltip={`${index + 1}. ${page.name}${count ? ` · ${count} in progress` : ""}`}
                      className="group/stage"
                    >
                      <Link to="/stages/$stage" params={{ stage: slug }}>
                        <span
                          className={`grid h-5 w-5 shrink-0 place-items-center rounded-md bg-gradient-to-br text-white shadow-sm transition-transform group-hover/stage:scale-110 ${theme.gradient} ${active ? "scale-110" : ""}`}
                        >
                          <Icon className="!h-3 !w-3" />
                        </span>
                        {!collapsed && (
                          <span className={`truncate ${active ? theme.text : ""}`}>{page.name}</span>
                        )}
                      </Link>
                    </SidebarMenuButton>
                    {!collapsed && count > 0 && (
                      <SidebarMenuBadge className={`${theme.soft} ${theme.text} rounded-full font-bold`}>
                        {count}
                      </SidebarMenuBadge>
                    )}
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarGroup>
          <SidebarGroupLabel>Stock</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname.startsWith("/inventory")} tooltip="Inventory (beta)">
                  <Link to="/inventory">
                    <Boxes className="h-4 w-4" />
                    {!collapsed && (
                      <span className="flex items-center gap-2">
                        Inventory
                        <span className="rounded-full bg-violet-100 px-1.5 text-[9px] font-bold uppercase tracking-wider text-violet-700">
                          Beta
                        </span>
                      </span>
                    )}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
