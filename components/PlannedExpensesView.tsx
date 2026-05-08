"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import HomeButton from "@/components/HomeButton";

type Expense = {
  id: string;
  title: string;
  amount: number;
  date: string;
  category: string;
  notes: string | null;
  created_at: string;
};

type MaintenanceTask = {
  id: string;
  title: string;
  due_date: string;
  estimated_cost: number;
  asset_name: string;
};

// Felles visningstype for begge kildene
type DisplayItem =
  | { kind: "expense"; data: Expense }
  | { kind: "maintenance"; data: MaintenanceTask };

const CATEGORIES = [
  { value: "alle",   label: "Alle",              emoji: "📋" },
  { value: "skole",  label: "Skole / SFO",       emoji: "📚" },
  { value: "sport",  label: "Sport / aktiviteter", emoji: "⚽" },
  { value: "ferie",  label: "Ferie / reise",      emoji: "✈️" },
  { value: "annet",  label: "Annet",              emoji: "📦" },
];

function getCatEmoji(val: string) {
  return CATEGORIES.find((c) => c.value === val)?.emoji ?? "📦";
}
function getCatLabel(val: string) {
  return CATEGORIES.find((c) => c.value === val)?.label ?? val;
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return `${d.getDate()}.${d.getMonth() + 1}.${d.getFullYear()}`;
}

function formatAmount(n: number) {
  return n.toLocaleString("nb-NO") + " kr";
}

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","Mai","Jun","Jul","Aug","Sep","Okt","Nov","Des"];

