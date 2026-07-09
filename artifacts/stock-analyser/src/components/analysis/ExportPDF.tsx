import { Download } from "lucide-react";

interface Props {
  ticker: string;
  companyName: string;
}

export default function ExportPDF({ ticker, companyName }: Props) {
  const handleExport = () => {
    const originalTitle = document.title;
    document.title = `QuantTerm_${ticker}_Report_${new Date().toISOString().split("T")[0]}`;
    window.print();
    document.title = originalTitle;
  };

  return (
    <button
      onClick={handleExport}
      className="export-btn p-2 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors"
      title="Export PDF"
    >
      <Download className="w-4 h-4" />
    </button>
  );
}
