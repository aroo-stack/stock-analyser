import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface QuantData {
  currentPrice?: number | null;
  targetPrice?: number | null;
  targetLowPrice?: number | null;
  targetHighPrice?: number | null;
  targetMedianPrice?: number | null;
  numberOfAnalysts?: number | null;
  forwardPE?: number | null;
  forwardEps?: number | null;
  forwardEps2y?: number | null;
  eps?: number | null;
  revenueGrowth?: number | null;
}

interface Props {
  quant: QuantData;
  currentPrice: number;
  currency?: string;
}

function pct(target: number, current: number) {
  return ((target - current) / current) * 100;
}

function ReturnBadge({ value }: { value: number }) {
  const abs = Math.abs(value).toFixed(1);
  if (value > 0.5) return (
    <span className="flex items-center gap-0.5 text-emerald-400 font-mono text-xs font-bold">
      <TrendingUp className="w-3 h-3" />+{abs}%
    </span>
  );
  if (value < -0.5) return (
    <span className="flex items-center gap-0.5 text-red-400 font-mono text-xs font-bold">
      <TrendingDown className="w-3 h-3" />-{abs}%
    </span>
  );
  return (
    <span className="flex items-center gap-0.5 text-muted-foreground font-mono text-xs font-bold">
      <Minus className="w-3 h-3" />{abs}%
    </span>
  );
}

// ─── Analyst Target Bar ─────────────────────────────────────────────────────

