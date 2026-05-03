"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { FamilyMember } from "@/lib/types";

const COLORS = [
  "bg-blue-500",
  "bg-green-500",
  "bg-purple-500",
  "bg-pink-500",
  "bg-orange-500",
  "bg-teal-500",
];

type Props = {
  members: FamilyMember[];
};

export default function MemberSettings({ members }: Props) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [role, setRole] = useState("parent");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const addMember = async () => {
    if (!name.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("family_members").insert({
      name: name.trim(),
      role,
      color: COLORS[members.length % COLORS.length],
    });
    if (error) {
      alert("Feil: " + error.message);
    } else {
      setName("");
      setRole("parent");
      router.refresh();
    }
    setSaving(false);
  };

  const deleteMember = async (id: string) => {
    if (!confirm("Er du sikker? Dette sletter også alle aktiviteter for dette medlemmet.")) return;
    setDeleting(id);
    const { error } = await supabase.from("family_members").delete().eq("id", id);
    if (error) {
      alert("Feil: " + error.message);
    } else {
      router.refresh();
    }
    setDeleting(null);
  };

  return (
    <div className="max-w-lg">
      {/* Eksisterende medlemmer */}
      {members.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-medium mb-3">Familiemedlemmer</h2>
          <div className="space-y-2">
            {members.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between bg-slate-800 rounded-lg px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${member.color}`} />
                  <div>
                    <div className="font-medium">{member.name}</div>
                    <div className="text-xs text-slate-500">{member.role}</div>
                  </div>
                </div>
                <button
                  onClick={() => deleteMember(member.id)}
                  disabled={deleting === member.id}
                  className="text-slate-500 hover:text-red-400 transition-colors text-sm disabled:opacity-50"
                >
                  {deleting === member.id ? "Sletter..." : "Slett"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Legg til nytt medlem */}
      <div>
        <h2 className="text-lg font-medium mb-3">Legg til familiemedlem</h2>
        <div className="bg-slate-800 p-4 rounded-xl">
          <input
            type="text"
            placeholder="Navn"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addMember()}
            className="w-full mb-2 p-2 rounded bg-slate-700 placeholder-slate-500 outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full mb-3 p-2 rounded bg-slate-700 outline-none"
          >
            <option value="parent">Forelder</option>
            <option value="child">Barn</option>
            <option value="grandmother">Bestemor</option>
            <option value="grandfather">Bestefar</option>
            <option value="mormor">Mormor</option>
            <option value="morfar">Morfar</option>
            <option value="uncle">Onkel</option>
            <option value="aunt">Tante</option>
            <option value="trusted">Tillitsperson</option>
            <option value="other">Annet</option>
          </select>
          <button
            onClick={addMember}
            disabled={saving || !name.trim()}
            className="w-full bg-blue-500 hover:bg-blue-600 disabled:opacity-50 p-2 rounded font-medium transition-colors"
          >
            {saving ? "Lagrer..." : "Legg til"}
          </button>
        </div>
      </div>
    </div>
  );
}
