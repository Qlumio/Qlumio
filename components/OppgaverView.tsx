"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/lib/userContext";
import type { Task, FamilyMember } from "@/lib/types";

const MONTH_NAMES = ["jan", "feb", "mar", "apr", "mai", "jun", "jul", "aug", "sep", "okt", "nov", "des"];

function formatDue(due: string, todayStr: string): { label: string; overdue: boolean } {
  if (due === todayStr) return { label: "i dag", overdue: false };
  const tomorrow = new Date(todayStr + "T00:00:00");
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().slice(0, 10);
  if (due === tomorrowStr) return { label: "i morgen", overdue: false };
  if (due < todayStr) {
    const d = Math.round((new Date(todayStr).getTime() - new Date(due).getTime()) / 86400000);
    return { label: `${d} dag${d === 1 ? "" : "er"} over`, overdue: true };
  }
  const d = new Date(due + "T00:00:00");
  return { label: `${d.getDate()}. ${MONTH_NAMES[d.getMonth()]}`, overdue: false };
}

type Props = {
  tasks: Task[];
  members: FamilyMember[];
};

type Filter = "alle" | "mine" | "ufordelt";

export default function OppgaverView({ tasks: initialTasks, members }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentUser } = useUser();
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [filter, setFilter] = useState<Filter>("alle");
  const [showCompleted, setShowCompleted] = useState(false);

  // Legg til modal – åpnes automatisk ved ?ny=1
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    if (searchParams.get("ny") === "1") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShowAdd(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [newTitle, setNewTitle] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [newDueDate, setNewDueDate] = useState("");
  const [newAssignedTo, setNewAssignedTo] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const todayStr = new Date().toISOString().slice(0, 10);

  const filteredTasks = tasks.filter((t) => {
    if (filter === "mine" && currentUser) return t.assigned_to === currentUser.id;
    if (filter === "ufordelt") return t.assigned_to === null;
    return true;
  });

  const pending = filteredTasks.filter((t) => !t.completed);
  const completed = filteredTasks.filter((t) => t.completed);
  const overdue = pending.filter((t) => t.due_date && t.due_date < todayStr);

  const toggleComplete = async (task: Task) => {
    const newVal = !task.completed;
    setTasks((prev) =>
      prev.map((t) =>
        t.id === task.id
          ? { ...t, completed: newVal, completed_at: newVal ? new Date().toISOString() : null }
          : t
      )
    );
    await supabase
      .from("tasks")
      .update({ completed: newVal, completed_at: newVal ? new Date().toISOString() : null })
      .eq("id", task.id);
  };

  const deleteTask = async (id: string) => {
    if (!confirm("Slett oppgaven?")) return;
    setTasks((prev) => prev.filter((t) => t.id !== id));
    await supabase.from("tasks").delete().eq("id", id);
  };

  const saveTask = async () => {
    if (!newTitle.trim()) return;
    setSaving(true);
    const { data } = await supabase
      .from("tasks")
      .insert({
        title: newTitle.trim(),
        notes: newNotes.trim() || null,
        due_date: newDueDate || null,
        assigned_to: newAssignedTo || null,
        created_by: currentUser?.id ?? null,
      })
      .select()
      .single();
    if (data) {
      setTasks((prev) => [data as Task, ...prev]);
    }
    setNewTitle("");
    setNewNotes("");
    setNewDueDate("");
    setNewAssignedTo("");
    setShowAdd(false);
    setSaving(false);
  };

  const assignee = (id: string | null) => id ? members.find((m) => m.id === id) : null;

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">
      <div className="max-w-lg mx-auto px-4 pb-10">

        {/* Header */}
        <div className="flex items-center justify-between pt-6 pb-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-gray-400 hover:text-gray-700 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="text-xl font-bold text-gray-900">Oppgaver</h1>
          </div>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium px-3 py-1.5 rounded-lg transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Ny oppgave
          </button>
        </div>

        {/* Filter */}
        <div className="flex gap-2 mb-4">
          {(["alle", "mine", "ufordelt"] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors capitalize ${
                filter === f
                  ? "bg-blue-500 text-white font-medium"
                  : "bg-white text-gray-600 hover:bg-gray-100"
              }`}
            >
              {f === "alle" ? "Alle" : f === "mine" ? "Mine" : "Ufordelt"}
            </button>
          ))}
        </div>

        {/* Forfalt */}
        {overdue.length > 0 && (
          <div className="mb-4">
            <p className="text-xs font-bold text-red-500 uppercase tracking-wider mb-2">⚠️ Forfalt</p>
            <div className="bg-white rounded-xl divide-y divide-gray-100">
              {overdue.map((task) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  todayStr={todayStr}
                  assignee={assignee(task.assigned_to)}
                  onToggle={() => toggleComplete(task)}
                  onDelete={() => deleteTask(task.id)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Åpne oppgaver */}
        <div className="mb-4">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
            Åpne ({pending.filter((t) => !t.due_date || t.due_date >= todayStr).length})
          </p>
          {pending.filter((t) => !t.due_date || t.due_date >= todayStr).length === 0 ? (
            <div className="bg-white rounded-xl px-4 py-5 text-center">
              <p className="text-gray-400 text-sm">Ingen åpne oppgaver 🎉</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl divide-y divide-gray-100">
              {pending
                .filter((t) => !t.due_date || t.due_date >= todayStr)
                .map((task) => (
                  <TaskItem
                    key={task.id}
                    task={task}
                    todayStr={todayStr}
                    assignee={assignee(task.assigned_to)}
                    onToggle={() => toggleComplete(task)}
                    onDelete={() => deleteTask(task.id)}
                  />
                ))}
            </div>
          )}
        </div>

        {/* Fullførte */}
        {completed.length > 0 && (
          <div>
            <button
              onClick={() => setShowCompleted((v) => !v)}
              className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5 hover:text-gray-600 transition-colors"
            >
              <span className={`transition-transform ${showCompleted ? "rotate-90" : ""}`}>▶</span>
              Fullførte ({completed.length})
            </button>
            {showCompleted && (
              <div className="bg-white rounded-xl divide-y divide-gray-100">
                {completed.map((task) => (
                  <TaskItem
                    key={task.id}
                    task={task}
                    todayStr={todayStr}
                    assignee={assignee(task.assigned_to)}
                    onToggle={() => toggleComplete(task)}
                    onDelete={() => deleteTask(task.id)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Legg til modal */}
      {showAdd && (
        <div
          className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 p-4"
          onClick={() => setShowAdd(false)}
        >
          <div
            className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Ny oppgave</h2>

            <input
              type="text"
              placeholder="Hva skal gjøres?"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && saveTask()}
              autoFocus
              className="w-full p-2.5 rounded-lg bg-gray-100 placeholder-gray-400 outline-none focus:ring-2 focus:ring-blue-500 mb-3 text-sm text-gray-900"
            />

            <textarea
              placeholder="Notater (valgfritt)"
              value={newNotes}
              onChange={(e) => setNewNotes(e.target.value)}
              rows={2}
              className="w-full p-2.5 rounded-lg bg-gray-100 placeholder-gray-400 outline-none focus:ring-2 focus:ring-blue-500 mb-3 text-sm text-gray-900 resize-none"
            />

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Frist</label>
                <input
                  type="date"
                  value={newDueDate}
                  min={todayStr}
                  onChange={(e) => setNewDueDate(e.target.value)}
                  className="w-full p-2 rounded-lg bg-gray-100 outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Tildel til</label>
                <select
                  value={newAssignedTo}
                  onChange={(e) => setNewAssignedTo(e.target.value)}
                  className="w-full p-2 rounded-lg bg-gray-100 outline-none text-sm text-gray-900"
                >
                  <option value="">Ingen</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowAdd(false)}
                className="flex-1 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors text-sm text-gray-700"
              >
                Avbryt
              </button>
              <button
                onClick={saveTask}
                disabled={saving || !newTitle.trim()}
                className="flex-1 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 disabled:opacity-40 text-white transition-colors text-sm font-medium"
              >
                {saving ? "Lagrer..." : "Lagre"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

// ─── TaskItem ──────────────────────────────────────────────────────────────

function TaskItem({
  task,
  todayStr,
  assignee,
  onToggle,
  onDelete,
}: {
  task: Task;
  todayStr: string;
  assignee: FamilyMember | null | undefined;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const due = task.due_date ? formatDue(task.due_date, todayStr) : null;

  return (
    <div className={`flex items-center gap-3 px-4 py-3 group ${task.completed ? "opacity-50" : ""}`}>
      <button
        onClick={onToggle}
        className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
          task.completed
            ? "bg-green-500 border-green-500"
            : "border-gray-300 hover:border-green-400"
        }`}
      >
        {task.completed && (
          <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>

      <div className="flex-1 min-w-0">
        <p className={`text-sm text-gray-800 ${task.completed ? "line-through" : ""}`}>
          {task.title}
        </p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          {due && (
            <span className={`text-xs ${due.overdue ? "text-red-500 font-medium" : "text-gray-400"}`}>
              🗓 {due.label}
            </span>
          )}
          {assignee && (
            <div className="flex items-center gap-1">
              <div className={`w-2 h-2 rounded-full ${assignee.color}`} />
              <span className="text-xs text-gray-400">{assignee.name}</span>
            </div>
          )}
          {task.notes && (
            <span className="text-xs text-gray-400 truncate max-w-[120px]">📝 {task.notes}</span>
          )}
        </div>
      </div>

      <button
        onClick={onDelete}
        className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-all p-1 flex-shrink-0"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </div>
  );
}
