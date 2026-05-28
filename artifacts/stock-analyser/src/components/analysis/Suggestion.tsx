import { Card } from "@/components/ui/card";
import { Suggestion as ISuggestion } from "@workspace/api-client-react";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, MinusCircle, XCircle } from "lucide-react";

export default function Suggestion({ suggestion }: { suggestion: ISuggestion }) {
  
  const getRiskColor = (risk: string) => {
    switch(risk) {
      case 'Aggressive': return 'bg-destructive/20 text-destructive border-destructive/30';
      case 'Moderate': return 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30';
      case 'Conservative': return 'bg-success/20 text-success border-success/30';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getViewData = (view: string) => {
    switch(view) {
      case 'Leaning Positive': 
        return { icon: <CheckCircle2 className="w-4 h-4 mr-1.5" />, color: 'bg-success/20 text-success border-success/30' };
      case 'Leaning Negative': 
        return { icon: <XCircle className="w-4 h-4 mr-1.5" />, color: 'bg-destructive/20 text-destructive border-destructive/30' };
      default: 
        return { icon: <MinusCircle className="w-4 h-4 mr-1.5" />, color: 'bg-muted text-muted-foreground border-border' };
    }
  };

  const viewData = getViewData(suggestion.view);

  return (
    <Card className="p-5 border-border bg-card shadow-sm h-full flex flex-col">
      <div className="border-b border-border pb-3 mb-4 flex justify-between items-center">
        <h2 className="text-sm font-mono font-bold text-muted-foreground uppercase tracking-wider">Analysis Summary</h2>
        <Badge variant="outline" className={`font-mono font-bold uppercase rounded-sm px-2 ${viewData.color}`}>
          {viewData.icon}
          {suggestion.view}
        </Badge>
      </div>

      <div className="space-y-5 flex-1">
        <div className="flex flex-col space-y-2">
          <span className="text-[10px] uppercase text-muted-foreground/70 font-mono tracking-widest">Risk Profile</span>
          <Badge variant="outline" className={`w-fit font-mono font-bold uppercase rounded-sm px-2 ${getRiskColor(suggestion.riskProfile)}`}>
            {suggestion.riskProfile}
          </Badge>
        </div>

        <div className="space-y-3">
          <span className="text-[10px] uppercase text-muted-foreground/70 font-mono tracking-widest">Key Drivers</span>
          <ul className="space-y-2">
            {suggestion.reasons.map((reason, idx) => (
              <li key={idx} className="text-sm flex items-start">
                <span className="text-primary mr-2 font-bold mt-0.5">•</span>
                <div>
                  <span className="font-semibold text-foreground mr-1">{reason.label}:</span>
                  <span className="text-muted-foreground leading-relaxed">{reason.detail}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-2 pt-2 border-t border-border/50">
          <span className="text-[10px] uppercase text-muted-foreground/70 font-mono tracking-widest">Target Investor Type</span>
          <div className="flex flex-wrap gap-2">
            {suggestion.investorType.map((type, idx) => (
              <span key={idx} className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded border border-border font-mono">
                {type}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 text-[10px] text-muted-foreground/60 italic leading-tight">
        Disclaimer: {suggestion.disclaimer}
      </div>
    </Card>
  );
}
