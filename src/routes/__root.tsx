import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet, createRootRouteWithContext, useRouter,
  HeadContent, Scripts, useRouterState,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Toaster } from "@/components/ui/sonner";
import { NeoBackground } from "@/components/NeoBackground";
import { PageTransition } from "@/components/PageTransition";
import { DemoModeBadge } from "@/components/DemoModeBadge";
import { QuotationNav } from "@/components/QuotationNav";


function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <p className="mt-2 text-sm text-muted-foreground">Page not found.</p>
        <a href="/" className="mt-6 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Go home</a>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => { reportLovableError(error, { boundary: "tanstack_root_error_component" }); }, [error]);
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold">This page didn't load</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <button onClick={() => { router.invalidate(); reset(); }} className="mt-4 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Try again</button>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  ssr: false,
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Electrosoft Proposal Engine" },
      { name: "description", content: "Data-driven techno-commercial proposal builder for transformer testing systems." },
      { property: "og:title", content: "Electrosoft Proposal Engine" },
      { name: "twitter:title", content: "Electrosoft Proposal Engine" },
      { property: "og:description", content: "Data-driven techno-commercial proposal builder for transformer testing systems." },
      { name: "twitter:description", content: "Data-driven techno-commercial proposal builder for transformer testing systems." },
      { name: "twitter:card", content: "summary" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en"><head><HeadContent /></head><body>{children}<Scripts /></body></html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const pathname = useRouterState({ select: r => r.location.pathname });
  const isPrint = pathname.startsWith("/print/");
  const isLogin = pathname === "/login";
  const isQuotation = pathname === "/" || pathname.startsWith("/projects/") || pathname.startsWith("/settings");
  return (
    <QueryClientProvider client={queryClient}>
      {isPrint || isLogin ? <><Outlet /><Toaster /></> : (
        <SidebarProvider>
          <NeoBackground />
          <div className="min-h-screen flex w-full">
            <AppSidebar />
            <div className="flex-1 flex flex-col min-w-0">
              <header className="h-14 mx-3 mt-3 rounded-2xl flex items-center neo-surface shrink-0 px-2">
                <SidebarTrigger className="ml-1 neo-pop !h-9 !w-9 rounded-xl" />
                <div className="ml-3 font-semibold text-sm text-indigo-600 tracking-wide">
                  Electrosoft · Proposal Engine
                </div>
                <div className="ml-auto mr-1 flex items-center gap-2">
                  <DemoModeBadge />
                  <div className="h-9 w-9 rounded-full neo-pop grid place-items-center text-xs font-bold text-indigo-600" aria-label="User profile">
                    ES
                  </div>
                </div>
              </header>
              {isQuotation && <QuotationNav />}
              <main className="flex-1 overflow-auto">
                <PageTransition><Outlet /></PageTransition>
              </main>
            </div>
          </div>
          <Toaster />
        </SidebarProvider>
      )}

    </QueryClientProvider>
  );
}
