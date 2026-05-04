"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { ShoppingItem } from "@/lib/types";

type Purchase = {
  id: string;
  title: string;
  amount: number;
  date: string;
  notes: string | null;
  category: string;
};

type Props = {
  initialShoppingItems: ShoppingItem[];
  initialPurchases: Purchase[];
};

function formatAmount(n: number) {
  return n.toLocaleString("nb-NO") + " kr";
}
function formatDate(s: string) {
  const d = new Date(s + "T00:00:00");
  return `${d.getDate()}.${d.getMonth() + 1}.${d.getFullYear()}`;
}

export default function InnkjopView({ initialShoppingItems, initialPurchases }: Props) {
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
    const checked = !item.checked;
    await supabase.from("shopping_items").update({ checked, checked_at: checked ? new Date().toISOString() : null }).eq("id", item.id);
    setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, checked, checked_at: checked ? new Date().toISOString() : null } : i));
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
  const [showModal, setShowModal] = useState(false);
  const [pTitle, setPTitle] = useState("");
  const [pAmount, setPAmount] = useState("");
  const [pDate, setPDate] = useState("");
  const [pNotes, setPNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const resetPurchaseForm = () => { setPTitle(""); setPAmount(""); setPDate(""); setPNotes(""); };

  async function savePurchase() {
    if (!pTitle.trim() || !pAmount || !pDate) return;
    setSaving(true);
    const { data, error } = await supabase
      .from("planned_expenses")
      .insert({ title: pTitle.trim(), amount: parseInt(pAmount), date: pDate, category: "innkjop", notes: pNotes.trim() || null })
      .select()
      .single();
    setSaving(false);
    if (error) { alert("Feil: " + error.message); return; }
    setPurchases((prev) => [...prev, data as Purchase].sort((a, b) => a.date.localeCompare(b.date)));
    setShowModal(false);
    resetPurchaseForm();
  }

  async function deletePurchase(id: string, title: string) {
    if (!confirm(`Slett "${title}"?`)) return;
    await supabase.from("planned_expenses").delete().eq("id", id);
    setPurchases((prev) => prev.filter((p) => p.id !== id));
  }

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const totalPurchases = purchases.reduce((s, p) => s + p.amount, 0);

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900 p-6">
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
          {tab === "planlagte" && (
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-1.5 bg-blue-500 hover:bg-blue-600 text-white text-sm px-3 py-1.5 rounded-lg transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Legg til
            </button>
          )}
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
            {purchases.length > 0 && <span className="ml-1.5 text-xs bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full">{purchases.length}</span>}
          </button>
        </div>

        {/* ── DAGLIGVARE ── */}
        {tab === "dagligvare" && (
          <>
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
          </>
        )}

        {/* ── PLANLAGTE KJØP ── */}
        {tab === "planlagte" && (
          <>
            {purchases.length > 0 && (
              <div className="bg-white rounded-xl p-4 mb-4 flex items-center justify-between">
                <div>
                  <div className="text-xs text-gray-400 uppercase tracking-wide">Totalt planlagt</div>
                  <div className="text-xl font-bold mt-0.5">{formatAmount(totalPurchases)}</div>
                </div>
                <div className="text-xs text-gray-400">{purchases.length} innkjøp</div>
              </div>
            )}

            {purchases.length === 0 && (
              <div className="text-center py-14">
                <p className="text-3xl mb-3">🎿</p>
                <p className="text-gray-400 text-sm mb-3">Ingen planlagte innkjøp ennå.</p>
                <button onClick={() => setShowModal(true)} className="text-blue-500 hover:text-blue-600 text-sm transition-colors">
                  + Legg til første innkjøp
                </button>
              </div>
            )}

            <div className="space-y-2">
              {purchases.map((p) => {
                const d = new Date(p.date + "T00:00:00");
                const isPast = d < today;
                return (
                  <div key={p.id} className={`p-4 bg-white rounded-xl flex items-start gap-3 ${isPast ? "opacity-60" : ""}`}>
                    <div className="text-2xl flex-shrink-0">🛍️</div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">{p.title}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-gray-400">{formatDate(p.date)}</span>
                        {p.notes && <><span className="text-xs text-gray-300">·</span><span className="text-xs text-gray-400 truncate">{p.notes}</span></>}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <span className="font-semibold text-sm">{formatAmount(p.amount)}</span>
                      <button onClick={() => deletePurchase(p.id, p.title)} className="text-gray-300 hover:text-red-400 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Modal: nytt planlagt kjøp */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => { setShowModal(false); resetPurchaseForm(); }}>
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-4">Nytt planlagt innkjøp</h2>
            <div className="space-y-3 mb-5">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Hva skal kjøpes?</label>
                <input type="text" placeholder="F.eks. «Nye ski til Emma»" value={pTitle} onChange={(e) => setPTitle(e.target.value)} autoFocus
                  className="w-full p-2.5 rounded-lg bg-gray-100 placeholder-gray-400 outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-xs text-gray-400 mb-1 block">Planlagt dato</label>
                  <input type="date" value={pDate} onChange={(e) => setPDate(e.target.value)}
                    className="w-full p-2.5 rounded-lg bg-gray-100 outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-gray-400 mb-1 block">Estimert beløp (kr)</label>
                  <input type="number" placeholder="F.eks. 4500" value={pAmount} onChange={(e) => setPAmount(e.target.value)}
                    className="w-full p-2.5 rounded-lg bg-gray-100 placeholder-gray-400 outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Notater (valgfritt)</label>
                <input type="text" placeholder="F.eks. «Sjekk XXL-tilbud»" value={pNotes} onChange={(e) => setPNotes(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-gray-100 placeholder-gray-400 outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setShowModal(false); resetPurchaseForm(); }} className="flex-1 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors text-sm">Avbryt</button>
              <button onClick={savePurchase} disabled={!pTitle.trim() || !pAmount || !pDate || saving}
                className="flex-1 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 disabled:opacity-40 transition-colors text-sm font-medium text-white">
                {saving ? "Lagrer…" : "Lagre"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
