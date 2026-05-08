"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { QlumioWordmark } from "@/components/QlumioBrand";

// ── Typer ─────────────────────────────────────────────────────────────────────

type Step = "income" | "expenses" | "savings";

type IncomeRow = { name: string; amount: string };
type ExpenseRow = { name: string; amount: string; category: string; catType: string };
type SavingRow = { name: string; balance: string; monthly: string };

// ── Konstanter ────────────────────────────────────────────────────────────────

const STEPS: Step[] = ["income", "expenses", "savings"];

const STEP_LABELS: Record<Step, { title: string; sub: string }> = {
  income:   { title: "Lønnsinntekt",   sub: "Månedlig inntekt – gjenspeiles direkte i budsjettet." },
  expenses: { title: "Faste utgifter", sub: "Fyll inn beløp der det passer. Tomme felter hoppes over." },
  savings:  { title: "Sparekontoer",   sub: "Kontoer du vil følge med på i Qlumio." },
};

const EXPENSE_PRESETS: { category: string; catType: string; items: string[] }[] = [
  { category: "Bolig",         catType: "expense", items: ["Husleie / lån", "Strøm", "Internett / TV", "Forsikring bolig"] },
  { category: "Transport",     catType: "expense", items: ["Drivstoff / lading", "Bilforsikring", "Kollektivtransport", "Bompenger"] },
  { category: "Abonnementer",  catType: "expense", items: ["Strømmetjenester", "Treningssenter", "Mobilabonnement"] },
  { category: "Barn",          catType: "expense", items: ["Barnehage / SFO", "Klær og utstyr", "Aktiviteter"] },
];

function buildExpenseRows(): ExpenseRow[] {
  return EXPENSE_PRESETS.flatMap((g) =>
    g.items.map((name) => ({ name, amount: "", category: g.category, catType: g.catType }))
  );
}

// ── Steg-indikator ────────────────────────────────────────────────────────────

function StepBar({ current }: { current: Step }) {
  const idx = STEPS.indexOf(current);
  return (
    <div className="mb-6">
      <div className="flex gap-1.5 mb-2">
        {STEPS.map((_, i) => (
          <div key={i} className={`flex-1 h-1 rounded-full transition-colors ${i <= idx ? "bg-violet-500" : "bg-gray-200"}`} />
        ))}
      </div>
      <p className="text-xs text-gray-400">Steg {idx + 1} av {STEPS.length}</p>
    </div>
  );
}

// ── Hoved-komponent ───────────────────────────────────────────────────────────

