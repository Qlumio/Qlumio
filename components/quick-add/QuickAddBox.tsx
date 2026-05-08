"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/lib/userContext";
import {
  parseQuickAdd,
  formatDisplayDate,
  typeLabel,
  typeIcon,
  typeColor,
  type QuickAddMember,
  type QuickAddResult,
  type QuickAddType,
} from "@/lib/quick-add/parseQuickAdd";

type Props = {
  members: QuickAddMember[];
};

const MIN_CONFIDENCE = 0.4;

// ─── Tailwind-farger per type (statisk for å unngå purge) ────────────────────
const BADGE: Record<string, string> = {
  blue:   "bg-blue-50 text-blue-600 border-blue-100",
  green:  "bg-green-50 text-green-600 border-green-100",
  purple: "bg-purple-50 text-purple-600 border-purple-100",
  amber:  "bg-amber-50 text-amber-600 border-amber-100",
  gray:   "bg-gray-50 text-gray-500 border-gray-100",
};
const RING: Record<string, string> = {
  blue:   "border-blue-100 ring-blue-100",
  green:  "border-green-100 ring-green-100",
  purple: "border-purple-100 ring-purple-100",
  amber:  "border-amber-100 ring-amber-100",
  gray:   "border-gray-100",
};
const BTN: Record<string, string> = {
  blue:   "bg-blue-500 hover:bg-blue-600",
  green:  "bg-green-500 hover:bg-green-600",
  purple: "bg-purple-500 hover:bg-purple-600",
  amber:  "bg-amber-500 hover:bg-amber-600",
  gray:   "bg-gray-400 hover:bg-gray-500",
};
const SAVE_LABEL: Record<QuickAddType, string> = {
  activity:         "Legg til aktivitet",
  grocery:          "Legg til på handleliste",
  planned_purchase: "Legg til planlagt kjøp",
  task:             "Legg til oppgave",
  unknown:          "Legg til",
};

// ─── Lagringsfunksjoner ───────────────────────────────────────────────────────

async function saveActivity(r: QuickAddResult, currentUserId: string | null) {
  const { data: ev, error } = await supabase
    .from("events")
    .insert({
      title: r.title,
      date: r.date!,
      start_time: r.time ?? null,
      end_date: null,
      end_time: null,
      recurring: false,
      category: null,
      responsible_member_id: null,
    })
    .select()
    .single();
  if (error || !ev) throw new Error(error?.message ?? "Ukjent feil");
  if (r.personId) {
    await supabase.from("event_participants").insert({
      event_id: ev.id,
      family_member_id: r.personId,
    });
  }
}

async function saveGrocery(r: QuickAddResult, currentUserName: string | null) {
  const { error } = await supabase
    .from("shopping_items")
    .insert({ name: r.title, added_by: currentUserName ?? null });
  if (error) throw new Error(error.message);
}

