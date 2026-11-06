import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet, createRootRouteWithContext, useRouter,
  HeadContent, Scripts, useRouterState,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Toaster } from "@/components/ui/sonner";
import { PageTransition } from "@/components/PageTransition";
import { RouteProgress } from "@/components/RouteProgress";
import { DemoModeBadge } from "@/components/DemoModeBadge";
import { QuotationNav } from "@/components/QuotationNav";
import { UserMenu } from "@/components/auth/UserMenu";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { isFieldUser, useAuthMode, useAuthStore, useCurrentUser } from "@/store/authStore";
import { Home, RotateCcw } from "lucide-react";
import { freshStart } from "@/lib/freshStart";
import { captureAppInstall } from "@/lib/push";
import { useProposalStore } from "@/store/proposalStore";

// Runs before any page renders, so no page sees the old database's leftovers.
freshStart();


function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="neo-surface max-w-md rounded-3xl px-10 py-12 text-center es-pop-in">
        <h1 className="bg-gradient-to-br from-indigo-600 to-violet-500 bg-clip-text text-7xl font-extrabold text-transparent">404</h1>
        <p className="mt-3 font-semibold text-slate-700">This page doesn't exist</p>
        <p className="mt-1 text-sm text-muted-foreground">The link may be old, or the page was moved.</p>
        <a href="/" className="mt-7 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 hover:brightness-110"><Home className="h-4 w-4" />Go home</a>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => { console.error(error); }, [error]);
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="neo-surface max-w-md rounded-3xl px-10 py-10 text-center es-pop-in">
        <h1 className="text-xl font-bold text-slate-800">This page didn't load</h1>
        <p className="mt-2 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-600">{error.message}</p>
        <button onClick={() => { router.invalidate(); reset(); }} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 hover:brightness-110"><RotateCcw className="h-4 w-4" />Try again</button>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  ssr: false,
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { name: "theme-color", content: "#4f46e5" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-title", content: "Electrosoft" },
      { title: "Electrosoft Proposal Engine" },
      { name: "description", content: "Data-driven techno-commercial proposal builder for transformer testing systems." },
      { property: "og:title", content: "Electrosoft Proposal Engine" },
      { name: "twitter:title", content: "Electrosoft Proposal Engine" },
      { property: "og:description", content: "Data-driven techno-commercial proposal builder for transformer testing systems." },
      { name: "twitter:description", content: "Data-driven techno-commercial proposal builder for transformer testing systems." },
      { name: "twitter:card", content: "summary" },
      { property: "og:type", content: "website" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap",
      },
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "icon", type: "image/png", href: "/icons/favicon-48.png" },
      { rel: "apple-touch-icon", href: "/icons/apple-touch-icon.png" },
    ],
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
  // The client requirement form is public, like print pages: no sign-in, no app chrome.
  const isPrint = pathname.startsWith("/print/") || pathname === "/rfq" || pathname.startsWith("/rfq/");
  const isLogin = pathname === "/login";
  // The phone app for field staff: full-screen, no sidebar.
  const isApp = pathname === "/my" || pathname.startsWith("/my/");
  const isQuotation = pathname === "/" || pathname.startsWith("/projects/") || pathname.startsWith("/settings");
  const user = useCurrentUser();
  const authMode = useAuthMode();
  const navigate = Route.useNavigate();
  useEffect(() => {
    captureAppInstall();
    void useAuthStore.getState().init();
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }
  }, []);
  // The shared employee list (and ratings) comes from the database once someone signs in.
  const userId = user?.id;
  useEffect(() => {
    if (userId) void useProposalStore.getState().hydrateEmployees();
  }, [userId]);
  // Field staff only use the app; the office website is not theirs.
  const fieldOnly = Boolean(user && isFieldUser(user)) && !isApp && !isLogin && !isPrint;
  useEffect(() => {
    if (fieldOnly) navigate({ to: "/my", replace: true });
  }, [fieldOnly, navigate]);
  // Wait until we know who is signed in before sending anyone to the login page.
  const needsLogin = authMode !== "checking" && !user && !isPrint && !isLogin;
  useEffect(() => {
    if (needsLogin) {
      const href = window.location.pathname + window.location.search;
      navigate({ to: "/login", search: { redirect: href === "/" ? undefined : href }, replace: true });
    }
  }, [needsLogin, navigate]);
  if (needsLogin || fieldOnly || (authMode === "checking" && !isPrint)) return null;
  return (
    <QueryClientProvider client={queryClient}>
      {isPrint || isLogin || isApp ? <><Outlet /><Toaster position={isApp ? "top-center" : undefined} /></> : (
        <SidebarProvider>
          <RouteProgress />
          <div className="h-svh flex w-full overflow-hidden">
            <AppSidebar />
            <div className="flex-1 flex flex-col min-w-0 min-h-0">
              <header className="h-14 mx-3 mt-3 rounded-2xl flex items-center neo-surface shrink-0 px-2">
                <SidebarTrigger className="ml-1 neo-pop !h-9 !w-9 rounded-xl" />
                <div className="ml-3 font-semibold text-sm text-indigo-600 tracking-wide">
                  Electrosoft · Proposal Engine
                </div>
                <div className="ml-auto mr-1 flex items-center gap-2">
                  <DemoModeBadge />
                  <NotificationBell />
                  <UserMenu />
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
