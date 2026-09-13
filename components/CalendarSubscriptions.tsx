"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase/client";
import type { FamilyMember } from "@/lib/types";
import { EVENT_CATEGORIES } from "@/lib/types";

type Subscription = {
  id: string;
  label: string | null;
  url: string;
  member_id: string;
  category: string;
  last_synced_at: string | null;
  source: string;
};

type Props = {
  familyId: string;
  members: FamilyMember[];
  initialSubscriptions: Subscription[];
};

export default function CalendarSubscriptions({ familyId, members, initialSubscriptions }: Props) {
  const [subs, setSubs] = useState<Subscription[]>(initialSubscriptions);
  const [showForm, setShowForm] = useState(false);
  const [url, setUrl] = useState("");
  const [label, setLabel] = useState("");
  const [memberId, setMemberId] = useState(members[0]?.id ?? "");
  const [category, setCategory] = useState("fotball");
  const [saving, setSaving] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<Record<string, string>>({});
  const [error, setError] = useState("");

  const handleAdd = async () => {
    if (!url.trim() || !memberId) {
      setError("Fyll ut URL og velg familiemedlem.");
      return;
    }
    setError("");
    setSaving(true);
    try {
      const { data, error: insertError } = await supabase
        .from("calendar_subscriptions")
        .insert({
          family_id: familyId,
          member_id: memberId,
          source: url.includes("rubic") ? "rubic" : url.includes("spond") ? "spond" : "annet",
          label: label.trim() || null,
          url: url.trim(),
          category,
        })
        .select()
        .single();

      if (insertError) {
        setError("Kunne ikke lagre: " + insertError.message);
        return;
      }

      setSubs((prev) => [...prev, data as Subscription]);
      setUrl("");
      setLabel("");
      setShowForm(false);

      // Synkroniser umiddelbart
      await handleSync(data.id);
    } catch (e) {
      setError("Noe gikk galt. Prøv igjen.");
    } finally {
      setSaving(false);
    }
  };

  const handleSync = async (id: string) => {
    setSyncingId(id);
    try {
      const res = await fetch("/api/calendar-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscriptionId: id }),
      });
      const result = await res.json();
      if (res.ok) {
        setSyncResult((prev) => ({ ...prev, [id]: `${result.imported} nye, ${result.skipped} allerede lagt til` }));
        setSubs((prev) => prev.map((s) => s.id === id ? { ...s, last_synced_at: new Date().toISOString() } : s));
      } else {
        setSyncResult((prev) => ({ ...prev, [id]: "Feil: " + result.error }));
      }
    } catch (e) {
      setSyncResult((prev) => ({ ...prev, [id]: "Nettverksfeil – prøv igjen" }));
    } finally {
      setSyncingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Fjerne dette kalenderabonnementet? Allerede importerte hendelser beholdes.")) return;
    await supabase.from("calendar_subscriptions").delete().eq("id", id);
    setSubs((prev) => prev.filter((s) => s.id !== id));
  };

  const memberName = (id: string) => members.find((m) => m.id === id)?.name ?? "Ukjent";

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-base font-semibold text-gray-900">Kalenderabonnement</h2>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="text-xs text-purple-500 font-medium"
        >
          {showForm ? "Avbryt" : "+ Legg til"}
        </button>
      </div>
      <p className="text-sm text-gray-500 mb-4">
        Koble til Rubic, Spond eller andre iCal-kalendere. Hendelser importeres automatisk til riktig familiemedlem.
      </p>

      {subs.length > 0 && (
        <div className="space-y-2 mb-4">
          {subs.map((sub) => (
            <div key={sub.id} className="bg-gray-50 rounded-xl p-3">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">
                    {sub.label || sub.source} · {memberName(sub.member_id)}
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {sub.last_synced_at
                      ? `Sist synket ${new Date(sub.last_synced_at).toLocaleString("nb-NO", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}`
                      : "Ikke synket ennå"}
                  </div>
                  {syncResult[sub.id] && (
                    <div className="text-xs text-purple-500 mt-0.5">{syncResult[sub.id]}</div>
                  )}
                </div>
                <div className="flex gap-2 flex-shrink-0 ml-2">
                  <button
                    onClick={() => handleSync(sub.id)}
                    disabled={syncingId === sub.id}
                    className="text-xs font-medium text-white px-3 py-1.5 rounded-lg disabled:opacity-50"
                    style={{ background: "linear-gradient(135deg, #8B5CF6, #22D3EE)" }}
                  >
                    {syncingId === sub.id ? "Synker..." : "Synkroniser"}
                  </button>
                  <button onClick={() => handleDelete(sub.id)} className="text-xs text-gray-400 hover:text-red-400 px-2">
                    Fjern
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="border-t border-gray-100 pt-4 space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">iCal-URL</label>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Navn (valgfritt)</label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="F.eks. Maria fotball"
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
            />
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-xs font-medium text-gray-500 mb-1 block">Familiemedlem</label>
              <select
                value={memberId}
                onChange={(e) => setMemberId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none"
              >
                {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            <div className="flex-1">
              <label className="text-xs font-medium text-gray-500 mb-1 block">Kategori</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none"
              >
                {EVENT_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.icon} {c.label}</option>)}
              </select>
            </div>
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button
            onClick={handleAdd}
            disabled={saving}
            className="w-full py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, #8B5CF6, #22D3EE)" }}
          >
            {saving ? "Legger til og synkroniserer..." : "Legg til og synkroniser"}
          </button>
        </div>
      )}
    </div>
  );
}
