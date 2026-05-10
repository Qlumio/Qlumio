"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase, setAuthCookies } from "@/lib/supabase/client";
import { QlumioWordmark } from "@/components/QlumioBrand";

// ── Typer ────────────────────────────────────────────────────────────────────

type Step = "account" | "family" | "income" | "expenses" | "savings";

type IncomeRow  = { name: string; amount: string };
type ExpenseRow = { name: string; amount: string; category: string; catType: string; sortOrder: number };
type SavingRow  = { name: string; balance: string; monthly: string };

// ── Konstanter ───────────────────────────────────────────────────────────────

const STEPS: Step[] = ["account", "family", "income", "expenses", "savings"];

const STEP_LABELS: Record<Step, string> = {
  account:  "Konto",
  family:   "Familie",
  income:   "Inntekt",
  expenses: "Utgifter",
  savings:  "Sparing",
};

const ROLES = [
  { value: "parent",      label: "Forelder" },
  { value: "child",       label: "Barn" },
  { value: "grandmother", label: "Bestemor" },
  { value: "grandfather", label: "Bestefar" },
  { value: "uncle",       label: "Onkel" },
  { value: "aunt",        label: "Tante" },
  { value: "trusted",     label: "Tillitsperson" },
  { value: "other",       label: "Annet" },
];

