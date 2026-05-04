"use client";

import React, { useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Item = {
  id: string;
  name: string;
  sort_order: number;
  monthly_default: number;
  starting_balance: number;
  source: string;
};

type Category = {
  id: string;
  name: string;
  type: string;
  sort_order: number;
  items: Item[];
};

type Override = {
  item_id: string;
  year: number;
  month: number;
  amount: number;
};

type MaintenanceTask = {
  id: string;
  title: string;
  due_date: string;
  estimated_cost: number;
  asset_id: string;
  asset_name: string;
};

type PlannedExpense = {
  id: string;
  title: string;
  amount: number;
  date: string;
  category: string;
  notes: string | null;
};

const CAT_EMOJI: Record<string, string> = {
  skole: "📚", sport: "⚽", ferie: "✈️", annet: "📦", innkjop: "🛍️",
};

type MonthCol = {
  year: number;
  month: number;
  label: string;
  isCurrent: boolean;
  isPast: boolean;
};

type Props = {
  categories: Category[];
  overrides: Override[];
  maintenanceTasks: MaintenanceTask[];
  plannedExpenses: PlannedExpense[];
};

const MONTH_NAMES = ["jan", "feb", "mar", "apr", "mai", "jun", "jul", "aug", "sep", "okt", "nov", "des"];

function getMonthColsForYear(year: number): MonthCol[] {
  const now = new Date();
  const thisYear = now.getFullYear();
  const thisMonth = now.getMonth() + 1;
  return Array.from({ length: 12 }, (_, i) => {
    const month = i + 1;
    return {
      year,
      month,
      label: MONTH_NAMES[i],
      isCurrent: year === thisYear && month === thisMonth,
      isPast: year < thisYear || (year === thisYear && month < thisMonth),
    };
  });
}

function fmt(n: number): string {
  if (n === 0) return "–";
  return n.toLocaleString("nb-NO");
}

export default function BudgetView({ categories: initialCategories, overrides: initialOverrides, maintenanceTasks, plannedExpenses }: Props) {
  const router = useRouter();
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const monthCols = getMonthColsForYear(selectedYear);

  // Faner
  const [activeTab, setActiveTab] = useState<"actual" | "simulated">("actual");

  // Slett-bekreftelse
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Simulert budsjett – justeringer per kategori (i prosent)
  const [simAdjustments, setSimAdjustments] = useState<Record<string, number>>({});
  const [globalAdj, setGlobalAdj] = useState<number>(0);

  const [categories, setCategories] = useState<Category[]>(initialCategories);

  const [defaults, setDefaults] = useState<Record<string, number>>(() => {
    const d: Record<string, number> = {};
    initialCategories.forEach((cat) =>
      cat.items.forEach((item) => { d[item.id] = Number(item.monthly_default) || 0; })
    );
    return d;
  });

  const [overrides, setOverrides] = useState<Record<string, number>>(() => {
    const o: Record<string, number> = {};
    initialOverrides.forEach((ov) => { o[`${ov.item_id}-${ov.year}-${ov.month}`] = Number(ov.amount); });
    return o;
  });

  const [showOneTimeDetails, setShowOneTimeDetails] = useState(false);
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set());

  const toggleCat = (id: string) =>
    setExpandedCats((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });

  // Redigering av celleverdier
  const [editKey, setEditKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  // Redigering av postnavn
  const [editNameId, setEditNameId] = useState<string | null>(null);
  const [editNameValue, setEditNameValue] = useState("");

  // Legg til ny post
  const [addingToCatId, setAddingToCatId] = useState<string | null>(null);
  const [newItemName, setNewItemName] = useState("");

  // Startsaldo for sparingsposter
  const [startingBalances, setStartingBalances] = useState<Record<string, number>>(() => {
    const sb: Record<string, number> = {};
    initialCategories.forEach((cat) =>
      cat.items.forEach((item) => { sb[item.id] = Number(item.starting_balance) || 0; })
    );
    return sb;
  });
  const [editStartKey, setEditStartKey] = useState<string | null>(null);
  const [editStartValue, setEditStartValue] = useState("");

  // --- Beregninger ---

  const getVal = useCallback(
    (itemId: string, year: number, month: number): number => {
      const key = `${itemId}-${year}-${month}`;
      return overrides[key] !== undefined ? overrides[key] : (defaults[itemId] ?? 0);
    },
    [overrides, defaults]
  );

  const hasOverride = (itemId: string, year: number, month: number) =>
    overrides[`${itemId}-${year}-${month}`] !== undefined;

  const getAnnualTotal = useCallback(
    (itemId: string): number => {
      let total = 0;
      for (let m = 1; m <= 12; m++) total += getVal(itemId, selectedYear, m);
      return total;
    },
    [getVal, selectedYear]
  );

  const getCatMonthTotal = useCallback(
    (cat: Category, year: number, month: number) =>
      cat.items.reduce((sum, item) => sum + getVal(item.id, year, month), 0),
    [getVal]
  );

  const getCatAnnualTotal = useCallback(
    (cat: Category) => cat.items.reduce((sum, item) => sum + getAnnualTotal(item.id), 0),
    [getAnnualTotal]
  );

  const incomeCat = categories.find((c) => c.type === "income");
  const expenseCats = categories.filter((c) => ["loan", "expense", "insurance", "savings"].includes(c.type));

  const getMaintenanceMonthTotal = (year: number, month: number): number =>
    maintenanceTasks
      .filter((t) => {
        const d = new Date(t.due_date + "T00:00:00");
        return d.getFullYear() === year && d.getMonth() + 1 === month;
      })
      .reduce((sum, t) => sum + t.estimated_cost, 0);

  const getMaintenanceAnnualTotal = (): number =>
    maintenanceTasks
      .filter((t) => new Date(t.due_date + "T00:00:00").getFullYear() === selectedYear)
      .reduce((sum, t) => sum + t.estimated_cost, 0);

  const getPlannedMonthTotal = (year: number, month: number): number =>
    plannedExpenses
      .filter((e) => {
        const d = new Date(e.date + "T00:00:00");
        return d.getFullYear() === year && d.getMonth() + 1 === month;
      })
      .reduce((sum, e) => sum + e.amount, 0);

  const getPlannedAnnualTotal = (): number =>
    plannedExpenses
      .filter((e) => new Date(e.date + "T00:00:00").getFullYear() === selectedYear)
      .reduce((sum, e) => sum + e.amount, 0);

  const getRestMonth = (year: number, month: number) => {
    const inc = incomeCat ? getCatMonthTotal(incomeCat, year, month) : 0;
    const exp = expenseCats.reduce((s, c) => s + getCatMonthTotal(c, year, month), 0);
    const maint = getMaintenanceMonthTotal(year, month);
    const planned = getPlannedMonthTotal(year, month);
    return inc - exp - maint - planned;
  };

  const getRestAnnual = () => {
    const inc = incomeCat ? getCatAnnualTotal(incomeCat) : 0;
    const exp = expenseCats.reduce((s, c) => s + getCatAnnualTotal(c), 0);
    return inc - exp - getMaintenanceAnnualTotal() - getPlannedAnnualTotal();
  };

  // --- Sparingsprojeksjon ---
  const savingsCat = categories.find((c) => c.type === "savings");
  const bufferItem = savingsCat?.items.find((i) =>
    i.name.toLowerCase().includes("buffer") || i.name.toLowerCase().includes("avsetning")
  ) ?? null;

  const getSavingsBalance = useCallback(
    (itemId: string, upToMonth: number, year: number): number => {
      const startBal = startingBalances[itemId] ?? 0;
      let balance = startBal;
      for (let m = 1; m <= upToMonth; m++) balance += getVal(itemId, year, m);
      return balance;
    },
    [startingBalances, getVal]
  );

  const getBufferBalance = useCallback(
    (itemId: string, upToMonth: number, year: number): number => {
      let balance = getSavingsBalance(itemId, upToMonth, year);
      for (let m = 1; m <= upToMonth; m++) {
        balance -= getMaintenanceMonthTotal(year, m);
        balance -= getPlannedMonthTotal(year, m);
      }
      return balance;
    },
    [getSavingsBalance, getMaintenanceMonthTotal, getPlannedMonthTotal]
  );

  const saveStartingBalance = async (itemId: string) => {
    const val = Math.round(parseFloat(editStartValue) || 0);
    await supabase.from("budget_items").update({ starting_balance: val }).eq("id", itemId);
    setStartingBalances((prev) => ({ ...prev, [itemId]: val }));
    setEditStartKey(null);
  };

  // --- Helseindikator ---
  const nowDate = new Date();
  const healthMonth = nowDate.getMonth() + 1;
  const healthYear = nowDate.getFullYear();
  const monthlyIncome = incomeCat ? getCatMonthTotal(incomeCat, healthYear, healthMonth) : 0;
  const monthlySavingsTotal = savingsCat ? getCatMonthTotal(savingsCat, healthYear, healthMonth) : 0;
  const monthlyCashFlow = monthlyIncome > 0 ? getRestMonth(healthYear, healthMonth) : 0;
  const savingsRate = monthlyIncome > 0 ? Math.round((monthlySavingsTotal / monthlyIncome) * 100) : 0;
  const loanCat = categories.find((c) => c.type === "loan");
  const monthlyLoans = loanCat ? getCatMonthTotal(loanCat, healthYear, healthMonth) : 0;
  const debtRatio = monthlyIncome > 0 ? Math.round((monthlyLoans / monthlyIncome) * 100) : 0;

  // Sjekk om bufferkonto går i minus de neste 6 månedene
  let bufferWarning: string | null = null;
  if (bufferItem) {
    for (let i = 0; i < 6; i++) {
      const d = new Date(healthYear, healthMonth - 1 + i, 1);
      const bal = getBufferBalance(bufferItem.id, d.getMonth() + 1, d.getFullYear());
      if (bal < 0) {
        bufferWarning = MONTH_NAMES[d.getMonth()] + (d.getFullYear() !== healthYear ? ` ${d.getFullYear()}` : "");
        break;
      }
    }
  }

  const healthStatus: "nodata" | "red" | "yellow" | "green" =
    monthlyIncome === 0 ? "nodata"
    : monthlyCashFlow < 0 ? "red"
    : savingsRate < 5 || bufferWarning ? "yellow"
    : "green";

  const healthSuggestions: string[] = [];
  if (monthlyIncome > 0) {
    if (monthlyCashFlow < 0) healthSuggestions.push(`Månedlige utgifter overstiger inntekt med ${Math.abs(monthlyCashFlow).toLocaleString("nb-NO")} kr. Gjennomgå faste utgifter.`);
    if (savingsRate < 10 && savingsRate >= 0) healthSuggestions.push(`Sparerate er ${savingsRate}%. Eksperter anbefaler minimum 10% av inntekt.`);
    if (debtRatio > 40) healthSuggestions.push(`Lånebelastning er ${debtRatio}% av inntekt – vurder ekstra nedbetaling.`);
    if (bufferWarning) healthSuggestions.push(`Bufferkontoen kan gå i minus i ${bufferWarning}. Vurder å øke månedlig avsetning.`);
    if (monthlyCashFlow > monthlyIncome * 0.2 && savingsRate < 15) healthSuggestions.push(`Du har god margin. Vurder å øke sparingen.`);
  }

  // --- Slett alt grunnlag ---
  const handleDeleteAll = async () => {
    setDeleting(true);
    // Slett kun månedlige unntak
    await supabase.from("budget_overrides").delete().neq("item_id", "00000000-0000-0000-0000-000000000000");
    // Nullstill månedlig standardverdi på alle poster
    const allItemIds = categories.flatMap((c) => c.items.map((i) => i.id));
    if (allItemIds.length > 0) {
      await supabase.from("budget_items").update({ monthly_default: 0 }).in("id", allItemIds);
    }
    // Oppdater lokal state – behold struktur, nullstill tall
    setDefaults((prev) => {
      const next = { ...prev };
      allItemIds.forEach((id) => { next[id] = 0; });
      return next;
    });
    setOverrides({});
    setDeleting(false);
    setConfirmDelete(false);
  };

  // --- Prognose: anbefalt månedlig avsetning ---
  const getMonthlyRecommendation = (): number => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const horizon = new Date(today.getFullYear(), today.getMonth() + 12, 1);
    const futureMaint = maintenanceTasks
      .filter((t) => { const d = new Date(t.due_date + "T00:00:00"); return d >= today && d < horizon; })
      .reduce((s, t) => s + t.estimated_cost, 0);
    const futurePlanned = plannedExpenses
      .filter((e) => { const d = new Date(e.date + "T00:00:00"); return d >= today && d < horizon; })
      .reduce((s, e) => s + e.amount, 0);
    return Math.ceil((futureMaint + futurePlanned) / 12);
  };

  // --- Lagre celleverdier ---

  const saveCell = async (itemId: string, year: number, month: number) => {
    const numValue = Math.round(parseFloat(editValue) || 0);
    const key = `${itemId}-${year}-${month}`;
    const currentDefault = defaults[itemId] ?? 0;
    const hasAnyOverride = Object.keys(overrides).some((k) => k.startsWith(`${itemId}-${year}-`));

    if (currentDefault === 0 && !hasAnyOverride) {
      await supabase.from("budget_items").update({ monthly_default: numValue }).eq("id", itemId);
      setDefaults((prev) => ({ ...prev, [itemId]: numValue }));
    } else if (numValue === currentDefault) {
      await supabase.from("budget_overrides").delete().match({ item_id: itemId, year, month });
      setOverrides((prev) => { const n = { ...prev }; delete n[key]; return n; });
    } else {
      await supabase.from("budget_overrides").upsert({ item_id: itemId, year, month, amount: numValue });
      setOverrides((prev) => ({ ...prev, [key]: numValue }));
    }
    setEditKey(null);
  };

  // --- Administrasjon av poster ---

  const startEditName = (item: Item) => {
    setEditNameId(item.id);
    setEditNameValue(item.name);
  };

  const saveItemName = async (itemId: string, categoryId: string) => {
    const name = editNameValue.trim();
    if (!name) { setEditNameId(null); return; }
    await supabase.from("budget_items").update({ name }).eq("id", itemId);
    setCategories((prev) =>
      prev.map((cat) =>
        cat.id === categoryId
          ? { ...cat, items: cat.items.map((i) => (i.id === itemId ? { ...i, name } : i)) }
          : cat
      )
    );
    setEditNameId(null);
  };

  const deleteItem = async (itemId: string, categoryId: string) => {
    if (!confirm("Slett denne posten?")) return;
    await supabase.from("budget_items").delete().eq("id", itemId);
    setCategories((prev) =>
      prev.map((cat) =>
        cat.id === categoryId ? { ...cat, items: cat.items.filter((i) => i.id !== itemId) } : cat
      )
    );
    setDefaults((prev) => { const n = { ...prev }; delete n[itemId]; return n; });
  };

  const addItem = async (categoryId: string) => {
    const name = newItemName.trim();
    if (!name) { setAddingToCatId(null); return; }
    const cat = categories.find((c) => c.id === categoryId);
    const maxOrder = Math.max(0, ...(cat?.items.map((i) => i.sort_order) ?? []));
    const { data: newItem } = await supabase
      .from("budget_items")
      .insert({ category_id: categoryId, name, sort_order: maxOrder + 1, monthly_default: 0, source: "manual" })
      .select()
      .single();
    if (newItem) {
      setCategories((prev) =>
        prev.map((c) =>
          c.id === categoryId ? { ...c, items: [...c.items, newItem as Item] } : c
        )
      );
      setDefaults((prev) => ({ ...prev, [newItem.id]: 0 }));
    }
    setNewItemName("");
    setAddingToCatId(null);
  };

  // --- Render ---

  const numCols = monthCols.length + 2;

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-gray-50 border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-1.5 text-gray-500 hover:text-gray-900 transition-colors text-sm px-2 py-1.5 rounded-lg hover:bg-white"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              Tilbake
            </button>
            <div className="w-px h-5 bg-gray-100" />
            <h1 className="text-lg font-semibold">Familie økonomi</h1>
          </div>
          <div className="flex items-center gap-2">
            {/* År-navigasjon */}
            <div className="flex items-center gap-1 bg-white rounded-lg px-1 py-0.5">
              <button
                onClick={() => setSelectedYear((y) => Math.max(currentYear, y - 1))}
                disabled={selectedYear <= currentYear}
                className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-700 disabled:opacity-30 transition-colors text-sm"
              >
                ‹
              </button>
              <span className={`text-sm font-semibold px-1 min-w-[44px] text-center ${selectedYear === currentYear ? "text-blue-500" : "text-gray-700"}`}>
                {selectedYear}
              </span>
              <button
                onClick={() => setSelectedYear((y) => Math.min(currentYear + 10, y + 1))}
                disabled={selectedYear >= currentYear + 10}
                className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-700 disabled:opacity-30 transition-colors text-sm"
              >
                ›
              </button>
            </div>
            {selectedYear !== currentYear && (
              <button
                onClick={() => setSelectedYear(currentYear)}
                className="text-xs text-blue-500 hover:text-blue-600 transition-colors"
              >
                I dag
              </button>
            )}
            <button
              onClick={() => setConfirmDelete(true)}
              className="text-xs text-gray-400 hover:text-red-500 transition-colors px-2 py-1 rounded hover:bg-white"
              title="Slett alt grunnlag"
            >
              🗑 Slett alt
            </button>
          </div>
        </div>

        {/* Faner */}
        <div className="flex gap-1">
          <button
            onClick={() => setActiveTab("actual")}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${activeTab === "actual" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
          >
            Faktisk budsjett
          </button>
          <button
            onClick={() => setActiveTab("simulated")}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${activeTab === "simulated" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
          >
            🎯 Simulert budsjett
          </button>
        </div>
      </div>

      {/* Bekreft slett-modal */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl">
            <h2 className="text-lg font-semibold mb-2">Slett alt grunnlag?</h2>
            <p className="text-sm text-gray-500 mb-5">Dette nullstiller alle tallverdier (standardbeløp og månedlige unntak). Selve postene og kategoriene beholdes, slik at du kan fylle inn nye tall.</p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmDelete(false)} className="flex-1 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors text-sm">Avbryt</button>
              <button onClick={handleDeleteAll} disabled={deleting}
                className="flex-1 py-2 rounded-lg bg-red-500 hover:bg-red-600 disabled:opacity-40 transition-colors text-sm font-medium text-white">
                {deleting ? "Sletter…" : "Ja, slett alt"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Simulert budsjett-fane */}
      {activeTab === "simulated" && (
        <div className="p-4 max-w-2xl mx-auto">
          <div className="mb-5 bg-white rounded-xl p-4">
            <p className="text-sm text-gray-500 mb-3">Simuler effekten av prosentvise endringer per kategori. Tallene hentes fra faktisk budsjett som grunnlag.</p>
            <div className="flex items-center gap-3">
              <label className="text-sm text-gray-600 whitespace-nowrap">Global justering:</label>
              <input
                type="number"
                value={globalAdj}
                onChange={(e) => setGlobalAdj(parseFloat(e.target.value) || 0)}
                className="w-24 p-2 rounded-lg bg-gray-100 outline-none focus:ring-2 focus:ring-blue-500 text-sm text-center"
                placeholder="0"
              />
              <span className="text-sm text-gray-400">%</span>
              <button
                onClick={() => {
                  const newAdj: Record<string, number> = {};
                  expenseCats.forEach((c) => { newAdj[c.id] = globalAdj; });
                  setSimAdjustments(newAdj);
                }}
                className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-xs rounded-lg transition-colors"
              >
                Bruk på alle
              </button>
              <button
                onClick={() => setSimAdjustments({})}
                className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs rounded-lg transition-colors"
              >
                Nullstill
              </button>
            </div>
          </div>

          {categories.length === 0 && (
            <p className="text-center text-gray-400 text-sm py-8">Ingen budsjettdata å simulere. Legg inn data i &quot;Faktisk budsjett&quot; først.</p>
          )}

          <div className="space-y-2">
            {[...(incomeCat ? [incomeCat] : []), ...expenseCats].map((cat) => {
              const baseMonthly = getCatAnnualTotal(cat) / 12;
              const adj = simAdjustments[cat.id] ?? 0;
              const simMonthly = baseMonthly * (1 + adj / 100);
              const simAnnual = simMonthly * 12;
              const diff = simAnnual - getCatAnnualTotal(cat);
              const isIncome = cat.type === "income";

              return (
                <div key={cat.id} className="bg-white rounded-xl p-4 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-gray-700">{cat.name}</div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      Grunnlag: {Math.round(baseMonthly).toLocaleString("nb-NO")} kr/mnd · {getCatAnnualTotal(cat).toLocaleString("nb-NO")} kr/år
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <input
                      type="number"
                      value={simAdjustments[cat.id] ?? ""}
                      onChange={(e) => setSimAdjustments((prev) => ({ ...prev, [cat.id]: parseFloat(e.target.value) || 0 }))}
                      placeholder="0"
                      className="w-20 p-1.5 rounded-lg bg-gray-100 outline-none focus:ring-2 focus:ring-blue-500 text-sm text-center"
                    />
                    <span className="text-xs text-gray-400">%</span>
                  </div>
                  <div className="text-right flex-shrink-0 min-w-[120px]">
                    <div className="text-sm font-semibold text-gray-900">{Math.round(simMonthly).toLocaleString("nb-NO")} kr/mnd</div>
                    <div className={`text-xs mt-0.5 ${diff === 0 ? "text-gray-400" : isIncome ? (diff > 0 ? "text-green-600" : "text-red-500") : (diff > 0 ? "text-red-500" : "text-green-600")}`}>
                      {diff === 0 ? "Ingen endring" : `${diff > 0 ? "+" : ""}${Math.round(diff).toLocaleString("nb-NO")} kr/år`}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Simulert totaloversikt */}
          {categories.length > 0 && (() => {
            const simIncome = incomeCat ? (getCatAnnualTotal(incomeCat) / 12) * (1 + (simAdjustments[incomeCat.id] ?? 0) / 100) * 12 : 0;
            const simExpenses = expenseCats.reduce((sum, c) => {
              const base = getCatAnnualTotal(c);
              return sum + base * (1 + (simAdjustments[c.id] ?? 0) / 100);
            }, 0);
            const simRest = simIncome - simExpenses;
            const actualRest = getRestAnnual();
            const restDiff = simRest - actualRest;

            return (
              <div className="mt-4 bg-emerald-50 rounded-xl p-4 border border-emerald-100">
                <div className="text-sm font-bold text-gray-700 mb-2">Simulert årsresultat</div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-500">Simulert inntekt/år:</span>
                  <span className="font-medium">{Math.round(simIncome).toLocaleString("nb-NO")} kr</span>
                </div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-500">Simulerte utgifter/år:</span>
                  <span className="font-medium">{Math.round(simExpenses).toLocaleString("nb-NO")} kr</span>
                </div>
                <div className="flex justify-between text-sm font-bold border-t border-emerald-200 pt-2">
                  <span>Simulert rest:</span>
                  <span className={simRest >= 0 ? "text-green-600" : "text-red-500"}>{Math.round(simRest).toLocaleString("nb-NO")} kr</span>
                </div>
                {restDiff !== 0 && (
                  <div className={`text-xs mt-1 text-right ${restDiff > 0 ? "text-green-600" : "text-red-500"}`}>
                    {restDiff > 0 ? "+" : ""}{Math.round(restDiff).toLocaleString("nb-NO")} kr vs. faktisk budsjett
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {/* Helseindikator */}
      {activeTab === "actual" && healthStatus !== "nodata" && (
        <div className={`mx-4 mt-3 mb-1 rounded-xl p-4 border ${
          healthStatus === "green" ? "bg-green-50 border-green-100" :
          healthStatus === "yellow" ? "bg-amber-50 border-amber-100" :
          "bg-red-50 border-red-100"
        }`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-lg">{healthStatus === "green" ? "🟢" : healthStatus === "yellow" ? "🟡" : "🔴"}</span>
              <span className="font-semibold text-sm text-gray-800">
                {healthStatus === "green" ? "God økonomisk helse" : healthStatus === "yellow" ? "Noen punkter å se på" : "Økonomi under press"}
              </span>
            </div>
            <div className="flex gap-4 text-xs text-gray-500">
              <span>Sparerate: <b className={savingsRate >= 10 ? "text-green-600" : savingsRate >= 5 ? "text-amber-600" : "text-red-500"}>{savingsRate}%</b></span>
              <span>Lånbelastning: <b className={debtRatio <= 30 ? "text-green-600" : debtRatio <= 40 ? "text-amber-600" : "text-red-500"}>{debtRatio}%</b></span>
              <span>Månedlig rest: <b className={monthlyCashFlow >= 0 ? "text-green-600" : "text-red-500"}>{monthlyCashFlow.toLocaleString("nb-NO")} kr</b></span>
            </div>
          </div>
          {healthSuggestions.length > 0 && (
            <ul className="space-y-1">
              {healthSuggestions.map((s, i) => (
                <li key={i} className="text-xs text-gray-600 flex items-start gap-1.5">
                  <span className="mt-0.5 flex-shrink-0">💡</span>{s}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {activeTab === "actual" && (
        <p className="px-4 py-2 text-xs text-gray-400">
          Klikk et beløp for å redigere. Første verdi du setter på en post gjelder alle måneder.{" "}
          <span className="text-blue-500">Blå tall</span> er månedlige unntak.
        </p>
      )}

      {activeTab === "actual" && <div className="overflow-x-auto">
        <table className="w-full border-collapse" style={{ minWidth: "640px" }}>
          <thead>
            <tr className="border-b border-gray-200">
              <th className="sticky left-0 z-10 bg-gray-50 text-left px-4 py-2 text-xs text-gray-400 uppercase tracking-wide font-medium" style={{ minWidth: "200px" }}>
                Post
              </th>
              {monthCols.map((col) => (
                <th key={`${col.year}-${col.month}`} className={`text-right px-2 py-2 text-xs uppercase tracking-wide font-medium ${col.isCurrent ? "text-blue-500" : "text-gray-400"}`} style={{ minWidth: "80px" }}>
                  {col.label}
                  {selectedYear !== currentYear && <span className="block text-[10px] text-gray-400">{col.year}</span>}
                </th>
              ))}
              <th className="text-right px-2 py-2 text-xs text-gray-400 uppercase tracking-wide font-medium" style={{ minWidth: "80px" }}>År</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((cat) => {
              const isExpanded = expandedCats.has(cat.id);
              return (
              <React.Fragment key={cat.id}>
                {/* Kategori-header – klikk for å ekspandere */}
                <tr
                  onClick={() => toggleCat(cat.id)}
                  className="cursor-pointer hover:bg-gray-50 border-t-2 border-gray-200 group"
                >
                  <td className="sticky left-0 bg-white group-hover:bg-gray-50 px-4 py-2.5 transition-colors" style={{ minWidth: "200px" }}>
                    <div className="flex items-center gap-2">
                      <span className={`text-gray-400 text-xs transition-transform ${isExpanded ? "rotate-90" : ""}`}>▶</span>
                      <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">{cat.name}</span>
                      <span className="text-xs text-gray-300">{cat.items.length} poster</span>
                    </div>
                  </td>
                  {monthCols.map((col) => (
                    <td key={`${cat.id}-s-${col.year}-${col.month}`}
                      className={`text-right px-2 py-2.5 text-sm font-semibold ${col.isCurrent ? "text-gray-900 bg-gray-100" : "text-gray-700"}`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {fmt(getCatMonthTotal(cat, col.year, col.month))}
                    </td>
                  ))}
                  <td className="text-right px-2 py-2.5 text-sm font-semibold text-gray-500"
                    onClick={(e) => e.stopPropagation()}>
                    {fmt(getCatAnnualTotal(cat))}
                  </td>
                </tr>

                {/* Detaljer – kun synlig når ekspandert */}
                {isExpanded && (
                  <>
                    {cat.items.map((item) => (
                      <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50 group">
                        <td className="sticky left-0 bg-gray-50 group-hover:bg-gray-50 px-4 py-1.5 pl-8" style={{ minWidth: "200px" }}>
                          {editNameId === item.id ? (
                            <input
                              type="text"
                              value={editNameValue}
                              onChange={(e) => setEditNameValue(e.target.value)}
                              onBlur={() => saveItemName(item.id, cat.id)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") saveItemName(item.id, cat.id);
                                if (e.key === "Escape") setEditNameId(null);
                              }}
                              autoFocus
                              className="w-full bg-gray-100 rounded px-2 py-0.5 text-sm outline-none ring-1 ring-blue-500"
                            />
                          ) : (
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-sm text-gray-600">{item.name}</span>
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                                <button onClick={() => startEditName(item)} className="text-gray-400 hover:text-blue-500 transition-colors p-0.5" title="Endre navn">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                  </svg>
                                </button>
                                <button onClick={() => deleteItem(item.id, cat.id)} className="text-gray-400 hover:text-red-500 transition-colors p-0.5" title="Slett post">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </div>
                            </div>
                          )}
                        </td>
                        {monthCols.map((col) => {
                          const cellKey = `${item.id}-${col.year}-${col.month}`;
                          const val = getVal(item.id, col.year, col.month);
                          const isOvr = hasOverride(item.id, col.year, col.month);
                          return (
                            <td key={cellKey}
                              className={[
                                "text-right px-2 py-1.5 text-sm cursor-pointer hover:bg-gray-200 transition-colors",
                                col.isCurrent ? "bg-gray-100" : "",
                                isOvr ? "text-blue-600" : "",
                              ].filter(Boolean).join(" ")}
                              onClick={() => editKey !== cellKey && (setEditKey(cellKey), setEditValue(val === 0 ? "" : String(val)))}
                            >
                              {editKey === cellKey ? (
                                <input
                                  type="number"
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  onBlur={() => saveCell(item.id, col.year, col.month)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") saveCell(item.id, col.year, col.month);
                                    if (e.key === "Escape") setEditKey(null);
                                  }}
                                  autoFocus
                                  className="w-full text-right bg-blue-100 rounded px-1 outline-none ring-1 ring-blue-500 text-sm"
                                  style={{ maxWidth: "72px" }}
                                />
                              ) : (
                                <span className={isOvr ? "underline decoration-dotted" : ""}>{fmt(val)}</span>
                              )}
                            </td>
                          );
                        })}
                        <td className="text-right px-2 py-1.5 text-sm text-gray-400">{fmt(getAnnualTotal(item.id))}</td>
                      </tr>
                    ))}

                    {/* Legg til post */}
                    <tr className="border-b border-gray-200">
                      <td colSpan={numCols} className="sticky left-0 px-4 py-1.5 pl-8 bg-gray-50">
                        {addingToCatId === cat.id ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              placeholder="Navn på ny post…"
                              value={newItemName}
                              onChange={(e) => setNewItemName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") addItem(cat.id);
                                if (e.key === "Escape") { setAddingToCatId(null); setNewItemName(""); }
                              }}
                              autoFocus
                              className="bg-gray-100 rounded px-2 py-1 text-sm outline-none ring-1 ring-blue-500 w-48"
                            />
                            <button onClick={() => addItem(cat.id)} className="text-xs text-blue-500 hover:text-blue-600">Legg til</button>
                            <button onClick={() => { setAddingToCatId(null); setNewItemName(""); }} className="text-xs text-gray-400 hover:text-gray-700">Avbryt</button>
                          </div>
                        ) : (
                          <button
                            onClick={() => { setAddingToCatId(cat.id); setNewItemName(""); }}
                            className="text-xs text-gray-400 hover:text-gray-500 transition-colors flex items-center gap-1"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                            </svg>
                            Legg til post
                          </button>
                        )}
                      </td>
                    </tr>
                  </>
                )}
              </React.Fragment>
              );
            })}

            {/* Spacer */}
            <tr><td colSpan={numCols} className="py-2" /></tr>

            {/* Engangsutgifter (vedlikehold + planlagte) – kombinert */}
            {(maintenanceTasks.length > 0 || plannedExpenses.length > 0) && (() => {
              const rec = getMonthlyRecommendation();
              return (
                <>
                  {/* Klikbar seksjonsheader */}
                  <tr>
                    <td colSpan={numCols} className="sticky left-0 bg-white px-4 py-2 border-t-2 border-gray-200">
                      <div className="flex items-center justify-between">
                        <button
                          onClick={() => setShowOneTimeDetails((v) => !v)}
                          className="flex items-center gap-2 text-xs font-bold text-gray-600 uppercase tracking-wider hover:text-gray-900 transition-colors"
                        >
                          <span className={`transition-transform text-gray-400 ${showOneTimeDetails ? "rotate-90" : ""}`}>▶</span>
                          💸 Engangsutgifter
                          <span className="text-gray-400 font-normal normal-case tracking-normal">
                            ({maintenanceTasks.length + plannedExpenses.length} poster)
                          </span>
                        </button>
                        <div className="flex gap-3">
                          <Link href="/eiendeler" className="text-xs text-gray-400 hover:text-gray-600 transition-colors">Vedlikehold →</Link>
                          <Link href="/planlagte-kostnader" className="text-xs text-gray-400 hover:text-gray-600 transition-colors">Planlagte →</Link>
                        </div>
                      </div>
                    </td>
                  </tr>

                  {/* Detaljer – kun synlig når utvidet */}
                  {showOneTimeDetails && (
                    <>
                      {/* Vedlikehold */}
                      {maintenanceTasks.length > 0 && (
                        <>
                          <tr><td colSpan={numCols} className="sticky left-0 px-4 py-1 bg-orange-50">
                            <span className="text-xs text-orange-500 font-semibold">🔧 Vedlikehold</span>
                          </td></tr>
                          {maintenanceTasks.map((task) => {
                            const d = new Date(task.due_date + "T00:00:00");
                            const ty = d.getFullYear(); const tm = d.getMonth() + 1;
                            return (
                              <tr key={task.id} className="border-b border-gray-100 hover:bg-orange-50/40">
                                <td className="sticky left-0 bg-gray-50 px-4 py-1.5" style={{ minWidth: "200px" }}>
                                  <div className="text-sm text-gray-700 truncate">{task.asset_name}</div>
                                  <div className="text-xs text-gray-400 truncate">{task.title}</div>
                                </td>
                                {monthCols.map((col) => {
                                  const hit = col.year === ty && col.month === tm;
                                  return <td key={`${task.id}-${col.year}-${col.month}`} className={`text-right px-2 py-1.5 text-sm ${col.isCurrent ? "bg-gray-100" : ""} ${hit ? "text-orange-600 font-medium" : "text-gray-300"}`}>{hit ? task.estimated_cost.toLocaleString("nb-NO") : "–"}</td>;
                                })}
                                <td className="text-right px-2 py-1.5 text-sm text-gray-400">{ty === currentYear ? task.estimated_cost.toLocaleString("nb-NO") : "–"}</td>
                              </tr>
                            );
                          })}
                        </>
                      )}

                      {/* Planlagte */}
                      {plannedExpenses.length > 0 && (
                        <>
                          <tr><td colSpan={numCols} className="sticky left-0 px-4 py-1 bg-violet-50">
                            <span className="text-xs text-violet-500 font-semibold">📅 Planlagte kostnader</span>
                          </td></tr>
                          {plannedExpenses.map((expense) => {
                            const d = new Date(expense.date + "T00:00:00");
                            const ey = d.getFullYear(); const em = d.getMonth() + 1;
                            return (
                              <tr key={expense.id} className="border-b border-gray-100 hover:bg-violet-50/40">
                                <td className="sticky left-0 bg-gray-50 px-4 py-1.5" style={{ minWidth: "200px" }}>
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-sm">{CAT_EMOJI[expense.category] ?? "📦"}</span>
                                    <span className="text-sm text-gray-700 truncate">{expense.title}</span>
                                  </div>
                                  {expense.notes && <div className="text-xs text-gray-400 truncate ml-6">{expense.notes}</div>}
                                </td>
                                {monthCols.map((col) => {
                                  const hit = col.year === ey && col.month === em;
                                  return <td key={`${expense.id}-${col.year}-${col.month}`} className={`text-right px-2 py-1.5 text-sm ${col.isCurrent ? "bg-gray-100" : ""} ${hit ? "text-violet-600 font-medium" : "text-gray-300"}`}>{hit ? expense.amount.toLocaleString("nb-NO") : "–"}</td>;
                                })}
                                <td className="text-right px-2 py-1.5 text-sm text-gray-400">{ey === currentYear ? expense.amount.toLocaleString("nb-NO") : "–"}</td>
                              </tr>
                            );
                          })}
                        </>
                      )}
                    </>
                  )}

                  {/* Kombinert sumrad */}
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <td className="sticky left-0 bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700">
                      Sum engangsutgifter
                    </td>
                    {monthCols.map((col) => {
                      const total = getMaintenanceMonthTotal(col.year, col.month) + getPlannedMonthTotal(col.year, col.month);
                      return (
                        <td key={`one-sum-${col.year}-${col.month}`} className={`text-right px-2 py-2 text-sm font-semibold ${total > 0 ? "text-gray-800" : "text-gray-300"} ${col.isCurrent ? "bg-gray-100" : ""}`}>
                          {total > 0 ? total.toLocaleString("nb-NO") : "–"}
                        </td>
                      );
                    })}
                    <td className="text-right px-2 py-2 text-sm font-semibold text-gray-700">
                      {(getMaintenanceAnnualTotal() + getPlannedAnnualTotal()) > 0
                        ? (getMaintenanceAnnualTotal() + getPlannedAnnualTotal()).toLocaleString("nb-NO") : "–"}
                    </td>
                  </tr>

                  {/* Anbefalt avsetning */}
                  {rec > 0 && (
                    <tr className="bg-blue-50 border-b border-blue-100">
                      <td className="sticky left-0 bg-blue-50 px-4 py-2">
                        <div className="text-sm font-semibold text-blue-700">📊 Anbefalt avsetning</div>
                        <div className="text-xs text-blue-400 mt-0.5">Basert på forventede kostnader neste 12 mnd</div>
                      </td>
                      {monthCols.map((col) => (
                        <td key={`rec-${col.year}-${col.month}`} className={`text-right px-2 py-2 text-sm font-semibold text-blue-600 ${col.isCurrent ? "bg-blue-100" : ""}`}>
                          {rec.toLocaleString("nb-NO")}
                        </td>
                      ))}
                      <td className="text-right px-2 py-2 text-sm font-semibold text-blue-600">
                        {(rec * 12).toLocaleString("nb-NO")}
                      </td>
                    </tr>
                  )}
                </>
              );
            })()}

            {/* Spacer 2 */}
            <tr><td colSpan={numCols} className="py-1" /></tr>

            {/* Restbeløp */}
            <tr className="border-t-2 border-emerald-500/40 bg-emerald-50">
              <td className="sticky left-0 bg-emerald-50 px-4 py-3 text-sm font-bold text-gray-900">Restbeløp</td>
              {monthCols.map((col) => {
                const val = getRestMonth(col.year, col.month);
                return (
                  <td key={`rest-${col.year}-${col.month}`} className={`text-right px-2 py-3 text-sm font-bold ${val >= 0 ? "text-green-600" : "text-red-500"}`}>
                    {fmt(val)}
                  </td>
                );
              })}
              <td className={`text-right px-2 py-3 text-sm font-bold ${getRestAnnual() >= 0 ? "text-green-600" : "text-red-500"}`}>
                {fmt(getRestAnnual())}
              </td>
            </tr>
          </tbody>
        </table>
      </div>}

      {/* Avsetningskonto – isolert likviditetsbuffer */}
      {activeTab === "actual" && bufferItem && (
        <div className="px-4 pt-4 pb-2">
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-1">🏦 Avsetningskonto</h2>
          <p className="text-xs text-gray-400 mb-3">Løpende likviditetsbuffer – monthly avsetning minus forventede engangsutgifter.</p>
          <div className="overflow-x-auto">
            <table className="border-collapse" style={{ tableLayout: "fixed", width: "100%", minWidth: `${180 + 110 + 90 + monthCols.length * 72}px` }}>
              <colgroup>
                <col style={{ width: "180px" }} />
                <col style={{ width: "110px" }} />
                <col style={{ width: "90px" }} />
                {monthCols.map((_, i) => <col key={i} style={{ width: "72px" }} />)}
              </colgroup>
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left px-3 py-2 text-xs text-gray-400 uppercase tracking-wide">Konto</th>
                  <th className="text-right px-3 py-2 text-xs text-gray-400 uppercase tracking-wide">Nåværende saldo</th>
                  <th className="text-right px-3 py-2 text-xs text-gray-400 uppercase tracking-wide">Per mnd</th>
                  {monthCols.map((col) => (
                    <th key={`bh-${col.month}`} className={`text-right px-2 py-2 text-xs uppercase tracking-wide ${col.isCurrent ? "text-blue-500" : "text-gray-400"}`}>
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-100 bg-blue-50/30">
                  <td className="px-3 py-2.5 text-sm font-medium text-gray-700">{bufferItem.name}</td>
                  <td className="text-right px-3 py-2.5">
                    {editStartKey === bufferItem.id ? (
                      <input type="number" value={editStartValue}
                        onChange={(e) => setEditStartValue(e.target.value)}
                        onBlur={() => saveStartingBalance(bufferItem.id)}
                        onKeyDown={(e) => { if (e.key === "Enter") saveStartingBalance(bufferItem.id); if (e.key === "Escape") setEditStartKey(null); }}
                        autoFocus className="w-full text-right bg-blue-100 rounded px-2 py-0.5 outline-none ring-1 ring-blue-500 text-sm" />
                    ) : (
                      <button onClick={() => { setEditStartKey(bufferItem.id); setEditStartValue((startingBalances[bufferItem.id] ?? 0) === 0 ? "" : String(startingBalances[bufferItem.id])); }}
                        className="text-sm w-full text-right text-gray-700 hover:text-blue-600 hover:underline transition-colors">
                        {(startingBalances[bufferItem.id] ?? 0) === 0 ? <span className="text-gray-300">Angi saldo</span> : (startingBalances[bufferItem.id] ?? 0).toLocaleString("nb-NO") + " kr"}
                      </button>
                    )}
                  </td>
                  <td className="text-right px-3 py-2.5 text-sm text-gray-500">
                    {getVal(bufferItem.id, selectedYear, 1) > 0 ? `+ ${getVal(bufferItem.id, selectedYear, 1).toLocaleString("nb-NO")}` : "–"}
                  </td>
                  {monthCols.map((col) => {
                    const bal = getBufferBalance(bufferItem.id, col.month, col.year);
                    return (
                      <td key={`buf-${col.month}`} className={`text-right px-2 py-2.5 text-sm font-semibold ${col.isCurrent ? "bg-blue-100" : ""} ${bal < 0 ? "text-red-500" : "text-green-600"}`}>
                        {bal === 0 ? "–" : bal.toLocaleString("nb-NO")}
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Sparingsoversikt – kun rene sparingsposter */}
      {activeTab === "actual" && savingsCat && savingsCat.items.filter((i) => i.id !== bufferItem?.id).length > 0 && (
        <div className="px-4 pt-4 pb-8">
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-1">💰 Sparingsoversikt</h2>
          <p className="text-xs text-gray-400 mb-3">Klikk på saldo for å oppdatere nåværende beholdning. Fremtidig saldo beregnes automatisk.</p>
          <div className="overflow-x-auto">
            <table className="border-collapse" style={{ tableLayout: "fixed", width: "100%", minWidth: `${180 + 110 + 90 + monthCols.length * 72}px` }}>
              <colgroup>
                <col style={{ width: "180px" }} />
                <col style={{ width: "110px" }} />
                <col style={{ width: "90px" }} />
                {monthCols.map((_, i) => <col key={i} style={{ width: "72px" }} />)}
              </colgroup>
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left px-3 py-2 text-xs text-gray-400 uppercase tracking-wide">Konto</th>
                  <th className="text-right px-3 py-2 text-xs text-gray-400 uppercase tracking-wide">Nåværende saldo</th>
                  <th className="text-right px-3 py-2 text-xs text-gray-400 uppercase tracking-wide">Per mnd</th>
                  {monthCols.map((col) => (
                    <th key={`sh-${col.month}`} className={`text-right px-2 py-2 text-xs uppercase tracking-wide ${col.isCurrent ? "text-blue-500" : "text-gray-400"}`}>
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {savingsCat.items.filter((item) => item.id !== bufferItem?.id).map((item) => {
                  const startBal = startingBalances[item.id] ?? 0;
                  const monthly = getVal(item.id, selectedYear, 1);
                  return (
                    <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-3 py-2.5 text-sm font-medium text-gray-700 truncate">{item.name}</td>
                      <td className="text-right px-3 py-2.5">
                        {editStartKey === item.id ? (
                          <input type="number" value={editStartValue}
                            onChange={(e) => setEditStartValue(e.target.value)}
                            onBlur={() => saveStartingBalance(item.id)}
                            onKeyDown={(e) => { if (e.key === "Enter") saveStartingBalance(item.id); if (e.key === "Escape") setEditStartKey(null); }}
                            autoFocus className="w-full text-right bg-blue-100 rounded px-2 py-0.5 outline-none ring-1 ring-blue-500 text-sm" />
                        ) : (
                          <button onClick={() => { setEditStartKey(item.id); setEditStartValue(startBal === 0 ? "" : String(startBal)); }}
                            className="text-sm w-full text-right text-gray-700 hover:text-blue-600 hover:underline transition-colors">
                            {startBal === 0 ? <span className="text-gray-300">Angi saldo</span> : startBal.toLocaleString("nb-NO") + " kr"}
                          </button>
                        )}
                      </td>
                      <td className="text-right px-3 py-2.5 text-sm text-gray-500">
                        {monthly > 0 ? `+ ${monthly.toLocaleString("nb-NO")}` : "–"}
                      </td>
                      {monthCols.map((col) => {
                        const bal = getSavingsBalance(item.id, col.month, col.year);
                        return (
                          <td key={`sb-${item.id}-${col.month}`} className={`text-right px-2 py-2.5 text-sm font-medium ${col.isCurrent ? "bg-blue-50" : ""} ${bal < 0 ? "text-red-500" : bal > startBal ? "text-green-600" : "text-gray-500"}`}>
                            {bal === 0 ? "–" : bal.toLocaleString("nb-NO")}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}

                {/* Totalrad */}
                {(() => {
                  const savingsItems = savingsCat.items.filter((i) => i.id !== bufferItem?.id);
                  const totalStart = savingsItems.reduce((s, i) => s + (startingBalances[i.id] ?? 0), 0);
                  const totalMonthly = savingsItems.reduce((s, i) => s + getVal(i.id, selectedYear, 1), 0);
                  return (
                    <tr className="border-t-2 border-gray-200 bg-gray-50">
                      <td className="px-3 py-2 text-sm font-semibold text-gray-700">Total</td>
                      <td className="text-right px-3 py-2 text-sm font-semibold text-gray-700">
                        {totalStart === 0 ? "–" : totalStart.toLocaleString("nb-NO") + " kr"}
                      </td>
                      <td className="text-right px-3 py-2 text-sm font-semibold text-gray-700">
                        {totalMonthly === 0 ? "–" : `+ ${totalMonthly.toLocaleString("nb-NO")}`}
                      </td>
                      {monthCols.map((col) => {
                        const total = savingsItems.reduce((s, item) => s + getSavingsBalance(item.id, col.month, col.year), 0);
                        return (
                          <td key={`st-${col.month}`} className={`text-right px-2 py-2 text-sm font-semibold ${col.isCurrent ? "bg-blue-50" : ""} ${total >= 0 ? "text-green-700" : "text-red-500"}`}>
                            {total === 0 ? "–" : total.toLocaleString("nb-NO")}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })()}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </main>
  );
}
