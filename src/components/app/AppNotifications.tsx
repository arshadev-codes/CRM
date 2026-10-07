import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Bell, BellOff, BellRing, LoaderCircle, Share } from "lucide-react";
import { toast } from "sonner";
import { supabase as cloud } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { enablePush, pushState, type PushState } from "@/lib/push";

type Note = Database["public"]["Tables"]["notifications"]["Row"];

function ago(iso: string) {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

// Home-screen card: turn on phone notifications, and the latest updates for this person.
export function AppNotifications({ userId }: { userId: string }) {
  const navigate = useNavigate();
  const [state, setState] = useState<PushState | null>(null);
  const [busy, setBusy] = useState(false);
  const [notes, setNotes] = useState<Note[]>([]);

  useEffect(() => {
    void pushState().then(setState);
    void cloud
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(15)
      .then(({ data }) => setNotes(data ?? []));
    // New updates arrive live while the app is open.
    const channel = cloud
      .channel(`notes-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const note = payload.new as Note;
          setNotes((current) => [note, ...current.filter((n) => n.id !== note.id)].slice(0, 15));
          toast(note.title, { description: note.body });
        },
      )
      .subscribe();
    return () => {
      void cloud.removeChannel(channel);
    };
  }, [userId]);

  async function turnOn() {
    setBusy(true);
    const next = await enablePush().catch(() => "off" as PushState);
    setBusy(false);
    setState(next);
    if (next === "on") toast.success("Notifications are on");
    else if (next === "blocked") toast.error("Notifications are blocked in the phone settings");
  }

  async function open(note: Note) {
    if (!note.read_at) {
      const readAt = new Date().toISOString();
      setNotes((current) => current.map((n) => (n.id === note.id ? { ...n, read_at: readAt } : n)));
      await cloud.from("notifications").update({ read_at: readAt }).eq("id", note.id);
    }
    void navigate({ to: note.link || "/my" });
  }

  async function markAllRead() {
    const readAt = new Date().toISOString();
    setNotes((current) => current.map((n) => ({ ...n, read_at: n.read_at ?? readAt })));
    await cloud.from("notifications").update({ read_at: readAt }).is("read_at", null);
  }

  const unread = notes.filter((n) => !n.read_at).length;

  return (
    <div className="space-y-3">
      {state && state !== "on" && state !== "unsupported" && (
        <div className="flex items-center gap-3 rounded-2xl bg-indigo-600 p-4 text-white shadow-lg shadow-indigo-600/20">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/15">
            {state === "blocked" ? (
              <BellOff className="h-5 w-5" />
            ) : state === "needs-install" ? (
              <Share className="h-5 w-5" />
            ) : (
              <BellRing className="h-5 w-5" />
            )}
          </span>
          <div className="min-w-0 flex-1 text-sm">
            {state === "needs-install" ? (
              <>
                <div className="font-semibold">Add to Home Screen for notifications</div>
                <div className="text-xs text-white/80">
                  Tap Share, then "Add to Home Screen", and open the app from there.
                </div>
              </>
            ) : state === "blocked" ? (
              <>
                <div className="font-semibold">Notifications are blocked</div>
                <div className="text-xs text-white/80">
                  Allow them for this app in the phone settings.
                </div>
              </>
            ) : (
              <>
                <div className="font-semibold">Get notified about new work</div>
                <div className="text-xs text-white/80">
                  New panels, drawings and material, straight to your phone.
                </div>
              </>
            )}
          </div>
          {state === "off" && (
            <button
              type="button"
              onClick={() => void turnOn()}
              disabled={busy}
              className="shrink-0 rounded-xl bg-white px-3 py-2 text-sm font-bold text-indigo-700"
            >
              {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : "Turn on"}
            </button>
          )}
        </div>
      )}

      {notes.length > 0 && (
        <section className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/70">
          <div className="flex items-center gap-2 px-4 pt-3">
            <Bell className="h-4 w-4 text-indigo-600" />
            <span className="text-sm font-bold text-slate-800">Updates</span>
            {unread > 0 && (
              <span className="rounded-full bg-rose-500 px-1.5 text-[11px] font-bold text-white">
                {unread}
              </span>
            )}
            {unread > 0 && (
              <button
                type="button"
                onClick={() => void markAllRead()}
                className="ml-auto text-xs font-semibold text-indigo-600"
              >
                Mark all read
              </button>
            )}
          </div>
          <ul className="mt-1 divide-y divide-slate-100">
            {notes.slice(0, 5).map((note) => (
              <li key={note.id}>
                <button
                  type="button"
                  onClick={() => void open(note)}
                  className="flex w-full items-start gap-3 px-4 py-3 text-left"
                >
                  <span
                    className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${note.read_at ? "bg-transparent" : "bg-indigo-500"}`}
                  />
                  <span className="min-w-0 flex-1">
                    <span
                      className={`block truncate text-sm ${note.read_at ? "text-slate-600" : "font-semibold text-slate-800"}`}
                    >
                      {note.title}
                    </span>
                    <span className="block truncate text-xs text-slate-500">{note.body}</span>
                  </span>
                  <span className="shrink-0 text-[11px] text-slate-400">
                    {ago(note.created_at)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
