"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { ShoppingItem } from "@/lib/types";
import HomeButton from "@/components/HomeButton";

type Purchase = {
  id: string;
  title: string;
  amount: number;
  date: string;
  notes: string | null;
  category: string;
  asset_id: string | null;
};

type MaintenanceTask = {
  id: string;
  title: string;
  due_date: string;
  asset_name: string;
};

type Asset = {
  id: string;
  name: string;
};

type Props = {
  initialShoppingItems: ShoppingItem[];
  initialPurchases: Purchase[];
  initialMaintenanceTasks: MaintenanceTask[];
  initialAssets: Asset[];
};

const MONTH_NAMES = [
  "Januar", "Februar", "Mars", "April", "Mai", "Juni",
  "Juli", "August", "September", "Oktober", "November", "Desember",
];

function formatAmount(n: number) {
  return n.toLocaleString("nb-NO") + " kr";
}

function dateToMonthKey(dateStr: string): string {
  return dateStr.substring(0, 7);
}

function monthKeyToDate(monthKey: string): string {
  return monthKey + "-01";
}

function formatMonthKey(monthKey: string): string {
  const [year, month] = monthKey.split("-");
  return `${MONTH_NAMES[parseInt(month) - 1]} ${year}`;
}

function generateMonthKeys(count = 12): string[] {
  const now = new Date();
  const keys: string[] = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    keys.push(`${y}-${m}`);
  }
  return keys;
}