export default function SetupPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("income");
  const [loading, setLoading] = useState(false);

  const [incomeRows, setIncomeRows] = useState<IncomeRow[]>([{ name: "Lønn", amount: "" }]);
  const [expenseRows, setExpenseRows] = useState<ExpenseRow[]>(buildExpenseRows());
  const [savingRows, setSavingRows] = useState<SavingRow[]>([{ name: "Bufferkonto", balance: "", monthly: "" }]);

  // ── Lagre inntekt ──────────────────────────────────────────────────────────

  const handleIncomeStep = async () => {
    setLoading(true);
    const filled = incomeRows.filter((r) => r.name.trim() && parseFloat(r.amount) > 0);
    if (filled.length > 0) {
      const { data: cat } = await supabase
        .from("budget_categories")
        .insert({ name: "Inntekter", type: "income", sort_order: 1 })
        .select().single();
      if (cat) {
        for (let i = 0; i < filled.length; i++) {
          await supabase.from("budget_items").insert({
            category_id: cat.id,
            name: filled[i].name.trim(),
            sort_order: i + 1,
            monthly_default: Math.round(parseFloat(filled[i].amount)),
            source: "manual",
          });
        }
      }
    }
    setLoading(false);
    setStep("expenses");
  };

  // ── Lagre faste utgifter ───────────────────────────────────────────────────

  const handleExpensesStep = async () => {
    setLoading(true);
    const filled = expenseRows.filter((r) => parseFloat(r.amount) > 0);
    if (filled.length > 0) {
      const groups: Record<string, { catType: string; items: typeof filled }> = {};
      for (const row of filled) {
        if (!groups[row.category]) groups[row.category] = { catType: row.catType, items: [] };
        groups[row.category].items.push(row);
      }
      let sortOrder = 2;
      for (const [catName, { catType, items }] of Object.entries(groups)) {
        const { data: cat } = await supabase
          .from("budget_categories")
          .insert({ name: catName, type: catType, sort_order: sortOrder++ })
          .select().single();
        if (cat) {
          for (let i = 0; i < items.length; i++) {
            await supabase.from("budget_items").insert({
              category_id: cat.id,
              name: items[i].name,
              sort_order: i + 1,
              monthly_default: Math.round(parseFloat(items[i].amount)),
              source: "manual",
            });
          }
        }
      }
    }
    setLoading(false);
    setStep("savings");
  };

  // ── Lagre sparing og fullfør ───────────────────────────────────────────────

  const handleSavingsStep = async () => {
    setLoading(true);
    for (const row of savingRows.filter((r) => r.name.trim())) {
      await supabase.from("savings_accounts").insert({
        name: row.name.trim(),
        balance: Math.round(parseFloat(row.balance) || 0),
        monthly_amount: Math.round(parseFloat(row.monthly) || 0),
        is_buffer: false,
      });
    }
    setLoading(false);
    router.push("/okonomi?tab=budsjett");
  };

  // ── Hjelpere ──────────────────────────────────────────────────────────────

  const addIncomeRow = () => setIncomeRows((r) => [...r, { name: "", amount: "" }]);
  const updateIncome = (i: number, f: keyof IncomeRow, v: string) =>
    setIncomeRows((rows) => rows.map((r, idx) => idx === i ? { ...r, [f]: v } : r));
  const removeIncome = (i: number) => setIncomeRows((rows) => rows.filter((_, idx) => idx !== i));

  const updateExpense = (i: number, v: string) =>
    setExpenseRows((rows) => rows.map((r, idx) => idx === i ? { ...r, amount: v } : r));

  const addSavingRow = () => setSavingRows((r) => [...r, { name: "", balance: "", monthly: "" }]);
  const updateSaving = (i: number, f: keyof SavingRow, v: string) =>
    setSavingRows((rows) => rows.map((r, idx) => idx === i ? { ...r, [f]: v } : r));
  const removeSaving = (i: number) => setSavingRows((rows) => rows.filter((_, idx) => idx !== i));

  const skip = () => {
    if (step === "income") setStep("expenses");
    else if (step === "expenses") setStep("savings");
    else router.push("/okonomi?tab=budsjett");
  };

  const { title, sub } = STEP_LABELS[step];

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8 gap-2">
          <QlumioWordmark width={180} />
          <p className="text-sm text-gray-400 font-medium">Sett opp familieøkonomien</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <StepBar current={step} />

          <h2 className="text-xl font-semibold text-gray-900 mb-1">{title}</h2>
          <p className="text-sm text-gray-500 mb-5">{sub}</p>

          {/* ── INNTEKT ── */}
          {step === "income" && (
            <>
              <div className="space-y-3 mb-4">
                {incomeRows.map((row, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <input type="text" value={row.name} onChange={(e) => updateIncome(i, "name", e.target.value)}
                      placeholder="f.eks. Lønn Magnus"
                      className="flex-1 px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    />
                    <div className="relative">
                      <input type="number" value={row.amount} onChange={(e) => updateIncome(i, "amount", e.target.value)}
                        placeholder="0"
                        className="w-28 px-3 py-2.5 pr-8 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent text-right"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">kr</span>
                    </div>
                    {incomeRows.length > 1 && (
                      <button onClick={() => removeIncome(i)} className="text-gray-300 hover:text-red-400 text-lg leading-none">×</button>
                    )}
                  </div>
                ))}
              </div>
              <button onClick={addIncomeRow} className="flex items-center gap-1.5 text-sm text-violet-500 hover:text-violet-700 transition-colors mb-6">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Legg til inntektskilde
              </button>
              <button onClick={handleIncomeStep} disabled={loading}
                className="w-full text-white py-2.5 px-4 rounded-xl text-sm font-semibold disabled:opacity-60"
                style={{ background: "linear-gradient(135deg, #8B5CF6, #22D3EE)" }}>
                {loading ? "Lagrer…" : "Neste →"}
              </button>
            </>
          )}

          {/* ── UTGIFTER ── */}
          {step === "expenses" && (
            <>
              <div className="space-y-4 mb-6 max-h-80 overflow-y-auto pr-1">
                {EXPENSE_PRESETS.map((group) => (
                  <div key={group.category}>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">{group.category}</p>
                    <div className="space-y-2">
                      {group.items.map((itemName) => {
                        const rowIdx = expenseRows.findIndex((r) => r.name === itemName && r.category === group.category);
                        if (rowIdx === -1) return null;
                        return (
                          <div key={itemName} className="flex items-center gap-2">
                            <span className="flex-1 text-sm text-gray-700">{itemName}</span>
                            <div className="relative">
                              <input type="number" value={expenseRows[rowIdx].amount}
                                onChange={(e) => updateExpense(rowIdx, e.target.value)}
                                placeholder="0"
                                className="w-28 px-3 py-2 pr-8 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent text-right"
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">kr</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
              <button onClick={handleExpensesStep} disabled={loading}
                className="w-full text-white py-2.5 px-4 rounded-xl text-sm font-semibold disabled:opacity-60"
                style={{ background: "linear-gradient(135deg, #8B5CF6, #22D3EE)" }}>
                {loading ? "Lagrer…" : "Neste →"}
              </button>
            </>
          )}

          {/* ── SPARING ── */}
          {step === "savings" && (
            <>
              <div className="space-y-4 mb-4">
                {savingRows.map((row, i) => (
                  <div key={i} className="border border-gray-200 rounded-xl p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <input type="text" value={row.name} onChange={(e) => updateSaving(i, "name", e.target.value)}
                        placeholder="Navn på konto"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                      />
                      {savingRows.length > 1 && (
                        <button onClick={() => removeSaving(i)} className="text-gray-300 hover:text-red-400 text-lg leading-none">×</button>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <input type="number" value={row.balance} onChange={(e) => updateSaving(i, "balance", e.target.value)}
                          placeholder="Nåværende saldo"
                          className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent text-right"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">kr</span>
                      </div>
                      <div className="relative flex-1">
                        <input type="number" value={row.monthly} onChange={(e) => updateSaving(i, "monthly", e.target.value)}
                          placeholder="Per måned"
                          className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent text-right"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">kr</span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-400 px-1">Saldo · Månedlig avsetning</p>
                  </div>
                ))}
              </div>
              <button onClick={addSavingRow} className="flex items-center gap-1.5 text-sm text-violet-500 hover:text-violet-700 transition-colors mb-6">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Legg til konto
              </button>
              <button onClick={handleSavingsStep} disabled={loading}
                className="w-full text-white py-2.5 px-4 rounded-xl text-sm font-semibold disabled:opacity-60"
                style={{ background: "linear-gradient(135deg, #8B5CF6, #22D3EE)" }}>
                {loading ? "Ferdigstiller…" : "✓ Fullfør oppsett"}
              </button>
            </>
          )}

          <button onClick={skip} className="w-full text-center text-sm text-gray-400 hover:text-gray-600 mt-3 transition-colors">
            Hopp over
          </button>
        </div>
      </div>
    </main>
  );
}