export default function PlannedExpensesView({
  initialExpenses,
  maintenanceTasks = [],
  embedded = false,
}: {
  initialExpenses: Expense[];
  maintenanceTasks?: MaintenanceTask[];
  embedded?: boolean;
}) {
  const router = useRouter();
  const [expenses, setExpenses] = useState<Expense[]>(initialExpenses);
  const [activeCategory, setActiveCategory] = useState("alle");
  const [showModal, setShowModal] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [category, setCategory] = useState("annet");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const resetForm = () => {
    setTitle(""); setAmount(""); setDate(""); setCategory("annet"); setNotes("");
  };

  const handleSave = async () => {
    if (!title.trim() || !amount || !date) return;
    setSaving(true);
    const { data, error } = await supabase
      .from("planned_expenses")
      .insert({ title: title.trim(), amount: parseInt(amount), date, category, notes: notes.trim() || null })
      .select()
      .single();
    setSaving(false);
    if (error) { alert("Feil: " + error.message); return; }
    setExpenses((prev) => [...prev, data as Expense].sort((a, b) => a.date.localeCompare(b.date)));
    setShowModal(false);
    resetForm();
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Slett "${title}"?`)) return;
    await supabase.from("planned_expenses").delete().eq("id", id);
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  };

  // Filtrer ut innkjøp-kategorien – den administreres i Innkjøp-modulen
  const relevantExpenses = expenses.filter((e) => e.category !== "innkjop");
  const filteredExpenses = activeCategory === "alle"
    ? relevantExpenses
    : relevantExpenses.filter((e) => e.category === activeCategory);

  // Bygg felles DisplayItem-liste — alt vises, sortert på dato
  const allItems: DisplayItem[] = [
    ...filteredExpenses.map((e): DisplayItem => ({ kind: "expense", data: e })),
    ...maintenanceTasks.map((t): DisplayItem => ({ kind: "maintenance", data: t })),
  ].sort((a, b) => {
    const da = a.kind === "expense" ? a.data.date : a.data.due_date;
    const db = b.kind === "expense" ? b.data.date : b.data.due_date;
    return da.localeCompare(db);
  });

  // Total for "Totalt planlagt"-kortet
  const totalAmount = allItems.reduce((s, item) =>
    s + (item.kind === "expense" ? item.data.amount : item.data.estimated_cost), 0);

  // Grupper per måned
  const grouped: Record<string, DisplayItem[]> = {};
  allItems.forEach((item) => {
    const dateStr = item.kind === "expense" ? item.data.date : item.data.due_date;
    const d = new Date(dateStr + "T00:00:00");
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(item);
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <main className={embedded ? "text-gray-900 p-6" : "min-h-screen bg-gray-50 text-gray-900 p-6"}>
      <div className="max-w-lg mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          {!embedded ? (
            <div className="flex items-center gap-3">
              <button onClick={() => router.back()} className="flex items-center gap-1.5 text-gray-500 hover:text-gray-900 transition-colors text-sm px-2 py-1.5 rounded-lg hover:bg-white">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
                Tilbake
              </button>
              <div className="w-px h-5 bg-gray-200" />
              <h1 className="text-lg font-semibold">Fremtidige kostnader</h1>
            </div>
          ) : <div />}
          <div className="flex items-center gap-2">
            {!embedded && <HomeButton />}
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-1.5 bg-blue-500 hover:bg-blue-600 text-white text-sm px-3 py-1.5 rounded-lg transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Legg til
            </button>
          </div>
        </div>

        {/* Totalsum */}
        {allItems.length > 0 && (
          <div className="bg-white rounded-xl p-4 mb-4 flex items-center justify-between">
            <div>
              <div className="text-xs text-gray-400 uppercase tracking-wide">Totalt fremtidige kostnader</div>
              <div className="text-xl font-bold mt-0.5">{formatAmount(totalAmount)}</div>
            </div>
            <div className="text-xs text-gray-400">{allItems.length} poster</div>
          </div>
        )}


        {/* Tom tilstand */}
        {allItems.length === 0 && (
          <div className="text-center py-14">
            <p className="text-3xl mb-3">💸</p>
            <p className="text-gray-400 text-sm mb-3">Ingen planlagte kostnader ennå.</p>
            <button onClick={() => setShowModal(true)} className="text-blue-500 hover:text-blue-600 text-sm transition-colors">
              + Legg til første kostnad
            </button>
          </div>
        )}

        {/* Liste gruppert per måned */}
        {Object.entries(grouped).map(([key, items]) => {
          const [year, monthIdx] = key.split("-").map(Number);
          const monthTotal = items.reduce((s, item) =>
            s + (item.kind === "expense" ? item.data.amount : item.data.estimated_cost), 0);
          return (
            <div key={key} className="mb-5">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                  {MONTH_NAMES[monthIdx]} {year}
                </h2>
                <span className="text-xs text-gray-400">{formatAmount(monthTotal)}</span>
              </div>
              <div className="space-y-2">
                {items.map((item) => {
                  if (item.kind === "maintenance") {
                    const t = item.data;
                    const isPast = new Date(t.due_date + "T00:00:00") < today;
                    return (
                      <div key={`maint-${t.id}`} className={`p-4 bg-orange-50 rounded-xl flex items-start gap-3 border border-orange-100 ${isPast ? "opacity-60" : ""}`}>
                        <div className="text-2xl flex-shrink-0">🔧</div>
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-sm text-gray-900">{t.title}</div>
                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            <span className="text-xs text-gray-400">{formatDate(t.due_date)}</span>
                            <span className="text-xs text-gray-400">·</span>
                            <span className="text-xs text-orange-600 font-medium">{t.asset_name}</span>
                            <span className="text-xs text-gray-300">·</span>
                            <span className="text-xs text-gray-400">Vedlikehold</span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2 flex-shrink-0">
                          <span className="font-semibold text-sm">{formatAmount(t.estimated_cost)}</span>
                          <span className="text-xs text-orange-400">fra eiendeler</span>
                        </div>
                      </div>
                    );
                  }

                  const expense = item.data;
                  const isPast = new Date(expense.date + "T00:00:00") < today;
                  return (
                    <div key={`exp-${expense.id}`} className={`p-4 bg-white rounded-xl flex items-start gap-3 ${isPast ? "opacity-60" : ""}`}>
                      <div className="text-2xl flex-shrink-0">{getCatEmoji(expense.category)}</div>
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-sm">{expense.title}</div>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <span className="text-xs text-gray-400">{formatDate(expense.date)}</span>
                          <span className="text-xs text-gray-400">·</span>
                          <span className="text-xs text-gray-500">{getCatLabel(expense.category)}</span>
                          {expense.notes && (
                            <>
                              <span className="text-xs text-gray-400">·</span>
                              <span className="text-xs text-gray-400 truncate">{expense.notes}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2 flex-shrink-0">
                        <span className="font-semibold text-sm">{formatAmount(expense.amount)}</span>
                        <button
                          onClick={() => handleDelete(expense.id, expense.title)}
                          className="text-gray-300 hover:text-red-400 transition-colors"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => { setShowModal(false); resetForm(); }}>
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-4">Ny planlagt kostnad</h2>

            <div className="space-y-3 mb-5">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Hva gjelder det?</label>
                <input
                  type="text"
                  placeholder="F.eks. «Sommerleir», «NM i fotball»"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  autoFocus
                  className="w-full p-2.5 rounded-lg bg-gray-100 placeholder-gray-400 outline-none focus:ring-2 focus:ring-violet-500 text-sm"
                />
              </div>

              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-xs text-gray-400 mb-1 block">Dato</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full p-2.5 rounded-lg bg-gray-100 outline-none focus:ring-2 focus:ring-violet-500 text-sm"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-gray-400 mb-1 block">Beløp (kr)</label>
                  <input
                    type="number"
                    placeholder="F.eks. 3500"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full p-2.5 rounded-lg bg-gray-100 placeholder-gray-400 outline-none focus:ring-2 focus:ring-violet-500 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-400 mb-1 block">Kategori</label>
                <div className="flex gap-2 flex-wrap">
                  {CATEGORIES.filter((c) => c.value !== "alle").map((cat) => (
                    <button
                      key={cat.value}
                      onClick={() => setCategory(cat.value)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                        category === cat.value
                          ? "bg-violet-500 text-white"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      {cat.emoji} {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-400 mb-1 block">Notater (valgfritt)</label>
                <input
                  type="text"
                  placeholder="F.eks. «Betales innen 1. mars»"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-gray-100 placeholder-gray-400 outline-none focus:ring-2 focus:ring-violet-500 text-sm"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button onClick={() => { setShowModal(false); resetForm(); }} className="flex-1 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors text-sm">Avbryt</button>
              <button
                onClick={handleSave}
                disabled={!title.trim() || !amount || !date || saving}
                className="flex-1 py-2 rounded-lg bg-violet-500 hover:bg-violet-600 disabled:opacity-40 transition-colors text-sm font-medium text-white"
              >
                {saving ? "Lagrer…" : "Lagre"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
