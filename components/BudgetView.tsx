"use client";

import React, { useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import HomeButton from "@/components/HomeButton";

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

type MonthCol = { year: number; month: number; label: string; isCurrent: boolean; isPast: boolean };

type BufferAccount = {
  name: string;
  balance: number;
  monthly_amount: number;
  target_amount?: number | null;
  budget_item_id?: string | null;
};

type Props = {
  categories: Category[];
  overrides: Override[];
  maintenanceTasks: MaintenanceTask[];
  plannedExpenses: PlannedExpense[];
  bufferAccounts?: BufferAccount[];
  embedded?: boolean;
};

const MONTH_NAMES = ["jan","feb","mar","apr","mai","jun","jul","aug","sep","okt","nov","des"];

function getMonthColsForYear(year: number): MonthCol[] {
  const now = new Date();
  const thisYear = now.getFullYear();
  const thisMonth = now.getMonth() + 1;
  return Array.from({ length: 12 }, (_, i) => {
    const month = i + 1;
    return { year, month, label: MONTH_NAMES[i],
      isCurrent: year === thisYear && month === thisMonth,
      isPast: year < thisYear || (year === thisYear && month < thisMonth),
    };
  });
}

function fmt(n: number): string {
  if (n === 0) return "–";
  return Math.round(n).toLocaleString("nb-NO");
}

export default function BudgetView({
  categories: initialCategories, overrides: initialOverrides,
  maintenanceTasks, plannedExpenses, bufferAccounts = [], embedded = false,
}: Props) {
  const router = useRouter();
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const monthCols = getMonthColsForYear(selectedYear);
  const numCols = monthCols.length + 2;

  const [activeTab, setActiveTab] = useState<"actual" | "simulated">("actual");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Simulert budsjett
  const [simAdjustments, setSimAdjustments] = useState<Record<string, number>>({});
  const [globalAdj, setGlobalAdj] = useState<number>(0);
  const [simExpandedCats, setSimExpandedCats] = useState<Set<string>>(new Set());

  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [defaults, setDefaults] = useState<Record<string, number>>(() => {
    const d: Record<string, number> = {};
    initialCategories.forEach((cat) => cat.items.forEach((item) => { d[item.id] = Number(item.monthly_default) || 0; }));
    return d;
  });
  const [overrides, setOverrides] = useState<Record<string, number>>(() => {
    const o: Record<string, number> = {};
    initialOverrides.forEach((ov) => { o[`${ov.item_id}-${ov.year}-${ov.month}`] = Number(ov.amount); });
    return o;
  });

  const [showOneTimeDetails, setShowOneTimeDetails] = useState(false);
  const [showBufferDetails, setShowBufferDetails] = useState(false);
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set());

  const toggleCat = (id: string) =>
    setExpandedCats((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleSimCat = (id: string) =>
    setSimExpandedCats((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const [editKey, setEditKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [editNameId, setEditNameId] = useState<string | null>(null);
  const [editNameValue, setEditNameValue] = useState("");
  const [addingToCatId, setAddingToCatId] = useState<string | null>(null);
  const [newItemName, setNewItemName] = useState("");

  const [startingBalances, setStartingBalances] = useState<Record<string, number>>(() => {
    const sb: Record<string, number> = {};
    initialCategories.forEach((cat) => cat.items.forEach((item) => { sb[item.id] = Number(item.starting_balance) || 0; }));
    return sb;
  });

  // ── Beregninger ──────────────────────────────────────────────────────────────

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
    (itemId: string): number => { let t = 0; for (let m = 1; m <= 12; m++) t += getVal(itemId, selectedYear, m); return t; },
    [getVal, selectedYear]
  );

  const getCatMonthTotal = useCallback(
    (cat: Category, year: number, month: number) => cat.items.reduce((s, i) => s + getVal(i.id, year, month), 0),
    [getVal]
  );
  const getCatAnnualTotal = useCallback(
    (cat: Category) => cat.items.reduce((s, i) => s + getAnnualTotal(i.id), 0),
    [getAnnualTotal]
  );

  const incomeCat = categories.find((c) => c.type === "income");
  const expenseCats = categories.filter((c) => ["loan", "expense", "insurance", "savings"].includes(c.type));

  // IDs til avsetningskonto-budsjettposter — skal IKKE telles som utgifter
  const bufferItemIds = new Set(
    bufferAccounts.map((a) => a.budget_item_id).filter((id): id is string => !!id)
  );

  const getMaintenanceMonthTotal = (year: number, month: number): number =>
    maintenanceTasks.filter((t) => { const d = new Date(t.due_date + "T00:00:00"); return d.getFullYear() === year && d.getMonth() + 1 === month; })
      .reduce((s, t) => s + t.estimated_cost, 0);
  const getMaintenanceAnnualTotal = (): number =>
    maintenanceTasks.filter((t) => new Date(t.due_date + "T00:00:00").getFullYear() === selectedYear).reduce((s, t) => s + t.estimated_cost, 0);

  const getPlannedMonthTotal = (year: number, month: number): number =>
    plannedExpenses.filter((e) => { const d = new Date(e.date + "T00:00:00"); return d.getFullYear() === year && d.getMonth() + 1 === month; })
      .reduce((s, e) => s + e.amount, 0);
  const getPlannedAnnualTotal = (): number =>
    plannedExpenses.filter((e) => new Date(e.date + "T00:00:00").getFullYear() === selectedYear).reduce((s, e) => s + e.amount, 0);

  // Beregn utgifter EKSKLUDERT avsetningskonto-poster (skal ikke dobbel-telles)
  const getExpensesExclBufferMonth = (year: number, month: number): number =>
    expenseCats.reduce((s, c) =>
      s + c.items.reduce((cs, i) =>
        bufferItemIds.has(i.id) ? cs : cs + getVal(i.id, year, month), 0), 0)
    + getMaintenanceMonthTotal(year, month) + getPlannedMonthTotal(year, month);

  const getExpensesExclBufferAnnual = (): number =>
    expenseCats.reduce((s, c) =>
      s + c.items.reduce((cs, i) =>
        bufferItemIds.has(i.id) ? cs : cs + getAnnualTotal(i.id), 0), 0)
    + getMaintenanceAnnualTotal() + getPlannedAnnualTotal();

  const getIncomeMonth = (year: number, month: number) =>
    incomeCat ? getCatMonthTotal(incomeCat, year, month) : 0;
  const getIncomeAnnual = () =>
    incomeCat ? getCatAnnualTotal(incomeCat) : 0;

  // Sum utgifter = ekskl. avsetning
  const getTotalExpensesMonth = (year: number, month: number) =>
    getExpensesExclBufferMonth(year, month);
  const getTotalExpensesAnnual = () =>
    getExpensesExclBufferAnnual();

  // Resultat = inntekter − utgifter (ekskl. avsetning)
  const getRestMonth = (year: number, month: number) =>
    getIncomeMonth(year, month) - getExpensesExclBufferMonth(year, month);
  const getRestAnnual = () =>
    getIncomeAnnual() - getExpensesExclBufferAnnual();

  // ── Sparingsprojeksjon ───────────────────────────────────────────────────────

  const savingsCat = categories.find((c) => c.type === "savings");

  // ── Simulert budsjett ────────────────────────────────────────────────────────

  const getSimVal = (itemId: string, catId: string, year: number, month: number): number =>
    getVal(itemId, year, month) * (1 + (simAdjustments[catId] ?? 0) / 100);

  const getSimCatMonthTotal = (cat: Category, year: number, month: number): number =>
    cat.items.reduce((s, i) => s + getSimVal(i.id, cat.id, year, month), 0);

  const getSimCatAnnualTotal = (cat: Category): number =>
    monthCols.reduce((s, col) => s + getSimCatMonthTotal(cat, col.year, col.month), 0);

  const getSimRestMonth = (year: number, month: number): number => {
    const inc = incomeCat ? getSimCatMonthTotal(incomeCat, year, month) : 0;
    const exp = expenseCats.reduce((s, c) =>
      s + c.items.reduce((cs, i) =>
        bufferItemIds.has(i.id) ? cs : cs + getSimVal(i.id, c.id, year, month), 0), 0);
    return inc - exp - getMaintenanceMonthTotal(year, month) - getPlannedMonthTotal(year, month);
  };

  const getSimRestAnnual = (): number =>
    monthCols.reduce((s, col) => s + getSimRestMonth(col.year, col.month), 0);

  // ── Anbefalt avsetning (dynamisk, likviditetsbasert) ─────────────────────────
  //
  // Algoritme: Finn minste månedlige avsetning X slik at avsetningssaldo
  // aldri går i minus ved noe fremtidig forfall.
  //
  // For hver kostnad c_i som forfaller om m_i måneder (kumulativt K_i):
  //   saldo + X * m_i - K_i ≥ 0  →  X ≥ (K_i - saldo) / m_i
  //
  // X_anbefalt = max(0, max over alle kostnader)
  //
  // Eksempel: saldo 250 000, kostnad 300 000 om 30 mnd
  //   X = (300 000 - 250 000) / 30 = 1 667 kr/mnd

  const getMonthlyRecommendation = (): number => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayYear = today.getFullYear();
    const todayMonth = today.getMonth() + 1; // 1-indeksert

    // Måneder fra nåværende måned til forfallsmåned (minimum 1)
    const monthsFrom = (date: Date): number => {
      const y = date.getFullYear();
      const m = date.getMonth() + 1;
      return Math.max(1, (y - todayYear) * 12 + (m - todayMonth));
    };

    // Alle fremtidige kostnader (vedlikehold + planlagte), sortert etter dato
    const allCosts = [
      ...maintenanceTasks
        .map((t) => ({ amount: t.estimated_cost, date: new Date(t.due_date + "T00:00:00") }))
        .filter((c) => c.date >= today),
      ...plannedExpenses
        .map((e) => ({ amount: e.amount, date: new Date(e.date + "T00:00:00") }))
        .filter((c) => c.date >= today),
    ].sort((a, b) => a.date.getTime() - b.date.getTime());

    if (allCosts.length === 0) return 0;

    const B = bufferStartBalance; // nåværende saldo på avsetningskonto
    let xRequired = 0;
    let cumCost = 0;

    for (const cost of allCosts) {
      cumCost += cost.amount;
      const m = monthsFrom(cost.date);
      // Hvor mye må settes av per måned for å dekke alle kostnader til og med denne?
      const needed = (cumCost - B) / m;
      xRequired = Math.max(xRequired, needed);
    }

    const xCost = Math.max(0, xRequired);

    // ── Bufferoppbygging mot målbeløp (lavere prioritet) ──────────────────────
    // Beregnes bare hvis alle kjente kostnader er dekket (dvs. xCost er minimum)
    // Fremgangsmåte: simuler hva buffersaldo blir etter alle kostnader er betalt,
    // og bygg opp mot målet over 12 måneder.
    const targetBalance = bufferAccounts.reduce((s, a) => s + (a.target_amount ?? 0), 0);
    let xBuffer = 0;
    if (targetBalance > 0) {
      // Prosjektert saldo etter alle kostnader er dekket (grovt estimat)
      const totalFutureCosts = allCosts.reduce((s, c) => s + c.amount, 0);
      const projectedBalance = B + xCost * (allCosts.length > 0 ? Math.max(...allCosts.map((c) => monthsFrom(c.date))) : 12) - totalFutureCosts;
      const bufferDeficit = Math.max(0, targetBalance - projectedBalance);
      xBuffer = bufferDeficit > 0 ? Math.ceil(bufferDeficit / 12) : 0;
    }

    return Math.ceil(xCost + xBuffer);
  };

  // ── Buffer-simulering ────────────────────────────────────────────────────────

  const bufferStartBalance = bufferAccounts.reduce((s, a) => s + a.balance, 0);
  const bufferMonthly = bufferAccounts.reduce((s, a) => s + a.monthly_amount, 0);

  // Beregn anbefalt månedlig avsetning (basert på fremtidige kostnader neste 12 mnd)
  const rec = getMonthlyRecommendation();
  // Tak for månedlig innbetaling: bruk det høyeste av planlagt beløp og anbefalt.
  // Hvis begge er 0 (ingen fremtidige kostnader / ingen mål satt): sett inn hele overskuddet.
  const avsetningTak = Math.max(bufferMonthly, rec);

  const bufferSaldo: {
    year: number; month: number; balance: number;
    contribution: number; draw: number; costs: number;
  }[] = [];
  if (bufferAccounts.length > 0) {
    let running = bufferStartBalance;
    for (const col of monthCols) {
      const resultat = getRestMonth(col.year, col.month);
      const costs = getMaintenanceMonthTotal(col.year, col.month) + getPlannedMonthTotal(col.year, col.month);
      // Positivt resultat → sett av opp til avsetningstaket (eller hele overskuddet)
      // Negativt resultat → trekk fra buffer
      let contribution = 0;
      let draw = 0;
      if (resultat > 0) {
        contribution = avsetningTak > 0 ? Math.min(resultat, avsetningTak) : resultat;
        running += contribution;
      } else {
        draw = Math.abs(resultat);
        running -= draw;
      }
      bufferSaldo.push({ year: col.year, month: col.month, balance: running, contribution, draw, costs });
    }
  }

  const bufferBalanceColor = (bal: number) => {
    if (bal < 0) return "text-red-600 font-bold";
    if (bal < bufferStartBalance * 0.2) return "text-amber-600 font-semibold";
    return "text-emerald-700 font-semibold";
  };

  const bufferBgColor = (bal: number, isCurrent: boolean) => {
    if (bal < 0) return isCurrent ? "bg-red-100" : "bg-red-50/60";
    if (bal < bufferStartBalance * 0.2) return isCurrent ? "bg-amber-100" : "bg-amber-50/60";
    return isCurrent ? "bg-emerald-100/60" : "";
  };

  // ── Slett ────────────────────────────────────────────────────────────────────

  const handleDeleteAll = async () => {
    setDeleting(true);
    await supabase.from("budget_overrides").delete().neq("item_id", "00000000-0000-0000-0000-000000000000");
    const allItemIds = categories.flatMap((c) => c.items.map((i) => i.id));
    if (allItemIds.length > 0) await supabase.from("budget_items").update({ monthly_default: 0 }).in("id", allItemIds);
    setDefaults((prev) => { const n = { ...prev }; allItemIds.forEach((id) => { n[id] = 0; }); return n; });
    setOverrides({});
    setDeleting(false);
    setConfirmDelete(false);
  };

  // ── Lagre celler ─────────────────────────────────────────────────────────────

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

  const startEditName = (item: Item) => { setEditNameId(item.id); setEditNameValue(item.name); };

  const saveItemName = async (itemId: string, categoryId: string) => {
    const name = editNameValue.trim();
    if (!name) { setEditNameId(null); return; }
    await supabase.from("budget_items").update({ name }).eq("id", itemId);
    setCategories((prev) => prev.map((cat) => cat.id === categoryId ? { ...cat, items: cat.items.map((i) => i.id === itemId ? { ...i, name } : i) } : cat));
    setEditNameId(null);
  };

  const deleteItem = async (itemId: string, categoryId: string) => {
    if (!confirm("Slett denne posten?")) return;
    await supabase.from("budget_items").delete().eq("id", itemId);
    setCategories((prev) => prev.map((cat) => cat.id === categoryId ? { ...cat, items: cat.items.filter((i) => i.id !== itemId) } : cat));
    setDefaults((prev) => { const n = { ...prev }; delete n[itemId]; return n; });
  };

  const addItem = async (categoryId: string) => {
    const name = newItemName.trim();
    if (!name) { setAddingToCatId(null); return; }
    const cat = categories.find((c) => c.id === categoryId);
    const maxOrder = Math.max(0, ...(cat?.items.map((i) => i.sort_order) ?? []));
    const { data: newItem } = await supabase.from("budget_items")
      .insert({ category_id: categoryId, name, sort_order: maxOrder + 1, monthly_default: 0, source: "manual" })
      .select().single();
    if (newItem) {
      setCategories((prev) => prev.map((c) => c.id === categoryId ? { ...c, items: [...c.items, newItem as Item] } : c));
      setDefaults((prev) => ({ ...prev, [newItem.id]: 0 }));
    }
    setNewItemName(""); setAddingToCatId(null);
  };

  // ── Legg til ny kategori ─────────────────────────────────────────────────────

  const [addingCat, setAddingCat] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatType, setNewCatType] = useState<"income" | "expense" | "loan" | "insurance" | "savings">("expense");

  const addCategory = async () => {
    const name = newCatName.trim();
    if (!name) { setAddingCat(false); return; }
    const maxOrder = Math.max(0, ...categories.map((c) => c.sort_order));
    const { data: newCat } = await supabase.from("budget_categories")
      .insert({ name, type: newCatType, sort_order: maxOrder + 1 })
      .select().single();
    if (newCat) {
      setCategories((prev) => [...prev, { ...newCat, items: [] } as Category]);
    }
    setNewCatName(""); setAddingCat(false);
  };

  // ── Slett kategori ───────────────────────────────────────────────────────────

  const deleteCategory = async (catId: string) => {
    if (!confirm("Slett hele kategorien og alle poster i den?")) return;
    await supabase.from("budget_items").delete().eq("category_id", catId);
    await supabase.from("budget_categories").delete().eq("id", catId);
    setCategories((prev) => prev.filter((c) => c.id !== catId));
  };

  // ── Sett opp standard budsjett ───────────────────────────────────────────────

  const [settingUp, setSettingUp] = useState(false);

  const setupDefaultCategories = async () => {
    setSettingUp(true);
    const defaults_setup: { name: string; type: string; sort_order: number; items: string[] }[] = [
      { name: "Inntekter", type: "income", sort_order: 1, items: ["Lønn partner 1", "Lønn partner 2", "Trygd / NAV"] },
      { name: "Bolig", type: "expense", sort_order: 2, items: ["Husleie / lån", "Strøm", "Forsikring bolig", "Internett / TV"] },
      { name: "Mat og dagligvarer", type: "expense", sort_order: 3, items: ["Dagligvarer", "Restaurant / takeaway"] },
      { name: "Transport", type: "expense", sort_order: 4, items: ["Drivstoff / lading", "Kollektivtransport", "Bilforsikring", "Bompenger"] },
      { name: "Barn", type: "expense", sort_order: 5, items: ["Barnehage / SFO", "Klær og utstyr", "Aktiviteter"] },
      { name: "Abonnementer", type: "expense", sort_order: 6, items: ["Strømmetjenester", "Treningssenter", "Mobilabonnement"] },
      { name: "Sparing", type: "savings", sort_order: 7, items: ["Bufferkonto", "Pensjonssparing", "BSU"] },
    ];

    for (const cat of defaults_setup) {
      const { data: newCat } = await supabase.from("budget_categories")
        .insert({ name: cat.name, type: cat.type, sort_order: cat.sort_order })
        .select().single();
      if (newCat) {
        const items: Item[] = [];
        for (let i = 0; i < cat.items.length; i++) {
          const { data: newItem } = await supabase.from("budget_items")
            .insert({ category_id: newCat.id, name: cat.items[i], sort_order: i + 1, monthly_default: 0, source: "manual" })
            .select().single();
          if (newItem) items.push(newItem as Item);
        }
        setCategories((prev) => [...prev, { ...newCat, items } as Category]);
      }
    }
    setSettingUp(false);
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <main className={embedded ? "text-gray-900" : "min-h-screen bg-gray-50 text-gray-900"}>

      {/* ── Header ── */}
      <div className="sticky top-0 z-20 bg-gray-50 border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          {!embedded && (
            <div className="flex items-center gap-3">
              <button onClick={() => router.back()} className="flex items-center gap-1.5 text-gray-500 hover:text-gray-900 transition-colors text-sm px-2 py-1.5 rounded-lg hover:bg-white">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                Tilbake
              </button>
              <div className="w-px h-5 bg-gray-100" />
              <h1 className="text-lg font-semibold">Familie økonomi</h1>
            </div>
          )}
          {embedded && <div />}
          <div className="flex items-center gap-2">
            {!embedded && <HomeButton />}
            <div className="flex items-center gap-1 bg-white rounded-lg px-1 py-0.5">
              <button onClick={() => setSelectedYear((y) => Math.max(currentYear, y - 1))} disabled={selectedYear <= currentYear}
                className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-700 disabled:opacity-30 transition-colors text-sm">‹</button>
              <span className={`text-sm font-semibold px-1 min-w-[44px] text-center ${selectedYear === currentYear ? "text-blue-500" : "text-gray-700"}`}>{selectedYear}</span>
              <button onClick={() => setSelectedYear((y) => Math.min(currentYear + 10, y + 1))} disabled={selectedYear >= currentYear + 10}
                className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-700 disabled:opacity-30 transition-colors text-sm">›</button>
            </div>
            {selectedYear !== currentYear && (
              <button onClick={() => setSelectedYear(currentYear)} className="text-xs text-blue-500 hover:text-blue-600 transition-colors">I dag</button>
            )}
            <button onClick={() => setConfirmDelete(true)}
              className="text-xs text-gray-400 hover:text-red-500 transition-colors px-2 py-1 rounded hover:bg-white" title="Slett alt grunnlag">
              🗑 Slett alt
            </button>
          </div>
        </div>
        <div className="flex gap-1">
          <button onClick={() => setActiveTab("actual")}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${activeTab === "actual" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
            Faktisk budsjett
          </button>
          <button onClick={() => setActiveTab("simulated")}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${activeTab === "simulated" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
            🎯 Simulert budsjett
          </button>
        </div>
      </div>

      {/* ── Bekreft slett ── */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl">
            <h2 className="text-lg font-semibold mb-2">Slett alt grunnlag?</h2>
            <p className="text-sm text-gray-500 mb-5">Dette nullstiller alle tallverdier. Postene og kategoriene beholdes.</p>
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

      {/* ════════════════════════════════════════════════════════════════════════
          FAKTISK BUDSJETT
          ════════════════════════════════════════════════════════════════════════ */}
      {activeTab === "actual" && (
        <>
          {/* ── Tom tilstand ── */}
          {categories.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
              <div className="text-5xl mb-4">💰</div>
              <h2 className="text-xl font-bold text-gray-800 mb-2">Ingen budsjettdata ennå</h2>
              <p className="text-sm text-gray-500 mb-8 max-w-sm">
                Sett opp budsjettet ditt med standard norske husholdningskategorier, eller start fra scratch.
              </p>
              <button
                onClick={setupDefaultCategories}
                disabled={settingUp}
                className="px-6 py-3 rounded-xl text-white text-sm font-semibold disabled:opacity-50 transition-colors mb-3"
                style={{ background: "linear-gradient(135deg, #8B5CF6, #22D3EE)" }}
              >
                {settingUp ? "Setter opp…" : "✨ Sett opp standard budsjett"}
              </button>
              <button
                onClick={() => setAddingCat(true)}
                className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
              >
                Eller legg til en kategori manuelt
              </button>
              {addingCat && (
                <div className="mt-4 flex items-center gap-2 flex-wrap justify-center">
                  <input
                    type="text" value={newCatName} onChange={(e) => setNewCatName(e.target.value)}
                    placeholder="Kategorinavn…" autoFocus
                    onKeyDown={(e) => { if (e.key === "Enter") addCategory(); if (e.key === "Escape") setAddingCat(false); }}
                    className="bg-gray-100 rounded-lg px-3 py-2 text-sm outline-none ring-1 ring-blue-500 w-44"
                  />
                  <select value={newCatType} onChange={(e) => setNewCatType(e.target.value as typeof newCatType)}
                    className="bg-gray-100 rounded-lg px-3 py-2 text-sm outline-none ring-1 ring-gray-300">
                    <option value="income">Inntekt</option>
                    <option value="expense">Utgift</option>
                    <option value="loan">Lån</option>
                    <option value="insurance">Forsikring</option>
                    <option value="savings">Sparing</option>
                  </select>
                  <button onClick={addCategory} className="px-3 py-2 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600">Legg til</button>
                  <button onClick={() => setAddingCat(false)} className="text-sm text-gray-400 hover:text-gray-600">Avbryt</button>
                </div>
              )}
            </div>
          )}

          {categories.length > 0 && (
          <>
          <p className="px-4 py-2 text-xs text-gray-400">
            Klikk et beløp for å redigere. Første verdi du setter gjelder alle måneder.{" "}
            <span className="text-blue-500">Blå tall</span> er månedlige unntak.
          </p>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse" style={{ minWidth: "700px" }}>
              <colgroup>
                <col style={{ width: "200px", minWidth: "200px" }} />
                {monthCols.map((_, i) => <col key={i} style={{ width: "72px", minWidth: "72px" }} />)}
                <col style={{ width: "80px", minWidth: "80px" }} />
              </colgroup>
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="sticky left-0 z-10 bg-gray-50 text-left px-4 py-2 text-xs text-gray-400 uppercase tracking-wide font-medium">Post</th>
                  {monthCols.map((col) => (
                    <th key={`h-${col.year}-${col.month}`} className={`text-right px-2 py-2 text-xs uppercase tracking-wide font-medium ${col.isCurrent ? "text-blue-500" : "text-gray-400"}`}>
                      {col.label}
                    </th>
                  ))}
                  <th className="text-right px-2 py-2 text-xs text-gray-400 uppercase tracking-wide font-medium">År</th>
                </tr>
              </thead>
              <tbody>

                {/* ── Budsjett-kategorier ── */}
                {categories.map((cat) => {
                  const isExpanded = expandedCats.has(cat.id);
                  return (
                    <React.Fragment key={cat.id}>
                      <tr onClick={() => toggleCat(cat.id)} className="cursor-pointer hover:bg-gray-50 border-t border-gray-100 group">
                        <td className="sticky left-0 bg-white group-hover:bg-gray-50 px-4 py-2.5 transition-colors">
                          <div className="flex items-center gap-2">
                            <span className={`text-gray-400 text-xs transition-transform ${isExpanded ? "rotate-90" : ""}`}>▶</span>
                            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">{cat.name}</span>
                            <span className="text-xs text-gray-300">{cat.items.length} poster</span>
                            <button
                              onClick={(e) => { e.stopPropagation(); deleteCategory(cat.id); }}
                              className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity text-gray-300 hover:text-red-400 p-0.5"
                              title="Slett kategori"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </td>
                        {monthCols.map((col) => (
                          <td key={`cs-${cat.id}-${col.year}-${col.month}`}
                            className={`text-right px-2 py-2.5 text-sm font-semibold ${col.isCurrent ? "text-gray-900 bg-gray-100" : "text-gray-700"}`}
                            onClick={(e) => e.stopPropagation()}>
                            {fmt(getCatMonthTotal(cat, col.year, col.month))}
                          </td>
                        ))}
                        <td className="text-right px-2 py-2.5 text-sm font-semibold text-gray-500" onClick={(e) => e.stopPropagation()}>
                          {fmt(getCatAnnualTotal(cat))}
                        </td>
                      </tr>

                      {isExpanded && (
                        <>
                          {cat.items.map((item) => (
                            <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50 group">
                              <td className="sticky left-0 bg-gray-50 group-hover:bg-gray-50 px-4 py-1.5 pl-8">
                                {editNameId === item.id ? (
                                  <input type="text" value={editNameValue} onChange={(e) => setEditNameValue(e.target.value)}
                                    onBlur={() => saveItemName(item.id, cat.id)}
                                    onKeyDown={(e) => { if (e.key === "Enter") saveItemName(item.id, cat.id); if (e.key === "Escape") setEditNameId(null); }}
                                    autoFocus className="w-full bg-gray-100 rounded px-2 py-0.5 text-sm outline-none ring-1 ring-blue-500" />
                                ) : (
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-sm text-gray-600">{item.name}</span>
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                                      <button onClick={() => startEditName(item)} className="text-gray-400 hover:text-blue-500 p-0.5">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                      </button>
                                      <button onClick={() => deleteItem(item.id, cat.id)} className="text-gray-400 hover:text-red-500 p-0.5">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
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
                                    className={["text-right px-2 py-1.5 text-sm cursor-pointer hover:bg-gray-200 transition-colors",
                                      col.isCurrent ? "bg-gray-100" : "", isOvr ? "text-blue-600" : ""].filter(Boolean).join(" ")}
                                    onClick={() => editKey !== cellKey && (setEditKey(cellKey), setEditValue(val === 0 ? "" : String(val)))}>
                                    {editKey === cellKey ? (
                                      <input type="number" value={editValue} onChange={(e) => setEditValue(e.target.value)}
                                        onBlur={() => saveCell(item.id, col.year, col.month)}
                                        onKeyDown={(e) => { if (e.key === "Enter") saveCell(item.id, col.year, col.month); if (e.key === "Escape") setEditKey(null); }}
                                        autoFocus className="w-full text-right bg-blue-100 rounded px-1 outline-none ring-1 ring-blue-500 text-sm" />
                                    ) : (
                                      <span className={isOvr ? "underline decoration-dotted" : ""}>{fmt(val)}</span>
                                    )}
                                  </td>
                                );
                              })}
                              <td className="text-right px-2 py-1.5 text-sm text-gray-400">{fmt(getAnnualTotal(item.id))}</td>
                            </tr>
                          ))}
                          <tr className="border-b border-gray-200">
                            <td colSpan={numCols} className="sticky left-0 px-4 py-1.5 pl-8 bg-gray-50">
                              {addingToCatId === cat.id ? (
                                <div className="flex items-center gap-2">
                                  <input type="text" placeholder="Navn på ny post…" value={newItemName} onChange={(e) => setNewItemName(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === "Enter") addItem(cat.id); if (e.key === "Escape") { setAddingToCatId(null); setNewItemName(""); } }}
                                    autoFocus className="bg-gray-100 rounded px-2 py-1 text-sm outline-none ring-1 ring-blue-500 w-48" />
                                  <button onClick={() => addItem(cat.id)} className="text-xs text-blue-500 hover:text-blue-600">Legg til</button>
                                  <button onClick={() => { setAddingToCatId(null); setNewItemName(""); }} className="text-xs text-gray-400 hover:text-gray-700">Avbryt</button>
                                </div>
                              ) : (
                                <button onClick={() => { setAddingToCatId(cat.id); setNewItemName(""); }}
                                  className="text-xs text-gray-400 hover:text-gray-500 transition-colors flex items-center gap-1">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
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

                {/* ── Engangsutgifter ── */}
                <tr><td colSpan={numCols} className="py-1" /></tr>
                {(maintenanceTasks.length > 0 || plannedExpenses.length > 0) && (() => {
                  return (
                    <>
                      <tr>
                        <td colSpan={numCols} className="sticky left-0 bg-white px-4 py-2 border-t-2 border-gray-200">
                          <div className="flex items-center justify-between">
                            <button onClick={() => setShowOneTimeDetails((v) => !v)}
                              className="flex items-center gap-2 text-xs font-bold text-gray-600 uppercase tracking-wider hover:text-gray-900 transition-colors">
                              <span className={`transition-transform text-gray-400 ${showOneTimeDetails ? "rotate-90" : ""}`}>▶</span>
                              💸 Engangsutgifter
                              <span className="text-gray-400 font-normal normal-case tracking-normal">({maintenanceTasks.length + plannedExpenses.length} poster)</span>
                            </button>
                            <div className="flex gap-3">
                              <Link href="/eiendeler" className="text-xs text-gray-400 hover:text-gray-600 transition-colors">Vedlikehold →</Link>
                              <Link href="/okonomi?tab=planlagte" className="text-xs text-gray-400 hover:text-gray-600 transition-colors">Planlagte →</Link>
                            </div>
                          </div>
                        </td>
                      </tr>
                      {showOneTimeDetails && (
                        <>
                          {maintenanceTasks.length > 0 && (
                            <>
                              <tr><td colSpan={numCols} className="sticky left-0 px-4 py-1 bg-orange-50"><span className="text-xs text-orange-500 font-semibold">🔧 Vedlikehold</span></td></tr>
                              {maintenanceTasks.map((task) => {
                                const d = new Date(task.due_date + "T00:00:00");
                                const ty = d.getFullYear(); const tm = d.getMonth() + 1;
                                return (
                                  <tr key={task.id} className="border-b border-gray-100 hover:bg-orange-50/40">
                                    <td className="sticky left-0 bg-gray-50 px-4 py-1.5">
                                      <div className="text-sm text-gray-700 truncate">{task.asset_name}</div>
                                      <div className="text-xs text-gray-400 truncate">{task.title}</div>
                                    </td>
                                    {monthCols.map((col) => {
                                      const hit = col.year === ty && col.month === tm;
                                      return <td key={`mt-${task.id}-${col.year}-${col.month}`} className={`text-right px-2 py-1.5 text-sm ${col.isCurrent ? "bg-gray-100" : ""} ${hit ? "text-orange-600 font-medium" : "text-gray-300"}`}>{hit ? task.estimated_cost.toLocaleString("nb-NO") : "–"}</td>;
                                    })}
                                    <td className="text-right px-2 py-1.5 text-sm text-gray-400">{ty === selectedYear ? task.estimated_cost.toLocaleString("nb-NO") : "–"}</td>
                                  </tr>
                                );
                              })}
                            </>
                          )}
                          {plannedExpenses.length > 0 && (
                            <>
                              <tr><td colSpan={numCols} className="sticky left-0 px-4 py-1 bg-violet-50"><span className="text-xs text-violet-500 font-semibold">📅 Planlagte kostnader</span></td></tr>
                              {plannedExpenses.map((expense) => {
                                const d = new Date(expense.date + "T00:00:00");
                                const ey = d.getFullYear(); const em = d.getMonth() + 1;
                                return (
                                  <tr key={expense.id} className="border-b border-gray-100 hover:bg-violet-50/40">
                                    <td className="sticky left-0 bg-gray-50 px-4 py-1.5">
                                      <div className="flex items-center gap-1.5">
                                        <span className="text-sm">{CAT_EMOJI[expense.category] ?? "📦"}</span>
                                        <span className="text-sm text-gray-700 truncate">{expense.title}</span>
                                      </div>
                                    </td>
                                    {monthCols.map((col) => {
                                      const hit = col.year === ey && col.month === em;
                                      return <td key={`pe-${expense.id}-${col.year}-${col.month}`} className={`text-right px-2 py-1.5 text-sm ${col.isCurrent ? "bg-gray-100" : ""} ${hit ? "text-violet-600 font-medium" : "text-gray-300"}`}>{hit ? expense.amount.toLocaleString("nb-NO") : "–"}</td>;
                                    })}
                                    <td className="text-right px-2 py-1.5 text-sm text-gray-400">{ey === selectedYear ? expense.amount.toLocaleString("nb-NO") : "–"}</td>
                                  </tr>
                                );
                              })}
                            </>
                          )}
                        </>
                      )}
                      {/* Sum engangsutgifter */}
                      <tr className="border-b border-gray-200 bg-gray-50">
                        <td className="sticky left-0 bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700">Sum engangsutgifter</td>
                        {monthCols.map((col) => {
                          const total = getMaintenanceMonthTotal(col.year, col.month) + getPlannedMonthTotal(col.year, col.month);
                          return <td key={`os-${col.year}-${col.month}`} className={`text-right px-2 py-2 text-sm font-semibold ${total > 0 ? "text-gray-800" : "text-gray-300"} ${col.isCurrent ? "bg-gray-100" : ""}`}>{total > 0 ? total.toLocaleString("nb-NO") : "–"}</td>;
                        })}
                        <td className="text-right px-2 py-2 text-sm font-semibold text-gray-700">
                          {(getMaintenanceAnnualTotal() + getPlannedAnnualTotal()) > 0 ? (getMaintenanceAnnualTotal() + getPlannedAnnualTotal()).toLocaleString("nb-NO") : "–"}
                        </td>
                      </tr>
                    </>
                  );
                })()}

                {/* ── Resultatsammendrag ── */}
                {(() => {
                  return (
                    <>
                      <tr><td colSpan={numCols} className="py-1" /></tr>

                      {/* Sum inntekter */}
                      <tr className="border-t-2 border-gray-200 bg-gray-50/40">
                        <td className="sticky left-0 bg-gray-50/40 px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Sum inntekter</td>
                        {monthCols.map((col) => (
                          <td key={`inc-${col.year}-${col.month}`} className={`text-right px-2 py-2 text-sm font-semibold text-green-700 ${col.isCurrent ? "bg-green-50/60" : ""}`}>
                            {fmt(getIncomeMonth(col.year, col.month))}
                          </td>
                        ))}
                        <td className="text-right px-2 py-2 text-sm font-semibold text-green-700">{fmt(getIncomeAnnual())}</td>
                      </tr>

                      {/* Sum utgifter */}
                      <tr className="bg-gray-50/40">
                        <td className="sticky left-0 bg-gray-50/40 px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                          Sum utgifter{bufferItemIds.size > 0 ? <span className="text-gray-400 font-normal normal-case tracking-normal ml-1">(ekskl. avsetning)</span> : null}
                        </td>
                        {monthCols.map((col) => (
                          <td key={`exp-${col.year}-${col.month}`} className={`text-right px-2 py-2 text-sm font-semibold text-gray-700 ${col.isCurrent ? "bg-gray-100/80" : ""}`}>
                            {fmt(getTotalExpensesMonth(col.year, col.month))}
                          </td>
                        ))}
                        <td className="text-right px-2 py-2 text-sm font-semibold text-gray-700">{fmt(getTotalExpensesAnnual())}</td>
                      </tr>

                      {/* Resultat */}
                      <tr className="border-t border-emerald-200/60 bg-emerald-50/50">
                        <td className="sticky left-0 bg-emerald-50/50 px-4 py-2.5 text-sm font-bold text-gray-900">Resultat</td>
                        {monthCols.map((col) => {
                          const val = getRestMonth(col.year, col.month);
                          return <td key={`rest-${col.year}-${col.month}`} className={`text-right px-2 py-2.5 text-sm font-bold ${val >= 0 ? "text-green-600" : "text-red-500"}`}>{fmt(val)}</td>;
                        })}
                        <td className={`text-right px-2 py-2.5 text-sm font-bold ${getRestAnnual() >= 0 ? "text-green-600" : "text-red-500"}`}>{fmt(getRestAnnual())}</td>
                      </tr>

                      {/* Anbefalt avsetning — med likviditetsbegrensning */}
                      {rec > 0 && (() => {
                        // Beregn gap per måned: anbefalt vs. faktisk mulig (begrenset av resultat)
                        const monthGaps = monthCols.map((col) => {
                          const resultat = getRestMonth(col.year, col.month);
                          const possible = Math.max(0, Math.min(resultat, rec));
                          const gap = rec - possible;
                          return { col, possible, gap, hasGap: gap > 0 };
                        });
                        const anyGap = monthGaps.some((g) => g.hasGap);

                        // Inneværende måneds gap (for varselkort)
                        const nowYear = new Date().getFullYear();
                        const nowMonth = new Date().getMonth() + 1;
                        const currentGap = monthGaps.find(
                          (g) => g.col.year === nowYear && g.col.month === nowMonth
                        );

                        return (
                          <>
                            {/* Anbefalt avsetning (mål) */}
                            <tr className="bg-blue-50/60 border-t border-blue-100">
                              <td className="sticky left-0 bg-blue-50/60 px-4 py-2">
                                <div className="text-sm font-semibold text-blue-700">📊 Anbefalt avsetning</div>
                                <div className="text-xs text-blue-400 mt-0.5">Mål basert på fremtidige kostnader og buffer</div>
                              </td>
                              {monthCols.map((col) => (
                                <td key={`rec-${col.year}-${col.month}`} className={`text-right px-2 py-2 text-sm font-semibold text-blue-600 ${col.isCurrent ? "bg-blue-100/80" : ""}`}>
                                  {rec.toLocaleString("nb-NO")}
                                </td>
                              ))}
                              <td className="text-right px-2 py-2 text-sm font-semibold text-blue-600">{(rec * 12).toLocaleString("nb-NO")}</td>
                            </tr>

                            {/* Faktisk mulig avsetning — vises kun hvis gap finnes */}
                            {anyGap && (
                              <tr className="border-t border-orange-100">
                                <td className="sticky left-0 bg-orange-50/50 px-4 py-2">
                                  <div className="text-sm font-semibold text-orange-700">⚠️ Faktisk mulig avsetning</div>
                                  <div className="text-xs text-orange-400 mt-0.5">Begrenset av tilgjengelig overskudd</div>
                                </td>
                                {monthGaps.map(({ col, possible, gap, hasGap }) => (
                                  <td key={`possible-${col.year}-${col.month}`} className={`text-right px-2 py-2 ${col.isCurrent ? "bg-orange-50" : ""}`}>
                                    <div className={`text-sm font-semibold ${hasGap ? "text-orange-600" : "text-green-600"}`}>
                                      {possible > 0 ? possible.toLocaleString("nb-NO") : "–"}
                                    </div>
                                    {hasGap && (
                                      <div className="text-xs text-red-400 mt-0.5">
                                        -{gap.toLocaleString("nb-NO")}
                                      </div>
                                    )}
                                  </td>
                                ))}
                                <td className="text-right px-2 py-2 text-xs text-gray-400">–</td>
                              </tr>
                            )}

                            {/* Varselkort for inneværende måned */}
                            {currentGap && currentGap.hasGap && (
                              <tr>
                                <td colSpan={numCols} className="px-4 py-3">
                                  <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                                    <div className="flex items-start gap-3">
                                      <span className="text-lg flex-shrink-0">⚠️</span>
                                      <div className="flex-1">
                                        <div className="text-sm font-semibold text-orange-800 mb-2">
                                          Budsjettet er ikke tilstrekkelig for anbefalt avsetning denne måneden
                                        </div>
                                        <div className="grid grid-cols-3 gap-3">
                                          <div className="bg-white rounded-lg p-2.5 text-center">
                                            <div className="text-xs text-gray-400 mb-0.5">Anbefalt</div>
                                            <div className="text-sm font-bold text-blue-600">{rec.toLocaleString("nb-NO")} kr</div>
                                          </div>
                                          <div className="bg-white rounded-lg p-2.5 text-center">
                                            <div className="text-xs text-gray-400 mb-0.5">Faktisk mulig</div>
                                            <div className="text-sm font-bold text-orange-600">{currentGap.possible.toLocaleString("nb-NO")} kr</div>
                                          </div>
                                          <div className="bg-red-50 rounded-lg p-2.5 text-center">
                                            <div className="text-xs text-gray-400 mb-0.5">Mangler</div>
                                            <div className="text-sm font-bold text-red-600">{currentGap.gap.toLocaleString("nb-NO")} kr</div>
                                          </div>
                                        </div>
                                        <p className="text-xs text-orange-600 mt-2">
                                          Avsetningssaldoen vil øke saktere enn anbefalt. Vurder å redusere utgifter eller øke inntekter.
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </>
                        );
                      })()}

                    </>
                  );
                })()}

                {/* ── Avsetningssaldo ── */}
                {bufferAccounts.length > 0 && (
                  <>
                    <tr><td colSpan={numCols} className="py-1" /></tr>
                    <tr
                      className="border-t border-blue-200/60 bg-blue-50/40 cursor-pointer hover:bg-blue-50/70 transition-colors"
                      onClick={() => setShowBufferDetails((v) => !v)}
                    >
                      <td className="sticky left-0 bg-blue-50/40 px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <span className={`text-gray-400 text-xs transition-transform ${showBufferDetails ? "rotate-90" : ""}`}>▶</span>
                          <span className="text-sm font-bold text-gray-800">💰 Avsetningssaldo</span>
                          <span className="text-xs text-gray-400 font-normal">
                            {bufferAccounts.map((a) => a.name).join(", ")} · faktisk mulig avsetning
                          </span>
                        </div>
                      </td>
                      {bufferSaldo.map((s) => (
                        <td
                          key={`buf-${s.year}-${s.month}`}
                          className={`text-right px-2 py-2.5 text-sm ${bufferBalanceColor(s.balance)} ${bufferBgColor(s.balance, monthCols.find((c) => c.year === s.year && c.month === s.month)?.isCurrent ?? false)}`}
                        >
                          {Math.round(s.balance).toLocaleString("nb-NO")}
                        </td>
                      ))}
                      <td className="text-right px-2 py-2.5 text-xs text-gray-400">–</td>
                    </tr>

                    {showBufferDetails && (
                      <>
                        {/* + Bidrag fra overskudd */}
                        <tr className="bg-blue-50/20">
                          <td className="sticky left-0 bg-blue-50/20 px-4 py-1.5 pl-10 text-xs text-emerald-700">
                            + Avsetning (fra overskudd)
                          </td>
                          {bufferSaldo.map((s) => (
                            <td key={`buf-contrib-${s.year}-${s.month}`} className={`text-right px-2 py-1.5 text-xs text-emerald-600 ${monthCols.find((c) => c.year === s.year && c.month === s.month)?.isCurrent ? "bg-blue-100/60" : ""}`}>
                              {s.contribution > 0 ? `+${s.contribution.toLocaleString("nb-NO")}` : "–"}
                            </td>
                          ))}
                          <td className="text-right px-2 py-1.5 text-xs text-gray-400">
                            {bufferSaldo.reduce((t, s) => t + s.contribution, 0) > 0
                              ? bufferSaldo.reduce((t, s) => t + s.contribution, 0).toLocaleString("nb-NO")
                              : "–"}
                          </td>
                        </tr>

                        {/* − Trekk fra buffer (underskudd) */}
                        <tr className="bg-blue-50/20 border-b border-blue-100/60">
                          <td className="sticky left-0 bg-blue-50/20 px-4 py-1.5 pl-10 text-xs text-red-600">
                            − Trekk (underskudd)
                          </td>
                          {bufferSaldo.map((s) => (
                            <td key={`buf-draw-${s.year}-${s.month}`} className={`text-right px-2 py-1.5 text-xs ${s.draw > 0 ? "text-red-500 font-medium" : "text-gray-300"} ${monthCols.find((c) => c.year === s.year && c.month === s.month)?.isCurrent ? "bg-blue-100/60" : ""}`}>
                              {s.draw > 0 ? `-${s.draw.toLocaleString("nb-NO")}` : "–"}
                            </td>
                          ))}
                          <td className="text-right px-2 py-1.5 text-xs text-gray-400">
                            {bufferSaldo.reduce((t, s) => t + s.draw, 0) > 0
                              ? `-${bufferSaldo.reduce((t, s) => t + s.draw, 0).toLocaleString("nb-NO")}`
                              : "–"}
                          </td>
                        </tr>
                      </>
                    )}
                  </>
                )}

                <tr><td colSpan={numCols} className="py-4" /></tr>
              </tbody>
            </table>
          </div>

          {/* Legg til kategori */}
          <div className="px-4 py-4 border-t border-gray-100">
            {addingCat ? (
              <div className="flex items-center gap-2 flex-wrap">
                <input
                  type="text" value={newCatName} onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="Kategorinavn…" autoFocus
                  onKeyDown={(e) => { if (e.key === "Enter") addCategory(); if (e.key === "Escape") setAddingCat(false); }}
                  className="bg-gray-100 rounded-lg px-3 py-2 text-sm outline-none ring-1 ring-blue-500 w-44"
                />
                <select value={newCatType} onChange={(e) => setNewCatType(e.target.value as typeof newCatType)}
                  className="bg-gray-100 rounded-lg px-3 py-2 text-sm outline-none ring-1 ring-gray-300">
                  <option value="income">Inntekt</option>
                  <option value="expense">Utgift</option>
                  <option value="loan">Lån</option>
                  <option value="insurance">Forsikring</option>
                  <option value="savings">Sparing</option>
                </select>
                <button onClick={addCategory} className="px-3 py-2 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600">Legg til</button>
                <button onClick={() => { setAddingCat(false); setNewCatName(""); }} className="text-sm text-gray-400 hover:text-gray-600">Avbryt</button>
              </div>
            ) : (
              <button onClick={() => setAddingCat(true)}
                className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Legg til kategori
              </button>
            )}
          </div>
          </>
          )}
        </>
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          SIMULERT BUDSJETT
          ════════════════════════════════════════════════════════════════════════ */}
      {activeTab === "simulated" && (
        <div>
          {/* Justeringspanel */}
          <div className="p-4 max-w-2xl mx-auto">
            <div className="bg-white rounded-xl p-4 mb-4">
              <p className="text-sm text-gray-500 mb-3">
                Simuler effekten av prosentvise endringer per kategori. Angi justering direkte i tabellen nedenfor, eller bruk global justering.
              </p>
              <div className="flex items-center gap-3 flex-wrap">
                <label className="text-sm text-gray-600 whitespace-nowrap">Global justering:</label>
                <input type="number" value={globalAdj} onChange={(e) => setGlobalAdj(parseFloat(e.target.value) || 0)}
                  className="w-20 p-2 rounded-lg bg-gray-100 outline-none focus:ring-2 focus:ring-blue-500 text-sm text-center" placeholder="0" />
                <span className="text-sm text-gray-400">%</span>
                <button onClick={() => { const n: Record<string, number> = {}; expenseCats.forEach((c) => { n[c.id] = globalAdj; }); setSimAdjustments(n); }}
                  className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-xs rounded-lg transition-colors">Bruk på alle</button>
                <button onClick={() => setSimAdjustments({})}
                  className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs rounded-lg transition-colors">Nullstill</button>
              </div>
            </div>
          </div>

          {categories.length === 0 && (
            <p className="text-center text-gray-400 text-sm py-8 px-4">Ingen budsjettdata å simulere. Legg inn data i «Faktisk budsjett» først.</p>
          )}

          {/* Månedstabell */}
          {categories.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse" style={{ minWidth: "700px" }}>
                <colgroup>
                  <col style={{ width: "200px", minWidth: "200px" }} />
                  {monthCols.map((_, i) => <col key={i} style={{ width: "72px", minWidth: "72px" }} />)}
                  <col style={{ width: "80px", minWidth: "80px" }} />
                </colgroup>
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="sticky left-0 z-10 bg-gray-50 text-left px-4 py-2 text-xs text-gray-400 uppercase tracking-wide font-medium">Post</th>
                    {monthCols.map((col) => (
                      <th key={`sh-${col.year}-${col.month}`} className={`text-right px-2 py-2 text-xs uppercase tracking-wide font-medium ${col.isCurrent ? "text-blue-500" : "text-gray-400"}`}>
                        {col.label}
                      </th>
                    ))}
                    <th className="text-right px-2 py-2 text-xs text-gray-400 uppercase tracking-wide font-medium">År</th>
                  </tr>
                </thead>
                <tbody>
                  {[...(incomeCat ? [incomeCat] : []), ...expenseCats].map((cat) => {
                    const adj = simAdjustments[cat.id] ?? 0;
                    const isExpanded = simExpandedCats.has(cat.id);
                    const simAnnual = getSimCatAnnualTotal(cat);
                    const actualAnnual = getCatAnnualTotal(cat);
                    const annualDiff = simAnnual - actualAnnual;
                    const isIncome = cat.type === "income";

                    return (
                      <React.Fragment key={cat.id}>
                        <tr onClick={() => toggleSimCat(cat.id)} className="cursor-pointer hover:bg-gray-50 border-t-2 border-gray-200 group">
                          <td className="sticky left-0 bg-white group-hover:bg-gray-50 px-4 py-2.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`text-gray-400 text-xs transition-transform ${isExpanded ? "rotate-90" : ""}`}>▶</span>
                              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">{cat.name}</span>
                              {/* Justeringsinput inline */}
                              <div className="flex items-center gap-1 ml-auto" onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="number"
                                  value={simAdjustments[cat.id] ?? ""}
                                  onChange={(e) => setSimAdjustments((prev) => ({ ...prev, [cat.id]: parseFloat(e.target.value) || 0 }))}
                                  placeholder="0"
                                  className="w-14 p-1 rounded bg-gray-100 outline-none focus:ring-1 focus:ring-blue-500 text-xs text-center"
                                />
                                <span className="text-xs text-gray-400">%</span>
                                {adj !== 0 && (
                                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${adj > 0 ? "bg-red-50 text-red-500" : "bg-green-50 text-green-600"}`}>
                                    {adj > 0 ? "+" : ""}{Math.round(adj)}%
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                          {monthCols.map((col) => {
                            const val = getSimCatMonthTotal(cat, col.year, col.month);
                            return (
                              <td key={`sc-${cat.id}-${col.year}-${col.month}`}
                                className={`text-right px-2 py-2.5 text-sm font-semibold ${col.isCurrent ? "text-gray-900 bg-gray-100" : "text-gray-700"}`}
                                onClick={(e) => e.stopPropagation()}>
                                {fmt(val)}
                              </td>
                            );
                          })}
                          <td className="text-right px-2 py-2.5 text-sm font-semibold" onClick={(e) => e.stopPropagation()}>
                            <div className={adj !== 0 ? "text-gray-700" : "text-gray-500"}>{fmt(simAnnual)}</div>
                            {annualDiff !== 0 && (
                              <div className={`text-xs ${isIncome ? (annualDiff > 0 ? "text-green-600" : "text-red-500") : (annualDiff > 0 ? "text-red-500" : "text-green-600")}`}>
                                {annualDiff > 0 ? "+" : ""}{Math.round(annualDiff).toLocaleString("nb-NO")}
                              </div>
                            )}
                          </td>
                        </tr>

                        {/* Individuelle poster */}
                        {isExpanded && cat.items.map((item) => (
                          <tr key={`si-${item.id}`} className="border-b border-gray-100 bg-gray-50/50">
                            <td className="sticky left-0 bg-gray-50 px-4 py-1.5 pl-8 text-sm text-gray-600">{item.name}</td>
                            {monthCols.map((col) => {
                              const val = getSimVal(item.id, cat.id, col.year, col.month);
                              return (
                                <td key={`si-${item.id}-${col.year}-${col.month}`}
                                  className={`text-right px-2 py-1.5 text-sm text-gray-500 ${col.isCurrent ? "bg-gray-100" : ""}`}>
                                  {fmt(val)}
                                </td>
                              );
                            })}
                            <td className="text-right px-2 py-1.5 text-sm text-gray-400">
                              {fmt(monthCols.reduce((s, col) => s + getSimVal(item.id, cat.id, col.year, col.month), 0))}
                            </td>
                          </tr>
                        ))}
                      </React.Fragment>
                    );
                  })}

                  {/* Engangsutgifter i simulert */}
                  {(maintenanceTasks.length > 0 || plannedExpenses.length > 0) && (
                    <>
                      <tr><td colSpan={numCols} className="py-1" /></tr>
                      <tr className="border-t border-gray-200">
                        <td className="sticky left-0 bg-white px-4 py-2.5 text-xs font-bold text-gray-500 uppercase tracking-wider">💸 Engangsutgifter</td>
                        {monthCols.map((col) => {
                          const total = getMaintenanceMonthTotal(col.year, col.month) + getPlannedMonthTotal(col.year, col.month);
                          return (
                            <td key={`sone-${col.year}-${col.month}`}
                              className={`text-right px-2 py-2.5 text-sm font-semibold ${total > 0 ? "text-gray-700" : "text-gray-300"} ${col.isCurrent ? "bg-gray-100" : ""}`}>
                              {total > 0 ? total.toLocaleString("nb-NO") : "–"}
                            </td>
                          );
                        })}
                        <td className="text-right px-2 py-2.5 text-sm font-semibold text-gray-500">
                          {(getMaintenanceAnnualTotal() + getPlannedAnnualTotal()) > 0
                            ? (getMaintenanceAnnualTotal() + getPlannedAnnualTotal()).toLocaleString("nb-NO") : "–"}
                        </td>
                      </tr>
                    </>
                  )}

                  {/* Simulert restbeløp */}
                  <tr><td colSpan={numCols} className="py-1" /></tr>
                  <tr className="border-t border-emerald-200/60 bg-emerald-50/50">
                    <td className="sticky left-0 bg-emerald-50/50 px-4 py-3 text-sm font-bold text-gray-900">Simulert restbeløp</td>
                    {monthCols.map((col) => {
                      const val = getSimRestMonth(col.year, col.month);
                      const actual = getRestMonth(col.year, col.month);
                      const diff = val - actual;
                      return (
                        <td key={`sr-${col.year}-${col.month}`} className="text-right px-2 py-3">
                          <div className={`text-sm font-bold ${val >= 0 ? "text-green-600" : "text-red-500"}`}>{fmt(val)}</div>
                          {diff !== 0 && <div className={`text-xs ${diff > 0 ? "text-green-500" : "text-red-400"}`}>{diff > 0 ? "+" : ""}{Math.round(diff).toLocaleString("nb-NO")}</div>}
                        </td>
                      );
                    })}
                    <td className="text-right px-2 py-3">
                      <div className={`text-sm font-bold ${getSimRestAnnual() >= 0 ? "text-green-600" : "text-red-500"}`}>{fmt(getSimRestAnnual())}</div>
                      {(() => {
                        const diff = getSimRestAnnual() - getRestAnnual();
                        return diff !== 0 ? <div className={`text-xs ${diff > 0 ? "text-green-500" : "text-red-400"}`}>{diff > 0 ? "+" : ""}{Math.round(diff).toLocaleString("nb-NO")}</div> : null;
                      })()}
                    </td>
                  </tr>
                  <tr><td colSpan={numCols} className="py-4" /></tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
