"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import type { ShoppingItem } from "@/lib/types";

export default function ShoppingList({
  initialItems,
}: {
  initialItems: ShoppingItem[];
}) {
  const [items, setItems] = useState<ShoppingItem[]>(initialItems);
  const [newItemName, setNewItemName] = useState("");
  const [addedBy, setAddedBy] = useState("");
  const [adding, setAdding] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sanntidsoppdatering
  useEffect(() => {
    const channel = supabase
      .channel("shopping_items_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "shopping_items" },
        () => {
          // Hent oppdatert liste ved endring
          supabase
            .from("shopping_items")
            .select("*")
            .order("created_at")
            .then(({ data }) => {
              if (data) setItems(data as ShoppingItem[]);
            });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const unchecked = items.filter((i) => !i.checked);
  const checked = items.filter((i) => i.checked);

  async function addItem(e: React.FormEvent) {
    e.preventDefault();
    const name = newItemName.trim();
    if (!name) return;
    setAdding(true);

    const { data } = await supabase
      .from("shopping_items")
      .insert({ name, added_by: addedBy.trim() || null })
      .select()
      .single();

    if (data) {
      setItems((prev) => [...prev, data as ShoppingItem]);
      setNewItemName("");
      inputRef.current?.focus();
    }
    setAdding(false);
  }

  async function toggleItem(item: ShoppingItem) {
    const nowChecked = !item.checked;
    setItems((prev) =>
      prev.map((i) =>
        i.id === item.id
          ? { ...i, checked: nowChecked, checked_at: nowChecked ? new Date().toISOString() : null }
          : i
      )
    );
    await supabase
      .from("shopping_items")
      .update({ checked: nowChecked, checked_at: nowChecked ? new Date().toISOString() : null })
      .eq("id", item.id);
  }

  async function deleteChecked() {
    const ids = checked.map((i) => i.id);
    setItems((prev) => prev.filter((i) => !i.checked));
    await supabase.from("shopping_items").delete().in("id", ids);
  }

  async function deleteItem(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
    await supabase.from("shopping_items").delete().eq("id", id);
  }

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">
      <div className="max-w-lg mx-auto p-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8 pt-4">
          <Link href="/" className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div className="flex items-center gap-3">
            <div className="bg-green-500/10 text-green-600 p-2.5 rounded-xl">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold">Handeliste</h1>
              <p className="text-gray-500 text-sm">
                {unchecked.length === 0
                  ? "Alt er handlet inn 🎉"
                  : `${unchecked.length} vare${unchecked.length !== 1 ? "r" : ""} gjenstår`}
              </p>
            </div>
          </div>
        </div>

        {/* Legg til vare */}
        <form onSubmit={addItem} className="bg-white rounded-xl p-4 mb-6 shadow-sm">
          <div className="flex gap-2 mb-2">
            <input
              ref={inputRef}
              type="text"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              placeholder="Legg til vare…"
              className="flex-1 bg-gray-50 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-green-400 transition"
              autoComplete="off"
            />
            <button
              type="submit"
              disabled={adding || !newItemName.trim()}
              className="bg-green-500 hover:bg-green-600 disabled:bg-gray-200 disabled:text-gray-400 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
            >
              Legg til
            </button>
          </div>
          <input
            type="text"
            value={addedBy}
            onChange={(e) => setAddedBy(e.target.value)}
            placeholder="Ditt navn (valgfritt)"
            className="w-full bg-gray-50 rounded-lg px-4 py-2 text-sm text-gray-500 outline-none focus:ring-2 focus:ring-green-400 transition"
          />
        </form>

        {/* Handleliste */}
        {unchecked.length === 0 && checked.length === 0 && (
          <div className="text-center text-gray-400 py-16">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 mx-auto mb-3 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <p className="text-sm">Handelisten er tom</p>
          </div>
        )}

        {unchecked.length > 0 && (
          <div className="space-y-2 mb-6">
            {unchecked.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 bg-white rounded-xl px-4 py-3 shadow-sm group"
              >
                <button
                  onClick={() => toggleItem(item)}
                  className="w-6 h-6 rounded-full border-2 border-gray-300 hover:border-green-400 flex-shrink-0 transition-colors"
                />
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium">{item.name}</span>
                  {item.added_by && (
                    <span className="text-xs text-gray-400 ml-2">av {item.added_by}</span>
                  )}
                </div>
                <button
                  onClick={() => deleteItem(item.id)}
                  className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-all"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Kvitterte varer */}
        {checked.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                I kurven ({checked.length})
              </span>
              <button
                onClick={deleteChecked}
                className="text-xs text-red-400 hover:text-red-600 transition-colors"
              >
                Fjern alle
              </button>
            </div>
            <div className="space-y-2 opacity-60">
              {checked.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 bg-white rounded-xl px-4 py-3 shadow-sm group"
                >
                  <button
                    onClick={() => toggleItem(item)}
                    className="w-6 h-6 rounded-full bg-green-400 flex-shrink-0 flex items-center justify-center"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </button>
                  <span className="text-sm line-through text-gray-400 flex-1">{item.name}</span>
                  <button
                    onClick={() => deleteItem(item.id)}
                    className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-all"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
