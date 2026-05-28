import { BookOpen, TrendingUp, Newspaper, BarChart2, Compass, Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import type { SimpleExplanation as SimpleExplanationType } from "@workspace/api-client-react";

interface Props {
  data: SimpleExplanationType;
  ticker: string;
}

const sections = [
  {
    key: "whatTheyDo" as const,
    icon: BookOpen,
    label: "What this company does",
    color: "text-blue-400",
    bg: "bg-blue-400/10",
  },
  {
    key: "howItsDoing" as const,
    icon: TrendingUp,
    label: "How the stock has been doing",
    color: "text-emerald-400",
    bg: "bg-emerald-400/10",
  },
  {
    key: "whatNewsMeans" as const,
    icon: Newspaper,
    label: "What the recent news means",
    color: "text-amber-400",
    bg: "bg-amber-400/10",
  },
  {
    key: "whatNumbersMean" as const,
    icon: BarChart2,
    label: "What the numbers mean",
    color: "text-purple-400",
    bg: "bg-purple-400/10",
  },
  {
    key: "whatCouldHappen" as const,
    icon: Compass,
    label: "What could happen next",
    color: "text-cyan-400",
    bg: "bg-cyan-400/10",
  },
  {
    key: "whoItMightSuit" as const,
    icon: Users,
    label: "Who this stock might suit",
    color: "text-rose-400",
    bg: "bg-rose-400/10",
  },
];

export default function SimpleExplanation({ data, ticker }: Props) {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-1 h-6 bg-primary rounded-full" />
        <div>
          <h2 className="text-sm font-mono font-semibold text-foreground uppercase tracking-wider">
            Plain English Guide
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {ticker} explained in simple, everyday language — no jargon
          </p>
        </div>
      </div>

      {/* Disclaimer banner */}
      <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-2.5 flex items-start gap-2">
        <span className="text-amber-400 text-sm mt-0.5 shrink-0">⚠</span>
        <p className="text-xs text-amber-200/80 leading-relaxed">
          This section is for educational purposes only. It is not financial advice. Always consider your own circumstances and consult a financial professional before making any decisions.
        </p>
      </div>

      {/* Sections grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sections.map(({ key, icon: Icon, label, color, bg }) => (
          <Card
            key={key}
            className="p-5 border-border bg-card hover:border-border/80 transition-colors"
          >
            <div className="flex items-start gap-3">
              <div className={`mt-0.5 p-2 rounded-md ${bg} shrink-0`}>
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
              <div className="space-y-1.5 min-w-0">
                <p className={`text-xs font-mono font-semibold uppercase tracking-wider ${color}`}>
                  {label}
                </p>
                <p className="text-sm text-foreground/90 leading-relaxed">
                  {data[key]}
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
