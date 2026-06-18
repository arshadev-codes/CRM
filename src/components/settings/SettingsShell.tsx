import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SettingsShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="p-6 max-w-6xl mx-auto">
      <Link to="/settings"><Button size="sm" variant="ghost" className="mb-2"><ArrowLeft className="h-3 w-3 mr-1" />All settings</Button></Link>
      <h1 className="text-2xl font-bold mb-4">{title}</h1>
      <div className="bg-white rounded-lg border p-5">{children}</div>
      <p className="text-xs text-muted-foreground mt-3">Note: Phase-1 CMS reads from baked-in data files. Overrides save to <code>localStorage</code>; full editor + image upload land in Phase 2.</p>
    </div>
  );
}