function TargetBar({ low, mean, high, current, currency }: {
  low: number; mean: number; high: number; current: number; currency?: string;
}) {
  const sym = currency ?? "$";
  const min = Math.min(low, current) * 0.95;
  const max = Math.max(high, current) * 1.05;
  const range = max - min;

  const pos = (v: number) => `${Math.max(0, Math.min(100, ((v - min) / range) * 100)).toFixed(1)}%`;

  const lowPct = pct(low, current);
  const meanPct = pct(mean, current);
  const highPct = pct(high, current);

  return (
    <div className="space-y-3">
      <div className="relative h-3 rounded-full bg-muted/30 overflow-visible">
        {/* gradient fill from low to high */}
        <div
          className="absolute top-0 h-3 rounded-full"
          style={{
            left: pos(low),
            width: `calc(${pos(high)} - ${pos(low)})`,
            background: "linear-gradient(90deg, #ef4444 0%, #94a3b8 50%, #10b981 100%)",
            opacity: 0.6,
          }}
        />
        {/* current price pin */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white border-2 border-primary shadow-lg z-10"
          style={{ left: `calc(${pos(current)} - 6px)` }}
          title={`Current: ${sym}${current.toFixed(2)}`}
        />
      </div>

      {/* Labels row */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "BEAR", value: low, pctVal: lowPct, color: "text-red-400", borderColor: "border-red-400/30 bg-red-400/5" },
          { label: "BASE", value: mean, pctVal: meanPct, color: "text-slate-400", borderColor: "border-slate-400/30 bg-slate-400/5" },
          { label: "BULL", value: high, pctVal: highPct, color: "text-emerald-400", borderColor: "border-emerald-400/30 bg-emerald-400/5" },
        ].map(({ label, value, pctVal, color, borderColor }) => (
          <div key={label} className={`rounded-lg border p-2.5 ${borderColor} text-center`}>
            <div className={`text-[10px] font-mono font-bold uppercase tracking-wider ${color} mb-1`}>{label}</div>
            <div className={`text-sm font-mono font-bold ${color}`}>{sym}{value.toFixed(2)}</div>
            <ReturnBadge value={pctVal} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── P/E Scenario Slider ─────────────────────────────────────────────────────

function PESlider({ forwardEps, forwardEps2y, forwardPE, trailingEps, currentPrice, currency }: {
  forwardEps: number; forwardEps2y: number | null; forwardPE: number | null; trailingEps: number | null; currentPrice: number; currency?: string;
}) {
  const sym = currency ?? "$";
  const forwardPECalc = forwardPE ?? (currentPrice / forwardEps);
  const trailingPECalc = trailingEps != null && trailingEps > 0 ? currentPrice / trailingEps : null;

  const defaultPE = Math.round(forwardPECalc * 2) / 2;
  const minPE = Math.max(5, Math.floor(Math.min(forwardPECalc, trailingPECalc ?? forwardPECalc) * 0.5));
  const maxPE = Math.ceil(Math.max(forwardPECalc, trailingPECalc ?? forwardPECalc) * 2.5);

  const [selectedPE, setSelectedPE] = useState(defaultPE);

  const implied1y = selectedPE * forwardEps;
  const implied2y = forwardEps2y != null ? selectedPE * forwardEps2y : null;
  const ret1y = pct(implied1y, currentPrice);
  const ret2y = implied2y != null ? pct(implied2y, currentPrice) : null;

  // Slider thumb color
  const thumbColor = ret1y > 5 ? "#10b981" : ret1y < -5 ? "#ef4444" : "#94a3b8";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-xs font-mono text-muted-foreground">P/E Multiple</div>
        <div className="text-lg font-mono font-bold text-primary">{selectedPE.toFixed(1)}×</div>
      </div>

      <div className="relative">
        <input
          type="range"
          min={minPE}
          max={maxPE}
          step={0.5}
          value={selectedPE}
          onChange={(e) => setSelectedPE(parseFloat(e.target.value))}
          className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
          style={{
            background: `linear-gradient(90deg, ${thumbColor} 0%, ${thumbColor} ${((selectedPE - minPE) / (maxPE - minPE)) * 100}%, hsl(var(--muted)) ${((selectedPE - minPE) / (maxPE - minPE)) * 100}%, hsl(var(--muted)) 100%)`,
          }}
        />
        {/* Forward P/E marker */}
        <div
          className="absolute -top-5 text-[9px] font-mono text-sky-400 whitespace-nowrap"
          style={{ left: `${Math.max(0, Math.min(95, ((forwardPECalc - minPE) / (maxPE - minPE)) * 100))}%`, transform: "translateX(-50%)" }}
        >
          Fwd {forwardPECalc.toFixed(1)}×
        </div>
        {/* Trailing P/E marker */}
        {trailingPECalc != null && Math.abs(trailingPECalc - forwardPECalc) > 1 && (
          <div
            className="absolute -top-5 text-[9px] font-mono text-amber-400 whitespace-nowrap"
            style={{ left: `${Math.max(0, Math.min(95, ((trailingPECalc - minPE) / (maxPE - minPE)) * 100))}%`, transform: "translateX(-50%)" }}
          >
            Trail {trailingPECalc.toFixed(1)}×
          </div>
        )}
      </div>
      <div className="flex justify-between text-[10px] font-mono text-muted-foreground mt-1">
        <span>{minPE}×</span>
        <div className="flex gap-3 text-[9px]">
          <span className="text-sky-400">▲ Fwd P/E (next-12m earnings)</span>
          {trailingPECalc != null && Math.abs(trailingPECalc - forwardPECalc) > 1 && (
            <span className="text-amber-400">▲ Trailing P/E (last 12m)</span>
          )}
        </div>
        <span>{maxPE}×</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-border bg-muted/10 p-3">
          <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-1">1Y Implied Price</div>
          <div className="text-base font-mono font-bold text-foreground">{sym}{implied1y.toFixed(2)}</div>
          <div className="mt-0.5"><ReturnBadge value={ret1y} /></div>
          <div className="text-[10px] text-muted-foreground font-mono mt-1">EPS {sym}{forwardEps.toFixed(2)} × {selectedPE.toFixed(1)}×</div>
        </div>
        {implied2y != null && ret2y != null ? (
          <div className="rounded-lg border border-border bg-muted/10 p-3">
            <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-1">2Y Implied Price</div>
            <div className="text-base font-mono font-bold text-foreground">{sym}{implied2y.toFixed(2)}</div>
            <div className="mt-0.5"><ReturnBadge value={ret2y} /></div>
            <div className="text-[10px] text-muted-foreground font-mono mt-1">EPS {sym}{forwardEps2y!.toFixed(2)} × {selectedPE.toFixed(1)}×</div>
          </div>
        ) : (
          <div className="rounded-lg border border-border bg-muted/10 p-3 flex items-center justify-center">
            <span className="text-xs font-mono text-muted-foreground">2Y EPS N/A</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Valuation Table ─────────────────────────────────────────────────────────

interface ScenarioRow { label: string; pe: number; color: string; }

function ValuationTable({ forwardEps, forwardEps2y, targetLow, targetMean, targetHigh, forwardPE, currentPrice, currency }: {
  forwardEps: number;
  forwardEps2y: number | null;
  targetLow: number | null;
  targetMean: number | null;
  targetHigh: number | null;
  forwardPE: number | null;
  currentPrice: number;
  currency?: string;
}) {
  const sym = currency ?? "$";
  const basePE = forwardPE ?? Math.round(currentPrice / forwardEps);

  const defaultRows: ScenarioRow[] = [
    {
      label: "Bear",
      pe: targetLow != null ? Math.round(targetLow / forwardEps) : Math.round(basePE * 0.7),
      color: "text-red-400",
    },
    {
      label: "Base",
      pe: targetMean != null ? Math.round(targetMean / forwardEps) : basePE,
      color: "text-slate-300",
    },
    {
      label: "Bull",
      pe: targetHigh != null ? Math.round(targetHigh / forwardEps) : Math.round(basePE * 1.4),
      color: "text-emerald-400",
    },
  ];

  const [rows, setRows] = useState<ScenarioRow[]>(defaultRows);

  const updatePE = (idx: number, val: string) => {
    const n = parseFloat(val);
    if (!isNaN(n) && n > 0) {
      setRows((prev) => prev.map((r, i) => i === idx ? { ...r, pe: n } : r));
    }
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs font-mono">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left text-muted-foreground py-2 pr-3 font-normal uppercase tracking-wider">Scenario</th>
            <th className="text-right text-muted-foreground py-2 px-2 font-normal uppercase tracking-wider">P/E</th>
            <th className="text-right text-muted-foreground py-2 px-2 font-normal uppercase tracking-wider">1Y EPS</th>
            <th className="text-right text-muted-foreground py-2 px-2 font-normal uppercase tracking-wider">1Y Price</th>
            <th className="text-right text-muted-foreground py-2 px-2 font-normal uppercase tracking-wider">vs Now</th>
            {forwardEps2y != null && <>
              <th className="text-right text-muted-foreground py-2 px-2 font-normal uppercase tracking-wider">2Y EPS</th>
              <th className="text-right text-muted-foreground py-2 px-2 font-normal uppercase tracking-wider">2Y Price</th>
              <th className="text-right text-muted-foreground py-2 pl-2 font-normal uppercase tracking-wider">vs Now</th>
            </>}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => {
            const price1y = row.pe * forwardEps;
            const ret1y = pct(price1y, currentPrice);
            const price2y = forwardEps2y != null ? row.pe * forwardEps2y : null;
            const ret2y = price2y != null ? pct(price2y, currentPrice) : null;
            return (
              <tr key={row.label} className="border-b border-border/40 hover:bg-muted/5 transition-colors">
                <td className={`py-2.5 pr-3 font-bold ${row.color}`}>{row.label}</td>
                <td className="py-2.5 px-2 text-right">
                  <input
                    type="number"
                    value={row.pe}
                    min={1}
                    step={0.5}
                    onChange={(e) => updatePE(idx, e.target.value)}
                    className="w-14 text-right bg-muted/20 border border-border rounded px-1 py-0.5 text-foreground font-mono text-xs focus:outline-none focus:border-primary"
                  />
                  <span className="text-muted-foreground">×</span>
                </td>
                <td className="py-2.5 px-2 text-right text-muted-foreground">{sym}{forwardEps.toFixed(2)}</td>
                <td className={`py-2.5 px-2 text-right font-bold ${row.color}`}>{sym}{price1y.toFixed(2)}</td>
                <td className="py-2.5 px-2 text-right">
                  <span className={ret1y > 0 ? "text-emerald-400" : "text-red-400"}>
                    {ret1y > 0 ? "+" : ""}{ret1y.toFixed(1)}%
                  </span>
                </td>
                {forwardEps2y != null && <>
                  <td className="py-2.5 px-2 text-right text-muted-foreground">{sym}{forwardEps2y.toFixed(2)}</td>
                  <td className={`py-2.5 px-2 text-right font-bold ${row.color}`}>{price2y != null ? `${sym}${price2y.toFixed(2)}` : "—"}</td>
                  <td className="py-2.5 pl-2 text-right">
                    {ret2y != null ? (
                      <span className={ret2y > 0 ? "text-emerald-400" : "text-red-400"}>
                        {ret2y > 0 ? "+" : ""}{ret2y.toFixed(1)}%
                      </span>
                    ) : "—"}
                  </td>
                </>}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

function currencySymbol(code?: string): string {
  if (!code) return "$";
  const map: Record<string, string> = {
    USD: "$", AUD: "A$", GBP: "£", EUR: "€", CAD: "C$",
    JPY: "¥", HKD: "HK$", CNY: "¥", INR: "₹", KRW: "₩",
    SGD: "S$", NZD: "NZ$", SEK: "kr", NOK: "kr", DKK: "kr",
    ZAR: "R", BRL: "R$", CHF: "CHF",
  };
  return map[code] ?? code;
}

export default function ScenarioEngine({ quant, currentPrice, currency }: Props) {
  const sym = currencySymbol(currency);
  const {
    targetLowPrice: low,
    targetHighPrice: high,
    targetPrice: mean,
    targetMedianPrice: median,
    numberOfAnalysts,
    forwardPE,
    forwardEps,
    forwardEps2y,
  } = quant;

  const hasTargets = low != null && high != null && (mean ?? median) != null;
  const meanPrice = mean ?? median ?? null;
  const hasEPS = forwardEps != null;

  const activeTab = useMemo(() => {
    if (hasTargets) return "targets";
    if (hasEPS) return "pe";
    return null;
  }, [hasTargets, hasEPS]);

  const [tab, setTab] = useState<"targets" | "pe" | "table">(activeTab ?? "pe");

  if (!hasTargets && !hasEPS) {
    return (
      <Card className="p-6 border-border bg-card">
        <h2 className="text-sm font-mono font-bold text-muted-foreground uppercase tracking-wider mb-3">Scenario Engine</h2>
        <p className="text-sm text-muted-foreground font-mono">Analyst target and EPS data not available for this instrument.</p>
      </Card>
    );
  }

  const TABS = [
    { key: "targets" as const, label: "Analyst Targets", disabled: !hasTargets },
    { key: "pe" as const, label: "P/E Slider", disabled: !hasEPS },
    { key: "table" as const, label: "Valuation Matrix", disabled: !hasEPS },
  ].filter((t) => !t.disabled);

  return (
    <Card className="p-6 border-border bg-card shadow-sm space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-sm font-mono font-bold text-muted-foreground uppercase tracking-wider">
            Scenario Engine
          </h2>
          {numberOfAnalysts != null && (
            <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
              Based on {numberOfAnalysts} analyst{numberOfAnalysts !== 1 ? "s" : ""} · current price {quant.currentPrice != null ? `$${(quant.currentPrice as number).toFixed(2)}` : `$${currentPrice.toFixed(2)}`}
            </p>
          )}
        </div>

        {/* Tabs */}
        <div className="flex rounded-md overflow-hidden border border-border">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-3 py-1.5 text-[11px] font-mono transition-colors ${
                tab === t.key
                  ? "bg-primary/20 text-primary font-bold"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {tab === "targets" && hasTargets && low != null && high != null && meanPrice != null && (
        <TargetBar low={low} mean={meanPrice} high={high} current={currentPrice} currency={sym} />
      )}

      {tab === "pe" && hasEPS && forwardEps != null && (
        <PESlider
          forwardEps={forwardEps}
          forwardEps2y={forwardEps2y ?? null}
          forwardPE={forwardPE ?? null}
          trailingEps={quant.eps ?? null}
          currentPrice={currentPrice}
          currency={sym}
        />
      )}

      {tab === "table" && hasEPS && forwardEps != null && (
        <ValuationTable
          forwardEps={forwardEps}
          forwardEps2y={forwardEps2y ?? null}
          targetLow={low ?? null}
          targetMean={meanPrice}
          targetHigh={high ?? null}
          forwardPE={forwardPE ?? null}
          currentPrice={currentPrice}
          currency={sym}
        />
      )}
    </Card>
  );
}
