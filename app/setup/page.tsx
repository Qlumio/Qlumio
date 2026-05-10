"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { QlumioWordmark } from "@/components/QlumioBrand";

// ── Typer ─────────────────────────────────────────────────────────────────────

type Step = "income" | "housing" | "expenses" | "savings";

type IncomeRow = { name: string; amount: string };
type ExpenseRow = { name: string; amount: string; category: string; catType: string; sortOrder: number };
type SavingRow  = { name: string; balance: string; monthly: string };

type HousingType = "rent" | "own" | null;

type MortgageForm = {
  name: string;
  remaining_debt: string;
  loan_amount: string;
  interest_rate: string;
  repayment_years: string;
  installments_per_year: string;
  installment_fee: string;
};

// ── Konstanter ────────────────────────────────────────────────────────────────

const STEPS: Step[] = ["income", "housing", "expenses", "savings"];

const STEP_LABELS: Record<Step, { title: string; sub: string }> = {
  income:  { title: "Lønnsinntekt",   sub: "Månedlig inntekt – gjenspeiles direkte i budsjettet." },
  housing: { title: "Boligsituasjon", sub: "Leier eller eier dere boligen?" },
  expenses:{ title: "Faste utgifter", sub: "Fyll inn beløp der det passer. Tomme felter hoppes over." },
  savings: { title: "Sparekontoer",   sub: "Kontoer du vil følge med på i Qlumio." },
};

// Bolig og Lån håndteres i eget steg – ikke i presets
const EXPENSE_PRESETS: { category: string; catType: string; sortOrder: number; items: string[] }[] = [
  { category: "Forsikringer",      catType: "insurance", sortOrder: 4, items: ["Bilforsikring", "Innboforsikring", "Reiseforsikring", "Personforsikring"] },
  { category: "Mat og dagligvarer", catType: "expense",  sortOrder: 5, items: ["Dagligvarer", "Restaurant / takeaway"] },
  { category: "Transport",         catType: "expense",   sortOrder: 6, items: ["Drivstoff / lading", "Kollektivtransport", "Bompenger"] },
  { category: "Abonnementer",      catType: "expense",   sortOrder: 7, items: ["Strømmetjenester", "Treningssenter", "Mobilabonnement"] },
  { category: "Barn",              catType: "expense",   sortOrder: 8, items: ["Barnehage / SFO", "Klær og utstyr", "Aktiviteter"] },
  { category: "Sparing",           catType: "savings",   sortOrder: 9, items: ["BSU", "Pensjon", "Aksjer / fond"] },
];

function buildExpenseRows(): ExpenseRow[] {
  return EXPENSE_PRESETS.flatMap((g) =>
    g.items.map((name) => ({ name, amount: "", category: g.category, catType: g.catType, sortOrder: g.sortOrder }))
  );
}

const emptyMortgage: MortgageForm = {
  name: "Boliglån",
  remaining_debt: "",
  loan_amount: "",
  interest_rate: "",
  repayment_years: "",
  installments_per_year: "12",
  installment_fee: "0",
};

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

// ── Hjelpeinput ───────────────────────────────────────────────────────────────

function AmountInput({ value, onChange, placeholder = "0" }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="relative">
      <input type="number" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full px-3 py-2.5 pr-8 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent text-right"
      />
      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">kr</span>
    </div>
  );
}

function TextInput({ value, onChange, placeholder, label }: { value: string; onChange: (v: string) => void; placeholder?: string; label?: string }) {
  return (
    <div>
      {label && <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>}
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
      />
    </div>
  );
}

// ── Hoved-komponent ───────────────────────────────────────────────────────────

