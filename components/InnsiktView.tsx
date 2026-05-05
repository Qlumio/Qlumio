"use client";

import { useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type InnsiktLoan = {
  id: string;
  name: string;
  type: string;
  provider: string;
  remaining_debt: number | null;
  interest_rate: number | null;
  monthly_payment: number | null;
  end_date: string | null;
  notes: string | null;
  budget_item_id: string | null;
};

export type InnsiktSavingsItem = {
  id: string;
  name: string;
  balance: number;
  monthly_amount: number;
};

export type InnsiktAsset = {
  id: string;
  name: string;
  type: string;
  estimated_value: number | null;
};

export type CashflowMonth = {
  year: number;
  month: number;
  label: string;
  income: number;
  expenses: number;
  net: number;
  bufferBalance: number;
  isCurrent: boolean;
};

type Props = {
  loans: InnsiktLoan[];
  savingsItems: InnsiktSavingsItem[];
  assets?: InnsiktAsset[];
  cashflowMonths?: CashflowMonth[];
  embedded?: boolean;
};

// ─── Konstanter ───────────────────────────────────────────────────────────────

const MONTH_NAMES = ["jan","feb","mar","apr","mai","jun","jul","aug","sep","okt","nov","des"];

// ─── Beregninger ──────────────────────────────────────────────────────────────

type AmortRow = {
  idx: number;
  year: number;
  monthLabel: string;
  interest: number;
  principal: number;
  balance: number;
  payment: number;
};

function buildAmortization(
  remaining_debt: number,
  interest_rate: number,
  monthly_payment: number,
  maxMonths = 360,
): AmortRow[] {
  const monthlyRate = interest_rate / 100 / 12;
  let balance = remaining_debt;
  const now = new Date();
  const result: AmortRow[] = [];

  for (let i = 0; i < maxMonths; i++) {
    const interest = Math.round(balance * monthlyRate);
    const payment = Math.min(monthly_payment, balance + interest);
    const principal = Math.max(0, payment - interest);
    balance = Math.max(0, Math.round(balance - principal));

    const d = new Date(now.getFullYear(), now.getMonth() + i);
    result.push({
      idx: i,
      year: d.getFullYear(),
      monthLabel: MONTH_NAMES[d.getMonth()],
      interest,
      principal,
      balance,
      payment,
    });

    if (balance === 0) break;
  }
  return result;
}

function estimatePayoffDate(amort: AmortRow[]): string | null {
  if (amort.length === 0) return null;
  const last = amort[amort.length - 1];
  if (last.balance > 0) return `Over ${Math.ceil(amort.length / 12)} år`;
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth() + amort.length - 1);
  return d.toLocaleDateString("nb-NO", { year: "numeric", month: "long" });
}

function totalInterest(amort: AmortRow[]): number {
  return amort.reduce((s, r) => s + r.interest, 0);
}

// ─── Formatters ───────────────────────────────────────────────────────────────

function fmtKr(n: number): string {
  return n.toLocaleString("nb-NO") + " kr";
}

// ─── Underkomponenter ─────────────────────────────────────────────────────────

