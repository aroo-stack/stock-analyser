import { Building, Globe, MapPin, Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import { StockOverview } from "@workspace/api-client-react";
import { formatCurrency, formatNumber } from "@/lib/format";

export default function Overview({ overview }: { overview: StockOverview }) {
  return (
    <Card className="p-5 border-border bg-card shadow-sm flex flex-col space-y-5">
      <div className="flex items-center justify-between border-b border-border pb-3">
        <h2 className="text-sm font-mono font-bold text-muted-foreground uppercase tracking-wider">Company Profile</h2>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground font-mono">Sector</span>
            <p className="text-sm font-medium text-foreground" data-testid="overview-sector">{overview.sector || "N/A"}</p>
          </div>
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground font-mono">Industry</span>
            <p className="text-sm font-medium text-foreground" data-testid="overview-industry">{overview.industry || "N/A"}</p>
          </div>
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground font-mono">Exchange</span>
            <p className="text-sm font-medium text-foreground font-mono" data-testid="overview-exchange">{overview.exchange}</p>
          </div>
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground font-mono">Market Cap</span>
            <p className="text-sm font-medium text-foreground font-mono" data-testid="overview-marketcap">{formatCurrency(overview.marketCap, overview.currency)}</p>
          </div>
        </div>

        <div className="space-y-3 pt-3 border-t border-border">
          {overview.description && (
            <p className="text-sm text-muted-foreground leading-relaxed line-clamp-4 hover:line-clamp-none transition-all duration-300">
              {overview.description}
            </p>
          )}

          <div className="flex flex-wrap gap-4 pt-2">
            {overview.country && (
              <div className="flex items-center text-xs text-muted-foreground">
                <MapPin className="w-3 h-3 mr-1" />
                <span>{overview.country}</span>
              </div>
            )}
            {overview.employees && (
              <div className="flex items-center text-xs text-muted-foreground">
                <Users className="w-3 h-3 mr-1" />
                <span>{formatNumber(overview.employees, 0)}</span>
              </div>
            )}
            {overview.website && (
              <a href={overview.website} target="_blank" rel="noopener noreferrer" className="flex items-center text-xs text-primary hover:underline">
                <Globe className="w-3 h-3 mr-1" />
                <span>Website</span>
              </a>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