function getCurrentMonthKey(): string {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}`;
}

export default function InnkjopView({ initialShoppingItems, initialPurchases, initialMaintenanceTasks, initialAssets }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<"dagligvare" | "planlagte">("dagligvare");

  // --- Dagligvare ---
  const [items, setItems] = useState<ShoppingItem[]>(initialShoppingItems);
  const [newItemName, setNewItemName] = useState("");
  const [addedBy, setAddedBy] = useState("");
  const [adding, setAdding] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const channel = supabase
      .channel("shopping_items_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "shopping_items" }, () => {
        supabase.from("shopping_items").select("*").order("created_at").then(({ data }) => {
          if (data) setItems(data as ShoppingItem[]);
        });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const unchecked = items.filter((i) => !i.checked);
  const checked = items.filter((i) => i.checked);

  async function addShoppingItem(e: React.FormEvent) {
    e.preventDefault();
    const name = newItemName.trim();
    if (!name) return;
    setAdding(true);
    const { data } = await supabase
      .from("shopping_items")
      .insert({ name, added_by: addedBy.trim() || null })
      .select()
      .single();
    if (data) { setItems((prev) => [...prev, data as ShoppingItem]); setNewItemName(""); }
    setAdding(false);
    inputRef.current?.focus();
  }

  async function toggleItem(item: ShoppingItem) {
    const isChecked = !item.checked;
    await supabase.from("shopping_items").update({ checked: isChecked, checked_at: isChecked ? new Date().toISOString() : null }).eq("id", item.id);
    setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, checked: isChecked, checked_at: isChecked ? new Date().toISOString() : null } : i));
  }

  async function deleteItem(id: string) {
    await supabase.from("shopping_items").delete().eq("id", id);
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  async function clearChecked() {
    const ids = items.filter((i) => i.checked).map((i) => i.id);
    if (ids.length === 0 || !confirm("Fjern alle utsjekket varer?")) return;
    await supabase.from("shopping_items").delete().in("id", ids);
    setItems((prev) => prev.filter((i) => !i.checked));
  }

  // --- Planlagte kjøp ---
  const [purchases, setPurchases] = useState<Purchase[]>(initialPurchases);
  const [maintenanceTasks, setMaintenanceTasks] = useState(initialMaintenanceTasks);
  const assets = initialAssets;
  const [showModal, setShowModal] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState<Purchase | null>(null);
  const [pTitle, setPTitle] = useState("");
  const [pAmount, setPAmount] = useState("");
  const [pMonth, setPMonth] = useState(""); // "YYYY-MM"
  const [pNotes, setPNotes] = useState("");
  const [pAssetId, setPAssetId] = useState("");
  const [saving, setSaving] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverMonth, setDragOverMonth] = useState<string | null>(null);

  const monthKeys = generateMonthKeys(12);
  const currentMonthKey = getCurrentMonthKey();

  const resetPurchaseForm = () => {
    setPTitle(""); setPAmount(""); setPMonth(""); setPNotes(""); setPAssetId("");
    setEditingPurchase(null);
  };

  function openModal(prefillMonthKey?: string) {
    resetPurchaseForm();
    if (prefillMonthKey) setPMonth(prefillMonthKey);
    setShowModal(true);
  }

  function openEditModal(p: Purchase) {
    setEditingPurchase(p);
    setPTitle(p.title);
    setPAmount(String(p.amount));
    setPMonth(dateToMonthKey(p.date));
    setPNotes(p.notes ?? "");
    setPAssetId(p.asset_id ?? "");
    setShowModal(true);
  }

  async function savePurchase() {
    if (!pTitle.trim() || !pAmount || !pMonth) return;
    setSaving(true);
    const dateStr = monthKeyToDate(pMonth);

    if (editingPurchase) {
      const { error } = await supabase
        .from("planned_expenses")
        .update({
          title: pTitle.trim(),
          amount: parseInt(pAmount),
          date: dateStr,
          notes: pNotes.trim() || null,
          asset_id: pAssetId || null,
        })
        .eq("id", editingPurchase.id);
      setSaving(false);
      if (error) { alert("Feil: " + error.message); return; }
      setPurchases((prev) =>
        prev.map((p) =>
          p.id === editingPurchase.id
            ? { ...p, title: pTitle.trim(), amount: parseInt(pAmount), date: dateStr, notes: pNotes.trim() || null, asset_id: pAssetId || null }
            : p
        ).sort((a, b) => a.date.localeCompare(b.date))
      );
    } else {
      const { data, error } = await supabase
        .from("planned_expenses")
        .insert({
          title: pTitle.trim(),
          amount: parseInt(pAmount),
          date: dateStr,
          category: "innkjop",
          notes: pNotes.trim() || null,
          asset_id: pAssetId || null,
        })
        .select()
        .single();
      setSaving(false);
      if (error) { alert("Feil: " + error.message); return; }
      setPurchases((prev) => [...prev, data as Purchase].sort((a, b) => a.date.localeCompare(b.date)));
    }

    setShowModal(false);
    resetPurchaseForm();
  }

  async function deletePurchase(id: string, title: string) {
    if (!confirm(`Slett "${title}"?`)) return;
    await supabase.from("planned_expenses").delete().eq("id", id);
    setPurchases((prev) => prev.filter((p) => p.id !== id));
  }

  async function deleteMaintenanceTask(id: string, title: string) {
    if (!confirm(`Slett vedlikeholdsoppgave "${title}"?`)) return;
    await supabase.from("asset_tasks").delete().eq("id", id);
    setMaintenanceTasks((prev) => prev.filter((m) => m.id !== id));
  }

  async function movePurchase(id: string, toMonthKey: string) {
    const newDate = monthKeyToDate(toMonthKey);
    const { error } = await supabase.from("planned_expenses").update({ date: newDate }).eq("id", id);
    if (!error) {
      setPurchases((prev) =>
        prev.map((p) => p.id === id ? { ...p, date: newDate } : p)
            .sort((a, b) => a.date.localeCompare(b.date))
      );
    }
  }

  function handleDragStart(id: string) { setDraggedId(id); }
  function handleDragEnd() { setDraggedId(null); setDragOverMonth(null); }
  function handleDragOver(e: React.DragEvent, monthKey: string) {
    e.preventDefault();
    setDragOverMonth(monthKey);
  }
  function handleDrop(e: React.DragEvent, monthKey: string) {
    e.preventDefault();
    if (draggedId) { movePurchase(draggedId, monthKey); }
    setDraggedId(null);
    setDragOverMonth(null);
  }

  const totalPurchases = purchases.reduce((s, p) => s + p.amount, 0);
  const totalItems = purchases.length + maintenanceTasks.length;

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">
      <div className="p-6 pb-0">
        <div className="max-w-lg mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <button onClick={() => router.back()} className="flex items-center gap-1.5 text-gray-500 hover:text-gray-900 transition-colors text-sm px-2 py-1.5 rounded-lg hover:bg-white">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
                Tilbake
              </button>
              <div className="w-px h-5 bg-gray-200" />
              <h1 className="text-lg font-semibold">Innkjøp</h1>
            </div>
            <div className="flex items-center gap-2">
              <HomeButton />
              {tab === "planlagte" && (
                <button
                  onClick={() => openModal()}
                  className="flex items-center gap-1.5 bg-blue-500 hover:bg-blue-600 text-white text-sm px-3 py-1.5 rounded-lg transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  Legg til
                </button>
              )}
            </div>
          </div>

          {/* Faner */}
          <div className="flex gap-2 mb-6 bg-white rounded-xl p-1">
            <button
              onClick={() => setTab("dagligvare")}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${tab === "dagligvare" ? "bg-gray-100 text-gray-900" : "text-gray-500 hover:text-gray-700"}`}
            >
              🛒 Dagligvare
            </button>
            <button
              onClick={() => setTab("planlagte")}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${tab === "planlagte" ? "bg-gray-100 text-gray-900" : "text-gray-500 hover:text-gray-700"}`}
            >
              🎿 Planlagte kjøp
              {purchases.length > 0 && (
                <span className="ml-1.5 text-xs bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full">{purchases.length}</span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ── DAGLIGVARE ── */}
      {tab === "dagligvare" && (
        <div className="px-6 pb-6">
          <div className="max-w-lg mx-auto">
            <form onSubmit={addShoppingItem} className="flex gap-2 mb-5">
              <input
                ref={inputRef}
                type="text"
                placeholder="Legg til vare…"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                className="flex-1 p-2.5 rounded-lg bg-white placeholder-gray-400 outline-none focus:ring-2 focus:ring-blue-500 text-sm border border-gray-200"
              />
              <input
                type="text"
                placeholder="Hvem?"
                value={addedBy}
                onChange={(e) => setAddedBy(e.target.value)}
                className="w-24 p-2.5 rounded-lg bg-white placeholder-gray-400 outline-none focus:ring-2 focus:ring-blue-500 text-sm border border-gray-200"
              />
              <button type="submit" disabled={!newItemName.trim() || adding}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium disabled:opacity-40 transition-colors">
                +
              </button>
            </form>

            {items.length === 0 && (
              <div className="text-center py-14">
                <p className="text-3xl mb-3">🛒</p>
                <p className="text-gray-400 text-sm">Handlelisten er tom.</p>
              </div>
            )}

            <div className="space-y-2">
              {unchecked.map((item) => (
                <div key={item.id} className="flex items-center gap-3 p-3 bg-white rounded-xl group">
                  <button onClick={() => toggleItem(item)} className="w-5 h-5 rounded-full border-2 border-gray-300 hover:border-green-500 transition-colors flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm">{item.name}</span>
                    {item.added_by && <span className="text-xs text-gray-400 ml-2">av {item.added_by}</span>}
                  </div>
                  <button onClick={() => deleteItem(item.id)} className="text-gray-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>

            {checked.length > 0 && (
              <div className="mt-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-400 uppercase tracking-wide">Kjøpt ({checked.length})</span>
                  <button onClick={clearChecked} className="text-xs text-red-400 hover:text-red-500 transition-colors">Tøm</button>
                </div>
                <div className="space-y-1.5">
                  {checked.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 p-3 bg-white rounded-xl opacity-50">
                      <button onClick={() => toggleItem(item)} className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </button>
                      <span className="text-sm line-through text-gray-400 flex-1">{item.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── PLANLAGTE KJØP – Kanban-tavle ── */}
      {tab === "planlagte" && (
        <div className="pb-8">
          {/* Summering */}
          {totalItems > 0 && (
            <div className="px-6 mb-4">
              <div className="max-w-lg mx-auto bg-white rounded-xl p-4 flex items-center justify-between">
                <div>
                  <div className="text-xs text-gray-400 uppercase tracking-wide">Totalt planlagt</div>
                  <div className="text-xl font-bold mt-0.5">{formatAmount(totalPurchases)}</div>
                </div>
                <div className="flex gap-3 text-xs text-gray-400">
                  {purchases.length > 0 && <span>{purchases.length} innkjøp</span>}
                  {maintenanceTasks.length > 0 && <span>🔧 {maintenanceTasks.length} vedlikehold</span>}
                </div>
              </div>
            </div>
          )}

          {totalItems === 0 && (
            <div className="text-center py-8 px-6">
              <p className="text-3xl mb-3">🎿</p>
              <p className="text-gray-400 text-sm mb-3">Ingen planlagte innkjøp ennå.</p>
              <button onClick={() => openModal()} className="text-blue-500 hover:text-blue-600 text-sm transition-colors">
                + Legg til første innkjøp
              </button>
            </div>
          )}

          {/* Kanban-tavle med horisontal scroll */}
          <div className="overflow-x-auto">
            <div className="flex gap-3 px-6 pb-2" style={{ minWidth: "max-content" }}>
              {monthKeys.map((monthKey) => {
                const monthPurchases    = purchases.filter((p) => dateToMonthKey(p.date) === monthKey);
                const monthMaintenance  = maintenanceTasks.filter((m) => dateToMonthKey(m.due_date) === monthKey);
                const totalInMonth      = monthPurchases.length + monthMaintenance.length;
                const isCurrentMonth    = monthKey === currentMonthKey;
                const isDragOver        = dragOverMonth === monthKey;

                return (
                  <div
                    key={monthKey}
                    className={`flex-shrink-0 w-52 rounded-2xl p-3 transition-colors ${
                      isDragOver
                        ? "bg-blue-100 ring-2 ring-blue-300"
                        : isCurrentMonth
                        ? "bg-blue-50"
                        : "bg-white/70"
                    }`}
                    onDragOver={(e) => handleDragOver(e, monthKey)}
                    onDrop={(e) => handleDrop(e, monthKey)}
                    onDragLeave={() => { if (dragOverMonth === monthKey) setDragOverMonth(null); }}
                  >
                    {/* Kolonneheader */}
                    <div className="mb-3 px-1 flex items-start justify-between gap-1">
                      <div className="min-w-0">
                        <div className={`text-sm font-semibold ${isCurrentMonth ? "text-blue-600" : "text-gray-700"}`}>
                          {formatMonthKey(monthKey)}
                          {isCurrentMonth && (
                            <span className="ml-1.5 text-xs font-normal text-blue-400">nå</span>
                          )}
                        </div>
                        {monthPurchases.length > 0 && (
                          <div className="text-xs text-gray-400 mt-0.5">
                            {formatAmount(monthPurchases.reduce((s, p) => s + p.amount, 0))}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => openModal(monthKey)}
                        className="flex-shrink-0 w-6 h-6 rounded-lg bg-white hover:bg-blue-500 hover:text-white text-gray-400 flex items-center justify-center transition-colors shadow-sm text-base leading-none"
                        title={`Legg til i ${formatMonthKey(monthKey)}`}
                      >
                        +
                      </button>
                    </div>

                    {/* Kort */}
                    <div className="space-y-2">
                      {/* Innkjøpskort (draggable) */}
                      {monthPurchases.map((p) => (
                        <div
                          key={p.id}
                          draggable
                          onDragStart={() => handleDragStart(p.id)}
                          onDragEnd={handleDragEnd}
                          className={`bg-white rounded-xl p-3 shadow-sm cursor-grab active:cursor-grabbing transition-opacity select-none ${
                            draggedId === p.id ? "opacity-30" : "opacity-100"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-1 mb-1.5">
                            <span className="text-sm font-medium leading-tight flex-1">{p.title}</span>
                            <div className="flex items-center gap-1 flex-shrink-0 mt-0.5">
                              <button
                                onClick={(e) => { e.stopPropagation(); openEditModal(p); }}
                                className="text-gray-300 hover:text-blue-400 transition-colors"
                                title="Rediger"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 11l6.536-6.536a2 2 0 012.828 2.828L11.828 13.828a2 2 0 01-1.414.586H8v-2.414a2 2 0 01.586-1.414z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => deletePurchase(p.id, p.title)}
                                className="text-gray-300 hover:text-red-400 transition-colors"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                          </div>
                          <div className="text-sm font-semibold text-blue-600">{formatAmount(p.amount)}</div>
                          {p.notes && (
                            <div className="text-xs text-gray-400 mt-1 truncate">{p.notes}</div>
                          )}
                          {p.asset_id && (
                            <div className="mt-1.5 flex items-center gap-1">
                              <span className="text-xs text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-md truncate">
                                🔧 {assets.find((a) => a.id === p.asset_id)?.name ?? "Eiendel"}
                              </span>
                            </div>
                          )}
                          {/* Mobilalternativ: dropdown for å flytte */}
                          <select
                            className="mt-2 w-full text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 focus:outline-none md:hidden"
                            value={monthKey}
                            onChange={(e) => movePurchase(p.id, e.target.value)}
                          >
                            {monthKeys.map((mk) => (
                              <option key={mk} value={mk}>{formatMonthKey(mk)}</option>
                            ))}
                          </select>
                        </div>
                      ))}

                      {/* Vedlikeholdskort (ikke draggable) */}
                      {monthMaintenance.map((m) => (
                        <div
                          key={`m-${m.id}`}
                          className="bg-amber-50 border border-amber-100 rounded-xl p-3 shadow-sm select-none"
                        >
                          <div className="flex items-start gap-2 mb-1">
                            <span className="text-base flex-shrink-0 leading-tight">🔧</span>
                            <span className="text-sm font-medium leading-tight text-gray-800 flex-1">{m.title}</span>
                            <button
                              onClick={() => deleteMaintenanceTask(m.id, m.title)}
                              className="text-amber-300 hover:text-red-400 transition-colors flex-shrink-0"
                              title="Slett oppgave"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                          <div className="text-xs text-amber-600 font-medium">{m.asset_name}</div>
                        </div>
                      ))}
                    </div>

                    {/* Tom dropsone */}
                    {totalInMonth === 0 && (
                      <div className={`h-14 rounded-xl border-2 border-dashed flex items-center justify-center transition-colors ${
                        isDragOver ? "border-blue-300 bg-blue-50" : "border-gray-200"
                      }`}>
                        <span className="text-xs text-gray-300">Slipp her</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Modal: nytt planlagt kjøp */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
          onClick={() => { setShowModal(false); resetPurchaseForm(); }}
        >
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-4">{editingPurchase ? "Rediger innkjøp" : "Nytt planlagt innkjøp"}</h2>
            <div className="space-y-3 mb-5">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Hva skal kjøpes?</label>
                <input
                  type="text"
                  placeholder="F.eks. «Nye ski til Emma»"
                  value={pTitle}
                  onChange={(e) => setPTitle(e.target.value)}
                  autoFocus
                  className="w-full p-2.5 rounded-lg bg-gray-100 placeholder-gray-400 outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900"
                />
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-xs text-gray-400 mb-1 block">Måned</label>
                  <input
                    type="month"
                    value={pMonth}
                    onChange={(e) => setPMonth(e.target.value)}
                    min={currentMonthKey}
                    className="w-full p-2.5 rounded-lg bg-gray-100 outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-gray-400 mb-1 block">Estimert beløp (kr)</label>
                  <input
                    type="number"
                    placeholder="F.eks. 4500"
                    value={pAmount}
                    onChange={(e) => setPAmount(e.target.value)}
                    className="w-full p-2.5 rounded-lg bg-gray-100 placeholder-gray-400 outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900"
                  />
                </div>
              </div>
              {assets.length > 0 && (
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Knytt til eiendel (valgfritt)</label>
                  <select
                    value={pAssetId}
                    onChange={(e) => setPAssetId(e.target.value)}
                    className="w-full p-2.5 rounded-lg bg-gray-100 outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900"
                  >
                    <option value="">— Ingen eiendel —</option>
                    {assets.map((a) => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                  {pAssetId && (
                    <p className="text-xs text-amber-600 mt-1">
                      🔧 Kostnaden teller med i total cost of ownership for denne eiendelen
                    </p>
                  )}
                </div>
              )}
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Notater (valgfritt)</label>
                <input
                  type="text"
                  placeholder="F.eks. «Sjekk XXL-tilbud»"
                  value={pNotes}
                  onChange={(e) => setPNotes(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-gray-100 placeholder-gray-400 outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => { setShowModal(false); resetPurchaseForm(); }}
                className="flex-1 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors text-sm"
              >
                Avbryt
              </button>
              <button
                onClick={savePurchase}
                disabled={!pTitle.trim() || !pAmount || !pMonth || saving}
                className="flex-1 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 disabled:opacity-40 transition-colors text-sm font-medium text-white"
              >
                {saving ? "Lagrer…" : editingPurchase ? "Oppdater" : "Lagre"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
