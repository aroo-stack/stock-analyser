import type { StockQuoteData, StockHistoryResult } from "./stockData";

export interface BottomLineResult {
  verdict: "Strong Buy" | "Buy" | "Hold" | "Sell" | "Strong Sell";
  verdictColour: "green" | "amber" | "red";
  compositeScore: number;
  oneLiner: string;
  healthStatus: "Great" | "Good" | "Okay" | "Weak" | "Poor";
  priceTargets: {
    oneMonth:     number | null;
    sixMonths:    number | null;
    oneYear:      number | null;
    oneMonthLow:  number | null;
    oneMonthHigh: number | null;
    oneYearLow:   number | null;
    oneYearHigh:  number | null;
  };
  targetRationale: string;
  scores: {
    momentum:  number;
    valuation: number;
    risk:      number;
    quality:   number;
  };
  signals: {
    rsi14:              number | null;
    stochasticK:        number | null;
    stochasticD:        number | null;
    williamsR:          number | null;
    macd:               "bullish" | "bearish" | "neutral";
    macdLine:           number | null;
    macdSignalLine:     number | null;
    macdHistogram:      number | null;
    bollingerUpper:     number | null;
    bollingerMiddle:    number | null;
    bollingerLower:     number | null;
    bollingerPosition:  number | null;
    atr14:              number | null;
    obv:                number | null;
    obvTrend:           "rising" | "falling" | "flat" | null;
    roc20:              number | null;
    vsMA20:             number | null;
    vsMA50:             number | null;
    vsMA200:            number | null;
    goldenCross:        boolean | null;
    ichimokuSignal:     "above_cloud" | "below_cloud" | "in_cloud" | null;
    fibLevel:           string | null;
    peRatio:            number | null;
    forwardPE:          number | null;
    pegRatio:           number | null;
    pbRatio:            number | null;
    psRatio:            number | null;
    evToEbitda:         number | null;
    earningsYield:      number | null;
    dividendYield:      number | null;
    grahamNumber:       number | null;
    grahamVsCurrent:    number | null;
    beta:                    number | null;
    historicalVolatility30d: number | null;
    sharpeRatio:             number | null;
    sortinoRatio:            number | null;
    maxDrawdown:             number | null;
    valueAtRisk95:           number | null;
    calmarRatio:             number | null;
    returnSkewness:          number | null;
    returnKurtosis:          number | null;
    fiftyTwoWeekPosition:    number | null;
    revenueGrowth:    number | null;
    profitMargin:     number | null;
    returnOnEquity:   number | null;
    debtToEquity:     number | null;
    currentRatio:     number | null;
  };
  methodsUsed: string[];
  disclaimer: string;
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function r2(v: number): number {
  return Math.round(v * 100) / 100;
}

function calcEMA(values: number[], period: number): number[] {
  if (values.length === 0) return [];
  const k = 2 / (period + 1);
  const result: number[] = [values[0]];
  for (let i = 1; i < values.length; i++) {
    result.push(values[i] * k + result[i - 1] * (1 - k));
  }
  return result;
}

function calcSMALast(values: number[], period: number): number | null {
  if (values.length < period) return null;
  const slice = values.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / period;
}

function stdDevPop(values: number[]): number {
  const n = values.length;
  if (n === 0) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / n;
  const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / n;
  return Math.sqrt(variance);
}

function stdDevSample(values: number[]): number {
  const n = values.length;
  if (n < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / n;
  const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / (n - 1);
  return Math.sqrt(variance);
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

// ─── Technical Indicators ──────────────────────────────────────────────────

function calcRSI14(closes: number[]): number | null {
  try {
    if (closes.length < 15) return null;
    const changes = closes.slice(1).map((c, i) => c - closes[i]);
    const gains = changes.map(c => Math.max(c, 0));
    const losses = changes.map(c => Math.max(-c, 0));
    let avgGain = mean(gains.slice(0, 14));
    let avgLoss = mean(losses.slice(0, 14));
    for (let i = 14; i < changes.length; i++) {
      avgGain = (avgGain * 13 + gains[i]) / 14;
      avgLoss = (avgLoss * 13 + losses[i]) / 14;
    }
    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return r2(100 - 100 / (1 + rs));
  } catch { return null; }
}

function calcStochastic(closes: number[]): { k: number | null; d: number | null } {
  try {
    if (closes.length < 14) return { k: null, d: null };
    const kValues: number[] = [];
    for (let i = 13; i < closes.length; i++) {
      const slice = closes.slice(i - 13, i + 1);
      const high14 = Math.max(...slice);
      const low14 = Math.min(...slice);
      if (high14 === low14) { kValues.push(50); continue; }
      kValues.push(100 * (closes[i] - low14) / (high14 - low14));
    }
    const lastK = kValues[kValues.length - 1] ?? null;
    let lastD: number | null = null;
    if (kValues.length >= 3) {
      lastD = r2(mean(kValues.slice(-3)));
    }
    return { k: lastK != null ? r2(lastK) : null, d: lastD };
  } catch { return { k: null, d: null }; }
}

function calcWilliamsR(closes: number[]): number | null {
  try {
    if (closes.length < 14) return null;
    const slice = closes.slice(-14);
    const high14 = Math.max(...slice);
    const low14 = Math.min(...slice);
    if (high14 === low14) return -50;
    const current = closes[closes.length - 1];
    return r2((high14 - current) / (high14 - low14) * -100);
  } catch { return null; }
}

function calcMACD(closes: number[]): { macd: "bullish" | "bearish" | "neutral"; line: number | null; signal: number | null; histogram: number | null } {
  try {
    if (closes.length < 35) return { macd: "neutral", line: null, signal: null, histogram: null };
    const ema12 = calcEMA(closes, 12);
    const ema26 = calcEMA(closes, 26);
    const macdLine = ema12.map((v, i) => v - ema26[i]);
    const signalLine = calcEMA(macdLine, 9);
    const lastMacd = macdLine[macdLine.length - 1];
    const lastSignal = signalLine[signalLine.length - 1];
    const histogram = lastMacd - lastSignal;
    let verdict: "bullish" | "bearish" | "neutral" = "neutral";
    if (lastMacd > lastSignal && histogram > 0) verdict = "bullish";
    else if (lastMacd < lastSignal && histogram < 0) verdict = "bearish";
    return { macd: verdict, line: r2(lastMacd), signal: r2(lastSignal), histogram: r2(histogram) };
  } catch { return { macd: "neutral", line: null, signal: null, histogram: null }; }
}

function calcBollinger(closes: number[], current: number): { upper: number | null; middle: number | null; lower: number | null; position: number | null } {
  try {
    if (closes.length < 20) return { upper: null, middle: null, lower: null, position: null };
    const slice = closes.slice(-20);
    const middle = mean(slice);
    const sd = stdDevPop(slice);
    const upper = middle + 2 * sd;
    const lower = middle - 2 * sd;
    const position = upper === lower ? 50 : clamp((current - lower) / (upper - lower) * 100, 0, 100);
    return { upper: r2(upper), middle: r2(middle), lower: r2(lower), position: r2(position) };
  } catch { return { upper: null, middle: null, lower: null, position: null }; }
}

function calcATR14(closes: number[]): number | null {
  try {
    if (closes.length < 14) return null;
    const tr = closes.slice(1).map((c, i) => Math.abs(c - closes[i]));
    let atr = mean(tr.slice(0, 13));
    for (let i = 13; i < tr.length; i++) {
      atr = (atr * 13 + tr[i]) / 14;
    }
    return r2(atr);
  } catch { return null; }
}

function calcOBV(closes: number[], volumes: number[]): { obv: number | null; trend: "rising" | "falling" | "flat" | null } {
  try {
    if (closes.length < 2) return { obv: null, trend: null };
    const obvArr: number[] = [0];
    for (let i = 1; i < closes.length; i++) {
      const prev = obvArr[obvArr.length - 1];
      if (closes[i] > closes[i - 1]) obvArr.push(prev + (volumes[i] ?? 0));
      else if (closes[i] < closes[i - 1]) obvArr.push(prev - (volumes[i] ?? 0));
      else obvArr.push(prev);
    }
    const last = obvArr[obvArr.length - 1];
    let trend: "rising" | "falling" | "flat" = "flat";
    if (obvArr.length >= 20) {
      const recent = mean(obvArr.slice(-5));
      const older = mean(obvArr.slice(-20, -10));
      if (older !== 0) {
        const ratio = (recent - older) / Math.abs(older);
        if (ratio > 0.01) trend = "rising";
        else if (ratio < -0.01) trend = "falling";
      }
    }
    return { obv: Math.round(last), trend };
  } catch { return { obv: null, trend: null }; }
}

function calcROC20(closes: number[]): number | null {
  try {
    if (closes.length < 21) return null;
    const old = closes[closes.length - 21];
    if (old === 0) return null;
    return r2((closes[closes.length - 1] - old) / old * 100);
  } catch { return null; }
}

function calcMAvsPrices(closes: number[], current: number): { vsMA20: number | null; vsMA50: number | null; vsMA200: number | null; goldenCross: boolean | null } {
  try {
    const ma20 = calcSMALast(closes, 20);
    const ma50 = calcSMALast(closes, 50);
    const ma200 = calcSMALast(closes, 200);
    const vsMA20 = ma20 ? r2((current - ma20) / ma20 * 100) : null;
    const vsMA50 = ma50 ? r2((current - ma50) / ma50 * 100) : null;
    const vsMA200 = ma200 ? r2((current - ma200) / ma200 * 100) : null;
    const goldenCross = (ma50 != null && ma200 != null) ? ma50 > ma200 : null;
    return { vsMA20, vsMA50, vsMA200, goldenCross };
  } catch { return { vsMA20: null, vsMA50: null, vsMA200: null, goldenCross: null }; }
}

function calcIchimoku(closes: number[]): "above_cloud" | "below_cloud" | "in_cloud" | null {
  try {
    if (closes.length < 52) return null;
    const maxN = (n: number) => Math.max(...closes.slice(-n));
    const minN = (n: number) => Math.min(...closes.slice(-n));
    const tenkan = (maxN(9) + minN(9)) / 2;
    const kijun  = (maxN(26) + minN(26)) / 2;
    const senkouA = (tenkan + kijun) / 2;
    const senkouB = (maxN(52) + minN(52)) / 2;
    const cloudTop = Math.max(senkouA, senkouB);
    const cloudBot = Math.min(senkouA, senkouB);
    const current = closes[closes.length - 1];
    if (current > cloudTop) return "above_cloud";
    if (current < cloudBot) return "below_cloud";
    return "in_cloud";
  } catch { return null; }
}

function calcFibLevel(current: number, high52: number | null, low52: number | null): string | null {
  try {
    if (high52 == null || low52 == null || high52 === low52) return null;
    if (current > high52) return "Above 52-week high";
    if (current < low52) return "Below 52-week low";
    const range = high52 - low52;
    const levels: [string, number][] = [
      ["0%",    high52],
      ["23.6%", high52 - 0.236 * range],
      ["38.2%", high52 - 0.382 * range],
      ["50%",   high52 - 0.500 * range],
      ["61.8%", high52 - 0.618 * range],
      ["78.6%", high52 - 0.786 * range],
      ["100%",  low52],
    ];
    for (let i = 0; i < levels.length - 1; i++) {
      const [nameA, priceA] = levels[i];
      const [nameB, priceB] = levels[i + 1];
      if (current <= priceA && current >= priceB) {
        return `Between ${nameB} and ${nameA} retracement`;
      }
    }
    return null;
  } catch { return null; }
}

function calcFiftyTwoWeekPosition(current: number, high52: number | null, low52: number | null): number | null {
  if (high52 == null || low52 == null || high52 === low52) return null;
  return r2(clamp((current - low52) / (high52 - low52) * 100, 0, 100));
}

function calcGraham(eps: number | null, bookValue: number | null, current: number): { grahamNumber: number | null; grahamVsCurrent: number | null } {
  try {
    if (eps == null || bookValue == null || eps <= 0 || bookValue <= 0) return { grahamNumber: null, grahamVsCurrent: null };
    const gn = Math.sqrt(22.5 * eps * bookValue);
    const vsC = r2((gn - current) / current * 100);
    return { grahamNumber: r2(gn), grahamVsCurrent: vsC };
  } catch { return { grahamNumber: null, grahamVsCurrent: null }; }
}

// ─── Risk Statistics ───────────────────────────────────────────────────────

function calcLogReturns(closes: number[]): number[] {
  const r: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    if (closes[i] > 0 && closes[i - 1] > 0) r.push(Math.log(closes[i] / closes[i - 1]));
  }
  return r;
}

function calcHV30(closes: number[]): number | null {
  try {
    if (closes.length < 31) return null;
    const lr = calcLogReturns(closes.slice(-31));
    if (lr.length < 10) return null;
    return r2(stdDevPop(lr) * Math.sqrt(252) * 100);
  } catch { return null; }
}

function calcSharpe(closes: number[]): number | null {
  try {
    if (closes.length < 252) return null;
    const lr = calcLogReturns(closes.slice(-253));
    if (lr.length < 100) return null;
    const dailyRF = 0.045 / 252;
    const excess = lr.map(r => r - dailyRF);
    const sd = stdDevSample(excess);
    if (sd === 0) return null;
    return r2(mean(excess) / sd * Math.sqrt(252));
  } catch { return null; }
}

function calcSortino(closes: number[]): number | null {
  try {
    if (closes.length < 252) return null;
    const lr = calcLogReturns(closes.slice(-253));
    if (lr.length < 100) return null;
    const dailyRF = 0.045 / 252;
    const excess = lr.map(r => r - dailyRF);
    const downside = excess.filter(r => r < 0);
    if (downside.length < 5) return null;
    const dd = stdDevSample(downside) * Math.sqrt(252);
    if (dd === 0) return null;
    return r2(mean(excess) * Math.sqrt(252) / dd);
  } catch { return null; }
}

function calcMaxDrawdown(closes: number[]): number | null {
  try {
    if (closes.length < 5) return null;
    let peak = closes[0];
    let maxDD = 0;
    for (const c of closes) {
      if (c > peak) peak = c;
      const dd = peak > 0 ? (peak - c) / peak : 0;
      if (dd > maxDD) maxDD = dd;
    }
    return r2(maxDD * 100);
  } catch { return null; }
}

function calcVaR95(closes: number[]): number | null {
  try {
    if (closes.length < 252) return null;
    const lr = calcLogReturns(closes.slice(-253)).sort((a, b) => a - b);
    if (lr.length < 50) return null;
    const idx = Math.floor(0.05 * lr.length);
    return r2(Math.abs(lr[idx]) * 100);
  } catch { return null; }
}

function calcCalmar(closes: number[], maxDD: number | null): number | null {
  try {
    if (closes.length < 50 || maxDD == null || maxDD === 0) return null;
    const n = closes.length;
    const annReturn = Math.pow(closes[n - 1] / closes[0], 252 / n) - 1;
    return r2(annReturn / (maxDD / 100));
  } catch { return null; }
}

function calcSkewness(returns: number[]): number | null {
  try {
    const n = returns.length;
    if (n < 4) return null;
    const m = mean(returns);
    const s = stdDevSample(returns);
    if (s === 0) return null;
    const sum = returns.reduce((a, r) => a + ((r - m) / s) ** 3, 0);
    return r2(n / ((n - 1) * (n - 2)) * sum);
  } catch { return null; }
}

function calcKurtosis(returns: number[]): number | null {
  try {
    const n = returns.length;
    if (n < 5) return null;
    const m = mean(returns);
    const s = stdDevSample(returns);
    if (s === 0) return null;
    const sum = returns.reduce((a, r) => a + ((r - m) / s) ** 4, 0);
    const kurt = (n * (n + 1)) / ((n - 1) * (n - 2) * (n - 3)) * sum - 3 * (n - 1) ** 2 / ((n - 2) * (n - 3));
    return r2(kurt);
  } catch { return null; }
}

// ─── Price Targets ─────────────────────────────────────────────────────────

interface Horizon { oneMonth: number | null; sixMonths: number | null; oneYear: number | null }
interface MCResult extends Horizon { oneMonthLow: number | null; oneMonthHigh: number | null; oneYearLow: number | null; oneYearHigh: number | null }

function monteCarlo(closes: number[]): MCResult | null {
  try {
    if (closes.length < 30) return null;
    const lr = calcLogReturns(closes.slice(-253));
    if (lr.length < 20) return null;
    const drift = mean(lr);
    const vol = stdDevPop(lr);
    const current = closes[closes.length - 1];
    const PATHS = 5000;
    const horizons = [21, 126, 252];
    const finals: Record<number, number[]> = { 21: [], 126: [], 252: [] };

    for (let p = 0; p < PATHS; p++) {
      for (const days of horizons) {
        let price = current;
        for (let d = 0; d < days; d++) {
          const u1 = Math.random() || 1e-10;
          const u2 = Math.random();
          const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
          price = price * Math.exp((drift - 0.5 * vol * vol) + vol * z);
        }
        finals[days].push(price);
      }
    }

    const pick = (arr: number[], pct: number) => {
      arr.sort((a, b) => a - b);
      return r2(arr[Math.floor(pct * arr.length)]);
    };

    return {
      oneMonth:     pick(finals[21], 0.50),
      sixMonths:    pick(finals[126], 0.50),
      oneYear:      pick(finals[252], 0.50),
      oneMonthLow:  pick(finals[21], 0.10),
      oneMonthHigh: pick(finals[21], 0.90),
      oneYearLow:   pick(finals[252], 0.10),
      oneYearHigh:  pick(finals[252], 0.90),
    };
  } catch { return null; }
}

function analystConsensus(current: number, target: number | null): Horizon | null {
  if (target == null) return null;
  return {
    oneMonth:  r2(current + (target - current) * 0.15),
    sixMonths: r2(current + (target - current) * 0.65),
    oneYear:   r2(target),
  };
}

function meanReversionPE(current: number, pe: number | null, eps: number | null): Horizon | null {
  if (pe == null || eps == null || eps <= 0) return null;
  const fairValue = eps * 18;
  const gap = fairValue - current;
  return {
    oneMonth:  r2(current + gap * 0.03),
    sixMonths: r2(current + gap * 0.17),
    oneYear:   r2(current + gap * 0.30),
  };
}

function momentumExtrapolation(closes: number[]): Horizon | null {
  try {
    if (closes.length < 64) return null;
    const current = closes[closes.length - 1];
    const has6m = closes.length >= 127;
    const ret3m = (current - closes[closes.length - 64]) / closes[closes.length - 64];
    const ret6m = has6m ? (current - closes[closes.length - 127]) / closes[closes.length - 127] : null;
    const baseRet = ret6m ?? ret3m;
    return {
      oneMonth:  r2(current * (1 + ret3m / 3)),
      sixMonths: r2(current * (1 + baseRet * 0.70)),
      oneYear:   r2(current * (1 + baseRet * 0.35)),
    };
  } catch { return null; }
}

function combineTargets(
  mc: MCResult | null,
  ac: Horizon | null,
  mr: Horizon | null,
  mom: Horizon | null
): { targets: MCResult; methodsUsed: string[] } {
  const methodsUsed: string[] = [];
  type H = Horizon & Partial<MCResult>;

  const entries: Array<[string, H | null, number]> = [
    ["Monte Carlo GBM", mc, 0.30],
    ["Analyst Consensus", ac, 0.25],
    ["Mean Reversion P/E", mr, 0.25],
    ["Momentum Extrapolation", mom, 0.20],
  ];

  const available = entries.filter(([, h]) => h != null) as Array<[string, H, number]>;
  if (available.length === 0) {
    return {
      targets: { oneMonth: null, sixMonths: null, oneYear: null, oneMonthLow: null, oneMonthHigh: null, oneYearLow: null, oneYearHigh: null },
      methodsUsed: [],
    };
  }

  const totalWeight = available.reduce((s, [, , w]) => s + w, 0);
  for (const [name] of available) methodsUsed.push(name);

  const wAvg = (key: keyof H): number | null => {
    let sum = 0;
    let w = 0;
    for (const [, h, weight] of available) {
      const v = h[key];
      if (v != null && typeof v === "number") { sum += v * weight; w += weight; }
    }
    return w > 0 ? r2(sum / w) : null;
  };

  // For range values, fall back to MC only or ±% from median
  const oneMonth = wAvg("oneMonth");
  const sixMonths = wAvg("sixMonths");
  const oneYear = wAvg("oneYear");

  const oneMonthLow  = mc?.oneMonthLow  ?? (oneMonth != null ? r2(oneMonth  * 0.95) : null);
  const oneMonthHigh = mc?.oneMonthHigh ?? (oneMonth != null ? r2(oneMonth  * 1.05) : null);
  const oneYearLow   = mc?.oneYearLow   ?? (oneYear  != null ? r2(oneYear   * 0.85) : null);
  const oneYearHigh  = mc?.oneYearHigh  ?? (oneYear  != null ? r2(oneYear   * 1.15) : null);

  void totalWeight;

  return {
    targets: { oneMonth, sixMonths, oneYear, oneMonthLow, oneMonthHigh, oneYearLow, oneYearHigh },
    methodsUsed,
  };
}

// ─── Scoring ───────────────────────────────────────────────────────────────

function linearScore(v: number, breakpoints: [number, number][]): number {
  for (let i = 0; i < breakpoints.length - 1; i++) {
    const [x0, y0] = breakpoints[i];
    const [x1, y1] = breakpoints[i + 1];
    if (v <= x0 && v >= x1) {
      const t = (v - x0) / (x1 - x0);
      return clamp(y0 + t * (y1 - y0), 0, 100);
    }
  }
  if (v >= breakpoints[0][0]) return breakpoints[0][1];
  return breakpoints[breakpoints.length - 1][1];
}

function scoreMomentum(s: BottomLineResult["signals"]): number {
  const rsiRaw = s.rsi14 ?? 55;
  const rsiScore = clamp(100 - Math.abs(rsiRaw - 55) * 2.2, 0, 100);

  const kRaw = s.stochasticK ?? 50;
  const stochScore = kRaw <= 80 ? kRaw : kRaw <= 85 ? 75 : Math.max(75 - (kRaw - 85) * 2, 40);

  const macdScore = s.macd === "bullish" ? 80 : s.macd === "bearish" ? 20 : 50;
  const bollScore = clamp(s.bollingerPosition ?? 50, 0, 75);
  const vsMA50Score  = clamp(50 + (s.vsMA50  ?? 0) * 2, 0, 100);
  const vsMA200Score = clamp(50 + (s.vsMA200 ?? 0) * 1.5, 0, 100);
  const roc20Score   = clamp(50 + (s.roc20   ?? 0) * 2, 0, 100);
  const ichScore = s.ichimokuSignal === "above_cloud" ? 80 : s.ichimokuSignal === "below_cloud" ? 20 : 50;

  const weighted =
    rsiScore   * 0.20 +
    stochScore * 0.10 +
    macdScore  * 0.15 +
    bollScore  * 0.08 +
    vsMA50Score  * 0.15 +
    vsMA200Score * 0.12 +
    roc20Score   * 0.10 +
    ichScore     * 0.10;

  const bonus = s.goldenCross === true ? 5 : s.goldenCross === false ? -5 : 0;
  return clamp(weighted + bonus, 0, 100);
}

function scoreValuation(s: BottomLineResult["signals"]): number {
  const pe = s.peRatio;
  let peScore: number;
  if (pe == null) peScore = 50;
  else if (pe < 10) peScore = 100;
  else if (pe < 15) peScore = linearScore(pe, [[10, 100], [15, 80]]);
  else if (pe < 20) peScore = linearScore(pe, [[15, 80], [20, 60]]);
  else if (pe < 30) peScore = linearScore(pe, [[20, 60], [30, 40]]);
  else if (pe < 50) peScore = linearScore(pe, [[30, 40], [50, 10]]);
  else peScore = 0;

  const fwdBonus = (s.forwardPE != null && pe != null && s.forwardPE < pe) ? 8 : 0;

  const peg = s.pegRatio;
  let pegScore: number;
  if (peg == null) pegScore = 50;
  else if (peg < 0.5) pegScore = 100;
  else if (peg < 1)   pegScore = linearScore(peg, [[0.5, 100], [1, 80]]);
  else if (peg < 1.5) pegScore = linearScore(peg, [[1, 80], [1.5, 55]]);
  else if (peg < 2)   pegScore = linearScore(peg, [[1.5, 55], [2, 30]]);
  else pegScore = 0;

  const pb = s.pbRatio;
  const pbScore = pb == null ? 50 : pb < 1 ? 100 : pb < 2 ? 80 : pb < 3 ? 60 : pb < 5 ? 35 : 10;

  const evebitda = s.evToEbitda;
  const evScore = evebitda == null ? 50 : evebitda < 6 ? 100 : evebitda < 10 ? 85 : evebitda < 15 ? 65 : evebitda < 20 ? 45 : evebitda < 30 ? 25 : 5;

  const gvc = s.grahamVsCurrent;
  const grahamScore = gvc == null ? 50 : gvc > 0 ? 85 : gvc > -10 ? 65 : gvc > -20 ? 45 : 20;

  const ey = s.earningsYield;
  const eyScore = ey == null ? 50 : ey > 8 ? 100 : ey > 6 ? 80 : ey > 4.5 ? 60 : ey > 3 ? 35 : 15;

  const wkPos = s.fiftyTwoWeekPosition;
  const wkScore = wkPos == null ? 50 : 100 - wkPos;

  const base =
    peScore   * 0.25 +
    pegScore  * 0.15 +
    pbScore   * 0.10 +
    evScore   * 0.15 +
    grahamScore * 0.15 +
    eyScore   * 0.10 +
    wkScore   * 0.10;

  return clamp(base + fwdBonus, 0, 100);
}

function scoreRisk(s: BottomLineResult["signals"]): number {
  const hv = s.historicalVolatility30d;
  let volScore: number;
  if (hv == null) volScore = 50;
  else if (hv < 12) volScore = 100;
  else if (hv < 20) volScore = linearScore(hv, [[12, 100], [20, 80]]);
  else if (hv < 35) volScore = linearScore(hv, [[20, 80], [35, 55]]);
  else if (hv < 50) volScore = linearScore(hv, [[35, 55], [50, 30]]);
  else if (hv < 80) volScore = linearScore(hv, [[50, 30], [80, 10]]);
  else volScore = 0;

  const beta = s.beta;
  let betaScore: number;
  if (beta == null) betaScore = 50;
  else if (beta < 0.3) betaScore = 100;
  else if (beta < 0.7) betaScore = linearScore(beta, [[0.3, 100], [0.7, 85]]);
  else if (beta < 1.0) betaScore = linearScore(beta, [[0.7, 85], [1.0, 70]]);
  else if (beta < 1.5) betaScore = linearScore(beta, [[1.0, 70], [1.5, 50]]);
  else if (beta < 2.0) betaScore = linearScore(beta, [[1.5, 50], [2.0, 25]]);
  else if (beta < 2.5) betaScore = linearScore(beta, [[2.0, 25], [2.5, 5]]);
  else betaScore = 0;

  const mdd = s.maxDrawdown;
  let mddScore: number;
  if (mdd == null) mddScore = 50;
  else if (mdd < 5)   mddScore = 100;
  else if (mdd < 15)  mddScore = linearScore(mdd, [[5, 100], [15, 75]]);
  else if (mdd < 25)  mddScore = linearScore(mdd, [[15, 75], [25, 50]]);
  else if (mdd < 40)  mddScore = linearScore(mdd, [[25, 50], [40, 25]]);
  else if (mdd < 60)  mddScore = linearScore(mdd, [[40, 25], [60, 5]]);
  else mddScore = 0;

  const vr = s.valueAtRisk95;
  let varScore: number;
  if (vr == null) varScore = 50;
  else if (vr < 1) varScore = 100;
  else if (vr < 2) varScore = linearScore(vr, [[1, 100], [2, 70]]);
  else if (vr < 3) varScore = linearScore(vr, [[2, 70], [3, 45]]);
  else if (vr < 5) varScore = linearScore(vr, [[3, 45], [5, 15]]);
  else varScore = 0;

  const sh = s.sharpeRatio;
  let sharpeScore: number;
  if (sh == null) sharpeScore = 50;
  else if (sh > 2)   sharpeScore = 100;
  else if (sh > 1)   sharpeScore = linearScore(sh, [[2, 100], [1, 75]]);
  else if (sh > 0.5) sharpeScore = linearScore(sh, [[1, 75], [0.5, 50]]);
  else if (sh > 0)   sharpeScore = linearScore(sh, [[0.5, 50], [0, 30]]);
  else sharpeScore = 10;

  const so = s.sortinoRatio;
  let sortinoScore: number;
  if (so == null) sortinoScore = 50;
  else if (so > 2.5)  sortinoScore = 100;
  else if (so > 1.5)  sortinoScore = 80;
  else if (so > 0.5)  sortinoScore = 55;
  else if (so > 0)    sortinoScore = 30;
  else sortinoScore = 10;

  const base =
    volScore    * 0.22 +
    betaScore   * 0.18 +
    mddScore    * 0.20 +
    varScore    * 0.18 +
    sharpeScore * 0.12 +
    sortinoScore * 0.10;

  const skew = s.returnSkewness;
  let skewAdj = 0;
  if (skew != null) {
    if (skew > 0.5) skewAdj = 5;
    else if (skew < -2) skewAdj = -15;
    else if (skew < -1) skewAdj = -8;
  }

  const kurt = s.returnKurtosis;
  let kurtAdj = 0;
  if (kurt != null) {
    if (kurt > 5) kurtAdj = -8;
    else if (kurt > 3) kurtAdj = -4;
    else if (kurt < 0) kurtAdj = 3;
  }

  return clamp(base + skewAdj + kurtAdj, 0, 100);
}

function scoreQuality(s: BottomLineResult["signals"]): number {
  const rg = s.revenueGrowth != null ? s.revenueGrowth * 100 : null;
  const rgScore = rg == null ? 50 : rg > 30 ? 100 : rg > 15 ? 80 : rg > 5 ? 60 : rg > 0 ? 40 : 15;

  const pm = s.profitMargin != null ? s.profitMargin * 100 : null;
  const pmScore = pm == null ? 50 : pm > 25 ? 100 : pm > 15 ? 80 : pm > 8 ? 60 : pm > 2 ? 40 : pm > 0 ? 15 : 0;

  const roe = s.returnOnEquity != null ? s.returnOnEquity * 100 : null;
  const roeScore = roe == null ? 50 : roe > 25 ? 100 : roe > 15 ? 80 : roe > 8 ? 60 : roe > 2 ? 40 : roe > 0 ? 20 : 5;

  const de = s.debtToEquity;
  const deScore = de == null ? 50 : de < 0.2 ? 100 : de < 0.5 ? 85 : de < 1.0 ? 65 : de < 2.0 ? 40 : 10;

  const cr = s.currentRatio;
  const crScore = cr == null ? 50 : cr > 2.5 ? 100 : cr > 2 ? 85 : cr > 1.5 ? 70 : cr > 1 ? 50 : cr > 0.5 ? 25 : 5;

  return clamp(
    rgScore * 0.30 + pmScore * 0.25 + roeScore * 0.20 + deScore * 0.15 + crScore * 0.10,
    0, 100
  );
}

// ─── One-liner & Target Rationale ──────────────────────────────────────────

function buildOneLiner(r: BottomLineResult): string {
  const m = r.scores.momentum, v = r.scores.valuation,
        ri = r.scores.risk,    q = r.scores.quality;
  const mStr  = m  > 65 ? "strong momentum"       : m  < 40 ? "weak momentum"       : "neutral momentum";
  const vStr  = v  > 65 ? "attractive valuation"  : v  < 40 ? "stretched valuation" : "fair valuation";
  const rStr  = ri > 65 ? "low risk profile"      : ri < 40 ? "elevated risk"       : "moderate risk";
  const qStr  = q  > 65 ? "solid fundamentals"    : q  < 40 ? "weak fundamentals"   : "average fundamentals";
  const rsiNote = r.signals.rsi14 != null
    ? r.signals.rsi14 > 70 ? " RSI is overbought."
    : r.signals.rsi14 < 30 ? " RSI is oversold — could be a buying opportunity." : "" : "";
  const volNote = r.signals.historicalVolatility30d != null && r.signals.historicalVolatility30d > 50
    ? " High volatility means large price swings are likely." : "";
  return `This stock shows ${mStr}, ${vStr}, ${rStr}, and ${qStr}.${rsiNote}${volNote}`;
}

function buildTargetRationale(r: BottomLineResult, currentPrice: number): string {
  const used = r.methodsUsed.join(", ");
  const oneY = r.priceTargets.oneYear;
  if (!oneY) return "Insufficient data to generate reliable price targets.";
  const pct = ((oneY - currentPrice) / currentPrice * 100).toFixed(1);
  const dir = oneY > currentPrice ? "upside" : "downside";
  return `The 1-year target of $${oneY.toFixed(2)} implies ${Math.abs(Number(pct))}% ${dir} from the current price, derived from ${used}.`;
}

// ─── Main Export ───────────────────────────────────────────────────────────

export function computeBottomLine(
  quote: StockQuoteData,
  history1y: StockHistoryResult
): BottomLineResult {
  try {
    const closes = history1y.prices.map(p => p.close).filter(v => v > 0);
    const volumes = history1y.prices.map(p => p.volume);
    const current = quote.currentPrice;

    // ── Technical Signals ──
    const rsi14 = calcRSI14(closes);
    const { k: stochasticK, d: stochasticD } = calcStochastic(closes);
    const williamsR = calcWilliamsR(closes);
    const { macd, line: macdLine, signal: macdSignalLine, histogram: macdHistogram } = calcMACD(closes);
    const { upper: bollingerUpper, middle: bollingerMiddle, lower: bollingerLower, position: bollingerPosition } = calcBollinger(closes, current);
    const atr14 = calcATR14(closes);
    const { obv, trend: obvTrend } = calcOBV(closes, volumes);
    const roc20 = calcROC20(closes);
    const { vsMA20, vsMA50, vsMA200, goldenCross } = calcMAvsPrices(closes, current);
    const ichimokuSignal = calcIchimoku(closes);
    const fibLevel = calcFibLevel(current, quote.week52High, quote.week52Low);
    const fiftyTwoWeekPosition = calcFiftyTwoWeekPosition(current, quote.week52High, quote.week52Low);

    // ── Valuation ──
    const peRatio = quote.pe;
    const forwardPE = quote.forwardPE;
    const earningsYield = peRatio != null && peRatio > 0 ? r2((1 / peRatio) * 100) : null;
    const egPct = quote.earningsGrowth != null ? quote.earningsGrowth * 100 : null;
    const pegRatio = (peRatio != null && egPct != null && egPct > 0) ? r2(peRatio / egPct) : null;
    const pbRatio = quote.pb;
    const psRatio = quote.priceToSales;
    const evToEbitda = quote.evToEbitda;
    const dividendYield = quote.dividendYield != null ? r2(quote.dividendYield * 100) : null;
    const { grahamNumber, grahamVsCurrent } = calcGraham(quote.eps, quote.bookValuePerShare, current);

    // ── Risk ──
    const beta = quote.beta;
    const historicalVolatility30d = calcHV30(closes);
    const sharpeRatio = calcSharpe(closes);
    const sortinoRatio = calcSortino(closes);
    const maxDrawdown = calcMaxDrawdown(closes);
    const valueAtRisk95 = calcVaR95(closes);
    const calmarRatio = calcCalmar(closes, maxDrawdown);
    const logRets = calcLogReturns(closes.slice(-253));
    const returnSkewness = calcSkewness(logRets);
    const returnKurtosis = calcKurtosis(logRets);

    // ── Quality ──
    const revenueGrowth = quote.revenueGrowth;
    const profitMargin = quote.profitMargin;
    const returnOnEquity = quote.returnOnEquity;
    const debtToEquity = quote.debtToEquity;
    const currentRatio = quote.currentRatio;

    const signals: BottomLineResult["signals"] = {
      rsi14, stochasticK, stochasticD, williamsR,
      macd, macdLine, macdSignalLine, macdHistogram,
      bollingerUpper, bollingerMiddle, bollingerLower, bollingerPosition,
      atr14, obv, obvTrend, roc20,
      vsMA20, vsMA50, vsMA200, goldenCross, ichimokuSignal, fibLevel,
      peRatio, forwardPE, pegRatio, pbRatio, psRatio, evToEbitda,
      earningsYield, dividendYield, grahamNumber, grahamVsCurrent,
      beta, historicalVolatility30d, sharpeRatio, sortinoRatio,
      maxDrawdown, valueAtRisk95, calmarRatio, returnSkewness, returnKurtosis,
      fiftyTwoWeekPosition,
      revenueGrowth, profitMargin, returnOnEquity, debtToEquity, currentRatio,
    };

    // ── Scores ──
    const momentum  = Math.round(scoreMomentum(signals));
    const valuation = Math.round(scoreValuation(signals));
    const risk      = Math.round(scoreRisk(signals));
    const quality   = Math.round(scoreQuality(signals));
    const compositeScore = Math.round(momentum * 0.28 + valuation * 0.28 + risk * 0.22 + quality * 0.22);

    // ── Verdict ──
    let verdict: BottomLineResult["verdict"];
    let verdictColour: BottomLineResult["verdictColour"];
    if (compositeScore >= 72) { verdict = "Strong Buy";  verdictColour = "green"; }
    else if (compositeScore >= 58) { verdict = "Buy";    verdictColour = "green"; }
    else if (compositeScore >= 43) { verdict = "Hold";   verdictColour = "amber"; }
    else if (compositeScore >= 29) { verdict = "Sell";   verdictColour = "red";   }
    else { verdict = "Strong Sell"; verdictColour = "red"; }

    const healthStatus: BottomLineResult["healthStatus"] =
      compositeScore >= 70 ? "Great" :
      compositeScore >= 55 ? "Good"  :
      compositeScore >= 42 ? "Okay"  :
      compositeScore >= 28 ? "Weak"  : "Poor";

    // ── Price Targets ──
    const mc  = monteCarlo(closes);
    const ac  = analystConsensus(current, quote.targetPrice);
    const mr  = meanReversionPE(current, peRatio, quote.eps);
    const mom = momentumExtrapolation(closes);
    const { targets, methodsUsed } = combineTargets(mc, ac, mr, mom);

    // Build partial result to generate one-liner
    const partial: BottomLineResult = {
      verdict, verdictColour, compositeScore,
      oneLiner: "",
      healthStatus,
      priceTargets: targets,
      targetRationale: "",
      scores: { momentum, valuation, risk, quality },
      signals,
      methodsUsed,
      disclaimer: "Price targets combine Monte Carlo simulation, analyst consensus, mean-reversion, and momentum extrapolation. All signals are calculated from historical price and fundamental data. This is not financial advice.",
    };

    partial.oneLiner = buildOneLiner(partial);
    partial.targetRationale = buildTargetRationale(partial, current);

    return partial;
  } catch (err) {
    // Fallback: return minimal safe result
    return {
      verdict: "Hold",
      verdictColour: "amber",
      compositeScore: 50,
      oneLiner: "Insufficient data to compute full analysis.",
      healthStatus: "Okay",
      priceTargets: { oneMonth: null, sixMonths: null, oneYear: null, oneMonthLow: null, oneMonthHigh: null, oneYearLow: null, oneYearHigh: null },
      targetRationale: "Insufficient data to generate reliable price targets.",
      scores: { momentum: 50, valuation: 50, risk: 50, quality: 50 },
      signals: {
        rsi14: null, stochasticK: null, stochasticD: null, williamsR: null,
        macd: "neutral", macdLine: null, macdSignalLine: null, macdHistogram: null,
        bollingerUpper: null, bollingerMiddle: null, bollingerLower: null, bollingerPosition: null,
        atr14: null, obv: null, obvTrend: null, roc20: null,
        vsMA20: null, vsMA50: null, vsMA200: null, goldenCross: null,
        ichimokuSignal: null, fibLevel: null,
        peRatio: null, forwardPE: null, pegRatio: null, pbRatio: null, psRatio: null,
        evToEbitda: null, earningsYield: null, dividendYield: null, grahamNumber: null, grahamVsCurrent: null,
        beta: null, historicalVolatility30d: null, sharpeRatio: null, sortinoRatio: null,
        maxDrawdown: null, valueAtRisk95: null, calmarRatio: null, returnSkewness: null, returnKurtosis: null,
        fiftyTwoWeekPosition: null,
        revenueGrowth: null, profitMargin: null, returnOnEquity: null, debtToEquity: null, currentRatio: null,
      },
      methodsUsed: [],
      disclaimer: "Price targets combine Monte Carlo simulation, analyst consensus, mean-reversion, and momentum extrapolation. This is not financial advice.",
    };
  }
}

// ─── Timing Score ────────────────────────────────────────────────────────────

export interface TimingScore {
  score: number;
  label: "Buy Now" | "Leaning Yes" | "Wait" | "Leaning No" | "Avoid";
  colour: "green" | "amber" | "red";
  summary: string;
  signals: {
    rsiSignal:          "oversold" | "neutral" | "overbought" | null;
    bollingerSignal:    "near_low" | "middle" | "near_high" | null;
    macdSignal:         "bullish_crossover" | "bullish" | "bearish" | "bearish_crossover" | null;
    momentumSignal:     "accelerating" | "stable" | "decelerating" | null;
    fiftyTwoWeekSignal: "near_low" | "middle" | "near_high" | null;
    obvSignal:          "confirming" | "diverging" | null;
    atrSignal:          "low_volatility" | "normal" | "high_volatility" | null;
    williamsRSignal:    "oversold" | "neutral" | "overbought" | null;
  };
  bestCaseEntry: string;
  riskToEntry: string;
}

function buildTimingSummary(signals: TimingScore["signals"], score: number): string {
  const parts: string[] = [];
  if (signals.rsiSignal === "oversold") parts.push("RSI is oversold");
  if (signals.rsiSignal === "overbought") parts.push("RSI is overbought");
  if (signals.bollingerSignal === "near_low") parts.push("price is near Bollinger support");
  if (signals.bollingerSignal === "near_high") parts.push("price is stretched above Bollinger bands");
  if (signals.macdSignal === "bullish_crossover") parts.push("MACD just turned bullish");
  if (signals.macdSignal === "bearish_crossover") parts.push("MACD just turned bearish");
  if (signals.fiftyTwoWeekSignal === "near_low") parts.push("trading near its 52-week low");
  if (signals.fiftyTwoWeekSignal === "near_high") parts.push("trading near its 52-week high");
  if (signals.momentumSignal === "accelerating") parts.push("momentum is building");
  if (signals.momentumSignal === "decelerating") parts.push("momentum is fading");
  if (signals.obvSignal === "diverging") parts.push("volume is not confirming the move");

  if (parts.length === 0) return score >= 60
    ? "Conditions are broadly neutral but leaning positive for entry."
    : "Conditions are broadly neutral — no strong timing signal either way.";

  const positive = parts.filter(p =>
    !p.includes("overbought") && !p.includes("bearish") &&
    !p.includes("near_high") && !p.includes("fading") && !p.includes("not confirming"));
  const negative = parts.filter(p => !positive.includes(p));

  if (positive.length > 0 && negative.length === 0) return `Timing looks favourable — ${positive.join(", ")}.`;
  if (negative.length > 0 && positive.length === 0) return `Timing looks unfavourable — ${negative.join(", ")}.`;
  return `Mixed signals — ${positive.join(", ")}, but ${negative.join(", ")}.`;
}

export function computeTimingScore(bl: BottomLineResult): TimingScore {
  const s = bl.signals;

  // RSI (20%)
  let rsiSignal: TimingScore["signals"]["rsiSignal"] = null;
  let rsiScore = 50;
  if (s.rsi14 != null) {
    if (s.rsi14 < 30)       { rsiSignal = "oversold";   rsiScore = 90; }
    else if (s.rsi14 < 45)  { rsiSignal = "neutral";    rsiScore = 70; }
    else if (s.rsi14 < 55)  { rsiSignal = "neutral";    rsiScore = 55; }
    else if (s.rsi14 < 65)  { rsiSignal = "neutral";    rsiScore = 45; }
    else if (s.rsi14 <= 70) { rsiSignal = "neutral";    rsiScore = 30; }
    else                    { rsiSignal = "overbought"; rsiScore = 10; }
  }

  // Bollinger (15%)
  let bollingerSignal: TimingScore["signals"]["bollingerSignal"] = null;
  let bollingerScore = 50;
  if (s.bollingerPosition != null) {
    if (s.bollingerPosition < 20)      { bollingerSignal = "near_low";  bollingerScore = 90; }
    else if (s.bollingerPosition < 40) { bollingerSignal = "middle";    bollingerScore = 65; }
    else if (s.bollingerPosition < 60) { bollingerSignal = "middle";    bollingerScore = 50; }
    else if (s.bollingerPosition < 80) { bollingerSignal = "middle";    bollingerScore = 35; }
    else                               { bollingerSignal = "near_high"; bollingerScore = 10; }
  }

  // MACD (20%)
  let macdSignal: TimingScore["signals"]["macdSignal"] = null;
  let macdScore = 50;
  if (s.macdLine != null && s.macdSignalLine != null && s.macdHistogram != null) {
    const above = s.macdLine > s.macdSignalLine;
    const histPos = s.macdHistogram > 0;
    const isCross = s.macdLine !== 0 && Math.abs(s.macdHistogram) < Math.abs(s.macdLine) * 0.1;
    if (above && histPos && isCross)    { macdSignal = "bullish_crossover"; macdScore = 95; }
    else if (above && histPos)          { macdSignal = "bullish";           macdScore = 70; }
    else if (!above && !histPos && isCross) { macdSignal = "bearish_crossover"; macdScore = 5; }
    else if (!above)                    { macdSignal = "bearish";           macdScore = 25; }
    else                                { macdSignal = "bullish";           macdScore = 55; }
  } else if (s.macd === "bullish") { macdSignal = "bullish"; macdScore = 70; }
  else if (s.macd === "bearish")   { macdSignal = "bearish"; macdScore = 25; }

  // Momentum (15%)
  let momentumSignal: TimingScore["signals"]["momentumSignal"] = null;
  let momentumScore = 50;
  if (s.roc20 != null) {
    if (s.roc20 > 5)        { momentumSignal = "accelerating"; momentumScore = 75; }
    else if (s.roc20 >= 0)  { momentumSignal = "stable";       momentumScore = 55; }
    else if (s.roc20 >= -5) { momentumSignal = "decelerating"; momentumScore = 35; }
    else                    { momentumSignal = "decelerating"; momentumScore = 20; }
  }

  // 52-Week Position (15%)
  let fiftyTwoWeekSignal: TimingScore["signals"]["fiftyTwoWeekSignal"] = null;
  let fiftyTwoWeekScore = 50;
  if (s.fiftyTwoWeekPosition != null) {
    if (s.fiftyTwoWeekPosition < 25)      { fiftyTwoWeekSignal = "near_low";  fiftyTwoWeekScore = 85; }
    else if (s.fiftyTwoWeekPosition < 60) { fiftyTwoWeekSignal = "middle";    fiftyTwoWeekScore = 55; }
    else if (s.fiftyTwoWeekPosition < 80) { fiftyTwoWeekSignal = "middle";    fiftyTwoWeekScore = 40; }
    else                                  { fiftyTwoWeekSignal = "near_high"; fiftyTwoWeekScore = 15; }
  }

  // OBV (10%)
  let obvSignal: TimingScore["signals"]["obvSignal"] = null;
  let obvScore = 50;
  if (s.obvTrend != null) {
    if (s.obvTrend === "rising")      { obvSignal = "confirming"; obvScore = 70; }
    else if (s.obvTrend === "falling") { obvSignal = "diverging";  obvScore = 30; }
    else                              { obvSignal = "confirming"; obvScore = 50; }
  }

  // ATR / Volatility (5%)
  let atrSignal: TimingScore["signals"]["atrSignal"] = null;
  let atrScore = 50;
  if (s.historicalVolatility30d != null) {
    const hv = s.historicalVolatility30d * 100;
    if (hv < 20)      { atrSignal = "low_volatility";  atrScore = 65; }
    else if (hv <= 40) { atrSignal = "normal";          atrScore = 50; }
    else              { atrSignal = "high_volatility"; atrScore = 30; }
  }

  // Williams %R (display only)
  let williamsRSignal: TimingScore["signals"]["williamsRSignal"] = null;
  if (s.williamsR != null) {
    if (s.williamsR < -80)      williamsRSignal = "oversold";
    else if (s.williamsR > -20) williamsRSignal = "overbought";
    else                        williamsRSignal = "neutral";
  }

  const raw = rsiScore * 0.20 + bollingerScore * 0.15 + macdScore * 0.20 +
              momentumScore * 0.15 + fiftyTwoWeekScore * 0.15 + obvScore * 0.10 + atrScore * 0.05;
  const score = Math.max(0, Math.min(100, Math.round(raw)));

  let label: TimingScore["label"];
  let colour: TimingScore["colour"];
  if (score >= 80)      { label = "Buy Now";     colour = "green"; }
  else if (score >= 65) { label = "Leaning Yes"; colour = "green"; }
  else if (score >= 45) { label = "Wait";        colour = "amber"; }
  else if (score >= 30) { label = "Leaning No";  colour = "red"; }
  else                  { label = "Avoid";        colour = "red"; }

  const signals = { rsiSignal, bollingerSignal, macdSignal, momentumSignal, fiftyTwoWeekSignal, obvSignal, atrSignal, williamsRSignal };
  const summary = buildTimingSummary(signals, score);

  const pos: string[] = [];
  const neg: string[] = [];
  if (rsiSignal === "oversold")           pos.push("RSI is oversold");
  if (rsiSignal === "overbought")         neg.push("RSI is overbought");
  if (bollingerSignal === "near_low")     pos.push("price is near Bollinger support");
  if (bollingerSignal === "near_high")    neg.push("price is stretched above Bollinger bands");
  if (macdSignal === "bullish_crossover" || macdSignal === "bullish") pos.push("MACD is bullish");
  if (macdSignal === "bearish_crossover" || macdSignal === "bearish") neg.push("MACD is bearish");
  if (fiftyTwoWeekSignal === "near_low")  pos.push("stock is near its 52-week low");
  if (fiftyTwoWeekSignal === "near_high") neg.push("stock is near its 52-week high");
  if (momentumSignal === "accelerating")  pos.push("momentum is building");
  if (momentumSignal === "decelerating")  neg.push("momentum is fading");
  if (obvSignal === "confirming")         pos.push("volume is confirming the move");
  if (obvSignal === "diverging")          neg.push("volume is not confirming");
  if (atrSignal === "low_volatility")     pos.push("low volatility provides stable entry conditions");
  if (atrSignal === "high_volatility")    neg.push("high volatility makes entry risky");

  return {
    score, label, colour, summary, signals,
    bestCaseEntry: pos.length > 0 ? `${pos.join(", ")}.` : "No strong positive timing signals at this time.",
    riskToEntry:   neg.length > 0 ? `${neg.join(", ")}.` : "No major timing risks identified.",
  };
}
