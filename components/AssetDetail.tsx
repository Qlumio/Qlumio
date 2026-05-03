"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import type { Asset, AssetTask, FamilyMember } from "@/lib/types";
import { getAssetEmoji, getAssetLabel } from "@/components/AssetList";

type Props = {
  asset: Asset;
  tasks: AssetTask[];
  members: FamilyMember[];
};

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return `${d.getDate()}.${d.getMonth() + 1}.${d.getFullYear()}`;
}

function formatCost(cost: number) {
  return cost.toLocaleString("nb-NO") + " kr";
}

export default function AssetDetail({ asset, tasks, members }: Props) {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [cost, setCost] = useState("");
  const [responsibleId, setResponsibleId] = useState("");
  const [recurring, setRecurring] = useState(false);
  const [recurringMonths, setRecurringMonths] = useState("12");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const resetForm = () => {
    setTitle(""); setDueDate(""); setCost(""); setResponsibleId("");
    setRecurring(false); setRecurringMonths("12"); setNotes("");
  };

  const handleSaveTask = async () => {
    if (!title.trim() || !dueDate) return;
    setSaving(true);

    let eventId: string | null = null;

    // Opprett kalenderaktivitet hvis ansvarlig er valgt
    if (responsibleId) {
      const { data: event, error: eventError } = await supabase
        .from("events")
        .insert({
          title: title.trim(),
          date: dueDate,
          start_time: null,
          end_time: null,
          recurring: false,
        })
        .select()
        .single();

      if (eventError || !event) {
        alert("Feil ved oppretting av kalenderaktivitet: " + eventError?.message);
        setSaving(false);
        return;
      }

      await supabase.from("event_participants").insert({
        event_id: event.id,
        family_member_id: responsibleId,
      });

      eventId = event.id;
    }

    // Lagre oppgaven
    const { error } = await supabase.from("asset_tasks").insert({
      asset_id: asset.id,
      title: title.trim(),
      due_date: dueDate,
      estimated_cost: cost ? parseInt(cost) : null,
      responsible_member_id: responsibleId || null,
      recurring,
      recurring_months: recurring ? parseInt(recurringMonths) : null,
      notes: notes.trim() || null,
      event_id: eventId,
    });

    setSaving(false);
    if (error) { alert("Feil: " + error.message); return; }

    setShowModal(false);
    resetForm();
    router.refresh();
  };

  const handleDeleteTask = async (task: AssetTask) => {
    if (!confirm(`Slett "${task.title}"?`)) return;
    // Slett tilknyttet kalenderaktivitet hvis den finnes
    if (task.event_id) {
      await supabase.from("events").delete().eq("id", task.event_id);
    }
    await supabase.from("asset_tasks").delete().eq("id", task.id);
    router.refresh();
  };

  const getMemberName = (id: string | null) => {
    if (!id) return null;
    return members.find((m) => m.id === id)?.name ?? null;
  };
  const getMemberColor = (id: string | null) => {
    if (!id) return null;
    return members.find((m) => m.id === id)?.color ?? null;
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <main className="min-h-screen bg-slate-900 text-white p-6">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link
              href="/eiendeler"
              className="flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors text-sm px-2 py-1.5 rounded-lg hover:bg-slate-800"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              Eiendeler
            </Link>
            <div className="w-px h-5 bg-slate-700" />
            <h1 className="text-lg font-semibold">{asset.name}</h1>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 bg-blue-500 hover:bg-blue-600 text-white text-sm px-3 py-1.5 rounded-lg transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Ny oppgave
          </button>
        </div>

        {/* Eiendel-info */}
        <div className="flex items-center gap-4 p-4 bg-slate-800 rounded-xl mb-6">
          <div className="text-4xl">{getAssetEmoji(asset.type)}</div>
          <div>
            <div className="font-semibold text-lg">{asset.name}</div>
            <div className="text-sm text-slate-400">
              {getAssetLabel(asset.type)}
              {asset.purchase_year && <span className="ml-2">· {asset.purchase_year}</span>}
            </div>
            {asset.description && <div className="text-xs text-slate-500 mt-0.5">{asset.description}</div>}
          </div>
        </div>

        {/* Oppgaver */}
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide">Vedlikeholdsoppgaver</h2>
          <span className="text-xs text-slate-600">{tasks.length} oppgaver</span>
        </div>

        {tasks.length === 0 && (
          <div className="text-center py-10">
            <p className="text-slate-500 text-sm mb-3">Ingen oppgaver lagt til ennå.</p>
            <button
              onClick={() => setShowModal(true)}
              className="text-blue-400 hover:text-blue-300 text-sm transition-colors"
            >
              + Legg til første oppgave
            </button>
          </div>
        )}

        <div className="space-y-2">
          {tasks.map((task) => {
            const due = new Date(task.due_date + "T00:00:00");
            const isOverdue = due < today;
            const isSoon = !isOverdue && (due.getTime() - today.getTime()) < 1000 * 60 * 60 * 24 * 30;
            const memberName = getMemberName(task.responsible_member_id);
            const memberColor = getMemberColor(task.responsible_member_id);

            return (
              <div key={task.id} className="p-4 bg-slate-800 rounded-xl">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-medium">{task.title}</div>
                    <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs">
                      <span className={`px-2 py-0.5 rounded-full font-medium ${
                        isOverdue ? "bg-red-900/50 text-red-300" :
                        isSoon ? "bg-amber-900/50 text-amber-300" :
                        "bg-slate-700 text-slate-300"
                      }`}>
                        📅 {formatDate(task.due_date)}
                      </span>
                      {task.estimated_cost != null && (
                        <span className="bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full">
                          💰 {formatCost(task.estimated_cost)}
                        </span>
                      )}
                      {memberName && (
                        <span className="flex items-center gap-1 bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full">
                          <span className={`w-2 h-2 rounded-full ${memberColor}`} />
                          {memberName}
                        </span>
                      )}
                      {task.recurring && task.recurring_months && (
                        <span className="bg-slate-700 text-blue-400 px-2 py-0.5 rounded-full">
                          ↻ hver {task.recurring_months} mnd
                        </span>
                      )}
                      {task.event_id && (
                        <span className="bg-slate-700 text-green-400 px-2 py-0.5 rounded-full">
                          ✓ i kalender
                        </span>
                      )}
                    </div>
                    {task.notes && <div className="text-xs text-slate-500 mt-1.5">{task.notes}</div>}
                  </div>
                  <button
                    onClick={() => handleDeleteTask(task)}
                    className="text-slate-600 hover:text-red-400 transition-colors flex-shrink-0 mt-0.5"
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

      {/* Modal: legg til oppgave */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
          <div className="bg-slate-800 rounded-xl p-6 w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-4">Ny oppgave – {asset.name}</h2>

            <div className="space-y-3 mb-5">
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Hva må gjøres?</label>
                <input
                  type="text"
                  placeholder="F.eks. «Skifte vinterdekk»"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  autoFocus
                  className="w-full p-2.5 rounded-lg bg-slate-700 placeholder-slate-500 outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>

              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-xs text-slate-500 mb-1 block">Når?</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full p-2.5 rounded-lg bg-slate-700 outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-slate-500 mb-1 block">Kostnad (kr)</label>
                  <input
                    type="number"
                    placeholder="F.eks. 3000"
                    value={cost}
                    onChange={(e) => setCost(e.target.value)}
                    className="w-full p-2.5 rounded-lg bg-slate-700 placeholder-slate-500 outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-500 mb-1 block">Hvem er ansvarlig? (valgfritt)</label>
                <select
                  value={responsibleId}
                  onChange={(e) => setResponsibleId(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-slate-700 outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                >
                  <option value="">Ingen valgt</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
                {responsibleId && (
                  <p className="text-xs text-green-400 mt-1">✓ Legges automatisk til i aktivitetskalenderen</p>
                )}
              </div>

              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={recurring}
                  onChange={(e) => setRecurring(e.target.checked)}
                  className="w-4 h-4 accent-blue-500"
                />
                <span className="text-sm">Gjentas</span>
              </label>

              {recurring && (
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Intervall (måneder)</label>
                  <input
                    type="number"
                    value={recurringMonths}
                    onChange={(e) => setRecurringMonths(e.target.value)}
                    min="1"
                    className="w-full p-2.5 rounded-lg bg-slate-700 outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
              )}

              <div>
                <label className="text-xs text-slate-500 mb-1 block">Notater (valgfritt)</label>
                <input
                  type="text"
                  placeholder="F.eks. «Ring Dekk1 på forhånd»"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-slate-700 placeholder-slate-500 outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button onClick={() => { setShowModal(false); resetForm(); }} className="flex-1 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 transition-colors text-sm">Avbryt</button>
              <button
                onClick={handleSaveTask}
                disabled={!title.trim() || !dueDate || saving}
                className="flex-1 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 disabled:opacity-40 transition-colors text-sm font-medium"
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