export default function SetupPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("income");
  const [loading, setLoading] = useState(false);
  const [roleChecked, setRoleChecked] = useState(false);

  // Kun foreldre skal gjennom den finansielle wizarden
  useEffect(() => {
    supabase.from("family_members").select("role").maybeSingle().then(({ data }) => {
      if (data && data.role !== "parent") router.replace("/innstillinger");
      else setRoleChecked(true);
    });
  }, [router]);

  if (!roleChecked) return null;

  // ── State ─────────────────────────────────────────────────────────────────

  const [incomeRows, setIncomeRows]   = useState<IncomeRow[]>([{ name: "Lønn", amount: "" }]);
  const [expenseRows, setExpenseRows] = useState<ExpenseRow[]>(buildExpenseRows());
  const [savingRows, setSavingRows]   = useState<SavingRow[]>([{ name: "Bufferkonto", balance: "", monthly: "" }]);

  // Bolig
  const [housingType, setHousingType] = useState<HousingType>(null);
  const [rentAmount, setRentAmount]   = useState("");
  const [utilities, setUtilities]     = useState(""); // strøm
  const [internet, setInternet]       = useState(""); // internett/tv
  const [mortgage, setMortgage]       = useState<MortgageForm>(emptyMortgage);

  // ── Hjelpefunksjon: hent eller opprett kategori ────────────────────────────

  const getOrCreateCategory = async (name: string, type: string, sortOrder: number): Promise<string | null> => {
    const { data: existing } = await supabase.from("budget_categories").select("id").eq("name", name).maybeSingle();
    if (existing) return existing.id;
    const { data: created } = await supabase.from("budget_categories").insert({ name, type, sort_order: sortOrder }).select("id").single();
    return created?.id ?? null;
  };

  const addBudgetItem = async (catId: string, name: string, amount: number) => {
    const { data: ex } = await supabase.from("budget_items").select("sort_order").eq("category_id", catId).order("sort_order", { ascending: false }).limit(1);
    const nextOrder = (ex?.[0]?.sort_order ?? 0) + 1;
    await supabase.from("budget_items").insert({ category_id: catId, name, sort_order: nextOrder, monthly_default: amount, source: "manual" });
  };

  // ── Steg 1: Inntekt ────────────────────────────────────────────────────────

  const handleIncomeStep = async () => {
    setLoading(true);
    const filled = incomeRows.filter((r) => r.name.trim() && parseFloat(r.amount) > 0);
    if (filled.length > 0) {
      const catId = await getOrCreateCategory("Inntekter", "income", 1);
      if (catId) for (const row of filled) await addBudgetItem(catId, row.name.trim(), Math.round(parseFloat(row.amount)));
    }
    setLoading(false);
    setStep("housing");
  };

  // ── Steg 2: Bolig ─────────────────────────────────────────────────────────

  const handleHousingStep = async () => {
    setLoading(true);

    if (housingType === "rent") {
      // Husleie → budsjettpost under "Bolig" (expense)
      const catId = await getOrCreateCategory("Bolig", "expense", 3);
      if (catId) {
        if (parseFloat(rentAmount) > 0) await addBudgetItem(catId, "Husleie", Math.round(parseFloat(rentAmount)));
        if (parseFloat(utilities) > 0)  await addBudgetItem(catId, "Strøm", Math.round(parseFloat(utilities)));
        if (parseFloat(internet) > 0)   await addBudgetItem(catId, "Internett / TV", Math.round(parseFloat(internet)));
      }
    }

    if (housingType === "own") {
      // Boliglån → loans-tabell + budsjettpost under "Lån" (loan)
      const loanCatId = await getOrCreateCategory("Lån", "loan", 2);

      // Beregn månedlig betaling for budsjettpost
      const debt     = parseFloat(mortgage.remaining_debt) || 0;
      const rente    = parseFloat(mortgage.interest_rate) || 0;
      const years    = parseFloat(mortgage.repayment_years) || 0;
      const terminer = parseInt(mortgage.installments_per_year) || 12;
      const fee      = parseFloat(mortgage.installment_fee) || 0;

      let monthlyPayment = 0;
      if (debt > 0 && rente > 0 && years > 0) {
        const r = rente / 100 / terminer;
        const n = years * terminer;
        monthlyPayment = Math.round((debt * r) / (1 - Math.pow(1 + r, -n)) * (terminer / 12) + fee * (terminer / 12));
      }

      // Opprett lån i loans-tabellen
      const { data: newLoan } = await supabase.from("loans").insert({
        name: mortgage.name || "Boliglån",
        loan_amount: parseFloat(mortgage.loan_amount) || null,
        remaining_debt: debt || null,
        interest_rate: rente || null,
        repayment_years: years || null,
        installments_per_year: terminer,
        installment_fee: fee || null,
        monthly_payment: monthlyPayment || null,
      }).select("id").single();

      // Budsjettpost under Lån-kategorien
      if (loanCatId && monthlyPayment > 0) {
        const { data: item } = await supabase.from("budget_items").insert({
          category_id: loanCatId,
          name: mortgage.name || "Boliglån",
          sort_order: 1,
          monthly_default: monthlyPayment,
          source: "manual",
        }).select("id").single();

        // Koble lånet til budsjettposten
        if (newLoan && item) {
          await supabase.from("loans").update({ budget_item_id: item.id }).eq("id", newLoan.id);
        }
      }

      // Andre boligutgifter
      const boligCatId = await getOrCreateCategory("Bolig", "expense", 3);
      if (boligCatId) {
        if (parseFloat(utilities) > 0) await addBudgetItem(boligCatId, "Strøm", Math.round(parseFloat(utilities)));
        if (parseFloat(internet) > 0)  await addBudgetItem(boligCatId, "Internett / TV", Math.round(parseFloat(internet)));
      }
    }

    setLoading(false);
    setStep("expenses");
  };

  // ── Steg 3: Faste utgifter ─────────────────────────────────────────────────

  const handleExpensesStep = async () => {
    setLoading(true);
    const filled = expenseRows.filter((r) => parseFloat(r.amount) > 0);
    if (filled.length > 0) {
      const groups: Record<string, { catType: string; sortOrder: number; items: typeof filled }> = {};
      for (const row of filled) {
        if (!groups[row.category]) groups[row.category] = { catType: row.catType, sortOrder: row.sortOrder, items: [] };
        groups[row.category].items.push(row);
      }
      for (const [catName, { catType, sortOrder, items }] of Object.entries(groups)) {
        const catId = await getOrCreateCategory(catName, catType, sortOrder);
        if (catId) for (const row of items) await addBudgetItem(catId, row.name, Math.round(parseFloat(row.amount)));
      }
    }
    setLoading(false);
    setStep("savings");
  };

  // ── Steg 4: Sparing ───────────────────────────────────────────────────────

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
  const updateMortgage = (f: keyof MortgageForm, v: string) => setMortgage((m) => ({ ...m, [f]: v }));

  const skip = () => {
    if (step === "income")   setStep("housing");
    else if (step === "housing")  setStep("expenses");
    else if (step === "expenses") setStep("savings");
    else router.push("/okonomi?tab=budsjett");
  };

  const inputCls = "w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent";

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

          <h2 className="text-xl font-semibold text-gray-900 mb-1">{STEP_LABELS[step].title}</h2>
          <p className="text-sm text-gray-500 mb-5">{STEP_LABELS[step].sub}</p>

          {/* ── STEG 1: INNTEKT ── */}
          {step === "income" && (
            <>
              <div className="space-y-3 mb-4">
                {incomeRows.map((row, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <input type="text" value={row.name} onChange={(e) => updateIncome(i, "name", e.target.value)}
                      placeholder="f.eks. Lønn Magnus" className={`flex-1 ${inputCls}`} />
                    <div className="relative w-28">
                      <input type="number" value={row.amount} onChange={(e) => updateIncome(i, "amount", e.target.value)}
                        placeholder="0" className={`${inputCls} text-right pr-8`} />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">kr</span>
                    </div>
                    {incomeRows.length > 1 && (
                      <button onClick={() => removeIncome(i)} className="text-gray-300 hover:text-red-400 text-lg">×</button>
                    )}
                  </div>
                ))}
              </div>
              <button onClick={addIncomeRow} className="flex items-center gap-1.5 text-sm text-violet-500 hover:text-violet-700 mb-6">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Legg til inntektskilde
              </button>
              <button onClick={handleIncomeStep} disabled={loading}
                className="w-full text-white py-2.5 rounded-xl text-sm font-semibold disabled:opacity-60"
                style={{ background: "linear-gradient(135deg, #8B5CF6, #22D3EE)" }}>
                {loading ? "Lagrer…" : "Neste →"}
              </button>
            </>
          )}

          {/* ── STEG 2: BOLIG ── */}
          {step === "housing" && (
            <>
              {/* Velg type */}
              <div className="flex gap-3 mb-6">
                {([["rent", "🏢 Leier bolig"], ["own", "🏠 Eier med boliglån"]] as const).map(([type, label]) => (
                  <button key={type} onClick={() => setHousingType(type)}
                    className={`flex-1 py-3 px-3 rounded-xl text-sm font-medium border-2 transition-all ${
                      housingType === type
                        ? "border-violet-500 bg-violet-50 text-violet-700"
                        : "border-gray-200 text-gray-600 hover:border-gray-300"
                    }`}>
                    {label}
                  </button>
                ))}
              </div>

              {/* Leier */}
              {housingType === "rent" && (
                <div className="space-y-3 mb-6">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Husleie per måned</label>
                    <div className="relative">
                      <input type="number" value={rentAmount} onChange={(e) => setRentAmount(e.target.value)}
                        placeholder="0" className={`${inputCls} text-right pr-8`} />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">kr</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Strøm per måned</label>
                    <div className="relative">
                      <input type="number" value={utilities} onChange={(e) => setUtilities(e.target.value)}
                        placeholder="0" className={`${inputCls} text-right pr-8`} />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">kr</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Internett / TV per måned</label>
                    <div className="relative">
                      <input type="number" value={internet} onChange={(e) => setInternet(e.target.value)}
                        placeholder="0" className={`${inputCls} text-right pr-8`} />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">kr</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Eier med boliglån */}
              {housingType === "own" && (
                <div className="space-y-3 mb-6">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Lånets navn</label>
                    <input type="text" value={mortgage.name} onChange={(e) => updateMortgage("name", e.target.value)}
                      placeholder="Boliglån" className={inputCls} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Restgjeld (kr)</label>
                      <input type="number" value={mortgage.remaining_debt} onChange={(e) => updateMortgage("remaining_debt", e.target.value)}
                        placeholder="0" className={`${inputCls} text-right`} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Oppr. lånebeløp (kr)</label>
                      <input type="number" value={mortgage.loan_amount} onChange={(e) => updateMortgage("loan_amount", e.target.value)}
                        placeholder="0" className={`${inputCls} text-right`} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Rente (%)</label>
                      <input type="number" value={mortgage.interest_rate} onChange={(e) => updateMortgage("interest_rate", e.target.value)}
                        placeholder="5.5" step="0.1" className={`${inputCls} text-right`} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Nedbetalingstid (år)</label>
                      <input type="number" value={mortgage.repayment_years} onChange={(e) => updateMortgage("repayment_years", e.target.value)}
                        placeholder="25" className={`${inputCls} text-right`} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Terminer per år</label>
                      <input type="number" value={mortgage.installments_per_year} onChange={(e) => updateMortgage("installments_per_year", e.target.value)}
                        placeholder="12" className={`${inputCls} text-right`} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Termingebyr (kr)</label>
                      <input type="number" value={mortgage.installment_fee} onChange={(e) => updateMortgage("installment_fee", e.target.value)}
                        placeholder="0" className={`${inputCls} text-right`} />
                    </div>
                  </div>
                  <p className="text-xs font-medium text-gray-500 mt-1">Andre boligutgifter</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1">Strøm (kr/mnd)</label>
                      <input type="number" value={utilities} onChange={(e) => setUtilities(e.target.value)}
                        placeholder="0" className={`${inputCls} text-right`} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1">Internett / TV (kr/mnd)</label>
                      <input type="number" value={internet} onChange={(e) => setInternet(e.target.value)}
                        placeholder="0" className={`${inputCls} text-right`} />
                    </div>
                  </div>
                </div>
              )}

              <button onClick={handleHousingStep} disabled={loading || housingType === null}
                className="w-full text-white py-2.5 rounded-xl text-sm font-semibold disabled:opacity-40"
                style={{ background: "linear-gradient(135deg, #8B5CF6, #22D3EE)" }}>
                {loading ? "Lagrer…" : "Neste →"}
              </button>
            </>
          )}

          {/* ── STEG 3: FASTE UTGIFTER ── */}
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
                            <div className="relative w-28">
                              <input type="number" value={expenseRows[rowIdx].amount}
                                onChange={(e) => updateExpense(rowIdx, e.target.value)}
                                placeholder="0"
                                className={`${inputCls} text-right pr-8`}
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
                className="w-full text-white py-2.5 rounded-xl text-sm font-semibold disabled:opacity-60"
                style={{ background: "linear-gradient(135deg, #8B5CF6, #22D3EE)" }}>
                {loading ? "Lagrer…" : "Neste →"}
              </button>
            </>
          )}

          {/* ── STEG 4: SPARING ── */}
          {step === "savings" && (
            <>
              <div className="space-y-4 mb-4">
                {savingRows.map((row, i) => (
                  <div key={i} className="border border-gray-200 rounded-xl p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <input type="text" value={row.name} onChange={(e) => updateSaving(i, "name", e.target.value)}
                        placeholder="Navn på konto" className={`flex-1 ${inputCls}`} />
                      {savingRows.length > 1 && (
                        <button onClick={() => removeSaving(i)} className="text-gray-300 hover:text-red-400 text-lg">×</button>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <input type="number" value={row.balance} onChange={(e) => updateSaving(i, "balance", e.target.value)}
                          placeholder="Nåværende saldo" className={`${inputCls} text-right pr-8`} />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">kr</span>
                      </div>
                      <div className="relative flex-1">
                        <input type="number" value={row.monthly} onChange={(e) => updateSaving(i, "monthly", e.target.value)}
                          placeholder="Per måned" className={`${inputCls} text-right pr-8`} />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">kr</span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-400 px-1">Saldo · Månedlig avsetning</p>
                  </div>
                ))}
              </div>
              <button onClick={addSavingRow} className="flex items-center gap-1.5 text-sm text-violet-500 hover:text-violet-700 mb-6">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Legg til konto
              </button>
              <button onClick={handleSavingsStep} disabled={loading}
                className="w-full text-white py-2.5 rounded-xl text-sm font-semibold disabled:opacity-60"
                style={{ background: "linear-gradient(135deg, #8B5CF6, #22D3EE)" }}>
                {loading ? "Ferdigstiller…" : "✓ Fullfør oppsett"}
              </button>
            </>
          )}

          {step !== "housing" && (
            <button onClick={skip} className="w-full text-center text-sm text-gray-400 hover:text-gray-600 mt-3 transition-colors">
              Hopp over
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