// Standard utgiftsposter – catType bestemmer kategori i budsjettmodulen
const EXPENSE_PRESETS: { category: string; catType: string; sortOrder: number; items: string[] }[] = [
  { category: "Lån",               catType: "loan",      sortOrder: 2, items: ["Boliglån", "Billån", "Studielån", "Forbrukslån"] },
  { category: "Bolig",             catType: "expense",   sortOrder: 3, items: ["Husleie", "Strøm", "Internett / TV"] },
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

// ── Steg-indikator ───────────────────────────────────────────────────────────

function StepBar({ current }: { current: Step }) {
  const idx = STEPS.indexOf(current);
  return (
    <div className="mb-6">
      <div className="flex gap-1.5 mb-2">
        {STEPS.map((s, i) => (
          <div
            key={s}
            className={`flex-1 h-1 rounded-full transition-colors ${
              i <= idx ? "bg-violet-500" : "bg-gray-200"
            }`}
          />
        ))}
      </div>
      <p className="text-xs text-gray-400">
        Steg {idx + 1} av {STEPS.length} · {STEP_LABELS[current]}
      </p>
    </div>
  );
}

// ── Hoved-komponent ──────────────────────────────────────────────────────────

export default function RegisterPage() {
  const router = useRouter();

  // Steg
  const [step, setStep] = useState<Step>("account");

  // Steg 1 – konto
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");

  // Steg 2 – familie
  const [familyName, setFamilyName] = useState("");
  const [memberName, setMemberName] = useState("");
  const [memberRole, setMemberRole] = useState("parent");

  // Steg 3 – inntekt
  const [incomeRows, setIncomeRows] = useState<IncomeRow[]>([
    { name: "Lønn", amount: "" },
  ]);

  // Steg 4 – utgifter
  const [expenseRows, setExpenseRows] = useState<ExpenseRow[]>(buildExpenseRows());

  // Steg 5 – sparing
  const [savingRows, setSavingRows] = useState<SavingRow[]>([
    { name: "Bufferkonto", balance: "", monthly: "" },
  ]);

  const [error, setError]   = useState("");
  const [loading, setLoading] = useState(false);

  // ── Steg 1: Konto ──────────────────────────────────────────────────────────

  const handleAccountStep = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 8) { setError("Passordet må være minst 8 tegn."); return; }
    if (password !== password2) { setError("Passordene stemmer ikke overens."); return; }
    setStep("family");
  };

  // ── Steg 2: Familie + opprett bruker ───────────────────────────────────────

  const handleFamilyStep = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({ email, password });
    if (signUpError || !signUpData.session) {
      const msg = signUpError?.message ?? "";
      if (msg.toLowerCase().includes("already registered") || msg.toLowerCase().includes("already been registered")) {
        setError("Denne e-posten er allerede registrert. Logg inn i stedet, eller slett brukeren i Supabase Authentication.");
      } else {
        setError(msg || "Registrering feilet. Prøv igjen.");
      }
      setLoading(false);
      return;
    }

    setAuthCookies(signUpData.session.access_token, signUpData.session.refresh_token);

    const { error: rpcError } = await supabase.rpc("create_family_and_member", {
      p_family_name: familyName.trim(),
      p_member_name: memberName.trim(),
      p_role: memberRole,
    });

    if (rpcError) {
      setError("Familie ble ikke opprettet: " + rpcError.message);
      setLoading(false);
      return;
    }

    setLoading(false);
    // Kun foreldre går gjennom den finansielle wizarden
    if (memberRole === "parent") {
      setStep("income");
    } else {
      router.push("/");
      router.refresh();
    }
  };

  // ── Hjelpefunksjon: hent eller opprett kategori ────────────────────────────

  const getOrCreateCategory = async (name: string, type: string, sortOrder: number): Promise<string | null> => {
    const { data: existing } = await supabase
      .from("budget_categories")
      .select("id")
      .eq("name", name)
      .maybeSingle();
    if (existing) return existing.id;
    const { data: created } = await supabase
      .from("budget_categories")
      .insert({ name, type, sort_order: sortOrder })
      .select("id")
      .single();
    return created?.id ?? null;
  };

  // ── Steg 3: Lagre inntekter ─────────────────────────────────────────────────

  const handleIncomeStep = async () => {
    setLoading(true);
    const filled = incomeRows.filter((r) => r.name.trim() && parseFloat(r.amount) > 0);

    if (filled.length > 0) {
      const catId = await getOrCreateCategory("Inntekter", "income", 1);
      if (catId) {
        const { data: existing } = await supabase.from("budget_items").select("sort_order").eq("category_id", catId).order("sort_order", { ascending: false }).limit(1);
        let nextOrder = (existing?.[0]?.sort_order ?? 0) + 1;
        for (const row of filled) {
          await supabase.from("budget_items").insert({
            category_id: catId,
            name: row.name.trim(),
            sort_order: nextOrder++,
            monthly_default: Math.round(parseFloat(row.amount)),
            source: "manual",
          });
        }
      }
    }

    setLoading(false);
    setStep("expenses");
  };

  // ── Steg 4: Lagre faste utgifter ───────────────────────────────────────────

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
        if (catId) {
          const { data: existing } = await supabase.from("budget_items").select("sort_order").eq("category_id", catId).order("sort_order", { ascending: false }).limit(1);
          let nextOrder = (existing?.[0]?.sort_order ?? 0) + 1;
          for (const row of items) {
            await supabase.from("budget_items").insert({
              category_id: catId,
              name: row.name,
              sort_order: nextOrder++,
              monthly_default: Math.round(parseFloat(row.amount)),
              source: "manual",
            });
          }
        }
      }
    }

    setLoading(false);
    setStep("savings");
  };

  // ── Steg 5: Lagre sparekontoer og fullfør ──────────────────────────────────

  const handleSavingsStep = async () => {
    setLoading(true);
    const filled = savingRows.filter((r) => r.name.trim());

    for (const row of filled) {
      await supabase.from("savings_accounts").insert({
        name: row.name.trim(),
        balance: Math.round(parseFloat(row.balance) || 0),
        monthly_amount: Math.round(parseFloat(row.monthly) || 0),
        is_buffer: false,
      });
    }

    setLoading(false);
    router.push("/");
    router.refresh();
  };

  // ── Hjelpefunksjoner for inntekt/sparing-rader ─────────────────────────────

  const addIncomeRow = () => setIncomeRows((r) => [...r, { name: "", amount: "" }]);
  const updateIncome = (i: number, field: keyof IncomeRow, val: string) =>
    setIncomeRows((rows) => rows.map((r, idx) => idx === i ? { ...r, [field]: val } : r));
  const removeIncome = (i: number) =>
    setIncomeRows((rows) => rows.filter((_, idx) => idx !== i));

  const updateExpense = (i: number, val: string) =>
    setExpenseRows((rows) => rows.map((r, idx) => idx === i ? { ...r, amount: val } : r));

  const addSavingRow = () => setSavingRows((r) => [...r, { name: "", balance: "", monthly: "" }]);
  const updateSaving = (i: number, field: keyof SavingRow, val: string) =>
    setSavingRows((rows) => rows.map((r, idx) => idx === i ? { ...r, [field]: val } : r));
  const removeSaving = (i: number) =>
    setSavingRows((rows) => rows.filter((_, idx) => idx !== i));

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8 gap-2">
          <QlumioWordmark width={200} />
          <p className="text-sm text-gray-400 font-medium">Less chaos, more family</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <StepBar current={step} />

          {/* ── STEG 1: KONTO ── */}
          {step === "account" && (
            <>
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Opprett konto</h2>
              <form onSubmit={handleAccountStep} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">E-post</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                    required autoComplete="email" placeholder="din@epost.no"
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Passord</label>
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                    required autoComplete="new-password" minLength={8} placeholder="Minst 8 tegn"
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Bekreft passord</label>
                  <input type="password" value={password2} onChange={(e) => setPassword2(e.target.value)}
                    required autoComplete="new-password" placeholder="••••••••"
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                  />
                </div>
                {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
                <button type="submit"
                  className="w-full text-white py-2.5 px-4 rounded-xl text-sm font-semibold transition-colors"
                  style={{ background: "linear-gradient(135deg, #8B5CF6, #22D3EE)" }}>
                  Neste →
                </button>
              </form>
            </>
          )}

          {/* ── STEG 2: FAMILIE ── */}
          {step === "family" && (
            <>
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Opprett familie</h2>
              <form onSubmit={handleFamilyStep} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Familienavn</label>
                  <input type="text" value={familyName} onChange={(e) => setFamilyName(e.target.value)}
                    required placeholder="f.eks. Familie Skontorp"
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Ditt navn</label>
                  <input type="text" value={memberName} onChange={(e) => setMemberName(e.target.value)}
                    required placeholder="Magnus"
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Din rolle i familien</label>
                  <select value={memberRole} onChange={(e) => setMemberRole(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent bg-white">
                    {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                </div>

                {/* Tilgangsnivå */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Tilgangsnivå</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="flex-1 flex flex-col items-center gap-1 px-3 py-3 rounded-xl border-2 text-sm font-medium transition-all border-violet-500 bg-violet-50 text-violet-700"
                    >
                      <span className="text-lg">🔑</span>
                      <span>Superbruker</span>
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 mt-2 leading-relaxed">
                    Som den som oppretter familien registreres du automatisk som Superbruker. Kun du kan gi denne tilgangen til andre familiemedlemmer i etterkant.
                  </p>
                </div>

                {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
                <div className="flex gap-3">
                  <button type="button" onClick={() => { setStep("account"); setError(""); }}
                    className="flex-1 border border-gray-300 text-gray-700 py-2.5 px-4 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">
                    ← Tilbake
                  </button>
                  <button type="submit" disabled={loading}
                    className="flex-1 text-white py-2.5 px-4 rounded-xl text-sm font-semibold disabled:opacity-60 transition-colors"
                    style={{ background: "linear-gradient(135deg, #8B5CF6, #22D3EE)" }}>
                    {loading ? "Oppretter…" : "Neste →"}
                  </button>
                </div>
              </form>
            </>
          )}

          {/* ── STEG 3: INNTEKT ── */}
          {step === "income" && (
            <>
              <h2 className="text-xl font-semibold text-gray-900 mb-1">Lønnsinntekt</h2>
              <p className="text-sm text-gray-500 mb-5">
                Legg inn månedlig inntekt. Brukes direkte i budsjettmodulen.
              </p>

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
                        className="w-28 px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent text-right pr-8"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">kr</span>
                    </div>
                    {incomeRows.length > 1 && (
                      <button onClick={() => removeIncome(i)} className="text-gray-300 hover:text-red-400 transition-colors text-lg leading-none">×</button>
                    )}
                  </div>
                ))}
              </div>

              <button onClick={addIncomeRow}
                className="flex items-center gap-1.5 text-sm text-violet-500 hover:text-violet-700 transition-colors mb-6">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Legg til inntektskilde
              </button>

              <div className="flex gap-3">
                <button onClick={() => handleIncomeStep()}
                  disabled={loading}
                  className="flex-1 text-white py-2.5 px-4 rounded-xl text-sm font-semibold disabled:opacity-60 transition-colors"
                  style={{ background: "linear-gradient(135deg, #8B5CF6, #22D3EE)" }}>
                  {loading ? "Lagrer…" : "Neste →"}
                </button>
              </div>
              <button onClick={() => setStep("expenses")}
                className="w-full text-center text-sm text-gray-400 hover:text-gray-600 mt-3 transition-colors">
                Hopp over
              </button>
            </>
          )}

          {/* ── STEG 4: FASTE UTGIFTER ── */}
          {step === "expenses" && (
            <>
              <h2 className="text-xl font-semibold text-gray-900 mb-1">Faste utgifter</h2>
              <p className="text-sm text-gray-500 mb-5">
                Fyll inn månedlige beløp der det passer. Tomme felter hoppes over.
              </p>

              <div className="space-y-4 mb-6 max-h-80 overflow-y-auto pr-1">
                {EXPENSE_PRESETS.map((group) => (
                  <div key={group.category}>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">{group.category}</p>
                    <div className="space-y-2">
                      {group.items.map((itemName) => {
                        const rowIdx = expenseRows.findIndex(
                          (r) => r.name === itemName && r.category === group.category
                        );
                        if (rowIdx === -1) return null;
                        const row = expenseRows[rowIdx];
                        return (
                          <div key={itemName} className="flex items-center gap-2">
                            <span className="flex-1 text-sm text-gray-700">{itemName}</span>
                            <div className="relative">
                              <input type="number" value={row.amount}
                                onChange={(e) => updateExpense(rowIdx, e.target.value)}
                                placeholder="0"
                                className="w-28 px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent text-right pr-8"
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

              <div className="flex gap-3">
                <button onClick={() => handleExpensesStep()}
                  disabled={loading}
                  className="flex-1 text-white py-2.5 px-4 rounded-xl text-sm font-semibold disabled:opacity-60 transition-colors"
                  style={{ background: "linear-gradient(135deg, #8B5CF6, #22D3EE)" }}>
                  {loading ? "Lagrer…" : "Neste →"}
                </button>
              </div>
              <button onClick={() => setStep("savings")}
                className="w-full text-center text-sm text-gray-400 hover:text-gray-600 mt-3 transition-colors">
                Hopp over
              </button>
            </>
          )}

          {/* ── STEG 5: SPARING ── */}
          {step === "savings" && (
            <>
              <h2 className="text-xl font-semibold text-gray-900 mb-1">Sparekontoer</h2>
              <p className="text-sm text-gray-500 mb-5">
                Legg til sparekontoer du vil følge med på. Bufferkonto brukes til å dekke uforutsette utgifter.
              </p>

              <div className="space-y-4 mb-4">
                {savingRows.map((row, i) => (
                  <div key={i} className="border border-gray-200 rounded-xl p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <input type="text" value={row.name} onChange={(e) => updateSaving(i, "name", e.target.value)}
                        placeholder="Navn på konto"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                      />
                      {savingRows.length > 1 && (
                        <button onClick={() => removeSaving(i)} className="text-gray-300 hover:text-red-400 transition-colors text-lg leading-none">×</button>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <input type="number" value={row.balance} onChange={(e) => updateSaving(i, "balance", e.target.value)}
                          placeholder="Nåværende saldo"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent text-right pr-8"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">kr</span>
                      </div>
                      <div className="relative flex-1">
                        <input type="number" value={row.monthly} onChange={(e) => updateSaving(i, "monthly", e.target.value)}
                          placeholder="Per måned"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent text-right pr-8"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">kr</span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-400 px-1">Saldo · Månedlig avsetning</p>
                  </div>
                ))}
              </div>

              <button onClick={addSavingRow}
                className="flex items-center gap-1.5 text-sm text-violet-500 hover:text-violet-700 transition-colors mb-6">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Legg til konto
              </button>

              <button onClick={() => handleSavingsStep()}
                disabled={loading}
                className="w-full text-white py-2.5 px-4 rounded-xl text-sm font-semibold disabled:opacity-60 transition-colors"
                style={{ background: "linear-gradient(135deg, #8B5CF6, #22D3EE)" }}>
                {loading ? "Ferdigstiller…" : "✓ Fullfør oppsett"}
              </button>
              <button onClick={() => { router.push("/"); router.refresh(); }}
                className="w-full text-center text-sm text-gray-400 hover:text-gray-600 mt-3 transition-colors">
                Hopp over
              </button>
            </>
          )}

          {step === "account" && (
            <p className="mt-6 text-sm text-center text-gray-600">
              Har du allerede konto?{" "}
              <Link href="/login" className="text-violet-600 hover:underline font-medium">Logg inn</Link>
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
