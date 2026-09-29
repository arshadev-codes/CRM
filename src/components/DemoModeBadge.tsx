import { useEffect, useState } from "react";
import { HardDrive } from "lucide-react";
import { isDemoMode, onDemoModeChange } from "@/lib/db";

// Shown when some stage data is being kept in this browser because the cloud tables are missing.
export function DemoModeBadge() {
  const [demo, setDemo] = useState(false);
  useEffect(() => {
    setDemo(isDemoMode());
    return onDemoModeChange(() => setDemo(isDemoMode()));
  }, []);
  if (!demo) return null;
  return (
    <span
      className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-[11px] font-semibold text-amber-800"
      title="The cloud database for the stage pages isn't set up yet, so changes are saved in this browser only."
    >
      <HardDrive className="h-3.5 w-3.5" />
      Demo mode · saved in this browser
    </span>
  );
}