function LoanCard({ loan }: { loan: InnsiktLoan }) {
  const [showTable, setShowTable] = useState(false);

  const hasData =
    loan.remaining_debt != null &&
    loan.interest_rate != null &&
    loan.monthly_payment != null &&
    loan.monthly_payment > 0;

  if (!hasData) {
    return (
      <div className="bg-white rounded-xl p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="font-semibold text-gray-900">{loan.name}</div>
            <div className="text-xs text-gray-400 mt-0.5">{loan.type} · {loan.provider}</div>
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-3">Mangler restgjeld, rente eller månedlig betaling – fyll inn i Lån & forsikring-fanen.</p>
      </div>
    );
  }

  const amort = buildAmortization(
    loan.remaining_debt!,
    loan.interest_rate!,
    loan.monthly_payment!,
  );

  const first = amort[0];
  const isGrowing = first && first.principal <= 0;
  const payoff = estimatePayoffDate(amort);
  const totInterest = totalInterest(amort);
  const next12 = amort.slice(0, 12);

  // Prosent avbetalt (av opprinnelig gjeld er vanskelig uten startdata — vis kun nedgang fra nå)
  const paidThisYear = next12.reduce((s, r) => s + r.principal, 0);
  const interestThisYear = next12.reduce((s, r) => s + r.interest, 0);

  const interestShare = first
    ? Math.round((first.interest / first.payment) * 100)
    : 0;

  return (
    <div className="bg-white rounded-xl overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div>
            <div className="font-semibold text-gray-900">{loan.name}</div>
            <div className="text-xs text-gray-400 mt-0.5">{loan.type} · {loan.provider}</div>
          </div>
          {loan.budget_item_id && (
            <span className="text-xs bg-green-50 text-green-600 px-2 py-0.5 rounded-full flex-shrink-0">
              Koblet til budsjett ✓
            </span>
          )}
        </div>

        {/* Nøkkeltall */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-gray-50 rounded-lg p-2.5 text-center">
            <div className="text-xs text-gray-400 mb-0.5">Restgjeld</div>
            <div className="text-sm font-bold text-gray-900">{(loan.remaining_debt! / 1000).toFixed(0)}k</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-2.5 text-center">
            <div className="text-xs text-gray-400 mb-0.5">Rente</div>
            <div className="text-sm font-bold text-gray-900">{loan.interest_rate} %</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-2.5 text-center">
            <div className="text-xs text-gray-400 mb-0.5">Mnd.betaling</div>
            <div className="text-sm font-bold text-gray-900">{(loan.monthly_payment! / 1000).toFixed(1)}k</div>
          </div>
        </div>
      </div>

      {/* Månedlig fordeling */}
      {first && (
        <div className="px-4 py-3 border-b border-gray-100">
          <div className="text-xs text-gray-400 mb-2">Denne måneden</div>
          {isGrowing ? (
            <p className="text-xs text-red-500">⚠️ Månedlig betaling dekker ikke rentene — gjelden vokser.</p>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-1.5">
                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-orange-400 rounded-full"
                    style={{ width: `${interestShare}%` }}
                  />
                </div>
                <span className="text-xs text-gray-400 whitespace-nowrap">{interestShare}% rente</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-orange-500">Renter: {fmtKr(first.interest)}</span>
                <span className="text-blue-600">Avdrag: {fmtKr(first.principal)}</span>
              </div>
            </>
          )}
        </div>
      )}

      {/* Neste 12 måneder */}
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between flex-wrap gap-2">
        <div>
          <div className="text-xs text-gray-400">Neste 12 måneder</div>
          <div className="text-sm mt-0.5">
            <span className="text-blue-600 font-medium">{fmtKr(paidThisYear)} avbetalt</span>
            <span className="text-gray-300 mx-1">·</span>
            <span className="text-orange-500">{fmtKr(interestThisYear)} i renter</span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-gray-400">Estimert nedbetalt</div>
          <div className="text-sm font-medium text-gray-700 mt-0.5">{payoff ?? "–"}</div>
        </div>
      </div>

      {/* Total rentekostnad */}
      <div className="px-4 py-2.5 border-b border-gray-100 flex items-center justify-between">
        <span className="text-xs text-gray-400">Total rentekostnad over lånets løpetid</span>
        <span className="text-sm font-semibold text-gray-700">{fmtKr(totInterest)}</span>
      </div>

      {/* Amortiseringstabell */}
      <div>
        <button
          onClick={() => setShowTable((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-2.5 text-xs text-gray-400 hover:bg-gray-50 transition-colors"
        >
          <span>Vis nedbetalingsplan ({next12.length} mnd)</span>
          <span className={`transition-transform ${showTable ? "rotate-180" : ""}`}>▾</span>
        </button>

        {showTable && (
          <div className="overflow-x-auto border-t border-gray-100">
            <table className="w-full text-xs border-collapse" style={{ minWidth: "400px" }}>
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-2 font-medium text-gray-400">Mnd</th>
                  <th className="text-right px-3 py-2 font-medium text-orange-400">Renter</th>
                  <th className="text-right px-3 py-2 font-medium text-blue-500">Avdrag</th>
                  <th className="text-right px-4 py-2 font-medium text-gray-400">Restgjeld</th>
                </tr>
              </thead>
              <tbody>
                {next12.map((row) => (
                  <tr key={row.idx} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-1.5 text-gray-600">{row.monthLabel} {row.year !== new Date().getFullYear() ? row.year : ""}</td>
                    <td className="text-right px-3 py-1.5 text-orange-500">{row.interest.toLocaleString("nb-NO")}</td>
                    <td className="text-right px-3 py-1.5 text-blue-600">{row.principal.toLocaleString("nb-NO")}</td>
                    <td className="text-right px-4 py-1.5 text-gray-600 font-medium">{row.balance.toLocaleString("nb-NO")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function SavingsCard({ item }: { item: InnsiktSavingsItem }) {
  const [showTable, setShowTable] = useState(false);

  const now = new Date();
  const projection = Array.from({ length: 12 }, (_, i) => {
    const bal = item.balance + (i + 1) * item.monthly_amount;
    const d = new Date(now.getFullYear(), now.getMonth() + i);
    return { idx: i, monthLabel: MONTH_NAMES[d.getMonth()], year: d.getFullYear(), balance: bal };
  });

  const endBalance = item.balance + 12 * item.monthly_amount;
  const growth = endBalance - item.balance;

  return (
    <div className="bg-white rounded-xl overflow-hidden">
      <div className="p-4">
        <div className="font-semibold text-gray-900 mb-3">{item.name}</div>
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-gray-50 rounded-lg p-2.5 text-center">
            <div className="text-xs text-gray-400 mb-0.5">Nåværende saldo</div>
            <div className="text-sm font-bold text-gray-900">
              {item.balance === 0 ? "–" : (item.balance / 1000).toFixed(0) + "k"}
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-2.5 text-center">
            <div className="text-xs text-gray-400 mb-0.5">Per måned</div>
            <div className="text-sm font-bold text-green-600">
              {item.monthly_amount === 0 ? "–" : "+" + (item.monthly_amount / 1000).toFixed(1) + "k"}
            </div>
          </div>
          <div className="bg-emerald-50 rounded-lg p-2.5 text-center">
            <div className="text-xs text-gray-400 mb-0.5">Om 12 mnd</div>
            <div className="text-sm font-bold text-emerald-700">
              {endBalance === 0 ? "–" : (endBalance / 1000).toFixed(0) + "k"}
            </div>
          </div>
        </div>

        {growth > 0 && (
          <div className="mt-3 flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-400 rounded-full transition-all"
                style={{ width: item.balance > 0 ? `${Math.min(100, (endBalance / item.balance) * 50)}%` : "40%" }}
              />
            </div>
            <span className="text-xs text-emerald-600 font-medium">+{fmtKr(growth)} / år</span>
          </div>
        )}
      </div>

      <div>
        <button
          onClick={() => setShowTable((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-2.5 text-xs text-gray-400 hover:bg-gray-50 transition-colors border-t border-gray-100"
        >
          <span>Vis månedlig prognose</span>
          <span className={`transition-transform ${showTable ? "rotate-180" : ""}`}>▾</span>
        </button>

        {showTable && (
          <div className="overflow-x-auto border-t border-gray-100">
            <table className="w-full text-xs border-collapse" style={{ minWidth: "300px" }}>
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-2 font-medium text-gray-400">Måned</th>
                  <th className="text-right px-3 py-2 font-medium text-green-500">Innskudd</th>
                  <th className="text-right px-4 py-2 font-medium text-gray-400">Saldo</th>
                </tr>
              </thead>
              <tbody>
                {projection.map((row) => (
                  <tr key={row.idx} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-1.5 text-gray-600">{row.monthLabel} {row.year !== new Date().getFullYear() ? row.year : ""}</td>
                    <td className="text-right px-3 py-1.5 text-green-600">+{item.monthly_amount.toLocaleString("nb-NO")}</td>
                    <td className="text-right px-4 py-1.5 text-gray-700 font-medium">{row.balance.toLocaleString("nb-NO")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Hovedkomponent ───────────────────────────────────────────────────────────

// ─── Likviditet & Cashflow ────────────────────────────────────────────────────

function CashflowChart({ months }: { months: CashflowMonth[] }) {
  const nets = months.map((m) => m.net);
  const maxVal = Math.max(...nets, 1);
  const minVal = Math.min(...nets, -1);
  const range = Math.max(maxVal - minVal, 1);

  const W = 580, H = 130;
  const barW = 32, gap = 14;
  const padL = 6, padR = 6, padTop = 8, padBottom = 26;
  const chartH = H - padTop - padBottom;
  const zeroY = padTop + (maxVal / range) * chartH;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      {/* Zero line */}
      <line x1={padL} y1={zeroY} x2={W - padR} y2={zeroY} stroke="#e5e7eb" strokeWidth={1} />
      {maxVal > 0 && <text x={padL} y={padTop + 8} fontSize={8} fill="#d1d5db">{(maxVal / 1000).toFixed(0)}k</text>}
      {minVal < 0 && <text x={padL} y={H - padBottom - 2} fontSize={8} fill="#d1d5db">{(minVal / 1000).toFixed(0)}k</text>}

      {months.map((m, i) => {
        const x = padL + i * (barW + gap) + gap / 2;
        const rawH = (Math.abs(m.net) / range) * chartH;
        const h = Math.max(2, rawH);
        const y = m.net >= 0 ? zeroY - h : zeroY;
        const isPos = m.net >= 0;

        return (
          <g key={i}>
            {m.isCurrent && (
              <rect x={x - 3} y={padTop} width={barW + 6} height={chartH} rx={2} fill="#eff6ff" />
            )}
            <rect
              x={x} y={y} width={barW} height={h} rx={3}
              fill={isPos ? "#22c55e" : "#ef4444"}
              opacity={m.isCurrent ? 1 : 0.6}
            >
              <title>{m.label}: {m.net >= 0 ? "+" : ""}{m.net.toLocaleString("nb-NO")} kr</title>
            </rect>
            <text
              x={x + barW / 2} y={H - 8}
              textAnchor="middle" fontSize={8.5}
              fill={m.isCurrent ? "#3b82f6" : "#9ca3af"}
              fontWeight={m.isCurrent ? "600" : "400"}
            >
              {m.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function LikviditetSection({ months }: { months: CashflowMonth[] }) {
  const [showTable, setShowTable] = useState(false);

  const hasData = months.some((m) => m.income > 0);
  const avgIncome = months[0]?.income ?? 0;
  const avgExpenses = months[0]?.expenses ?? 0;
  const avgNet = months[0]?.net ?? 0;
  const currentBuffer = months[0]?.bufferBalance ?? 0;
  const surplusMonths = months.filter((m) => m.net >= 0).length;

  if (!hasData) {
    return (
      <section className="mb-8">
        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">💸 Likviditet & cashflow</h2>
        <div className="bg-white rounded-xl p-6 text-center">
          <p className="text-gray-400 text-sm">Ingen budsjettdata funnet.</p>
          <p className="text-xs text-gray-300 mt-1">Fyll inn inntekter og utgifter i Budsjett-fanen.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="mb-8">
      <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">💸 Likviditet & cashflow</h2>

      {/* Nøkkeltall */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-white rounded-xl p-3 text-center">
          <div className="text-xs text-gray-400 mb-0.5">Månedlig inntekt</div>
          <div className="text-base font-bold text-gray-800">{(avgIncome / 1000).toFixed(0)}k kr</div>
        </div>
        <div className="bg-white rounded-xl p-3 text-center">
          <div className="text-xs text-gray-400 mb-0.5">Månedlige utgifter</div>
          <div className="text-base font-bold text-gray-800">{(avgExpenses / 1000).toFixed(0)}k kr</div>
        </div>
        <div className={`rounded-xl p-3 text-center ${avgNet >= 0 ? "bg-green-50" : "bg-red-50"}`}>
          <div className="text-xs text-gray-400 mb-0.5">Netto per måned</div>
          <div className={`text-base font-bold ${avgNet >= 0 ? "text-green-700" : "text-red-600"}`}>
            {avgNet >= 0 ? "+" : ""}{(avgNet / 1000).toFixed(1)}k kr
          </div>
        </div>
        <div className="bg-blue-50 rounded-xl p-3 text-center">
          <div className="text-xs text-gray-400 mb-0.5">Saldo avsetning nå</div>
          <div className="text-base font-bold text-blue-700">
            {currentBuffer > 0 ? (currentBuffer / 1000).toFixed(0) + "k kr" : "–"}
          </div>
        </div>
      </div>

      {/* Diagram */}
      <div className="bg-white rounded-xl p-4 mb-3">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium text-gray-600">Netto cashflow per måned</span>
          <span className="text-xs text-gray-400">{surplusMonths}/12 måneder i pluss</span>
        </div>
        <CashflowChart months={months} />
        <div className="flex gap-4 mt-2 justify-end">
          <span className="flex items-center gap-1.5 text-xs text-gray-400"><span className="w-3 h-3 rounded-sm bg-green-500 opacity-60 inline-block" />Overskudd</span>
          <span className="flex items-center gap-1.5 text-xs text-gray-400"><span className="w-3 h-3 rounded-sm bg-red-500 opacity-60 inline-block" />Underskudd</span>
        </div>
      </div>

      {/* Avsetningssaldo */}
      {currentBuffer > 0 && (
        <div className="bg-white rounded-xl p-4 mb-3">
          <div className="text-xs font-medium text-gray-600 mb-3">Saldo avsetningskonto over 12 måneder</div>
          <div className="flex gap-0 overflow-x-auto">
            {months.map((m, i) => {
              const maxBuf = Math.max(...months.map((x) => x.bufferBalance), 1);
              const fillPct = Math.max(0, Math.min(100, (m.bufferBalance / maxBuf) * 100));
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1 min-w-[36px]">
                  <div className="text-xs font-medium text-blue-700">{(m.bufferBalance / 1000).toFixed(0)}<span className="text-gray-300">k</span></div>
                  <div className="w-full h-8 bg-gray-100 rounded-sm overflow-hidden flex items-end">
                    <div
                      className={`w-full rounded-sm transition-all ${m.isCurrent ? "bg-blue-500" : "bg-blue-300"}`}
                      style={{ height: `${fillPct}%` }}
                    />
                  </div>
                  <div className={`text-xs ${m.isCurrent ? "text-blue-600 font-semibold" : "text-gray-400"}`}>{m.label}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Detaljer-tabell */}
      <button
        onClick={() => setShowTable((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-2.5 bg-white rounded-xl text-xs text-gray-400 hover:bg-gray-50 transition-colors"
      >
        <span>Vis månedlig oversikt</span>
        <span className={`transition-transform ${showTable ? "rotate-180" : ""}`}>▾</span>
      </button>

      {showTable && (
        <div className="mt-1 bg-white rounded-xl overflow-hidden">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-2 font-medium text-gray-400">Måned</th>
                <th className="text-right px-3 py-2 font-medium text-green-500">Inntekt</th>
                <th className="text-right px-3 py-2 font-medium text-red-400">Utgifter</th>
                <th className="text-right px-3 py-2 font-medium text-gray-500">Netto</th>
                <th className="text-right px-4 py-2 font-medium text-blue-400">Avsetning</th>
              </tr>
            </thead>
            <tbody>
              {months.map((m, i) => (
                <tr key={i} className={`border-b border-gray-50 ${m.isCurrent ? "bg-blue-50/40" : "hover:bg-gray-50"}`}>
                  <td className={`px-4 py-2 ${m.isCurrent ? "font-semibold text-blue-600" : "text-gray-600"}`}>{m.label}</td>
                  <td className="text-right px-3 py-2 text-green-700">{m.income.toLocaleString("nb-NO")}</td>
                  <td className="text-right px-3 py-2 text-red-600">{m.expenses.toLocaleString("nb-NO")}</td>
                  <td className={`text-right px-3 py-2 font-semibold ${m.net >= 0 ? "text-green-700" : "text-red-600"}`}>
                    {m.net >= 0 ? "+" : ""}{m.net.toLocaleString("nb-NO")}
                  </td>
                  <td className="text-right px-4 py-2 text-blue-700">
                    {m.bufferBalance > 0 ? m.bufferBalance.toLocaleString("nb-NO") : "–"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

const ASSET_EMOJIS: Record<string, string> = {
  hus: "🏠", bil: "🚗", hytte: "🏡", bat: "⛵", motorsykkel: "🏍️",
  elsykkel: "🚲", varmepumpe: "♨️", robotklipper: "🤖", hvitevarer: "🧺", annet: "📦",
};

export default function InnsiktView({ loans, savingsItems, assets = [], cashflowMonths, embedded = false }: Props) {
  const loansWithData = loans.filter(
    (l) => l.remaining_debt != null && l.interest_rate != null && l.monthly_payment != null
  );
  const totalDebt = loans.reduce((s, l) => s + (l.remaining_debt ?? 0), 0);
  const totalSavings = savingsItems.reduce((s, i) => s + i.balance, 0);
  const totalAssetValue = assets.reduce((s, a) => s + (a.estimated_value ?? 0), 0);
  const assetsWithValue = assets.filter((a) => a.estimated_value != null);
  const netWorth = totalSavings + totalAssetValue - totalDebt;

  const hasAnything = totalDebt > 0 || totalSavings > 0 || totalAssetValue > 0;

  return (
    <main className={embedded ? "text-gray-900 pb-10" : "min-h-screen bg-gray-50 text-gray-900 pb-10"}>
      <div className="max-w-2xl mx-auto px-4 pt-5">

        {/* ── Sammendrag øverst ── */}
        {hasAnything && (
          <div className="mb-6">
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className="bg-white rounded-xl p-4 text-center">
                <div className="text-xs text-gray-400 mb-1">Total gjeld</div>
                <div className="text-base font-bold text-red-500">
                  {totalDebt === 0 ? "–" : (totalDebt / 1_000_000).toFixed(2).replace(".", ",") + "M"}
                </div>
              </div>
              <div className="bg-white rounded-xl p-4 text-center">
                <div className="text-xs text-gray-400 mb-1">Eiendeler (est.)</div>
                <div className="text-base font-bold text-blue-600">
                  {totalAssetValue === 0 ? "–" : (totalAssetValue / 1_000_000).toFixed(2).replace(".", ",") + "M"}
                </div>
              </div>
              <div className="bg-white rounded-xl p-4 text-center">
                <div className="text-xs text-gray-400 mb-1">Total sparing</div>
                <div className="text-base font-bold text-green-600">
                  {totalSavings === 0 ? "–" : (totalSavings / 1000).toFixed(0) + "k"}
                </div>
              </div>
              <div className={`rounded-xl p-4 text-center ${netWorth >= 0 ? "bg-emerald-50" : "bg-red-50"}`}>
                <div className="text-xs text-gray-400 mb-1">Netto formue</div>
                <div className={`text-base font-bold ${netWorth >= 0 ? "text-emerald-700" : "text-red-600"}`}>
                  {netWorth >= 0 ? "+" : ""}{(netWorth / 1_000_000).toFixed(2).replace(".", ",")}M
                </div>
              </div>
            </div>
            {totalAssetValue > 0 && totalDebt > 0 && (
              <div className="bg-white rounded-xl px-4 py-3 text-xs text-gray-400 text-center">
                Netto formue = eiendeler ({(totalAssetValue / 1_000_000).toFixed(2).replace(".", ",")}M) + sparing ({(totalSavings / 1000).toFixed(0)}k) − gjeld ({(totalDebt / 1_000_000).toFixed(2).replace(".", ",")}M)
              </div>
            )}
          </div>
        )}

        {/* ── Likviditet & cashflow ── */}
        {cashflowMonths && cashflowMonths.length > 0 && (
          <LikviditetSection months={cashflowMonths} />
        )}

        {/* ── Lån ── */}
        {loans.length > 0 && (
          <section className="mb-8">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
              🏦 Lån ({loans.length})
            </h2>
            {loans.length > 0 && loansWithData.length < loans.length && (
              <p className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg mb-3">
                {loans.length - loansWithData.length} lån mangler data for beregning — fyll inn i Lån & forsikring-fanen.
              </p>
            )}
            <div className="space-y-3">
              {loans.map((loan) => <LoanCard key={loan.id} loan={loan} />)}
            </div>
          </section>
        )}

        {loans.length === 0 && (
          <div className="bg-white rounded-xl p-6 mb-8 text-center">
            <p className="text-gray-400 text-sm">Ingen lån registrert ennå.</p>
            <p className="text-xs text-gray-300 mt-1">Legg til lån i Lån & forsikring-fanen.</p>
          </div>
        )}

        {/* ── Eiendeler ── */}
        {assets.length > 0 && (
          <section className="mb-8">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
              🏠 Eiendeler ({assets.length})
            </h2>
            {assetsWithValue.length < assets.length && (
              <p className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg mb-3">
                {assets.length - assetsWithValue.length} eiendel(er) mangler estimert verdi – legg det inn under Eiendeler.
              </p>
            )}
            <div className="space-y-2">
              {assets.map((a) => (
                <div key={a.id} className="bg-white rounded-xl p-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{ASSET_EMOJIS[a.type] ?? "📦"}</span>
                    <div>
                      <div className="font-medium text-gray-900">{a.name}</div>
                      {a.estimated_value == null && (
                        <div className="text-xs text-gray-400">Ingen verdi angitt</div>
                      )}
                    </div>
                  </div>
                  {a.estimated_value != null && (
                    <div className="text-right">
                      <div className="text-sm font-semibold text-blue-600">
                        {a.estimated_value.toLocaleString("nb-NO")} kr
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Sparing ── */}
        <section>
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
            💰 Sparing ({savingsItems.length})
          </h2>
          {savingsItems.length === 0 ? (
            <div className="bg-white rounded-xl p-6 text-center">
              <p className="text-gray-400 text-sm">Ingen sparingsposter i budsjettet ennå.</p>
              <p className="text-xs text-gray-300 mt-1">Legg til en «Sparing»-kategori i budsjettet og angi startsaldo.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {savingsItems.map((item) => <SavingsCard key={item.id} item={item} />)}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
