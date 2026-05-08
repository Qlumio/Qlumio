"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  parseQuickAdd,
  formatParsedDate,
  type QuickAddMember,
  type ParsedQuickAdd,
} from "@/lib/quick-add/parseQuickAdd";

type Props = {
  members: QuickAddMember[];
};

// Minimum confidence for å vise forslagskortet
const MIN_CONFIDENCE = 0.45;

export default function QuickAddBox({ members }: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [text, setText] = useState("");
  const [parsed, setParsed] = useState<ParsedQuickAdd | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Oppdater forslagskort reaktivt mens bruker skriver
  useEffect(() => {
    if (!text.trim()) {
      setParsed(null);
      return;
    }
    const result = parseQuickAdd(text, members);
    setParsed(result.confidence >= MIN_CONFIDENCE ? result : null);
  }, [text, members]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") reset();
  }

  function reset() {
    setText("");
    setParsed(null);
    setSaved(false);
    inputRef.current?.focus();
  }

  async function handleSave() {
    if (!parsed?.date || !parsed.title) return;
    setSaving(true);

    // Opprett event
    const { data: ev, error } = await supabase
      .from("events")
      .insert({
        title: parsed.title,
        date: parsed.date,
        end_date: null,
        start_time: parsed.startTime ?? null,
        end_time: null,
        recurring: false,
        category: null,
        responsible_member_id: null,
      })
      .select()
      .single();

    if (error || !ev) {
      alert("Kunne ikke lagre: " + error?.message);
      setSaving(false);
      return;
    }

    // Koble deltaker om navn ble matchet
    if (parsed.memberId) {
      await supabase.from("event_participants").insert({
        event_id: ev.id,
        family_member_id: parsed.memberId,
      });
    }

    setSaving(false);
    setSaved(true);

    // Kort suksess-feedback, deretter nullstill og oppdater siden
    setTimeout(() => {
      reset();
      router.refresh();
    }, 1200);
  }

  return (
    <div className="mb-5">
      {/* Input */}
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
        </div>
        <input
          ref={inputRef}
          type="text"
          value={text}
          onChange={(e) => { setText(e.target.value); setSaved(false); }}
          onKeyDown={handleKeyDown}
          placeholder='F.eks. "Thea tannlege 11.05 kl 12:00"'
          className="w-full pl-9 pr-9 py-3 bg-white rounded-xl text-sm placeholder-gray-300 text-gray-800 outline-none focus:ring-2 focus:ring-blue-400 shadow-sm transition-shadow"
        />
        {text && (
          <button
            onClick={reset}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Forslagskort */}
      {parsed && !saved && (
        <div className="mt-2 bg-white rounded-xl p-4 shadow-sm border border-blue-100">
          <div className="text-xs text-blue-500 font-medium uppercase tracking-wide mb-2">
            Forslag til aktivitet
          </div>

          <div className="space-y-1 mb-4">
            {/* Tittel */}
            <div className="flex items-center gap-2">
              <span className="text-base">📌</span>
              <span className="text-sm font-semibold text-gray-800">
                {parsed.title || <span className="text-gray-300 italic">Ingen tittel funnet</span>}
              </span>
            </div>

            {/* Person */}
            {parsed.memberName && (
              <div className="flex items-center gap-2">
                <span className="text-base">👤</span>
                <span className="text-sm text-gray-600">{parsed.memberName}</span>
              </div>
            )}

            {/* Dato */}
            {parsed.date && (
              <div className="flex items-center gap-2">
                <span className="text-base">📅</span>
                <span className="text-sm text-gray-600">{formatParsedDate(parsed.date)}</span>
              </div>
            )}

            {/* Tid */}
            {parsed.startTime && (
              <div className="flex items-center gap-2">
                <span className="text-base">🕐</span>
                <span className="text-sm text-gray-600">kl. {parsed.startTime}</span>
              </div>
            )}

            {/* Advarsel om manglende dato */}
            {!parsed.date && (
              <div className="text-xs text-amber-500 mt-1">
                ⚠ Ingen dato funnet – legg til f.eks. «11.05»
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <button
              onClick={reset}
              className="flex-1 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-sm text-gray-600 transition-colors"
            >
              Avbryt
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !parsed.date || !parsed.title}
              className="flex-1 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 disabled:opacity-40 text-sm font-medium text-white transition-colors"
            >
              {saving ? "Lagrer…" : "Legg til"}
            </button>
          </div>
        </div>
      )}

      {/* Suksessmelding */}
      {saved && (
        <div className="mt-2 flex items-center gap-2 bg-green-50 border border-green-100 rounded-xl px-4 py-3">
          <span className="text-green-500">✓</span>
          <span className="text-sm text-green-700 font-medium">Lagt til i kalenderen!</span>
        </div>
      )}
    </div>
  );
}