async function savePlannedPurchase(r: QuickAddResult) {
  // Bruk månedsdato, fallback til eksplisitt dato, fallback til neste måned
  const date = r.month ?? r.date ?? (() => {
    const n = new Date();
    n.setMonth(n.getMonth() + 1);
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-01`;
  })();
  const { error } = await supabase
    .from("planned_expenses")
    .insert({
      title: r.title,
      amount: r.amount ?? 0,
      date,
      category: "innkjop",
      notes: null,
      asset_id: null,
    });
  if (error) throw new Error(error.message);
}

async function saveTask(r: QuickAddResult, currentUserId: string | null) {
  const { error } = await supabase
    .from("tasks")
    .insert({
      title: r.title,
      notes: null,
      due_date: r.dueDate ?? null,
      assigned_to: r.personId ?? null,
      created_by: currentUserId ?? null,
    });
  if (error) throw new Error(error.message);
}

// ─── Preview-kort ─────────────────────────────────────────────────────────────

function PreviewRow({ icon, label }: { icon: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-base leading-none">{icon}</span>
      <span className="text-sm text-gray-600">{label}</span>
    </div>
  );
}

function PreviewCard({
  result,
  onSave,
  onCancel,
  saving,
}: {
  result: QuickAddResult;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const color = typeColor(result.type);

  return (
    <div className={`mt-2 bg-white rounded-xl p-4 shadow-sm border ${RING[color]}`}>
      {/* Badge */}
      <div className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-full border mb-3 ${BADGE[color]}`}>
        <span>{typeIcon(result.type)}</span>
        <span>{typeLabel(result.type)}</span>
      </div>

      {/* Innhold */}
      <div className="space-y-1.5 mb-4">
        {/* Tittel */}
        <PreviewRow
          icon="📌"
          label={result.title || "—"}
        />

        {/* Person */}
        {result.personName && (
          <PreviewRow icon="👤" label={result.personName} />
        )}

        {/* Aktivitet: dato + tid */}
        {result.type === "activity" && result.date && (
          <PreviewRow icon="📅" label={formatDisplayDate(result.date)} />
        )}
        {result.type === "activity" && result.time && (
          <PreviewRow icon="🕐" label={`kl. ${result.time}`} />
        )}

        {/* Planlagt kjøp: beløp + måned */}
        {result.type === "planned_purchase" && result.amount && (
          <PreviewRow icon="💰" label={result.amount.toLocaleString("nb-NO") + " kr"} />
        )}
        {result.type === "planned_purchase" && result.monthLabel && (
          <PreviewRow icon="📆" label={result.monthLabel} />
        )}
        {result.type === "planned_purchase" && !result.monthLabel && result.date && (
          <PreviewRow icon="📆" label={formatDisplayDate(result.date)} />
        )}
        {result.type === "planned_purchase" && !result.monthLabel && !result.date && (
          <div className="text-xs text-amber-500">⚠ Ingen måned funnet – legges til neste måned</div>
        )}

        {/* Oppgave: frist */}
        {result.type === "task" && result.dueDateLabel && (
          <PreviewRow icon="📅" label={`Frist: ${result.dueDateLabel}`} />
        )}
        {result.type === "task" && result.dueDate && !result.dueDateLabel && (
          <PreviewRow icon="📅" label={`Frist: ${formatDisplayDate(result.dueDate)}`} />
        )}

        {/* Aktivitet: advarsel om manglende dato */}
        {result.type === "activity" && !result.date && (
          <div className="text-xs text-amber-500">⚠ Ingen dato funnet – legg til f.eks. «11.05»</div>
        )}
      </div>

      {/* Knapper */}
      <div className="flex gap-2">
        <button
          onClick={onCancel}
          className="flex-1 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-sm text-gray-600 transition-colors"
        >
          Avbryt
        </button>
        <button
          onClick={onSave}
          disabled={saving || (result.type === "activity" && !result.date) || !result.title}
          className={`flex-1 py-2 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-40 ${BTN[color]}`}
        >
          {saving ? "Lagrer…" : SAVE_LABEL[result.type]}
        </button>
      </div>
    </div>
  );
}

// ─── Hoved-komponent ──────────────────────────────────────────────────────────

export default function QuickAddBox({ members }: Props) {
  const router = useRouter();
  const { currentUser } = useUser();
  const inputRef = useRef<HTMLInputElement>(null);

  const [text, setText] = useState("");
  const [result, setResult] = useState<QuickAddResult | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!text.trim()) { setResult(null); return; }
    const parsed = parseQuickAdd(text, members);
    setResult(parsed.confidence >= MIN_CONFIDENCE ? parsed : null);
  }, [text, members]);

  function reset() {
    setText(""); setResult(null); setSaved(false);
    inputRef.current?.focus();
  }

  async function handleSave() {
    if (!result) return;
    setSaving(true);
    try {
      switch (result.type) {
        case "activity":
          await saveActivity(result, currentUser?.id ?? null);
          break;
        case "grocery":
          await saveGrocery(result, currentUser?.name ?? null);
          break;
        case "planned_purchase":
          await savePlannedPurchase(result);
          break;
        case "task":
          await saveTask(result, currentUser?.id ?? null);
          break;
        default:
          break;
      }
      setSaved(true);
      setTimeout(() => { reset(); router.refresh(); }, 1200);
    } catch (e) {
      alert("Kunne ikke lagre: " + (e as Error).message);
    } finally {
      setSaving(false);
    }
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
          onKeyDown={(e) => e.key === "Escape" && reset()}
          placeholder='F.eks. "Thea tannlege 11.05" eller "Kjøp melk"'
          className="w-full pl-9 pr-9 py-3 bg-white rounded-xl text-sm placeholder-gray-300 text-gray-800 outline-none focus:ring-2 focus:ring-blue-300 shadow-sm transition-shadow"
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

      {/* Forslagkort */}
      {result && !saved && (
        <PreviewCard
          result={result}
          onSave={handleSave}
          onCancel={reset}
          saving={saving}
        />
      )}

      {/* Suksessmelding */}
      {saved && (
        <div className="mt-2 flex items-center gap-2 bg-green-50 border border-green-100 rounded-xl px-4 py-3">
          <span className="text-green-500">✓</span>
          <span className="text-sm text-green-700 font-medium">Lagt til!</span>
        </div>
      )}
    </div>
  );
}
