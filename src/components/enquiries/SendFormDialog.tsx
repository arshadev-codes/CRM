import { useState } from "react";
import { Copy, Link2, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { copyText, formLink, inviteClient, whatsappLink, type Enquiry } from "@/lib/enquiries";

const labelClass = "text-[11px] uppercase tracking-widest text-slate-400";

/** A form link with Copy and WhatsApp buttons. */
export function ShareLink({ link, phone, name }: { link: string; phone?: string; name?: string }) {
  return (
    <div className="space-y-2">
      <div className="neo-inset flex items-center gap-2 px-3 py-2">
        <Link2 className="h-4 w-4 shrink-0 text-slate-400" />
        <input
          data-no-neo
          readOnly
          value={link}
          onFocus={(e) => e.target.select()}
          className="w-full min-w-0 bg-transparent font-mono text-xs text-slate-700 outline-none"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={() => copyText(link)}>
          <Copy /> Copy link
        </Button>
        <Button size="sm" variant="outline" asChild>
          <a href={whatsappLink(link, phone, name)} target="_blank" rel="noopener noreferrer">
            <MessageCircle className="text-emerald-600" /> Send on WhatsApp
          </a>
        </Button>
      </div>
    </div>
  );
}

/** Makes a personal form link for one client, with their details filled in for them. */
export function SendFormDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: () => void;
}) {
  const [company, setCompany] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [made, setMade] = useState<Enquiry | null>(null);

  const close = (v: boolean) => {
    onOpenChange(v);
    if (!v) {
      setCompany("");
      setContactPerson("");
      setEmail("");
      setPhone("");
      setMade(null);
    }
  };

  async function create() {
    if (!company.trim()) return toast.error("Enter the client's company name");
    setSaving(true);
    const enquiry = await inviteClient({ company, contactPerson, email, phone });
    setSaving(false);
    if (!enquiry) return;
    setMade(enquiry);
    onCreated();
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Send the requirement form to a client</DialogTitle>
          <DialogDescription>
            {made
              ? "Share this link with the client. When they submit, it shows up here as a new enquiry and the office gets an email."
              : "Makes a link just for this client. Their details below are filled in for them when they open it."}
          </DialogDescription>
        </DialogHeader>

        {made ? (
          <ShareLink link={formLink(made.token)} phone={made.phone} name={made.contactPerson} />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label className={labelClass}>Company *</Label>
              <Input value={company} onChange={(e) => setCompany(e.target.value)} autoFocus />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label className={labelClass}>Contact person</Label>
              <Input value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className={labelClass}>Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className={labelClass}>Phone / WhatsApp</Label>
              <Input
                type="tel"
                placeholder="+91 98xxxxxxxx"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </div>
        )}

        <DialogFooter>
          {made ? (
            <Button onClick={() => close(false)}>Done</Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => close(false)}>
                Cancel
              </Button>
              <Button onClick={create} disabled={saving}>
                {saving ? "Making link…" : "Make link"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
