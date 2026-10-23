import { useState } from "react";
import type { Project, ProposalData } from "@/store/proposalStore";
import { CURRENCIES, currencyInfo, fetchInrRates, makeMoney } from "@/data/currency";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeftRight, RefreshCw } from "lucide-react";
import { toast } from "sonner";

const fmtNum = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 4 });

/**
 * Pricing step: pick the currency the PDF prints prices in (prices are still
 * typed in rupees), set its rate, and a small any-to-any converter.
 */
export function CurrencyPanel({ project, update, totalInr }: {
  project: Project;
  update: (patch: Partial<ProposalData>) => void;
  /** Sum of all prices typed on this step, in rupees. */
  totalInr: number;
}) {
  const current = project.data.currency ?? { code: "INR", rate: 1 };
  const [rates, setRates] = useState<Record<string, number> | null>(null);
  const [ratesDate, setRatesDate] = useState("");
  const [loading, setLoading] = useState(false);

  const loadRates = async () => {
    setLoading(true);
    try {
      const r = await fetchInrRates();
      setRates(r.rates);
      setRatesDate(r.date);
      return r.rates;
    } catch {
      toast.error("Couldn't get today's rates. Check the internet, or type the rate yourself.");
      return null;
    } finally {
      setLoading(false);
    }
  };

  const pickCurrency = async (code: string) => {
    if (code === "INR") { update({ currency: undefined }); return; }
    const r = rates ?? await loadRates();
    update({ currency: { code, rate: r?.[code] ? Number(r[code].toFixed(4)) : 0 } });
  };

  const useTodaysRate = async () => {
    const r = await loadRates();
    if (r?.[current.code]) {
      update({ currency: { code: current.code, rate: Number(r[current.code].toFixed(4)) } });
      toast.success("Rate updated");
    }
  };

  const money = makeMoney(project.data.currency);
  const foreign = current.code !== "INR";

  return (
    <div className="border rounded-lg p-4 bg-slate-50 space-y-4">
      <div className="font-semibold text-sm">Currency</div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
        <div>
          <label className="text-xs font-medium">Show prices in the quotation in</label>
          <Select value={current.code} onValueChange={v => void pickCurrency(v)}>
            <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
            <SelectContent>
              {CURRENCIES.map(c => <SelectItem key={c.code} value={c.code}>{c.code} — {c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        {foreign && (
          <>
            <div>
              <label className="text-xs font-medium">Rate: 1 {current.code} = ₹</label>
              <Input
                type="number"
                min="0"
                step="0.0001"
                className="bg-white"
                value={current.rate || ""}
                onChange={e => update({ currency: { code: current.code, rate: Number(e.target.value) } })}
              />
            </div>
            <Button variant="outline" onClick={() => void useTodaysRate()} disabled={loading}>
              <RefreshCw className={`h-3 w-3 mr-1 ${loading ? "animate-spin" : ""}`} />Use today's rate
            </Button>
          </>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        Keep typing prices in rupees (₹) below.
        {foreign
          ? current.rate > 0
            ? ` The PDF will show every price in ${current.code}: total ₹${totalInr.toLocaleString("en-IN")} = ${money.fromInr(totalInr)}. The rate is saved with this quotation, so it won't change by itself.`
            : " Enter the rate to see prices in this currency."
          : " The PDF shows prices in rupees."}
      </p>

      <Converter rates={rates} ratesDate={ratesDate} loading={loading} onLoad={() => void loadRates()} />
    </div>
  );
}

function Converter({ rates, ratesDate, loading, onLoad }: {
  rates: Record<string, number> | null; ratesDate: string; loading: boolean; onLoad: () => void;
}) {
  const [amount, setAmount] = useState("1");
  const [from, setFrom] = useState("USD");
  const [to, setTo] = useState("INR");

  // Rupees for 1 unit of a currency; rupee itself is 1.
  const inrPer = (code: string) => (code === "INR" ? 1 : rates?.[code]);
  const a = Number(amount);
  const fromRate = inrPer(from);
  const toRate = inrPer(to);
  const result = fromRate && toRate && !Number.isNaN(a) ? (a * fromRate) / toRate : null;

  return (
    <div className="border-t pt-4 space-y-2">
      <div className="font-semibold text-sm">Quick converter</div>
      <div className="flex flex-wrap items-end gap-2">
        <Input type="number" className="bg-white w-36" value={amount} onChange={e => setAmount(e.target.value)} />
        <CurrencySelect value={from} onChange={setFrom} />
        <Button variant="ghost" size="icon" title="Swap" onClick={() => { setFrom(to); setTo(from); }}>
          <ArrowLeftRight className="h-4 w-4" />
        </Button>
        <CurrencySelect value={to} onChange={setTo} />
        <div className="text-sm font-semibold min-w-40 py-2">
          {rates
            ? result != null ? `= ${currencyInfo(to).symbol}${fmtNum(result)}` : "—"
            : <Button size="sm" variant="outline" onClick={onLoad} disabled={loading}>Get today's rates</Button>}
        </div>
      </div>
      {rates && ratesDate && (
        <p className="text-[11px] text-muted-foreground">Rates from {ratesDate}. Just for a quick check; it doesn't change the quotation.</p>
      )}
    </div>
  );
}

function CurrencySelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="bg-white w-28"><SelectValue /></SelectTrigger>
      <SelectContent>{CURRENCIES.map(c => <SelectItem key={c.code} value={c.code}>{c.code}</SelectItem>)}</SelectContent>
    </Select>
  );
}
