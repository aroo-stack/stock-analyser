export function formatCurrency(value: number | null | undefined, currency: string = "USD"): string {
  if (value == null) return "N/A";
  
  if (value >= 1e9) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(value / 1e9) + "B";
  }
  if (value >= 1e6) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(value / 1e6) + "M";
  }
  
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatNumber(value: number | null | undefined, decimals: number = 2): string {
  if (value == null) return "N/A";
  
  if (value >= 1e9) {
    return (value / 1e9).toFixed(decimals) + "B";
  }
  if (value >= 1e6) {
    return (value / 1e6).toFixed(decimals) + "M";
  }
  
  return value.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatPercent(value: number | null | undefined): string {
  if (value == null) return "N/A";
  
  const formatted = Math.abs(value).toFixed(2) + "%";
  if (value > 0) return "+" + formatted;
  if (value < 0) return "-" + formatted;
  return formatted;
}
