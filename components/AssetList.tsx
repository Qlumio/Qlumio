"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import type { Asset } from "@/lib/types";

export const ASSET_TYPES = [
  { value: "hus", label: "Hus", emoji: "🏠" },
  { value: "bil", label: "Bil", emoji: "🚗" },
  { value: "hytte", label: "Hytte", emoji: "🏡" },
  { value: "bat", label: "Båt", emoji: "⛵" },
  { value: "motorsykkel", label: "Motorsykkel", emoji: "🏍️" },
  { value: "elsykkel", label: "Elsykkel", emoji: "🚲" },
  { value: "varmepumpe", label: "Varmepumpe", emoji: "♨️" },
  { value: "robotklipper", label: "Robotklipper", emoji: "🤖" },
  { value: "hvitevarer", label: "Hvitevarer", emoji: "🧺" },
  { value: "annet", label: "Annet", emoji: "📦" },
];

export function getAssetEmoji(type: string) {
  return ASSET_TYPES.find((t) => t.value === type)?.emoji ?? "📦";
}
export function getAssetLabel(type: string) {
  return ASSET_TYPES.find((t) => t.value === type)?.label ?? type;
}

type Props = { assets: Asset[] };

export default function AssetList({ assets }: Props) {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState("bil");
  const [purchaseYear, setPurchaseYear] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("assets").insert({
      name: name.trim(),
      type,
      purchase_year: purchaseYear ? parseInt(purchaseYear) : null,
      description: description.trim() || null,
    });
    setSaving(false);
    if (error) { alert("Feil: " + error.message); return; }
    setShowModal(false);
    setName(""); setType("bil"); setPurchaseYear(""); setDescription("");
    router.refresh();
  };

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900 p-6">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/")}
              className="flex items-center gap-1.5 text-gray-500 hover:text-gray-900 transition-colors text-sm px-2 py-1.5 rounded-lg hover:bg-white"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              Tilbake
            </button>
            <div className="w-px h-5 bg-gray-100" />
            <h1 className="text-lg font-semibold">Eiendeler</h1>
          </div>
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

        {/* Tom tilstand */}
        {assets.length === 0 && (
          <div className="text-center py-16">
            <p className="text-4xl mb-4">🏠</p>
            <p className="text-gray-500 mb-4">Ingen eiendeler lagt til ennå.</p>
            <button
              onClick={() => setShowModal(true)}
              className="inline-block bg-blue-500 hover:bg-blue-600 text-white px-5 py-2 rounded-lg transition-colors text-sm"
            >
              Legg til første eiendel →
            </button>
          </div>
        )}

        {/* Liste */}
        <div className="space-y-3">
          {assets.map((asset) => (
            <Link
              key={asset.id}
              href={`/eiendeler/${asset.id}`}
              className="flex items-center gap-4 p-4 bg-white hover:bg-gray-100 rounded-xl transition-colors group"
            >
              <div className="text-3xl w-12 text-center flex-shrink-0">
                {getAssetEmoji(asset.type)}
              </div>
              <div className="min-w-0">
                <div className="font-semibold group-hover:text-gray-900">{asset.name}</div>
                <div className="text-sm text-gray-500">
                  {getAssetLabel(asset.type)}
                  {asset.purchase_year && <span className="ml-2 text-gray-400">· {asset.purchase_year}</span>}
                </div>
              </div>
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-gray-400 group-hover:text-gray-500 ml-auto flex-shrink-0 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          ))}
        </div>
      </div>

      {/* Modal: legg til eiendel */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-4">Ny eiendel</h2>

            <div className="space-y-3 mb-5">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Navn</label>
                <input
                  type="text"
                  placeholder="F.eks. «Volvo XC60»"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSave()}
                  autoFocus
                  className="w-full p-2.5 rounded-lg bg-gray-100 placeholder-gray-400 outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>

              <div>
                <label className="text-xs text-gray-400 mb-1 block">Type</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-gray-100 outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                >
                  {ASSET_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.emoji} {t.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-gray-400 mb-1 block">Kjøpsår (valgfritt)</label>
                <input
                  type="number"
                  placeholder="F.eks. 2019"
                  value={purchaseYear}
                  onChange={(e) => setPurchaseYear(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-gray-100 placeholder-gray-400 outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>

              <div>
                <label className="text-xs text-gray-400 mb-1 block">Beskrivelse (valgfritt)</label>
                <input
                  type="text"
                  placeholder="F.eks. «Dieselbil, 2.0»"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-gray-100 placeholder-gray-400 outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button onClick={() => setShowModal(false)} className="flex-1 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors text-sm">Avbryt</button>
              <button
                onClick={handleSave}
                disabled={!name.trim() || saving}
                className="flex-1 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 disabled:opacity-40 transition-colors text-sm font-medium text-white"
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
