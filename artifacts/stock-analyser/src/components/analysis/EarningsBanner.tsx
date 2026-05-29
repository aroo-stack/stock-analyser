import { Calendar, AlertTriangle } from "lucide-react";

interface Props {
  earningsDate: string | null;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function daysUntil(iso: string): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(iso);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export default function EarningsBanner({ earningsDate }: Props) {
  if (!earningsDate) return null;

  const days = daysUntil(earningsDate);
  if (days < 0 || days > 30) return null;

  const isUrgent = days <= 7;

  if (isUrgent) {
    return (
      <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-lg border border-amber-500/40 bg-amber-500/10 text-amber-300 text-sm font-mono">
        <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
        <span>
          <span className="font-bold">Earnings in {days === 0 ? "today" : `${days} day${days !== 1 ? "s" : ""}`}</span>
          <span className="text-amber-300/70 ml-2">— {formatDate(earningsDate)}</span>
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-lg border border-blue-500/30 bg-blue-500/8 text-blue-300 text-sm font-mono">
      <Calendar className="w-4 h-4 shrink-0 text-blue-400" />
      <span>
        Earnings on <span className="font-bold">{formatDate(earningsDate)}</span>
        <span className="text-blue-300/60 ml-2">({days} days away)</span>
      </span>
    </div>
  );
}
