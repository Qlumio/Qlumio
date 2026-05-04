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

function getMonthCols(): MonthCol[] {
  const now = new Date();
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    return {
      year: d.getFullYear(),
      month: d.getMonth() + 1,
      label: MONTH_NAMES[d.getMonth()],
      isCurrent: i === 0,
      isPast: false,
    };
  });
}

function fmt(n: number): string {
  if (n === 0) return "–";
  return n.toLocaleString("nb-NO");
}

export default function BudgetView({ categories: initialCategories, overrides: initialOverrides, maintenanceTasks, plannedExpenses }: Props) {
  const router = useRouter();
  const monthCols = getMonthCols();
  const currentYear = new Date().getFullYear();

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
      for (let m = 1; m <= 12; m++) total += getVal(itemId, currentYear, m);
      return total;
    },
    [getVal, currentYear]
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
      .filter((t) => new Date(t.due_date + "T00:00:00").getFullYear() === currentYear)
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
      .filter((e) => new Date(e.date + "T00:00:00").getFullYear() === currentYear)
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
      <div className="sticky top-0 z-20 bg-gray-50 border-b border-gray-200 px-4 py-3 flex items-center justify-between">
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
        <span className="text-xs text-gray-400 bg-white px-2 py-1 rounded">{currentYear}</span>
      </div>

      <p className="px-4 py-2 text-xs text-gray-400">
        Klikk et beløp for å redigere. Første verdi du setter på en post gjelder alle måneder.{" "}
        <span className="text-blue-500">Blå tall</span> er månedlige unntak.
      </p>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse" style={{ minWidth: "640px" }}>
          <thead>
            <tr className="border-b border-gray-200">
              <th className="sticky left-0 z-10 bg-gray-50 text-left px-4 py-2 text-xs text-gray-400 uppercase tracking-wide font-medium" style={{ minWidth: "200px" }}>
                Post
              </th>
              {monthCols.map((col) => (
                <th key={`${col.year}-${col.month}`} className={`text-right px-2 py-2 text-xs uppercase tracking-wide font-medium ${col.isCurrent ? "text-blue-500" : "text-gray-400"}`} style={{ minWidth: "80px" }}>
                  {col.label}
                  {col.year !== currentYear && <span className="block text-[10px] text-gray-400">{col.year}</span>}
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
      </div>
    </main>
  );
}
